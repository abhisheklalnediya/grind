import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import publish_hosted


class HostedPublisherTests(unittest.TestCase):
    def test_release_rejects_unapproved_archive_hash_before_building_sql(self):
        manifest = {'archive_sha256': 'b' * 64, 'schema_version': 3,
                    'record_count': 701, 'image_count': 1217}
        with mock.patch.object(publish_hosted.inspect_archive, 'inspect_archive', return_value=manifest), \
             mock.patch.object(publish_hosted.stage_archive, 'stage_payload') as stage:
            with self.assertRaisesRegex(ValueError, 'not the approved'):
                publish_hosted.release_statements(Path('changed.zip'))
            stage.assert_not_called()

    def test_migration_history_requires_each_local_version_to_match_remote(self):
        output = '''Local | Remote | Time (UTC)
20261025180000 | 20261025180000 | now
20261027180000 | 20261027180000 | now
'''
        with mock.patch.object(publish_hosted.subprocess, 'run', return_value=mock.Mock(returncode=0, stdout=output)):
            with mock.patch.object(Path, 'glob', return_value=[Path('20261025180000_grind_a.sql'), Path('20261027180000_grind_b.sql')]):
                self.assertTrue(publish_hosted.migration_history_matches())
        with mock.patch.object(publish_hosted.subprocess, 'run', return_value=mock.Mock(returncode=0, stdout=output.replace('20261027180000 | 20261027180000', '20261027180000 | '))):
            with mock.patch.object(Path, 'glob', return_value=[Path('20261025180000_grind_a.sql'), Path('20261027180000_grind_b.sql')]):
                self.assertFalse(publish_hosted.migration_history_matches())

    def test_only_fresh_staged_or_exact_imported_state_is_accepted(self):
        fresh = {'active_global': 7, 'configured_global': 7, 'active_provider': 0,
                 'source_records': 0, 'source_links': 0, 'repdb_releases': 0,
                 'matching_staged_releases': 0, 'matching_active_releases': 0,
                 'matching_records': 0, 'matching_pending_records': 0,
                 'matching_approved_records': 0, 'approved_links': 0}
        self.assertTrue(publish_hosted.release_state_is_safe(fresh))
        staged = {**fresh, 'source_records': 701, 'repdb_releases': 1,
                  'matching_staged_releases': 1, 'matching_records': 701,
                  'matching_pending_records': 701}
        self.assertTrue(publish_hosted.release_state_is_safe(staged))
        imported = {**fresh, 'active_global': 701, 'configured_global': 204,
                    'active_provider': 700, 'source_records': 701, 'source_links': 701,
                    'repdb_releases': 1, 'matching_active_releases': 1,
                    'matching_records': 701, 'matching_approved_records': 701,
                    'approved_links': 701}
        self.assertTrue(publish_hosted.release_state_is_safe(imported))
        imported['source_links'] = 700
        self.assertFalse(publish_hosted.release_state_is_safe(imported))

    def test_final_counts_are_exact_and_reject_unreviewed_equipment(self):
        counts = {'active_global': 701, 'configured_global': 204, 'active_provider': 700,
                  'configured_provider': 203, 'unconfigured_provider': 497,
                  'source_records': 701, 'approved_links': 701, 'active_releases': 1,
                  'barbell': 76, 'smith_machine': 19, 'dumbbell': 88,
                  'ez_curl_bar': 21, 'other_configured': 0}
        self.assertTrue(publish_hosted.final_counts_are_expected(counts))
        self.assertFalse(publish_hosted.final_counts_are_expected({**counts, 'other_configured': 1}))

    def test_sql_file_is_private_and_query_output_parses_one_result_row(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            with mock.patch.object(publish_hosted.subprocess, 'run', return_value=mock.Mock(returncode=0, stdout=json.dumps({'rows': [{'ok': 1}]}))):
                self.assertEqual(publish_hosted.query_json('select 1'), {'ok': 1})

            with mock.patch.object(publish_hosted.subprocess, 'run', return_value=mock.Mock(returncode=0)) as run:
                publish_hosted.run_file('select 1;', directory, 1)
                sql_file = Path(run.call_args.args[0][5])
                self.assertEqual(sql_file.read_text(), 'select 1;')
                self.assertEqual(sql_file.stat().st_mode & 0o777, 0o600)

    def test_dry_run_does_not_contact_supabase(self):
        manifest = {'archive_sha256': 'a' * 64, 'schema_version': 3,
                    'record_count': 701, 'image_count': 1217}
        with mock.patch.object(publish_hosted, 'project_ref', return_value=publish_hosted.PROJECT_REF), \
             mock.patch.object(publish_hosted, 'release_statements', return_value=(manifest, [])), \
             mock.patch.object(publish_hosted.subprocess, 'run') as run, \
             mock.patch('sys.argv', ['publish_hosted.py', 'archive.zip']):
            self.assertEqual(publish_hosted.main(), 0)
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
