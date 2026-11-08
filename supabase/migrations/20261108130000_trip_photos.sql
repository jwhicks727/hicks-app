-- ============================================
-- The trip photo reel, and what's in each photo
-- ============================================
-- Jason's ask (issue #19): a small photo reel for each trip, uploaded by hand,
-- with as much tagging done by Claude as possible so nobody has to fuss: a plant,
-- a bird, a dish, a place. A photo belongs to a town and a day (so the recap and a
-- kept trip's scrapbook gather it by their dates); its tags say what's in it, and
-- link a dish to a recipe or a place to the town's list. Claude's tags start as
-- suggestions and count only once someone confirms them (one tap for all of a
-- reel's). Photos are the family's, private: a private bucket read through signed
-- links, never in the app's files. Claude is never asked to name or describe a
-- person (the app's own checks drop one if it did). Runs once; additive.

create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  town text not null check (length(town) between 1 and 120),
  region text check (region is null or length(region) <= 60),
  taken_on date not null,
  path text not null check (length(path) <= 200 and path !~ '\.\.'),
  thumb_path text check (thumb_path is null or (length(thumb_path) <= 200 and thumb_path !~ '\.\.')),
  width int check (width is null or width between 1 and 12000),
  height int check (height is null or height between 1 and 12000),
  caption text check (caption is null or length(caption) <= 300),
  read_at timestamptz,                                  -- when Claude looked at it
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index trip_photos_by_day on public.trip_photos (taken_on desc);
alter table public.trip_photos enable row level security;
create policy trip_photos_read on public.trip_photos for select to authenticated using ((select public.is_family()));
create policy trip_photos_add on public.trip_photos for insert to authenticated with check ((select public.is_family()));
create policy trip_photos_change on public.trip_photos for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy trip_photos_remove on public.trip_photos for delete to authenticated using (added_by = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.trip_photos from anon;
grant select, insert, update, delete on public.trip_photos to authenticated;

create table public.photo_tags (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.trip_photos (id) on delete cascade,
  kind text not null check (kind in ('plant', 'bird', 'animal', 'dish', 'place', 'other')),
  name text not null check (length(name) between 1 and 100),
  sci text check (sci is null or length(sci) <= 100),
  confidence text check (confidence is null or confidence in ('low', 'medium', 'high')),
  status text not null default 'suggested' check (status in ('suggested', 'confirmed')),
  ref_kind text check (ref_kind is null or ref_kind in ('recipe', 'been_place')),
  ref_id uuid,
  by_ai boolean not null default false,
  added_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index photo_tags_one on public.photo_tags (photo_id, kind, lower(name));
create index photo_tags_by_ref on public.photo_tags (ref_kind, ref_id) where ref_id is not null;
alter table public.photo_tags enable row level security;
create policy photo_tags_read on public.photo_tags for select to authenticated using ((select public.is_family()));
create policy photo_tags_add on public.photo_tags for insert to authenticated with check ((select public.is_family()));
create policy photo_tags_change on public.photo_tags for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy photo_tags_remove on public.photo_tags for delete to authenticated using ((select public.is_family()));
revoke all on public.photo_tags from anon;
grant select, insert, update, delete on public.photo_tags to authenticated;

-- ---- The photos' bucket: private, the family only, JPEGs only ---------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trips', 'trips', false, 6291456, array['image/jpeg'])
on conflict (id) do nothing;
create policy trips_files_read on storage.objects for select to authenticated using (bucket_id = 'trips' and (select public.is_family()));
create policy trips_files_add on storage.objects for insert to authenticated with check (bucket_id = 'trips' and (select public.is_family()));
create policy trips_files_remove on storage.objects for delete to authenticated using (bucket_id = 'trips' and (select public.is_family()));
