-- Preserve Git revision identities while allowing downloaded archive SHA-256 identities.
begin;
alter table grind_private.catalog_releases add column revision_kind text not null default 'git_commit'
 check (revision_kind in ('git_commit','archive_sha256'));
alter table grind_private.catalog_releases drop constraint catalog_releases_revision_check;
alter table grind_private.catalog_releases add constraint catalog_releases_revision_format_check check (
 (revision_kind='git_commit' and revision ~ '^[0-9a-f]{40}$') or
 (revision_kind='archive_sha256' and revision ~ '^[0-9a-f]{64}$')
);
commit;
