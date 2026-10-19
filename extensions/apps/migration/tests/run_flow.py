"""Saved native plans: shared record CAS/history, separate approval, grouped durable source reads and tenant isolation."""
run_id='run-'+uuid.uuid4().hex
fields={'title':{'en-GB':'Frozen source acceptance','de-DE':'Eingefrorene Quelle'},'source_id':'frozen','target':target,'domains':['products','assets']}
saved=call('/api/apps/migration/actions/save_run',{'id':run_id,'revision':0,'fields':fields},h)
assert saved['revision']==1,saved
plans=call('/api/apps/migration/actions/list_runs',{'limit':100},h)
plan=next(row for row in plans['elements'] if row['id']==run_id)
assert plan['target']==target and plan['domains']==['products','assets'],plan
call('/api/apps/migration/actions/save_run',{'id':run_id,'revision':0,'fields':fields},h,409)
call('/api/apps/migration/actions/list_runs',{'limit':100},fh,404)
# An apps.manage actor can see plans, but still cannot read personal source records after separate PII revocation.
assert any(row['id']==run_id for row in call('/api/apps/migration/actions/list_runs',{'limit':100},reader_h)['elements'])
review=inspect_source('products','frozen',job_group=run_id)
assert review['jobGroup']==run_id and review['sourceExport']['digest']==frozen_digest
linked=call('/api/apps/migration/jobs?group='+run_id,h=h)
assert len(linked['jobs'])==1 and linked['jobs'][0]['action']=='review_products',linked
assert all(j['action'].startswith('review_') for j in linked['jobs'])
assert call('/api/apps/migration/jobs?group=unrelated-run',h=h)['jobs']==[]
print('PASS saved native work plan: reload projection, CAS conflict, foreign denial, current app rights, exact grouped source evidence; saving a plan starts no import')

for malformed in ['products', [], ['products','unknown'], ['products', 1], ['products','products']]:
    call('/api/apps/migration/actions/save_run',{'id':'bad-'+uuid.uuid4().hex,'revision':0,'fields':{**fields,'domains':malformed}},h,400)
print('PASS work-plan save rejects scalar, empty, unknown, nonstring and duplicate planned domains')
