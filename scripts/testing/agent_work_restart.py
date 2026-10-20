"""Kill the actual approved-work Rust worker during its second managed save; checkpoint and record commit together."""
import json,time
from testing.app_approval import consent
from testing.runtime import ROOT


def verify_work_restart(call,base,h,mode,sql,worker,start,passed,account):
    m=json.loads((ROOT/'extensions/apps/ontology-care/manifest.json').read_text());m['id']='work_restart';m['views']=[];m['surfaces']=[];m['apiRoutes']=[]
    m['intelligence']['tools'].append('save_guides')
    call(base,'/api/apps',consent({'manifest':m}),h)
    stage=call(base,'/api/environments',{'name':'Restart work fixture'},h)['id'];sh={**h,'x-tenant':stage}
    steps=[{'name':'app.work_restart.save_guides','label':'Save guide '+str(n),'arguments_json':json.dumps({'id':'work_'+str(n),'fields':{'product_id':'mug','title':{'en':'Guide '+str(n)}}})} for n in (1,2)]
    mode.update(block=False,operations=steps)
    created=call(base,'/api/agent/chat',{'message':'Save two private care guides','inference':{'provider':'openai'}},sh);task=created['messages'][-1]['data']['taskId']
    # A new personal login can approve the saved actor's work; an expired old credential is not reused.
    call(base,'/api/auth/logout',{},h)
    session=call(base,'/api/auth/login',{'email':account['user']['email'],'password':'Synthetic-agent-2026!'})
    h['Authorization']='Bearer '+session['token'];sh['Authorization']=h['Authorization']
    sql("CREATE FUNCTION work_restart_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.app='work_restart' AND NEW.id='work_2' THEN PERFORM pg_sleep(4); END IF; RETURN NEW; END $$; CREATE TRIGGER work_restart_pause BEFORE INSERT ON app_records FOR EACH ROW EXECUTE FUNCTION work_restart_pause()")
    call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh)
    for _ in range(120):
        pending=sql(f"SELECT coalesce(run_pending,'') FROM tasks WHERE tenant='{stage}' AND id='{task}'")
        if pending=='operation-1':break
        time.sleep(.05)
    assert pending=='operation-1',pending
    worker.kill();worker.wait(timeout=10)
    sql(f"UPDATE tasks SET run_until=now()-interval '1 second' WHERE tenant='{stage}' AND id='{task}'")
    replacement,_=start('agent-worker')
    for _ in range(120):
        status=call(base,'/api/agent/runs/'+task,h=sh)
        if status['state']=='uncertain':break
        time.sleep(.1)
    assert status['state']=='uncertain' and status['execution']['completed']==1,status
    assert sql(f"SELECT count(*) FROM app_records WHERE tenant='{stage}' AND app='work_restart' AND id='work_2'")=='0'
    sql('DROP TRIGGER work_restart_pause ON app_records; DROP FUNCTION work_restart_pause()')
    call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh,409)
    call(base,'/api/agent/runs/'+task+'/resume',{'revision':status['revision'],'approve':True},sh)
    for _ in range(120):
        status=call(base,'/api/agent/runs/'+task,h=sh)
        if status['state']=='ready':break
        time.sleep(.1)
    assert status['state']=='ready' and status['execution']['completed']==2,status
    assert sql(f"SELECT revision FROM app_records WHERE tenant='{stage}' AND app='work_restart' AND id='work_1'")=='1'
    mode.pop('operations')
    passed('Killed approved-work worker rolls back its unreceipted save; explicit restart preserves step one and completes step two without duplication')
    return replacement
