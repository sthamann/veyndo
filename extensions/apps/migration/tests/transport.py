"""Actual source HTTP -> Rust service -> canonical records; authentication and cursor failure controls."""
import base64,hashlib
import json,os,subprocess,time,unittest,urllib.request,urllib.error,threading
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
ROOT=Path(__file__).resolve().parents[4];BIN=ROOT/'target/debug/migration-assistant'
class Source(BaseHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        if self.path.startswith('/source.png'):
            assert self.headers.get('authorization') is None
            self.send_response(200);self.send_header('Content-Type','image/png');self.end_headers();self.wfile.write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6ckAAAAASUVORK5CYII='));return
        if self.path.startswith('/api/products'):
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'products':[{'id':7,'name':'Presta cup','price':'12.50'}]}).encode());return
        if self.path.startswith('/api/articles'):
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'data':[{'id':4,'name':'SW cup','mainDetail':{'id':44,'number':'SW-4','inStock':5,'prices':[{'price':'29.90'}]}}],'total':1}).encode());return
        if self.path.startswith('/rest/V1/products'):
            self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'items':[{'id':3,'sku':'MAG-3','name':'Magento cup','price':'15.25','type_id':'simple'}],'total_count':1}).encode());return
        token=self.headers.get('authorization')
        if token in ('Bearer variants-secret','Bearer drift-secret'):
            if urlsplit(self.path).path=='/wp-json/wc/v3/products':
                body=[{'id':800,'name':'Variable source cup','type':'variable','attributes':[{'name':'Size','variation':True,'options':[str(i) for i in range(801,862)]}],'variations':list(range(801,862)), 'images':[{'src':f'http://127.0.0.1:{self.server.server_port}/source.png'}]}]
                pages=1
            elif urlsplit(self.path).path=='/wp-json/wc/v3/products/800/variations':
                query=parse_qs(urlsplit(self.path).query)
                assert query['per_page']==['50'] and query['orderby']==['id'] and query['order']==['asc']
                page=int(query['page'][0]); ids=list(range(801,862 if token=='Bearer variants-secret' else 861))
                body=[{'id':i,'price':'19.90','sku':'VAR-'+str(i),'stock_quantity':2,'attributes':[{'name':'Size','option':str(i)}],**({'image':{'src':f'http://127.0.0.1:{self.server.server_port}/source.png'}} if i==801 else {})} for i in ids[(page-1)*50:page*50]]
                pages=2
            else:self.send_error(404);return
            self.send_response(200);self.send_header('X-WP-TotalPages',str(pages));self.end_headers();self.wfile.write(json.dumps(body).encode());return
        if self.headers.get('authorization')!='Bearer source-secret':self.send_error(401);return
        if self.path.startswith('/wp-json/wc/v3/products'):
            body=[{'id':1,'name':'Ceramic','price':'19.90','stock_quantity':7,'images':[{'src':f'http://127.0.0.1:{self.server.server_port}/source.png'}]}];self.send_response(200);self.send_header('X-WP-TotalPages','1');self.end_headers();self.wfile.write(json.dumps(body).encode());return
        self.send_error(404)
    def do_POST(self):
        token=self.headers.get('X-Shopify-Access-Token')
        if token not in ['source-secret','many-secret']:self.send_error(401);return
        self.rfile.read(int(self.headers.get('Content-Length','0')))
        parents=[]
        for p in range(50 if token=='many-secret' else 1):
            parents.append({'id':f'gid://shopify/Product/{p}','title':'Shopify cup','variants':{'nodes':[{'id':p*3+i,'title':f'Variant {i}','sku':f'SHOP-{p}-{i}','price':'19.90','inventory_quantity':2} for i in range(3 if token=='many-secret' else 1)],'pageInfo':{'hasNextPage':False}},'images':{'nodes':[{'url':f'http://127.0.0.1:{self.server.server_port}/source.png'}],'pageInfo':{'hasNextPage':False}}})
        self.send_response(200);self.end_headers();self.wfile.write(json.dumps({'data':{'products':{'nodes':parents,'pageInfo':{'hasNextPage':False,'endCursor':None}}}}).encode())
class SourceServer(ThreadingHTTPServer):
    request_queue_size=32
