"""Native task ownership and applied-proposal admission for customer-test references."""
import json
import uuid
import threading


def verify_reviewed_proposal(call, wait, body, headers, live, mode):
    def lamp(scope):
        return next(p for p in call('/store-api/product', {}, scope)['elements'] if p['id'] == 'lamp')

    live_price = lamp(live)['price']
    private_price = lamp(headers)['price']
    mode['proposal'] = True
    try:
        chat = call('/api/agent/chat', {'message':'Prepare a lamp price of 71.23 EUR for this private shop.', 'inference':{'provider':'openai'}}, headers)
        data = chat['messages'][-1]['data']
        task = data['taskId']
        assert data['preview']['proposal']['changes'][0]['product_id'] == 'lamp', data
        assert lamp(headers)['price'] == private_price, 'An unapproved proposal must not change prices'
        request = {**body, 'requestId':uuid.uuid4().hex, 'sourceTaskId':task}
        call('/api/agent/scenarios', request, headers, 409)
        applied = call('/api/agent/tasks/' + task + '/apply', {'approve':True}, headers)
        assert applied['applied'], applied
        assert lamp(headers)['price'] == 71.23 and lamp(live)['price'] == live_price
    finally:
        mode['proposal'] = False
    call('/api/agent/scenarios', request, headers)
    report = wait(request['requestId'], headers)
    run = report['runs'][0]
    assert run['state'] == 'ready' and run['preview']['scenario']['outcome'] == 'purchased', report
    assert run['scenario']['source']['taskId'] == task and run['configurationReview'] == 'current', report
    assert lamp(live)['price'] == live_price
    print('PASS actual model proposal → explicit native apply → attributed private purchase, with unchanged live price', flush=True)
    return request['requestId'], run


def verify_selected_release(call, sql, headers, live, stage, actor, report_id, run):
    """Publish the tested proposal through native selection, keeping operational state private."""
    diff_path = '/api/environments/' + stage + '/diff'
    release_path = '/api/environments/' + stage + '/release'
    changes = call(diff_path, headers=live)['changes']
    change = next(c for c in changes if c['key'] == 'product:lamp')
    remaining = {c['key']: c['digest'] for c in changes if c['key'] != 'product:lamp'}
    assert 'channel:scenario_only_lamp' in remaining and 'app:engraving' in remaining
    selection = {'approve': True, 'selections': [{'key': change['key'], 'digest': change['digest']}]}

    def operational_state():
        return sql(f"SELECT jsonb_build_object('orders',(SELECT jsonb_agg(jsonb_build_array(tenant,id,data) ORDER BY tenant,id) FROM orders WHERE tenant IN ('workshop','{stage}')),'stock',(SELECT jsonb_agg(jsonb_build_array(tenant,id,stock) ORDER BY tenant,id) FROM products WHERE tenant IN ('workshop','{stage}')))::text")

    before = operational_state()
    releases = sql("SELECT count(*) FROM shop_releases WHERE live_tenant='workshop'")
    events = sql("SELECT count(*) FROM outbox WHERE tenant='workshop' AND kind='shop.release.published'")
    call(release_path, {**selection, 'approve': False}, live, 400)
    call(release_path, {'approve': True, 'selections': [{'key': change['key'], 'digest': 'stale'}]}, live, 409)
    # Saved tests never grant release authority. Recheck the same authenticated user.
    sql(f"UPDATE memberships SET role='viewer',permissions='[\"catalog.read\"]'::jsonb WHERE tenant='workshop' AND user_id='{actor}'")
    try:
        call(release_path, selection, live, 403)
    finally:
        sql(f"UPDATE memberships SET role='owner',permissions='null'::jsonb WHERE tenant='workshop' AND user_id='{actor}'")
    assert operational_state() == before
    assert sql("SELECT count(*) FROM shop_releases WHERE live_tenant='workshop'") == releases
    result = call(release_path, selection, live)
    assert result['published'] == ['product:lamp'], result
    public_lamp = next(p for p in call('/store-api/product', {}, live)['elements'] if p['id'] == 'lamp')
    assert public_lamp['price'] == 71.23
    after = call(diff_path, headers=live)['changes']
    assert {c['key']: c['digest'] for c in after} == remaining
    assert operational_state() == before, 'Publication must not copy test orders or overwrite either stock'
    saved = call('/api/agent/scenarios/' + report_id, headers=headers)['runs'][0]
    assert saved['configurationReview'] == 'current'
    assert saved['preview']['scenario']['orderId'] == run['preview']['scenario']['orderId']
    assert saved['scenario']['source'] == run['scenario']['source']
    call(release_path, selection, live, 409)
    assert int(sql("SELECT count(*) FROM shop_releases WHERE live_tenant='workshop'")) == int(releases) + 1
    assert int(sql("SELECT count(*) FROM outbox WHERE tenant='workshop' AND kind='shop.release.published'")) == int(events) + 1
    assert operational_state() == before
    print('PASS tested proposal → selected native publication: exact live price, unchanged orders/stock, unrelated changes retained, current saved evidence, revoked rights and stale/replayed requests rejected, one release/event', flush=True)


