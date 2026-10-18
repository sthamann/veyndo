"""Imported pages use the real installed editor, current rights, private storage and replay fences."""
# Executed in the native fixture context with private stage, headers and original call helper.
preview=call('/api/apps/review',{'builtIn':'site_builder'},sh)
call('/api/apps',{'builtIn':'site_builder','approve':True,'digest':preview['digest'],'permissions':preview['permissions']},sh)
fields={'channel':'default','slug':'about-migration','title':{'en-GB':'About our workshop'},'kind':'page','status':'draft','starts_at':None,'content':{'blocks':[{'id':'source_content','kind':'text','text':{},'rich':{'en-GB':[{'type':'document','doc':{'type':'doc','content':[{'type':'paragraph','content':[{'type':'text','text':'Original source content'}]}]}}]},'image':'','products':[],'fields':[]}]},'theme':{},'seo':None,'author':None,'category':None}
page={'version':1,'source':'woocommerce','sourceShop':'source-woo','kind':'pages','sourceId':'about-1','data':{'destination':{'app':'site_builder','action':'save_page','fields':fields}},'warnings':[]}
payload={'approve':True,'record':page,'options':{'destinationDigest':preview['digest']}}
call('/api/merchant/imports',payload,h,400)
page_id=call('/api/merchant/imports',payload,sh)['id']
assert call('/api/merchant/imports',payload,sh)['replayed']
stale=json.loads(json.dumps(payload));stale['options']['destinationDigest']='0'*64
call('/api/merchant/imports',stale,sh,409)
unknown=json.loads(json.dumps(payload));unknown['record']['data']['destination']['fields']['undeclared']='must not disappear'
call('/api/merchant/imports',unknown,sh,400)
pages=call('/api/apps/site_builder/actions/editor_pages',{'id':page_id},sh)['elements']
assert pages[0]['status']=='draft' and pages[0]['content']['blocks'][0]['rich']['en-GB'][0]['doc']['content'][0]['content'][0]['text']=='Original source content'
changed=json.loads(json.dumps(payload));changed['record']['data']['destination']['fields']['title']={'en-GB':'Changed source'}
call('/api/merchant/imports',changed,sh,409)
invalid=json.loads(json.dumps(payload));invalid['record']['sourceId']='bad-action';invalid['record']['data']['destination']['action']='pages'
call('/api/merchant/imports',invalid,sh,400)
print('PASS native content pages: installed editor/save contract, private editable rich content, replay/conflict and non-save action denial')
# Ordinary editor creation and migration share route -> record locks, including competing first writes.
import concurrent.futures,hashlib
for i in range(8):
    race=json.loads(json.dumps(payload));race['record']['sourceId']='race-page-'+str(i)
    f=race['record']['data']['destination']['fields'];f['slug']='race-page-'+str(i);f['content']['blocks'][0]['rich']=None;f['content']['blocks'][0]['text']={'en-GB':'Race content'}
    rid=str(uuid.UUID(bytes=hashlib.sha256(json.dumps([a['workspace'],'woocommerce','source-woo','pages',race['record']['sourceId']],separators=(',',':')).encode()).digest()[:16]))
    def ordinary():
        try:return call('/api/apps/site_builder/actions/save_page',{'id':rid,'revision':0,'fields':f},sh)
        except AssertionError as e:
            assert e.args[0][1]==409,e
            return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        imported=pool.submit(call,'/api/merchant/imports',race,sh);saved=pool.submit(ordinary)
        assert imported.result()['id']==rid;saved.result()
    assert len(call('/api/apps/site_builder/actions/editor_pages',{'id':rid},sh)['elements'])==1
print('PASS eight concurrent migration/editor first writes retain native route/record lock order with one record')
