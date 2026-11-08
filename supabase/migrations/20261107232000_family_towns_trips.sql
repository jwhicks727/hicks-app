-- ============================================
-- Which town each of us is in while away, and a trip kept from the calendar
-- ============================================
-- Jason's decision (issue #19, "full transparency"): while one of us is away
-- from home, the rest of the family sees which town. One row per person,
-- overwritten each time, never a log: the town, its region and country, a
-- tenth-of-a-degree point (numeric(4,1) holds nothing closer), and when it
-- lapses (twelve hours after the app was last opened there). The person's own
-- phone writes and removes their row (back on home ground, switched off, or
-- signed out); the family reads it. Never shown on the wall or in Reports.
--
-- outings.event_id ties a kept trip to the calendar event it came from (one
-- outing per event), so "Keep this trip?" asks once and the trip's recipes and
-- scrapbook have one record to gather round. Runs once; additive.

create table public.member_whereabouts (
  member_id uuid primary key references public.family_members (id) on delete cascade,
  town text not null check (length(town) between 1 and 120),
  region text check (region is null or length(region) <= 60),
  cc text check (cc is null or cc ~ '^[A-Z]{2}$'),
  lat numeric(4, 1) not null check (lat between -90 and 90),
  lng numeric(4, 1) not null check (lng between -180 and 180),
  tz text check (tz is null or length(tz) <= 60),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours',
  check (expires_at <= updated_at + interval '13 hours')
);
alter table public.member_whereabouts enable row level security;
create policy whereabouts_read on public.member_whereabouts for select to authenticated using ((select public.is_family()));
create policy whereabouts_add on public.member_whereabouts for insert to authenticated with check (member_id = (select public.my_member_id()));
create policy whereabouts_change on public.member_whereabouts for update to authenticated using (member_id = (select public.my_member_id())) with check (member_id = (select public.my_member_id()));
create policy whereabouts_remove on public.member_whereabouts for delete to authenticated using (member_id = (select public.my_member_id()));
revoke all on public.member_whereabouts from anon;
grant select, insert, update, delete on public.member_whereabouts to authenticated;

alter table public.outings add column event_id uuid references public.calendar_events (id) on delete set null;
create unique index outings_one_per_event on public.outings (event_id) where event_id is not null;
