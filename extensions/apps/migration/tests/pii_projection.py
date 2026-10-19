"""The settings read model cannot bypass current order and separate personal-data rights."""
role='migration_no_pii'
call('/api/workspace/roles/'+role,{'revision':0,'data':{'name':{'en-GB':'Migration no personal data'},'active':True,'permissions':['settings.read','orders.read']}},h,method='PUT')
email='no-pii-'+uuid.uuid4().hex[:8]+'@example.test'
invite=call('/api/workspace/invitations',{'role':role,'email':email},h)
reader=call('/api/auth/accept',{'name':'Restricted migration reader','password':'Synthetic-fixture-2026!','invitationToken':invite['token']})
reader_h={'Authorization':'Bearer '+reader['token'],'x-tenant':a['workspace']}
call('/api/merchant/orders/'+oid,h=reader_h,status=403)
projection=call('/api/merchant/commerce',h=reader_h)
assert projection['orders']==[] and 'PRIVATE-MIGRATION-ADDRESS-76921' not in json.dumps(projection),projection
assert 'PRIVATE-MIGRATION-ADDRESS-76921' in json.dumps(call('/api/merchant/commerce',h=h))
print('PASS settings/orders without PII cannot read imported historical source snapshots or addresses; owner still can')
