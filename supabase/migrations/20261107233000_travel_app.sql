-- ============================================
-- The travel app: recipes from a trip, postcards, packing, hikes done, Someday
-- ============================================
-- Issue #19, phases 6 and 7. Everything here is something one of us chose to
-- keep: a recipe tagged to a kept trip, a postcard written to the family, a
-- packing list, a hike ticked off, a place hearted for someday. None of it is
-- made from where a phone has been. A postcard and a hike keep the town and the
-- day, never a point. The family reads all of it; each of us adds our own;
-- recipes' trips are the parents' (recipes are). Runs once; additive.

-- The travel app's name, offered in Admin like the lists' names
alter table public.travel_settings add column app_name text not null default 'Yonder'
  check (app_name in ('Yonder', 'Postcards', 'Field Trip', 'Wayfaring', 'Wanderings'));

-- A recipe found, cooked or brought home from a kept trip (one recipe can belong to several)
create table public.trip_recipes (
  outing_id uuid not null references public.outings (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  how text not null check (how in ('found', 'cooked', 'brought-home')),
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (outing_id, recipe_id, how)
);
alter table public.trip_recipes enable row level security;
create policy trip_recipes_read on public.trip_recipes for select to authenticated using ((select public.is_family()));
create policy trip_recipes_add on public.trip_recipes for insert to authenticated with check ((select public.is_parent()));
create policy trip_recipes_remove on public.trip_recipes for delete to authenticated using ((select public.is_parent()));
revoke all on public.trip_recipes from anon;
grant select, insert, delete on public.trip_recipes to authenticated;

-- A postcard to the family from wherever one of us is: the town and the day, a line of words
create table public.postcards (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default public.my_member_id() references public.family_members (id) on delete cascade,
  on_date date not null,
  town text not null check (length(town) between 1 and 120),
  region text check (region is null or length(region) <= 60),
  cc text check (cc is null or cc ~ '^[A-Z]{2}$'),
  words text not null default '' check (length(words) <= 280),
  created_at timestamptz not null default now()
);
create index postcards_by_day on public.postcards (on_date desc);
alter table public.postcards enable row level security;
create policy postcards_read on public.postcards for select to authenticated using ((select public.is_family()));
create policy postcards_add on public.postcards for insert to authenticated with check (member_id = (select public.my_member_id()));
create policy postcards_remove on public.postcards for delete to authenticated using (member_id = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.postcards from anon;
grant select, insert, delete on public.postcards to authenticated;

-- A trip's packing list, shared by the family
create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  done boolean not null default false,
  suggested boolean not null default false,
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, title)
);
alter table public.packing_items enable row level security;
create policy packing_read on public.packing_items for select to authenticated using ((select public.is_family()));
create policy packing_add on public.packing_items for insert to authenticated with check ((select public.is_family()));
create policy packing_change on public.packing_items for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy packing_remove on public.packing_items for delete to authenticated using ((select public.is_family()));
revoke all on public.packing_items from anon;
grant select, insert, update, delete on public.packing_items to authenticated;

-- A hike from a guide, ticked off: its name, miles and climb, the day and the town
create table public.trip_hikes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default public.my_member_id() references public.family_members (id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  miles numeric(5, 1) check (miles is null or miles between 0 and 60),
  climb_ft int check (climb_ft is null or climb_ft between 0 and 15000),
  on_date date not null,
  town text check (town is null or length(town) <= 120),
  created_at timestamptz not null default now()
);
create index trip_hikes_by_day on public.trip_hikes (on_date desc);
alter table public.trip_hikes enable row level security;
create policy trip_hikes_read on public.trip_hikes for select to authenticated using ((select public.is_family()));
create policy trip_hikes_add on public.trip_hikes for insert to authenticated with check (member_id = (select public.my_member_id()));
create policy trip_hikes_remove on public.trip_hikes for delete to authenticated using (member_id = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.trip_hikes from anon;
grant select, insert, delete on public.trip_hikes to authenticated;

-- Someday: a place from a guide, hearted, for next time we're near
create table public.someday (
  id uuid primary key default gen_random_uuid(),
  cell text not null check (cell ~ '^-?[0-9]{1,2}\.[0-9],-?[0-9]{1,3}\.[0-9]$'),
  town text check (town is null or length(town) <= 120),
  section text check (section is null or length(section) <= 30),
  name text not null check (length(name) between 1 and 100),
  why text check (why is null or length(why) <= 200),
  website text check (website is null or website ~ '^https://'),
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (cell, name)
);
alter table public.someday enable row level security;
create policy someday_read on public.someday for select to authenticated using ((select public.is_family()));
create policy someday_add on public.someday for insert to authenticated with check ((select public.is_family()));
create policy someday_remove on public.someday for delete to authenticated using (added_by = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.someday from anon;
grant select, insert, delete on public.someday to authenticated;
