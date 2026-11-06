-- ============================================
-- Concerts' keepsakes: the ticket, and a scrapbook of photos and words afterwards
-- ============================================
-- Run after 20261102120000_birds_more_cache.sql. Runs once (a second run errors
-- with "already exists"). The family reads them; anyone in the family adds their
-- own; a keepsake comes off by whoever added it, or a parent. The files sit in a
-- private bucket, read only through signed links once signed in.

create table public.event_keepsakes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  kind text not null check (kind in ('ticket', 'photo', 'note')),
  path text check (path is null or (length(path) <= 300 and path !~ '\.\.')),
  words text check (words is null or length(words) <= 2000),
  added_by uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'note' and words is not null and path is null) or (kind <> 'note' and path is not null))
);
create index event_keepsakes_by_event on public.event_keepsakes (event_id, created_at);
alter table public.event_keepsakes enable row level security;
create policy keepsakes_read on public.event_keepsakes for select to authenticated using ((select public.is_family()));
create policy keepsakes_add on public.event_keepsakes for insert to authenticated with check ((select public.is_family()) and added_by = (select public.my_member_id()));
create policy keepsakes_remove on public.event_keepsakes for delete to authenticated using (added_by = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.event_keepsakes from anon;
grant select, insert, delete on public.event_keepsakes to authenticated;

-- ---- The files: private, the family only, pictures and PDFs (a ticket often comes as one) ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('keepsakes', 'keepsakes', false, 10485760, array['image/jpeg', 'application/pdf'])
on conflict (id) do nothing;
create policy keepsakes_files_read on storage.objects for select to authenticated using (bucket_id = 'keepsakes' and (select public.is_family()));
create policy keepsakes_files_add on storage.objects for insert to authenticated with check (bucket_id = 'keepsakes' and (select public.is_family()));
create policy keepsakes_files_remove on storage.objects for delete to authenticated using (bucket_id = 'keepsakes' and ((select public.is_parent()) or owner_id = (select auth.uid())::text)); -- the uploader or a parent, as for the rows
