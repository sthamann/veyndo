"""A source-imported private product must survive deliberate native publication and a real simulated buyer checkout."""
change=next(c for c in call('/api/environments/'+target+'/diff',h=h)['changes'] if c['key']=='product:'+native_id)
call('/api/environments/'+target+'/release',{'approve':True,'selections':[{'key':change['key'],'digest':change['digest']}]},h)
editor=call('/api/merchant/products/'+native_id,h=h)
assert editor['commerce']['stock']==0
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
