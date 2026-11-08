-- ============================================
-- Anna's Art catches up with Laurie's gallery: medium, shape, colours, what Claude saw; her own featured wall
-- ============================================
-- Run after 20261108200000_gallery_shapes_months_features.sql (docs/DATABASE.md). Additive only.
--
-- `annas_drawings` gains (it already has `print`, the fingerprint):
--   medium   what it's made with ("Crayon on paper", "Acrylic on canvas"): typed, or Claude's suggestion confirmed
--            by whoever added it; it says whether a piece is a drawing or a painting
--   shape    the canvas's or paper's shape when it isn't a rectangle (src/lib/shapes.js): a frame drawn round it,
--            never a cut of her picture
--   palette  its colours, measured from her pixels on the device (src/lib/artColour.js): never guessed
--   looks    what Claude saw in it (what it shows, its mood, style and weather), kept only once whoever added it, or
--            a parent, said it looks right; for finding it on her wall and for her featured wall. Never her title,
--            her own words, or a name written on it
-- Row-level security is unchanged: the family reads; whoever added a piece, or a parent, changes it.
--
-- `gallery_features.collection` says whose wall a featured wall is ('paintings', Laurie's; 'drawings', Anna's), so
-- the two don't mix. Walls already kept are Laurie's. Only the claude function writes them, as before.

alter table public.annas_drawings add column if not exists medium text check (medium is null or length(medium) <= 80);
alter table public.annas_drawings add column if not exists shape jsonb check (shape is null or jsonb_typeof(shape) = 'object');
alter table public.annas_drawings add column if not exists palette jsonb check (palette is null or jsonb_typeof(palette) = 'object');
alter table public.annas_drawings add column if not exists looks jsonb check (looks is null or jsonb_typeof(looks) = 'object');
alter table public.gallery_features add column if not exists collection text not null default 'paintings' check (collection in ('paintings', 'drawings'));
create index if not exists gallery_features_collection on public.gallery_features (collection, until desc, created_at desc);
