"""Kill the actual approved-work Rust worker during its second managed save; checkpoint and record commit together."""
import json,os,time
from testing.app_approval import consent
from testing.runtime import ROOT


def verify_native_work(call,base,h,sh,mode,sql,passed):
    main=call(base,'/api/merchant/commerce',h=sh)['data'].get('mainLocale','en')
    malformed={'name':'merchant.category.create','label':'Malformed native shape','arguments_json':json.dumps({'category':{'id':'bad_category','name':'Wrong shape','translations':{main:{'name':'Wrong shape'}}}})}
    mode.update(block=False,operations=[malformed])
    refused=call(base,'/api/agent/chat',{'message':'Reject invalid native arguments before review','inference':{'provider':'openai'}},sh)
    assert refused['messages'][-1]['data'].get('error') and not refused['messages'][-1]['data'].get('taskId'),refused
    assert sql(f"SELECT count(*) FROM categories WHERE tenant='{sh['x-tenant']}' AND id='bad_category'")=='0'
    steps=[{'name':'merchant.category.create','label':'Create private category '+str(n),'arguments_json':json.dumps({'category':{'id':'native_work_'+str(n),'position':n,'data':{'active':True,'visible':False,'type':'folder','translations':{main:{'name':'Native work '+str(n)}}}}})} for n in (1,2)]
    mode.update(block=False,operations=steps)
    created=call(base,'/api/agent/chat',{'message':'Prepare two native private categories','inference':{'provider':'openai'}},sh)
    task=created['messages'][-1]['data']['taskId']
    call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh)
    for _ in range(120):
        status=call(base,'/api/agent/runs/'+task,h=sh)
        if status['state'] not in ('queued','running'):break
        time.sleep(.1)
    assert status['state']=='ready' and status['execution']['completed']==2,status
    assert sql(f"SELECT count(*) FROM categories WHERE tenant='{sh['x-tenant']}' AND id IN ('native_work_1','native_work_2')")=='2'
    assert sql(f"SELECT count(*) FROM categories WHERE tenant='{h['x-tenant']}' AND id IN ('native_work_1','native_work_2')")=='0'
    assert call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh)['replayed']
    assert sql(f"SELECT sum(revision) FROM categories WHERE tenant='{sh['x-tenant']}' AND id IN ('native_work_1','native_work_2')")=='2'
    mode.update(operations=[{'name':'merchant.category.save','label':'Edit reviewed category','arguments_json':json.dumps({'id':'native_work_1','category':{'revision':1,'position':1,'data':{'active':True,'visible':False,'type':'folder','translations':{main:{'name':'Reviewed native edit'}}}}})}])
    edited=call(base,'/api/agent/chat',{'message':'Edit a private category at its original revision','inference':{'provider':'openai'}},sh)
    edit_task=edited['messages'][-1]['data']['taskId']
    call(base,'/api/agent/tasks/'+edit_task+'/apply',{'approve':True},sh)
    for _ in range(120):
        status=call(base,'/api/agent/runs/'+edit_task,h=sh)
        if status['state'] not in ('queued','running'):break
        time.sleep(.1)
    assert status['state']=='ready' and status['execution']['completed']==1,status
    assert sql(f"SELECT revision FROM categories WHERE tenant='{sh['x-tenant']}' AND id='native_work_1'")=='2'
    passed('Native private work preserves reviewed category IDs and runs once through a one-backend transaction pool without nested connection waits')


