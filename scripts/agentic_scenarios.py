#!/usr/bin/env python3
"""Customer agents use the native isolated shop, cart and checkout; only inference is synthetic."""
import json
import os
import socket
import threading
import time
import urllib.error
import urllib.request
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from testing.runtime import ROOT, serve, stop
from testing.database import psql
import subprocess

env = dict(os.environ)
calls = []
mode = {'invalid': False, 'barrier': None, 'multi': False, 'hold': None, 'holdCheckout': False, 'entered': threading.Event()}


class Model(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        assert body['instructions'].startswith('[prompt:customer-scenario@1]')
        context = json.loads(body['input'])
        assert 'token' not in json.dumps(context)
        assert 'budgetMinor' not in context['profile'] and context['profile']['budgetCurrency'] == 'EUR'
        calls.append(context)
        if mode['hold'] and (not mode['holdCheckout'] or context['steps']):
            mode['entered'].set()
            mode['hold'].wait(timeout=10)
        if mode['barrier'] and not context['steps']:
            mode['barrier'].wait(timeout=5)
        action = 'add' if not context['steps'] else 'checkout'
        if mode['invalid']:
            action = 'merchant.product.save'
        value = dict(action=action, productId='lamp', quantity=1, query='', reason='Synthetic journey fixture')
        if mode['multi']:
            value['action'] = 'add' if len(context['steps']) < 2 else 'checkout'
            value['productId'] = 'desk' if len(context['steps']) == 1 else 'lamp'
        answer = {'status': 'completed', 'output': [{'type': 'message', 'content': [{'type': 'output_text', 'text': json.dumps(value)}]}], 'usage': {'input_tokens': 10, 'output_tokens': 20}}
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(answer).encode())


provider = ThreadingHTTPServer(('127.0.0.1', 0), Model)
threading.Thread(target=provider.serve_forever, daemon=True).start()
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0))
    base = f'http://127.0.0.1:{probe.getsockname()[1]}'
env.update(DB_POOL_MAX='4' if env.get('DATABASE_TENANT_URL') else '2', DB_POOL_MIN='0', OPENAI_API_KEY='synthetic-scenario-provider', OPENAI_BASE_URL=f'http://127.0.0.1:{provider.server_address[1]}/v1', PROCESS_ROLE='all', BIND_ADDR=base.removeprefix('http://'), BOOTSTRAP_MODE='serve')


def call(path, body=None, headers=None, expected=200, method=None):
    request = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json', **(headers or {})}, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status, value = response.status, json.load(response)
    except urllib.error.HTTPError as error:
        status, value = error.code, json.load(error)
    assert status == expected, (path, status, expected, value)
    return value


def sql(statement):
    return subprocess.check_output(psql(env['DB_CONTAINER'], 'commerce', env['TEST_DATABASE'], '-XqAt', '-v', 'ON_ERROR_STOP=1'), input="BEGIN; SELECT set_config('rac.system','on',true); " + statement + '; COMMIT;', text=True).strip().splitlines()[-1]


def wait(group, headers):
    for _ in range(200):
        report = call('/api/agent/scenarios/' + group, headers=headers)
        if all(run['state'] not in ('queued', 'running') for run in report['runs']):
            return report
        time.sleep(.1)
    raise AssertionError(report)


