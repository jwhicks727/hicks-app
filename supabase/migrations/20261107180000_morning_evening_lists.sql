-- ============================================
-- Morning and evening lists, their streaks, and the family's challenges
-- ============================================
-- Run after 20261105040000_annas_gallery.sql (docs/DATABASE.md).
-- Each of us keeps a morning list and an evening list (Early Bird and Night
-- Owl, unless Admin names them otherwise). A list's words are its keeper's:
-- only the person themselves reads and changes their items, their changes for
-- a day and their ticks, and Jason and Laurie do the same for Anna's. What the
-- family sees of each other is only how each day went (how many were on the
-- list, how many done, when it was finished): `routine_days`, which carries no
-- words at all. The challenges are the family's: everyone reads them, the
-- parents change them in Admin, and anyone's device may plan the next one or
-- say how one ended (the rules are in src/lib/challenges.js).

-- ---- Whose lists the signed-in person keeps ---------------------------------------
-- Their own (every row with their name: a person can sign in with two
-- addresses), and, for a parent, a child's.
create or replace function public.lists_i_keep() returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.family_members m
  where exists (
    select 1 from public.family_members me
    where me.email is not null and lower(me.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (lower(trim(me.name)) = lower(trim(m.name)) or (me.role = 'parent' and m.role = 'child'))
  )
$$;
revoke execute on function public.lists_i_keep() from public, anon;
grant execute on function public.lists_i_keep() to authenticated;

-- ---- The things on a list ---------------------------------------------------------
create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.family_members (id) on delete cascade,
  part text not null check (part in ('morning', 'evening')),
  title text not null check (length(title) between 1 and 120),
  icon text check (icon is null or icon ~ '^[a-z0-9-]{1,30}$'),
  -- Which days it comes up: weekdays (0 Sunday to 6 Saturday), every week or
  -- every other (counted from the week of starts_on), on any day or only on
  -- school days or days off (from the school calendars in Admin).
  weekdays smallint[] not null default '{0,1,2,3,4,5,6}' check (weekdays <@ '{0,1,2,3,4,5,6}'::smallint[] and coalesce(array_length(weekdays, 1), 0) between 1 and 7),
  every_weeks smallint not null default 1 check (every_weeks between 1 and 4),
  school text not null default 'any' check (school in ('any', 'school', 'off')),
  -- Taking turns: each time it comes up, the next of these (bedroom, bathroom, desk).
  turns text[] not null default '{}' check (coalesce(array_length(turns, 1), 0) <= 12 and length(array_to_string(turns, '')) <= 1200),
  starts_on date not null default current_date,
  ends_on date,                          -- for a while only (a season, a week away)
  sort int not null default 0,
  archived_on date,                      -- taken off from this day: kept, so the days before still read right
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index routine_items_by_member on public.routine_items (member_id, part, sort);
create trigger routine_items_touch before update on public.routine_items for each row execute function public.touch_updated_at();

-- ---- A day that's different: something skipped, something added, a day of rest ----------
create table public.routine_changes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.family_members (id) on delete cascade,
  on_date date not null,
  part text not null check (part in ('morning', 'evening')),
  kind text not null check (kind in ('skip', 'add', 'rest')),
  item_id uuid references public.routine_items (id) on delete cascade,
  title text check (title is null or length(title) between 1 and 120),
  note text check (note is null or length(note) <= 80),   -- a rest day's reason: sick, away, a birthday
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'skip' and item_id is not null and title is null)
      or (kind = 'add' and item_id is null and title is not null)
      or (kind = 'rest' and item_id is null and title is null))
);
create unique index routine_changes_one_skip on public.routine_changes (item_id, on_date) where kind = 'skip';
create unique index routine_changes_one_rest on public.routine_changes (member_id, on_date, part) where kind = 'rest';
create index routine_changes_by_day on public.routine_changes (member_id, on_date);