def verify_source(call, sql, wait, body, headers, stage, task, mode):
    def request():
        return {**body, 'requestId': uuid.uuid4().hex, 'sourceTaskId': task}

    call('/api/agent/scenarios', request(), headers, 409)  # a test is not a proposal
    call('/api/agent/scenarios', {**request(), 'sourceTaskId': 'missing'}, headers, 404)
    original = json.loads(sql(f"SELECT jsonb_build_object('request',run_request,'proposal',proposal,'applied',applied)::text FROM tasks WHERE tenant='{stage}' AND id='{task}'"))
    try:
        # A deterministic saved proposal fixture retains the real original task
        # actor, credential kind and scopes. No mock replaces admission or checkout.
        sql(f"UPDATE tasks SET run_request=run_request-'scenario',proposal='{{\"proposal\":{{\"summary\":\"Test catalogue update\"}}}}',applied=false WHERE tenant='{stage}' AND id='{task}'")
        call('/api/agent/scenarios', request(), headers, 409)
        sql(f"UPDATE tasks SET applied=true WHERE tenant='{stage}' AND id='{task}'")
        call('/api/agent/scenarios', request(), {**headers, 'sw-sales-channel-id':'scenario_only_lamp'}, 409)
        other = call('/api/auth/register', {'name':'Other test owner','email':uuid.uuid4().hex+'@example.test','password':'Synthetic-Source-2026!','workspaceId':'source-'+uuid.uuid4().hex[:12]})
        sql(f"INSERT INTO memberships(tenant,user_id,role) VALUES('workshop','{other['user']['id']}','owner')")
        call('/api/agent/scenarios', request(), {**headers, 'Authorization':'Bearer '+other['token']}, 403)
        req = request()
        call('/api/agent/scenarios', req, headers)
        report = wait(req['requestId'], headers)
        run = report['runs'][0]
        assert run['state'] == 'ready' and run['preview']['scenario']['outcome'] == 'purchased', report
        assert run['scenario']['source']['taskId'] == task
        assert run['scenario']['source']['revision'] > 0 and run['scenario']['source']['proposalDigest']
        assert run['configurationReview'] == 'current', report
        replay = call('/api/agent/scenarios', req, headers)
        assert replay['runs'][0]['taskId'] == run['taskId']
        # A source edited while the model is working must be rejected before checkout.
        mode.update(hold=threading.Event(), holdCheckout=True, entered=threading.Event())
        blocked = request()
        orders = sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'")
        call('/api/agent/scenarios', blocked, headers)
        assert mode['entered'].wait(timeout=5)
        sql(f"UPDATE tasks SET proposal=jsonb_set(proposal,'{{proposal,summary}}','\"Changed while inference ran\"'::jsonb) WHERE tenant='{stage}' AND id='{task}'")
        mode['hold'].set()
        mode['hold'] = None
        mode['holdCheckout'] = False
        stopped = wait(blocked['requestId'], headers)
        assert stopped['runs'][0]['state'] != 'ready', stopped
        assert sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'") == orders
        print('PASS source proposal must be applied, belong to the current actor, sandbox and channel; attributed purchases and retries reuse native admission', flush=True)
    finally:
        if mode['hold']: mode['hold'].set()
        mode.update(hold=None, holdCheckout=False)
        req = json.dumps(original['request']).replace("'", "''")
        proposal = json.dumps(original['proposal']).replace("'", "''")
        sql(f"UPDATE tasks SET run_request='{req}'::jsonb,proposal='{proposal}'::jsonb,applied={'true' if original['applied'] else 'false'} WHERE tenant='{stage}' AND id='{task}'")


def verify_unavailable_evidence(call, sql, wait, body, headers, stage):
    from testing.app_approval import consent
    call('/api/apps', consent({'builtIn':'engraving'}), headers)
    sql(f"INSERT INTO app_records(tenant,app,entity,id,revision,version,fields) SELECT '{stage}','engraving','rules','evidence_limit_'||n,1,'','{{\"fee_minor\":300}}'::jsonb FROM generate_series(1,1000) n")
    try:
        saved = call('/api/agent/scenarios/' + body['requestId'], headers=headers)
        assert saved['runs'][0]['configurationReview'] == 'unverified', saved
        assert saved['runs'][0]['preview']['scenario']['outcome'] == 'purchased', saved
        large = {**body, 'requestId':uuid.uuid4().hex}
        call('/api/agent/scenarios', large, headers)
        report = wait(large['requestId'], headers)
        assert report['runs'][0]['state'] == 'ready', report
        assert report['runs'][0]['preview']['scenario']['outcome'] == 'purchased', report
        assert report['runs'][0]['configurationReview'] == 'unverified', report
        print('PASS 1001 app configuration records keep historical results readable and new native purchases working with explicitly unavailable evidence', flush=True)
    finally:
        sql(f"DELETE FROM app_records WHERE tenant='{stage}' AND app='engraving' AND entity='rules' AND id LIKE 'evidence_limit_%'")
