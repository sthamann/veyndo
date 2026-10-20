"""Explicit versioned merchant guidance reaches actual model input and is withdrawn by the native archive path."""
import uuid,os,subprocess
from testing.database import psql


def verify_guidance(call, captured, behavior, passed):
    suffix=uuid.uuid4().hex[:10]
    account=call('/api/auth/register',{'name':'Guidance fixture','email':suffix+'@example.test','password':'Synthetic-guidance-2026!','workspaceId':'guidance-'+suffix},headers={})
    h={'Authorization':'Bearer '+account['token'],'x-tenant':account['workspace']}
    doc=call('/api/knowledge/documents',{'kind':'guidance','title':'Merchant preferences','content':'MerchantGuidanceMarker: describe this brand in a calm precise voice. Never claim environmental certifications without evidence.','locale':'en-GB','translations':{'de-DE':{'title':'Händlervorgaben'}}},headers=h)
    behavior.update(mode='work-plan',operations=[])
    result=call('/api/agent/chat',{'message':'Describe our current collection','inference':{'provider':'openai'}},headers={**h,'x-commerce-locale':'de-DE'})['messages'][-1]['data']['preview']
    assert any(s.get('documentId')==doc['id'] for s in result['documentSources']),result
    assert 'MerchantGuidanceMarker' in str(captured[-1][2])
    integration=call('/api/workspace/integrations',{'name':'Source editor integration','expiresInDays':1,'permissions':['knowledge.read','knowledge.write']},headers=h)
    delegated={**h,'Authorization':'Bearer '+integration['key']}
    call('/api/knowledge/documents/'+doc['id'],{'revision':1,'kind':'document','title':'Demoted preference','content':'Unapproved different preference','locale':'en-GB'},headers=delegated,method='PATCH',expected=403)
    assert call('/api/knowledge/documents/'+doc['id'],headers=h)['kind']=='guidance'
    call('/api/knowledge/documents/'+doc['id'],{'visibility':'public','approve':True,'revision':1},headers=h,method='PUT',expected=409)
    call('/api/knowledge/documents/'+doc['id']+'/lifecycle',{'archived':True,'approve':True,'revision':1},headers=h)
    result=call('/api/agent/chat',{'message':'Describe our current collection again','inference':{'provider':'openai'}},headers=h)['messages'][-1]['data']['preview']
    assert not any(s.get('documentId')==doc['id'] for s in result['documentSources'])
    assert 'MerchantGuidanceMarker' not in str(captured[-1][2])
    def sql(statement):
        subprocess.run(psql(os.environ['DB_CONTAINER'],'commerce',os.environ['TEST_DATABASE'],'-XqAt','-v','ON_ERROR_STOP=1'),input="BEGIN; SELECT set_config('rac.system','on',true); "+statement+"; COMMIT;",text=True,check=True,stdout=subprocess.DEVNULL)
    tenant=account['workspace'];actor=account['user']['id']
    sql(f"UPDATE products SET stock=0 WHERE tenant='{tenant}' AND id='mug'")
    assert any(i.get('entity')=='mug' for i in call('/api/studio/work',headers=h)['items'])
    sql(f"UPDATE products SET stock=10 WHERE tenant='{tenant}' AND id='mug'")
    assert not any(i.get('entity')=='mug' for i in call('/api/studio/work',headers=h)['items'])
    sql(f"UPDATE memberships SET role='admin',permissions='[\"knowledge.read\"]'::jsonb WHERE tenant='{tenant}' AND user_id='{actor}'")
    assert call('/api/studio/work',headers=h)['items']==[]
    passed('Actual work reflects native stock, disappears after resolution and hides all counts/IDs after rights narrow')
    passed('Personal merchant guidance reaches the actual model request with provenance; publication is denied and archiving withdraws it')
    behavior.update(mode='normal')
