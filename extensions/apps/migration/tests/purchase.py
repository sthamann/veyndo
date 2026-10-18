"""A source-imported private product must survive deliberate native publication and a real simulated buyer checkout."""
changes=call('/api/environments/'+target+'/diff',h=h)['changes']
assets=call('/api/merchant/products/'+native_id+'/assets',h={**h,'x-tenant':target})['elements']
keys={'product:'+native_id,*('asset:'+x['id'] for x in assets)}
selections=[{'key':c['key'],'digest':c['digest']} for c in changes if c['key'] in keys]
assert len(selections)==len(keys)
if assets:
    call('/api/environments/'+target+'/release',{'approve':True,'selections':[s for s in selections if s['key']=='product:'+native_id]},h,409)
    call('/api/merchant/products/'+native_id,h=h,status=404)
call('/api/environments/'+target+'/release',{'approve':True,'selections':selections},h)
editor=call('/api/merchant/products/'+native_id,h=h)
assert editor['commerce']['stock']==0
if assets:
    media=editor['commerce']['media'][0]
    assert media['id']==assets[0]['id'] and 'shop='+a['workspace'] in media['url']
    req=urllib.request.Request(BASE+media['url'],headers={'x-tenant':a['workspace']})
    with urllib.request.urlopen(req) as response:assert response.read()==png
# A later content release compares the live delivery URL, not the old private-tenant URL.
private_editor=call('/api/merchant/products/'+native_id,h={**h,'x-tenant':target})
private_editor['translations']['en']['name']='Source ceramic cup revised'
private_editor['commerce'].pop('stock',None)
call('/api/merchant/products/'+native_id,private_editor,{**h,'x-tenant':target},method='PUT')
updated=next(c for c in call('/api/environments/'+target+'/diff',h=h)['changes'] if c['key']=='product:'+native_id)
call('/api/environments/'+target+'/release',{'approve':True,'selections':[{'key':updated['key'],'digest':updated['digest']}]},h)
editor=call('/api/merchant/products/'+native_id,h=h)
assert editor['translations']['en']['name']=='Source ceramic cup revised'
editor['commerce']['stock']=3
call('/api/merchant/products/'+native_id,editor,h,method='PUT')
public={'x-tenant':a['workspace']}
cart=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},public)
public['sw-context-token']=cart['token']
cart=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':native_id,'quantity':1}]},public)
checkout=cart['checkout'];checkout.update({'paymentMethodId':'demo-card','customerEmail':'migration-purchase@example.test','billingAddress':{'name':'Migration Test Buyer','street':'Synthetic Street 1','postalCode':'10115','city':'Berlin','country':'DE'}})
cart=call('/store-api/checkout/context',{'revision':cart['revision'],'checkout':checkout},public,method='PUT')
reviewed={**public,'Idempotency-Key':'migration-purchase-'+uuid.uuid4().hex,'x-commerce-cart-revision':str(cart['revision']),'x-commerce-total-minor':str(cart['price']['totalMinor'])}
purchase=call('/store-api/checkout/order',{},reviewed)
assert purchase['payment']['realMoneyCharged'] is False
assert call('/store-api/checkout/order',{},reviewed)['id']==purchase['id']
assert call('/api/merchant/products/'+native_id,h=h)['commerce']['stock']==2
fresh=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},{'x-tenant':a['workspace']})
assert fresh['lineItems']==[] and fresh['token']!=cart['token']
print('PASS migrated product -> selected native publication -> explicit stock activation -> simulated buyer checkout/replay -> stock once and empty cart')
