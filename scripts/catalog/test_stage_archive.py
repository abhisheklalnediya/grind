import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import stage_archive


class StageArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.archive = Path(self.temp.name) / 'sample.zip'
        row = {'id': 'sample', 'name': 'Sample', 'instructions': ['Perform'], 'images': {'flat': ['main']}}
        with zipfile.ZipFile(self.archive, 'w') as z:
            z.writestr('LICENSE.md', 'license')
            z.writestr('ATTRIBUTION.md', 'credit')
            z.writestr('free.en.json', json.dumps({'source': 'repdb-free', 'schema_version': 3, 'locale': 'en', 'exercises': [row]}))
            z.writestr('images/flat/sample-main.webp', b'RIFF\x04\0\0\0WEBP')

    def test_valid_archive_becomes_unapproved_pending_sql(self):
        digest, records = stage_archive.stage_payload(self.archive)
        sql = stage_archive.make_stage_sql(digest, records)
        self.assertEqual(len(records), 1)
        self.assertEqual(len(records[0]['record_hash']), 64)
        self.assertIn("'pending'", sql)
        self.assertIn("state='staged'", sql)
        self.assertIn('r.exercise_id is null', sql)
        self.assertIn('r.release_id=v_release_id', sql)
        self.assertNotIn('release_id=release_id', sql)
        self.assertNotIn('insert into grind.exercises', sql.lower())
        self.assertNotIn('update grind.exercises', sql.lower())
        self.assertNotIn("'approved'", sql)
        self.assertTrue(sql.startswith('begin;'))
        self.assertTrue(sql.endswith('commit;'))

    def test_invalid_hash_and_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            stage_archive.make_stage_sql('bad', [{'source_id': 'sample'}])
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            stage_archive.make_stage_sql('a' * 64, [{'source_id': 'x'}, {'source_id': 'x'}])

    def test_dry_run_never_invokes_database_and_apply_uses_guarded_boundary(self):
        with patch('sys.argv', ['stage_archive.py', str(self.archive)]), patch.object(stage_archive, 'apply') as apply:
            self.assertEqual(stage_archive.main(), 0)
            apply.assert_not_called()
        with patch('sys.argv', ['stage_archive.py', str(self.archive), '--apply']), patch.object(stage_archive, 'apply') as apply:
            self.assertEqual(stage_archive.main(), 0)
            self.assertIn('grind_private.exercise_source_records', apply.call_args.args[0])


if __name__ == '__main__':
    unittest.main()
