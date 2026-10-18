"""Net source prices use the existing native gross calculator and explicit reviewed basis, never nominal copying."""
price_stage=call('/api/environments',{'name':'Source price basis preview'},h)['id']
price_h={**h,'x-tenant':price_stage}
net=json.loads(json.dumps(pbody));net['record']['sourceId']='source-net-12';net['record']['data'].update({'sku':'SOURCE-NET-12','price':{'currency':'EUR','scale':2,'minor':1250},'priceBasis':'net'})
net['options'].update({'sourcePriceBasis':'net','taxRate':19})
net_id=call('/api/merchant/imports',net,price_h)['id']
assert call('/api/merchant/products/'+net_id,h=price_h)['commerce']['price']==14.88
assert call('/api/merchant/imports',net,price_h)['replayed']
wrong=json.loads(json.dumps(net));wrong['record']['sourceId']='wrong-price-basis';wrong['options']['sourcePriceBasis']='gross'
call('/api/merchant/imports',wrong,price_h,400)
missing=json.loads(json.dumps(net));missing['record']['sourceId']='missing-price-basis';del missing['options']['sourcePriceBasis']
call('/api/merchant/imports',missing,price_h,400)
for value in ('tax-free',False,{},[]):
    invalid=json.loads(json.dumps(net));invalid['record']['sourceId']='invalid-price-basis-'+uuid.uuid4().hex;invalid['record']['data']['priceBasis']=value
    call('/api/merchant/imports',invalid,price_h,400)
overflow=json.loads(json.dumps(net));overflow['record']['sourceId']='net-overflow';overflow['record']['data']['price']['minor']=9007199254740991
call('/api/merchant/imports',overflow,price_h,400)
gross=json.loads(json.dumps(pbody));gross['record']['sourceId']='source-gross-12';gross['record']['data']['sku']='SOURCE-GROSS-12';gross['options']['sourcePriceBasis']='gross'
gross_id=call('/api/merchant/imports',gross,price_h)['id']
assert call('/api/merchant/products/'+gross_id,h=price_h)['commerce']['price']==19.9
print('PASS reviewed source net/gross basis: native tax conversion/rounding, known-basis mismatch/missing denial and gross preservation')

config=call('/api/merchant/commerce',h=price_h)
for code,scale,rate in [('JPY',0,'160.00000000'),('KWD',3,'0.33000000')]:
    config['data']['currencies']['definitions'].append({'code':code,'scale':scale,'rate':rate,'strategy':'automatic'})
    config['data']['currencies']['enabled'].append(code)
call('/api/merchant/commerce',{'revision':config['revision'],'data':config['data']},price_h,method='PUT')
for code,scale,expected in [('JPY',0,1488),('KWD',3,1.488)]:
    record=json.loads(json.dumps(net));record['record']['sourceId']='net-scale-'+code;record['record']['data']['sku']='NET-SCALE-'+code
    record['record']['data']['price']={'currency':code,'scale':scale,'minor':1250}
    imported=call('/api/merchant/imports',record,price_h)['id']
    native=call('/api/merchant/products/'+imported,h=price_h)
    assert native['commerce']['price']==expected and native['extra']['priceCurrency']==code
print('PASS native net conversion respects configured zero-decimal and three-decimal currencies')
