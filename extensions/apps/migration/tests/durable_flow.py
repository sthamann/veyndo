"""A connected eight-domain plan retains page evidence independently of native technical job retention."""
whole_id='whole-'+uuid.uuid4().hex
whole_fields={'title':{'en-GB':'Whole source acceptance'},'source_id':'installed','target':target,'domains':['categories','products','assets','pages','customers','orders','reviews','coupons']}
call('/api/apps/migration/actions/save_run',{'id':whole_id,'revision':0,'fields':whole_fields},h)
whole_batches=[]
for domain in whole_fields['domains']:
    source_page=inspect_source(domain,job_group=whole_id)
    dest=target if domain in ('categories','products','assets','pages') else a['workspace']
    options={'products':{'channelId':'default','taxRate':19},'pages':{'destinationDigest':destination_digest},'customers':{'customerGroup':'consumer'},'orders':{'channelId':'default','locale':'en-GB'}}.get(domain,{})
    bid='batch-'+uuid.uuid4().hex
    fields={'run_id':whole_id,'source_id':'installed','kind':domain,'target':dest,'cursor':'','next_cursor':'','digests':source_page['recordDigests'],'options':options,'state':'reviewed','result':{},'job_id':''}
    receipt=call('/api/apps/migration/actions/save_batch',{'id':bid,'revision':0,'fields':fields},h)
    command={'jobGroup':whole_id,'sourceId':'installed','kind':domain,'target':dest,'options':options,'recordDigests':source_page['recordDigests'],'batchId':bid,'batchRevision':receipt['revision'],'evidenceRecord':{'entity':'batches','id':bid}}
    queued=call('/api/apps/migration/actions/import_'+domain,command,{**h,'Idempotency-Key':uuid.uuid4().hex})['jobId']
    for _ in range(200):
        result=call('/api/apps/migration/jobs/'+queued,h=h)
        if result['status'] not in ('queued','running'):break
        time.sleep(.1)
    assert result['status']=='succeeded',(domain,result)
    saved=call('/api/apps/migration/actions/list_batches',{'id':bid,'limit':1},h)['elements'][0]
    if domain=='products' and saved['state']=='differences':
        # The earlier real-purchase fixture deliberately localized this existing product.
        # A replay must reveal that edit, not silently call it matching.
        assert saved['result']['comparison']['examples'][0]['differences']==['/translations/en/name'],saved
        original_row=source_page['records'][0]
        item_id=saved['result']['comparison']['examples'][0]['id']
        th={**h,'x-tenant':target};editor=call('/api/merchant/products/'+item_id,h=th)
        editor['commerce'].pop('stock',None);editor['translations']['en']['name']=original_row['data']['name']['en-GB']
        call('/api/merchant/products/'+item_id,editor,th,method='PUT')
        queued=call('/api/apps/migration/actions/import_products',{**command,'operation':'reconcile'},{**h,'Idempotency-Key':uuid.uuid4().hex})['jobId']
        for _ in range(200):
            result=call('/api/apps/migration/jobs/'+queued,h=h)
            if result['status'] not in ('queued','running'):break
            time.sleep(.1)
        assert result['status']=='succeeded',result
        saved=call('/api/apps/migration/actions/list_batches',{'id':bid,'limit':1},h)['elements'][0]
    proof=call('/api/apps/migration/core/job_evidence',{'entity':'batches','ids':[bid]},h)
    assert proof['verified']==[{'id':bid,'revision':saved['revision'],'job':queued}],proof
    assert saved['state']=='matching' and saved['result']['comparison']['matching']==len(source_page['recordDigests']),(domain,saved)
    call('/api/apps/migration/jobs/'+queued,{'operation':'archive','revision':result['revision']},h)
    call('/api/apps/migration/jobs/'+queued,h=h,status=404)
    assert call('/api/apps/migration/actions/list_batches',{'id':bid},h)['elements'][0]['result']['reconciled']
    whole_batches.append((saved,command))
all_saved=call('/api/apps/migration/actions/list_batches',{'filter':{'run_id':whole_id}},h)['elements']
assert len(call('/api/apps/migration/core/job_evidence',{'entity':'batches','ids':[row['id'] for row in all_saved]},h)['verified'])==8
assert len(all_saved)==8 and {row['kind'] for row in all_saved}==set(whole_fields['domains'])
call('/api/apps/migration/actions/list_batches',{'filter':{'run_id':whole_id}},fh,status=404)
for archived in call('/api/apps/migration/jobs?group='+whole_id,h=h)['jobs']:
    assert archived['status'] in ('succeeded','failed','cancelled'),archived
    call('/api/apps/migration/jobs/'+archived['id'],{'operation':'archive','revision':archived['revision']},h)
assert call('/api/apps/migration/jobs?group='+whole_id,h=h)['jobs']==[]
assert len(call('/api/apps/migration/actions/list_batches',{'filter':{'run_id':whole_id}},h)['elements'])==8
# Restart the real independent Rust service: all continuity comes from Core, not process memory.
process.terminate();process.wait(timeout=10)
process=subprocess.Popen([str(ROOT/'target/debug/migration-assistant'),'serve'],env=env,stdout=log,stderr=log)
for _ in range(100):
    try:
        with urllib.request.urlopen(service+'/health',timeout=1) as ready:assert ready.status==200
        break
    except (OSError,urllib.error.URLError):time.sleep(.05)
