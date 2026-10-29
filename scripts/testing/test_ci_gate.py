"""Negative controls for required-job admission and transferred coverage evidence."""
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from ci_gate import REPORTS, check_jobs, check_reports, provenance_path, stamp


def outcome(scope):
    required = {'quick': set(), 'docs': {'documentation'}, 'frontend': {'frontend'},
                'full': {'frontend', 'native'}}[scope]
    needs = {job: {'result': 'success' if job in required else 'skipped', 'outputs': {}}
             for job in ('documentation', 'frontend', 'native')}
    needs['admission'] = {'result': 'success', 'outputs': {'lane': scope}}
    for job in required & {'frontend', 'native'}:
        needs[job]['outputs']['artifact-id'] = '123' if job == 'frontend' else '456'
    return needs


class RequiredJobs(unittest.TestCase):
    def test_all_scopes(self):
        for scope in ('quick', 'docs', 'frontend', 'full'):
            self.assertEqual(check_jobs(outcome(scope)), scope)

    def test_daily_and_manual_runs_cannot_pass_with_quick_checks(self):
        for event in ('schedule', 'workflow_dispatch', 'unknown'):
            self.assertEqual(check_jobs(outcome('full'), event), 'full')
            for scope in ('quick', 'docs', 'frontend'):
                with self.subTest(event=event, scope=scope), self.assertRaises(ValueError):
                    check_jobs(outcome(scope), event)
        for event in ('push', 'pull_request'):
            self.assertEqual(check_jobs(outcome('quick'), event), 'quick')

    def test_every_required_job_failure_cancellation_skip_and_missing_result(self):
        for scope in ('quick', 'docs', 'frontend', 'full'):
            base = outcome(scope)
            for job in [name for name, value in base.items() if value['result'] == 'success']:
                for result in ('failure', 'cancelled', 'skipped', '', None):
                    with self.subTest(scope=scope, job=job, result=result):
                        changed = copy.deepcopy(base)
                        changed[job]['result'] = result
                        with self.assertRaises(ValueError):
                            check_jobs(changed)

    def test_unexpected_running_or_failed_lane_is_not_a_fast_path(self):
        for scope, job in (('quick', 'native'), ('quick', 'frontend'),
                           ('quick', 'documentation'), ('docs', 'native'),
                           ('docs', 'frontend'), ('frontend', 'native')):
            for result in ('success', 'failure', 'cancelled', 'in_progress'):
                changed = outcome(scope)
                changed[job]['result'] = result
                with self.subTest(scope=scope, job=job, result=result), self.assertRaises(ValueError):
                    check_jobs(changed)

    def test_unknown_scope_jobs_and_missing_artifact_fail_closed(self):
        for scope in ('', 'fast', None):
            changed = outcome('full')
            changed['admission']['outputs']['lane'] = scope
            with self.assertRaises(ValueError):
                check_jobs(changed)
        for job in outcome('full'):
            changed = outcome('full')
            del changed[job]
            with self.assertRaises(ValueError):
                check_jobs(changed)
        with self.assertRaises(ValueError):
            check_jobs({**outcome('full'), 'unknown': {'result': 'success'}})
        for job in ('frontend', 'native'):
            for artifact in ('', '0', '-1', 'latest', None, 123):
                changed = outcome('full')
                changed[job]['outputs']['artifact-id'] = artifact
                with self.subTest(job=job, artifact=artifact), self.assertRaises(ValueError):
                    check_jobs(changed)

    def test_actual_cli_returns_failure_instead_of_a_green_skipped_gate(self):
        script = Path(__file__).with_name('ci_gate.py')
        for expected, needs in ((0, outcome('full')), (1, outcome('full'))):
            if expected:
                needs['frontend']['result'] = 'skipped'
            result = subprocess.run([sys.executable, str(script), 'jobs'],
                                    env={**os.environ, 'VERIFY_NEEDS': json.dumps(needs)},
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, expected, result.stderr)


class CoverageTransfer(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.env = {'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '55', 'GITHUB_RUN_ATTEMPT': '2'}
        git = patch('ci_gate.subprocess.check_output', return_value=self.env['GITHUB_SHA'] + '\n')
        git.start()
        self.addCleanup(git.stop)
        for lane, files in REPORTS.items():
            for name in files:
                target = self.root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(json.dumps({'report': name}))
            stamp(self.root, self.env, lane)

    def test_same_source_reports_and_reused_successful_attempt(self):
        check_reports(self.root, self.env, 'frontend')
        check_reports(self.root, self.env, 'full')
        check_reports(self.root, {**self.env, 'GITHUB_RUN_ATTEMPT': '3'}, 'full')

    def test_changed_or_missing_report_rejects_each_lane(self):
        for files in REPORTS.values():
            for name in files:
                target = self.root / name
                original = target.read_bytes()
                target.write_text('{}')
                with self.subTest(name=name), self.assertRaises(ValueError):
                    check_reports(self.root, self.env, 'full')
                target.unlink()
                with self.assertRaises(OSError):
                    check_reports(self.root, self.env, 'full')
                target.write_bytes(original)

    def test_cross_source_run_lane_future_attempt_and_incomplete_manifest_rejected(self):
        changes = [('sha', 'b' * 40), ('run', '54'), ('lane', 'another'),
                   ('attempt', 3), ('attempt', 0), ('attempt', True), ('attempt', '2'),
                   ('reports', {}), ('reports', {'unexpected': 'digest'})]
        for lane in REPORTS:
            target = provenance_path(self.root, lane)
            original = target.read_text()
            for key, value in changes:
                changed = json.loads(original)
                changed[key] = value
                target.write_text(json.dumps(changed))
                with self.subTest(lane=lane, key=key, value=value), self.assertRaises(ValueError):
                    check_reports(self.root, self.env, 'full')
            target.unlink()
            with self.assertRaises(OSError):
                check_reports(self.root, self.env, 'full')
            target.write_text(original)

    def test_stamping_requires_actual_reports_checkout_and_run_identity(self):
        for key, value in (('GITHUB_SHA', 'b' * 40), ('GITHUB_RUN_ID', ''),
                           ('GITHUB_RUN_ATTEMPT', '0')):
            with self.subTest(key=key), self.assertRaises(ValueError):
                stamp(self.root, {**self.env, key: value}, 'frontend')
        (self.root / REPORTS['frontend'][0]).unlink()
        with self.assertRaises(OSError):
            stamp(self.root, self.env, 'frontend')
        with self.assertRaises(ValueError):
            check_reports(self.root, self.env, 'docs')


if __name__ == '__main__':
    unittest.main()
