"""Actual Rust HTTP source -> reviewed native job -> scoped callback -> native private product."""
import subprocess,threading,time,socket,base64,tempfile
export_files={}
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from testing.runtime import ROOT,serve,stop
from testing.database import psql
from testing.app_approval import consent
exec(compile((ROOT/'extensions/apps/migration/tests/crm_sources.py').read_text(),'crm_sources.py','exec'))
class SourceFixture(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        if self.path.startswith('/public-frozen/'):
            assert self.headers.get('Authorization') is None
            path=self.path.replace('/public-frozen/','/frozen/',1)
            if path not in export_files:self.send_error(404);return
            self.send_response(200);self.end_headers();self.wfile.write(export_files[path]);return
        if self.path.startswith('/frozen/'):
            assert self.headers.get('Authorization')=='Bearer frozen-export-synthetic'
            if self.path not in export_files:self.send_error(404);return
            self.send_response(200);self.end_headers();self.wfile.write(export_files[self.path]);return
        if self.headers.get('Authorization')=='Bearer empty-source-synthetic':
            self.send_response(200);self.send_header('X-WP-TotalPages','1');self.end_headers();self.wfile.write(b'[]');return
        crm=crm_get(self.path,self.headers.get('Authorization'),a['workspace'])
        if crm is not None:
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps(crm).encode());return
        provider_rows={
            '/api/products':('Basic '+base64.b64encode(b'provider-source-synthetic:').decode(),{'products':[{'id':501,'name':'Original Presta net cup','price':'12.500000','active':'0','visibility':'both'}]}),
            '/rest/V1/products':('Bearer provider-source-synthetic',{'items':[{'id':601,'sku':'MIG-MAG-601','name':'Original Magento cup','price':'15.25','status':2,'visibility':4,'type_id':'simple'}],'total_count':1}),
            '/api/articles':('Basic '+base64.b64encode(b'fixture:provider-source-synthetic').decode(),{'data':[{'id':701,'active':False,'name':'Original Shopware cup','mainDetail':{'id':711,'number':'MIG-SW-711','active':True,'prices':[{'price':'29.90'}]}}],'total':1}),
        }
        if self.path.split('?')[0] in provider_rows:
            auth,body=provider_rows[self.path.split('?')[0]]
            assert self.headers.get('Authorization')==auth
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps(body).encode());return
        if self.path.startswith('/source-cup.png'):
            assert self.headers.get('Authorization') is None
            self.send_response(200);self.send_header('Content-Type','image/png');self.end_headers();self.wfile.write(png);return
        if self.headers.get('Authorization') in ('Bearer variable-source-synthetic','Bearer slow-source-synthetic'):
            path=self.path.split('?')[0]
            if self.headers.get('Authorization')=='Bearer slow-source-synthetic' and path=='/wp-json/wc/v3/products':time.sleep(6)
            if path=='/wp-json/wc/v3/products':body=[{'id':200,'name':'Variable source cup','type':'variable','status':'publish','attributes':[{'name':'Colour','variation':True,'options':['Blue','Red']}],'variations':[201,202],'images':[{'src':f'http://127.0.0.1:{source.server_port}/source-cup.png'}]}]
            elif path=='/wp-json/wc/v3/products/200/variations':body=[{'id':201,'price':'19.90','sku':'SOURCE-BLUE-201','status':'publish','stock_quantity':3,'attributes':[{'name':'Colour','option':'Blue'}],'image':{'src':f'http://127.0.0.1:{source.server_port}/source-cup.png'}},{'id':202,'price':'21.50','sku':'SOURCE-RED-202','status':'private','stock_quantity':4,'attributes':[{'name':'Colour','option':'Red'}]}]
            else:self.send_error(404);return
            self.send_response(200);self.send_header('X-WP-TotalPages','1');self.end_headers();self.wfile.write(json.dumps(body).encode());return
        if self.headers.get('Authorization')!='Bearer source-read-synthetic':self.send_error(403);return
        if self.path.split('?')[0]=='/wp-json/wc/v3/products':body=[{'id':90,'name':'Source ceramic cup','sku':'SOURCE-CUP-90','price':'19.90','description':'Original source text','stock_quantity':9,'images':[{'src':f'http://127.0.0.1:{source.server_port}/source-cup.png'}]}]
        elif self.path.startswith('/wp-json/wc/v3/products/reviews'):body=[{'id':96,'product_id':90,'review':'Original source review','rating':5,'reviewer':'Source reviewer','verified':True,'date_created_gmt':'2020-01-02T03:04:05'}]
        elif self.path.startswith('/wp-json/wc/v3/coupons'):body=[{'id':97,'code':'SOURCE-WELCOME','amount':'10','discount_type':'percent','usage_limit':5,'usage_count':2}]
        elif self.path.startswith('/wp-json/wc/v3/products/categories'):body=[{'id':91,'name':'Source ceramics','slug':'source-ceramics','parent':0}]
        elif self.path.startswith('/wp-json/wc/v3/customers'):body=[{'id':92,'email':'source-'+a['workspace']+'@example.test','first_name':'Source','last_name':'Buyer'}]
        elif self.path.startswith('/wp-json/wc/v3/orders'):body=[{'id':93,'number':'SOURCE-93','currency':'EUR','total':'19.90','date_created_gmt':'2020-01-02T03:04:05','status':'completed','line_items':[{'id':94,'name':'Old cup','quantity':1,'price':'19.90','product_id':90}]}]
        elif self.path.startswith('/wp-json/wp/v2/pages'):body=[{'id':95,'title':{'rendered':'Source workshop'},'content':{'rendered':'<p>Made with <strong>care</strong>.</p>'},'slug':'source-workshop'}]
        else:self.send_error(404);return
        self.send_response(200);self.send_header('X-WP-TotalPages','1');self.end_headers();self.wfile.write(json.dumps(body).encode())
    def do_POST(self):
        assert self.path.startswith('/admin/api/2026-10/graphql.json')
        assert self.headers.get('X-Shopify-Access-Token')=='provider-source-synthetic'
        query=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))))
        crm=crm_shopify(query['query'],a['workspace'])
        if crm is not None:
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps(crm).encode());return
        assert 'status onlineStoreUrl' in query['query']
        body={'data':{'products':{'nodes':[{'id':'gid://shopify/Product/801','title':'Original Shopify draft','status':'DRAFT','onlineStoreUrl':None,'variants':{'nodes':[{'id':'gid://shopify/ProductVariant/811','title':'Default','sku':'MIG-SH-811','price':'19.90'}],'pageInfo':{'hasNextPage':False}},'images':{'nodes':[],'pageInfo':{'hasNextPage':False}}}],'pageInfo':{'hasNextPage':False,'endCursor':None}}}}
        self.send_response(200);self.end_headers();self.wfile.write(json.dumps(body).encode())
