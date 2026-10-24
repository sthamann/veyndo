"""CI routing regressions exercise real Git renames, missing history and sensitive mixed changes."""
import subprocess
import json
import os
import shlex
import sys
import tempfile
import unittest
from pathlib import Path, PurePosixPath
from ci_scope import classify, classify_images, changed_paths, plan

IMAGE_DOCS = ['README.md', 'AGENTS.md', 'CHANGELOG.md', 'docs/testing.md',
              'docs/evidence/release.json', 'site/style.css', 'site/requirements.txt',
              'scripts/build_site.py', 'scripts/check_site.py', 'scripts/site/pages.py']


class ScopeTests(unittest.TestCase):
    def test_docs_and_rendering_tools(self):
        self.assertEqual(classify(['README.md', 'docs/testing.md', 'site/pages/index.html',
                                   'scripts/build_site.py', 'docs/evidence/release.json']), 'docs')

    def test_ui_and_docs(self):
        self.assertEqual(classify(['frontend/src/admin/intelligence/KnowledgeView.tsx',
                                   'frontend/tests/unit/knowledge.test.tsx',
                                   'extensions/apps/site-builder/studio/ShopDesigner.tsx',
                                   'docs/testing.md']), 'frontend')

    def test_sensitive_and_unknown_changes(self):
        for path in ['src/auth.rs', 'migrations/103.sql', 'Cargo.lock',
                     '.github/workflows/verify.yml', 'scripts/testing/ci_scope.py',
                     'frontend/package-lock.json', 'frontend/scripts/localization.mjs',
                     'frontend/tests/browser_sessions.mjs', 'prompts/merchant.md',
                     'crates/cognition/prompts/planner.md',
                     'extensions/apps/site-builder/manifest.json',
                     'extensions/apps/site-builder/renderer/Block.tsx',
                     'frontend/src/shared/api/request-json.ts',
                     'frontend/src/admin/shell/requests.ts',
                     'frontend/src/admin/team/UsersManager.tsx',
                     'frontend/src/admin/pos/RegisterCheckout.tsx',
                     'frontend/src/storefront/account/AccountDownloads.tsx',
                     'frontend/src/storefront/legal/CheckoutLegal.tsx',
                     'frontend/src/storefront/checkout/Checkout.tsx']:
            with self.subTest(path=path):
                self.assertEqual(classify(['docs/testing.md', path]), 'full')
        self.assertEqual(classify([]), 'full')

    def test_missing_diff_and_manual_event(self):
        self.assertEqual(plan('.', 'push', {}, None)[0], 'full')
        self.assertEqual(plan('.', 'workflow_dispatch', {}, None)[0], 'full')
        self.assertEqual(plan('.', 'schedule', {}, None)[0], 'full')
        self.assertEqual(plan('.', 'pull_request', {}, None)[0], 'full')
        self.assertEqual(plan('.', 'push', {'before':'f'*40}, 'e'*40)[0], 'full')

    def test_only_unpackaged_docs_skip_images(self):
        self.assertEqual(classify_images(IMAGE_DOCS), 'docs')
        for path in ['LICENSE', 'THIRD_PARTY.md', 'frontend/README.md',
                     'src/AGENTS.md', 'extensions/apps/migration/README.md',
                     'frontend/src/admin/intelligence/KnowledgeView.tsx',
                     'frontend/package-lock.json', 'Cargo.lock', 'fixtures/licenses/image.txt',
                     'crates/cognition/prompts/planner.md', 'reference/app-manifests/app.json',
                     'scripts/try.sh', 'compose.try.yaml', 'deploy/Dockerfile',
                     'extensions/apps/migration/Dockerfile', '.dockerignore',
                     '.github/workflows/preview-image.yml', 'new-owner/README.md']:
            with self.subTest(path=path):
                self.assertEqual(classify_images([*IMAGE_DOCS, path]), 'full')
        self.assertEqual(classify_images([]), 'full')

    def test_actual_image_copy_contract_keeps_skipped_paths_outside_images(self):
        root = Path(__file__).resolve().parents[2]
        for image in ['deploy/Dockerfile', 'extensions/apps/migration/Dockerfile']:
            for line in (root / image).read_text().splitlines():
                if not line.startswith('COPY ') or line.startswith('COPY --from='):
                    continue
                # These images deliberately use explicit, plain COPY sources.
                # New broad COPY inputs require reviewing the skip contract too.
                sources = shlex.split(line)[1:-1]
                self.assertTrue(sources)
                for source in sources:
                    self.assertFalse(source.startswith(('[', '--')))
                    for doc in IMAGE_DOCS:
                        with self.subTest(image=image, source=source, doc=doc):
                            self.assertFalse(PurePosixPath(doc).is_relative_to(source))
                            self.assertFalse(PurePosixPath(doc).match(source))

    def test_image_manual_or_missing_history_always_builds(self):
        for event in ['workflow_dispatch', 'schedule', 'unknown', 'pull_request', 'push']:
            self.assertEqual(plan('.', event, {}, None, images=True)[0], 'full')
        self.assertEqual(plan('.', 'push', {'before':'f'*40}, 'e'*40, images=True)[0], 'full')

    def test_actual_git_deletion_and_rename_cannot_hide_backend(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-C', directory, *args],
                                               stderr=subprocess.DEVNULL, text=True).strip()
            git('init'); git('config', 'user.name', 'Synthetic CI test')
            git('config', 'user.email', 'ci@example.test')
            (repo/'src').mkdir(); (repo/'src/core.rs').write_text('original source\n')
            git('add', '.'); git('commit', '-m', 'base'); base = git('rev-parse', 'HEAD')
            (repo/'docs').mkdir(); (repo/'src/core.rs').rename(repo/'docs/README.md')
            git('add', '-A'); git('commit', '-m', 'rename'); head = git('rev-parse', 'HEAD')
            paths = changed_paths(repo, base, head)
            self.assertIn('src/core.rs', paths)
            self.assertEqual(plan(repo, 'push', {'before':base}, head)[0], 'full')
            self.assertEqual(plan(repo, 'push', {'before':base}, head, images=True)[0], 'full')
            (repo/'docs/README.md').write_text('docs only\n')
            git('add', '.'); git('commit', '-m', 'docs'); tip = git('rev-parse', 'HEAD')
            self.assertEqual(plan(repo, 'pull_request', {'pull_request':{'base':{'sha':head}}}, tip)[0], 'docs')
            self.assertEqual(plan(repo, 'push', {'before':base}, tip)[0], 'full')
            self.assertEqual(plan(repo, 'push', {'before':head}, tip, images=True)[0], 'docs')
            self.assertEqual(plan(repo, 'push', {'before':base}, tip, images=True)[0], 'full')
            event = repo/'event.json'
            event.write_text(json.dumps({'pull_request':{'base':{'sha':head}}}))
            output, summary = repo/'output', repo/'summary'
            subprocess.run([sys.executable, str(Path(__file__).with_name('ci_scope.py').resolve())],
                cwd=repo, check=True, capture_output=True, env={**os.environ,
                'GITHUB_EVENT_NAME':'pull_request', 'GITHUB_SHA':tip,
                'GITHUB_EVENT_PATH':str(event), 'GITHUB_OUTPUT':str(output),
                'GITHUB_STEP_SUMMARY':str(summary)})
            self.assertEqual(output.read_text(), 'lane=docs\n')
            self.assertIn('Verification scope: docs', summary.read_text())
            subprocess.run([sys.executable, str(Path(__file__).with_name('ci_scope.py').resolve()), '--images'],
                cwd=repo, check=True, capture_output=True, env={**os.environ,
                'GITHUB_EVENT_NAME':'push', 'GITHUB_SHA':tip,
                'GITHUB_EVENT_PATH':str(event), 'GITHUB_OUTPUT':str(output),
                'GITHUB_STEP_SUMMARY':str(summary)})
            # A PR event payload supplied to a push has no valid base: never skip.
            self.assertTrue(output.read_text().endswith('lane=full\n'))
            event.write_text(json.dumps({'before':head}))
            subprocess.run([sys.executable, str(Path(__file__).with_name('ci_scope.py').resolve()), '--images'],
                cwd=repo, check=True, capture_output=True, env={**os.environ,
                'GITHUB_EVENT_NAME':'push', 'GITHUB_SHA':tip,
                'GITHUB_EVENT_PATH':str(event), 'GITHUB_OUTPUT':str(output),
                'GITHUB_STEP_SUMMARY':str(summary)})
            self.assertTrue(output.read_text().endswith('lane=docs\n'))
            self.assertIn('No image build or publication', summary.read_text())


if __name__ == '__main__':
    unittest.main()
