#!/usr/bin/env python3
"""Actual native scoped file upload, callback read, product/digest/key fences and public-file policy."""
import copy,json,os,pathlib,urllib.request,urllib.error,uuid,base64
from testing.app_approval import consent
base=os.environ['BASE_URL'];t='assets-'+uuid.uuid4().hex[:10]
def call(path,body=None,h=None,status=200):
 if path=='/api/apps' and body is not None:body=consent(body)
 req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json',**(h or {})})
 return response(req,status)
def response(req,status):
 try:
  with urllib.request.urlopen(req,timeout=30) as r:code=r.status;v=json.load(r)
 except urllib.error.HTTPError as e:code=e.code;v=json.load(e)
 assert code==status,(req.full_url,code,status,v);return v
def upload(path,h,product='mug',grant=None,data=b'export fixture\n'*6000,mime='text/plain',status=200):
 boundary=uuid.uuid4().hex;fields={'productId':product,'kind':'attachment','title':json.dumps({'en':'App upload'})}
 if grant is not None:fields['grant']=grant
 parts=[f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k,v in fields.items()]
 parts+=[f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="fixture.txt"\r\nContent-Type: {mime}\r\n\r\n'.encode()+data+b'\r\n',f'--{boundary}--\r\n'.encode()]
 return response(urllib.request.Request(base+path,data=b''.join(parts),headers={**h,'Content-Type':'multipart/form-data; boundary='+boundary}),status)
u=call('/api/auth/register',{'workspaceId':t,'name':'Asset owner','email':t+'@example.test','password':'Synthetic-assets-password!'});h={'x-tenant':t,'Authorization':'Bearer '+u['token']}
m=json.loads((pathlib.Path(__file__).resolve().parents[1]/'extensions/apps/care-studio/manifest.json').read_text());m['id']='assets_fixture';m['permissions']+=['assets.read','assets.write'];e=m['entities'][0];e['fields']+=[{'name':'file','label':m['name'],'kind':'file'}]
for name,handler,read,scope,properties in [('assets','assets',True,'catalog.read',{'productId':{'type':'string'}}),('preview_asset','asset_preview',True,'catalog.read',{'id':{'type':'string'},'productId':{'type':'string'}}),('upload_asset','asset_upload',False,'catalog.write',{'productId':{'type':'string'}})]:
 m['actions'].append({'name':name,'description':'Fixture files','handler':handler,'readOnly':read,'public':False,'permission':scope,'mcp':False,'inputSchema':{'type':'object','properties':properties,'additionalProperties':False}})
m['surfaces'][0].update(location='admin.product.tab',actions=m['surfaces'][0]['actions']+['assets','preview_asset','upload_asset'])
call('/api/apps',{'manifest':m},h);p='/api/apps/'+m['id'];s=p+'/surfaces/workspace';grant=call(s+'/grant',{'context':{'productId':'mug'}},h)['token']
a=upload(s+'/assets',h,grant=grant);assert not a['public'];items=call(s+'/actions/assets',{'grant':grant,'input':{'productId':'mug'}},h);assert items['elements'][0]['id']==a['id'] and items['elements'][0]['bytes']>65536
upload(s+'/assets',h,product='chair',grant=grant,status=403)
digest=next(p for p in call('/api/apps',h=h)['packages'] if p['id']==m['id'])['digest'];k=call(p+'/credentials',{'digest':digest,'approve':True,'permissions':['assets.read','assets.write'],'expiresInDays':1},h);kh={**h,'Authorization':'Bearer '+k['key']}
binary=call(p+'/core/asset',{'id':a['id'],'productId':'mug'},kh);assert base64.b64decode(binary['base64'])==b'export fixture\n'*6000
call(p+'/core/asset',{'id':a['id'],'productId':'chair'},kh,403);call('/api/apps/another/core/asset',{'id':a['id']},kh,403)
image=upload(p+'/core/asset_upload',kh,data=b'\x89PNG\r\n\x1a\nfixture',mime='image/png');preview=call(p+'/core/asset_preview',{'id':image['id']},kh);assert preview['mime']=='image/png'
call(p+'/actions/save_guides',{'id':'private','revision':0,'fields':{'title':{'en':'Unsafe public link'},'file':a['id']}},h,400)
new=copy.deepcopy(m);new['version']='1.0.1';call('/api/apps',{'manifest':new},h);upload(s+'/assets',h,grant=grant,status=403);call(p+'/core/asset',{'id':a['id']},kh,401)
other=t+'-other';u2=call('/api/auth/register',{'workspaceId':other,'name':'Other asset owner','email':other+'@example.test','password':'Synthetic-assets-password!'});oh={'x-tenant':other,'Authorization':'Bearer '+u2['token']};call('/api/apps',{'manifest':m},oh);call(p+'/core/asset',{'id':a['id']},oh,404);assert not call(p+'/core/assets',{},oh)['elements']
print('PASS real >64 KiB product asset upload/export reads, native grant context, private image preview, public-field rejection, package/key fences and foreign tenant isolation')
# Importing an explicitly restricted file form must not add upload/browsing authority.
draft=json.loads((pathlib.Path(__file__).resolve().parents[1]/'extensions/apps/product-advisor/manifest.json').read_text());draft['id']='described_assets'
draft['entities'][0]['publicRead']=False
draft['entities'][0]['fields'].append({'name':'design','label':draft['name'],'kind':'file'})
draft['surfaces']=draft['surfaces'][:1];draft['views']=draft['views'][:1];draft['apiRoutes']=[]
draft.pop('actions',None)
for block in draft['views'][0]['blocks'][:2]:block.pop('readAction',None);block.pop('writeAction',None)
stage=call('/api/environments',{'name':'Described private app'},h)['id']
build=call('/api/developer/import',{'environment':stage,'prompt':'Product consultation with private design file','summary':draft['name'],'manifest':draft},h)
call('/api/developer/builds/'+build['id']+'/stage',{'approve':True,'digest':build['digest']},h)
sh={**h,'x-tenant':stage};sp='/api/apps/described_assets';surface=sp+'/surfaces/workspace'
sg=call(surface+'/grant',{'context':{'productId':'mug'}},sh)['token']
assert build['manifest']['surfaces'][0]['actions']==draft['surfaces'][0]['actions']
assert not any(p in build['manifest']['permissions'] for p in ['assets.read','assets.write'])
upload(surface+'/assets',sh,grant=sg,status=403)
call(surface+'/actions/assets',{'grant':sg,'input':{'productId':'mug'}},sh,status=403)
call(surface+'/actions/save_entries',{'grant':sg,'input':{'id':'design_request','revision':0,'fields':{'product_id':'mug','title':{'en':'Private consultation'}}}},sh)
record=call(surface+'/actions/list_entries',{'grant':sg,'input':{'filter':{'product_id':'mug'}}},sh)['elements'][0]
assert not record.get('design') and record['product_id']=='mug'
call(sp+'/actions/list_entries',{},h,status=404)
call('/store-api/apps/described_assets/actions/list_entries',{}, {'x-tenant':stage},status=401)
print('PASS explicit imported list/save-only file form retains its grant, refuses upload/browsing and preserves native save/reload and live/public isolation')
