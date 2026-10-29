"""Disjoint outer integration partitions; nested production-rights repetitions stay intact."""
import re

PARTITIONS = ('core', 'signed', 'pooler')
SPECIAL = {'signed': ('signed_runtime',), 'pooler': ('signed_pooler', 'transaction_pooler')}
GROUPS = {'http', 'providers', 'browser_contracts', 'tooling'}


def partition(registry, name):
    if name not in PARTITIONS or set(registry) != GROUPS:
        raise ValueError('Unknown integration partition or suite group')
    entries = [suite for suites in registry.values() for suite in suites]
    if (any(not isinstance(suite, str) or not re.fullmatch(r'[a-z][a-z0-9_-]*(/[a-z][a-z0-9_-]*)?', suite)
            for suite in entries) or len(entries) != len(set(entries))):
        raise ValueError('Invalid or duplicate suite registration')
    special = {suite for suites in SPECIAL.values() for suite in suites}
    if not special <= set(registry['providers']):
        raise ValueError('Missing production-rights integration suite')
    return {group: [suite for suite in suites
                    if (suite not in special if name == 'core' else suite in SPECIAL[name])]
            for group, suites in registry.items()}
