-- ============================================
-- What's on hand this week: the plan remembers what was photographed in the Kitchen chat
-- ============================================
-- Run after 20261108200000_gallery_shapes_months_features.sql (docs/DATABASE.md).
-- Plan the week and the recipe writer cook around these first. Each item is
-- { name, amount, where (fridge | freezer | pantry), note }, added only when
-- a parent confirms what Claude read from a photo. The photo itself is never
-- kept. Additive: the plan's existing policies (the family reads, the
-- parents write) already cover the new column.

alter table public.week_plans
  add column on_hand jsonb not null default '[]'::jsonb check (jsonb_typeof(on_hand) = 'array' and jsonb_array_length(on_hand) <= 60);
