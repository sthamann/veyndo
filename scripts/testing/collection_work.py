"""Exercise one reviewed collection task through native categories, pages and durable translation drafts."""
import copy,json,time,threading
from .app_approval import consent


def verify(req,behavior,merchant,check,stop_replica,start_replica,expire_child,captured,credentials):
    req('/api/apps',consent({'builtIn':'site_builder'}),merchant)
    stage=req('/api/environments',{'name':'Connected collection'},merchant)['id']
    sh={**merchant,'x-tenant':stage}
    original=req('/api/merchant/products/mug',h=merchant)['translations']['it']['name']
    fields={'channel':'default','slug':'italian-collection','title':{'es-ES':'Colección italiana'},'kind':'landing','status':'published','content':{'blocks':[{'id':'products','kind':'products','products':['mug'],'productMode':'selected'}]},'theme':{},'seo':None,'author':None,'category':None,'starts_at':None}
    product=req('/api/merchant/products/mug',h=sh)
    for key in ('channels','mainLocale','availableLocales'):product.pop(key,None)
    product.update(id='collection_mug',revision=0)
    product['catalog'].update(productNumber='COLLECTION-MUG',categoryIds=['collection_italy'])
    product['translations']['it']={'name':None,'description':None}
    operations=[
        {'name':'merchant.category.create','label':'Prepare collection category','arguments_json':json.dumps({'category':{'id':'collection_italy','position':1,'data':{'active':True,'visible':False,'type':'folder','translations':{'es-ES':{'name':'Colección italiana'}}}}})},
        {'name':'merchant.product.create','label':'Prepare the collection product','arguments_json':json.dumps({'product':product})},
        {'name':'merchant.translations.create','label':'Prepare Italian product drafts','arguments_json':json.dumps({'targetLocale':'it-IT','productIds':['mug','collection_mug'],'overwrite':True,'inference':{'provider':'ollama','model':'translation-fixture'}})},
        {'name':'app.site_builder.save_page','label':'Prepare collection landing page','arguments_json':json.dumps({'id':'collection_italy','revision':0,'fields':fields})},
    ]
    behavior['operations']=operations
    task=req('/api/agent/plan',{'instruction':'Prepare the selected collection category, Italian product drafts and landing page in this sandbox','inference':{'provider':'ollama','model':'translation-fixture'}},sh)['taskId']
    assert not req('/api/apps/site_builder/actions/editor_pages',{},sh)['elements']
    # Fail translation output after the category commits. Parent completion must wait.
    behavior['invalid']=True
    req('/api/agent/tasks/'+task+'/apply',{'approve':True},sh)
    def state(wanted):
        for _ in range(200):
            current=req('/api/agent/runs/'+task,h=sh)
            if current['state'] in wanted:return current
            time.sleep(.1)
        raise AssertionError(current)
    failed=state(('failed','uncertain'))
    assert failed['state']=='failed' and failed['execution']['completed']==2,failed
    job='work-'+task+'-2'
    assert req('/api/merchant/translations/'+job,h=sh)['job']['status']=='failed'
    assert not req('/api/apps/site_builder/actions/editor_pages',{},sh)['elements']
    assert not req('/api/apps/site_builder/actions/editor_pages',{},merchant)['elements']
    stop_replica();start_replica()
    behavior['invalid']=False
    failed=state(('failed',))
    req('/api/agent/runs/'+task+'/resume',{'revision':failed['revision'],'approve':True},sh)
    done=state(('ready','failed','uncertain'))
    assert done['state']=='ready' and done['execution']['completed']==4,done
    categories=req('/api/merchant/categories',h=sh)['elements']
    assert next(c for c in categories if c['id']=='collection_italy')['revision']==1,categories
    rows=req('/api/apps/site_builder/actions/editor_pages',{},sh)['elements']
    assert len(rows)==1 and rows[0]['id']=='collection_italy'
    drafts=req('/api/merchant/translations/'+job,h=sh)
    assert drafts['job']['total']==2 and [i['product_id'] for i in drafts['items']]==['collection_mug','mug'],drafts
    assert req('/api/merchant/products/mug',h=sh)['translations']['it']['name']==original
    # Only selected, reviewed private data can reach live; task execution never publishes.
    assert not any(c['id']=='collection_italy' for c in req('/api/merchant/categories',h=merchant)['elements'])
    assert req('/api/agent/tasks/'+task+'/apply',{'approve':True},sh)['replayed']
    req('/api/merchant/translations/'+job+'/apply',{},sh)
    changes=req('/api/environments/'+stage+'/diff',h=merchant)['changes']
    chosen=next(c for c in changes if c['key']=='appdata:site_builder:pages:collection_italy')
    req('/api/environments/'+stage+'/release',{'approve':True,'selections':[{'key':chosen['key'],'digest':chosen['digest']}]},merchant)
    assert len(req('/api/apps/site_builder/actions/editor_pages',{},merchant)['elements'])==1
    assert req('/store-api/apps/site_builder/actions/pages',{},merchant)['elements'][0]['slug']=='italian-collection'
    assert req('/api/merchant/products/mug',h=merchant)['translations']['it']['name']==original
    check('connected collection resumes after a failed translation and process restart, keeps native category and newly created product exactly once, prepares the page only after drafts, and selectively releases only the reviewed page')
    # A collection job without an explicit selection must not silently target all products.
    malformed=copy.deepcopy(operations[2]);args=json.loads(malformed['arguments_json']);args.pop('productIds');malformed['arguments_json']=json.dumps(args)
    behavior['operations']=[malformed]
    req('/api/agent/plan',{'instruction':'Ambiguous collection must be rejected','inference':{'provider':'ollama'}},sh,expected=400)
    operations[2]['arguments_json']=json.dumps({'targetLocale':'it-IT','productIds':['mug'],'overwrite':True,'inference':{'provider':'ollama','model':'translation-fixture'}})
    for control in ("cancel","revoke","crash"):
        behavior['operations']=[operations[2]]
        started=threading.Event();release=threading.Event()
        behavior.update(translation_started=started,translation_release=release)
        task=req('/api/agent/plan',{'instruction':'Prepare selected private drafts with current rights','inference':{'provider':'ollama'}},sh)['taskId']
        req('/api/agent/tasks/'+task+'/apply',{'approve':True},sh)
        assert started.wait(15),'child worker never called the translation provider'
        current=req('/api/agent/runs/'+task,h=sh)
        assert current['state'] in ('queued','running') and current['execution']['completed']==0,current
        assert current['execution']['steps'][0]['translationJobId']=='work-'+task+'-0',current
        for action in ('cancel','resume'):
            req('/api/merchant/translations/work-'+task+'-0',{'action':action},sh,method='PUT',expected=409)
        # An in-flight model call holds no commerce transaction: other native reads remain available.
        req('/api/merchant/categories',h=sh)
        calls=len(captured)
        if control=="revoke":
            req('/api/auth/logout',{},merchant)
        elif control=="crash":
            stop_replica();expire_child(task)
        else:
            req('/api/agent/runs/'+task+'/cancel',{'revision':current['revision'],'approve':True},sh)
        release.set()
        if control=="revoke":
            fresh=req('/api/auth/login',credentials)
            merchant['Authorization']='Bearer '+fresh['token'];sh['Authorization']=merchant['Authorization']
            for _ in range(150):
                current=req('/api/agent/runs/'+task,h=sh)
                if current['state']=='failed':break
                time.sleep(.1)
            assert current['state']=='failed',current
        elif control=="crash":
            start_replica()
            for _ in range(150):
                current=req('/api/agent/runs/'+task,h=sh)
                if current['state']=='uncertain':break
                time.sleep(.1)
            assert current['state']=='uncertain' and len(captured)==calls,current
        else:
            assert req('/api/agent/runs/'+task,h=sh)['state']=='cancelled' 
        job='work-'+task+'-0'
        for _ in range(100):
            child=req('/api/merchant/translations/'+job,h=sh)
            if child['job']['status'] in ('failed','cancelled'):break
            time.sleep(.1)
        assert child['job']['status']==('cancelled' if control=='cancel' else 'failed') and not child['items'],child
        behavior.pop('translation_started');behavior.pop('translation_release')
        if control=='crash':
            req('/api/agent/runs/'+task+'/resume',{'revision':current['revision'],'approve':True},sh)
            for _ in range(150):
                recovered=req('/api/agent/runs/'+task,h=sh)
                if recovered['state']=='ready':break
                time.sleep(.1)
            assert recovered['state']=='ready' and recovered['execution']['completed']==1,recovered
    check('linked translation calls release database backends; parent cancellation and revoked original sessions fence in-flight drafts and a killed translation call needs explicit continuation without automatic provider retry')
    behavior.pop('operations')
