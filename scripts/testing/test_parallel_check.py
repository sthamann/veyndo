#!/usr/bin/env python3
"""Exercise actual parallel child overlap, failure propagation, owned cleanup and fixture isolation."""
import contextlib
import io
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from testing.parallel_check import ParallelCheck
from testing.runtime import ROOT, artifact_path


class ParallelVerification(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        # Child tests must not append measurements to their parent's coverage run.
        self.env = {k: v for k, v in os.environ.items() if k not in ('COVERAGE_PROCESS_START', 'PYTHONPATH')}

    def launch(self, source):
        script = self.root / 'child.py'
        script.write_text(source)
        return ParallelCheck([sys.executable, str(script)], self.env, self.root / 'child.log')

    def ready(self, path):
        end = time.monotonic() + 5
        while not path.exists() and time.monotonic() < end:
            time.sleep(.01)
        self.assertTrue(path.exists(), 'child did not reach the synchronization point')

    def test_child_and_parent_reach_barrier_concurrently_and_join_once(self):
        marker, release = self.root / 'started', self.root / 'release'
        source = f"""from pathlib import Path
import time
Path({str(marker)!r}).touch()
while not Path({str(release)!r}).exists(): time.sleep(.01)
print('fixture completed')
"""
        with self.launch(source) as child:
            self.ready(marker)
            self.assertIsNone(child.process.poll())
            release.touch()
            child.wait()
        self.assertIn('fixture completed', child.path.read_text())

    def test_failed_child_cannot_be_admitted_by_successful_parent(self):
        with self.assertRaises(subprocess.CalledProcessError) as error:
            with self.launch("print('deliberate fixture rejection'); raise SystemExit(7)") as child:
                child.wait()
        self.assertEqual(error.exception.returncode, 7)
        self.assertIn('deliberate fixture rejection', child.path.read_text())

    def test_unjoined_child_cannot_silently_skip_verification(self):
        with self.assertRaisesRegex(RuntimeError, 'not successfully joined'):
            with self.launch('pass') as child:
                child.process.wait()

    def test_parent_failure_preserves_error_and_stops_descendants(self):
        marker = self.root / 'port'
        grandchild = f"""import socket
from pathlib import Path
s=socket.socket(); s.bind(('127.0.0.1',0)); s.listen()
Path({str(marker)!r}).write_text(str(s.getsockname()[1]))
while True: s.accept()[0].close()
"""
        source = f"""import subprocess, sys
p=subprocess.Popen([sys.executable,'-c',{grandchild!r}])
try: p.wait()
finally: print('wrapper cleanup', flush=True)
"""
        with self.assertRaisesRegex(ValueError, 'foreground failure'):
            with self.launch(source) as child:
                self.ready(marker)
                port = int(marker.read_text())
                with socket.create_connection(('127.0.0.1', port), timeout=1):
                    pass
                raise ValueError('foreground failure')
        self.assertIsNotNone(child.process.poll())
        with self.assertRaises(OSError):
            socket.create_connection(('127.0.0.1', port), timeout=.2)
        self.assertIn('wrapper cleanup', child.path.read_text())

    def test_repeated_fixtures_keep_distinct_logs_and_reports(self):
        for owner in ('main', 'signed-pooler'):
            with patch.dict(os.environ, {'TEST_ARTIFACT_DIR': str(self.root / owner)}):
                artifact_path('production-replica-0.log').write_text(owner)
                artifact_path('tenant-isolation.json').write_text(owner)
        for owner in ('main', 'signed-pooler'):
            self.assertEqual((self.root / owner / 'production-replica-0.log').read_text(), owner)
            self.assertEqual((self.root / owner / 'tenant-isolation.json').read_text(), owner)

    def test_parallel_cli_rejects_partial_shared_or_remote_fixtures_before_database_work(self):
        for args in (
            ['--only', 'signed_pooler'], ['--existing-database'],
            ['--parallel-pooler', 'http://localhost:16333'],
            ['--parallel-pooler', 'http://127.0.0.1:16333'],
            ['--parallel-pooler', 'https://remote.example.test'],
            ['--parallel-pooler', 'http://127.0.0.1:16334/path'],
        ):
            with self.subTest(args=args):
                result = subprocess.run([sys.executable, str(ROOT / 'scripts/verify_integration.py'),
                    '--parallel-pooler', 'http://127.0.0.1:16334', *args],
                    env={**self.env, 'QDRANT_URL': 'http://localhost:16333'}, capture_output=True, text=True)
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn('--parallel-pooler requires', result.stderr)

    def test_partition_cannot_reuse_a_database_or_silently_select_partial_work(self):
        for extra in (['--existing-database'], ['--only', 'studio'],
                      ['--parallel-pooler', 'http://127.0.0.1:16334']):
            with self.subTest(extra=extra):
                result = subprocess.run([sys.executable, str(ROOT / 'scripts/verify_integration.py'),
                                        '--partition', 'core', *extra],
                                        env=self.env, capture_output=True, text=True)
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn('--partition requires', result.stderr)


if __name__ == '__main__':
    # Keep assertion output focused; child logs are still checked and retained.
    with contextlib.redirect_stdout(io.StringIO()):
        unittest.main()
