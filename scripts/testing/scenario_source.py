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
