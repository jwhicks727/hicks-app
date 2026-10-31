-- ============================================
-- Laurie's paintings, behind sign-in
-- ============================================
-- Run after 20261101060100_garden.sql (docs/DATABASE.md, docs/PAINTINGS-STORAGE.md).
-- Each painting is a row here and its files in the private `paintings`
-- bucket (`<slug>/full.jpg`, `small.jpg`, and for one that moves, its
-- `flyer.png`, `sky.png`, `leaves.png`), read through signed links by the
-- family only. Nothing of hers is in the hosted app's public files.

create table public.paintings (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,80}$'),
  title text not null check (length(title) between 1 and 200),
  named boolean not null default true,            -- false: a working title, until Laurie names it
  year int check (year is null or year between 1950 and 2100),
  medium text check (medium is null or length(medium) <= 80),
  size text check (size is null or length(size) <= 40),
  w int not null check (w between 1 and 20000),
  h int not null check (h between 1 and 20000),
  seasons text[] not null default '{}',
  added date not null default current_date,
  focus jsonb,                                     -- the part a panel shows
  flyer jsonb,                                     -- a bird that flies: where it sits
  leaves jsonb,                                    -- her painted leaves: where each sits on its sheet
  said_yes_by uuid references public.family_members (id) on delete set null,  -- who recorded her yes
  created_at timestamptz not null default now()
);

alter table public.paintings enable row level security;
create policy paintings_read on public.paintings for select to authenticated using ((select public.is_family()));
create policy paintings_add on public.paintings for insert to authenticated with check ((select public.is_parent()));
create policy paintings_change on public.paintings for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy paintings_remove on public.paintings for delete to authenticated using ((select public.is_parent()));

-- The bucket: private; the family reads, the parents add and remove
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('paintings', 'paintings', false, 20971520, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
create policy paintings_files_read on storage.objects for select to authenticated using (bucket_id = 'paintings' and (select public.is_family()));
create policy paintings_files_add on storage.objects for insert to authenticated with check (bucket_id = 'paintings' and (select public.is_parent()));
create policy paintings_files_change on storage.objects for update to authenticated using (bucket_id = 'paintings' and (select public.is_parent())) with check (bucket_id = 'paintings' and (select public.is_parent()));
create policy paintings_files_remove on storage.objects for delete to authenticated using (bucket_id = 'paintings' and (select public.is_parent()));

revoke all on public.paintings from anon;
grant select, insert, update, delete on public.paintings to authenticated;