with (ROOT / 'artifacts/scenarios.log').open('w') as log:
    server = serve(env, base, log)
    try:
        suffix = uuid.uuid4().hex[:12]
        account = call('/api/auth/register', {'name': 'Scenario tester', 'email': suffix + '@example.test', 'password': 'Synthetic-Scenario-2026!', 'workspaceId': 'scenario-' + suffix})
        actor = account['user']['id']
        sql(f"INSERT INTO memberships(tenant,user_id,role) VALUES('workshop','{actor}','owner')")
        live = {'Authorization': 'Bearer ' + account['token'], 'x-tenant': 'workshop'}
        # The signed-runtime acceptance previously tests a deliberately exhausted
        # shop quota. Give this isolated fixture its explicit bounded allowance.
        sql("INSERT INTO tenant_resource_limits(tenant,daily_ai) VALUES('workshop',1000) ON CONFLICT(tenant) DO UPDATE SET daily_ai=1000")
        stage = call('/api/environments', {'name': 'Scenario isolated shop'}, live)['id']
        headers = {**live, 'x-tenant': stage}
        listing = call('/api/agent/scenarios', headers=headers)
        sample = listing['configuration']['catalogue']
        assert 0 < len(sample) <= 12 and not calls, listing
        assert all(set(p) == {'id','name','priceMinor','stock'} and 0 < p['priceMinor'] <= 100000000 for p in sample)
        public_sample = call('/store-api/product', {}, headers)['elements']
        by_id = {p['id']: p for p in public_sample}
        from decimal import Decimal, ROUND_HALF_UP
        for product in sample:
            source = by_id[product['id']]
            assert product['name'] == source['name'] and product['stock'] == source['stock']
            assert product['priceMinor'] == int((Decimal(str(source['price'])) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        narrowed = {'id':'scenario_only_lamp','revision':0,'data':{'name':{'en-GB':'Lamp only'},'kind':'storefront','active':True,'visibility':'public','locales':['fr-FR'],'productIds':['lamp']}}
        call('/api/automation/channels/scenario_only_lamp', {'revision':0,'data':narrowed['data']}, headers, method='PUT')
        scoped = {**headers, 'sw-sales-channel-id':'scenario_only_lamp'}
        channel_sample = call('/api/agent/scenarios', headers=scoped)['configuration']['catalogue']
        assert [p['id'] for p in channel_sample] == ['lamp'], channel_sample
        localized = call('/store-api/product', {}, {**scoped, 'x-commerce-locale':'fr-FR'})['elements'][0]
        assert channel_sample[0]['name'] == localized['name']
        mcp = call('/mcp', {'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'merchant.scenario.list','arguments':{}}}, scoped)
        assert mcp['result']['structuredContent']['configuration']['catalogue'] == channel_sample, mcp
        assert not calls, 'Profile suggestions must not create an inference request or customer task'
        print('PASS native channel-only product samples, exact prices, HTTP/MCP parity and no extra inference', flush=True)
        body = {'requestId': suffix, 'title': 'Lamp purchase', 'instruction': 'Buy one lamp within your budget.', 'inference': {'provider': 'openai'}, 'profiles': [{'id': 'budget', 'name': 'Budget shopper', 'goal': 'Buy a lamp', 'budgetMinor': 100000, 'locale': 'en-GB', 'country': 'DE'}]}
        call('/api/agent/scenarios', body, live, 409)
        before = sql("SELECT jsonb_build_array((SELECT count(*) FROM orders WHERE tenant='workshop'),(SELECT stock FROM products WHERE tenant='workshop' AND id='lamp'))::text")
        started = call('/api/agent/scenarios', body, headers)
        replay = call('/api/agent/scenarios', body, headers)
        assert replay['runs'][0]['taskId'] == started['runs'][0]['taskId']
        call('/api/agent/scenarios', {**body, 'instruction': 'Changed request'}, headers, 409)
        for _ in range(200):
            report = call('/api/agent/scenarios/' + suffix, headers=headers)
            if all(run['state'] not in ('queued', 'running') for run in report['runs']):
                break
            time.sleep(.1)
        assert report['runs'][0]['state'] == 'ready', report
        result = report['runs'][0]['preview']['scenario']
        assert result['outcome'] == 'purchased', result
        assert result['orderId'] and result['totalMinor'] > 0
        assert sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'") == '1'
        assert sql("SELECT jsonb_build_array((SELECT count(*) FROM orders WHERE tenant='workshop'),(SELECT stock FROM products WHERE tenant='workshop' AND id='lamp'))::text") == before
        assert 'synthetic-scenario-provider' not in json.dumps(report) and 'sw-context-token' not in json.dumps(report)
        call('/api/agent/scenarios/' + suffix, headers=live, expected=409)
        print('PASS durable customer agent completes native sandbox purchase once; live shop, private credentials and foreign access remain protected', flush=True)
        listing = call('/api/agent/scenarios', headers=headers)
        assert listing['configuration']['currency'] == 'EUR' and listing['configuration']['scale'] == 2
        low = {**body, 'requestId': uuid.uuid4().hex, 'profiles': [{**body['profiles'][0], 'budgetMinor': 1}]}
        call('/api/agent/scenarios', low, headers)
        low_report = wait(low['requestId'], headers)
        assert low_report['runs'][0]['preview']['scenario']['outcome'] == 'blocked', low_report
        assert sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'") == '1'
        print('PASS the exact native total enforces the fictional budget without an order', flush=True)
        assert any(c['profile']['budgetAmount'] == '0.01' for c in calls), 'Provider must receive an exact human-readable budget'
        pair = {**body, 'requestId': uuid.uuid4().hex, 'profiles': [body['profiles'][0], {**body['profiles'][0], 'id': 'second', 'name': 'Second customer'}]}
        mode['barrier'] = threading.Barrier(2)
        call('/api/agent/scenarios', pair, headers)
        pair_report = wait(pair['requestId'], headers)
        mode['barrier'] = None
        assert all(r['preview']['scenario']['outcome'] == 'purchased' for r in pair_report['runs']), pair_report
        assert len({r['preview']['scenario']['orderId'] for r in pair_report['runs']}) == 2
        print('PASS two customer agents complete with the minimum runtime connection pool and separate native carts, orders and journals', flush=True)
        mode['invalid'] = True
        hostile = {**body, 'requestId': uuid.uuid4().hex}
        call('/api/agent/scenarios', hostile, headers)
        hostile_report = wait(hostile['requestId'], headers)
        assert hostile_report['runs'][0]['state'] == 'failed', hostile_report
        assert sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'") == '3'
        mode['invalid'] = False
        print('PASS an injected merchant operation is rejected before dispatch', flush=True)
        # Lose the saved acknowledgement after a committed purchase, then cold start.
        # The provider action is already checkpointed; replay must recover the order.
        task = started['runs'][0]['taskId']
        sql(f"UPDATE tasks SET run_state='uncertain',applied=false,proposal='{{}}',run_revision=run_revision+1,run_checkpoint=jsonb_set(jsonb_set(run_checkpoint,'{{scenario-state,outcome}}','\"step_limit\"'), '{{scenario-state,steps}}',jsonb_build_array(run_checkpoint->'scenario-state'->'steps'->0)) WHERE tenant='{stage}' AND id='{task}'")
        stop(server)
        server = serve(env, base, log)
        prior_calls = len(calls)
        interrupted = call('/api/agent/runs/' + task, headers=headers)
        call('/api/agent/runs/' + task + '/resume', {'revision': interrupted['revision'], 'approve': True}, headers)
        recovered = wait(suffix, headers)
        assert recovered['runs'][0]['preview']['scenario']['orderId'] == result['orderId'], recovered
        assert len(calls) == prior_calls and sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'") == '3'
        print('PASS a cold restart after a lost checkout acknowledgement reuses the order and inference checkpoints', flush=True)
        mode['multi'] = True
        multi = {**body, 'requestId': uuid.uuid4().hex}
        call('/api/agent/scenarios', multi, headers)
        multi_report = wait(multi['requestId'], headers)
        multi_result = multi_report['runs'][0]['preview']['scenario']
        assert multi_result['outcome'] == 'purchased', multi_report
        assert {p['id'] for p in multi_result['steps'][1]['observation']['items']} == {'lamp', 'desk'}
        mode['multi'] = False
        print('PASS a multi-product customer keeps both selections in the authoritative basket', flush=True)
        # Same fictional customer before and after a real private-stock repair.
        sql(f"UPDATE products SET stock=0 WHERE tenant='{stage}' AND id='lamp'")
        unavailable = {**body, 'requestId': uuid.uuid4().hex}
        call('/api/agent/scenarios', unavailable, headers)
        broken = wait(unavailable['requestId'], headers)['runs'][0]['preview']['scenario']
        assert broken['outcome'] == 'blocked', broken
        sql(f"UPDATE products SET stock=40 WHERE tenant='{stage}' AND id='lamp'")
        repaired = {**body, 'requestId': uuid.uuid4().hex}
        call('/api/agent/scenarios', repaired, headers)
        fixed = wait(repaired['requestId'], headers)['runs'][0]['preview']['scenario']
        assert fixed['outcome'] == 'purchased' and broken['comparisonDigest'] == fixed['comparisonDigest']
        assert broken['snapshotDigest'] != fixed['snapshotDigest']
        print('PASS the same profile exposes missing stock, then buys after a native sandbox repair', flush=True)
        mode['hold'] = threading.Event()
        cancelled = {**body, 'requestId': uuid.uuid4().hex}
        queued = call('/api/agent/scenarios', cancelled, headers)
        assert mode['entered'].wait(timeout=5)
        tid = queued['runs'][0]['taskId']
        current = call('/api/agent/runs/' + tid, headers=headers)
        call('/api/agent/runs/' + tid + '/cancel', {'revision':current['revision'], 'approve':True}, headers)
        orders = sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'")
        mode['hold'].set()
        mode['hold'] = None
        time.sleep(.3)
        stopped = wait(cancelled['requestId'], headers)
        assert stopped['runs'][0]['state'] == 'cancelled' and sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'") == orders
        print('PASS cancelling during inference fences the late model response before a commerce action', flush=True)
        # Hold the product lock only after the customer filled its cart. The real
        # checkout must queue behind it; cancellation then wins before COMMIT.
        mode.update(hold=threading.Event(), holdCheckout=True, entered=threading.Event())
        delayed = {**body, 'requestId': uuid.uuid4().hex}
        queued = call('/api/agent/scenarios', delayed, headers)
        assert mode['entered'].wait(timeout=5)
        blocker = subprocess.Popen(psql(env['DB_CONTAINER'], 'commerce', env['TEST_DATABASE'], '-XqAt', '-v', 'ON_ERROR_STOP=1'), stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        try:
            blocker.stdin.write(f"BEGIN; SELECT set_config('rac.system','on',true); SELECT id FROM products WHERE tenant='{stage}' AND id='lamp' FOR UPDATE; SELECT 'lock-acquired';\n")
            blocker.stdin.flush()
            while blocker.stdout.readline().strip() != 'lock-acquired':
                assert blocker.poll() is None
            mode['hold'].set()
            mode['hold'] = None
            for _ in range(100):
                waiting = sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT * FROM products%FOR UPDATE%'")
                if int(waiting) > 0:
                    break
                time.sleep(.05)
            assert int(waiting) > 0, 'native checkout did not reach the held product lock'
            tid = queued['runs'][0]['taskId']
            current = call('/api/agent/runs/' + tid, headers=headers)
            call('/api/agent/runs/' + tid + '/cancel', {'revision':current['revision'], 'approve':True}, headers)
        finally:
            blocker.stdin.write('ROLLBACK;\n\\q\n')
            blocker.stdin.flush()
            blocker.communicate(timeout=5)
            mode['holdCheckout'] = False
        time.sleep(.3)
        assert sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'") == orders
        assert wait(delayed['requestId'], headers)['runs'][0]['state'] == 'cancelled'
        print('PASS cancellation while native checkout waits on a product lock rolls back the late order and stock changes', flush=True)
        # A task-row lock can outlive a lease without modifying the task. Check
        # time after acquiring that lock, not only at the start of SELECT.
        mode.update(hold=threading.Event(), holdCheckout=True, entered=threading.Event())
        expiring = {**body, 'requestId': uuid.uuid4().hex}
        queued = call('/api/agent/scenarios', expiring, headers)
        assert mode['entered'].wait(timeout=5)
        tid = queued['runs'][0]['taskId']
        def locked(statement):
            process = subprocess.Popen(psql(env['DB_CONTAINER'], 'commerce', env['TEST_DATABASE'], '-XqAt', '-v', 'ON_ERROR_STOP=1'), stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
            process.stdin.write("BEGIN; SELECT set_config('rac.system','on',true); " + statement + "; SELECT 'locked';\n")
            process.stdin.flush()
            while process.stdout.readline().strip() != 'locked': assert process.poll() is None
            return process
        def release(process):
            process.stdin.write('ROLLBACK;\n\\q\n'); process.stdin.flush(); process.communicate(timeout=5)
        product_lock = locked(f"SELECT id FROM products WHERE tenant='{stage}' AND id='lamp' FOR UPDATE")
        task_lock = None
        try:
            mode['hold'].set(); mode['hold'] = None
            for _ in range(100):
                if int(sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT * FROM products%FOR UPDATE%'")): break
                time.sleep(.02)
            else: raise AssertionError('Checkout did not reach product lock')
            sql(f"UPDATE tasks SET run_until=clock_timestamp()+interval '1 second' WHERE tenant='{stage}' AND id='{tid}'")
            task_lock = locked(f"SELECT id FROM tasks WHERE tenant='{stage}' AND id='{tid}' FOR UPDATE")
            release(product_lock); product_lock = None
            for _ in range(100):
                if int(sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT * FROM tasks%FOR UPDATE%'")): break
                time.sleep(.01)
            else: raise AssertionError('Checkout did not reach task lock')
            time.sleep(1.1)
        finally:
            if product_lock: release(product_lock)
            if task_lock: release(task_lock)
            mode['holdCheckout'] = False
        wait(expiring['requestId'], headers)
        assert sql(f"SELECT count(*) FROM orders WHERE tenant='{stage}'") == orders
        print('PASS lease expiry while waiting for the task lock prevents a late commerce commit', flush=True)
        another = call('/api/environments', {'name': 'Other scenario sandbox'}, live)['id']
        call('/api/agent/scenarios/' + suffix, headers={**headers, 'x-tenant': another}, expected=404)
        control = call('/api/agent/control', headers=live)
        call('/api/agent/control', {'stopped': True, 'revision': control['revision'], 'approve': True}, live)
        call('/api/agent/scenarios', {**body, 'requestId': uuid.uuid4().hex}, headers, 403)
        control = call('/api/agent/control', headers=live)
        call('/api/agent/control', {'stopped': False, 'revision': control['revision'], 'approve': True}, live)
        sql(f"UPDATE memberships SET role='viewer',permissions='[\"catalog.read\"]'::jsonb WHERE tenant='workshop' AND user_id='{actor}'")
        call('/api/agent/scenarios/' + suffix, headers=headers, expected=403)
        print('PASS foreign sandbox access, revoked rights and the shop emergency stop protect customer runs', flush=True)
    finally:
        stop(server)
        provider.shutdown()