source=ThreadingHTTPServer(('127.0.0.1',0),SourceFixture);threading.Thread(target=source.serve_forever,daemon=True).start()
call('/api/apps',consent({'builtIn':'migration'}),h)
package=next(p for p in call('/api/apps',h=h)['packages'] if p['id']=='migration')
call('/api/apps/migration/credentials',{'approve':True,'digest':package['digest'],'permissions':['jobs.write']*33,'expiresInDays':1},h,400)
call('/api/apps/migration/credentials',{'approve':True,'digest':package['digest'],'permissions':['payments.record'],'expiresInDays':1},h,400)
key=call('/api/apps/migration/credentials',{'approve':True,'digest':package['digest'],'permissions':['jobs.write','products.write','orders.read','orders.import','customers.write','customers.pii','settings.read','data.write','assets.write','reviews.write','promotions.write','products.read','assets.read','customers.read','data.read'],'expiresInDays':1},h)['key']
with socket.socket() as probe:probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
service=f'http://127.0.0.1:{port}';gateway='synthetic-migration-gateway-'+'x'*32
source_origin=f'http://127.0.0.1:{source.server_port}'
with socket.socket() as probe:probe.bind(('127.0.0.1',0));core_port=probe.getsockname()[1]
core_url=f'http://127.0.0.1:{core_port}'
original_base=BASE
binding=call('/api/apps/migration/settings',h=h)
call('/api/apps/migration/settings',{'approve':True,'digest':binding['digest'],'revision':binding['revision'],'values':{'system':'woocommerce','origin':source_origin,'token':'source-read-synthetic','version':'wc/v3','currency':'EUR','scale':2,'locale':'en-GB'}},h,method='PUT')
assert 'source-read-synthetic' not in json.dumps(call('/api/apps/migration/settings',h=h))
env={**os.environ,'MIGRATION_ALLOW_FIXTURE':'1','MIGRATION_BIND':f'127.0.0.1:{port}','MIGRATION_GATEWAY_TOKEN':gateway,'MIGRATION_CALLBACKS':json.dumps({a['workspace']:{'coreUrl':core_url,'token':key}}),'MIGRATION_SOURCES':json.dumps({a['workspace']:{'fixture':{'system':'woocommerce','origin':source_origin,'token':'source-read-synthetic','version':'wc/v3','currency':'EUR','scale':2,'locale':'en-GB'},'slow':{'system':'woocommerce','origin':source_origin,'token':'slow-source-synthetic','version':'wc/v3','currency':'EUR','scale':2,'locale':'en-GB'},'variable':{'system':'woocommerce','origin':source_origin,'token':'variable-source-synthetic','version':'wc/v3','currency':'EUR','scale':2,'locale':'en-GB'}}})}
profiles=json.loads(env['MIGRATION_SOURCES'])
profiles[a['workspace']]['empty']={**profiles[a['workspace']]['fixture'],'token':'empty-source-synthetic'}
for system in ('prestashop','magento2','shopware5','shopify'):
    profiles[a['workspace']][system]={'system':system,'origin':source_origin,'token':'provider-source-synthetic','username':'fixture' if system=='shopware5' else '', 'version':'2026-10' if system=='shopify' else 'explicit-fixture-profile','currency':'EUR','scale':2,'locale':'en-GB'}
