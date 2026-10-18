"""Frozen export -> saved source jobs -> reviewed exact digests -> native private records across every page."""
binding=call('/api/apps/migration/settings',h=h)
call('/api/apps/migration/settings',{'approve':True,'digest':binding['digest'],'revision':binding['revision'],'values':{'system':'woocommerce','origin':'https://frozen-source.example','version':'wc/v3','currency':'EUR','scale':2,'locale':'en-GB','export_manifest':source_origin+'/frozen/manifest.json','export_digest':frozen_digest,'export_token':'frozen-export-synthetic'}},h,method='PUT')
redacted=json.dumps(call('/api/apps/migration/settings',h=h))
assert 'frozen-export-synthetic' not in redacted and 'source-read-synthetic' not in redacted
installed_export=inspect_source('products','installed')
assert installed_export['sourceExport']['digest']==frozen_digest
cursor=None;export_rows=[];page_jobs=[]
for _ in range(20):
    page=inspect_source('products','frozen',cursor)
    assert page['sourceExport']['sourceRecords']==52 and page['sourceExport']['pages']==2,page
    assert page['sourceExport']['digest']==frozen_digest and not page['cutoverReady']
    command={'sourceId':'frozen','kind':'products','target':target,'options':{'channelId':'default','taxRate':19,'sourcePriceBasis':'gross'},'recordDigests':page['recordDigests'],**({'cursor':cursor} if cursor else {})}
    if not export_rows:
        path='/frozen/'+frozen_manifest['pages'][0]['path'];original=export_files[path];export_files[path]=b'[]'
        bad=call('/api/apps/migration/actions/import_products',command,{**h,'Idempotency-Key':'frozen-tamper'})['jobId']
        for _ in range(100):
            failed=call('/api/apps/migration/jobs/'+bad,h=h)
            if failed['status'] not in ('queued','running'):break
            time.sleep(.1)
        assert failed['status']=='failed',failed
        original_row=page['records'][0]
        missing_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],original_row['source'],original_row['sourceShop'],'products',original_row['sourceId']],separators=(',',':')).encode()).digest()[:16]))
        call('/api/merchant/products/'+missing_id,h={**h,'x-tenant':target},status=404)
        export_files[path]=original
    jid=call('/api/apps/migration/actions/import_products',command,{**h,'Idempotency-Key':uuid.uuid4().hex})['jobId']
    for _ in range(200):
        result=call('/api/apps/migration/jobs/'+jid,h=h)
        if result['status'] not in ('queued','running'):break
        time.sleep(.1)
    assert result['status']=='succeeded',result
    assert result['result']['imported']==len(page['records'])
    assert result['result']['sourceExport']['digest']==frozen_digest,result
    assert not result['result']['snapshotConsistent'] and not result['result']['cutoverReady']
    page_jobs.append(command);export_rows+=page['records'];cursor=page['nextCursor']
    if cursor is None:break
assert cursor is None and len(export_rows)==52 and len({r['sourceId'] for r in export_rows})==52
for row in export_rows:
    native_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],row['source'],row['sourceShop'],'products',row['sourceId']],separators=(',',':')).encode()).digest()[:16]))
    saved=call('/api/merchant/products/'+native_id,h={**h,'x-tenant':target})
    assert saved['commerce']['price']==12.5 and saved['commerce']['stock']==0
    assert saved['extra']['identity']['importSource']['shop']=='https://frozen-source.example',saved['extra']['identity']
    call('/api/merchant/products/'+native_id,h=h,status=404)
replay=call('/api/apps/migration/actions/import_products',page_jobs[0],{**h,'Idempotency-Key':uuid.uuid4().hex})['jobId']
for _ in range(200):
    result=call('/api/apps/migration/jobs/'+replay,h=h)
    if result['status'] not in ('queued','running'):break
    time.sleep(.1)
assert result['status']=='succeeded',result
print('PASS frozen two-page export: exact complete 52 native private products, original source identity/prices, failed tampered-page write, replay, no live products or stock effects; not whole-shop cutover')

changed=json.loads(json.dumps(page_jobs[0]));changed['options']['taxRate']=20
conflict_job=call('/api/apps/migration/actions/import_products',changed,{**h,'Idempotency-Key':uuid.uuid4().hex})['jobId']
for _ in range(100):
    result=call('/api/apps/migration/jobs/'+conflict_job,h=h)
    if result['status'] not in ('queued','running'):break
    time.sleep(.1)
assert result['status']=='failed',result
assert 'Veyndo' in result['message']['en'] and 'HTTP 409' in result['message']['en'],result
assert 'source rejected request' not in result['message']['en'],result
assert 'ursprüngliche' in result['message']['de'],result
print('PASS changed target options stop with localized native conflict guidance, without blaming source access or overwriting imported records')
first=export_rows[0]
first_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],first['source'],first['sourceShop'],'products',first['sourceId']],separators=(',',':')).encode()).digest()[:16]))
unchanged=call('/api/merchant/products/'+first_id,h={**h,'x-tenant':target})
assert unchanged['commerce']['price']==12.5 and unchanged['commerce']['taxRate']==19
