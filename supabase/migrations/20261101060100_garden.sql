-- ============================================
-- The garden: our yard and rooms as maps, what grows where, its photos and care
-- ============================================
-- Run after 20261101060000_claude_and_kitchen_planning.sql (docs/DATABASE.md).
-- A map is drawn in the app from these shapes; it never holds an address or
-- coordinates. Photos live in the private `garden` bucket, read through
-- signed links by the family only, and go to Claude only when someone taps
-- "Have Claude look" (the screen says so first).

-- ---- Areas: the back yard, the patio, a room ----------------------------------
create table public.garden_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  indoor boolean not null default false,
  width_ft numeric not null default 30 check (width_ft > 0 and width_ft <= 500),
  depth_ft numeric not null default 20 check (depth_ft > 0 and depth_ft <= 500),
  light text check (light is null or light in ('full', 'part', 'shade', 'bright', 'medium', 'low')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger garden_areas_touch before update on public.garden_areas for each row execute function public.touch_updated_at();

-- ---- Spots on an area's map: a bed, a box, a pot, a tree, a feeder... ------------
-- Position and size in percent of the area's width (x, w) and depth (y, h).
create table public.garden_spots (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.garden_areas (id) on delete cascade,
  kind text not null check (kind in ('bed', 'box', 'pot', 'tree', 'plant', 'feeder', 'bath', 'compost', 'path', 'other')),
  name text not null check (length(name) between 1 and 80),
  x numeric not null default 40 check (x between 0 and 100),
  y numeric not null default 40 check (y between 0 and 100),
  w numeric not null default 20 check (w between 1 and 100),
  h numeric not null default 20 check (h between 1 and 100),
  sun text check (sun is null or sun in ('full', 'part', 'shade', 'bright', 'medium', 'low')),
  -- Indoors, a pot is drawn from the side: its plant's type, its size, its pot
  form text check (form is null or form in ('upright', 'trailing', 'bushy', 'flowering', 'herb', 'tree', 'palm', 'monstera', 'fern', 'cactus', 'succulent', 'spiky', 'orchid')),
  size text check (size is null or size in ('small', 'medium', 'large', 'tree')),
  pot text check (pot is null or pot in ('terracotta', 'white', 'blue', 'green', 'black', 'basket')),
  notes text check (notes is null or length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index garden_spots_by_area on public.garden_spots (area_id);
create trigger garden_spots_touch before update on public.garden_spots for each row execute function public.touch_updated_at();

-- ---- What grows in a spot ---------------------------------------------------------
create table public.garden_plants (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.garden_spots (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  variety text check (variety is null or length(variety) <= 80),
  planted_on date,
  water_days int check (water_days is null or water_days between 1 and 60),   -- water every N days
  status text not null default 'growing' check (status in ('growing', 'done')),
  notes text check (notes is null or length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index garden_plants_by_spot on public.garden_plants (spot_id);
create trigger garden_plants_touch before update on public.garden_plants for each row execute function public.touch_updated_at();

-- ---- Care, as it's done: watered, fed, pruned, harvested, the feeder refilled -------
create table public.garden_log (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.garden_spots (id) on delete cascade,
  plant_id uuid references public.garden_plants (id) on delete set null,
  kind text not null check (kind in ('water', 'feed', 'prune', 'plant', 'harvest', 'treat', 'refill', 'note')),
  on_date date not null,
  amount text check (amount is null or length(amount) <= 80),
  note text check (note is null or length(note) <= 1000),
  created_by uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index garden_log_by_spot on public.garden_log (spot_id, on_date desc);

-- ---- Photos, each with what Claude saw when asked -------------------------------------
create table public.garden_photos (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.garden_spots (id) on delete cascade,
  path text not null check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),        -- in the garden bucket
  thumb_path text check (thumb_path is null or thumb_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.thumb\.jpg$'),
  taken_on date not null,
  caption text check (caption is null or length(caption) <= 300),
  analysis jsonb,
  analysed_at timestamptz,
  created_by uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index garden_photos_by_spot on public.garden_photos (spot_id, taken_on desc);

-- ---- Row-level security: the family gardens together ------------------------------------
alter table public.garden_areas enable row level security;
alter table public.garden_spots enable row level security;
alter table public.garden_plants enable row level security;
alter table public.garden_log enable row level security;
alter table public.garden_photos enable row level security;

create policy areas_read on public.garden_areas for select to authenticated using ((select public.is_family()));
create policy areas_add on public.garden_areas for insert to authenticated with check ((select public.is_family()));
create policy areas_change on public.garden_areas for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy areas_remove on public.garden_areas for delete to authenticated using ((select public.is_parent()));

create policy spots_read on public.garden_spots for select to authenticated using ((select public.is_family()));
create policy spots_add on public.garden_spots for insert to authenticated with check ((select public.is_family()));
create policy spots_change on public.garden_spots for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy spots_remove on public.garden_spots for delete to authenticated using ((select public.is_parent()));

create policy plants_read on public.garden_plants for select to authenticated using ((select public.is_family()));
create policy plants_add on public.garden_plants for insert to authenticated with check ((select public.is_family()));
create policy plants_change on public.garden_plants for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy plants_remove on public.garden_plants for delete to authenticated using ((select public.is_family()));

create policy glog_read on public.garden_log for select to authenticated using ((select public.is_family()));
create policy glog_add on public.garden_log for insert to authenticated with check ((select public.is_family()));
create policy glog_remove on public.garden_log for delete to authenticated using ((select public.is_family()));

create policy gphotos_read on public.garden_photos for select to authenticated using ((select public.is_family()));
create policy gphotos_add on public.garden_photos for insert to authenticated with check ((select public.is_family()));
create policy gphotos_change on public.garden_photos for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy gphotos_remove on public.garden_photos for delete to authenticated using ((select public.is_family()));

-- ---- The photos' bucket: private, the family only, pictures only ---------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('garden', 'garden', false, 6291456, array['image/jpeg'])
on conflict (id) do nothing;
create policy garden_files_read on storage.objects for select to authenticated using (bucket_id = 'garden' and (select public.is_family()));
create policy garden_files_add on storage.objects for insert to authenticated with check (bucket_id = 'garden' and (select public.is_family()));
create policy garden_files_remove on storage.objects for delete to authenticated using (bucket_id = 'garden' and (select public.is_family()));

-- ---- Grants: signed-in users only, never the anonymous key --------------------------------
revoke all on public.garden_areas, public.garden_spots, public.garden_plants, public.garden_log, public.garden_photos from anon;
grant select, insert, update, delete on public.garden_areas to authenticated;
grant select, insert, update, delete on public.garden_spots to authenticated;
grant select, insert, update, delete on public.garden_plants to authenticated;
grant select, insert, delete on public.garden_log to authenticated;
grant select, insert, update, delete on public.garden_photos to authenticated;
