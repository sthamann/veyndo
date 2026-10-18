"""Reviewed native job writes are fenced by digests, lease, current actor and cancellation."""
import hashlib
from testing.app_approval import consent
m={'id':'migration_fixture','version':'1.0.0','coreApi':'1','runtime':'service','name':{'en':'Migration fixture'},'permissions':['jobs.write','products.write','events:self'],'events':['app.migration_fixture.job_import'],'actions':[{'name':'import','description':'Reviewed migration batch','handler':'job','permission':'catalog.write','requiredPermissions':['apps.manage','environments.manage'],'inputSchema':{'type':'object','properties':{'kind':{'type':'string'},'target':{'type':'string'},'options':{'type':'object'},'recordDigests':{'type':'array','items':{'type':'string'}}},'additionalProperties':False}}]}
call('/api/apps',consent({'manifest':m}),h)
prefix='/api/apps/migration_fixture';digest=next(p['digest'] for p in call('/api/apps',h=h)['packages'] if p['id']==m['id'])
k=call(prefix+'/credentials',{'approve':True,'digest':digest,'permissions':['jobs.write','products.write'],'expiresInDays':1},h)
kh={**h,'Authorization':'Bearer '+k['key']}
pnew=json.loads(json.dumps(product));pnew['sourceId']='job-product-10';pnew['data']['sku']='MIG-10'
rd=hashlib.sha256(json.dumps(pnew,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
intent={'kind':'products','target':stage,'options':pbody['options'],'recordDigests':[rd]}
j=call(prefix+'/actions/import',intent,{**h,'Idempotency-Key':'job-import-10'})['jobId']
claim=call(prefix+'/core/job_claim',{'id':j},kh)
w={'id':j,'lease':claim['lease'],'record':pnew}
call(prefix+'/core/job_import',{**w,'lease':'wrong'},kh,409)
mutated=json.loads(json.dumps(w));mutated['record']['data']['price']['minor']=999
call(prefix+'/core/job_import',mutated,kh,409)
r=call(prefix+'/core/job_import',w,kh)
assert call('/api/merchant/products/'+r['id'],h=sh)['commerce']['stock']==0
assert call(prefix+'/core/job_import',w,kh)['replayed']
entry=call(prefix+'/jobs/'+j,h=h)
call(prefix+'/jobs/'+j,{'operation':'cancel','revision':entry['revision']},h)
call(prefix+'/core/job_import',w,kh,409)
call(prefix+'/core/job_import',w,{**kh,'x-tenant':b['workspace']},403)
print('PASS reviewed job import: frozen row digest, native private target, replay, stale lease, cancellation and foreign key denial')
# A resumed job sees the last acknowledged coarse checkpoint, never a new raw-record database.
j2=call(prefix+'/actions/import',intent,{**h,'Idempotency-Key':'job-import-checkpoint'})['jobId']
cl=call(prefix+'/core/job_claim',{'id':j2},kh)
call(prefix+'/core/job_progress',{'id':j2,'lease':cl['lease'],'status':'failed','progress':20,'checkpoint':{'completed':1,'digest':rd}},kh)
e=call(prefix+'/jobs/'+j2,h=h)
call(prefix+'/jobs/'+j2,{'operation':'retry','revision':e['revision'],'approveUnknownOutcome':True},h)
cl2=call(prefix+'/core/job_claim',{'id':j2},kh)
assert cl2['checkpoint']=={'completed':1,'digest':rd}
# Stored native documents retain a bounded result budget without relaxing callback metadata/checkpoints.
document={'type':'paragraph','text':'Synthetic rich page'}
for _ in range(10):document={'content':[document]}
too_deep=document
for _ in range(20):too_deep={'content':[too_deep]}
for result in ({'large':'X'*33000}, {'deep':too_deep}, [], 'wrong-type'):
    call(prefix+'/core/job_progress',{'id':j2,'lease':cl2['lease'],'status':'running','result':result},kh,400)
call(prefix+'/core/job_progress',{'id':j2,'lease':cl2['lease'],'status':'running','checkpoint':{'document':document}},kh,400)
call(prefix+'/core/job_progress',{'id':j2,'lease':cl2['lease'],'status':'succeeded','result':{'document':document}},kh)
assert call(prefix+'/jobs/'+j2,h=h)['result']['document']==document
print('PASS resumed job retains coarse checkpoint after explicit uncertain-outcome review')

# Eight actual concurrent callbacks must make progress even with the strict small pool.
from concurrent.futures import ThreadPoolExecutor
rows=[]
for i in range(8):
    row=json.loads(json.dumps(product));row['sourceId']='parallel-'+str(i);row['data']['sku']='MIG-PARALLEL-'+str(i);rows.append(row)
intent2={**intent,'recordDigests':[hashlib.sha256(json.dumps(r,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest() for r in rows]}
jp=call(prefix+'/actions/import',intent2,{**h,'Idempotency-Key':'parallel-import'})['jobId'];cp=call(prefix+'/core/job_claim',{'id':jp},kh)
with ThreadPoolExecutor(max_workers=8) as executor:
    imported=list(executor.map(lambda r:call(prefix+'/core/job_import',{'id':jp,'lease':cp['lease'],'record':r},kh),rows))
assert len({v['id'] for v in imported})==8
print('PASS eight concurrent fenced callbacks complete with the configured small database pool')
# A batch can acknowledge a visible union, but each native record gets only its own frozen warnings.
warned=json.loads(json.dumps(product));warned['sourceId']='warning-net-product';warned['data'].update({'sku':'WARN-NET','priceBasis':'net'});warned['warnings']=['source_price_tax_basis_requires_review']
plain=json.loads(json.dumps(product));plain['sourceId']='warning-plain-product';plain['data']['sku']='WARN-PLAIN';plain['warnings']=['synthetic_other_reviewed_limitation']
warnings_intent={'kind':'products','target':stage,'options':{**pbody['options'],'sourcePriceBasis':'net'},'recordDigests':[hashlib.sha256(json.dumps(row,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest() for row in (warned,plain)]}
wj=call(prefix+'/actions/import',warnings_intent,{**h,'Idempotency-Key':'warning-unapproved'})['jobId'];wc=call(prefix+'/core/job_claim',{'id':wj},kh)
call(prefix+'/core/job_import',{'id':wj,'lease':wc['lease'],'record':warned},kh,400)
warnings_intent['options']['acknowledgedWarnings']=warned['warnings']+plain['warnings']
wj=call(prefix+'/actions/import',warnings_intent,{**h,'Idempotency-Key':'warning-approved'})['jobId'];wc=call(prefix+'/core/job_claim',{'id':wj},kh)
for row in (warned,plain):
    result=call(prefix+'/core/job_import',{'id':wj,'lease':wc['lease'],'record':row},kh)
    assert call('/api/merchant/products/'+result['id'],h=sh)['commerce']['price']==23.68
    assert call(prefix+'/core/job_import',{'id':wj,'lease':wc['lease'],'record':row},kh)['replayed']
print('PASS reviewed warning union admits exact per-record warnings and native net conversion; absent acknowledgement is denied')
