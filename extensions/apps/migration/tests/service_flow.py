"""Actual Rust HTTP source -> reviewed native job -> scoped callback -> native private product."""
import subprocess,threading,time,socket
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from testing.runtime import ROOT,serve,stop
from testing.database import psql
from testing.app_approval import consent
class SourceFixture(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        if self.headers.get('Authorization')!='Bearer source-read-synthetic':self.send_error(403);return
        if self.path.split('?')[0]=='/wp-json/wc/v3/products':body=[{'id':90,'name':'Source ceramic cup','sku':'SOURCE-CUP-90','price':'19.90','description':'Original source text','stock_quantity':9}]
        elif self.path.startswith('/wp-json/wc/v3/products/categories'):body=[{'id':91,'name':'Source ceramics','slug':'source-ceramics','parent':0}]
        elif self.path.startswith('/wp-json/wc/v3/customers'):body=[{'id':92,'email':'source-'+a['workspace']+'@example.test','first_name':'Source','last_name':'Buyer'}]
        elif self.path.startswith('/wp-json/wc/v3/orders'):body=[{'id':93,'number':'SOURCE-93','currency':'EUR','total':'19.90','date_created_gmt':'2020-01-02T03:04:05','status':'completed','line_items':[{'id':94,'name':'Old cup','quantity':1,'price':'19.90','product_id':90}]}]
        elif self.path.startswith('/wp-json/wp/v2/pages'):body=[{'id':95,'title':{'rendered':'Source workshop'},'content':{'rendered':'<p>Made with <strong>care</strong>.</p>'},'slug':'source-workshop'}]
        else:self.send_error(404);return
        self.send_response(200);self.send_header('X-WP-TotalPages','1');self.end_headers();self.wfile.write(json.dumps(body).encode())
source=ThreadingHTTPServer(('127.0.0.1',0),SourceFixture);threading.Thread(target=source.serve_forever,daemon=True).start()
call('/api/apps',consent({'builtIn':'migration'}),h)
package=next(p for p in call('/api/apps',h=h)['packages'] if p['id']=='migration')
key=call('/api/apps/migration/credentials',{'approve':True,'digest':package['digest'],'permissions':['jobs.write','products.write','orders.read','orders.import','customers.write','customers.pii','settings.read','data.write'],'expiresInDays':1},h)['key']
with socket.socket() as probe:probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
service=f'http://127.0.0.1:{port}';gateway='synthetic-migration-gateway-'+'x'*32
source_origin=f'http://127.0.0.1:{source.server_port}'
with socket.socket() as probe:probe.bind(('127.0.0.1',0));core_port=probe.getsockname()[1]
core_url=f'http://127.0.0.1:{core_port}'
original_base=BASE
binding=call('/api/apps/migration/settings',h=h)
call('/api/apps/migration/settings',{'approve':True,'digest':binding['digest'],'revision':binding['revision'],'values':{'system':'woocommerce','origin':source_origin,'token':'source-read-synthetic','version':'wc/v3','currency':'EUR','scale':2,'locale':'en-GB'}},h,method='PUT')
assert 'source-read-synthetic' not in json.dumps(call('/api/apps/migration/settings',h=h))
env={**os.environ,'MIGRATION_ALLOW_FIXTURE':'1','MIGRATION_BIND':f'127.0.0.1:{port}','MIGRATION_GATEWAY_TOKEN':gateway,'MIGRATION_CALLBACKS':json.dumps({a['workspace']:{'coreUrl':core_url,'token':key}}),'MIGRATION_SOURCES':json.dumps({a['workspace']:{'fixture':{'system':'woocommerce','origin':source_origin,'token':'source-read-synthetic','version':'wc/v3','currency':'EUR','scale':2,'locale':'en-GB'}}})}
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
    page=call('/api/apps/migration/actions/review_products',{'sourceId':'installed'},h)
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
    for domain,options in [('categories',{}),('pages',{'destinationDigest':destination_digest}),('customers',{'customerGroup':'consumer'}),('orders',{'channelId':'default','locale':'en-GB'})]:
        source_page=call('/api/apps/migration/actions/review_'+domain,{'sourceId':'installed'},h)
        dest=target if domain in ('categories','pages') else a['workspace']
        command={'sourceId':'installed','kind':domain,'target':dest,'options':options,'recordDigests':source_page['recordDigests']}
        jid=call('/api/apps/migration/actions/import_'+domain,command,{**h,'Idempotency-Key':'service-flow-'+domain})['jobId']
        for _ in range(100):
            saved=call('/api/apps/migration/jobs/'+jid,h=h)
            if saved['status'] not in ['queued','running']:break
            time.sleep(.1)
        assert saved['status']=='succeeded',(domain,saved)
        source_row=source_page['records'][0]
        dest_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],source_row['source'],source_row['sourceShop'],domain,source_row['sourceId']],separators=(',',':')).encode()).digest()[:16]))
        if domain=='categories':assert any(x['id']==dest_id for x in call('/api/merchant/categories',h={**h,'x-tenant':target})['elements'])
        elif domain=='pages':assert call('/api/apps/site_builder/actions/editor_pages',{'id':dest_id},{**h,'x-tenant':target})['elements'][0]['status']=='draft'
        elif domain=='customers':assert call('/api/merchant/customers/'+source_row['data']['email'],h=h)['id']==dest_id
        else:assert call('/api/merchant/orders/'+dest_id,h=h)['payment']['realMoneyCharged'] is False
    print('PASS all five implemented source domains traverse the real gateway/service/outbox/native-write path')
    exec(compile((ROOT/'extensions/apps/migration/tests/purchase.py').read_text(),'purchase.py','exec'))
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
    process.terminate();process.wait(timeout=10);log.close();source.shutdown();source.server_close()
