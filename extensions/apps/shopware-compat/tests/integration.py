"""Veyndo native jobs -> Rust controller -> ORIGINAL Shopware. No provider emulator.

Requires an isolated, already installed Shopware 6.7.14.2 with fixtures staged,
an inactive fixture app, and SHOPWARE_TEST_* credentials. Never target production.
"""
import json, os, signal, socket, subprocess, sys, time, uuid, urllib.request, urllib.error, hashlib
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'scripts'))
from testing.app_approval import consent, pin
from testing.runtime import serve, stop
from original_checkout import verify as verify_original_checkout

def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0));return s.getsockname()[1]

def call(base,path,data=None,headers=None,status=200,method=None):
    if path=='/api/apps':data=consent(data)
    request=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json','Accept':'application/json',**(headers or {})},method=method)
    try:r=urllib.request.urlopen(request,timeout=90)
    except urllib.error.HTTPError as e:r=e
    raw=r.read();body=json.loads(raw) if raw else {}
    assert r.status in (status if isinstance(status,tuple) else (status,)),(path,r.status,body)
    return body

sw=os.environ['SHOPWARE_TEST_URL'];assert urlsplit(sw).hostname=='127.0.0.1', 'Use an isolated loopback Shopware'
client=os.environ['SHOPWARE_TEST_CLIENT'];secret=os.environ['SHOPWARE_TEST_SECRET']
def sw_headers():
    token=call(sw,'/api/oauth/token',{'grant_type':'client_credentials','client_id':client,'client_secret':secret})['access_token']
    return {'Authorization':'Bearer '+token}
