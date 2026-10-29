import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('inspect_archive', Path(__file__).with_name('inspect_archive.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ArchiveTests(unittest.TestCase):
    def make_zip(self, records, extra=None):
        temporary = tempfile.NamedTemporaryFile(suffix='.zip', delete=False)
        temporary.close()
        self.addCleanup(Path(temporary.name).unlink)
        with zipfile.ZipFile(temporary.name, 'w') as z:
            z.writestr('LICENSE.md', 'license')
            z.writestr('ATTRIBUTION.md', 'credit')
            z.writestr('free.en.json', json.dumps({'source': 'repdb-free', 'schema_version': 3, 'locale': 'en', 'exercises': records}))
            z.writestr('images/flat/squat-main.webp', b'RIFF\x04\0\0\0WEBP')
            for key, value in (extra or {}).items():
                z.writestr(key, value)
        return temporary.name

    def row(self):
        return {'id': 'squat', 'name': 'Squat', 'instructions': ['Stand'], 'images': {'flat': ['main']}}

    def test_inspects_archive_and_hashes(self):
        result = module.inspect_archive(self.make_zip([self.row()]))
        self.assertEqual(result['record_count'], 1)
        self.assertEqual(result['image_count'], 1)
        self.assertEqual(result['license_text'], 'license')
        self.assertEqual(len(result['archive_sha256']), 64)

    def test_rejects_unsafe_paths_and_duplicate_ids(self):
        with self.assertRaisesRegex(ValueError, 'unsafe path'):
            module.inspect_archive(self.make_zip([self.row()], {'../outside': 'x'}))
        with self.assertRaisesRegex(ValueError, 'duplicate exercise'):
            module.inspect_archive(self.make_zip([self.row(), self.row()]))

    def test_rejects_unknown_pose_and_missing_image(self):
        row = self.row()
        row['images']['flat'] = ['premium']
        with self.assertRaisesRegex(ValueError, 'poses'):
            module.inspect_archive(self.make_zip([row]))
        row['images']['flat'] = ['start', 'peak']
        with self.assertRaisesRegex(ValueError, 'Missing file'):
            module.inspect_archive(self.make_zip([row]))


if __name__ == '__main__':
    unittest.main()
