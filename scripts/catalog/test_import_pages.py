import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import zipfile

import import_pages


class PageImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.archive = Path(self.temp.name) / 'fixture.zip'
        self.rows = [{'id': 'bench-press' if i == 0 else f'exercise-{i}',
                      'name': f'Exercise {i}', 'primary_muscles': ['chest'], 'category': 'strength'}
                     for i in range(701)]
        self.data = {'exercises': self.rows, 'muscles': {'chest': {'name': 'Chest'}},
                     'equipment': {'barbell': {'name': 'Barbell'}},
                     'enum_labels': {'category': {'strength': 'Strength'}}}

    def write_archive(self):
        with zipfile.ZipFile(self.archive, 'w') as z:
            z.writestr('free.en.json', json.dumps(self.data))
        digest = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        return mock.patch.object(import_pages, 'inspect_archive', return_value={'archive_sha256': digest})

    def test_preserves_source_labels_and_does_not_infer_missing_equipment(self):
        self.rows[1]['equipment'] = 'barbell'
        with self.write_archive():
            digest, entries = import_pages.page_payload(self.archive)
        self.assertEqual(len(entries), 701)
        self.assertEqual(entries[0]['equipment'], 'Unspecified')
        self.assertEqual(entries[1]['equipment'], 'Barbell')
        self.assertEqual(entries[0]['primary_muscle'], 'Chest')
        self.assertNotIn('load_mode', entries[0])
        self.assertEqual(len(digest), 64)

    def test_rejects_duplicate_unknown_and_missing_records(self):
        self.rows[-1]['id'] = 'bench-press'
        with self.write_archive(), self.assertRaisesRegex(ValueError, 'Duplicate'):
            import_pages.page_payload(self.archive)
        self.rows[-1]['id'] = 'exercise-700'
        self.rows[-1]['equipment'] = 'unknown'
        with self.write_archive(), self.assertRaisesRegex(ValueError, 'Unknown'):
            import_pages.page_payload(self.archive)
        self.rows[-1].pop('equipment')
        self.rows[-1]['primary_muscles'] = []
        with self.write_archive(), self.assertRaisesRegex(ValueError, 'Missing primary'):
            import_pages.page_payload(self.archive)
        self.rows.pop()
        self.rows[-1]['primary_muscles'] = ['chest']
        with self.write_archive(), self.assertRaisesRegex(ValueError, '701'):
            import_pages.page_payload(self.archive)

    def test_rejects_archive_changes(self):
        with self.write_archive(), mock.patch.object(import_pages.hashlib, 'sha256') as digest:
            digest.return_value.hexdigest.return_value = 'different'
            with self.assertRaisesRegex(ValueError, 'changed'):
                import_pages.page_payload(self.archive)

    def test_transaction_is_guarded_and_does_not_infer_logging(self):
        with self.write_archive():
            digest, entries = import_pages.page_payload(self.archive)
        sql = import_pages.make_page_sql(digest, entries)
        self.assertTrue(sql.startswith('begin;'))
        self.assertTrue(sql.endswith('commit;'))
        self.assertIn('v_state=\'active\'', sql)
        self.assertIn('Staged record mismatch', sql)
        self.assertIn('null,null,null,false', sql)
        self.assertIn('10000000-0000-4000-8000-000000000001', sql)
        self.assertIn('Active release update requires reviewed reconciliation', sql)
        self.assertIn('Catalog links are incomplete or duplicated', sql)
        with self.assertRaises(ValueError):
            import_pages.make_page_sql('bad', entries)
        with self.assertRaises(ValueError):
            import_pages.make_page_sql(digest, entries[:-1])

    def test_main_defaults_to_dry_run_and_apply_is_explicit(self):
        with self.write_archive(), mock.patch('sys.argv', ['import_pages.py', str(self.archive)]), mock.patch.object(import_pages, 'apply') as apply:
            self.assertEqual(import_pages.main(), 0)
            apply.assert_not_called()
        with self.write_archive(), mock.patch('sys.argv', ['import_pages.py', str(self.archive), '--apply']), mock.patch.object(import_pages, 'apply') as apply:
            self.assertEqual(import_pages.main(), 0)
            apply.assert_called_once()


if __name__ == '__main__':
    unittest.main()
