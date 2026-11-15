-- ============================================
-- Anna's Art: the tape each piece hangs with, chosen at will
-- ============================================
-- Run after 20261108200000_gallery_shapes_months_features.sql (docs/DATABASE.md). Runs once (a second run errors
-- with "already exists"). Anna asked to change the tape on her art whenever she likes. One row a drawing: which
-- washi tape holds it up (an id from the catalogue in src/lib/tapes.js; the patterns themselves are drawn in code,
-- never stored), and who chose it last. A drawing with no row keeps the tape it always had.
--
-- Anyone in the family reads and chooses: it's a tape on a family wall, and Anna is often not the one who added the
-- drawing (a parent photographs most of them), so the drawing's own rule (whoever added it, or a parent) would stop
-- her. The row says who chose it, and only under their own name. Taking a drawing down takes its tape with it.

create table public.drawing_tapes (
  drawing_id uuid primary key references public.annas_drawings (id) on delete cascade,
  tape text not null check (tape ~ '^[a-z0-9-]{1,40}$'),
  set_by uuid not null default public.my_member_id() references public.family_members (id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.drawing_tapes enable row level security;
create policy drawing_tapes_read on public.drawing_tapes for select to authenticated using ((select public.is_family()));
create policy drawing_tapes_choose on public.drawing_tapes for insert to authenticated
  with check ((select public.is_family()) and set_by = (select public.my_member_id()));
create policy drawing_tapes_change on public.drawing_tapes for update to authenticated
  using ((select public.is_family()))
  with check ((select public.is_family()) and set_by = (select public.my_member_id()));
create policy drawing_tapes_back on public.drawing_tapes for delete to authenticated using ((select public.is_family()));
revoke all on public.drawing_tapes from anon;
grant select, insert, update, delete on public.drawing_tapes to authenticated;
