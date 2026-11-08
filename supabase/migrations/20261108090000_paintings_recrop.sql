-- ============================================
-- Laurie's paintings: keep each one's original photo and its crop, so it can be re-cropped later
-- ============================================
-- Run after 20261107180000_morning_evening_lists.sql (docs/DATABASE.md). Additive only: two columns
-- on `paintings`. `original` says the photo is kept in the private `paintings` bucket at
-- `<slug>/original.jpg`; `crop` is the crop it was saved with (turn, angle, centre, size, and the
-- photo's own W and H), so the crop screen starts where it was. Existing rows keep both empty:
-- their originals were never kept, so they can't be re-cropped (only their details change).
-- Row-level security is unchanged: the family reads, the parents change (paintings_read, paintings_change).

alter table public.paintings add column if not exists original boolean not null default false;
alter table public.paintings add column if not exists crop jsonb;
