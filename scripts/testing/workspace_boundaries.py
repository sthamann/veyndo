"""Enforce reviewed Cargo owners and dependency capabilities, including aliases and unnamed helper crates."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OWNERS = {name: ROOT / 'crates' / name.removeprefix('veyndo-') for name in (
    'veyndo-kernel', 'veyndo-runtime', 'veyndo-commerce', 'veyndo-apps', 'veyndo-cognition')}
OWNERS.update({'veyndo': ROOT, 'veyndo-migration': ROOT / 'extensions/apps/migration'})
ALLOWED = {
    'veyndo-kernel': set(),
    'veyndo-runtime': set(),
    'veyndo-commerce': {'veyndo-kernel'},
    'veyndo-apps': {'veyndo-kernel'},
    'veyndo-cognition': {'veyndo-runtime', 'veyndo-kernel'},
}
# Reviewed direct external capabilities. Cargo reports actual package names even
# when a manifest renames sqlx as something innocuous. New dependencies need an
# explicit architecture decision, including build/dev/optional/target variants.
EXTERNAL = {
    'veyndo-kernel': set(),
    'veyndo-commerce': {'serde', 'serde_json'},
    'veyndo-apps': {'wasmtime', 'wat', 'sha2'},
    'veyndo-runtime': {'hmac', 'sha2', 'zeroize', 'sqlx', 'tokio', 'futures-util',
                       'serde_json', 'reqwest', 'async-stream', 'uuid'},
    'veyndo-cognition': {'serde', 'serde_json', 'tokio', 'reqwest', 'aes-gcm',
                         'base64', 'sha2', 'sqlx', 'tracing'},
}


def check(packages):
    names = {p['name'] for p in packages}
    assert names == set(OWNERS), ('Unclassified or missing workspace owner', names ^ set(OWNERS))
    for package in packages:
        name = package['name']
        owner = OWNERS[name].resolve()
        assert Path(package['manifest_path']).resolve() == owner / 'Cargo.toml', (name, 'Wrong owner directory')
        for target in package['targets']:
            assert Path(target['src_path']).resolve().is_relative_to(owner), (name, 'Target escapes its owner')
        if name not in ALLOWED:
            continue
        allowed = ALLOWED[name] | EXTERNAL[name]
        for dependency in package['dependencies']:
            dep = dependency['name']
            assert dep in allowed, (name, 'Unreviewed dependency capability', dep)
            if dependency.get('path'):
                assert dep in ALLOWED[name] and Path(dependency['path']).resolve() == OWNERS[dep].resolve(), (name, 'Path dependency escapes its owner', dep)
            elif dep in ALLOWED[name]:
                raise AssertionError((name, 'Domain dependency must use its reviewed local owner', dep))
        assert not any('custom-build' in t['kind'] for t in package['targets']), (name, 'Unreviewed domain build script')


def main():
    data = json.loads(subprocess.check_output(
        ['cargo', 'metadata', '--locked', '--no-deps', '--format-version', '1'], cwd=ROOT))
    check(data['packages'])
    from workspace_boundary_tests import negative_controls
    count = negative_controls(data['packages'])
    print(f'PASS Cargo owner/dependency boundaries; {count} bypass negative controls')


if __name__ == '__main__':
    main()