assert call(sw,'/api/_info/version',headers=sw_headers())['version']=='6.7.14.2'
suffix=uuid.uuid4().hex[:10];gateway='synthetic-compat-'+suffix+'x'*30
core_url=f'http://127.0.0.1:{port()}';adapter_url=f'http://127.0.0.1:{port()}'
package=json.loads((ROOT/'extensions/apps/shopware-compat/manifest.json').read_text())
ui=(ROOT/'extensions/apps/shopware-compat/ui.html').read_bytes()
service=pin({'shopware_compat':{'url':adapter_url,'uiUrl':adapter_url,'token':gateway,'uiDigests':{'index.html':hashlib.sha256(ui).hexdigest()}}},'shopware_compat',package)
env={**os.environ,'BIND_ADDR':core_url.removeprefix('http://'),'BASE_URL':core_url,'PUBLIC_BASE_URL':core_url,'APP_SERVICES':json.dumps(service),'APP_SERVICE_PRIVATE_ORIGINS':adapter_url,'ALLOW_BOOTSTRAP_AUTH':'false','ALLOW_PUBLIC_SIGNUP':'true','SEED_DEMO':'true','MERCHANT_TOKEN':'synthetic-compat-merchant-token-'+suffix}
(ROOT/'artifacts').mkdir(exist_ok=True);log=(ROOT/'artifacts/shopware-compat.log').open('w');core=adapter=None
try:
    core=serve(env,core_url,log)
    owners={}
    for name in ['owner','foreign']:
        r=call(core_url,'/api/auth/register',{'workspaceId':name+'-'+suffix,'name':'Compatibility test','email':name+suffix+'@example.test','password':'Synthetic-Compatibility-Test-2026!'})
        h={'x-tenant':r['workspace'],'Authorization':'Bearer '+r['token']};owners[name]=h
        call(core_url,'/api/apps',{'manifest':package},h)
    h=owners['owner'];tenant=h['x-tenant']
    digest=call(core_url,'/api/apps/shopware_compat/credentials',headers=h)['digest']
    key=call(core_url,'/api/apps/shopware_compat/credentials',{'digest':digest,'approve':True,'permissions':['data.read','data.write','jobs.write'],'expiresInDays':1},h)['key']
    tenants={tenant:{'coreUrl':core_url,'callbackToken':key,'cells':{'sandbox':{'url':sw,'clientId':client,'clientSecret':secret,'version':'6.7.14.2','imageDigest':'sha256:'+'a'*64,'environment':'sandbox'}}}}
    def start():
        p=subprocess.Popen([str(ROOT/'target/debug/shopware-compat')],env={**env,'APP_TOKEN':gateway,'SHOPWARE_COMPAT_TENANTS':json.dumps(tenants),'SHOPWARE_COMPAT_LOCAL_TEST':'1','SHOPWARE_COMPAT_BIND':adapter_url.removeprefix('http://')},stdout=log,stderr=log)
        for _ in range(100):
            if p.poll() is not None:raise AssertionError('Controller failed; inspect artifacts/shopware-compat.log')
            try:call(adapter_url,'/health');return p
            except OSError:time.sleep(.05)
        raise AssertionError('Controller did not start')
    adapter=start();base='/api/apps/shopware_compat/actions/'
    def action(name,data=None,headers=h,status=200):return call(core_url,base+name,data or {},headers,status)
    def finish(job,success=True):
        for _ in range(200):
            item=next(j for j in call(core_url,'/api/apps/shopware_compat/jobs',headers=h)['jobs'] if j['id']==job['jobId'])
            if item['status'] in ['succeeded','failed','uncertain','cancelled']:
                assert (item['status']=='succeeded')==success,item
                return item
            time.sleep(.15)
        raise AssertionError(('Job did not finish',job))
    def change(kind,name,operation,success=True):
        inventory=action('inspect',{'cellId':'sandbox'})
        review=action('prepare',{'cellId':'sandbox','kind':kind,'name':name,'operation':operation,'revision':inventory['revision']})
        job=call(core_url,base+'change',{'change':review['change'],'approvalDigest':review['approvalDigest'],'approve':True},{**h,'Idempotency-Key':uuid.uuid4().hex})
        return finish(job,success)
    grant=call(core_url,'/api/apps/shopware_compat/surfaces/workspace/grant',{'context':{}},h)['token']
    bundle=call(core_url,'/api/apps/shopware_compat/surfaces/workspace/bundle',{'grant':grant},h)
    assert hashlib.sha256(bundle['html'].encode()).hexdigest()==hashlib.sha256(ui).hexdigest()
    # srcdoc inherits Studio's no-inline CSP. A separate response must enforce its own
    # opaque sandbox without weakening the credential-bearing Studio response.
    document=urllib.request.urlopen(core_url+bundle['documentUrl'])
    assert hashlib.sha256(document.read()).hexdigest()==hashlib.sha256(ui).hexdigest()
    policies=document.headers.get_all('content-security-policy')
    assert len(policies)==1 and policies[0].startswith('sandbox allow-scripts;'),policies
    assert "connect-src 'none'" in policies[0] and 'allow-same-origin' not in policies[0]
    assert document.headers['referrer-policy']=='no-referrer'
    call(core_url,'/app-ui/shopware_compat/'+'0'*64,status=404)
    shell=urllib.request.urlopen(core_url+'/')
    assert any("/assets/; script-src-attr 'none'" in p for p in shell.headers.get_all('content-security-policy'))
    call(core_url,'/api/apps/shopware_compat/surfaces/workspace/bundle',{'grant':grant},owners['foreign'],401)
    assert action('cells')['elements'][0]['id']=='sandbox'
    inventory=action('inspect',{'cellId':'sandbox'})
    assert len(inventory['snapshot']['extensions'])>=2
    call(adapter_url,'/actions/cells',{}, {'x-tenant':tenant},401)
    action('cells',headers=owners['foreign'],status=502)
    action('inspect',{'cellId':'foreign'},status=502)
    limited=call(core_url,'/api/workspace/integrations',{'name':'App rights without team authority','expiresInDays':1,'permissions':['apps.manage']},h)
    restricted={**h,'Authorization':'Bearer '+limited['key']}
    action('cells',headers=restricted,status=403)
    tools=call(core_url,'/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list'},restricted)['result']['tools']
    assert not any(t['name'].startswith('app.shopware_compat.')for t in tools)
    action('prepare',{'cellId':'sandbox','kind':'plugin','name':'VeyndoCompatibilityFixture','operation':'install','revision':'0'*64},status=502)
    call(core_url,'/api/apps/shopware_compat/surfaces/workspace/grant',{'context':{}},restricted,403)
    print('PASS installed package, pinned UI bundle, scoped callback, original inventory, foreign-cell denial, current rights and MCP filtering',flush=True)
    change('plugin','VeyndoCompatibilityFixture','install')
    change('plugin','VeyndoCompatibilityFixture','activate')
    def plugin_header():
        req=urllib.request.Request(sw+'/api/_info/version',headers=sw_headers())
        return urllib.request.urlopen(req).headers.get('X-Veyndo-Compatibility-Fixture')
    assert plugin_header()=='original-plugin-active'
    migration=urllib.request.urlopen(urllib.request.Request(sw+'/api/_info/version',headers=sw_headers())).headers.get('X-Veyndo-Compatibility-Migration')
    assert migration=='installed',migration
    change('app','VeyndoCompatibilityApp','activate')
    value=call(sw,'/api/script/veyndo-compatibility',{'probe':'native-job-roundtrip'},sw_headers())
    assert value['runtime']=='original-shopware-app-script' and value['received']=='native-job-roundtrip',value
    verify_original_checkout(sw, sw_headers())
    change('app','VeyndoCompatibilityApp','deactivate')
    print('PASS original app lifecycle and actual Twig App Script request/response',flush=True)
    change('plugin','VeyndoCompatibilityFixture','deactivate');assert plugin_header() is None
    change('plugin','VeyndoCompatibilityFixture','uninstall')
    print('PASS original plugin install/migration, DI event subscriber activation, deactivate, uninstall keeping user data',flush=True)
    effects=action('list_effects')['elements'];assert len(effects)==6 and all(e['state']=='acknowledged' for e in effects)
    # An unknown in-flight outcome remains fenced after controller restart.
    lock=action('list_locks',{'id':'sandbox'})['elements'][0]
    fields={k:lock[k] for k in ['cell','change','job','state','approval']};fields['state']='started'
    action('save_locks',{'id':'sandbox','revision':lock['revision'],'fields':fields})
    stop(adapter);assert adapter.returncode == 0, 'SIGINT must drain and exit normally'
    adapter=start()
    change('app','VeyndoCompatibilityApp','activate',False)
    assert not next(x for x in action('inspect',{'cellId':'sandbox'})['snapshot']['extensions'] if x['kind']=='app')['active']
    print('PASS durable cell fence survives restart and blocks an unreviewed second effect',flush=True)
    if os.environ.get('SHOPWARE_TEST_KEEP_RUNNING') != '1':
        adapter.send_signal(signal.SIGTERM)
        assert adapter.wait(timeout=10) == 0, 'SIGTERM must drain and exit normally'
        print('PASS controller handles SIGINT and SIGTERM with a normal exit', flush=True)
    # Operational data must never travel from a private preview into live configuration.
    title={'en':'Storage boundary','de':'Speichergrenze','fr':'Limite de stockage','es':'Límite de almacenamiento'}
    entity={'name':'events','label':title,'publicRead':True,'operational':True,'fields':[{'name':'title','label':title,'kind':'string','required':True,'indexed':False}]}
    config=json.loads(json.dumps(entity));config.update(name='settings',operational=False)
    probe={'id':'compat_storage_probe','version':'1.0.0','coreApi':'1','runtime':'declarative','name':title,'permissions':['data.read','data.write'],'entities':[entity,config],'slots':[]}
    call(core_url,'/api/apps',{'manifest':probe},h)
    record_base='/api/apps/compat_storage_probe/entities/'
    for model in ['events','settings']:call(core_url,record_base+model,{'id':'live','fields':{'title':'Original'}},h)
    stage=call(core_url,'/api/environments',{'name':'Operational exclusion'},h)['id'];sh={**h,'x-tenant':stage}
    assert call(core_url,record_base+'events',headers=sh)['elements']==[]
    assert call(core_url,record_base+'settings',headers=sh)['elements'][0]['title']=='Original'
    call(core_url,record_base+'events',{'id':'private','fields':{'title':'Never publish'}},sh)
    changes=call(core_url,'/api/environments/'+stage+'/diff',headers=h)['changes']
    assert not any('compat_storage_probe:events:' in x['key'] for x in changes),changes
    assert len(call(core_url,record_base+'events',headers=h)['elements'])==1
    print('PASS operational records neither clone nor appear in selective publication',flush=True)

finally:
    if os.environ.get('SHOPWARE_TEST_KEEP_RUNNING')=='1' and core and adapter:
        print('LOCAL UI:',core_url+'/#merchant','owner'+suffix+'@example.test','processes',core.pid,adapter.pid,flush=True)
    else:
        if adapter:stop(adapter)
        if core:stop(core)
    log.close()
