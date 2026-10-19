"""Four additional provider CRM protocols reach native address books and immutable history, never purchases."""
for platform,address_count in [('prestashop',3),('magento2',3),('shopware5',3),('shopify',2)]:
    for domain,options in [('customers',{'customerGroup':'consumer'}),('orders',{'channelId':'default','locale':'en-GB'})]:
        reviewed=inspect_source(domain,platform)
        assert len(reviewed['records'])==1,(platform,domain,reviewed)
        row=reviewed['records'][0]
        command={'sourceId':platform,'kind':domain,'target':a['workspace'],'recordDigests':reviewed['recordDigests'],'options':options}
        for replay in range(2):
            job_id=call('/api/apps/migration/actions/import_'+domain,command,{**h,'Idempotency-Key':f'{platform}-{domain}-{replay}'})['jobId']
            for _ in range(100):
                saved=call('/api/apps/migration/jobs/'+job_id,h=h)
                if saved['status'] not in ('queued','running'):break
                time.sleep(.1)
            assert saved['status']=='succeeded',(platform,domain,saved)
        native_id=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],row['source'],row['sourceShop'],domain,row['sourceId']],separators=(',',':')).encode()).digest()[:16]))
        if domain=='customers':
            customer=call('/api/merchant/customers/'+row['data']['email'],h=h)
            assert customer['id']==native_id
            addresses=customer['addresses']['elements']
            assert len(addresses)==address_count,(platform,addresses)
            assert all(address['address']['country']=='DE' for address in addresses)
            assert 'Warehouse Street 3' in {address['address']['street'] for address in addresses}
            call('/store-api/account/login',{'email':row['data']['email'],'password':'Migration-fixture-2026!'},{'x-tenant':a['workspace']},401)
            call('/api/merchant/customers/'+row['data']['email'],h=fh,status=404)
        else:
            history=call('/api/merchant/orders/'+native_id,h=h)
            assert history['totalMinor']==1250 and history['payment']['realMoneyCharged'] is False
            assert history['billingAddress']['street']=='Original Street 1'
            assert history['shippingAddress']['street']=='Delivery Street 2'
            assert history['historicalImport']['snapshot']['lines'][0]['unitPrice']['minor']==625
            assert history.get('orderCustomer',{}).get('customerId') is None
            assert call('/api/merchant/orders/'+native_id+'/receipts',h=h)['elements']==[]
            call('/api/merchant/orders/'+native_id,h=fh,status=404)
assert call('/api/merchant/products/chair',h=h)['commerce']['stock']==20
print('PASS all five provider CRM paths: original address books and historical positions/totals, stable replay, foreign denial, no credentials/account inference/payment/invoice/stock effects')
