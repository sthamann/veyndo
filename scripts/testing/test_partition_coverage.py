"""Reject incomplete, stale or modified partition profiles before combining coverage."""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from partition_coverage import collect, pack


class PartitionCoverage(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.env = {'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '55', 'GITHUB_RUN_ATTEMPT': '2'}
        self.bundles = self.root / 'bundles'
        (self.root / 'target').mkdir()
        (self.root / 'artifacts').mkdir()
        (self.root / 'scripts/testing').mkdir(parents=True)
        (self.root / 'scripts/testing/suites.json').write_text('{"registry":"fixture"}')
        git = patch('ci_gate.subprocess.check_output', return_value=self.env['GITHUB_SHA'] + '\n')
        git.start()
        self.addCleanup(git.stop)
        with patch.dict(os.environ, self.env):
            for name in ('core', 'signed', 'pooler'):
                (self.root / 'target/fixture.profraw').write_bytes(b'profile-' + name.encode())
                (self.root / 'artifacts/.coverage.fixture').write_bytes(b'python-' + name.encode())
                pack(self.root, self.env, name, self.bundles / name, 'rustc-test')
        for path in (self.root / 'target/fixture.profraw', self.root / 'artifacts/.coverage.fixture'):
            path.unlink()

    def test_all_partition_profiles_are_retained_under_distinct_names(self):
        collect(self.root, self.env, self.bundles, 'rustc-test')
        self.assertEqual({p.read_bytes() for p in (self.root / 'target').glob('*.profraw')},
                         {b'profile-core', b'profile-signed', b'profile-pooler'})
        self.assertEqual(len(list((self.root / 'artifacts').glob('.coverage.*'))), 3)

    def test_missing_partition_or_modified_payload_fails_before_any_copy(self):
        target = self.bundles / 'signed/manifest.json'
        saved = target.read_text()
        target.unlink()
        with self.assertRaises(ValueError):
            collect(self.root, self.env, self.bundles, 'rustc-test')
        target.write_text(saved)
        next((self.bundles / 'pooler/rust').iterdir()).write_bytes(b'forged')
        with self.assertRaises(ValueError):
            collect(self.root, self.env, self.bundles, 'rustc-test')
        self.assertFalse(list((self.root / 'target').glob('*.profraw')))

    def test_source_run_toolchain_registry_and_manifest_paths_cannot_be_substituted(self):
        target = self.bundles / 'signed/manifest.json'
        original = target.read_text()
        for key, value in [('sha', 'b' * 40), ('run', '54'), ('partition', 'core'),
                           ('toolchain', 'other'), ('root', '/other'), ('registry', 'wrong'),
                           ('attempt', 3), ('attempt', True), ('files', {'../escape': 'x'})]:
            changed = json.loads(original)
            changed[key] = value
            target.write_text(json.dumps(changed))
            with self.subTest(key=key), self.assertRaises(ValueError):
                collect(self.root, self.env, self.bundles, 'rustc-test')
            self.assertFalse(list((self.root / 'target').glob('*.profraw')))
        target.write_text(original)
        collect(self.root, {**self.env, 'GITHUB_RUN_ATTEMPT': '3'}, self.bundles, 'rustc-test')


if __name__ == '__main__':
    unittest.main()
