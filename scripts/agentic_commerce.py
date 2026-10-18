#!/usr/bin/env python3
"""Real UCP cart transfer into native checkout: scoped single-use capability and one durable order."""
import json, os, urllib.request, urllib.error, urllib.parse, uuid
BASE = os.environ['BASE_URL']
def call(path, body=None, h=None, status=200, method=None):
    req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type':'application/json', **(h or {})},method=method)
    try: response = urllib.request.urlopen(req, timeout=25)
    except urllib.error.HTTPError as error: response = error
    raw = response.read(); assert response.status == status, (path, response.status, raw[:1000])
    return json.loads(raw)
def shop():
    suffix = uuid.uuid4().hex[:12]
    return call('/api/auth/register', {'workspaceId':'cart-'+suffix,'workspaceName':'UCP cart fixture','name':'Owner','email':suffix+'@example.test','password':'Synthetic-cart-fixture-2026!'})
u, foreign = shop(), shop()
h = {'x-tenant':u['workspace'],'x-commerce-locale':'de-DE'}
profile = call('/.well-known/ucp', h=h)['ucp']
assert 'dev.ucp.shopping.cart' in profile['capabilities'], profile['capabilities']
body = {'line_items':[{'item':{'id':'lamp'}, 'quantity':2}], 'currency':'EUR'}
c = call('/ucp/v1/carts', body, h)
assert c['line_items'][0]['item']['id'] == 'lamp' and c['line_items'][0]['quantity'] == 2
assert c['totals'][-1]['amount'] > 0 and c['currency'] == 'EUR'
url = urllib.parse.urlsplit(c['continue_url'])
assert url.scheme == 'https' and url.netloc == 'studio.example.test' and url.path == '/checkout', url
assert urllib.parse.parse_qs(url.query)['shop'] == [u['workspace']]
assert urllib.parse.parse_qs(url.query).get('language') == ['de-DE'], 'Continuation must preserve the cart content language'
assert url.fragment.startswith('checkout/') and 'token' not in url.query
assert 'context_token' not in c
secret = url.fragment.removeprefix('checkout/')
call('/store-api/checkout/handoff/consume', {'ticket':secret}, {'x-tenant':foreign['workspace']}, 410)
cart = call('/store-api/checkout/handoff/consume', {'ticket':secret}, h)
call('/store-api/checkout/handoff/consume', {'ticket':secret}, h, 410)
assert cart['id'] == c['id'] and len(cart['lineItems']) == 1
ch = {**h,'sw-context-token':cart['token'],'Idempotency-Key':uuid.uuid4().hex}
order = call('/store-api/checkout/order', {}, ch)
assert order['cart']['lineItems'][0]['quantity'] == 2
assert call('/store-api/checkout/order', {}, ch)['id'] == order['id']
call('/ucp/v1/carts', {'line_items':[{'item':{'id':'lamp'},'quantity':0}]}, h, 400)
print('PASS UCP transfer: native totals, canonical single-use continuation, no bearer in URL, foreign/replay denial, native idempotent order')
unnegotiated=call('/ucp/v1/checkout-sessions',body,h)
assert 'dev.ucp.shopping.buyer_consent' not in unnegotiated['ucp']['capabilities']
call('/ucp/v1/checkout-sessions',{**body,'buyer':{'consent':{}}},h,409)
h={**h,'x-veyndo-ucp-consent-version':'2026-08-25'}
# Consent must be preserved, opt out by default, and prevent completion when its required contact is absent.
email='buyer-'+uuid.uuid4().hex[:8]+'@example.test'
sms={'dev.ucp.consent.marketing':{'granted':False,'source':'platform','segments':{'dev.ucp.consent.marketing.sms':{'granted':True,'source':'platform'}}}}
b={'line_items':[{'item':{'id':'lamp'},'quantity':1}],'buyer':{'email':email,'consent':sms}}
# A transfer must enforce the same contact guard in the native finalization path.
transfer=call('/ucp/v1/carts',b,h)
ticket=urllib.parse.urlsplit(transfer['continue_url']).fragment.removeprefix('checkout/')
transferred=call('/store-api/checkout/handoff/consume',{'ticket':ticket},h)
th={**h,'sw-context-token':transferred['token'],'Idempotency-Key':uuid.uuid4().hex}
call('/store-api/checkout/order',{},th,400)
session=call('/ucp/v1/checkout-sessions',b,h)
assert session['status']=='incomplete' and any(m['code']=='missing_consent_data' for m in session['messages']),session
sh={**h,'sw-context-token':session['context_token']}
path='/ucp/v1/checkout-sessions/'+session['id']
call(path+'/complete',{}, {**sh,'Idempotency-Key':uuid.uuid4().hex},409)
for forged in [ {'dev.ucp.consent.analytics':{'granted':True,'source':'business'}}, {'unregistered.purpose':{'granted':True,'source':'platform'}} ]:
    call('/ucp/v1/checkout-sessions',{**b,'buyer':{'email':email,'consent':forged}},h,400)
