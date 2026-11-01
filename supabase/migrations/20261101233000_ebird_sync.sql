-- ============================================
-- The nightly eBird sync: Laurie's yes, and a log of each run
-- ============================================
-- Run after 20261101231500_life_list.sql (docs/DATABASE.md).
-- A scheduled job (GitHub Actions, .github/workflows/sync-ebird.yml) signs in to
-- eBird as Laurie and brings her new checklists into bird_sightings. It does so
-- only while her own yes is recorded here, and it keeps a log of every run so a
-- rejected sign-in is never tried again within a day.

-- Her yes: a row only Laurie's own sign-in can write, for the source it covers.
create table public.sync_consents (
  source text primary key check (source in ('ebird')),
  said_yes_by uuid not null references public.family_members (id) on delete cascade,
  said_at timestamptz not null default now()
);
alter table public.sync_consents enable row level security;
create policy consents_read on public.sync_consents for select to authenticated using ((select public.is_parent()));
create policy consents_add on public.sync_consents for insert to authenticated with check (said_yes_by = (select public.my_member_id()));
create policy consents_change on public.sync_consents for update to authenticated using (said_yes_by = (select public.my_member_id())) with check (said_yes_by = (select public.my_member_id()));
create policy consents_remove on public.sync_consents for delete to authenticated using (said_yes_by = (select public.my_member_id()));

-- Each run: written BEFORE the job signs in, finished after, so a crash after the
-- password was typed still leaves a 'started' row the next run must respect.
create table public.bird_sync_runs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null default 'scheduled' check (kind in ('scheduled', 'manual', 'discover')),
  status text not null default 'started' check (status in ('started', 'ok', 'login_rejected', 'failed', 'skipped')),
  checklists int not null default 0,
  sightings int not null default 0,
  note text check (note is null or length(note) <= 300),
  finished_at timestamptz
);
create index bird_sync_runs_recent on public.bird_sync_runs (at desc);
alter table public.bird_sync_runs enable row level security;
create policy sync_runs_read on public.bird_sync_runs for select to authenticated using ((select public.is_parent()));
-- No insert, update or delete policy: only the job (the service role) writes a run.

revoke all on public.sync_consents, public.bird_sync_runs from anon;
grant select, insert, update, delete on public.sync_consents to authenticated;
grant select on public.bird_sync_runs to authenticated;
