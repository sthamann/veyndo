"""Actual source HTTP -> Rust service -> canonical records; authentication and cursor failure controls."""
import json,os,subprocess,time,unittest,urllib.request,urllib.error,threading
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];BIN=ROOT/'target/debug/migration-assistant'
class Source(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        if self.path.startswith('/api/products'):
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'products':[{'id':7,'name':'Presta cup','price':'12.50'}]}).encode());return
        if self.path.startswith('/api/articles'):
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'data':[{'id':4,'name':'SW cup','mainDetail':{'id':44,'number':'SW-4','inStock':5,'prices':[{'price':'29.90'}]}}],'total':1}).encode());return
        if self.path.startswith('/rest/V1/products'):
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'items':[{'id':3,'sku':'MAG-3','name':'Magento cup','price':'15.25','type_id':'simple'}],'total_count':1}).encode());return
        if self.headers.get('authorization')!='Bearer source-secret':self.send_error(401);return
        if self.path.startswith('/wp-json/wc/v3/products'):
            body=[{'id':1,'name':'Ceramic','price':'19.90','stock_quantity':7}];self.send_response(200);self.send_header('X-WP-TotalPages','1');self.end_headers();self.wfile.write(json.dumps(body).encode());return
        self.send_error(404)
    def do_POST(self):
        token=self.headers.get('X-Shopify-Access-Token')
        if token not in ['source-secret','many-secret']:self.send_error(401);return
        self.rfile.read(int(self.headers.get('Content-Length','0')))
        parents=[]
        for p in range(50 if token=='many-secret' else 1):
            parents.append({'id':f'gid://shopify/Product/{p}','title':'Shopify cup','variants':{'nodes':[{'id':p*3+i,'title':f'Variant {i}','sku':f'SHOP-{p}-{i}','price':'19.90','inventory_quantity':2} for i in range(3 if token=='many-secret' else 1)],'pageInfo':{'hasNextPage':False}},'images':{'nodes':[],'pageInfo':{'hasNextPage':False}}})
        self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'data':{'products':{'nodes':parents,'pageInfo':{'hasNextPage':False,'endCursor':None}}}}).encode())
class Transport(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=ThreadingHTTPServer(('127.0.0.1',0),Source);threading.Thread(target=cls.source.serve_forever,daemon=True).start()
        cls.origin=f'http://127.0.0.1:{cls.source.server_port}'
        env={**os.environ,'MIGRATION_BIND':'127.0.0.1:8819','MIGRATION_GATEWAY_TOKEN':'synthetic-gateway-token-32-characters','MIGRATION_ALLOW_FIXTURE':'1','MIGRATION_SOURCES':json.dumps({'tenant-a':{'source-a':{'system':'woocommerce','origin':cls.origin,'token':'source-secret','version':'wc/v3','currency':'EUR','scale':2,'locale':'de-DE'}}})}
        connections=json.loads(env['MIGRATION_SOURCES'])
        for system in ['prestashop','magento2','shopware5','shopify']:
            connections['tenant-a'][system]={'system':system,'origin':cls.origin,'token':'source-secret','version':'2026-10' if system=='shopify' else 'fixture-version','currency':'EUR','scale':2,'locale':'de-DE'}
        connections['tenant-a']['many']={**connections['tenant-a']['shopify'],'token':'many-secret'}
        env['MIGRATION_SOURCES']=json.dumps(connections)
        cls.log=open(ROOT/'artifacts/migration-transport-service.log','w');cls.p=subprocess.Popen([str(BIN),'serve'],env=env,stdout=cls.log,stderr=cls.log)
        for _ in range(30):
            try:urllib.request.urlopen('http://127.0.0.1:8819/health',timeout=.3);break
            except (urllib.error.URLError,TimeoutError):time.sleep(.1)
    @classmethod
    def tearDownClass(cls):
        cls.p.terminate();cls.p.wait();cls.log.close();cls.source.shutdown();cls.source.server_close()
    def call(self,tenant='tenant-a',token='synthetic-gateway-token-32-characters',**data):
        r=urllib.request.Request('http://127.0.0.1:8819/actions/extract',data=json.dumps({'sourceId':'source-a','kind':'products',**data}).encode(),headers={'authorization':'Bearer '+token,'x-tenant':tenant,'content-type':'application/json'})
        try:
            with urllib.request.urlopen(r,timeout=5) as v:return v.status,json.load(v)
        except urllib.error.HTTPError as e:
            with e:return e.code,json.load(e)
        except urllib.error.URLError:return 503,{}
    def test_real_native_normalization_and_complete_cursor(self):
        code,v=self.call();self.assertEqual(code,200,v);self.assertEqual(v['records'][0]['data']['price']['minor'],1990);self.assertIsNone(v['nextCursor']);self.assertTrue(v['pageComplete']);self.assertNotIn('source-secret',json.dumps(v))
    def test_all_other_source_transports_reach_their_native_profiles(self):
        for system,minor in [('prestashop',1250),('magento2',1525),('shopware5',2990),('shopify',1990)]:
            with self.subTest(system=system):
                code,v=self.call(sourceId=system);self.assertEqual(code,200,v);self.assertEqual(v['records'][0]['data']['price']['minor'],minor)
    def test_variant_expansion_is_split_into_complete_reviewable_batches(self):
        code,a=self.call(sourceId='many');self.assertEqual(code,200,a);self.assertEqual(len(a['records']),100)
        code,b=self.call(sourceId='many',cursor=a['nextCursor']);self.assertEqual(code,200,b);self.assertEqual(len(b['records']),100);self.assertIsNone(b['nextCursor'])
        rows=a['records']+b['records'];self.assertEqual(len({r['sourceId'] for r in rows}),200);self.assertEqual(sum(not r['data'].get('variantGroup') for r in rows),150)
    def test_foreign_source_denied(self):self.assertEqual(self.call(tenant='foreign')[0],403)
    def test_unauthenticated_denied(self):self.assertEqual(self.call(token='wrong')[0],401)
    def test_cursor_cannot_supply_an_arbitrary_url(self):self.assertEqual(self.call(cursor='http://169.254.169.254/latest')[0],400)
    def test_unknown_domain_is_explicit(self):self.assertEqual(self.call(kind='private_passwords')[0],400)
if __name__=='__main__':unittest.main()
