"""Current native target state, not a source digest/replay, determines mapped-field parity."""
def inspect(body, headers=sh):
    return call('/api/merchant/imports/inspect',{'record':body['record'],'options':body['options']},headers)
call('/api/merchant/imports/inspect',{'record':pbody['record'],'options':pbody['options']},status=401)
assert inspect(pbody)['status']=='matching'
assert inspect(pbody,fh)['status']=='missing'
edit=call('/api/merchant/products/'+pid,h=sh)
original=json.loads(json.dumps(edit))
edit['commerce'].pop('stock',None)
edit['commerce']['price']=22.50
edit['translations']['en']['description']='Manual merchant description'
call('/api/merchant/products/'+pid,edit,sh,method='PUT')
# Existing replay alone cannot establish current parity.
assert call('/api/merchant/imports',pbody,sh)['replayed']
result=inspect(pbody)
assert result['status']=='changed' and '/commerce/price' in result['differences'] and '/translations/en/description' in result['differences'],result
assert 'Manual merchant description' not in json.dumps(result)
# Explicit product previews are current native values, bounded and product-only.
detail_body={'record':pbody['record'],'options':pbody['options'],'details':True}
details=call('/api/merchant/imports/inspect',detail_body,sh)
assert details['preview']['expected']['price']=={'amount':'19.90','currency':'EUR'}
assert details['preview']['actual']['price']=={'amount':'22.50','currency':'EUR'}
assert details['preview']['actual']['translations']['en']['description']=='Manual merchant description'
assert set(details['preview']['actual'])=={'translations','sku','active','parentId','options','price','taxRate','media'},details
assert 'migrationDigest' not in json.dumps(details['preview'])
assert call('/api/merchant/imports/inspect',detail_body,fh)['preview']['actual'] is None
call('/api/merchant/imports/inspect',detail_body,status=401)
call('/api/merchant/imports/inspect',detail_body,{**h,'x-tenant':b['workspace']},status=403)
role='migration_no_catalog'
call('/api/workspace/roles/'+role,{'revision':0,'data':{'name':{'en-GB':'Migration without catalogue'},'active':True,'permissions':['apps.manage','environments.read']}},h,method='PUT')
invite=call('/api/workspace/invitations',{'role':role,'email':'no-catalog-'+uuid.uuid4().hex[:8]+'@example.test'},h)
restricted=call('/api/auth/accept',{'name':'Restricted product comparison','password':'Synthetic-fixture-2026!','invitationToken':invite['token']})
call('/api/merchant/imports/inspect',detail_body,{'Authorization':'Bearer '+restricted['token'],'x-tenant':stage},status=403)
print('PASS explicit current product preview: native money/text, bounded fields, own/foreign/no-catalogue denial')
# Comparison must be read-only, including when target and source differ.
assert call('/api/merchant/products/'+pid,h=sh)['commerce']['price']==22.50
restored=call('/api/merchant/products/'+pid,h=sh)
restored['commerce']=original['commerce'];restored['commerce'].pop('stock',None)
restored['translations']=original['translations']
call('/api/merchant/products/'+pid,restored,sh,method='PUT')
assert inspect(pbody)['status']=='matching'
print('PASS actual target reconciliation: changed native price/text, matching restoration, missing foreign identity and no target mutation/PII values')

# MCP uses the same actual read owner and explicitly advertises its read-only effect.
tools=call('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},sh)['result']['tools']
assert next(tool for tool in tools if tool['name']=='merchant.import.inspect')['annotations']['readOnlyHint'] is True
mc=call('/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'merchant.import.inspect','arguments':{'record':pbody['record'],'options':pbody['options']}}},sh)['result']
assert not mc.get('isError'),mc
assert json.loads(mc['content'][0]['text'])['status']=='matching',mc
print('PASS native read-only reconciliation is consistent through HTTP and MCP discovery/invocation')

# Source-owned rich product content participates in creation and actual comparison.
assert original['extra']['richDescription']['en']==pbody['record']['data']['richDescription']['en-GB']
rich_edit=call('/api/merchant/products/'+pid,h=sh)
rich_edit['commerce'].pop('stock',None)
rich_edit['extra']['richDescription']['en']=[{'type':'paragraph','text':'Changed native rich content'}]
call('/api/merchant/products/'+pid,rich_edit,sh,method='PUT')
rich_report=inspect(pbody)
assert rich_report['status']=='changed' and '/extra/richDescription/en' in rich_report['differences'],rich_report
rich_edit=call('/api/merchant/products/'+pid,h=sh);rich_edit['commerce'].pop('stock',None);rich_edit['extra']['richDescription']=original['extra']['richDescription']
call('/api/merchant/products/'+pid,rich_edit,sh,method='PUT')
assert inspect(pbody)['status']=='matching'
print('PASS native imported rich description: localized storage, current-field change detection and deliberate restoration')

for value in ([], {'en-GB':[{'type':'document','doc':{'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'Unsafe link','marks':[{'type':'link','attrs':{'href':'javascript:alert(1)'}}]}]}]}}]}):
    rejected=json.loads(json.dumps(pbody));rejected['record']['sourceId']='invalid-rich-'+uuid.uuid4().hex;rejected['record']['data']['richDescription']=value
    call('/api/merchant/imports',rejected,sh,status=400)
print('PASS malformed rich mapping and executable links reject through native product validation')
