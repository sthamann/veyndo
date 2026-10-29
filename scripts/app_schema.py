#!/usr/bin/env python3
"""Real installed-schema evolution, recovery snapshots, rollback on bad conversions and isolation of equal app IDs."""
import copy,json,os,uuid,subprocess
from testing.runtime import ROOT
from testing.database import psql
from testing.app_approval import consent
from urllib.request import Request,urlopen
from urllib.error import HTTPError
base=os.environ['BASE_URL'];tenant='schema-'+uuid.uuid4().hex[:10]
def call(path,body=None,h=None,status=200,method=None):
 if path=='/api/apps' and body is not None and 'approve' not in body:body=consent(body)
 request=Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})},method=method)
 try:
  with urlopen(request,timeout=30) as r:code=r.status;v=json.load(r)
 except HTTPError as e:code=e.code;v=json.load(e)
 assert code==status,(path,code,status,v);return v
def owner(t):
 v=call('/api/auth/register',{'workspaceId':t,'name':'Schema owner','email':t+'@example.test','password':'Synthetic-schema-password!'});return {'x-tenant':t,'Authorization':'Bearer '+v['token']}
def sql(query):
 r=subprocess.run(psql(os.environ['TEST_DB_CONTAINER'],'commerce',os.environ['TEST_DATABASE'],'-qAt','-v','ON_ERROR_STOP=1'),input=query,text=True,capture_output=True);assert not r.returncode,r.stderr;return r.stdout.strip()
