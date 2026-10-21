"""Frozen comparison against real checkout/Flow snapshots; no current-data fallback or effects."""
import json


def verify(call, sql, mcp, mh, foreign, tenant, suffix, check):
    path = '/api/automation/rules/compare-history'
    args = {'ruleId': 'positive', 'revision': 2, 'flowId': 'pipeline', 'limit': 50,
            'condition': {'type': 'ruleReference', 'ruleId': 'positive'}}

    def state():
        # Include counters and payloads of every owner that replay could accidentally change.
        return sql("SELECT jsonb_build_array("
                   "(SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM orders o WHERE tenant='" + tenant + "'),"
                   "(SELECT jsonb_agg(to_jsonb(j) ORDER BY id) FROM flow_jobs j WHERE tenant='" + tenant + "'),"
                   "(SELECT count(*) FROM outbox WHERE tenant='" + tenant + "'),"
                   "(SELECT count(*) FROM order_receipts WHERE tenant='" + tenant + "'));" )

    original = state()
    result = call(path, args, mh)
    assert result['sampled'] == result['evaluated'] == result['changed'] == 1, result
    assert result['unavailable'] == 0 and result['sideEffects'] is False
    row = result['results'][0]
    assert row['before'] is False and row['after'] is True, row
    assert len(row['snapshotDigest']) == len(result['candidateDigest']) == 64
    assert not any(s in json.dumps(result) for s in ['@example.test', 'cartData', 'ruleFacts', 'orderCustomer'])
    assert mcp('automation.compare_history', args)['structuredContent'] == result
    assert state() == original, 'Read comparison changed native commerce or worker state'
    check('HTTP/MCP comparison uses original frozen reference after saved rule changed, with no checkout/Flow/receipt effects')

    missing = {**args, 'condition': {'type': 'notContainer', 'child': {'type': 'ruleReference', 'ruleId': 'not_recorded'}}}
    unsupported = call(path, missing, mh)
    assert unsupported['unavailable'] == 1 and unsupported['evaluated'] == unsupported['changed'] == 0
    assert unsupported['results'][0]['reason'] == 'required_facts_unavailable'
    assert 'before' not in unsupported['results'][0], unsupported
    assert call(path, {**args, 'flowId': 'missing_history'}, mh)['sampled'] == 0
    call(path, {**args, 'revision': 1}, mh, expected=409)
    for bad in [{**args, 'limit': 51}, {**args, 'limit': 0}, {**args, 'tenant': foreign['workspace']},
                {**args, 'condition': {'type': 'made_up'}}, {**args, 'flowId': "x';DROP TABLE orders;--"}]:
        call(path, bad, mh, expected=400)
    check('Absent snapshots/references remain unavailable, including under NOT; stale revisions and unbounded/forged input are rejected')

    fh = {'x-tenant': foreign['workspace'], 'Authorization': 'Bearer ' + foreign['token']}
    call(path, args, fh, expected=404)
    call(path, args, {'x-tenant': tenant, 'Authorization': 'Bearer ' + foreign['token']}, expected=403)
    scopes = ['automation.read', 'orders.read', 'catalog.read', 'customers.read',
              'payments.read', 'documents.read', 'b2b.read']
    role = {'revision': 0, 'data': {'name': {'en-GB': 'Rule history reader'}, 'permissions': scopes, 'active': True}}
    call('/api/workspace/roles/history_reader', role, mh, 'PUT')
    invitation = call('/api/workspace/invitations', {'role': 'history_reader', 'email': 'history-' + suffix + '@example.test'}, mh)
    user = call('/api/auth/accept', {'name': 'History reader', 'password': 'Synthetic-history-2026!', 'invitationToken': invitation['token']})
    restricted = {'x-tenant': tenant, 'Authorization': 'Bearer ' + user['token']}
    call(path, args, restricted, expected=403)
    assert mcp('automation.compare_history', args, restricted)['isError']
    tools = call('/mcp', {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list'}, restricted)['result']['tools']
    assert not any(t['name'] == 'automation.compare_history' for t in tools)
    role['revision'] = 1
    role['data']['permissions'] = scopes + ['customers.pii']
    call('/api/workspace/roles/history_reader', role, mh, 'PUT')
    assert call(path, args, restricted)['results'] == result['results']
    role['revision'] = 2
    role['data']['permissions'] = scopes
    call('/api/workspace/roles/history_reader', role, mh, 'PUT')
    call(path, args, restricted, expected=403)
    check('Foreign tenants and missing/revoked PII rights cannot compare or discover history; current read grants enable the same result')

    # Corrupt only this isolated fixture snapshot: no current-data reconstruction is allowed.
    job_id = row['jobId']
    stored = sql("SELECT definition::text FROM flow_jobs WHERE tenant='" + tenant + "' AND id='" + job_id + "';")
    sql("UPDATE flow_jobs SET definition=definition-'cartData' WHERE tenant='" + tenant + "' AND id='" + job_id + "';")
    broken = call(path, args, mh)
    assert broken['unavailable'] == 1 and broken['results'][0]['reason'] == 'incomplete_snapshot'
    quoted = stored.replace("'", "''")
    sql("UPDATE flow_jobs SET definition='" + quoted + "'::jsonb WHERE tenant='" + tenant + "' AND id='" + job_id + "';")
    assert call(path, args, mh) == result
    check('Incomplete historic inputs do not fall back to current carts; restored original inputs reproduce the identical comparison')