export_directory=tempfile.TemporaryDirectory()
export_path=Path(export_directory.name)/'snapshot'
raw=''.join(json.dumps({'id':2000+i,'name':'Frozen export cup '+str(i),'sku':'FROZEN-'+str(i),'price':'12.50','stock_quantity':9})+'\n' for i in range(52))
packed=subprocess.run([str(ROOT/'target/debug/migration-assistant'),'pack','woocommerce','products','EUR','en-GB','https://frozen-source.example','wc/v3',str(export_path)],input=raw,text=True,capture_output=True)
assert packed.returncode==0,packed.stderr
frozen_bytes=(export_path/'manifest.json').read_bytes();frozen_manifest=json.loads(frozen_bytes);frozen_digest=hashlib.sha256(frozen_bytes).hexdigest()
export_files['/frozen/manifest.json']=frozen_bytes
for frozen_page in frozen_manifest['pages']:export_files['/frozen/'+frozen_page['path']]=(export_path/frozen_page['path']).read_bytes()
profiles[a['workspace']]['frozen']={'system':'woocommerce','origin':'https://frozen-source.example','token':'api-must-not-forward','version':'wc/v3','currency':'EUR','scale':2,'locale':'en-GB','exportManifest':source_origin+'/frozen/manifest.json','exportDigest':frozen_digest,'exportToken':'frozen-export-synthetic'}
profiles[a['workspace']]['public-frozen']={**profiles[a['workspace']]['frozen'],'exportManifest':source_origin+'/public-frozen/manifest.json','exportPublic':True,'exportToken':'must-not-be-forwarded-on-public-reads'}
env['MIGRATION_SOURCES']=json.dumps(profiles)
log=open(ROOT/'artifacts/migration-live-service.log','w');process=subprocess.Popen([str(ROOT/'target/debug/migration-assistant'),'serve'],env=env,stdout=log,stderr=log)
def service_call(path,value):
    req=urllib.request.Request(service+path,data=json.dumps(value).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+gateway,'x-tenant':a['workspace']})
    with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)