-- ---- Ticks: one per thing done, per day ---------------------------------------------
create table public.routine_ticks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.family_members (id) on delete cascade,
  on_date date not null,
  part text not null check (part in ('morning', 'evening')),
  item_id uuid references public.routine_items (id) on delete cascade,
  change_id uuid references public.routine_changes (id) on delete cascade,   -- something added just for the day
  done_at timestamptz not null default now(),
  done_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  check ((item_id is null) <> (change_id is null))
);
create unique index routine_ticks_item_day on public.routine_ticks (item_id, on_date) where item_id is not null;
create unique index routine_ticks_change on public.routine_ticks (change_id) where change_id is not null;
create index routine_ticks_by_day on public.routine_ticks (member_id, on_date);

-- ---- How each day went, with no words: what streaks, records and challenges read ---------
create table public.routine_days (
  member_id uuid not null references public.family_members (id) on delete cascade,
  on_date date not null,
  part text not null check (part in ('morning', 'evening')),
  status text not null default 'open' check (status in ('open', 'done', 'rest')),
  total smallint not null default 0 check (total between 0 and 100),
  done smallint not null default 0 check (done between 0 and 100),
  first_at timestamptz,                  -- the day's first tick
  done_at timestamptz,                   -- the last one, when the list was finished
  golden boolean not null default false, -- the day's golden feather was found
  -- The streak through this day and the longest ever, worked out by the
  -- keeper's own device (which knows what was on the list), so the family
  -- page and Reports can show them without reading anyone's words.
  streak smallint not null default 0 check (streak between 0 and 10000),
  best smallint not null default 0 check (best between 0 and 10000),
  updated_at timestamptz not null default now(),
  primary key (member_id, on_date, part)
);
create index routine_days_by_date on public.routine_days (on_date);
create trigger routine_days_touch before update on public.routine_days for each row execute function public.touch_updated_at();

-- ---- The lists' family settings: their names, and the challenges (one row) --------------
create table public.routine_settings (
  id boolean primary key default true check (id),
  names text not null default 'birds' check (names ~ '^[a-z-]{1,20}$'),
  challenges_on boolean not null default true,
  pace text not null default 'regular' check (pace in ('relaxed', 'regular', 'lively')),
  updated_at timestamptz not null default now()
);
create trigger routine_settings_touch before update on public.routine_settings for each row execute function public.touch_updated_at();
insert into public.routine_settings (id) values (true) on conflict (id) do nothing;

-- ---- The family's changes to the built-in challenges, and their own ----------------------
-- The built-in challenges are written in src/lib/challenges.js; a row here
-- switches one off or changes its words or numbers, by its key. A row marked
-- custom is a challenge of the family's own.
create table public.family_challenges (
  key text primary key check (key ~ '^[a-z0-9-]{2,60}$'),
  enabled boolean not null default true,
  custom boolean not null default false,
  title text check (title is null or length(title) between 1 and 80),
  blurb text check (blurb is null or length(blurb) <= 300),
  kind text check (kind is null or kind in ('everyone', 'by-time', 'share', 'firsts', 'sun', 'moon')),
  part text check (part is null or part in ('morning', 'evening', 'both')),
  level text check (level is null or level in ('easy', 'medium', 'hard')),
  days smallint check (days is null or days between 1 and 31),
  target smallint check (target is null or target between 1 and 100),
  by_time text check (by_time is null or by_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  updated_at timestamptz not null default now()
);
create trigger family_challenges_touch before update on public.family_challenges for each row execute function public.touch_updated_at();

-- ---- Each challenge the family takes on ----------------------------------------------
create table public.challenge_runs (
  id uuid primary key default gen_random_uuid(),
  challenge_key text not null check (challenge_key ~ '^[a-z0-9-]{2,60}$'),
  -- What it asked, as it was when it was planned (its title, kind, numbers and
  -- who was taking part), so a later change in Admin never rewrites history.
  spec jsonb not null check (jsonb_typeof(spec) = 'object' and length(spec::text) <= 4000),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'won', 'missed', 'cancelled')),
  result jsonb check (result is null or (jsonb_typeof(result) = 'object' and length(result::text) <= 4000)),
  planned_by text not null default 'auto' check (planned_by in ('auto', 'parent')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
-- Two phones planning the same challenge at once: the second is turned away.
create unique index challenge_runs_one_start on public.challenge_runs (starts_on) where status <> 'cancelled';

-- ---- Row-level security ------------------------------------------------------------
alter table public.routine_items enable row level security;
alter table public.routine_changes enable row level security;
alter table public.routine_ticks enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_settings enable row level security;
alter table public.family_challenges enable row level security;
alter table public.challenge_runs enable row level security;

-- A list's words: its keeper (and the parents, for Anna's), no one else.
create policy ritems_read on public.routine_items for select to authenticated using (member_id in (select public.lists_i_keep()));
create policy ritems_add on public.routine_items for insert to authenticated with check (member_id in (select public.lists_i_keep()));
create policy ritems_change on public.routine_items for update to authenticated using (member_id in (select public.lists_i_keep())) with check (member_id in (select public.lists_i_keep()));
create policy ritems_remove on public.routine_items for delete to authenticated using (member_id in (select public.lists_i_keep()));

