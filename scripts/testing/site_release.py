"""Actual selective publication resolves page dependencies atomically; no provider calls."""
import copy


def verify(call, account, headers):
    owner = account('page-release')
    live = headers(owner)
    public = {'x-tenant': owner['workspace']}
    stage = call('/api/environments', {'name': 'Italian campaign'}, live)['id']
    private = headers(owner, stage)
    before = call('/api/merchant/commerce', h=live)
    settings = call('/api/merchant/commerce', h=private)
    settings['data']['locales'].append('it-IT')
    call('/api/merchant/commerce', settings, private, method='PUT')
    call('/api/apps', {'builtIn': 'site_builder'}, private)
    channel = {'name': {'en-GB': 'Italian campaign'}, 'kind': 'storefront',
               'active': True, 'visibility': 'public', 'locales': ['it-IT'],
               'productIds': ['mug']}
    call('/api/automation/channels/italian_campaign', {'revision': 0, 'data': channel}, private, method='PUT')
    page = {'channel': 'italian_campaign', 'slug': 'autunno', 'title': {'en-GB': 'Autumn', 'it-IT': 'Autunno'},
            'kind': 'landing', 'status': 'published', 'starts_at': None,
            'content': {'blocks': [{'id': 'intro', 'kind': 'hero', 'text': {'it-IT': 'Autunno tranquillo'}},
                                   {'id': 'products', 'kind': 'products', 'products': ['mug'], 'productMode': 'selected'}]},
            'theme': {}, 'seo': None, 'author': None, 'category': None}
    call('/api/apps/site_builder/actions/save_page', {'id': 'autumn', 'revision': 0, 'fields': page}, private)
    changes = call('/api/environments/' + stage + '/diff', h=live)['changes']
    wanted = {'settings', 'channel:italian_campaign', 'app:site_builder', 'appdata:site_builder:pages:autumn'}
    selected = [{'key': c['key'], 'digest': c['digest']} for c in changes if c['key'] in wanted]
    assert {c['key'] for c in selected} == wanted
    release = '/api/environments/' + stage + '/release'
    # A missing dependency must roll back settings, installation, history and records together.
    for missing in ('settings', 'channel:italian_campaign'):
        rejected = [c for c in selected if c['key'] != missing]
        call(release, {'approve': True, 'selections': rejected}, live, 400)
        assert call('/api/merchant/commerce', h=live) == before
        assert not any(p['id'] == 'site_builder' for p in call('/api/apps', h=live)['packages'])
        assert call('/api/environments/' + stage + '/diff', h=live)['changes'] == changes
    stale = copy.deepcopy(selected)
    stale[0]['digest'] = 'stale'
    call(release, {'approve': True, 'selections': stale}, live, 409)
    # Deliberately supply the page first: input/alphabetical order cannot determine validity.
    selected.sort(key=lambda c: c['key'] != 'appdata:site_builder:pages:autumn')
    result = call(release, {'approve': True, 'selections': selected}, live)
    assert set(result['published']) == wanted
    assert 'it-IT' in call('/api/merchant/commerce', h=live)['data']['locales']
    rows = call('/store-api/apps/site_builder/actions/pages', {}, {**public, 'sw-sales-channel-id': 'italian_campaign'})['elements']
    assert len(rows) == 1 and rows[0]['content']['blocks'][0]['text']['it-IT'] == 'Autunno tranquillo'
    call(release, {'approve': True, 'selections': selected}, live, 409)
    print('PASS one atomic release of new language, channel, app and translated page; omitted dependencies and stale/replayed releases leave live unchanged')