core_log=open(ROOT/'artifacts/migration-live-core.log','w')
core_env={**os.environ,'BIND_ADDR':f'127.0.0.1:{core_port}','BASE_URL':core_url,'APP_SERVICES':json.dumps({'migration':{'url':service,'token':gateway}}),'PROCESS_ROLE':'all'}
core_process=None
try:
    for _ in range(50):
        try:
            with urllib.request.urlopen(service+'/health',timeout=.2):break
        except OSError:time.sleep(.1)
    core_process=serve(core_env,core_url,core_log)
    BASE=core_url
    started=time.monotonic()
    pending=call('/api/apps/migration/actions/review_products',{'sourceId':'slow'}, {**h,'Idempotency-Key':'slow-source-inspection'})
    assert pending.get('jobId') and time.monotonic()-started<3,pending
    for _ in range(160):
        inspection=call('/api/apps/migration/jobs/'+pending['jobId'],h=h)
        if inspection['status'] not in ('queued','running'):break
        time.sleep(.1)
    assert inspection['status']=='succeeded',inspection
    assert inspection['result']['records'] and len(json.dumps(inspection['result']).encode())<32768
    print('PASS slow source inspection returns immediately through the real Core gateway and completes in its durable native job')
    cancelled=call('/api/apps/migration/actions/review_products',{'sourceId':'slow'}, {**h,'Idempotency-Key':'cancelled-source-inspection'})['jobId']
    for _ in range(50):
        pending_cancel=call('/api/apps/migration/jobs/'+cancelled,h=h)
        if pending_cancel['status']=='running':break
        time.sleep(.1)
    assert pending_cancel['status']=='running',pending_cancel
    call('/api/apps/migration/jobs/'+cancelled,{'operation':'cancel','revision':pending_cancel['revision']},h)
    for _ in range(160):
        stopped=call('/api/apps/migration/jobs/'+cancelled,h=h)
        if stopped['status'] not in ('queued','running','cancel_requested'):break
        time.sleep(.1)
    assert stopped['status']=='cancelled' and not stopped.get('result'),stopped
    print('PASS cancelled source inspection never presents records as approved/completed')
    def inspect_source(domain,source_id='installed',cursor=None,job_group=None):
        pending=call('/api/apps/migration/actions/review_'+domain,{'sourceId':source_id,**({'cursor':cursor} if cursor else {}),**({'jobGroup':job_group} if job_group else {})},{**h,'Idempotency-Key':uuid.uuid4().hex})
        for _ in range(160):
            result=call('/api/apps/migration/jobs/'+pending['jobId'],h=h)
            if result['status'] not in ('queued','running'):break
            time.sleep(.1)
        assert result['status']=='succeeded',(domain,result)
        assert 'target' not in result['result'] and len(json.dumps(result['result']).encode())<32768
        return result['result']
    page=inspect_source('products')
    assert 'source-read-synthetic' not in json.dumps(page)
    call('/api/apps',consent({'builtIn':'site_builder'}),h)
    target=call('/api/environments',{'name':'Source service preview'},h)['id']
    intent={'sourceId':'installed','kind':'products','target':target,'options':{'channelId':'default','taxRate':19},'recordDigests':page['recordDigests']}
    job=call('/api/apps/migration/actions/import_products',intent,{**h,'Idempotency-Key':'service-flow'})['jobId']
    for _ in range(100):
        state=call('/api/apps/migration/jobs/'+job,h=h)
        if state['status'] not in ['queued','running']:break
        time.sleep(.1)
    assert state['status']=='succeeded',state
    assert state['result']['imported']==state['result']['reviewed']==1
    assert state['result']['reconciled'] and not state['result']['cutoverReady']
    r=page['records'][0]
    native_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],r['source'],r['sourceShop'],r['kind'],r['sourceId']],separators=(',',':')).encode()).digest()[:16]))
    native=call('/api/merchant/products/'+native_id,h={**h,'x-tenant':target})
    assert native['commerce']['stock']==0 and native['commerce']['price']==19.9
    call('/api/merchant/products/'+native['id'],h=h,status=404)
    print('PASS source HTTP -> independent Rust service -> exact review digests -> durable native job -> private product, reconciliation and no live catalogue mutation')
    destination_digest=next(p['digest'] for p in call('/api/apps',h=h)['packages'] if p['id']=='site_builder')
    for domain,options in [('assets',{}),('categories',{}),('pages',{'destinationDigest':destination_digest}),('customers',{'customerGroup':'consumer'}),('orders',{'channelId':'default','locale':'en-GB'}),('reviews',{}),('coupons',{})]:
        if domain=='reviews':exec(compile((ROOT/'extensions/apps/migration/tests/purchase.py').read_text(),'purchase.py','exec'))
        source_page=inspect_source(domain)
        dest=target if domain in ('categories','pages','assets') else a['workspace']
        command={'sourceId':'installed','kind':domain,'target':dest,'options':options,'recordDigests':source_page['recordDigests']}
        jid=call('/api/apps/migration/actions/import_'+domain,command,{**h,'Idempotency-Key':'service-flow-'+domain})['jobId']
        for _ in range(100):
            saved=call('/api/apps/migration/jobs/'+jid,h=h)
            if saved['status'] not in ['queued','running']:break
            time.sleep(.1)
        assert saved['status']=='succeeded',(domain,saved)
        assert saved['result']['comparison']['matching']==saved['result']['reviewed']==1,(domain,saved['result'])
        assert saved['result']['reconciled'],(domain,saved['result'])
        source_row=source_page['records'][0]
        dest_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],source_row['source'],source_row['sourceShop'],domain,source_row['sourceId']],separators=(',',':')).encode()).digest()[:16]))
        if domain=='coupons':
            import base64
            dest_id='m_'+base64.b32encode(uuid.UUID(dest_id).bytes).decode().lower().rstrip('=')
            promo=next(x for x in call('/api/automation',h=h)['promotions'] if x['id']==dest_id)
            assert not promo['data']['active'] and promo['data']['maxUses']==3
        elif domain=='reviews':
            review=next(x for x in call('/api/merchant/commerce',h=h)['reviews'] if x['id']==dest_id)
            assert not review['approved'] and not review['verifiedPurchase']
        elif domain=='assets':
            assert len(call('/api/merchant/products/'+native_id+'/assets',h={**h,'x-tenant':target})['elements'])==1
            assert len(call('/api/merchant/products/'+native_id,h={**h,'x-tenant':target})['commerce']['media'])==1
        elif domain=='categories':assert any(x['id']==dest_id for x in call('/api/merchant/categories',h={**h,'x-tenant':target})['elements'])
        elif domain=='pages':assert call('/api/apps/site_builder/actions/editor_pages',{'id':dest_id},{**h,'x-tenant':target})['elements'][0]['status']=='draft'
        elif domain=='customers':assert call('/api/merchant/customers/'+source_row['data']['email'],h=h)['id']==dest_id
        else:assert call('/api/merchant/orders/'+dest_id,h=h)['payment']['realMoneyCharged'] is False
    permissions=['apps.read','apps.manage','customers.read','customers.pii']
    role='migration_reader'
    call('/api/workspace/roles/'+role,{'revision':0,'data':{'name':{'en-GB':role},'active':True,'permissions':permissions}},h,method='PUT')
    invitation=call('/api/workspace/invitations',{'role':role,'email':uuid.uuid4().hex+'@example.test'},h)
    reader=call('/api/auth/accept',{'name':'Migration reader','password':'Migration-fixture-2026!','invitationToken':invitation['token']})
    reader_h={'Authorization':'Bearer '+reader['token'],'x-tenant':a['workspace']}
    customer_job=next(j for j in call('/api/apps/migration/jobs',h=reader_h)['jobs'] if j['action']=='review_customers')
    assert customer_job['result']['records'][0]['data']['email']
    assert call('/api/apps/migration/jobs/'+customer_job['id'],h=reader_h)['result']['records']
    call('/api/apps/migration/jobs/'+customer_job['id'],h=fh,status=404)
    call('/api/workspace/roles/'+role,{'revision':1,'data':{'name':{'en-GB':role},'active':True,'permissions':['apps.read','apps.manage','customers.read']}},h,method='PUT')
    assert next(j for j in call('/api/apps/migration/jobs',h=reader_h)['jobs'] if j['id']==customer_job['id'])['result'] is None
    call('/api/apps/migration/jobs/'+customer_job['id'],h=reader_h,status=403)
    print('PASS saved source PII requires current paired rights; revocation redacts list and denies detail, foreign access denied')
    print('PASS all eight implemented source domains traverse the real gateway/service/outbox/native-write path')
    exec(compile((ROOT/'extensions/apps/migration/tests/durable_flow.py').read_text(),'durable_flow.py','exec'))
    exec(compile((ROOT/'extensions/apps/migration/tests/variable_flow.py').read_text(),'variable_flow.py','exec'))
    exec(compile((ROOT/'extensions/apps/migration/tests/provider_flow.py').read_text(),'provider_flow.py','exec'))
    exec(compile((ROOT/'extensions/apps/migration/tests/provider_crm_flow.py').read_text(),'provider_crm_flow.py','exec'))
    exec(compile((ROOT/'extensions/apps/migration/tests/run_flow.py').read_text(),'run_flow.py','exec'))
    exec(compile((ROOT/'extensions/apps/migration/tests/export_flow.py').read_text(),'export_flow.py','exec'))
    if os.environ.get('MIGRATION_BROWSER')=='1':
        import signal
        metadata={'url':BASE+'/?shop='+a['workspace']+'&studio=channels#merchant','email':EMAILS[0],'workspace':a['workspace']}
        (ROOT/'artifacts/migration-browser-fixture.json').write_text(json.dumps(metadata))
        print('Browser fixture ready:',metadata['url'],flush=True)
        signal.pause()

finally:
    BASE=original_base
    if core_process:stop(core_process)
    core_log.close()
    process.terminate();process.wait(timeout=10);log.close();source.shutdown();source.server_close();export_directory.cleanup()
