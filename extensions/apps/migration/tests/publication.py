"""Selected publication preserves variant dependencies and refuses protected downloads as public product images."""
def selection_for(*keys):
    return [{'key':c['key'],'digest':c['digest']} for c in call('/api/environments/'+stage+'/diff',h=h)['changes'] if c['key'] in keys]

call('/api/environments/'+stage+'/release',{'approve':True,'selections':selection_for('product:'+vid)},h,409)
call('/api/merchant/products/'+pid,h=h,status=404)
call('/api/merchant/products/'+vid,h=h,status=404)
asset_keys=['asset:'+x['id'] for x in call('/api/merchant/products/'+pid+'/assets',h=sh)['elements']]
selected=selection_for('product:'+vid,'product:'+pid,'category:'+parent,'category:'+child_id,*asset_keys)
call('/api/environments/'+stage+'/release',{'approve':True,'selections':list(reversed(selected))},h)
published=call('/api/merchant/products/'+vid,h=h)
assert published['catalog']['parentId']==pid and published['catalog']['categoryIds']==[child_id]
assert published['commerce']['stock']==0
print('PASS selected variant without parent is rejected atomically; reverse-ordered joint release keeps native parent/category associations')

# An explicitly published protected download remains a download, never a public image attachment.
boundary='migration-download-fixture'
payload=(f'--{boundary}\r\nContent-Disposition: form-data; name="kind"\r\n\r\ndownload\r\n'
         f'--{boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\n{{"en-GB":"Protected original"}}\r\n'
         f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="protected.png"\r\nContent-Type: image/png\r\n\r\n').encode()+png+f'\r\n--{boundary}--\r\n'.encode()
req=urllib.request.Request(BASE+'/api/merchant/products/'+pid+'/assets',data=payload,headers={**sh,'Content-Type':'multipart/form-data; boundary='+boundary})
with urllib.request.urlopen(req) as response:download=json.load(response)
call('/api/merchant/assets/'+download['id'],{'public':True,'digest':download['digest']},sh,method='PUT')
edit=call('/api/merchant/products/'+pid,h=sh);edit['commerce'].pop('stock',None)
edit['commerce']['media'].append({'id':download['id'],'url':'/store-api/assets/'+download['id']+'?shop='+stage,'view':'','alt':{}})
call('/api/merchant/products/'+pid,edit,sh,method='PUT')
before=call('/api/merchant/products/'+pid,h=h)
call('/api/environments/'+stage+'/release',{'approve':True,'selections':selection_for('product:'+pid,'asset:'+download['id'])},h,409)
assert call('/api/merchant/products/'+pid,h=h)==before
assert not any(x['id']==download['id'] for x in call('/api/merchant/products/'+pid+'/assets',h=h)['elements'])
print('PASS protected-download image reference rolls back the entire selected product/asset release')
