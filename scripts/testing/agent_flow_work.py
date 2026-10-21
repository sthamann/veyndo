"""Native product event -> Flow proposal -> personal approval -> original durable work executor."""
import json,time
from testing.runtime import stop


def verify_flow_work(call,base,h,actor,mode,sql,start,passed,started,release,captured):
    stage=call(base,'/api/environments',{'name':'Flow work regression'},h)['id']
    sh={**h,'x-tenant':stage}
    main=call(base,'/api/merchant/commerce',h=sh)['data']['mainLocale']
    step={'name':'merchant.category.create','label':'Prepare event-driven private category','arguments_json':json.dumps({'category':{'id':'flow_work_category','position':0,'data':{'active':True,'visible':False,'type':'folder','translations':{main:{'name':'Flow prepared category'}}}}})}
    mode.update(block=False,operations=[step])
    definition={'name':{main:'Review native work'},'active':True,'event':'product.updated','condition':{'type':'alwaysValid'},'action':'ai_proposal','instruction':{main:'Prepare a private category for this changed product; require review.'},'locale':main,'inference':{'provider':'openai'}}
    call(base,'/api/automation/flows/native_work',{'revision':0,'data':definition},sh,method='PUT')
    product=call(base,'/api/merchant/products/mug',h=sh)
    product.pop('id');product.pop('channels')
    call(base,'/api/merchant/products/mug',product,sh,method='PUT')
    memory,_=start('memory-worker')
    apps,_=start('app-worker')
    def trigger():
        product=call(base,'/api/merchant/products/mug',h=sh)
        product.pop('id');product.pop('channels')
        call(base,'/api/merchant/products/mug',product,sh,method='PUT')
    def wait_job(flow,ignored=()):
        for _ in range(200):
            jobs=call(base,'/api/automation',h=sh)['jobs']
            found=next((j for j in jobs if j['flow']==flow and j['id'] not in ignored and j['state'] in ('completed','failed')),None)
            if found:return found
            time.sleep(.1)
        raise AssertionError(jobs)
    def control(stopped):
        current=call(base,'/api/agent/control',h=h)
        call(base,'/api/agent/control',{'stopped':stopped,'revision':current['revision'],'approve':True},h)
    try:
        job=wait_job('native_work')
        assert job['state']=='completed',job
        task=job['result']['taskId']
        status=call(base,'/api/agent/runs/'+task,h=sh)
        assert status['state']=='ready' and status['approvalRequired'],status
        assert any(item['id']==task for item in call(base,'/api/agent/tasks',h=sh)['tasks'])
        assert sql(f"SELECT run_credential IS NULL AND NOT run_personal FROM tasks WHERE tenant='{stage}' AND id='{task}'")=='t'
        assert sql(f"SELECT count(*) FROM categories WHERE tenant='{stage}' AND id='flow_work_category'")=='0'
        approved=call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh)
        assert approved.get('queued') and not approved.get('applied'),approved
        for _ in range(150):
            status=call(base,'/api/agent/runs/'+task,h=sh)
            if status['state'] not in ('queued','running'):break
            time.sleep(.1)
        assert status['state']=='ready' and status['execution']['completed']==1,status
        assert sql(f"SELECT revision FROM categories WHERE tenant='{stage}' AND id='flow_work_category'")=='1'
        assert call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh)['replayed']
        assert sql(f"SELECT count(*) FROM categories WHERE tenant='{h['x-tenant']}' AND id='flow_work_category'")=='0'
        call(base,'/api/agent/runs/'+task,h=h,expected=404)
        passed('A native product event yields a visible actor-owned Flow proposal; personal approval executes its private native work once and live data stays unchanged')
        definition['active']=False
        call(base,'/api/automation/flows/native_work',{'revision':1,'data':definition},sh,method='PUT')
        mode['operations'][0]['arguments_json']=mode['operations'][0]['arguments_json'].replace('flow_work_category','flow_pipeline_category')
        pipeline={**definition,'active':True,'action':'pipeline','pipeline':{'entry':'propose','nodes':[{'id':'propose','kind':'action','action':'ai_proposal','config':{'instruction':definition['instruction']},'next':None}]}}
        call(base,'/api/automation/flows/pipeline_work',{'revision':0,'data':pipeline},sh,method='PUT')
        trigger();done=wait_job('pipeline_work');assert done['state']=='completed',done
        task2=done['result']['trace'][0]['result']['taskId']
        assert call(base,'/api/agent/runs/'+task2,h=sh)['state']=='ready'
        assert sql(f"SELECT count(*) FROM categories WHERE tenant='{stage}' AND id='flow_pipeline_category'")=='0'
        passed('The graphical pipeline action uses the same ready proposal and cannot execute its native steps automatically')
        # The live-shop stop applies to scheduled proposals in all its sandboxes.
        count=len(captured);control(True);trigger()
        blocked=wait_job('pipeline_work',[done['id']])
        assert blocked['state']=='failed' and len(captured)==count,blocked
        call(base,'/api/agent/tasks/'+task2+'/apply',{'approve':True},sh,expected=403)
        control(False)
        # Stop after the provider began: no late ready task may escape the fence.
        before=sql(f"SELECT count(*) FROM tasks WHERE tenant='{stage}'")
        mode['block']=True;started.clear();release.clear();trigger()
        assert started.wait(15),'Flow never reached inference'
        control(True);release.set()
        late=wait_job('pipeline_work',[done['id'],blocked['id']])
        assert late['state']=='failed',late
        assert sql(f"SELECT count(*) FROM tasks WHERE tenant='{stage}'")==before
        control(False)
        passed('Shop emergency stop prevents Flow inference, private work approval and a late provider result; re-enabling does not replay the failed job')
        started.clear();release.clear();trigger()
        assert started.wait(15),'Flow never reached inference before rights withdrawal'
        sql(f"UPDATE memberships SET role='viewer',permissions='[\"catalog.read\"]'::jsonb WHERE tenant='{h['x-tenant']}' AND user_id='{actor}'")
        release.set()
        try:
            for _ in range(150):
                state=sql(f"SELECT state FROM flow_jobs WHERE tenant='{stage}' AND flow='pipeline_work' ORDER BY event_id DESC LIMIT 1")
                if state=='failed':break
                time.sleep(.1)
            assert state=='failed',state
            assert sql(f"SELECT count(*) FROM tasks WHERE tenant='{stage}'")==before
        finally:
            sql(f"UPDATE memberships SET role='owner',permissions='null'::jsonb WHERE tenant='{h['x-tenant']}' AND user_id='{actor}'")
        passed('Withdrawing Flow owner rights during inference rejects the late result without saving an executable task')
    finally:
        mode['block']=False;release.set();started.clear()
        stop(apps)
        stop(memory)
        mode.pop('operations',None)
