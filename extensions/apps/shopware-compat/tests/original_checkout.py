"""Original Shopware purchase with synthetic data and its unpaid invoice method, never a payment provider."""
import json
import uuid
import urllib.error
import urllib.request


def verify(base, admin_headers):
    def request(path, data=None, headers=None, method=None):
        req = urllib.request.Request(base + path, data=None if data is None else json.dumps(data).encode(),
                                     headers={'Content-Type': 'application/json', 'Accept': 'application/json', **(headers or {})}, method=method)
        try:
            response = urllib.request.urlopen(req, timeout=30)
        except urllib.error.HTTPError as error:
            raise AssertionError((path, error.code, error.read()[:1500])) from error
        raw = response.read()
        return (json.loads(raw) if raw else {}), response.headers

    def search(kind, body=None):
        return request('/api/search/' + kind, body or {'limit': 10}, admin_headers)[0]['data']

    channel = next(c for c in search('sales-channel', {'limit': 10, 'associations': {'domains': {}}})
                   if any(d['url'] == base for d in c['domains']))
    tax = next(t for t in search('tax') if t['taxRate'] == 19)
    invoice = next(p for p in search('payment-method') if p['technicalName'] == 'payment_invoicepayment')
    assert invoice['active']
    product_id, suffix = uuid.uuid4().hex, uuid.uuid4().hex[:12]
    title = 'Original compatibility product ' + suffix
    request('/api/product', {
        'id': product_id, 'productNumber': 'compat-' + suffix, 'name': title,
        'active': True, 'stock': 10, 'taxId': tax['id'],
        'price': [{'currencyId': channel['currencyId'], 'gross': 19.9, 'net': 16.722689, 'linked': True}],
        'visibilities': [{'salesChannelId': channel['id'], 'visibility': 30}],
    }, admin_headers)
    with urllib.request.urlopen(base + '/detail/' + product_id, timeout=30) as page:
        assert title in page.read().decode()
        assert page.headers['X-Veyndo-Compatibility-Fixture'] == 'original-plugin-active'

    headers = {'sw-access-key': channel['accessKey']}
    cart, response = request('/store-api/checkout/cart', {}, headers)
    headers['sw-context-token'] = response.get('sw-context-token') or cart['token']
    request('/store-api/context', {'paymentMethodId': invoice['id']}, headers, 'PATCH')
    _, response = request('/store-api/account/register', {
        'guest': True, 'email': suffix + '@example.test', 'firstName': 'Synthetic', 'lastName': 'Buyer',
        'storefrontUrl': base, 'acceptedDataProtection': True,
        'billingAddress': {'firstName': 'Synthetic', 'lastName': 'Buyer', 'street': 'Fixture Street 1',
                           'zipcode': '10115', 'city': 'Berlin', 'countryId': channel['countryId']},
    }, headers)
    headers['sw-context-token'] = response.get('sw-context-token') or headers['sw-context-token']
    cart, _ = request('/store-api/checkout/cart/line-item', {
        'items': [{'id': product_id, 'referencedId': product_id, 'type': 'product', 'quantity': 1}],
    }, headers)
    assert cart['lineItems'][0]['price']['totalPrice'] == 19.9
    order, response = request('/store-api/checkout/order', {'tos': True}, headers)
    assert response['X-Veyndo-Compatibility-Fixture'] == 'original-plugin-active'
    accepted = search('order', {'filter': [{'type': 'equals', 'field': 'id', 'value': order['id']}],
                               'associations': {'lineItems': {}, 'transactions': {'associations': {'stateMachineState': {}}}}})[0]
    line = next(line for line in accepted['lineItems'] if line['referencedId'] == product_id)
    assert line['quantity'] == 1 and line['totalPrice'] == 19.9
    assert accepted['transactions'][0]['paymentMethodId'] == invoice['id']
    assert accepted['transactions'][0]['stateMachineState']['technicalName'] == 'open'
    empty, _ = request('/store-api/checkout/cart', {}, headers)
    assert empty['lineItems'] == []
    remaining = search('product', {'filter': [{'type': 'equals', 'field': 'id', 'value': product_id}]})[0]
    assert remaining['availableStock'] == 9, remaining['availableStock']
    print('PASS original storefront product, guest cart/order, retained extension execution, unpaid invoice, stock and empty cart', flush=True)
