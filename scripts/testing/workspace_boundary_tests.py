"""Mutation controls against real Cargo metadata: aliases, hidden helpers, build scripts and source-owner escapes."""
import copy
from workspace_boundaries import ROOT, check


def negative_controls(packages):
    cases = []
    def variant(name):
        rows = copy.deepcopy(packages)
        package = next(p for p in rows if p['name'] == name)
        cases.append(rows)
        return package
    for name, dependency in [('veyndo-apps', 'sqlx'), ('veyndo-commerce', 'veyndo-cognition'),
                              ('veyndo-cognition', 'veyndo'), ('veyndo-kernel', 'tokio')]:
        variant(name)['dependencies'].append({'name': dependency})
    variant('veyndo')['dependencies'].append({'name':'veyndo-shopware-native'})
    variant('veyndo-shopware-native')['dependencies'].append({'name':'sqlx'})
    native_runtime=next(d for d in variant('veyndo-shopware-native')['dependencies'] if d['name']=='veyndo-apps')
    native_runtime['kind']=None
    variant('veyndo-shopware-native')['targets'][0]['src_path']=str(ROOT/'src/lib.rs')
    for kind in [None, 'dev', 'build']:
        variant('veyndo-apps')['dependencies'].append(
            {'name': 'sqlx', 'rename': 'harmless_helpers', 'kind': kind, 'optional': True,
             'target': 'cfg(target_os = "linux")'})
    variant('veyndo-commerce')['dependencies'].append({'name': 'business-helper'})
    variant('veyndo-commerce')['dependencies'].append(
        {'name': 'serde', 'path': str(ROOT / 'src')})
    dependency = next(d for d in variant('veyndo-apps')['dependencies'] if d['name'] == 'veyndo-kernel')
    dependency['path'] = str(ROOT / 'src')
    dependency = next(d for d in variant('veyndo-apps')['dependencies'] if d['name'] == 'veyndo-kernel')
    dependency.pop('path', None)
    variant('veyndo-commerce')['targets'][0]['src_path'] = str(ROOT / 'src/lib.rs')
    variant('veyndo-apps')['targets'][0]['src_path'] = str(ROOT / 'crates/commerce/src/lib.rs')
    variant('veyndo-kernel')['targets'].append(
        {'kind': ['custom-build'], 'src_path': str(ROOT / 'crates/kernel/build.rs')})
    variant('veyndo-commerce')['manifest_path'] = str(ROOT / 'crates/apps/Cargo.toml')
    unknown = copy.deepcopy(packages)
    unknown.append({'name': 'business-helper'})
    cases.append(unknown)
    cases.append([p for p in copy.deepcopy(packages) if p['name'] != 'veyndo-kernel'])
    for index, rows in enumerate(cases):
        try:
            check(rows)
        except AssertionError:
            continue
        raise AssertionError(f'Workspace boundary silently accepted negative control {index}')
    return len(cases)
