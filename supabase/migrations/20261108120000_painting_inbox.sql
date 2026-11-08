-- ============================================
-- Laurie's paintings: a batch waiting to be checked lives in the family's storage, so any device can pick it up
-- ============================================
-- Run after 20261108090000_paintings_recrop.sql (docs/DATABASE.md). A parent sends a batch of photos from a
-- phone and goes through them on a computer, or leaves it half done and carries on from another device.
-- Each photo is a row here (its crop, title, year, medium, seasons and where it stands: the `inboxData`
-- of src/lib/paintingBatch.js) and three files in the private `paintings` bucket under `inbox/<id>/`
-- (kept.jpg, view.jpg, thumb.jpg), which the bucket's existing policies already cover (the family reads,
-- the parents add and remove). The rows are the parents' alone: Jason or Laurie, either one. A row goes
-- when its batch is put away; a painting added from it is a row in `paintings` of its own.

create table public.painting_inbox (
  id uuid primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.painting_inbox enable row level security;
create policy painting_inbox_read on public.painting_inbox for select to authenticated using ((select public.is_parent()));
create policy painting_inbox_add on public.painting_inbox for insert to authenticated with check ((select public.is_parent()));
create policy painting_inbox_change on public.painting_inbox for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy painting_inbox_remove on public.painting_inbox for delete to authenticated using ((select public.is_parent()));

revoke all on public.painting_inbox from anon;
grant select, insert, update, delete on public.painting_inbox to authenticated;
