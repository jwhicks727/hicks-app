-- ============================================
-- What's around here: the map layer and the guide, kept by area
-- ============================================
-- Away from home (Settings › Notice where I am), the app asks about a
-- tenth-of-a-degree cell (about ten kilometres), never a closer point. The
-- `around` function keeps what the open map knows there (kind 'map', a week at
-- a time); the `claude` function keeps the guide it writes (kind 'guide', a
-- month at a time). Every version is a new row, so a new reading never deletes
-- an old one. A row says which area, never who asked or who was there. The
-- family reads them; only the functions write (no grant to change them).
--
-- travel_settings is one row: what the guide is written for (the family's
-- interests), kept by the parents and read by the family, and named on screen
-- as sent to Claude. Runs once; additive, so safe before the merge.

create table public.area_guides (
  id bigint generated always as identity primary key,
  cell text not null check (cell ~ '^-?[0-9]{1,2}\.[0-9],-?[0-9]{1,3}\.[0-9]$'),
  kind text not null check (kind in ('map', 'guide')),
  status text not null default 'ready' check (status in ('building', 'ready', 'failed')),
  town text check (town is null or length(town) <= 120),
  data jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);
create index area_guides_by_cell on public.area_guides (cell, kind, fetched_at desc);
-- One guide being written for an area at a time
create unique index area_guides_one_building on public.area_guides (cell) where kind = 'guide' and status = 'building';
alter table public.area_guides enable row level security;
create policy area_guides_read on public.area_guides for select to authenticated using ((select public.is_family()));
revoke all on public.area_guides from anon;
grant select on public.area_guides to authenticated;

create table public.travel_settings (
  id int primary key default 1 check (id = 1),
  interests text not null default '' check (length(interests) <= 1500),
  updated_by uuid references public.family_members (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.travel_settings enable row level security;
create policy travel_settings_read on public.travel_settings for select to authenticated using ((select public.is_family()));
create policy travel_settings_add on public.travel_settings for insert to authenticated with check ((select public.is_parent()));
create policy travel_settings_change on public.travel_settings for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
revoke all on public.travel_settings from anon;
grant select, insert, update on public.travel_settings to authenticated;