def verify_native_cancel(call,base,sh,mode,sql,passed):
    # A single database backend necessarily serializes cancellation behind the
    # domain write. The ordinary multi-backend fixture exercises the real race.
    if os.environ.get('TEST_TRANSACTION_POOLING')=='1':return
    main=call(base,'/api/merchant/commerce',h=sh)['data'].get('mainLocale','en')
    steps=[{'name':'merchant.category.create','label':'Native cancellation '+str(n),'arguments_json':json.dumps({'category':{'id':'cancel_work_'+str(n),'position':n,'data':{'active':True,'visible':False,'type':'folder','translations':{main:{'name':'Cancellation '+str(n)}}}}})} for n in (1,2)]
    mode.update(block=False,operations=steps)
    created=call(base,'/api/agent/chat',{'message':'Prepare two categories for cancellation test','inference':{'provider':'openai'}},sh)
    task=created['messages'][-1]['data']['taskId'];stage=sh['x-tenant']
    sql("CREATE FUNCTION native_work_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='cancel_work_1' THEN PERFORM pg_sleep(4); END IF; RETURN NEW; END $$; CREATE TRIGGER native_work_pause BEFORE INSERT ON categories FOR EACH ROW EXECUTE FUNCTION native_work_pause()")
    call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh)
    for _ in range(120):
        paused=sql("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='PgSleep' AND query LIKE '%INSERT INTO categories%')")
        if paused=='t':break
        time.sleep(.05)
    assert paused=='t','Native category write never reached its paused transaction'
    status=call(base,'/api/agent/runs/'+task,h=sh)
    call(base,'/api/agent/runs/'+task+'/cancel',{'revision':status['revision'],'approve':True},sh)
    for _ in range(120):
        status=call(base,'/api/agent/runs/'+task,h=sh)
        if status['execution']['completed']==1:break
        time.sleep(.1)
    assert status['state']=='cancelled' and status['execution']['completed']==1,status
    assert sql(f"SELECT count(*) FROM categories WHERE tenant='{stage}' AND id='cancel_work_1'")=='1'
    assert sql(f"SELECT count(*) FROM categories WHERE tenant='{stage}' AND id='cancel_work_2'")=='0'
    call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh,409)
    sql('DROP TRIGGER native_work_pause ON categories; DROP FUNCTION native_work_pause()')
    passed('Cancellation during an admitted native write keeps its completed receipt visible without reviving the task or starting step two')


def verify_native_expiry(call,base,sh,mode,sql,passed):
    main=call(base,'/api/merchant/commerce',h=sh)['data'].get('mainLocale','en')
    steps=[{'name':'merchant.category.create','label':'Native expiry '+str(n),'arguments_json':json.dumps({'category':{'id':'expiry_work_'+str(n),'position':n,'data':{'active':True,'visible':False,'type':'folder','translations':{main:{'name':'Expiry '+str(n)}}}}})} for n in (1,2)]
    mode.update(block=False,operations=steps)
    created=call(base,'/api/agent/chat',{'message':'Prepare two categories for expiry test','inference':{'provider':'openai'}},sh)
    task=created['messages'][-1]['data']['taskId'];stage=sh['x-tenant']
    sql("CREATE FUNCTION native_expiry_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='expiry_work_1' THEN PERFORM pg_sleep(2); END IF; RETURN NEW; END $$; CREATE TRIGGER native_expiry_pause BEFORE INSERT ON categories FOR EACH ROW EXECUTE FUNCTION native_expiry_pause()")
    call(base,'/api/agent/tasks/'+task+'/apply',{'approve':True},sh)
    for _ in range(120):
        paused=sql("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='PgSleep' AND query LIKE '%INSERT INTO categories%')")
        if paused=='t':break
        time.sleep(.05)
    assert paused=='t','Native expiry write never reached its paused transaction'
    # Advance only this disposable task's lease. The second native lane may sweep
    # it before the first returns; either ordering must retain the known outcome.
    sql(f"UPDATE tasks SET run_until=now()-interval '1 second' WHERE tenant='{stage}' AND id='{task}'")
    for _ in range(120):
        status=call(base,'/api/agent/runs/'+task,h=sh)
        if (status['state']=='uncertain' and status['execution']['completed']==1) or status['state']=='ready':break
        time.sleep(.1)
    if status['state']=='uncertain':
        assert status['execution']['completed']==1,status
        call(base,'/api/agent/runs/'+task+'/resume',{'revision':status['revision'],'approve':True},sh)
        for _ in range(120):
            status=call(base,'/api/agent/runs/'+task,h=sh)
            if status['state']=='ready':break
            time.sleep(.1)
    assert status['state']=='ready' and status['execution']['completed']==2,status
    assert sql(f"SELECT sum(revision) FROM categories WHERE tenant='{stage}' AND id IN ('expiry_work_1','expiry_work_2')")=='2'
    sql('DROP TRIGGER native_expiry_pause ON categories; DROP FUNCTION native_expiry_pause()')
    passed('A native write finishing after lease expiry retains its receipt without renewing the expired lease; recovery does not duplicate the completed category')


def verify_work_restart(call,base,h,mode,sql,worker,start,passed,account):
    m=json.loads((ROOT/'extensions/apps/ontology-care/manifest.json').read_text());m['id']='work_restart';m['views']=[];m['surfaces']=[];m['apiRoutes']=[]
    m['intelligence']['tools'].append('save_guides')
    call(base,'/api/apps',consent({'manifest':m}),h)
    stage=call(base,'/api/environments',{'name':'Restart work fixture'},h)['id'];sh={**h,'x-tenant':stage}
    verify_native_work(call,base,h,sh,mode,sql,passed)
    verify_native_cancel(call,base,sh,mode,sql,passed)
    verify_native_expiry(call,base,sh,mode,sql,passed)
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
