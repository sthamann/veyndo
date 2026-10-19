"""Native imported image bytes are immutable, private, replayable and use the original catalogue/release owners."""
import base64,hashlib
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j6ckAAAAASUVORK5CYII=')
asset={'version':1,'source':'woocommerce','sourceShop':'source-woo','kind':'assets','sourceId':'product-9:image-1','data':{'productSourceId':'product-9','digest':hashlib.sha256(png).hexdigest(),'byteLength':len(png),'mime':'image/png','filename':'source-cup.png','position':0,'title':{'en-GB':'Original cup'}},'warnings':[]}
abody={'approve':True,'record':asset,'options':{},'assetChunks':[base64.b64encode(png).decode()]}
call('/api/merchant/imports',abody,h,400)
imported=call('/api/merchant/imports',abody,sh)
assert call('/api/merchant/imports',abody,sh)['id']==imported['id']
assets=call('/api/merchant/products/'+pid+'/assets',h=sh)['elements']
assert len(assets)==1 and assets[0]['digest']==asset['data']['digest']
product_media=call('/api/merchant/products/'+pid,h=sh)['commerce']['media']
assert len(product_media)==1 and product_media[0]['id']==imported['id']
assert 'shop='+stage in product_media[0]['url']
wrong=json.loads(json.dumps(abody));wrong['assetChunks']=[base64.b64encode(b'changed image').decode()]
call('/api/merchant/imports',wrong,sh,400)
assert len(call('/api/merchant/products/'+pid+'/assets',h=sh)['elements'])==1
call('/api/merchant/imports',abody,fh,400)
assert inspect(abody)['status']=='matching'
media_edit=call('/api/merchant/products/'+pid,h=sh);media_edit['commerce'].pop('stock',None)
media_edit['commerce']['media']=[]
call('/api/merchant/products/'+pid,media_edit,sh,method='PUT')
missing_association=inspect(abody)
assert missing_association['status']=='changed' and any(p.startswith('/association') for p in missing_association['differences']),missing_association
# Restore the actual association using the normal immutable-byte replay owner.
call('/api/merchant/imports',abody,sh)
assert inspect(abody)['status']=='matching'
print('PASS native imported image plus current byte/association comparison and missing-association detection')

# A manual entry keeps its slot while reviewed import positions remain ordered across interleaved slices.
edit=call('/api/merchant/products/'+pid,h=sh);edit['commerce'].pop('stock',None)
edit['commerce']['media'].append({'id':'manual-media','url':'https://example.test/manual.png','view':'Manual','alt':{'en-GB':'Manual'}})
call('/api/merchant/products/'+pid,edit,sh,method='PUT')
ordered=[]
for pos in (2,1):
    entry=json.loads(json.dumps(abody));entry['record']['sourceId']='product-9:image-'+str(pos+1);entry['record']['data'].update({'position':pos,'filename':f'source-{pos}.png','title':{'en-GB':f'Image {pos}'}})
    ordered.append((pos,call('/api/merchant/imports',entry,sh)['id']))
media=call('/api/merchant/products/'+pid,h=sh)['commerce']['media']
assert [x['id'] for x in media]==[imported['id'],'manual-media',dict(ordered)[1],dict(ordered)[2]],media
print('PASS source image positions survive interleaved imports while the manual media slot remains unchanged')

# Binary persistence may precede a rejected media edit; replay must finish the association without duplicate bytes.
partial=json.loads(json.dumps(pbody));partial['record']['sourceId']='partial-image-product';partial['record']['data']['sku']='MIG-PARTIAL'
partial_id=call('/api/merchant/imports',partial,sh)['id']
edit=call('/api/merchant/products/'+partial_id,h=sh);edit['commerce'].pop('stock',None)
edit['commerce']['media']=[{'id':f'manual-{i}','url':f'https://example.test/{i}.png','view':'','alt':{}} for i in range(20)]
call('/api/merchant/products/'+partial_id,edit,sh,method='PUT')
# A valid PNG ancillary text chunk makes the transfer exceed the ordinary 2 MiB request cap.
import struct,zlib
text=b'fixture\0'+b'x'*(3*1024*1024)
chunk=struct.pack('>I',len(text))+b'tEXt'+text+struct.pack('>I',zlib.crc32(b'tEXt'+text))
large=png[:-12]+chunk+png[-12:];encoded=base64.b64encode(large).decode()
pending=json.loads(json.dumps(abody));pending['record']['sourceId']='partial-image';pending['record']['data'].update({'productSourceId':'partial-image-product','digest':hashlib.sha256(large).hexdigest(),'byteLength':len(large),'filename':'large-source.png'})
pending['assetChunks']=[encoded[i:i+65536] for i in range(0,len(encoded),65536)]
call('/api/merchant/imports',pending,sh,400)
stored=call('/api/merchant/products/'+partial_id+'/assets',h=sh)['elements']
assert len(stored)==1 and stored[0]['bytes']==len(large)
assert len(call('/api/merchant/products/'+partial_id,h=sh)['commerce']['media'])==20
edit=call('/api/merchant/products/'+partial_id,h=sh);edit['commerce'].pop('stock',None);edit['commerce']['media'].pop()
call('/api/merchant/products/'+partial_id,edit,sh,method='PUT')
recovered=call('/api/merchant/imports',pending,sh)
assert recovered['id']==stored[0]['id'] and len(call('/api/merchant/products/'+partial_id+'/assets',h=sh)['elements'])==1
assert call('/api/merchant/imports',pending,sh)['replayed']
assert len(call('/api/merchant/products/'+partial_id,h=sh)['commerce']['media'])==20
print('PASS 3 MiB image transfer, native media-limit partial failure and explicit replay recovery without duplicate bytes')
