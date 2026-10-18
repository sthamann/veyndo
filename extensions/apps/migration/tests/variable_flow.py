"""Variable source products keep original parent/child identities, visibility and images through native release and checkout."""
source_rows=inspect_source('products','variable')
assert [r['sourceId'] for r in source_rows['records']]==['200','201','202']
assert source_rows['records'][2]['data']['catalogActive'] is False
variable_target=call('/api/environments',{'name':'Variable source preview'},h)['id']
variable_headers={**h,'x-tenant':variable_target}
def queue_variable(domain,page,options):
    intent={'sourceId':'variable','kind':domain,'target':variable_target,'options':options,'recordDigests':page['recordDigests']}
    job_id=call('/api/apps/migration/actions/import_'+domain,intent,{**h,'Idempotency-Key':'variable-flow-'+domain})['jobId']
    for _ in range(100):
        saved=call('/api/apps/migration/jobs/'+job_id,h=h)
        if saved['status'] not in ('queued','running'):break
        time.sleep(.1)
    assert saved['status']=='succeeded',(domain,saved)
    return saved
queue_variable('products',source_rows,{'channelId':'default','taxRate':19})
def variable_identity(source_id,kind='products'):
    return str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],'woocommerce',source_origin,kind,source_id],separators=(',',':')).encode()).digest()[:16]))
parent_id,blue_id,hidden_id=[variable_identity(s) for s in ('200','201','202')]
blue=call('/api/merchant/products/'+blue_id,h=variable_headers)
assert blue['catalog']['parentId']==parent_id and blue['catalog']['options']=={'Colour':'Blue'}
assert blue['commerce']['stock']==0
assert call('/api/merchant/products/'+hidden_id,h=variable_headers)['catalog']['active'] is False
images=inspect_source('assets','variable')
assert {r['data']['productSourceId'] for r in images['records']}=={'200','201'}
queue_variable('assets',images,{})
parent_assets=call('/api/merchant/products/'+parent_id+'/assets',h=variable_headers)['elements']
blue_assets=call('/api/merchant/products/'+blue_id+'/assets',h=variable_headers)['elements']
assert len(parent_assets)==len(blue_assets)==1
keys={'product:'+i for i in (parent_id,blue_id,hidden_id)}|{'asset:'+asset['id'] for asset in parent_assets+blue_assets}
changes=call('/api/environments/'+variable_target+'/diff',h=h)['changes']
selected=[{'key':c['key'],'digest':c['digest']} for c in reversed(changes) if c['key'] in keys]
assert len(selected)==5
call('/api/environments/'+variable_target+'/release',{'approve':True,'selections':selected},h)
blue=call('/api/merchant/products/'+blue_id,h=h)
assert blue['catalog']['parentId']==parent_id and blue['commerce']['media'][0]['id']==blue_assets[0]['id']
assert call('/api/merchant/products/'+hidden_id,h=h)['catalog']['active'] is False
buyer_headers={'x-tenant':a['workspace']}
call('/store-api/product/'+hidden_id,h=buyer_headers,status=404)
blue['commerce']['stock']=3
call('/api/merchant/products/'+blue_id,blue,h,method='PUT')
cart=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},buyer_headers)
buyer_headers['sw-context-token']=cart['token']
cart=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':blue_id,'quantity':1}]},buyer_headers)
selection=cart['checkout'];selection.update({'paymentMethodId':'demo-card','customerEmail':'variable-buyer@example.test','billingAddress':{'name':'Variable Test Buyer','street':'Synthetic Street 1','postalCode':'10115','city':'Berlin','country':'DE'}})
cart=call('/store-api/checkout/context',{'revision':cart['revision'],'checkout':selection},buyer_headers,method='PUT')
purchase_headers={**buyer_headers,'Idempotency-Key':'variable-buy-'+uuid.uuid4().hex,'x-commerce-cart-revision':str(cart['revision']),'x-commerce-total-minor':str(cart['price']['totalMinor'])}
order=call('/store-api/checkout/order',{},purchase_headers)
assert order['payment']['realMoneyCharged'] is False
assert call('/store-api/checkout/order',{},purchase_headers)['id']==order['id']
assert call('/api/merchant/products/'+blue_id,h=h)['commerce']['stock']==2
fresh=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},{'x-tenant':a['workspace']})
assert fresh['lineItems']==[]
review={'version':1,'source':'woocommerce','sourceShop':source_origin,'kind':'reviews','sourceId':'variable-review','data':{'productSourceId':'200','title':'Original variable assessment','text':'Original variable assessment','rating':5,'sourceAuthor':'Original buyer','createdAt':'2020-01-02T03:04:05Z','sourceVerified':True,'verifiedPurchase':False},'warnings':[]}
review_result=call('/api/merchant/imports',{'approve':True,'record':review,'options':{}},h)
assert next(r for r in call('/api/merchant/commerce',h=h)['reviews'] if r['id']==review_result['id'])['productId']==parent_id
print('PASS variable source -> complete canonical family -> native private parent/children/images -> selected publication with hidden variant -> simulated variant purchase/replay/stock once/empty cart and original parent review')
