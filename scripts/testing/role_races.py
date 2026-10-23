"""Force real HTTP delegation to wait behind the same PostgreSQL lifecycle lock as role edits."""
import concurrent.futures
import os
import subprocess
import time
from urllib.parse import urlsplit
from testing.database import psql


def check_role_races(request, register, headers):
    a = register('role-race'); h = headers(a)
    def member(role, label):
        invite = request('/api/workspace/invitations', {'role': role, 'email': label+'-'+a['workspace']+'@example.test'}, h)
        return request('/api/auth/accept', {'name': label, 'password': 'Role-fixture-password-2026!', 'invitationToken': invite['token']})
    second = member('owner', 'other-owner'); other = headers(second)
    target = member('viewer', 'race-target')
    url = urlsplit(os.environ['DATABASE_URL'])
    command = psql(os.environ.get('TEST_DB_CONTAINER', 'veyndo-postgres-1'), url.username or 'commerce', url.path[1:], '-Atq', '-v', 'ON_ERROR_STOP=1')
    def sql(value):
        return subprocess.check_output(command, input=value, text=True).strip()
    # Fixture identifiers come only from the synthetic registry and have no SQL metacharacters.
    tenant = a['workspace']; actor = a['user']['id']
    assert all(c.isalnum() or c in '-_' for c in tenant+actor)
    def pending_demotion(operation):
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        try:
            # Block the handlers' FOR UPDATE, but let worker foreign-key checks proceed.
            process.stdin.write(f"BEGIN; SELECT id FROM tenants WHERE id='{tenant}' FOR NO KEY UPDATE; SELECT 'LOCKED:' || pg_backend_pid();\n"); process.stdin.flush()
            while not (line := process.stdout.readline().strip()).startswith('LOCKED:'):
                assert process.poll() is None, 'Fixture lock failed'
            locker = int(line.split(':')[1])
            # Foreign-key checks must remain runnable while the role mutation waits.
            # Otherwise a worker can occupy the pooler's only backend before HTTP arrives.
            sql(f"BEGIN; SET LOCAL lock_timeout='500ms'; SELECT id FROM tenants WHERE id='{tenant}' FOR KEY SHARE; ROLLBACK;")
            future = pool.submit(operation)
            for _ in range(100):
                if sql(f"SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND {locker}=ANY(pg_blocking_pids(pid)) AND query LIKE 'SELECT id FROM tenants%'") != '0':
                    break
                if future.done():
                    future.result()  # Preserve a real HTTP failure rather than mask it as a lock timeout.
                    raise AssertionError('HTTP delegation completed before the forced demotion')
                time.sleep(.02)
            else:
                blockers = sql(f"SELECT state,wait_event_type,wait_event,left(query,200) FROM pg_stat_activity WHERE {locker}=ANY(pg_blocking_pids(pid))")
                raise AssertionError('HTTP delegation never reached its lifecycle lock: '+blockers)
            process.stdin.write(f"UPDATE memberships SET role='admin',permissions='null'::jsonb WHERE tenant='{tenant}' AND user_id='{actor}'; COMMIT;\\q\n"); process.stdin.flush()
            process.wait(timeout=10)
            future.result(timeout=30)
        finally:
            # Release the DB barrier before joining a failed/unfinished HTTP request.
            if process.poll() is None: process.kill(); process.wait()
            pool.shutdown(wait=True)
        request('/api/workspace/members/'+actor, {'role':'owner','active':True,'permissions':None}, other, 'PUT')
    pending_demotion(lambda: request('/api/workspace/members/'+target['user']['id'], {'role':'owner','active':True,'permissions':None}, h, 'PUT', 403))
    pending_demotion(lambda: request('/api/workspace/invitations', {'role':'owner','email':'denied-'+tenant+'@example.test'}, h, expected=403))
    assert sql(f"SELECT count(*) FROM user_invites WHERE tenant='{tenant}' AND email='denied-{tenant}@example.test'") == '0'
    invite = request('/api/workspace/invitations', {'role':'owner','email':'accept-'+tenant+'@example.test'}, h)
    pending_demotion(lambda: request('/api/auth/accept', {'name':'Blocked owner','password':'Role-fixture-password-2026!','invitationToken':invite['token']}, expected=403))
    assert sql(f"SELECT count(*) FROM user_invites WHERE tenant='{tenant}' AND email='accept-{tenant}@example.test' AND redeemed_at IS NULL") == '1'
    assert next(m for m in request('/api/workspace/members', h=other)['members'] if m['id']==target['user']['id'])['role']=='viewer'
    print('PASS forced concurrent owner demotion blocks stale promotion, invitation and acceptance')
