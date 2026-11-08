-- ============================================
-- Anna's drawings: a batch waiting to be checked lives in the family's storage, and a drawing keeps its original
-- ============================================
-- Run after 20261108120000_painting_inbox.sql (docs/DATABASE.md). Anyone in the family can send a set of photos of
-- Anna's drawings (Anna herself, or a parent for her) from one device and go through them on another; each photo is
-- a row here (its crop, title, day, topic and where it stands: `drawingInboxData` in src/lib/drawingBatch.js) and
-- three files under `inbox/<id>/` in the private `drawings` bucket, whose policies already cover them (the family
-- reads and adds; whoever uploaded a file, or a parent, takes it away). Whoever sent a photo sees and changes it, and
-- so do the parents: Anna can send from her own tablet and a parent finishes the set at a computer. A row goes when its
-- batch is put away. `annas_drawings` gains `original` (the photo is kept at `<id>.original.jpg`) and `crop` (the crop
-- it was saved with), so a drawing can be cropped again later; drawings added before this have neither.

alter table public.annas_drawings add column if not exists original boolean not null default false;
alter table public.annas_drawings add column if not exists crop jsonb;

create table public.drawing_inbox (
  id uuid primary key,
  data jsonb not null,
  added_by uuid not null references public.family_members (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.drawing_inbox enable row level security;
create policy drawing_inbox_read on public.drawing_inbox for select to authenticated using (added_by = (select public.my_member_id()) or (select public.is_parent()));
create policy drawing_inbox_add on public.drawing_inbox for insert to authenticated with check ((select public.is_family()) and added_by = (select public.my_member_id()));
create policy drawing_inbox_change on public.drawing_inbox for update to authenticated
  using (added_by = (select public.my_member_id()) or (select public.is_parent()))
  with check (added_by = (select public.my_member_id()) or (select public.is_parent()));
create policy drawing_inbox_remove on public.drawing_inbox for delete to authenticated using (added_by = (select public.my_member_id()) or (select public.is_parent()));
revoke all on public.drawing_inbox from anon;
grant select, insert, update, delete on public.drawing_inbox to authenticated;

-- A parent can add a drawing for Anna from a set she sent: the row keeps her as who added it (a drawing's own
-- policy let a person add only one under their own name)
create policy drawings_add_for_a_parent on public.annas_drawings for insert to authenticated with check ((select public.is_parent()));
