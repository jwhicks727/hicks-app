-- ============================================
-- Laurie's gallery: the month, the canvas's shape, colours, a fingerprint, what Claude saw; and the featured walls
-- ============================================
-- Run after 20261108150000_drawing_inbox.sql (docs/DATABASE.md). Additive only.
--
-- `paintings` gains:
--   month    the month she wrote with the year, when she wrote one (read by her signature, confirmed by a parent)
--   shape    the canvas's shape when it isn't a rectangle ({"kind":"round"}, or a hand-traced {"kind":"polygon","points":[...]}):
--            her painting is still only cropped and turned; the shape is the frame drawn round it (src/lib/shapes.js)
--   palette  its colours, measured from her pixels on the device (src/lib/artColour.js): never guessed
--   print    a fingerprint of the picture (88 hex digits: its light and dark, and its colours), so a second photo of the same painting is noticed when it's added
--   looks    what Claude saw in it (what it shows, its mood, style and weather), kept only once a parent said it looks
--            right; for the gallery's filters and featured walls. Never her title, year or medium, and never `subjects`
--            (a painting stands in for a photo only where a parent has said what it shows)
-- `annas_drawings` gains `print`, for the same check when her art is added.
-- The family reads both tables and the parents change paintings, as before; whoever added a drawing, or a parent, changes it.
--
-- `gallery_features`: the few paintings that hang together on the gallery's featured wall for a few days ("All painted
-- in 2022", "Ones for a rainy day"), chosen by Claude from the paintings' facts (`feature-paintings` in the claude
-- function). Information, not a change to the family's data, so, like area_guides, only the function writes it, with the
-- service role; every one is kept. The family reads them; a parent can take one down.

alter table public.paintings add column if not exists month smallint check (month is null or month between 1 and 12);
alter table public.paintings add column if not exists shape jsonb check (shape is null or jsonb_typeof(shape) = 'object');
alter table public.paintings add column if not exists palette jsonb check (palette is null or jsonb_typeof(palette) = 'object');
alter table public.paintings add column if not exists print text check (print is null or print ~ '^[0-9a-f]{88}$');
alter table public.paintings add column if not exists looks jsonb check (looks is null or jsonb_typeof(looks) = 'object');
alter table public.annas_drawings add column if not exists print text check (print is null or print ~ '^[0-9a-f]{88}$');

create table public.gallery_features (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  line text not null default '' check (length(line) <= 300),
  why text not null default '' check (length(why) <= 300),
  slugs text[] not null check (cardinality(slugs) between 3 and 12),
  made_on date not null,
  until date not null check (until >= made_on),
  model text,
  created_at timestamptz not null default now()
);
create index gallery_features_until on public.gallery_features (until desc, created_at desc);
alter table public.gallery_features enable row level security;
create policy gallery_features_read on public.gallery_features for select to authenticated using ((select public.is_family()));
create policy gallery_features_remove on public.gallery_features for delete to authenticated using ((select public.is_parent()));
revoke all on public.gallery_features from anon;
grant select, delete on public.gallery_features to authenticated;
