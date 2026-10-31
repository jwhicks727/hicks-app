-- ============================================
-- What the app reads from the outside world: the parish's Mass times, our
-- chosen weather stations, and what those readings looked like last
-- ============================================
-- Run after 20261101090100_academy.sql (docs/DATABASE.md).
-- Written only by the `parish`, `stations` and `birds` Edge Functions, with
-- the service role; the family reads. Nothing here is about one of us.

-- Sacred Heart's week, as read from its own website. A new row only when the
-- week changes, so every version it has posted is kept; checked_at says when
-- the page last said the same.
create table public.parish_schedules (
  id bigint generated always as identity primary key,
  url text not null check (url ~ '^https://(www\.)?sacredheartrc\.org/'),
  schedule jsonb not null,
  read_at timestamptz not null default now(),
  checked_at timestamptz not null default now()
);
create index parish_schedules_latest on public.parish_schedules (read_at desc);
alter table public.parish_schedules enable row level security;
create policy parish_schedules_read on public.parish_schedules for select to authenticated using ((select public.is_family()));
revoke all on public.parish_schedules from anon;
grant select on public.parish_schedules to authenticated;

-- The station each place reads: the schools' as chosen, home's set in Admin
-- by a parent (never written in the repository). The fallback, an airport,
-- stands in when a station goes quiet.
create table public.weather_stations (
  place text primary key check (place in ('home', 'kordyak', 'ruble', 'soar')),
  stid text check (stid is null or stid ~ '^[A-Za-z0-9_]{2,16}$'),
  fallback text check (fallback is null or fallback ~ '^[A-Za-z0-9_]{2,16}$'),
  updated_at timestamptz not null default now()
);
insert into public.weather_stations (place, stid, fallback) values
  ('home', null, null),
  ('kordyak', 'SE685', 'KONT'),
  ('ruble', '980SE', 'KONT'),
  ('soar', 'NGC08', 'KSBD')
on conflict (place) do nothing;
alter table public.weather_stations enable row level security;
create policy weather_stations_read on public.weather_stations for select to authenticated using ((select public.is_family()));
create policy weather_stations_change on public.weather_stations for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
revoke all on public.weather_stations from anon;
grant select, update (stid, fallback) on public.weather_stations to authenticated;
-- When it changed is the database's clock, not the phone's
create function public.weather_stations_touched() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger weather_stations_touched before update on public.weather_stations for each row execute function public.weather_stations_touched();

-- The last answer from Synoptic and from eBird, so however often the app is
-- opened the services are asked at most every quarter hour (stations) and
-- every hour (birds). Kept as the functions shaped it: no one's location.
create table public.outside_cache (
  key text primary key check (key in ('stations', 'birds')),
  data jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.outside_cache enable row level security;
create policy outside_cache_read on public.outside_cache for select to authenticated using ((select public.is_family()));
revoke all on public.outside_cache from anon;
grant select on public.outside_cache to authenticated;
