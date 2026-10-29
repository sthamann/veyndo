"""Fail-closed required CI result and same-source coverage transfer between runners."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
REPORTS = {
    'frontend': ('frontend/coverage/coverage-summary.json',),
    'native': ('artifacts/coverage/rust.json', 'artifacts/coverage/python.json'),
}
EXPECTED = {
    'quick': set(),
    'docs': {'documentation'},
    'frontend': {'frontend'},
    'full': {'frontend', 'native'},
}
JOBS = {'admission', 'documentation', 'frontend', 'native'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_jobs(needs, event_name=None):
    require(set(needs) == JOBS, 'Missing or unknown verification jobs')
    require(needs['admission']['result'] == 'success', 'Source admission did not succeed')
    lane = needs['admission'].get('outputs', {}).get('lane')
    require(lane in EXPECTED, 'Missing or unknown verification scope')
    if event_name not in (None, 'push', 'pull_request'):
        require(lane == 'full', 'Scheduled, manual and unknown events require full verification')
    for job in sorted(JOBS - {'admission'}):
        expected = 'success' if job in EXPECTED[lane] else 'skipped'
        require(needs[job]['result'] == expected, f'{job}: expected {expected}')
        if job in EXPECTED[lane] and job in REPORTS:
            artifact = needs[job].get('outputs', {}).get('artifact-id', '')
            require(isinstance(artifact, str) and artifact.isdecimal() and int(artifact) > 0,
                    f'{job}: missing immutable coverage artifact ID')
    return lane


def identity(root, env):
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    require(sha == env['GITHUB_SHA'], 'Coverage checkout differs from workflow source')
    for key in ('GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT'):
        require(env[key].isdecimal() and int(env[key]) > 0, f'Invalid {key}')
    return {'sha': sha, 'run': env['GITHUB_RUN_ID'], 'attempt': int(env['GITHUB_RUN_ATTEMPT'])}


def digests(root, lane):
    return {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in REPORTS[lane]}


def provenance_path(root, lane):
    return root / 'artifacts' / 'coverage' / f'{lane}-provenance.json'


def stamp(root, env, lane):
    data = {**identity(root, env), 'lane': lane, 'reports': digests(root, lane)}
    target = provenance_path(root, lane)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=2) + '\n')


def check_reports(root, env, scope):
    require(scope in ('frontend', 'full'), 'Coverage requires frontend or full scope')
    current = identity(root, env)
    for lane in ('frontend', 'native') if scope == 'full' else ('frontend',):
        saved = json.loads(provenance_path(root, lane).read_text())
        require(saved['lane'] == lane, f'{lane}: wrong coverage lane')
        require(all(saved[key] == current[key] for key in ('sha', 'run')),
                f'{lane}: coverage from another source or workflow run')
        # Re-running only failed jobs legitimately reuses an earlier successful job's ID.
        require(type(saved['attempt']) is int and 0 < saved['attempt'] <= current['attempt'],
                f'{lane}: invalid producer attempt')
        require(saved['reports'] == digests(root, lane), f'{lane}: missing or changed coverage report')


def main():
    command, *args = sys.argv[1:]
    if command == 'jobs' and not args:
        print('PASS required jobs:', check_jobs(json.loads(os.environ['VERIFY_NEEDS']),
                                               os.environ.get('GITHUB_EVENT_NAME')))
    elif command == 'stamp' and len(args) == 1 and args[0] in REPORTS:
        stamp(ROOT, os.environ, args[0])
    elif command == 'reports' and len(args) == 1:
        check_reports(ROOT, os.environ, args[0])
        print('PASS coverage source, workflow run and report contents')
    else:
        raise ValueError('Usage: ci_gate.py jobs | stamp frontend/native | reports frontend/full')


if __name__ == '__main__':
    try:
        main()
    except (KeyError, ValueError, OSError, subprocess.CalledProcessError) as error:
        raise SystemExit(f'FAIL verification admission: {error}') from error
