"""Native historical intake must preserve money/identity without purchase effects or account inference."""
import json,os,uuid,urllib.request,urllib.error
BASE=os.environ['BASE_URL']
def call(path,v=None,h=None,status=200,method=None):
    req=urllib.request.Request(BASE+path,data=None if v is None else json.dumps(v).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as r:code,body=r.status,r.read()
    except urllib.error.HTTPError as e:
        with e:code,body=e.code,e.read()
    assert code==status,(path,code,status,body[:800]);return json.loads(body)
EMAILS=[]
def shop():
    s=uuid.uuid4().hex[:10];EMAILS.append(s+'@example.test');return call('/api/auth/register',{'name':'Migration Test','email':s+'@example.test','password':'Migration-fixture-2026!','workspaceId':'migration-'+s,'workspaceName':'Migration synthetic'})
a,b=shop(),shop();h={'Authorization':'Bearer '+a['token'],'x-tenant':a['workspace']};fh={'Authorization':'Bearer '+b['token'],'x-tenant':b['workspace']}
row={'version':1,'source':'shopify','sourceShop':'original-shop','kind':'orders','sourceId':'old-17','data':{'number':'OLD-17','total':{'currency':'EUR','scale':2,'minor':12990},'sourcePaymentStatus':'paid','sourceOrderStatus':'fulfilled','createdAt':'2021-01-02T10:00:00Z','lines':[{'sourceId':'old-line-1','label':'Altes Produkt','quantity':1,'unitPrice':{'currency':'EUR','scale':2,'minor':12990}}],'historical':True},'warnings':[]}
body={'approve':True,'record':row,'options':{'channelId':'default'}}
call('/api/merchant/imports',body,status=401)
call('/api/merchant/imports',{**body,'approve':False},h,400)
r=call('/api/merchant/imports',body,h);oid=r['id'];assert r['replayed'] is False
again=call('/api/merchant/imports',body,h);assert again['id']==oid and again['replayed']
changed=json.loads(json.dumps(body));changed['record']['data']['total']['minor']=1
call('/api/merchant/imports',changed,h,409)
o=call('/api/merchant/orders/'+oid,h=h);assert o['totalMinor']==12990 and o['orderNumber']=='OLD-17';assert o['historicalImport']['sourceId']=='old-17'
assert o['payment']['state']=='historical' and o['payment']['realMoneyCharged'] is False
assert o.get('orderCustomer',{}).get('customerId') is None
call('/api/merchant/orders/'+oid,h=fh,status=404)
assert call('/api/merchant/products/chair',h=h)['commerce']['stock']==20
call('/api/merchant/orders/'+oid+'/receipts',{'kind':'invoice','revision':1,'requestKey':'no-reinvoice-17','locale':'de'},h,409)
assert call('/api/merchant/orders/'+oid+'/receipts',h=h)['elements']==[]
other=call('/api/merchant/imports',body,fh);assert other['id']!=oid
print('PASS historical native order: exact total/date, source identity, replay/conflict, foreign denial, no stock/payment/invoice or guessed customer identity')

# Real products enter only a private sandbox and preserve native creation/release semantics.
stage=call('/api/environments',{'name':'Migration preview'},h)['id'];sh={**h,'x-tenant':stage}
product={'version':1,'source':'woocommerce','sourceShop':'source-woo','kind':'products','sourceId':'product-9','data':{'name':{'en-GB':'Migrated mug'},'description':{'en-GB':'Original description'},'sku':'MIG-9','price':{'currency':'EUR','scale':2,'minor':1990},'stock':7},'warnings':[]}
pbody={'approve':True,'record':product,'options':{'channelId':'default','taxRate':19}}
call('/api/merchant/imports',pbody,h,400)
p=call('/api/merchant/imports',pbody,sh);pid=p['id']
assert call('/api/merchant/imports',pbody,sh)['replayed']
assert call('/api/merchant/products/'+pid,h=sh)['commerce']['stock']==0
call('/api/merchant/products/'+pid,h=h,status=404)
stage2=call('/api/environments',{'name':'Second migration preview'},h)['id']
assert call('/api/merchant/imports',pbody,{**h,'x-tenant':stage2})['id']==pid
print('PASS native product migration: private-only draft, exact price, zero active stock and stable replay')
# Explicit source catalogue visibility must survive the generic native import owner.
inactive=json.loads(json.dumps(pbody));inactive['record']['sourceId']='hidden-source-product';inactive['record']['data'].update({'sku':'MIG-HIDDEN','catalogActive':False})
hidden=call('/api/merchant/imports',inactive,sh)['id']
assert call('/api/merchant/products/'+hidden,h=sh)['catalog']['active'] is False
malformed=json.loads(json.dumps(inactive));malformed['record']['sourceId']='bad-visibility';malformed['record']['data']['catalogActive']='false'
call('/api/merchant/imports',malformed,sh,400)
print('PASS original explicit catalogue visibility is preserved; malformed visibility is rejected')
# A realistic multilingual record must not duplicate full text inside bounded identity metadata.
multilingual=json.loads(json.dumps(pbody));multilingual['record']['sourceId']='multilingual-product';multilingual['record']['data']['sku']='MIG-MULTI'
multilingual['record']['data']['name']={'en-GB':'Imported guide','de-DE':'Importierter Ratgeber','fr-FR':'Guide importe'}
multilingual['record']['data']['description']={locale:'A'*3900 for locale in ('en-GB','de-DE','fr-FR')}
mid=call('/api/merchant/imports',multilingual,sh)['id']
ms=call('/api/merchant/products/'+mid,h=sh)
assert ms['translations']['en']['description']=='A'*3900 and len(json.dumps(ms['extra']['identity']))<8000
print('PASS multilingual product text uses native translations without unbounded duplicated identity snapshots')
exec(compile(open(__file__.replace('native_import.py','price_basis.py')).read(),'price_basis.py','exec'))
exec(compile(open(__file__.replace('native_import.py','assets.py')).read(),'assets.py','exec'))
# Categories keep their real native hierarchy, exact source identity and private release ownership.
category={'version':1,'source':'woocommerce','sourceShop':'source-woo','kind':'categories','sourceId':'cat-10','data':{'title':{'en-GB':'Ceramics'},'body':{'en-GB':'Original category'},'slug':{'en-GB':'ceramics'},'parentSourceId':None},'warnings':[]}
kbody={'approve':True,'record':category,'options':{}}
call('/api/merchant/imports',kbody,h,400)
parent=call('/api/merchant/imports',kbody,sh)['id']
assert call('/api/merchant/imports',kbody,sh)['replayed']
child=json.loads(json.dumps(kbody));child['record']['sourceId']='cat-11';child['record']['data']['parentSourceId']='cat-10';child['record']['data']['title']={'en-GB':'Cups'}
child_id=call('/api/merchant/imports',child,sh)['id']
tree=call('/api/merchant/categories',h=sh)['elements']
assert next(c for c in tree if c['id']==child_id)['parentId']==parent
assert not any(c['id']==parent for c in call('/api/merchant/categories',h=h)['elements'])
child['record']['data']['title']={'en-GB':'Changed'}
call('/api/merchant/imports',child,sh,409)
missing=json.loads(json.dumps(kbody));missing['record']['sourceId']='cat-12';missing['record']['data']['parentSourceId']='foreign-parent'
call('/api/merchant/imports',missing,sh,400)
print('PASS native categories: private hierarchy, exact replay/conflict and missing/foreign parent denial')
# Variant and category references use the destination's native associations, not inert provenance.
variant=json.loads(json.dumps(pbody));variant['record']['sourceId']='variant-10';variant['record']['data'].update({'sku':'MIG-V10','parentSourceId':'product-9','options':{'Colour':'Blue'},'categorySourceIds':['cat-11']})
vid=call('/api/merchant/imports',variant,sh)['id']
ve=call('/api/merchant/products/'+vid,h=sh)
assert ve['catalog']['parentId']==pid and ve['catalog']['options']=={'Colour':'Blue'},ve['catalog']
assert ve['catalog']['categoryIds']==[child_id]
print('PASS native product associations: variant parent, option combination and imported category')
exec(compile(open(__file__.replace('native_import.py','publication.py')).read(),'publication.py','exec'))
exec(compile(open(__file__.replace('native_import.py','reviews_coupons.py')).read(),'reviews_coupons.py','exec'))
customer={'version':1,'source':'woocommerce','sourceShop':'source-woo','kind':'customers','sourceId':'customer-4','data':{'email':'migration-customer-'+uuid.uuid4().hex[:8]+'@example.test','firstName':'Migration','lastName':'Buyer','billingAddress':{'name':'Migration Buyer','firstName':'Migration','lastName':'Buyer','street':'Test Street 1','city':'Berlin','postalCode':'10115','country':'DE'}},'warnings':[]}
cbody={'approve':True,'record':customer,'options':{'customerGroup':'consumer'}}
c=call('/api/merchant/imports',cbody,h);assert call('/api/merchant/imports',cbody,h)['id']==c['id']
cd=call('/api/merchant/customers/'+customer['data']['email'],h=h);assert cd['id']==c['id'] and cd['addresses']['elements']
call('/store-api/account/login',{'email':customer['data']['email'],'password':'Migration-fixture-2026!'}, {'x-tenant':a['workspace']},401)
print('PASS native customer migration: addresses, stable source ID, no issued credential or account ownership inference')
book=json.loads(json.dumps(cbody));book['record']['sourceId']='customer-book';book['record']['data']['email']='migration-book-'+uuid.uuid4().hex[:8]+'@example.test'
book['record']['data']['shippingAddress']={**customer['data']['billingAddress'],'street':'Delivery Street 2'}
book['record']['data']['additionalAddresses']=[{**customer['data']['billingAddress'],'street':'Warehouse Street 3'}]
call('/api/merchant/imports',book,h);call('/api/merchant/imports',book,h)
address_book=call('/api/merchant/customers/'+book['record']['data']['email'],h=h)['addresses'];addresses=address_book['elements']
assert len(addresses)==3 and {x['address']['street'] for x in addresses}=={'Test Street 1','Delivery Street 2','Warehouse Street 3'},addresses
assert next(x for x in addresses if x['id']==address_book['defaultBillingAddressId'])['address']['street']=='Test Street 1'
assert next(x for x in addresses if x['id']==address_book['defaultShippingAddressId'])['address']['street']=='Delivery Street 2'
print('PASS native imported address book: billing, shipping and additional original addresses; replay creates no duplicates')
broken_book=json.loads(json.dumps(book));broken_book['record']['sourceId']='invalid-book';broken_book['record']['data']['email']='invalid-book-'+uuid.uuid4().hex[:8]+'@example.test';broken_book['record']['data']['additionalAddresses'][0]['country']='ZZ'
call('/api/merchant/imports',broken_book,h,status=400)
call('/api/merchant/customers/'+broken_book['record']['data']['email'],h=h,status=404)
region_shop=shop();region_h={'Authorization':'Bearer '+region_shop['token'],'x-tenant':region_shop['workspace']}
region_config=call('/api/merchant/commerce',h=region_h)
germany=next(c for c in call('/store-api/countries',h={'x-tenant':region_shop['workspace']})['countries'] if c['code']=='DE')
germany['states']=[{'code':'DE-BE','name':{'en':'Berlin','de':'Berlin','es':'Berlín','fr':'Berlin'}}]
region_config['data']['countryDefinitions']=[germany]
call('/api/merchant/commerce',region_config,region_h,method='PUT')
regional=json.loads(json.dumps(cbody));regional['record']['sourceId']='regional-book';regional['record']['data']['billingAddress']['countryStateId']='DE-BE'
call('/api/merchant/imports',regional,region_h)
stored=call('/api/merchant/customers/'+regional['record']['data']['email'],h=region_h)
assert stored['addresses']['elements'][0]['address']['countryStateId']=='DE-BE'
print('PASS complete native address validation: invalid additional address rolls back; configured subdivision survives original import')
from testing.database import psql
import subprocess
from urllib.parse import urlsplit
owner=urlsplit(os.environ['DATABASE_URL']).username or 'commerce'
query=f"SELECT count(*) FROM outbox WHERE tenant='{a['workspace']}' AND kind='migration.record.imported' AND data->>'customerId'='{c['id']}'"
assert subprocess.check_output(psql(os.environ.get('TEST_DB_CONTAINER','veyndo-postgres-1'),owner,os.environ['TEST_DATABASE'],'-Atc',query),text=True).strip()=='1'
query=f"SELECT count(*) FROM outbox WHERE tenant='{a['workspace']}' AND kind IN ('customer.created','customer.address_changed') AND data->>'email'='{book['record']['data']['email']}'"
assert subprocess.check_output(psql(os.environ.get('TEST_DB_CONTAINER','veyndo-postgres-1'),owner,os.environ['TEST_DATABASE'],'-Atc',query),text=True).strip()=='0'
print('PASS original CRM import emits its migration event without ordinary address-change workflows')
exec(compile(open(__file__.replace('native_import.py','pages.py')).read(),'pages.py','exec'))
exec(compile(open(__file__.replace('native_import.py','job_import.py')).read(),'job_import.py','exec'))
exec(compile(open(__file__.replace('native_import.py','service_flow.py')).read(),'service_flow.py','exec'))
