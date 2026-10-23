"""Negative controls for missing claims and Rust facade escapes without editing the real source tree."""
import json
import shutil
import tempfile
from pathlib import Path
from extract import kernel_source
from layout import check_layout
from modules import KERNEL_ROOT


def controls(root):
    manifest = json.loads((root / 'proof/manifest.json').read_text())
    count = 0
    with tempfile.TemporaryDirectory(prefix='veyndo-formal-layout-') as directory:
        target = Path(directory)
        shutil.copytree(root / 'proof/Commerce', target / 'proof/Commerce')
        shutil.copytree(root / 'crates/kernel/src', target / 'crates/kernel/src')
        check_layout(target, manifest)
        kernel_source(target)
        def rejected(file, change, check):
            nonlocal count
            path = target / file
            original = path.read_text()
            try:
                path.write_text(change(original))
                try:
                    check()
                except ValueError:
                    count += 1
                else:
                    raise AssertionError('Invalid proof/module layout accepted: ' + file)
            finally:
                path.write_text(original)
        for extra in ['mod hidden;', '#[cfg(feature = "other")]\n',
                      'pub use access::*;', '#[path="../other.rs"]\n']:
            rejected(KERNEL_ROOT, lambda s, extra=extra: extra + s, lambda: kernel_source(target))
        rejected('crates/kernel/src/verified_kernel/agents.rs',
                 lambda s: s.replace('planning_request_admissible', 'renamed_request'),
                 lambda: kernel_source(target))
        rejected('proof/Commerce/Claims.lean',
                 lambda s: s.replace('import Commerce.Claims.Agents\n', ''),
                 lambda: check_layout(target, manifest))
        claim = 'proof/Commerce/Claims/Agents.lean'
        for change in [lambda s: s + '\n' * 321,
                       lambda s: s + '\ntheorem unregistered : True := by trivial\n',
                       lambda s: s.replace('theorem planning_request_exact', 'theorem renamed'),
                       lambda s: s.replace('import Commerce.Generated', 'import Commerce.Claims.Access')]:
            rejected(claim, change, lambda: check_layout(target, manifest))
    return count
