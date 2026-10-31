-- ============================================
-- Foundations: the family, and the calendar's sources
-- ============================================
-- Run once in the Supabase SQL editor (or with `supabase db push`).
-- Every table has row-level security, and nothing is readable without signing
-- in as one of the family. New tables are not exposed automatically in this
-- project, so each one is granted here, explicitly, to signed-in users only.
-- Never `using (true)`: a signed-in stranger must see nothing.

-- ---- The family -------------------------------------------------------------
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- The address each of us signs in with. Added in the SQL editor, never in
  -- the repository (docs/DATABASE.md).
  email text unique,
  role text not null check (role in ('parent', 'child')),
  colour text,
  created_at timestamptz not null default now()
);

-- Who is signed in, judged from the verified email on their sign-in.
create or replace function public.is_family() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members m
    where m.email is not null and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

create or replace function public.is_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_members m
    where m.role = 'parent' and m.email is not null and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;

revoke execute on function public.is_family() from public, anon;
revoke execute on function public.is_parent() from public, anon;
grant execute on function public.is_family() to authenticated;
grant execute on function public.is_parent() to authenticated;

-- ---- Sources: every outside calendar, document, folder or feed the app reads ----
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  kind text not null check (kind in (
    'google_calendar', 'ical', 'pdf', 'word', 'google_doc', 'google_sheet',
    'drive_folder', 'web_page', 'image', 'email', 'groupme', 'other'
  )),
  url text check (url is null or length(url) <= 2000),
  file_path text,                      -- an uploaded file, in storage
  purpose text not null default 'calendar' check (purpose in ('calendar', 'other')),
  for_whom uuid references public.family_members (id) on delete set null,  -- null: the whole family
  covers_from date,
  covers_until date,                   -- when it goes stale and needs rolling over
  remind_days int not null default 30 check (remind_days between 0 and 365),
  last_checked_at timestamptz,
  last_status text,
  notes text check (notes is null or length(notes) <= 4000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (covers_until is null or covers_from is null or covers_until >= covers_from)
);

-- Each time a source is read, a version is kept: a new year's calendar never
-- silently deletes the old one's events.
create table public.source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  url text,
  file_path text,
  fetched_at timestamptz not null default now(),
  content_hash text,
  events_found int,
  note text
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources (id) on delete set null,
  version_id uuid references public.source_versions (id) on delete set null,
  external_id text,                    -- the feed's own id, so a re-read updates rather than duplicates
  title text not null check (length(title) between 1 and 300),
  starts_on date not null,
  ends_on date not null,
  starts_at timestamptz,
  ends_at timestamptz,
  kind text not null default 'event' check (kind in ('event', 'no_school', 'school', 'ministry', 'family', 'show', 'holiday', 'other')),
  for_whom uuid references public.family_members (id) on delete set null,
  -- Read from a document or picture: proposed until someone approves it.
  status text not null default 'approved' check (status in ('proposed', 'approved', 'hidden')),
  notes text,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (source_id, external_id)
);

-- Birthdays, anniversaries, Anna's adoption day, the angelversary.
create table public.family_days (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  month int not null check (month between 1 and 12),
  day int not null check (day between 1 and 31),
  year int check (year between 1900 and 2200),
  kind text not null default 'celebrate' check (kind in ('celebrate', 'remember')),
  for_whom uuid references public.family_members (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end
$$;
create trigger sources_touch before update on public.sources for each row execute function public.touch_updated_at();

-- ---- Row-level security -------------------------------------------------------
alter table public.family_members enable row level security;
alter table public.sources enable row level security;
alter table public.source_versions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.family_days enable row level security;

-- The family sees the family. Members are added in the SQL editor only.
create policy family_members_read on public.family_members for select to authenticated using ((select public.is_family()));

-- Sources: the family reads them; parents add, change and remove them.
create policy sources_read on public.sources for select to authenticated using ((select public.is_family()));
create policy sources_add on public.sources for insert to authenticated with check ((select public.is_parent()));
create policy sources_change on public.sources for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy sources_remove on public.sources for delete to authenticated using ((select public.is_parent()));

-- Versions are history: read and added, never changed.
create policy versions_read on public.source_versions for select to authenticated using ((select public.is_family()));
create policy versions_add on public.source_versions for insert to authenticated with check ((select public.is_parent()));

-- Events: anyone in the family adds and changes them; parents remove them.
create policy events_read on public.calendar_events for select to authenticated using ((select public.is_family()));
create policy events_add on public.calendar_events for insert to authenticated with check ((select public.is_family()));
create policy events_change on public.calendar_events for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy events_remove on public.calendar_events for delete to authenticated using ((select public.is_parent()));

-- Family days: the family reads them; parents keep them.
create policy days_read on public.family_days for select to authenticated using ((select public.is_family()));
create policy days_add on public.family_days for insert to authenticated with check ((select public.is_parent()));
create policy days_change on public.family_days for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy days_remove on public.family_days for delete to authenticated using ((select public.is_parent()));

-- ---- Grants: signed-in users only, never the anonymous key --------------------
revoke all on public.family_members, public.sources, public.source_versions, public.calendar_events, public.family_days from anon;
grant select on public.family_members to authenticated;
grant select, insert, update, delete on public.sources to authenticated;
grant select, insert on public.source_versions to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.family_days to authenticated;
