"""Transfer same-source raw LLVM/Python profiles; official collectors calculate coverage."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

from ci_gate import identity, require
from integration_partitions import PARTITIONS


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pack(root, env, name, destination, toolchain):
    require(name in PARTITIONS, 'Unknown coverage partition')
    require(not destination.exists(), 'Coverage bundle already exists')
    destination.mkdir(parents=True)
    files = {}
    for directory, pattern, group in [('target', '*.profraw', 'rust'), ('artifacts', '.coverage.*', 'python')]:
        sources = sorted((root / directory).rglob(pattern))
        require(bool(sources), f'{name}: missing {group} measurement')
        for index, source in enumerate(sources):
            require(source.is_file() and not source.is_symlink(), 'Invalid measurement file')
            target = destination / group / f'{index}{".profraw" if group == "rust" else ".coverage"}'
            target.parent.mkdir(exist_ok=True)
            shutil.copyfile(source, target)
            files[target.relative_to(destination).as_posix()] = digest(target)
    manifest = {**identity(root, env), 'partition': name, 'root': str(root.resolve()),
                'toolchain': toolchain, 'registry': digest(root / 'scripts/testing/suites.json'), 'files': files}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')


def collect(root, env, bundles, toolchain):
    current = identity(root, env)
    pending = []
    require({p.name for p in bundles.iterdir()} == set(PARTITIONS), 'Missing or unknown partition bundle')
    for name in PARTITIONS:
        folder = bundles / name
        require((folder / 'manifest.json').is_file(), f'{name}: missing coverage manifest')
        saved = json.loads((folder / 'manifest.json').read_text())
        require(all(saved.get(key) == value for key, value in current.items() if key != 'attempt'),
                f'{name}: wrong source or workflow run')
        require(type(saved.get('attempt')) is int and 0 < saved['attempt'] <= current['attempt'],
                f'{name}: invalid attempt')
        require(saved.get('partition') == name and saved.get('root') == str(root.resolve())
                and saved.get('toolchain') == toolchain
                and saved.get('registry') == digest(root / 'scripts/testing/suites.json'),
                f'{name}: incompatible source paths, toolchain or registry')
        files = saved.get('files', {})
        require(isinstance(files, dict) and bool(files), f'{name}: empty measurement manifest')
        actual = {p.relative_to(folder).as_posix() for p in folder.rglob('*')
                  if p.is_file() and p.name != 'manifest.json'}
        require(set(files) == actual, f'{name}: incomplete measurement inventory')
        groups = set()
        for relative, checksum in files.items():
            path = Path(relative)
            require(len(path.parts) == 2 and path.parts[0] in ('rust', 'python')
                    and '..' not in path.parts and not path.is_absolute(), 'Invalid coverage path')
            source = folder / path
            require(not source.is_symlink() and source.resolve().is_relative_to(folder.resolve())
                    and digest(source) == checksum, f'{name}: changed measurement')
            groups.add(path.parts[0])
            target = root / ('target' if path.parts[0] == 'rust' else 'artifacts') / (
                f'partition-{name}-{path.name}' if path.parts[0] == 'rust' else f'.coverage.{name}.{path.stem}')
            require(not target.exists(), 'Refusing to overwrite an existing measurement')
            pending.append((source, target))
        require(groups == {'rust', 'python'}, f'{name}: missing measurement scope')
    # Validate all partitions before changing the collector's input.
    for source, target in pending:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    (root / 'artifacts/partition-summary.json').write_text(json.dumps({
        **current, 'partitions': list(PARTITIONS), 'profiles': len(pending),
        'toolchain': toolchain,
    }, indent=2) + '\n')


def main():
    import os
    root = Path(__file__).resolve().parents[2]
    toolchain = subprocess.check_output(['rustc', '-vV'], text=True).strip()
    command, *args = sys.argv[1:]
    if command == 'pack' and len(args) == 2:
        pack(root, os.environ, args[0], Path(args[1]), toolchain)
    elif command == 'collect' and len(args) == 1:
        collect(root, os.environ, Path(args[0]), toolchain)
    else:
        raise ValueError('Usage: partition_coverage.py pack PARTITION DIRECTORY | collect DIRECTORY')


if __name__ == '__main__':
    main()
