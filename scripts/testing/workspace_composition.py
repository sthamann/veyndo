"""Current-role and foreign-shop admission through the real merchant planner and directory."""
import uuid


def verify_composition_access(call, behavior, owner, personal, passed):
    headers = personal(owner)
    role = 'composition_' + uuid.uuid4().hex[:10]
    definition = {'name': {'en-GB': 'Product work reader'}, 'permissions': ['assistant.use', 'catalog.read', 'orders.read', 'knowledge.read'], 'active': True}
    call('/api/workspace/roles/' + role, {'revision': 0, 'data': definition}, headers, method='PUT')
    invitation = call('/api/workspace/invitations', {'role': role, 'email': role + '@example.test'}, headers)
    reader = call('/api/auth/accept', {'invitationToken': invitation['token'], 'name': 'Product work reader', 'password': 'Synthetic-workspace-2026!'}, headers={})
    rh = personal(reader)
    behavior.update(mode='view-plan', view={'entity': 'products', 'criteria': {}, 'components': ['records', 'details']})
    planned = call('/api/agent/chat', {'message': 'Show a native product working view', 'inference': {'provider': 'openai'}}, rh)
    assert planned['messages'][-1]['data']['preview']['proposal']['view'] == behavior['view'], planned
    assert call('/api/merchant/products?limit=1', headers=rh)['elements']
    call('/api/agent/conversations/' + planned['conversationId'], headers={**rh, 'x-tenant': 'atelier'}, expected=403)
    definition['permissions'].remove('catalog.read')
    call('/api/workspace/roles/' + role, {'revision': 1, 'data': definition}, headers, method='PUT')
    assert 'catalog.read' not in call('/api/auth/access', headers=rh)['permissions']
    call('/api/merchant/products?limit=1', headers=rh, expected=403)
    call('/api/agent/chat', {'message': 'Reopen product work after revocation', 'inference': {'provider': 'openai'}}, rh, expected=403)
    behavior.update(mode='normal')
    passed('Native composed product views obey current role revocation and reject foreign-shop bindings, even with the original browser session')
