-- ============================================
-- Our list for each town: the places we've been, for next time
-- ============================================
-- Jason's ask (issue #19): for the towns we go back to (Temecula for the day,
-- Big Bear for a weekend), a list of the restaurants, wineries, hikes and other
-- things we've done there, with what we thought and a note, as a reference.
-- A town is its own row so its page has an address by id (/yonder/town/<id>).
-- Each place is one row per town (its name, what kind, loved / good / not
-- again, a note); each visit is a day we went (the scrapbook gathers a trip's
-- visits by its dates). Everything here is something one of us chose to add:
-- never made from where a phone has been, and no point is kept, only the town.
-- The family reads and adds; whoever added a place, or a parent, removes it.
-- Runs once; additive.

create table public.been_towns (
  id uuid primary key default gen_random_uuid(),
  town text not null check (length(town) between 1 and 120),
  region text check (region is null or length(region) <= 60),
  cc text check (cc is null or cc ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);
create unique index been_towns_one on public.been_towns (lower(town), lower(coalesce(region, '')));
alter table public.been_towns enable row level security;
create policy been_towns_read on public.been_towns for select to authenticated using ((select public.is_family()));
create policy been_towns_add on public.been_towns for insert to authenticated with check ((select public.is_family()));
revoke all on public.been_towns from anon;
grant select, insert on public.been_towns to authenticated;

create table public.been_places (
  id uuid primary key default gen_random_uuid(),
  town_id uuid not null references public.been_towns (id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  kind text not null check (kind in ('eat', 'drink', 'hike', 'do', 'shop', 'stay', 'mass')),
  rating text check (rating is null or rating in ('loved', 'good', 'not-again')),
  note text check (note is null or length(note) <= 500),
  website text check (website is null or website ~ '^https://'),
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index been_places_one on public.been_places (town_id, lower(name));
alter table public.been_places enable row level security;
create policy been_places_read on public.been_places for select to authenticated using ((select public.is_family()));
create policy been_places_add on public.been_places for insert to authenticated with check ((select public.is_family()));
create policy been_places_change on public.been_places for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy been_places_remove on public.been_places for delete to authenticated using (added_by = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.been_places from anon;
grant select, insert, update, delete on public.been_places to authenticated;

create table public.been_visits (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.been_places (id) on delete cascade,
  on_date date not null,
  member_id uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (place_id, on_date)
);
create index been_visits_by_day on public.been_visits (on_date desc);
alter table public.been_visits enable row level security;
create policy been_visits_read on public.been_visits for select to authenticated using ((select public.is_family()));
create policy been_visits_add on public.been_visits for insert to authenticated with check ((select public.is_family()));
create policy been_visits_remove on public.been_visits for delete to authenticated using (member_id = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.been_visits from anon;
grant select, insert, delete on public.been_visits to authenticated;
