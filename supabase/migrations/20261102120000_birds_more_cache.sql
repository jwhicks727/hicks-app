-- The birds function also keeps its hotspots, the county's numbers and what is
-- possible here (every three hours), under a key of its own. Runs once.
alter table public.outside_cache drop constraint outside_cache_key_check;
alter table public.outside_cache add constraint outside_cache_key_check check (key in ('stations', 'birds', 'wild', 'birds-more'));
