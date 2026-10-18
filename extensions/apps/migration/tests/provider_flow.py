"""Every advertised platform traverses its actual Rust source transport, reviewed job and native private product owner."""
for platform,expected,basis in [('prestashop',14.88,'net'),('magento2',15.25,'gross'),('shopware5',29.9,'gross'),('shopify',19.9,'gross')]:
    source_page=inspect_source('products',platform)
    assert len(source_page['records'])==1 and source_page['records'][0]['data']['catalogActive'] is False
    destination=call('/api/environments',{'name':platform+' source preview'},h)['id']
    options={'channelId':'default','taxRate':19,'sourcePriceBasis':basis,'acknowledgedWarnings':list({w for row in source_page['records'] for w in row['warnings']})}
    command={'sourceId':platform,'kind':'products','target':destination,'recordDigests':source_page['recordDigests'],'options':options}
    job_id=call('/api/apps/migration/actions/import_products',command,{**h,'Idempotency-Key':platform+'-native-source'})['jobId']
    for _ in range(100):
        saved=call('/api/apps/migration/jobs/'+job_id,h=h)
        if saved['status'] not in ('queued','running'):break
        time.sleep(.1)
    assert saved['status']=='succeeded',(platform,saved)
    row=source_page['records'][0]
    native_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],row['source'],row['sourceShop'],row['kind'],row['sourceId']],separators=(',',':')).encode()).digest()[:16]))
    native=call('/api/merchant/products/'+native_id,h={**h,'x-tenant':destination})
    assert native['commerce']['price']==expected and native['commerce']['stock']==0,(platform,native['commerce'])
    assert native['catalog']['active'] is False
    call('/api/merchant/products/'+native_id,h=h,status=404)
print('PASS all five actual Rust provider transports -> saved review -> explicit tax/basis/warnings -> durable native private product; source visibility preserved and net Presta price converted by native calculator')
