import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import import_reviewed
import review_import


class ReviewImportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.archive = Path(self.tmp.name) / 'catalog.zip'
        self.row = {'id': 'bench-press', 'name': 'Bench Press', 'instructions': ['Press'],
                    'images': {'flat': ['main']}, 'category': 'strength', 'equipment': 'barbell'}
        with zipfile.ZipFile(self.archive, 'w') as archive:
            archive.writestr('LICENSE.md', 'license')
            archive.writestr('ATTRIBUTION.md', 'credit')
            archive.writestr('free.en.json', json.dumps({'source': 'repdb-free', 'schema_version': 3,
                                                         'locale': 'en', 'exercises': [self.row]}))
            archive.writestr('images/flat/bench-press-main.webp', b'RIFF\x04\0\0\0WEBP')
        self.sheet = review_import.build_sheet(self.archive)

    def approve(self):
        self.sheet['reviewer'] = 'Review owner'
        entry = self.sheet['entries'][0]
        entry['reviewed'] = True
        entry['decision'] = {'tracking_type': 'reps', 'load_mode': 'external',
                             'load_convention': 'Total barbell weight', 'primary_muscle': 'Chest',
                             'equipment': 'Barbell', 'category': 'Strength',
                             'existing_id': review_import.SEED_MATCHES['bench-press']}

    def test_proposals_are_not_approval_and_identify_seed(self):
        entry = self.sheet['entries'][0]
        self.assertFalse(entry['reviewed'])
        self.assertEqual(entry['proposal']['existing_id'], review_import.SEED_MATCHES['bench-press'])
        self.assertEqual(entry['proposal']['tracking_type'], 'reps')
        self.assertEqual(review_import.summary(self.sheet)['approved'], 0)
        with self.assertRaisesRegex(ValueError, 'reviewer'):
            import_reviewed.reviewed_entries(self.archive, self.sheet)

    def test_requires_complete_bound_validated_decisions(self):
        self.approve()
        digest, entries = import_reviewed.reviewed_entries(self.archive, self.sheet)
        self.assertEqual(digest, self.sheet['archive_sha256'])
        self.assertEqual(entries[0]['tracking_type'], 'reps')
        self.sheet['entries'][0]['record_hash'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'changed source'):
            import_reviewed.reviewed_entries(self.archive, self.sheet)
        self.sheet['entries'][0]['record_hash'] = review_import.build_sheet(self.archive)['entries'][0]['record_hash']
        self.sheet['entries'][0]['reviewed'] = False
        with self.assertRaisesRegex(ValueError, 'Unreviewed'):
            import_reviewed.reviewed_entries(self.archive, self.sheet)
        self.sheet['entries'][0]['reviewed'] = True
        self.sheet['entries'][0]['decision']['tracking_type'] = 'unknown'
        with self.assertRaisesRegex(ValueError, 'tracking'):
            import_reviewed.reviewed_entries(self.archive, self.sheet)
        self.sheet['archive_sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'does not match'):
            import_reviewed.reviewed_entries(self.archive, self.sheet)

    def test_rejects_missing_fields_and_bench_identity_change(self):
        self.approve()
        decision = self.sheet['entries'][0]['decision']
        decision['existing_id'] = None
        with self.assertRaisesRegex(ValueError, 'bench-press seed UUID'):
            import_reviewed.reviewed_entries(self.archive, self.sheet)
        decision['existing_id'] = review_import.SEED_MATCHES['bench-press']
        decision['equipment'] = ''
        with self.assertRaisesRegex(ValueError, 'equipment'):
            import_reviewed.reviewed_entries(self.archive, self.sheet)
        self.sheet['entries'] = []
        with self.assertRaisesRegex(ValueError, 'cover every record'):
            import_reviewed.reviewed_entries(self.archive, self.sheet)

    def test_sql_encodes_input_and_retains_referenced_ids(self):
        self.approve()
        self.sheet['entries'][0]['decision']['equipment'] = "'; drop schema grind; --"
        digest, entries = import_reviewed.reviewed_entries(self.archive, self.sheet)
        sql = import_reviewed.make_sql(digest, entries)
        self.assertNotIn("'; drop schema grind; --", sql)
        self.assertIn('import_reviewed_exercises', sql)
        self.assertIn('set archived_at=coalesce', sql)
        self.assertNotIn('delete from grind.exercises', sql)
        self.assertTrue(sql.startswith('begin;'))
        self.assertTrue(sql.endswith('commit;'))

    def test_publication_requires_matching_complete_pending_snapshot(self):
        self.approve()
        digest, entries = import_reviewed.reviewed_entries(self.archive, self.sheet)
        sql = import_reviewed.make_sql(digest, entries)
        self.assertIn("state in ('staged','active')", sql)
        self.assertIn("release_state='staged' and r.rights_state='pending' and r.exercise_id is null", sql)
        self.assertIn("r.record_hash=row->>'record_hash' and r.raw_payload=row->'raw_payload'", sql)
        self.assertIn('Staged record count mismatch', sql)
        self.assertIn("set rights_state='approved'", sql)
        self.assertIn("set state='active'", sql)
        self.assertLess(sql.index('Staged record count mismatch'), sql.index("set rights_state='approved'"))
        self.assertLess(sql.index('Staged record mismatch'), sql.index("set rights_state='approved'"))
        self.assertIn('r.release_id=v_release_id', sql)
        self.assertNotIn('release_id=release_id', sql)

    def test_publication_fails_closed_for_release_updates_and_provider_changes(self):
        self.approve()
        digest, entries = import_reviewed.reviewed_entries(self.archive, self.sheet)
        sql = import_reviewed.make_sql(digest, entries)
        self.assertIn("release_state='staged' and exists", sql)
        self.assertIn('Active RepDB release requires a reviewed update workflow', sql)
        self.assertIn("e.origin='provider'", sql)
        for field in ('name', 'primary_muscle', 'equipment', 'category'):
            self.assertIn(f"e.{field} is distinct from row->>'{field}'", sql)
        self.assertLess(sql.index('Existing provider catalog fields differ'), sql.index("set rights_state='approved'"))
        self.assertNotIn("set state='retired'", sql)

    def test_apply_requires_guard_before_docker(self):
        with patch.object(import_reviewed.local, 'target', side_effect=SystemExit('stale')), patch.object(import_reviewed.local, 'run') as run:
            with self.assertRaises(SystemExit):
                import_reviewed.apply('sql')
            run.assert_not_called()
        with patch.object(import_reviewed.local, 'target'), patch.object(import_reviewed.local, 'run') as run:
            import_reviewed.apply('sql')
            self.assertEqual(run.call_args.args[0][2], '-i')
            self.assertEqual(run.call_args.kwargs['sql'], 'sql')

    def test_tracking_heuristics_remain_suggestions(self):
        self.assertEqual(review_import.proposal({'id': 'x', 'category': 'stretching'})['tracking_type'], 'duration')
        self.assertIsNone(review_import.proposal({'id': 'x', 'category': 'cardio'})['tracking_type'])
        self.assertEqual(review_import.proposal({'id': 'x', 'category': 'cardio', 'equipment': 'treadmill'})['tracking_type'], 'distance_duration')
        self.assertIsNone(review_import.proposal({'id': 'x', 'category': 'unrecognized'})['tracking_type'])


if __name__ == '__main__':
    unittest.main()
