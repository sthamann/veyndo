"""Actual provider requests and native action admission using the existing Rust multi-worker fixture."""
import concurrent.futures,json,time
APPS=('vercel','hubspot','klaviyo','contentful','algolia')
def wire(path,body,headers,calls):
 try:value=json.loads(body or '{}')
 except json.JSONDecodeError:return None
 if path.startswith('/v1/integrations/deploy/'):
  return (429 if path.endswith('/rate') and sum(p==path for p,_,_ in calls)==1 else 503 if path.endswith('/uncertain') else 200),{'job':{'id':'deployment-fixture','state':'PENDING'}}
 if path=='/crm/v3/objects/contacts/batch/upsert':
  if value['inputs'][0]['properties']['firstname']=='Uncertain':return 503,{}
  return 200,{'status':'COMPLETE','results':[{'id':'contact-fixture'}]}
 if path=='/api/events':return 202,{}
 if path.startswith('/spaces/'):
  return 200,{'skip':0,'total':1,'items':[{'sys':{'id':'entry-fixture'},'fields':{'title':'Contentful native evidence','body':'Source content without instructions'}}]}
 if path.endswith('/batch'):return 200,{'taskID':1234,'objectIDs':['product-fixture']}
 return None

def verify(call,http,base,shops,provider,wait,sql,services,p1,p2,direct):
 tenant,headers=shops[0];other,foreign=shops[1]
 payloads={'vercel':{},'hubspot':{'email':'buyer@example.test','firstName':'A','lastName':'B'},'klaviyo':{'email':'buyer@example.test','metric':'Veyndo order fixture','eventId':'native-fixture-event'},'contentful':{},'algolia':{'records':[{'objectID':'product-fixture','name':'Fixture product','locale':'de-DE'}]}}
 settings={'contentful':{'space':'space','environment':'master','locale':'de-DE'},'algolia':{'applicationId':'APP123','index':'veyndo_products'}}
 for app in APPS:
  http(base+'/api/apps',{'builtIn':app},foreign)
  secret='https://api.vercel.com/v1/integrations/deploy/prj_test/secret' if app=='vercel' else 'synthetic-'+app+'-private-key'
  call(app,'configure',{'revision':0,'settings':{'enabled':True,**settings.get(app,{})},'credentials':{'apiKey':secret}})
  state=call(app,'status');assert state['credentialConfigured'] and secret not in json.dumps(state)
  assert sql(f"SELECT position(convert_to('{secret}','UTF8') in data) FROM connector_config WHERE tenant='{tenant}' AND app='{app}';")=='0'
  assert not call(app,'status',headers=foreign)['credentialConfigured']
  request={'requestKey':'integration-once','input':payloads[app]}
  with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(lambda _:call(app,'run',request),range(6)))
  wait(lambda:call(app,'status')['jobs'][0]['state']=='completed')
  call(app,'run',{'requestKey':'integration-once','input':{'changed':True}},expected=400 if app!='contentful' else 400)
  assert not call(app,'status',headers=foreign)['jobs']
  call(app,'configure',{'revision':0,'settings':{'enabled':False}},expected=502)
  http(base+f'/store-api/apps/{app}/actions/run',request,{'x-tenant':tenant},expected=401)
  if app!='contentful':assert call(app,'status')['jobs'][0]['result']['state'] in ('accepted','confirmed')
  if app=='contentful':
   wait(lambda:'Contentful native evidence' in json.dumps(http(base+'/api/knowledge/external',headers=headers)))
   assert not http(base+'/api/knowledge/external',headers=foreign)['elements']
 # Exactly one external request per duplicate queue entry across both worker processes.
 for path in ('/v1/integrations/deploy/prj_test/secret','/crm/v3/objects/contacts/batch/upsert','/api/events','/1/indexes/veyndo_products/batch'):
  assert sum(p==path for p,_,_ in provider.calls)==1,(path,provider.calls)
 calls={p:(json.loads(b or '{}'),h) for p,b,h in provider.calls if p in ('/api/events','/1/indexes/veyndo_products/batch')}
 assert calls['/api/events'][0]['data']['attributes']['unique_id']=='native-fixture-event'
 assert calls['/api/events'][1]['revision']=='2026-10-15'
 assert calls['/1/indexes/veyndo_products/batch'][1]['x-algolia-api-key']=='synthetic-algolia-private-key'
 # Provider request accepted is explicitly not a completed deployment/index.
 assert call('vercel','status')['jobs'][0]['result']['deploymentConfirmed'] is False
 assert call('algolia','status')['jobs'][0]['result']['indexingConfirmed'] is False
 # Scope-bound native tool registration is used instead of another connector/MCP implementation.
 tools=http(base+'/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/list','params':{}},headers)
 assert 'vercel' in json.dumps(tools),tools
 native_tools=tools['result']['tools']
 status_tool=next(t['name'] for t in native_tools if 'vercel' in t['name'] and 'status' in t['name'])
 read=http(base+'/mcp',{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{'name':status_tool,'arguments':{}}},headers)
 assert not read.get('error') and not read.get('result',{}).get('isError') and 'deploymentConfirmed' in json.dumps(read),read
 stage=http(base+'/api/environments',{'name':'Integration egress negative'},headers)['id']
 http(base+'/api/apps',{'builtIn':'vercel'},{**headers,'x-tenant':stage})
 call('vercel','run',{'requestKey':'private-egress-denied','input':{}},headers={**headers,'x-tenant':stage},expected=400)
 # Current native permissions apply equally to HTTP and dynamically registered app tools.
 limited=http(base+'/api/workspace/integrations',{'name':'Connector without PII','expiresInDays':1,'permissions':['apps.manage']},headers)
 limited_headers={'x-tenant':tenant,'Authorization':'Bearer '+limited['key']}
 call('hubspot','run',{'requestKey':'denied-private-contact','input':payloads['hubspot']},headers=limited_headers,expected=403)
 call('klaviyo','run',{'requestKey':'denied-private-event','input':payloads['klaviyo']},headers=limited_headers,expected=403)
 http(base+'/api/search/product',{'limit':1},limited_headers,expected=403)
 nexus=http(base+'/api/workspace/integrations',{'name':'Nexus catalogue fixture','expiresInDays':1,'permissions':['catalog.read']},headers)
 nexus_headers={'x-tenant':tenant,'Authorization':'Bearer '+nexus['key']}
 assert http(base+'/api/search/product',{'limit':1},nexus_headers)['elements']
 call('vercel','run',{'requestKey':'denied-native-write','input':{}},headers=nexus_headers,expected=403)
 # A post-dispatch 503 is uncertain, never replayed; 429 retries only proven rejection.
 for suffix,state in [('uncertain','uncertain'),('rate','completed')]:
  current=call('vercel','status')
  call('vercel','configure',{'revision':current['revision'],'settings':{'enabled':True},'credentials':{'apiKey':'https://api.vercel.com/v1/integrations/deploy/prj_test/'+suffix}})
  call('vercel','run',{'requestKey':suffix,'input':{}})
  wait(lambda:any(j['id']==suffix and j['state']==state for j in call('vercel','status')['jobs']))
 count=sum(p.endswith('/uncertain') for p,_,_ in provider.calls);time.sleep(.4)
 assert count==1==sum(p.endswith('/uncertain') for p,_,_ in provider.calls)
 # Queued work is invalidated by configuration edits before the network attempt.
 sql(f"INSERT INTO connector_jobs(tenant,app,id,fingerprint,state,payload,lease_until) SELECT tenant,app,x.id,fingerprint,'running',payload,now()+interval '1 day' FROM connector_jobs CROSS JOIN (VALUES('held-one'),('held-two'))x(id) WHERE tenant='{tenant}' AND app='vercel' AND connector_jobs.id='integration-once';")
 call('vercel','run',{'requestKey':'stale-integration','input':{}})
 current=call('vercel','status');call('vercel','configure',{'revision':current['revision'],'settings':{'enabled':False}})
 count=len(provider.calls)
 sql(f"DELETE FROM connector_jobs WHERE tenant='{tenant}' AND app='vercel' AND id IN ('held-one','held-two');")
 wait(lambda:any(j['id']=='stale-integration' and j['state']=='failed' for j in call('vercel','status')['jobs']))
 assert len(provider.calls)==count

 # Disabling an imported content source also removes it from the real knowledge consumer.
 sql(f"INSERT INTO connector_sources(tenant,app,id,data) SELECT tenant,app,'capacity-'||n,data FROM connector_sources CROSS JOIN generate_series(1,2000) n WHERE tenant='{tenant}' AND app='contentful' LIMIT 2000;")
 call('contentful','run',{'requestKey':'capacity-denied','input':{}})
 wait(lambda:any(j['id']=='capacity-denied' and j['state']=='failed' for j in call('contentful','status')['jobs']))
 sql(f"DELETE FROM connector_sources WHERE tenant='{tenant}' AND app='contentful' AND id LIKE 'capacity-%';")
 current=call('contentful','status')
 # Bypass only the Core response in this trusted local fixture: the durable reset must still be consumed.
 http(f'http://127.0.0.1:{p1}/contentful/actions/configure',{'revision':current['revision'],'settings':{'enabled':False}},direct)
 wait(lambda:'Contentful native evidence' not in json.dumps(http(base+'/api/knowledge/external',headers=headers)))
 assert 'RAC-42' in json.dumps(http(base+'/api/knowledge/external',headers=headers))
 print('PASS five provider HTTP contracts, native HTTP/MCP permissions, Nexus read/denied write, private egress, exact replay, 429/uncertain outcomes, stale revisions, bounded sources and durable knowledge reset')
