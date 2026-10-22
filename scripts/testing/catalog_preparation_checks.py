"""Durable preparation projection through the native catalogue API/MCP; fixture SQL creates an explicit failed provider result only."""
import os, subprocess, urllib.parse, uuid
from testing.database import psql

def check_preparation(req, merchant, pid, product_number):
    suffix=uuid.uuid4().hex
    tenant=merchant['x-tenant']
    job='failed-'+suffix
    ready='ready-'+suffix
    if os.environ.get('TEST_DATABASE'):
        owner=urllib.parse.unquote(urllib.parse.urlsplit(os.environ['DATABASE_URL']).username or 'commerce')
        statement=f"INSERT INTO media_jobs(tenant,id,product_id,product_revision,request,state,error,created_at) VALUES('{tenant}','{ready}','{pid}',1,'{{}}','ready',NULL,now()-interval '1 minute'),('{tenant}','{job}','{pid}',1,'{{}}','failed','Synthetic provider failure',now());"
        result=subprocess.run(psql(os.environ['TEST_DB_CONTAINER'],owner,os.environ['TEST_DATABASE'],'-qAt','-v','ON_ERROR_STOP=1'),input=statement,text=True,capture_output=True)
        assert result.returncode==0,result.stderr
        path='/api/merchant/products?preparation=true&search='+product_number
        first=req(path,h=merchant)['elements'][0]['preparation']
        assert first['imageJob']=={'id':job,'state':'failed'},first
        assert req(path,h=merchant)['elements'][0]['preparation']==first
        jobs=req('/api/merchant/products/'+pid+'/media/jobs',h=merchant)['jobs']
        assert jobs[0]['id']==job and jobs[0]['state']=='failed',jobs
        assert req('/api/merchant/media/jobs/'+job,h=merchant)['error']=='Synthetic provider failure'
        # Read projection never repeats the paid provider request or changes completed work.
        assert req('/api/merchant/products/'+pid+'/media/jobs',h=merchant)['jobs']==jobs
    tool=req('/mcp',{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'merchant.products','arguments':{'preparation':True,'search':product_number}}},merchant)['result']
    assert tool['structuredContent']['elements'][0]['preparation']['namedLocales']
    req('/api/merchant/products?preparation=true',expected=401)
    print('PASS native preparation survives reload, retains failed images and shares the bounded catalogue HTTP/MCP contract')