class Transport(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source=SourceServer(('127.0.0.1',0),Source);threading.Thread(target=cls.source.serve_forever,daemon=True).start()
        cls.origin=f'http://127.0.0.1:{cls.source.server_port}'
        env={**os.environ,'MIGRATION_BIND':'127.0.0.1:8819','MIGRATION_GATEWAY_TOKEN':'synthetic-gateway-token-32-characters','MIGRATION_ALLOW_FIXTURE':'1','MIGRATION_SOURCES':json.dumps({'tenant-a':{'source-a':{'system':'woocommerce','origin':cls.origin,'token':'source-secret','version':'wc/v3','currency':'EUR','scale':2,'locale':'de-DE'}}})}
        connections=json.loads(env['MIGRATION_SOURCES'])
        for system in ['prestashop','magento2','shopware5','shopify']:
            connections['tenant-a'][system]={'system':system,'origin':cls.origin,'token':'source-secret','version':'2026-10' if system=='shopify' else 'fixture-version','currency':'EUR','scale':2,'locale':'de-DE'}
        connections['tenant-a']['many']={**connections['tenant-a']['shopify'],'token':'many-secret'}
        connections['tenant-a']['woo_variants']={**connections['tenant-a']['source-a'],'token':'variants-secret'}
        connections['tenant-a']['woo_drift']={**connections['tenant-a']['source-a'],'token':'drift-secret'}
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
        rows=[];cursor=None
        for _ in range(20):
            code,page=self.call(sourceId='many',**({'cursor':cursor} if cursor else {}));self.assertEqual(code,200,page)
            self.assertLessEqual(len(page['records']),100);self.assertLessEqual(len(json.dumps(page,ensure_ascii=False).encode()),28*1024)
            rows.extend(page['records']);cursor=page['nextCursor']
            if not cursor:break
        self.assertIsNone(cursor);self.assertEqual(len(rows),200)
        self.assertEqual(len({r['sourceId'] for r in rows}),200);self.assertEqual(sum(not r['data'].get('variantGroup') for r in rows),150)
    def test_woo_variants_fetch_all_bounded_pages_and_child_images(self):
        rows=[];cursor=None
        for _ in range(20):
            code,v=self.call(sourceId='woo_variants',**({'cursor':cursor} if cursor else {}));self.assertEqual(code,200,v)
            self.assertLessEqual(len(v['records']),100);self.assertLessEqual(len(json.dumps(v,ensure_ascii=False).encode()),28*1024)
            rows.extend(v['records']);cursor=v['nextCursor']
            if not cursor:break
        self.assertIsNone(cursor);self.assertEqual(len(rows),62);self.assertEqual(len({r['sourceId'] for r in rows}),62)
        self.assertEqual(rows[0]['sourceId'],'800');self.assertTrue(all(r['data']['parentSourceId']=='800' for r in rows[1:]))
        code,images=self.call(sourceId='woo_variants',kind='assets');self.assertEqual(code,200,images)
        self.assertEqual({r['data']['productSourceId'] for r in images['records']},{'800','801'})
        self.assertNotIn('variants-secret',json.dumps(v))
    def test_woo_missing_variation_stops_the_entire_review(self):
        code,v=self.call(sourceId='woo_drift');self.assertEqual(code,400,v)
        self.assertNotIn('records',v)
    def test_images_freeze_exact_bytes_without_source_credentials(self):
        code,v=self.call(kind='assets');self.assertEqual(code,200,v)
        image=v['records'][0]['data'];self.assertEqual(image['mime'],'image/png');self.assertEqual(image['byteLength'],68);self.assertEqual(len(image['digest']),64)
        self.assertNotIn('base64',json.dumps(v));self.assertNotIn('source-secret',json.dumps(v))
    def test_single_and_grouped_shopify_images_reach_the_native_product_owner(self):
        code,single=self.call(sourceId='shopify',kind='assets');self.assertEqual(code,200,single);self.assertEqual(len(single['records']),1)
        self.assertEqual(single['records'][0]['data']['productSourceId'],'0')
        code,many=self.call(sourceId='many',kind='assets');self.assertEqual(code,200,many);self.assertEqual(len(many['records']),10)
        self.assertTrue(all(r['data']['productSourceId'].startswith('group:') for r in many['records']))
        code,next_page=self.call(sourceId='many',kind='assets',cursor=many['nextCursor']);self.assertEqual(code,200,next_page)
        self.assertFalse({r['sourceId'] for r in many['records']} & {r['sourceId'] for r in next_page['records']})
    def test_foreign_source_denied(self):self.assertEqual(self.call(tenant='foreign')[0],403)
    def test_unauthenticated_denied(self):self.assertEqual(self.call(token='wrong')[0],401)
    def test_cursor_cannot_supply_an_arbitrary_url(self):self.assertEqual(self.call(cursor='http://169.254.169.254/latest')[0],400)
    def test_unknown_domain_is_explicit(self):self.assertEqual(self.call(kind='private_passwords')[0],400)
if __name__=='__main__':unittest.main()