h=owner(tenant);foreign=owner('other-'+tenant)
m=json.loads((ROOT/'extensions/apps/assistant-examples/integration.json').read_text());m.update(id='schema_fixture',version='1.0.0',runtime='declarative',permissions=['data.read','data.write'],events=[],surfaces=[],views=[],apiRoutes=[]);m.pop('intelligence',None)
m['entities']=[{'name':'entries','fields':[{'name':n,'kind':'string','required':False} for n in ['title','count','obsolete']]}]
m['actions']=[{'name':op,'handler':op,'entity':'entries','description':op,'public':False,'inputSchema':{'type':'object','additionalProperties':False,'properties':{'id':{'type':'string'},'revision':{'type':'integer'},'fields':{'type':'object'}} if op=='save' else {'limit':{'type':'integer'}},'required':['id','fields'] if op=='save' else []}} for op in ['list','save']]
call('/api/apps',{'manifest':m},h);call('/api/apps',{'manifest':m},foreign)
def save(id,count,revision=0):call('/api/apps/schema_fixture/actions/save',{'id':id,'revision':revision,'fields':{'title':'Original title','count':count,'obsolete':'backup-only'}},h)
save('ok','42');save('bad','2.5')
additive=copy.deepcopy(m);additive['version']='1.0.1';additive['entities'][0]['fields'].append({'name':'optional_note','kind':'string'})
compatible=call('/api/apps/review',{'manifest':additive},h)
assert compatible['upgrade']['ready'] and not compatible['upgrade']['migrationRequired']
additive['entities'][0]['fields'][-1]['required']=True
required=call('/api/apps/review',{'manifest':additive},h)
assert not required['upgrade']['ready'] and required['upgrade']['migrationRequired']
changed=copy.deepcopy(m);changed['version']='1.1.0';changed['entities'][0]['fields']=[{'name':'caption','kind':'string'},{'name':'count','kind':'integer'},{'name':'active','kind':'boolean','required':True}]
# No inferred lossy rename or raw SQL.
blocked=call('/api/apps/review',{'manifest':changed},h)
assert blocked['upgrade']['ready'] is False
assert blocked['upgrade']['migrationRequired'] is True
assert blocked['upgrade']['models']==[{'name':'entries','records':2}]
assert 'Original title' not in json.dumps(blocked)
call('/api/apps',{'manifest':changed},h,409)
changed['schemaMigrations']=[{'fromVersion':'1.0.0','steps':[{'op':'rename','entity':'entries','field':'title','to':'caption'},{'op':'convert','entity':'entries','field':'count'},{'op':'remove','entity':'entries','field':'obsolete'},{'op':'fill','entity':'entries','field':'active','value':True}]}]
assert call('/api/apps/review',{'manifest':changed},h)['upgrade']['ready'] is False
call('/api/apps',{'manifest':changed},h,400)
rows=call('/api/apps/schema_fixture/actions/list',{},h)['elements'];assert rows[0]['count']=='2.5' and rows[1]['count']=='42';assert all('title' in row for row in rows)
assert sql(f"SELECT count(*) FROM app_schema_history WHERE tenant='{tenant}'")== '0'
assert next(p for p in call('/api/apps',h=h)['packages'] if p['id']==m['id'])['version']=='1.0.0'
print('PASS failed schema conversion rolls back records, DDL, package, recovery history and outbox atomically')
save('bad','2',1)
ready=call('/api/apps/review',{'manifest':changed},h)
assert ready['upgrade']['ready'] and ready['upgrade']['migrationSteps']==4
assert sql(f"SELECT count(*) FROM app_schema_history WHERE tenant='{tenant}'")== '0'
assert call('/api/apps/schema_fixture/actions/list',{},h)['elements'][0]['count']=='2'
stale={**consent({'manifest':changed}),'digest':ready['digest']}
stale['manifest']=copy.deepcopy(changed);stale['manifest']['name']={'en-GB':'Changed after review'}
call('/api/apps',stale,h,409)
call('/api/apps',{'manifest':changed},h)
rows=call('/api/apps/schema_fixture/actions/list',{},h)['elements'];assert rows[0]['count']==2 and rows[1]['count']==42;assert all(row['caption']=='Original title' and row['active'] is True and 'obsolete' not in row for row in rows)
assert rows[1]['revision']==2
snapshot=json.loads(sql(f"SELECT records FROM app_schema_history WHERE tenant='{tenant}'"));assert snapshot['entries'][0]['obsolete']=='backup-only';assert snapshot['entries'][1]['count']=='42'
foreign_pkg=next(p for p in call('/api/apps',h=foreign)['packages'] if p['id']==m['id']);assert foreign_pkg['version']=='1.0.0';assert call('/api/apps/schema_fixture/actions/list',{},foreign)['elements']==[]
print('PASS explicit rename/remove/type/default migration retains recovery data, bumps revisions and leaves foreign schemas untouched')
assert call('/api/apps/review',{'manifest':changed},foreign)['upgrade']['models']==[]
stage=call('/api/environments',{'name':'Upgrade review stage'},h)['id']
call('/api/apps/review',{'manifest':changed,'environment':stage},foreign,404)
# The same gate protects installed consumers, not just the definition under review.
consumer=copy.deepcopy(changed);consumer['version']='1.2.0'
next(a for a in consumer['actions'] if a['handler']=='save')['flowAllowed']=True
call('/api/apps',{'manifest':consumer},h)
before_restore=call('/api/apps/schema_fixture/actions/list',{},h)['elements']
interface=copy.deepcopy(consumer);interface['version']='1.2.1';interface['name']={'en-GB':'Updated interface'}
assert call('/api/apps/review',{'manifest':interface},h)['upgrade']['ready']
call('/api/apps',{'manifest':interface},h)
restored=copy.deepcopy(consumer);restored['version']='1.2.2'
assert call('/api/apps/review',{'manifest':restored},h)['upgrade']['ready']
call('/api/apps',{'manifest':restored},h)
assert call('/api/apps/schema_fixture/actions/list',{},h)['elements']==before_restore
flow={'name':{'en-GB':'Schema consumer'},'active':True,'event':'product.updated','condition':{'type':'alwaysValid'},'action':'app_action','instruction':{'en-GB':'Save'},'locale':'en-GB','appAction':{'app':m['id'],'action':'save','arguments':{'id':'from_flow','fields':{'caption':'Flow record','count':1,'active':True}}}}
call('/api/automation/flows/schema_consumer',{'revision':0,'data':flow},h,method='PUT')
incompatible=copy.deepcopy(consumer);incompatible['version']='1.3.0'
next(a for a in incompatible['actions'] if a['handler']=='save')['inputSchema']['required'].append('revision')
assert not call('/api/apps/review',{'manifest':incompatible},h)['upgrade']['ready']
call('/api/apps',{'manifest':incompatible},h,409)
removed=copy.deepcopy(consumer);removed['version']='1.3.0';removed['actions']=[a for a in removed['actions'] if a['handler']!='save']
review=call('/api/apps/review',{'manifest':removed},h)
assert not review['upgrade']['ready'] and 'active flow' in review['upgrade']['issue']['detail']
call('/api/apps',{'manifest':removed},h,409)
assert next(p for p in call('/api/apps',h=h)['packages'] if p['id']==m['id'])['version']=='1.2.2'
print('PASS rollback-only admission checks actual data and required migration, rejects stale consent and active-flow breakage, hides record contents and preserves foreign/stage isolation')
