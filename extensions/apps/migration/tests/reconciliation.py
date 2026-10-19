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
