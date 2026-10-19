"""Real native job keyset/correlation pagination must retain old completed jobs and tenant isolation."""
created=[]
for i in range(105):
    jid=call(prefix+'/actions/import',{**intent,'jobGroup':'saved-run' if i%2==0 else 'other-run'},{**h,'Idempotency-Key':'page-job-'+str(i)})['jobId']
    entry=call(prefix+'/jobs/'+jid,h=h)
    call(prefix+'/jobs/'+jid,{'operation':'cancel','revision':entry['revision']},h)
    created.append(jid)
page=call(prefix+'/jobs?limit=7&group=saved-run',h=h)
assert len(page['jobs'])==7 and page['hasMore'] and page['nextCursor'],page
seen=[]
while True:
    seen.extend(row['id'] for row in page['jobs'])
    if not page['hasMore']:break
    page=call(prefix+'/jobs?limit=7&group=saved-run&after='+page['nextCursor'],h=h)
assert len(seen)==53 and len(set(seen))==53 and set(seen)==set(created[::2]),seen
call(prefix+'/jobs?limit=0',h=h,status=400)
call(prefix+'/jobs?limit=101',h=h,status=400)
call(prefix+'/jobs?group=',h=h,status=400)
call('/api/apps',consent({'manifest':m}),fh)
call(prefix+'/jobs/'+created[0],h=fh,status=404)
assert call(prefix+'/jobs?group=unknown',h=h)['jobs']==[]
print('PASS native 105-job history: exact scoped keyset pages, disjoint run correlation, bounds and foreign-app denial')

first=call(prefix+'/jobs?limit=7&group=saved-run',h=h)
anchor=first['nextCursor']; entry=call(prefix+'/jobs/'+anchor,h=h)
call(prefix+'/jobs/'+anchor,{'operation':'archive','revision':entry['revision']},h)
call(prefix+'/jobs?limit=7&group=saved-run&after='+anchor,h=h,status=409)
assert call(prefix+'/jobs?limit=7&group=saved-run',h=h)['hasMore']
print('PASS archived history cursor gives explicit restart conflict, never false terminal completion')

call(prefix+'/jobs?after='+created[0],h=fh,status=409)