else:raise AssertionError('Restarted migration service is not ready')
print('PASS connected eight-domain native plan: ordered page review/replay/comparison, durable CAS evidence survives actual job archival, private/foreign bounds')
# A new read-only job reports a manual target edit; it never repairs or overwrites it.
product_receipt,command=next(pair for pair in whole_batches if pair[0]['kind']=='products')
product_page=inspect_source('products')
source_row=product_page['records'][0]
product_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],source_row['source'],source_row['sourceShop'],'products',source_row['sourceId']],separators=(',',':')).encode()).digest()[:16]))
th={**h,'x-tenant':target}
editor=call('/api/merchant/products/'+product_id,h=th);old_price=editor['commerce']['price'];editor['commerce'].pop('stock',None);editor['commerce']['price']=21.25
call('/api/merchant/products/'+product_id,editor,th,method='PUT')
comparison_input={**command,'operation':'reconcile'}
for expected in ('differences','matching'):
    queued=call('/api/apps/migration/actions/import_products',comparison_input,{**h,'Idempotency-Key':uuid.uuid4().hex})['jobId']
    for _ in range(200):
        result=call('/api/apps/migration/jobs/'+queued,h=h)
        if result['status'] not in ('queued','running'):break
        time.sleep(.1)
    assert result['status']=='succeeded',result
    saved=call('/api/apps/migration/actions/list_batches',{'id':product_receipt['id']},h)['elements'][0]
    assert saved['state']==expected,saved
    if expected=='differences':
        assert saved['result']['comparison']['changed']==1 and not saved['result']['reconciled'],saved
        assert call('/api/merchant/products/'+product_id,h=th)['commerce']['price']==21.25
        editor=call('/api/merchant/products/'+product_id,h=th);editor['commerce'].pop('stock',None);editor['commerce']['price']=old_price
        call('/api/merchant/products/'+product_id,editor,th,method='PUT')
    else:assert saved['result']['comparison']['matching']==1 and saved['result']['reconciled']
print('PASS archived-job recovery uses new current-field comparison: changed price detected and preserved, restored price matches again, durable report advances by CAS')

# Ordinary saves cannot forge success or reuse a genuine completion token after any field edit.
verified=call('/api/apps/migration/core/job_evidence',{'entity':'batches','ids':[saved['id']]},h)
assert len(verified['verified'])==1
fields={k:v for k,v in saved.items() if k not in ('id','revision')}
fields['options']={'taxRate':17,'channelId':'default'}
forged=call('/api/apps/migration/actions/save_batch',{'id':saved['id'],'revision':saved['revision'],'fields':fields},h)
assert call('/api/apps/migration/core/job_evidence',{'entity':'batches','ids':[saved['id']]},h)['verified']==[]
fields['evidence']='forged';fields['digests']=[];fields['result']={'reconciled':True,'comparison':{'checked':0,'matching':0}}
call('/api/apps/migration/actions/save_batch',{'id':saved['id'],'revision':forged['revision'],'fields':fields},h)
assert call('/api/apps/migration/core/job_evidence',{'entity':'batches','ids':[saved['id']]},h)['verified']==[]
print('PASS native completion evidence survives job archival/service restart and rejects ordinary forged success or edited signed fields')

# A genuinely empty source page is observed by the Rust transport and gets the same terminal fence.
empty=inspect_source('categories',source_id='empty')
assert empty['records']==empty['recordDigests']==[]
eid='empty-'+uuid.uuid4().hex
fields={'run_id':whole_id,'source_id':'empty','kind':'categories','target':target,'cursor':'','next_cursor':'','digests':[],'options':{},'state':'reviewed','result':{},'job_id':''}
page=call('/api/apps/migration/actions/save_batch',{'id':eid,'revision':0,'fields':fields},h)
empty_input={'jobGroup':whole_id,'sourceId':'empty','kind':'categories','target':target,'options':{},'recordDigests':[],'batchId':eid,'batchRevision':page['revision'],'evidenceRecord':{'entity':'batches','id':eid}}
existing=call('/api/merchant/categories',h={**h,'x-tenant':target})['elements']
ej=call('/api/apps/migration/actions/import_categories',empty_input,{**h,'Idempotency-Key':uuid.uuid4().hex})['jobId']
for _ in range(200):
    ended=call('/api/apps/migration/jobs/'+ej,h=h)
    if ended['status'] not in ('queued','running'):break
    time.sleep(.1)
assert ended['status']=='succeeded' and ended['result']['comparison']['checked']==0,ended
assert len(call('/api/apps/migration/core/job_evidence',{'entity':'batches','ids':[eid]},h)['verified'])==1
assert call('/api/merchant/categories',h={**h,'x-tenant':target})['elements']==existing
print('PASS actual empty source transport -> explicit reviewed native page -> fenced completion evidence, no native data creation')
