"""Imported reviews retain source claims without purchase authority; imported coupons require deliberate native activation."""
review={'version':1,'source':'woocommerce','sourceShop':'source-woo','kind':'reviews','sourceId':'review-1','data':{'productSourceId':'product-9','title':'Original assessment','text':'Original source review','rating':5,'sourceAuthor':'Original reviewer','createdAt':'2020-01-02T03:04:05Z','sourceVerified':True,'verifiedPurchase':False},'warnings':[]}
review_body={'approve':True,'record':review,'options':{}}
review_id=call('/api/merchant/imports',review_body,h)['id']
assert call('/api/merchant/imports',review_body,h)['replayed']
row=next(r for r in call('/api/merchant/commerce',h=h)['reviews'] if r['id']==review_id)
assert not row['approved'] and not row['verifiedPurchase'] and row['sourceImport']['sourceVerified'] is True
assert '2020-01-02' in row['time']
public={'x-tenant':a['workspace']}
assert not any(r['id']==review_id for r in call('/store-api/product/'+pid,h=public)['reviews']['elements'])
call('/api/merchant/reviews/'+review_id,{'approved':True},h,method='PUT')
visible=next(r for r in call('/store-api/product/'+pid,h=public)['reviews']['elements'] if r['id']==review_id)
assert visible['imported'] and not visible['verifiedPurchase'] and 'sourceImport' not in visible
assert call('/api/merchant/imports',review_body,h)['replayed']
assert next(r for r in call('/api/merchant/commerce',h=h)['reviews'] if r['id']==review_id)['approved']
changed=json.loads(json.dumps(review_body));changed['record']['data']['rating']=1
call('/api/merchant/imports',changed,h,409)
call('/api/merchant/imports',review_body,sh,400)
call('/api/merchant/imports',review_body,fh,400)
# Settings alone, or either half of the current read/PII pair, cannot expose imported author/source content.
for index, permissions in enumerate((['settings.read'],['settings.read','catalog.read'],['settings.read','customers.pii'],['settings.read','catalog.read','customers.pii'])):
    role='review_reader_'+str(index)
    call('/api/workspace/roles/'+role,{'revision':0,'data':{'name':{'en-GB':role},'active':True,'permissions':permissions}},h,method='PUT')
    invitation=call('/api/workspace/invitations',{'role':role,'email':uuid.uuid4().hex+'@example.test'},h)
    member=call('/api/auth/accept',{'name':'Review reader','password':'Migration-fixture-2026!','invitationToken':invitation['token']})
    member_h={'Authorization':'Bearer '+member['token'],'x-tenant':a['workspace']}
    exposed=call('/api/merchant/commerce',h=member_h)['reviews']
    assert any(r['id']==review_id for r in exposed)==(index==3),permissions
    if index==3:
        call('/api/workspace/roles/'+role,{'revision':1,'data':{'name':{'en-GB':role},'active':True,'permissions':['settings.read','catalog.read']}},h,method='PUT')
        assert not any(r['id']==review_id for r in call('/api/merchant/commerce',h=member_h)['reviews'])
for value in ({'private':'secret'},'yes',1,[]):
    invalid=json.loads(json.dumps(review_body));invalid['record']['sourceId']='invalid-source-claim-'+uuid.uuid4().hex;invalid['record']['data']['sourceVerified']=value
    call('/api/merchant/imports',invalid,h,400)
print('PASS imported review: native moderation, original timestamp, stable replay/conflict, foreign/private denial and no forged verified-purchase claim')

promotion={'name':{'en-GB':'Original welcome'},'active':False,'code':'MIG-WELCOME','kind':'percentage','amount':10,'rule':{'type':'cartCartAmount','operator':'>=','amount':20},'exclusive':False,'priority':0,'maxUses':3,'start':None,'end':None}
coupon={'version':1,'source':'woocommerce','sourceShop':'source-woo','kind':'coupons','sourceId':'coupon-1','data':{'currency':'EUR','scale':2,'destination':promotion,'sourceRules':{'usage_limit':5,'usage_count':2},'activationReviewed':False},'warnings':[]}
coupon_body={'approve':True,'record':coupon,'options':{}}
coupon_id=call('/api/merchant/imports',coupon_body,h)['id']
assert call('/api/merchant/imports',coupon_body,h)['replayed']
saved=next(r for r in call('/api/automation',h=h)['promotions'] if r['id']==coupon_id)
assert not saved['data']['active'] and saved['data']['maxUses']==3
unsafe=json.loads(json.dumps(saved));unsafe['data']['active']=True
call('/api/automation/promotions/'+coupon_id,unsafe,h,400,method='PUT')
cart=call('/store-api/checkout/cart',{'session':uuid.uuid4().hex},public);buyer={**public,'sw-context-token':cart['token']}
cart=call('/store-api/checkout/cart/line-item',{'items':[{'referencedId':'chair','quantity':1}]},buyer)
before=cart['price']['totalMinor']
cart=call('/store-api/checkout/coupons',{'codes':['MIG-WELCOME'],'revision':cart['revision']},buyer,method='PUT')
assert cart['price']['totalMinor']==before and not any(d['id']==coupon_id for d in cart['discounts'])
safe=json.loads(json.dumps(unsafe));safe['data']['sourceImport']['activationReviewed']=True
call('/api/automation/promotions/'+coupon_id,safe,h,method='PUT')
cart=call('/store-api/checkout/cart',h=buyer)
assert cart['price']['totalMinor']<before and any(d['id']==coupon_id for d in cart['discounts'])
assert call('/api/merchant/imports',coupon_body,h)['replayed']
call('/api/merchant/imports',coupon_body,sh,400)
altered=json.loads(json.dumps(coupon_body));altered['record']['data']['destination']['amount']=99
call('/api/merchant/imports',altered,h,409)
print('PASS imported coupon: inactive native promotion, exact remaining-use snapshot, blocked unreviewed activation, native cart discount after explicit review and non-destructive replay')

# Original spend rules must never compare EUR thresholds to nominal JPY totals.
config=call('/api/merchant/commerce',h=h)
config['data']['currencies']['definitions'].append({'code':'JPY','scale':0,'rate':'160.00000000','strategy':'automatic'})
config['data']['currencies']['enabled'].append('JPY')
call('/api/merchant/commerce',{'revision':config['revision'],'data':config['data']},h,method='PUT')
cart=call('/store-api/checkout/currency',{'currency':'JPY','revision':cart['revision']},buyer,method='PUT')
assert cart['price']['currency']=='JPY' and not any(d['id']==coupon_id for d in cart['discounts']),cart['discounts']
cart=call('/store-api/checkout/currency',{'currency':'EUR','revision':cart['revision']},buyer,method='PUT')
assert any(d['id']==coupon_id for d in cart['discounts'])
print('PASS source coupon currency restriction survives native activation and checkout currency changes')
