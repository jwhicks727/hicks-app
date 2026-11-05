-- ============================================
-- A journal kept in step with its writer's Google Doc
-- ============================================
-- Run after 20261105040000_annas_gallery.sql (docs/DATABASE.md).
-- Each person may link their journal to one Google Doc of their own. The sync
-- runs only in their browser with their own Google sign-in (src/lib/journalDoc.js):
-- no Edge Function reads the Doc or these tables. What it keeps here is which Doc,
-- where the days in it stop, when the two last agreed, days deleted here since,
-- and each day's fingerprint as the two last agreed it. All of it sits on the
-- journal's own tables, whose policies are already the writer's only
-- (20261101090000_journal.sql): no new policy, no new grant. Every column is added
-- only if it isn't there yet, so running this file again is harmless.

alter table public.journal_settings
  add column if not exists doc_id text check (doc_id is null or doc_id ~ '^[A-Za-z0-9_-]{20,128}$'),  -- the Doc's id, as Google's picker gives it
  add column if not exists doc_title text check (doc_title is null or length(doc_title) <= 300),
  add column if not exists doc_stop text check (doc_stop is null or length(doc_stop) <= 300),          -- the line the days stop above (a stash kept below them)
  add column if not exists doc_synced_at timestamptz,                                                   -- when the two last agreed; null until the first sync
  add column if not exists doc_removed date[] not null default '{}' check (coalesce(array_length(doc_removed, 1), 0) <= 500), -- days deleted here since, asked about at the next sync
  add column if not exists doc_ahead boolean not null default false;                                     -- begin tomorrow's page in the Doc once today has words, as the writer does

alter table public.journal_entries
  add column if not exists doc_hash text check (doc_hash is null or doc_hash ~ '^[0-9a-f]{64}$'),      -- the day's fingerprint in the Doc when the two last agreed
  add column if not exists app_hash text check (app_hash is null or app_hash ~ '^[0-9a-f]{64}$');      -- and here