updated=urllib.request.Request(BASE+path,data=json.dumps({**b,'buyer':{'email':email,'phone_number':'+491234567890'}}).encode(),headers={'Content-Type':'application/json',**sh},method='PUT')
with urllib.request.urlopen(updated,timeout=25) as r: updated=json.load(r)
assert updated['buyer']['consent']['dev.ucp.consent.marketing']['segments']['dev.ucp.consent.marketing.sms']['granted'] is True
assert updated['buyer']['consent']['dev.ucp.consent.analytics']['granted'] is False
assert updated['status']=='ready_for_complete'
completed=call(path+'/complete',{}, {**sh,'Idempotency-Key':uuid.uuid4().hex})
assert completed['status']=='completed'
assert completed['buyer']['consent']['dev.ucp.consent.marketing']['segments']['dev.ucp.consent.marketing.sms']['granted'] is True
policy=call('/store-api/legal',h=sh)
call('/store-api/privacy/consent',{'policyVersion':policy['policyVersion'],'choices':{}},sh,method='PUT')
assert call(path,h=sh)['buyer']['consent']['dev.ucp.consent.marketing']['segments']['dev.ucp.consent.marketing.sms']['granted'] is True
print('PASS UCP consent: explicit choices, defaults, validation, missing-contact completion block, omission preservation and immutable completion')
# A new, unrelated choice cannot revive withdrawn protocol marketing; clearing buyer revokes all.
r=call('/ucp/v1/checkout-sessions',b,h)
rh={**h,'sw-context-token':r['context_token']};rp='/ucp/v1/checkout-sessions/'+r['id']
policy=call('/store-api/legal',h=rh)
call('/store-api/privacy/consent',{'policyVersion':policy['policyVersion'],'choices':{}},rh,method='PUT')
r=call(rp,{**b,'buyer':{'email':email,'consent':{'dev.ucp.consent.analytics':{'granted':True,'source':'platform'}}}},rh,method='PUT')
assert not r['buyer']['consent']['dev.ucp.consent.marketing']['segments']['dev.ucp.consent.marketing.sms']['granted']
r=call(rp,{**b,'buyer':None},rh,method='PUT')
assert not any(call('/store-api/privacy/consent',h=rh)['choices'].values())
print('PASS consent withdrawal survives unrelated updates; clearing buyer revokes native processing choices')
admin={**h,'Authorization':'Bearer '+u['token']}
readiness=call('/api/merchant/catalog/intake',h=admin)['agentic']
assert readiness['destination']=='veyndo' and readiness['cartTransfer'] is True and readiness['buyerConsent'] is True
assert readiness['externalAcceptance']=='not_verified' and readiness['channel']=='default'
call('/api/merchant/catalog/intake',h=h,status=401)
print('PASS merchant readiness is permission-scoped and never invents external provider approval')
