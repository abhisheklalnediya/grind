import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('catalog_validate', Path(__file__).with_name('validate.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SnapshotTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Test')
        self.git('remote', 'add', 'origin', module.SOURCE)
        (self.root / 'images/flat').mkdir(parents=True)
        (self.root / 'LICENSE-DATA.md').write_text('license v1')
        (self.root / 'ATTRIBUTION.md').write_text('credit')
        (self.root / 'images/flat/squat-main.webp').write_bytes(b'RIFF\x04\x00\x00\x00WEBP')
        self.row = {'id': 'squat', 'name_en': 'Squat', 'instructions_en': ['Stand'],
                    'images': {'flat': {'main': 'images/flat/squat-main.webp'}}}
        self.write_data([self.row])
        self.commit()

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args]).decode().strip()

    def write_data(self, rows, count=None):
        (self.root / 'exercises.json').write_text(json.dumps({'schema_version': 3, 'count': len(rows) if count is None else count, 'exercises': rows}))

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture')
        self.revision = self.git('rev-parse', 'HEAD')

    def test_manifest_reads_committed_bytes_and_credit(self):
        (self.root / 'LICENSE-DATA.md').write_text('uncommitted change')
        manifest = module.inspect(self.root, self.revision)
        self.assertEqual(manifest['license_text'], 'license v1')
        self.assertEqual(manifest['actual_count'], 1)
        self.assertEqual(len(manifest['files']), 4)
        self.assertEqual(manifest['files']['images/flat/squat-main.webp']['bytes'], 12)

    def test_requires_full_sha_and_known_origin(self):
        with self.assertRaisesRegex(ValueError, 'full lowercase'):
            module.inspect(self.root, self.revision[:8])
        self.git('remote', 'set-url', 'origin', 'https://example.invalid/repo')
        with self.assertRaisesRegex(ValueError, 'origin'):
            module.inspect(self.root, self.revision)

    def test_rejects_duplicate_and_count_mismatch(self):
        self.write_data([self.row, self.row])
        self.commit()
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            module.inspect(self.root, self.revision)
        self.write_data([self.row], 3)
        self.commit()
        with self.assertRaisesRegex(ValueError, 'count'):
            module.inspect(self.root, self.revision)

    def test_rejects_untrusted_paths_and_invalid_image(self):
        self.row['images']['flat']['main'] = '../premium-samples/evil.webp'
        self.write_data([self.row])
        self.commit()
        with self.assertRaisesRegex(ValueError, 'image path'):
            module.inspect(self.root, self.revision)
        self.row['images']['flat']['main'] = 'images/flat/squat-main.webp'
        self.write_data([self.row])
        (self.root / 'images/flat/squat-main.webp').write_bytes(b'not webp')
        self.commit()
        with self.assertRaisesRegex(ValueError, 'WebP'):
            module.inspect(self.root, self.revision)


if __name__ == '__main__':
    unittest.main()
