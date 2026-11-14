-- ============================================
-- A planned trip's page (/yonder/plan/<event id>): where we're staying and our plans
-- ============================================
-- Both hang off the calendar event the trip is, like its packing list, so a
-- trip's things go when it does (a feed's events are updated in place, never
-- deleted and read again, so they stay put). The family reads and keeps them.
--
-- A stay is a public building (a hotel, an inn, a campground): its name, its
-- town and its point to about a hundred metres (numeric(6,3) and (7,3) hold
-- nothing closer), found on OpenStreetMap by the phone. Never a street address.
-- The guide for it is asked by area (a tenth of a degree, src/lib/tripPlan.js):
-- its name never goes to Claude.
--
-- Runs once; a second run errors with "already exists".

create table public.trip_stays (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  name text not null check (length(name) between 1 and 160),
  town text check (town is null or length(town) <= 120),
  region text check (region is null or length(region) <= 80),
  lat numeric(6, 3) check (lat is null or lat between -90 and 90),
  lng numeric(7, 3) check (lng is null or lng between -180 and 180),
  from_date date,
  to_date date,
  note text check (note is null or length(note) <= 1000),
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((lat is null) = (lng is null)),
  check (from_date is null or to_date is null or to_date >= from_date)
);
create index trip_stays_by_event on public.trip_stays (event_id);
alter table public.trip_stays enable row level security;
create policy trip_stays_read on public.trip_stays for select to authenticated using ((select public.is_family()));
create policy trip_stays_add on public.trip_stays for insert to authenticated with check ((select public.is_family()));
create policy trip_stays_change on public.trip_stays for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy trip_stays_remove on public.trip_stays for delete to authenticated using ((select public.is_family()));
revoke all on public.trip_stays from anon;
grant select, insert, update, delete on public.trip_stays to authenticated;

-- Our plans for the trip: a day (or any day), a time if there is one, what, where and a note
create table public.trip_plans (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  on_date date,
  at_time time,
  title text not null check (length(title) between 1 and 160),
  place text check (place is null or length(place) <= 160),
  website text check (website is null or (length(website) <= 600 and website ~ '^https://')),
  note text check (note is null or length(note) <= 1000),
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index trip_plans_by_event on public.trip_plans (event_id, on_date);
alter table public.trip_plans enable row level security;
create policy trip_plans_read on public.trip_plans for select to authenticated using ((select public.is_family()));
create policy trip_plans_add on public.trip_plans for insert to authenticated with check ((select public.is_family()));
create policy trip_plans_change on public.trip_plans for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy trip_plans_remove on public.trip_plans for delete to authenticated using ((select public.is_family()));
revoke all on public.trip_plans from anon;
grant select, insert, update, delete on public.trip_plans to authenticated;
