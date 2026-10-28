"""Safety/transform tests for the disposable local runner; no Docker operations."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('grind_local', Path(__file__).with_name('local.py'))
local = importlib.util.module_from_spec(spec)
spec.loader.exec_module(local)


class LocalHarnessTests(unittest.TestCase):
    def test_prepare_copies_sources_and_isolates_configuration(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            source = base / 'source'
            source.mkdir()
            for name in ('migrations', 'tests'):
                (source / name).mkdir()
                (source / name / ('20261025180000_one.sql' if name == 'migrations' else 'one.sql')).write_text('select 1;')
            original = ('project_id = "babyBoo"\nport = 54421\n'
                        'schemas = ["public", "graphql_public"]\n'
                        'additional_redirect_urls = ["https://old"]\n'
                        '[auth.email]\nenable_confirmations = false\n[other]\n')
            (source / 'config.toml').write_text(original)
            root = base / 'root'
            root.mkdir()
            with patch.object(local, 'ROOT', root), patch.object(local, 'SOURCE', source), \
                    patch.object(local, 'STATE', root / '.expo' / 'state.json'), \
                    contextlib.redirect_stdout(io.StringIO()):
                local.prepare()
                work = local.target()
                config = (work / 'supabase' / 'config.toml').read_text()
                self.assertIn('port = 55421', config)
                self.assertIn('"grind"', config)
                self.assertIn('enable_confirmations = true', config)
                self.assertIn('grind://auth/callback', config)
                self.assertEqual((source / 'config.toml').read_text(), original)
                self.assertEqual((work / 'supabase' / 'migrations' / '20261025180000_one.sql').read_text(), 'select 1;')
                local.prepare()
                self.assertEqual(local.target(), work)
                (source / 'migrations' / '20261025180000_one.sql').write_text('select 2;')
                with self.assertRaisesRegex(SystemExit, 'Source/snapshot SQL changed'):
                    local.target()

    def test_refuses_unmarked_linked_or_wrong_project_targets(self):
        with tempfile.TemporaryDirectory(prefix='grind-m1-') as folder:
            work = Path(folder)
            state = work / 'state.json'
            state.write_text(json.dumps({'workdir': str(work)}))
            with patch.object(local, 'STATE', state):
                with self.assertRaisesRegex(SystemExit, 'unrecognized'):
                    local.target()
                (work / local.MARKER).write_text(local.PROJECT)
                (work / 'supabase').mkdir()
                config = work / 'supabase' / 'config.toml'
                config.write_text('project_id = "babyBoo"\nport = 54421')
                with self.assertRaisesRegex(SystemExit, 'unexpected'):
                    local.target()
                config.write_text(f'project_id = "{local.PROJECT}"\nport = 55421')
                (work / 'supabase' / '.temp').mkdir()
                (work / 'supabase' / '.temp' / 'project-ref').write_text('hosted-ref')
                with self.assertRaisesRegex(SystemExit, 'linked'):
                    local.target()

    def test_grind_suite_runs_all_grind_files_only(self):
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            tests = work / 'supabase' / 'tests'
            tests.mkdir(parents=True)
            for name in ('grind_foundation.sql', 'grind_training.sql', 'care.sql', 'bootstrap.sql'):
                (tests / name).write_text(name)
            with patch.object(local, 'target', return_value=work), patch.object(local, 'run') as run, \
                    contextlib.redirect_stdout(io.StringIO()):
                local.test(grind_only=True)
            executed = [call.kwargs.get('sql') for call in run.call_args_list]
            self.assertIn('grind_foundation.sql', executed)
            self.assertIn('grind_training.sql', executed)
            self.assertNotIn('care.sql', executed)
            self.assertNotIn('bootstrap.sql', executed)

    def test_local_environment_contains_only_public_config(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            hosted = root / '.env.local'
            hosted.write_text('unchanged hosted fixture')
            output = ('API_URL="http://127.0.0.1:55421"\nANON_KEY="public-fixture"\n'
                      'SERVICE_ROLE_KEY="never-copy"\nJWT_SECRET="never-copy"\n')
            with patch.object(local, 'ROOT', root), patch.object(local, 'cli', return_value=['status']), \
                    patch.object(local, 'run', return_value=output), \
                    contextlib.redirect_stdout(io.StringIO()):
                local.public_environment()
                text = (root / '.env.development.local').read_text()
                self.assertIn('public-fixture', text)
                self.assertNotIn('never-copy', text)
                self.assertEqual(hosted.read_text(), 'unchanged hosted fixture')
                self.assertEqual((root / '.env.development.local').stat().st_mode & 0o777, 0o600)
                (root / '.env.development.local').write_text('user override')
                with self.assertRaisesRegex(SystemExit, 'refusing to overwrite'):
                    local.public_environment()


if __name__ == '__main__':
    unittest.main()
