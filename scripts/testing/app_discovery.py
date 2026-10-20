"""Exercise real app discovery beyond an alphabetical sample and enforce read-only native dispatch."""
import copy


def verify_app_discovery(call, manifest, headers, passed):
    for index in range(9):
        item = copy.deepcopy(manifest)
        item['id'] = f'aa_discovery_{index}'
        call('/api/apps', {'manifest': item})
    target = copy.deepcopy(manifest)
    target['id'] = 'zz_technical_care'
    target['name'] = {'en': 'Technical care warranty'}
    target['intelligence']['description'] = {'en': 'Technical care warranty guidance'}
    call('/api/apps', {'manifest': target})
    found = call('/api/agent/apps/search', {'query': 'technical warranty', 'limit': 2})
    assert found['apps'][0]['app'] == target['id'], found
    assert len(found['apps']) <= 2
    assert 'records' not in found['apps'][0]
    action=found['apps'][0]['tools'][0]['action']
    call('/api/agent/apps/read', {'app':target['id'],'action':action,'arguments':{'limit':1}})
    mcp=call('/mcp',{'jsonrpc':'2.0','id':71,'method':'tools/call','params':{'name':'merchant.apps.search','arguments':{'query':'technical warranty','limit':1}}})
    assert 'error' not in mcp, mcp
    passed('Relevant app beyond the first eight is discoverable without leaking sampled records')
    call('/api/agent/apps/read', {'app': target['id'], 'action': 'missing', 'arguments': {}}, expected=400)
    call('/api/agent/apps/search', {'query': '', 'limit': 21}, expected=400)
    call('/api/agent/apps/search', {'query': 'warranty', 'tenant': 'atelier'}, expected=400)
    foreign = call('/api/agent/apps/search', {'query': 'technical warranty'}, headers={**headers,'x-tenant':'atelier'})
    assert all(a['app'] != target['id'] for a in foreign['apps'])
    call('/api/agent/chat', {'message':'Context cannot grant owner access','workspaceContext':{'view':'products','role':'owner'}},expected=400)
    passed('Discovery rejects foreign context and forged presentation authority before saving work')

