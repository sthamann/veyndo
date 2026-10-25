"""Original source -> permissioned gateway/MCP -> private native app -> selected release -> real PostgreSQL checkout."""
import hashlib, json, os, socket, subprocess, sys, time, urllib.request, urllib.error, uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'scripts'))
from testing.app_approval import consent, pin
from testing.runtime import serve, stop, artifact_path
PACKAGE=ROOT/'extensions/apps/shopware-compat'
def port():
    with socket.socket() as s:s.bind(('127.0.0.1',0));return s.getsockname()[1]
def call(base,path,data=None,headers=None,status=200,method=None):
    if path=='/api/apps' and data:data=consent(data)
    req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json',**(headers or {})},method=method)
    try:response=urllib.request.urlopen(req,timeout=60)
    except urllib.error.HTTPError as e:response=e
    raw=response.read();body=json.loads(raw) if raw else {}
    assert response.status==status,(path,response.status,body)
    return body
suffix=uuid.uuid4().hex[:10];tenant='native-'+suffix
core_url=f'http://127.0.0.1:{port()}';adapter_url=f'http://127.0.0.1:{port()}'
gateway='synthetic-native-'+suffix+'x'*30
package=json.loads((PACKAGE/'manifest.json').read_text());ui=(PACKAGE/'ui.html').read_bytes()
services=pin({'shopware_compat':{'url':adapter_url,'uiUrl':adapter_url,'token':gateway,'uiDigests':{'index.html':hashlib.sha256(ui).hexdigest()}}},'shopware_compat',package)
env={**os.environ,'BIND_ADDR':core_url[7:],'BASE_URL':core_url,'PUBLIC_BASE_URL':core_url,'APP_SERVICES':json.dumps(services),'APP_SERVICE_PRIVATE_ORIGINS':adapter_url,'ALLOW_BOOTSTRAP_AUTH':'false','ALLOW_PUBLIC_SIGNUP':'true','SEED_DEMO':'true','MERCHANT_TOKEN':'synthetic-native-owner-'+suffix}
fixture=PACKAGE/'native/tests/fixture'
request={'appId':'imported_discount','version':'1.0.0','files':{p.relative_to(fixture).as_posix():p.read_text() for p in fixture.rglob('*') if p.is_file()}}
core=adapter=None
with artifact_path('shopware-native.log').open('w') as log:
 try:
    core=serve(env,core_url,log)
    owner=call(core_url,'/api/auth/register',{'workspaceId':tenant,'name':'Native importer','email':tenant+'@example.test','password':'Synthetic-Native-Importer-2026!'})
    h={'x-tenant':tenant,'Authorization':'Bearer '+owner['token']}
    call(core_url,'/api/apps',{'manifest':package},h)
    product_id=str(uuid.uuid4())
    product={'id':product_id,'revision':0,'translations':{'en':{'name':'Native discount product','description':'Synthetic comparison product'}},'extra':{},'catalog':{'active':True,'productNumber':'NATIVE-REF','parentId':None,'options':{},'categoryIds':[]},'commerce':{'price':24.9,'taxRate':19,'stock':10,'minPurchase':1,'purchaseSteps':1,'maxPurchase':None,'deliveryDays':3,'listPrice':None,'advancedPrices':[],'media':[],'properties':{}}}
    call(core_url,'/api/merchant/products',product,h)
    adapter=subprocess.Popen([str(ROOT/'target/debug/shopware-compat')],env={**env,'APP_TOKEN':gateway,'SHOPWARE_COMPAT_TENANTS':json.dumps({tenant:{}}),'SHOPWARE_COMPAT_BIND':adapter_url[7:]},stdout=log,stderr=log)
    for _ in range(100):
        if adapter.poll() is not None:raise AssertionError('Native controller stopped; inspect log')
        try:call(adapter_url,'/health');break
        except OSError:time.sleep(.05)
    else:raise AssertionError('Controller unavailable')
    route='/api/apps/shopware_compat/actions/translate'
    report=call(core_url,route,request,h)
    assert report['manifest'] and not report['diagnostics'],report
    manifest=report['manifest']
    assert manifest['permissions']==['commerce.hooks'] and not manifest['entities']
    assert manifest['name']=={'en-GB':'Native discount reference','de-DE':'Nativer Rabattvergleich'}
    # The source compiler is read-only. It does not create an app or bypass review.
    assert all(p['id']!='imported_discount' for p in call(core_url,'/api/apps',headers=h)['packages'])
    call(adapter_url,'/actions/translate',request,{'x-tenant':tenant},401)
    key=call(core_url,'/api/workspace/integrations',{'name':'No developer access','expiresInDays':1,'permissions':['apps.manage']},h)['key']
    call(core_url,route,request,{**h,'Authorization':'Bearer '+key},403)
    developer=call(core_url,'/api/workspace/integrations',{'name':'Translator only','expiresInDays':1,'permissions':['developer.manage']},h)['key']
    dh={**h,'Authorization':'Bearer '+developer}
    grant=call(core_url,'/api/apps/shopware_compat/surfaces/translation/grant',{'context':{}},dh)
    assert grant['actions']==['translate']
    bundle=call(core_url,'/api/apps/shopware_compat/surfaces/translation/bundle',{'grant':grant['token']},dh)
    assert bundle['documentUrl'].startswith('/app-ui/shopware_compat/')
    call(core_url,'/api/apps/shopware_compat/surfaces/workspace/grant',{'context':{}},dh,403)
    call(core_url,'/api/apps/shopware_compat/actions/cells',{},dh,403)
    assert call(core_url,route,request,dh)['sourceDigest']==report['sourceDigest']
    call(core_url,'/api/apps/shopware_compat/surfaces/translation/grant',{'context':{}},{**h,'Authorization':'Bearer '+key},403)
    rpc=call(core_url,'/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'app.shopware_compat.translate','arguments':request}},h)
    assert 'error' not in rpc and not rpc['result'].get('isError'),rpc
    assert rpc['result']['structuredContent']['sourceDigest']==report['sourceDigest']
    bad=json.loads(json.dumps(request));bad['files']['src/DiscountProcessor.php']=bad['files']['src/DiscountProcessor.php'].replace('$definition =',"file_get_contents('https://example.test'); $definition =")
    rejection=call(core_url,route,bad,h);assert rejection['manifest'] is None and rejection['diagnostics'][0]['line']>1
    print('PASS HTTP/MCP source translation, current developer rights, no implicit installation and executable-source rejection',flush=True)
    stage=call(core_url,'/api/environments',{'name':'Imported Shopware private test'},h)['id']
    build=call(core_url,'/api/developer/import',{'environment':stage,'prompt':'Translate a Shopware percentage processor','summary':manifest['name'],'manifest':manifest},h)
    rpc=call(core_url,'/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':'developer.stage','arguments':{'buildId':build['id'],'approve':True,'digest':build['digest']}}},h)
    assert 'error' not in rpc and not rpc['result'].get('isError'),rpc
    assert any(p['id']=='imported_discount' for p in call(core_url,'/api/apps',headers={**h,'x-tenant':stage})['packages'])
    assert all(p['id']!='imported_discount' for p in call(core_url,'/api/apps',headers=h)['packages'])
    change=next(c for c in call(core_url,'/api/environments/'+stage+'/diff',headers=h)['changes'] if c['key']=='app:imported_discount')
    call(core_url,'/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':change['key'],'digest':change['digest']}]},h)
    print('PASS private import, real frozen examples, staged app, unchanged live registry and selected digest-bound publication',flush=True)
    ch={'x-tenant':tenant}
    session=uuid.uuid4().hex
    cart=call(core_url,'/store-api/checkout/cart',{'session':session},ch);ch['sw-context-token']=cart['token']
    cart=call(core_url,'/store-api/checkout/cart/line-item',{'items':[{'referencedId':product_id,'quantity':1}]},ch)
    assert cart['appHookOutcomes'][0]['minor']==249,cart
    assert cart['price']['positionPrice']==22.41,cart['price']
    address={'name':'Native Buyer','firstName':'Native','lastName':'Buyer','street':'Fixture Street 1','postalCode':'10115','city':'Berlin','country':'DE'}
    call(core_url,'/store-api/checkout/context',{'revision':cart['revision'],'checkout':{'country':'DE','shippingMethodId':'pickup','paymentMethodId':'bank-transfer','address':address,'billingAddress':address,'customerEmail':tenant+'@example.test'}},ch,method='PUT')
    cart=call(core_url,'/store-api/checkout/cart',headers=ch)
    oh={**ch,'Idempotency-Key':uuid.uuid4().hex,'x-commerce-cart-revision':str(cart['revision']),'x-commerce-total-minor':str(round(cart['price']['totalPrice']*100))}
    order=call(core_url,'/store-api/checkout/order',{},oh)
    assert order['cart']['appHookOutcomes']==cart['appHookOutcomes']
    assert order['cart']['price']['positionPrice']==22.41
    assert call(core_url,'/store-api/checkout/order',{},oh)['id']==order['id']
    remaining=call(core_url,'/api/merchant/products/'+product_id,headers=h);assert remaining['commerce']['stock']==9
    # Checkout keeps the completed snapshot for safe order recovery; the frontend starts a fresh active cart.
    empty=call(core_url,'/store-api/checkout/cart',{'session':session},ch)
    assert empty['token']!=cart['token'] and not empty['lineItems'],empty
    other=tenant+'-other';u=call(core_url,'/api/auth/register',{'workspaceId':other,'name':'Other','email':other+'@example.test','password':'Synthetic-Native-Importer-2026!'})
    c=call(core_url,'/store-api/checkout/cart',{'session':uuid.uuid4().hex},{'x-tenant':other});assert not c['appHookOutcomes']
    artifact_path('shopware-native-result.json').write_text(json.dumps({'sourceDigest':report['sourceDigest'],'profile':report['profile'],'stock':remaining['commerce']['stock'],'orderId':order['id'],'positionPrice':order['cart']['price']['positionPrice'],'appHookOutcomes':order['cart']['appHookOutcomes'],'emptyCart':not empty['lineItems'],'tests':'HTTP, MCP, rights, private import, selected release, PostgreSQL order, idempotency, tenant isolation'},indent=2)+'\n')
    print('PASS native discounted purchase, persisted app digest, idempotent order, empty cart and other-shop isolation',flush=True)
    if os.environ.get('SHOPWARE_NATIVE_KEEP_RUNNING')=='1':
        print('Browser acceptance: '+core_url+'/?shop='+tenant+'&studio=apps#merchant',flush=True)
        print('Synthetic account: '+tenant+'@example.test',flush=True)
        try:
            while True:time.sleep(1)
        except KeyboardInterrupt:pass
 finally:
    if adapter:stop(adapter)
    if core:stop(core)
