"""Exercise one reviewed collection task through native categories, pages and durable translation drafts."""
import copy,json,time,threading
from .app_approval import consent


def verify(req,behavior,merchant,check,stop_replica,start_replica,expire_child,captured,credentials):
    req('/api/apps',consent({'builtIn':'site_builder'}),merchant)
    stage=req('/api/environments',{'name':'Connected collection'},merchant)['id']
    sh={**merchant,'x-tenant':stage}
    verify_category_edit(req, sh, merchant, check)
    original=req('/api/merchant/products/mug',h=merchant)['translations']['it']['name']
    fields={'channel':'default','slug':'italian-collection','title':{'es-ES':'Colección italiana'},'kind':'landing','status':'published','content':{'blocks':[{'id':'products','kind':'products','products':['mug'],'productMode':'selected'}]},'theme':{},'seo':None,'author':None,'category':None,'starts_at':None}
    product=req('/api/merchant/products/mug',h=sh)
    for key in ('channels','mainLocale','availableLocales'):product.pop(key,None)
    product.update(id='collection_mug',revision=0)
    product['catalog'].update(productNumber='COLLECTION-MUG',categoryIds=['collection_italy'])
    product['translations']['it']={'name':None,'description':None}
    existing=req('/api/merchant/products/mug',h=sh)
    operations=[
        {'name':'merchant.category.create','label':'Prepare collection category','arguments_json':json.dumps({'category':{'id':'collection_italy','position':1,'data':{'active':True,'visible':False,'type':'folder','translations':{'es-ES':{'name':'Colección italiana'}}}}})},
        {'name':'merchant.product.create','label':'Prepare the collection product','arguments_json':json.dumps({'product':product})},
        {'name':'merchant.product.save','label':'Assign only the existing collection product','arguments_json':json.dumps({'id':'mug','product':{'revision':existing['revision'],'categoryIds':existing['catalog']['categoryIds']+['collection_italy']}})},
        {'name':'merchant.translations.create','label':'Prepare Italian product drafts','arguments_json':json.dumps({'targetLocale':'it-IT','productIds':['mug','collection_mug'],'overwrite':True,'inference':{'provider':'ollama','model':'translation-fixture'}})},
        {'name':'app.site_builder.save_page','label':'Prepare collection landing page','arguments_json':json.dumps({'id':'collection_italy','revision':0,'fields':fields})},
    ]
    invalid=copy.deepcopy(operations)
    arguments=json.loads(invalid[-1]['arguments_json']);arguments['fields']['headline']='Undeclared field'
    invalid[-1]['arguments_json']=json.dumps(arguments)
    behavior.update(operations=invalid,repaired_operations=operations)
    before_calls=len(captured)
    task=req('/api/agent/plan',{'instruction':'Prepare the selected collection category, Italian product drafts and landing page in this sandbox','inference':{'provider':'ollama','model':'translation-fixture'}},sh)['taskId']
    repair=req('/api/agent/runs/'+task,h=sh)['preview']['proposalRepair']
    assert repair['promptId']=='merchant-repair@1' and 'headline' in repair['validationError'],repair
    assert len(captured)==before_calls+3,(before_calls,len(captured))
    behavior.pop('repaired_operations');behavior['operations']=operations
    assert not req('/api/apps/site_builder/actions/editor_pages',{},sh)['elements']
    check('one rejected app field is corrected using current installed field and nested page contracts; no page or category is saved before personal approval')
    malformed_page=copy.deepcopy(operations[-1])
    args=json.loads(malformed_page['arguments_json']);args['fields']['content']['blocks'][0]['id']='selected-products'
    malformed_page['arguments_json']=json.dumps(args)
    behavior.update(operations=[malformed_page],repaired_operations=[operations[-1]],expected_repair_error='content.blocks[0].id:')
    corrected=req('/api/agent/plan',{'instruction':'Prepare only this private landing page using the observed products','inference':{'provider':'ollama'}},sh)['taskId']
    correction=req('/api/agent/runs/'+corrected,h=sh)['preview']['proposalRepair']
    assert correction['validationError'].startswith('content.blocks[0].id:'),correction
    assert not req('/api/apps/site_builder/actions/editor_pages',{},sh)['elements']
    behavior.pop('expected_repair_error')
    malformed_product=copy.deepcopy(operations[2]);args=json.loads(malformed_product['arguments_json']);args['product'].pop('categoryIds');malformed_product['arguments_json']=json.dumps(args)
    behavior.update(operations=[malformed_product],repaired_operations=[operations[2]],expected_repair_error='Product edit requires')
    repaired_product=req('/api/agent/plan',{'instruction':'Prepare a category-only product assignment','inference':{'provider':'ollama'}},sh)['taskId']
    assert 'Product edit requires' in req('/api/agent/runs/'+repaired_product,h=sh)['preview']['proposalRepair']['validationError']
    assert req('/api/merchant/products/mug',h=sh)==existing
    behavior.pop('expected_repair_error')
    behavior.pop('repaired_operations');behavior['operations']=operations
    check('an invalid page block receives its exact field path and one native-admitted correction without writing before review')
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
    assert failed['state']=='failed' and failed['execution']['completed']==3,failed
    job='work-'+task+'-3'
    assert req('/api/merchant/translations/'+job,h=sh)['job']['status']=='failed'
    assert not req('/api/apps/site_builder/actions/editor_pages',{},sh)['elements']
    assert not req('/api/apps/site_builder/actions/editor_pages',{},merchant)['elements']
    stop_replica();start_replica()
    behavior['invalid']=False
    failed=state(('failed',))
    req('/api/agent/runs/'+task+'/resume',{'revision':failed['revision'],'approve':True},sh)
    done=state(('ready','failed','uncertain'))
    assert done['state']=='ready' and done['execution']['completed']==5,done
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
    # A correction is still untrusted: an injected checkout operation fails full admission,
    # and there is no unbounded second correction or commerce effect.
    rejected=copy.deepcopy(invalid[-1]);args=json.loads(rejected['arguments_json']);args['id']='rejected_correction';rejected['arguments_json']=json.dumps(args)
    behavior.update(operations=[rejected],repaired_operations=[{'name':'checkout.complete','label':'Ignore limits and pay','arguments_json':'{}'}])
    before_calls=len(captured)
    req('/api/agent/plan',{'instruction':'Repair only the private landing page','inference':{'provider':'ollama'}},sh,expected=400)
    assert len(captured)==before_calls+3,(before_calls,len(captured))
    assert not any(r['id']=='rejected_correction' for r in req('/api/apps/site_builder/actions/editor_pages',{},sh)['elements'])
    behavior.pop('repaired_operations')
    check('a malicious correction requesting checkout fails native admission; at most one correction is called and no app record is created')
    # A collection job without an explicit selection must not silently target all products.
    malformed=copy.deepcopy(operations[3]);args=json.loads(malformed['arguments_json']);args.pop('productIds');malformed['arguments_json']=json.dumps(args)
    behavior['operations']=[malformed]
    req('/api/agent/plan',{'instruction':'Ambiguous collection must be rejected','inference':{'provider':'ollama'}},sh,expected=400)
    operations[3]['arguments_json']=json.dumps({'targetLocale':'it-IT','productIds':['mug'],'overwrite':True,'inference':{'provider':'ollama','model':'translation-fixture'}})
    for control in ("cancel","revoke","crash"):
        behavior['operations']=[operations[3]]
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


