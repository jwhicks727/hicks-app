-- ============================================
-- Anna's Gallery: her drawings, and a private place for their pictures
-- ============================================
-- Run after 20261102120000_birds_more_cache.sql. Runs once (a second run errors
-- with "already exists"). Everyone in the family reads the gallery and adds a
-- drawing of their own to it (Anna herself, or a parent on her behalf); whoever
-- added one can change or take it down, and so can a parent. The pictures sit in
-- a private bucket and are read only through signed links once signed in: never
-- in the app's own files, which anyone with the address could open.
-- Each drawing's title, date and words are what the person adding it typed:
-- nothing is guessed from the picture.

create table public.annas_drawings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  made_on date,                                                     -- when she drew it, if anyone knows
  words text check (words is null or length(words) <= 1000),       -- in her own words, if she said any
  topic text check (topic is null or topic in ('pets')),           -- what it is about, where that matters (the Pets launch hangs the newest 'pets' one)
  path text not null check (length(path) <= 300 and path !~ '\.\.'),
  thumb_path text check (thumb_path is null or (length(thumb_path) <= 300 and thumb_path !~ '\.\.')),
  width int check (width is null or width between 1 and 10000),
  height int check (height is null or height between 1 and 10000),
  added_by uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index annas_drawings_newest on public.annas_drawings (created_at desc);
create index annas_drawings_by_topic on public.annas_drawings (topic, created_at desc) where topic is not null;
alter table public.annas_drawings enable row level security;
create policy drawings_read on public.annas_drawings for select to authenticated using ((select public.is_family()));
create policy drawings_add on public.annas_drawings for insert to authenticated with check ((select public.is_family()) and added_by = (select public.my_member_id()));
create policy drawings_change on public.annas_drawings for update to authenticated
  using (added_by = (select public.my_member_id()) or (select public.is_parent()))
  with check (added_by = (select public.my_member_id()) or (select public.is_parent()));
create policy drawings_remove on public.annas_drawings for delete to authenticated using (added_by = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.annas_drawings from anon;
grant select, insert, update, delete on public.annas_drawings to authenticated;

-- ---- The pictures: private, the family only, JPEGs (the app re-saves every photo as one) ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drawings', 'drawings', false, 8388608, array['image/jpeg'])
on conflict (id) do nothing;
create policy drawings_files_read on storage.objects for select to authenticated using (bucket_id = 'drawings' and (select public.is_family()));
create policy drawings_files_add on storage.objects for insert to authenticated with check (bucket_id = 'drawings' and (select public.is_family()));
-- A file comes down with its row: by whoever uploaded it, or a parent
create policy drawings_files_remove on storage.objects for delete to authenticated using (bucket_id = 'drawings' and ((select public.is_parent()) or owner_id = (select auth.uid())::text));
