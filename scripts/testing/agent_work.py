"""An actual reviewed model plan writes two private records once through the native task worker."""
import json,time,copy


def verify_agent_work(call, behavior, headers, passed):
    stage=call('/api/environments',{'name':'Agent work regression'},headers)['id']
    scoped={**headers,'x-tenant':stage}
    operations=[{'name':'app.planner_ontology.care_advice','label':'Create private care guidance','arguments_json':json.dumps({'id':f'agent_guide_{n}','fields':{'product_id':'mug','title':{'en':f'Private agent guide {n}'}}})} for n in range(2)]
    # Use the declared save action rather than the read tool name.
    packages=call('/api/apps',headers=scoped)['packages']
    package=next(p for p in packages if p['id']=='planner_ontology')
    save=next(a['name'] for a in package['manifest']['actions'] if a['handler']=='save')
    for operation in operations: operation['name']='app.planner_ontology.'+save
    behavior.update(mode='work-plan',operations=operations)
    chat=call('/api/agent/chat',{'message':'Create the two care guidance records in this private workspace','inference':{'provider':'openai'}},scoped)
    data=chat['messages'][-1]['data']; task=data['taskId']
    assert len(data['preview']['proposal'].get('operations',[]))==2,data
    assert not any(r['id'].startswith('agent_guide_') for r in call('/api/apps/planner_ontology/entities/guides',headers=scoped)['elements'])
    approved=call('/api/agent/tasks/'+task+'/apply',{'approve':True},scoped)
    assert approved.get('queued') and not approved.get('applied'),approved
    for _ in range(100):
        status=call('/api/agent/runs/'+task,headers=scoped)
        if status['state'] not in ('queued','running'):break
        time.sleep(.1)
    assert status['state']=='ready' and status.get('execution',{}).get('completed')==2,status
    assert len([r for r in call('/api/apps/planner_ontology/entities/guides',headers=scoped)['elements'] if r['id'].startswith('agent_guide_')])==2
    assert call('/api/agent/tasks/'+task+'/apply',{'approve':True},scoped)['replayed']
    assert not any(r['id'].startswith('agent_guide_') for r in call('/api/apps/planner_ontology/entities/guides',headers=headers)['elements'])
    passed('One exact approval executes two persisted native app steps, replay is harmless and live records stay unchanged')
    # A newer in-flight turn must reserve its conversation and reject old approval cleanly.
    operations[0]['arguments_json']=json.dumps({'id':'conversation_guide','fields':{'product_id':'mug','title':{'en':'Reviewed conversation guide'}}})
    behavior.update(operations=operations[:1])
    original=call('/api/agent/chat',{'message':'Prepare conversation-scoped work','inference':{'provider':'openai'}},scoped)
    original_task=original['messages'][-1]['data']['taskId']
    behavior.update(mode='slow')
    newer=call('/api/agent/chat',{'conversationId':original['conversationId'],'message':'A newer active turn','background':True,'inference':{'provider':'openai'}},scoped)
    call('/api/agent/tasks/'+original_task+'/apply',{'approve':True},scoped,expected=409)
    state=call('/api/agent/runs/'+newer['run']['taskId'],headers=scoped)
    call('/api/agent/runs/'+newer['run']['taskId']+'/cancel',{'approve':True,'revision':state['revision']},scoped)
    behavior.update(mode='work-plan')
    # A changed managed target invalidates the exact reviewed work rather than rebasing silently.
    operations[0]['arguments_json']=json.dumps({'id':'stale_guide','fields':{'product_id':'mug','title':{'en':'Reviewed'}}})
    behavior.update(operations=operations[:1])
    stale=call('/api/agent/chat',{'message':'Prepare one exact private guide','inference':{'provider':'openai'}},scoped)['messages'][-1]['data']['taskId']
    call('/api/apps/planner_ontology/entities/guides',{'id':'stale_guide','fields':{'product_id':'mug','title':{'en':'Human edit'}}},scoped)
    call('/api/agent/tasks/'+stale+'/apply',{'approve':True},scoped,expected=409)
    assert 'Human edit' in json.dumps(next(r for r in call('/api/apps/planner_ontology/entities/guides',headers=scoped)['elements'] if r['id']=='stale_guide'))
    behavior.update(operations=[{'name':'merchant.apply','label':'Forbidden release','arguments_json':'{}'}])
    refused=call('/api/agent/chat',{'message':'Try forbidden work','inference':{'provider':'openai'}},scoped)
    assert refused['run']['state']=='failed' and refused['run']['error']['status']==400,refused
    behavior.update(operations=operations[:1])
    refused=call('/api/agent/chat',{'message':'Do not configure live without private review','inference':{'provider':'openai'}},headers)
    assert refused['run']['state']=='failed' and refused['run']['error']['status']==400,refused
    passed('Changed targets reject stale approval; unadmitted and live configuration plans are denied')
    optout=copy.deepcopy(package['manifest']);optout['id']='work_optout'
    for action in optout['actions']:
        if action['name']==save:action['mcp']=False
    call('/api/apps',{'manifest':optout},scoped)
    behavior.update(operations=[{**operations[0],'name':'app.work_optout.'+save}])
    refused=call('/api/agent/chat',{'message':'Try agent-opted-out app save','inference':{'provider':'openai'}},scoped)
    assert refused['run']['state']=='failed' and refused['run']['error']['status']==400,refused
    assert not call('/api/apps/work_optout/entities/guides',headers=scoped)['elements']
    passed('Explicit app agent opt-out is enforced at work binding, beyond hiding discovery metadata')
    behavior.update(mode='view-plan',view={'entity':'orders','criteria':{'customer':'Synthetic Alex','state':'open'}})
    view=call('/api/agent/chat',{'message':'Show open orders for Synthetic Alex','workspaceContext':{'view':'orders'},'inference':{'provider':'openai'}},headers)['messages'][-1]['data']['preview']
    assert view['proposal']['view']['criteria']['customer']=='Synthetic Alex' and view['workspaceContext']['view']=='orders',view
    behavior['view']['criteria']['tenant']='atelier'
    refused=call('/api/agent/chat',{'message':'Forged filters','inference':{'provider':'openai'}},headers)
    assert refused['run']['state']=='failed' and refused['run']['error']['status']==400,refused
    passed('Agent views use validated native filters, preserve origin and reject forged tenant criteria')
    behavior.update(mode='normal')