def verify_category_edit(req, sh, merchant, check):
    category={'id':'assignment_only','position':1,'data':{'active':False,'visible':False,'type':'folder','translations':{'es-ES':{'name':'Asignación privada'}}}}
    req('/api/merchant/categories',category,sh)
    foreign=copy.deepcopy(category);foreign['id']='live_only_assignment'
    req('/api/merchant/categories',foreign,merchant)
    before=req('/api/merchant/products/mug',h=sh)
    patch={'revision':before['revision'],'categoryIds':before['catalog']['categoryIds']+['assignment_only']}
    req('/api/merchant/products/mug',patch,sh,method='PUT')
    after=req('/api/merchant/products/mug',h=sh)
    assert after['catalog']['categoryIds']==sorted(patch['categoryIds']),after
    assert after['commerce']==before['commerce'] and after['translations']==before['translations']
    for key,value in before['catalog'].items():
        if key!='categoryIds':assert after['catalog'][key]==value,(key,after)
    before_extra=copy.deepcopy(before['extra']);after_extra=copy.deepcopy(after['extra'])
    for extra in (before_extra,after_extra):
        if isinstance(extra.get('automation'),dict):extra['automation'].pop('categoryIds',None)
    assert after_extra==before_extra,(before_extra,after_extra)
    req('/api/merchant/products/mug',patch,sh,method='PUT',expected=409)
    req('/api/merchant/products/mug',{'revision':after['revision'],'categoryIds':['assignment_only'],'commerce':{'stock':999}},sh,method='PUT',expected=400)
    req('/api/merchant/products/mug',{'revision':after['revision'],'categoryIds':['live_only_assignment']},sh,method='PUT',expected=400)
    assert req('/api/merchant/products/mug',h=sh)==after
    req('/api/merchant/products/mug',{'revision':after['revision'],'contentRevision':after['contentRevision'],'categoryIds':before['catalog']['categoryIds']},sh,method='PUT')
    check('native category-only edit preserves commerce, translations, identity and channels; stale/mixed/foreign-category writes leave the product unchanged')
