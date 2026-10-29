"""Prove complete, disjoint outer-suite admission before parallel CI can pass."""
import copy
import json
from pathlib import Path
import unittest

from integration_partitions import partition


class IntegrationPartitions(unittest.TestCase):
    def setUp(self):
        self.registry = json.loads(Path(__file__).with_name('suites.json').read_text())

    def test_every_registered_suite_runs_once_without_removing_nested_security_checks(self):
        actual = [suite for name in ('core', 'signed', 'pooler')
                  for suites in partition(self.registry, name).values() for suite in suites]
        expected = [suite for suites in self.registry.values() for suite in suites]
        self.assertCountEqual(actual, expected)
        self.assertEqual(len(actual), len(set(actual)))
        self.assertEqual(partition(self.registry, 'signed')['providers'], ['signed_runtime'])
        self.assertEqual(partition(self.registry, 'pooler')['providers'],
                         ['signed_pooler', 'transaction_pooler'])
        self.assertIn('production_foundations', partition(self.registry, 'core')['providers'])

    def test_new_registered_suites_are_automatically_required_in_core(self):
        self.registry['providers'].append('new_provider')
        self.assertIn('new_provider', partition(self.registry, 'core')['providers'])

    def test_duplicate_missing_special_suite_unknown_partition_and_bad_registry_reject(self):
        for changed in (
            {**self.registry, 'http': self.registry['http'] + ['signed_runtime']},
            {**self.registry, 'providers': [s for s in self.registry['providers'] if s != 'signed_runtime']},
            {**self.registry, 'unknown': ['extra']},
            {**self.registry, 'http': ['../../unsafe']},
        ):
            with self.subTest(registry=changed), self.assertRaises(ValueError):
                partition(changed, 'core')
        with self.assertRaises(ValueError):
            partition(copy.deepcopy(self.registry), 'fast')


if __name__ == '__main__':
    unittest.main()
