"""Repeat completed native work through real outbox/Flow/approval owners; source evidence stays private."""
import copy,json,time
from testing.runtime import stop


def verify_work_template(call,base,h,sh,main,source,original,trigger,wait_job,sql,actor,control,captured,passed,start):
    stage=sh['x-tenant']
    template={'taskId':source,'dailyLimit':1,'bindings':[
        {'step':0,'pointer':'/category/id','source':'run.key:category'},
        {'step':0,'pointer':f'/category/data/translations/{main}/name','source':'event.productId'}]}
    definition={**original,'active':True,'action':'work_proposal','workTemplate':template,'name':{main:'Repeat reviewed work'}}
    def save(value,revision=0,expected=200,headers=sh,name='repeat_work'):
        return call(base,'/api/automation/flows/'+name,{'revision':revision,'data':value},headers,expected=expected,method='PUT')
    # Inputs cannot be smuggled into general automation configuration/history.
    forged=copy.deepcopy(definition);forged['workTemplate']['steps']=[{'private':'copied evidence'}]
    save(forged,expected=400)
    save(definition,headers=h,expected=403)
    foreign=copy.deepcopy(definition);foreign['workTemplate']['taskId']='missing_source'
    save(foreign,expected=403)
    invalid=copy.deepcopy(definition);invalid['workTemplate']['bindings'][0]['pointer']='/does/not/exist'
    save(invalid,expected=400)
    invalid=copy.deepcopy(definition);invalid['workTemplate']['bindings'][0]['source']='event.revision'
    save(invalid,expected=400)
    save(definition)
    persisted=next(f for f in call(base,'/api/automation',h=sh)['flows'] if f['id']=='repeat_work')
    assert persisted['data']['workTemplate']==template,persisted
    assert 'flow_work_category' not in json.dumps(persisted)
    inference_before=len(captured)
    trigger();first=wait_job('repeat_work')
    assert first['state']=='completed',first
    repeated=first['result']['taskId']
    run=call(base,'/api/agent/runs/'+repeated,h=sh)
    assert run['state']=='ready' and run['approvalRequired'] and run['completedModelSteps']==0,run
    operation=run['preview']['proposal']['operations'][0]
    args=json.loads(operation['arguments_json'])
    target=args['category']['id']
    assert target.startswith('work_') and args['category']['data']['translations'][main]['name']=='mug',args
    assert sql(f"SELECT count(*) FROM categories WHERE tenant='{stage}' AND id='{target}'")=='0'
    assert len(captured)==inference_before
    # A second matching event cannot flood review, even before the first is approved.
    trigger();limited=wait_job('repeat_work',[first['id']])
    assert limited['state']=='failed' and 'limit' in limited['error'].lower(),limited
    assert sql(f"SELECT count(*) FROM tasks WHERE tenant='{stage}' AND proposal->'templateSource'->>'taskId'='{source}'")=='1'
    call(base,'/api/agent/tasks/'+repeated+'/apply',{'approve':True},sh)
    for _ in range(150):
        run=call(base,'/api/agent/runs/'+repeated,h=sh)
        if run['state'] not in ('queued','running'):break
        time.sleep(.1)
    assert run['state']=='ready' and not run['approvalRequired'] and run['execution']['completed']==1,run
    assert sql(f"SELECT revision FROM categories WHERE tenant='{stage}' AND id='{target}'")=='1'
    assert sql(f"SELECT count(*) FROM categories WHERE tenant='{h['x-tenant']}' AND id='{target}'")=='0'
    assert call(base,'/api/agent/tasks/'+repeated+'/apply',{'approve':True},sh)['replayed']
    passed('A completed private task becomes a reference-only Flow; event mapping prepares a new zero-inference review and personal approval writes once without changing live data')
    passed('Template validation rejects copied inputs, missing/foreign sources and wrong field types; the daily review limit blocks the next event')
    # Revoke a source permission while retaining Flow rights: neither resave nor
    # execution may launder the original task through the less-restricted Flow UI.
    rights=['assistant.use','catalog.write','catalog.read','knowledge.read','automation.read','automation.manage','environments.read','environments.manage']
    sql(f"UPDATE memberships SET role='viewer',permissions='{json.dumps(rights)}'::jsonb WHERE tenant='{h['x-tenant']}' AND user_id='{actor}'")
    try:
        save(definition,revision=1,expected=403)
        trigger()
        for _ in range(150):
            state=sql(f"SELECT state FROM flow_jobs WHERE tenant='{stage}' AND flow='repeat_work' ORDER BY event_id DESC LIMIT 1")
            if state=='failed':break
            time.sleep(.1)
        assert state=='failed',state
        assert sql(f"SELECT count(*) FROM tasks WHERE tenant='{stage}' AND proposal->'templateSource'->>'taskId'='{source}'")=='1'
    finally:
        sql(f"UPDATE memberships SET role='owner',permissions='null'::jsonb WHERE tenant='{h['x-tenant']}' AND user_id='{actor}'")
    # Stop and absent event fields are explicit failed preparations, with no task.
    jobs=[j['id'] for j in call(base,'/api/automation',h=sh)['jobs'] if j['flow']=='repeat_work']
    control(True);trigger()
    blocked=wait_job('repeat_work',jobs);assert blocked['state']=='failed',blocked
    control(False)
    definition['workTemplate']['dailyLimit']=3
    definition['workTemplate']['bindings'][1]['source']='event.documentId'
    save(definition,revision=1)
    trigger();missing=wait_job('repeat_work',jobs+[blocked['id']])
    assert missing['state']=='failed' and 'documentId' in missing['error'],missing
    assert len(captured)==inference_before
    assert sql(f"SELECT count(*) FROM tasks WHERE tenant='{stage}' AND proposal->'templateSource'->>'taskId'='{source}'")=='1'
    definition['workTemplate']['dailyLimit']=2
    definition['workTemplate']['bindings'][1]['source']='event.productId'
    save(definition,revision=2)
    ignored=[j['id'] for j in call(base,'/api/automation',h=sh)['jobs'] if j['flow']=='repeat_work']
    other,_=start('app-worker')
    try:
        trigger();trigger()
        one=wait_job('repeat_work',ignored)
        two=wait_job('repeat_work',ignored+[one['id']])
        assert sorted([one['state'],two['state']])==['completed','failed'],(one,two)
        assert sql(f"SELECT count(*) FROM tasks WHERE tenant='{stage}' AND proposal->'templateSource'->>'taskId'='{source}'")=='2'
    finally:stop(other)
    definition['active']=False;save(definition,revision=3)
    passed('Two real Flow workers cannot exceed the remaining daily slot; the extra event creates no proposal or native write')
    passed('Source-right withdrawal, emergency stop and missing event values deny reuse before any task or mutation is produced')
