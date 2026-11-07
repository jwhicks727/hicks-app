-- ============================================
-- Birds where we are: the birds function keeps each place away from home
-- ============================================
-- Away from home (Settings › Notice where I am), the app asks the `birds`
-- function about a tenth-of-a-degree cell (about ten kilometres), never a
-- closer point. The function keeps each cell's answer for an hour under a key
-- of its own, `birds-near:<lat>,<lng>`, and asks about at most ten new cells a
-- day. The family reads it, as every other answer in outside_cache; only the
-- function writes. Runs once.
alter table public.outside_cache drop constraint outside_cache_key_check;
alter table public.outside_cache add constraint outside_cache_key_check
  check (key in ('stations', 'birds', 'wild', 'birds-more') or key ~ '^birds-near:-?[0-9]{1,2}\.[0-9],-?[0-9]{1,3}\.[0-9]$');
