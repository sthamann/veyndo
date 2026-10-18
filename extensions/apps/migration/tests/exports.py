"""Bounded immutable export CLI and actual authenticated HTTP reader; no live source or throughput claim."""
import copy,hashlib,json,os,subprocess,tempfile,threading,time,unittest,urllib.error,urllib.request
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];BIN=ROOT/'target/debug/migration-assistant'
class ExportTest(unittest.TestCase):
    def pack(self,directory,rows=125,source='woocommerce',kind='products',origin='https://source.example'):
        raw=''.join(json.dumps({'id':i+1,'name':'Original '+str(i),'price':'12.50','stock_quantity':3})+'\n' for i in range(rows))
        return subprocess.run([str(BIN),'pack',source,kind,'EUR','de-DE',origin,'wc/v3',str(directory)],input=raw,text=True,capture_output=True)
    def test_streamed_export_is_bounded_and_never_overwrites_an_existing_package(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'snapshot';r=self.pack(out);self.assertEqual(r.returncode,0,r.stderr)
            manifest=json.loads((out/'manifest.json').read_text());self.assertEqual(manifest['sourceRecords'],125);self.assertEqual(manifest['normalizedRecords'],125)
            self.assertEqual(len(manifest['pages']),3)
            all_rows=[]
            for page in manifest['pages']:
                body=(out/page['path']).read_bytes();self.assertEqual(hashlib.sha256(body).hexdigest(),page['sha256']);self.assertEqual(len(body),page['bytes'])
                rows=json.loads(body);self.assertEqual(len(rows),page['sourceRecords']);self.assertLessEqual(len(rows),50);all_rows.extend(rows)
                self.assertEqual((out/page['path']).stat().st_mode & 0o777,0o600)
            self.assertEqual(len(all_rows),125);self.assertEqual(out.stat().st_mode & 0o777,0o700)
            self.assertNotEqual(self.pack(out).returncode,0)
    def test_failed_export_never_publishes_a_manifest(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'broken'
            r=subprocess.run([str(BIN),'pack','woocommerce','products','EUR','de-DE','https://source.example','wc/v3',str(out)],input='{"id":1,"name":"x","price":"12.50"}\n{"id":1,"name":"duplicate","price":"12.50"}\n',text=True,capture_output=True)
            self.assertNotEqual(r.returncode,0);self.assertFalse((out/'manifest.json').exists())
    def test_unexpanded_source_references_cannot_be_packaged_as_complete_records(self):
        examples=[
            ('prestashop','customers',{'id':1,'email':'source@example.test','firstname':'Original','lastname':'Buyer'}),
            ('prestashop','orders',{'id':1,'total_paid':'12.50','date_add':'2020-01-02T03:04:05Z','id_customer':'1','id_currency':'1','id_address_invoice':'3','id_address_delivery':'4','associations':{'order_rows':[]}}),
            ('shopware5','orders',{'id':1,'number':'SOURCE-1','invoiceAmount':'12.50','orderTime':'2020-01-02T03:04:05Z'}),
            ('shopify','customers',{'id':1,'email':'source@example.test','first_name':'Original','last_name':'Buyer','addressesV2':{'nodes':[],'pageInfo':{'hasNextPage':True}}}),
        ]
        for source,kind,row in examples:
            with self.subTest(source=source,kind=kind),tempfile.TemporaryDirectory() as d:
                out=Path(d)/'snapshot'
                r=subprocess.run([str(BIN),'pack',source,kind,'EUR','de-DE','https://source.example','explicit-profile',str(out)],input=json.dumps(row)+'\n',text=True,capture_output=True)
                self.assertNotEqual(r.returncode,0,r.stdout);self.assertFalse((out/'manifest.json').exists())
    def test_all_source_product_profiles_and_expanded_presta_history_can_be_packaged(self):
        examples=[
            ('woocommerce','products',{'id':1,'name':'Original cup','price':'12.50'}),
            ('prestashop','products',{'id':1,'name':'Original cup','price':'12.500000','active':'1','visibility':'both'}),
            ('magento2','products',{'id':1,'name':'Original cup','sku':'M-1','price':'12.50','type_id':'simple','status':1,'visibility':4}),
            ('shopware5','products',{'id':1,'name':'Original cup','active':True,'mainDetail':{'id':11,'number':'S-1','active':True,'prices':[{'price':'12.50'}]}}),
            ('shopify','products',{'id':1,'title':'Original cup','status':'ACTIVE','onlineStoreUrl':'https://source.example/products/cup','variants':{'nodes':[{'id':11,'price':'12.50','sku':'SH-1'}],'pageInfo':{'hasNextPage':False}},'images':{'nodes':[],'pageInfo':{'hasNextPage':False}}}),
            ('prestashop','customers',{'id':1,'email':'original@example.test','firstname':'Original','lastname':'Buyer','addresses':[]}),
        ]
        address={'id':'3','id_customer':'1','address1':'Original Street 1','postcode':'10115','city':'Berlin','country_code':'DE','id_state':'0'}
        examples.append(('prestashop','orders',{'id':1,'total_paid':'12.50','date_add':'2020-01-02T03:04:05Z','currency':'EUR','id_customer':'1','id_currency':'1','id_address_invoice':'3','id_address_delivery':'3','billing_address':address,'shipping_address':address,'associations':{'order_rows':[{'id':7,'product_name':'Original cup','product_quantity':1,'unit_price_tax_incl':'12.50'}]}}))
        for source,kind,row in examples:
            with self.subTest(source=source,kind=kind),tempfile.TemporaryDirectory() as d:
                out=Path(d)/'snapshot'
                r=subprocess.run([str(BIN),'pack',source,kind,'EUR','de-DE','https://source.example','explicit-profile',str(out)],input=json.dumps(row)+'\n',text=True,capture_output=True)
                self.assertEqual(r.returncode,0,r.stderr)
                self.assertEqual(json.loads((out/'manifest.json').read_text())['sourceRecords'],1)
    def test_offline_export_keeps_legacy_http_identity_without_ever_fetching_it(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'snapshot'
            r=subprocess.run([str(BIN),'pack','woocommerce','products','EUR','de-DE','http://legacy.internal/shop','wc/v3',str(out)],input='{"id":1,"name":"Original","price":"12.50"}\n',text=True,capture_output=True)
            self.assertEqual(r.returncode,0,r.stderr)
            self.assertEqual(json.loads((out/'manifest.json').read_text())['source']['origin'],'http://legacy.internal/shop')
    def test_actual_export_http_preserves_identity_counts_and_immutable_continuation(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);out=root/'snapshot';r=self.pack(out,origin='http://legacy.internal/shop');self.assertEqual(r.returncode,0,r.stderr)
            original=(out/'manifest.json').read_bytes();manifest=json.loads(original)
            files={'/export/manifest.json':original}
            for page in manifest['pages']:files['/export/'+page['path']]=(out/page['path']).read_bytes()
            for name in ('count','path','context'):
                changed=copy.deepcopy(manifest)
                if name=='count':changed['pages'][0]['sourceRecords']=49
                if name=='path':changed['pages'][0]['path']='../escape.json'
                if name=='context':changed['source']['origin']='https://unrelated.example'
                files['/export/'+name+'.json']=json.dumps(changed).encode()
            class Handler(BaseHTTPRequestHandler):
                def log_message(self,*args):pass
                def do_GET(self):
                    if self.headers.get('Authorization')!='Bearer export-synthetic-secret':self.send_error(401);return
                    if self.path not in files:self.send_error(404);return
                    self.send_response(200);self.end_headers();self.wfile.write(files[self.path])
            server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
            profiles={}
            for name,path in [('original','manifest'),('bad-pin','manifest'),('count','count'),('path','path'),('context','context')]:
                profiles[name]={'system':'woocommerce','origin':'http://legacy.internal/shop','token':'api-must-not-leak','exportToken':'export-synthetic-secret','version':'wc/v3','currency':'EUR','scale':2,'locale':'de-DE','exportManifest':f'http://127.0.0.1:{server.server_port}/export/{path}.json','exportDigest':'0'*64 if name=='bad-pin' else hashlib.sha256(files['/export/'+path+'.json']).hexdigest()}
            import socket
            with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
            env={**os.environ,'MIGRATION_ALLOW_FIXTURE':'1','MIGRATION_BIND':f'127.0.0.1:{port}','MIGRATION_GATEWAY_TOKEN':'export-gateway-'+'x'*32,'MIGRATION_SOURCES':json.dumps({'tenant':profiles})}
            with open(root/'service.log','w') as log:
                p=subprocess.Popen([str(BIN),'serve'],env=env,stdout=log,stderr=log)
                try:
                    for _ in range(50):
                        try:urllib.request.urlopen(f'http://127.0.0.1:{port}/health',timeout=.2);break
                        except OSError:time.sleep(.1)
                    def call(source='original',kind='products',cursor=None):
                        data={'sourceId':source,'kind':kind,**({'cursor':cursor} if cursor else {})}
                        req=urllib.request.Request(f'http://127.0.0.1:{port}/actions/extract',data=json.dumps(data).encode(),headers={'Authorization':'Bearer '+env['MIGRATION_GATEWAY_TOKEN'],'x-tenant':'tenant','Content-Type':'application/json'})
                        try:
                            with urllib.request.urlopen(req,timeout=10) as response:return response.status,json.load(response)
                        except urllib.error.HTTPError as e:
                            with e:return e.code,json.load(e)
                    code,page=call();self.assertEqual(code,200,page);self.assertEqual(page['records'][0]['sourceShop'],'http://legacy.internal/shop')
                    self.assertEqual(page['sourceExport']['sourceRecords'],125);self.assertEqual(page['sourceExport']['normalizedRecords'],125)
                    self.assertEqual(page['sourceExport']['digest'],profiles['original']['exportDigest']);self.assertFalse(page['cutoverReady']);self.assertFalse(page['snapshotConsistent'])
                    cursor=page['nextCursor'];rows=page['records'][:]
                    for _ in range(30):
                        if not cursor:break
                        code,v=call(cursor=cursor);self.assertEqual(code,200,v);rows+=v['records'];cursor=v['nextCursor']
                    self.assertIsNone(cursor);self.assertEqual(len(rows),125);self.assertEqual(len({r['sourceId'] for r in rows}),125)
                    self.assertEqual(call(kind='customers')[0],400)
                    for name in ('bad-pin','count','path','context'):
                        code,v=call(source=name);self.assertEqual(code,400,(name,v));self.assertNotIn('records',v)
                    files['/export/'+manifest['pages'][0]['path']]=b'[]'
                    code,v=call();self.assertEqual(code,400,v);self.assertNotIn('records',v)
                    files['/export/'+manifest['pages'][0]['path']]=(out/manifest['pages'][0]['path']).read_bytes()
                    files['/export/manifest.json']=original+b' '
                    code,v=call();self.assertEqual(code,400,v)
                    self.assertNotIn('export-synthetic-secret',json.dumps(v))
                finally:
                    p.terminate();p.wait(timeout=10);server.shutdown();server.server_close()
if __name__=='__main__':unittest.main()