create policy rchanges_read on public.routine_changes for select to authenticated using (member_id in (select public.lists_i_keep()));
create policy rchanges_add on public.routine_changes for insert to authenticated with check (member_id in (select public.lists_i_keep()));
create policy rchanges_remove on public.routine_changes for delete to authenticated using (member_id in (select public.lists_i_keep()));

create policy rticks_read on public.routine_ticks for select to authenticated using (member_id in (select public.lists_i_keep()));
create policy rticks_add on public.routine_ticks for insert to authenticated with check (member_id in (select public.lists_i_keep()));
create policy rticks_remove on public.routine_ticks for delete to authenticated using (member_id in (select public.lists_i_keep()));

-- How each day went: the family reads it (no words); each keeps their own.
create policy rdays_read on public.routine_days for select to authenticated using ((select public.is_family()));
create policy rdays_add on public.routine_days for insert to authenticated with check (member_id in (select public.lists_i_keep()));
create policy rdays_change on public.routine_days for update to authenticated using (member_id in (select public.lists_i_keep())) with check (member_id in (select public.lists_i_keep()));

create policy rsettings_read on public.routine_settings for select to authenticated using ((select public.is_family()));
create policy rsettings_change on public.routine_settings for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));

create policy fchallenges_read on public.family_challenges for select to authenticated using ((select public.is_family()));
create policy fchallenges_add on public.family_challenges for insert to authenticated with check ((select public.is_parent()));
create policy fchallenges_change on public.family_challenges for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy fchallenges_remove on public.family_challenges for delete to authenticated using ((select public.is_parent()));

-- Runs: anyone's phone plans the next one or says how one ended; the parents
-- plan by hand, change, cancel and remove them.
create policy cruns_read on public.challenge_runs for select to authenticated using ((select public.is_family()));
create policy cruns_add on public.challenge_runs for insert to authenticated with check ((select public.is_parent()) or ((select public.is_family()) and planned_by = 'auto' and status = 'planned'));
create policy cruns_change on public.challenge_runs for update to authenticated
  using ((select public.is_parent()) or ((select public.is_family()) and status = 'planned'))
  with check ((select public.is_parent()) or ((select public.is_family()) and status in ('planned', 'won', 'missed')));
create policy cruns_remove on public.challenge_runs for delete to authenticated using ((select public.is_parent()));

-- ---- Grants: signed-in users only, never the anonymous key ------------------------------
revoke all on public.routine_items, public.routine_changes, public.routine_ticks, public.routine_days, public.routine_settings, public.family_challenges, public.challenge_runs from anon;
grant select, insert, update, delete on public.routine_items to authenticated;
grant select, insert, delete on public.routine_changes to authenticated;
grant select, insert, delete on public.routine_ticks to authenticated;
grant select, insert, update on public.routine_days to authenticated;
grant select, update on public.routine_settings to authenticated;
grant select, insert, update, delete on public.family_challenges to authenticated;
grant select, insert, update, delete on public.challenge_runs to authenticated;
