-- Read-only check: which of the recent migrations have run?
-- Shows one row per table; "yes" means it exists. Changes nothing.
select migration, table_name, case when to_regclass('public.' || table_name) is not null then 'yes' else 'MISSING' end as ran
from (values
  ('20261101120000_parish_stations_birds', 'outside_cache'),
  ('20261101120000_parish_stations_birds', 'parish_schedules'),
  ('20261101120000_parish_stations_birds', 'weather_stations'),
  ('20261101183000_member_phones', 'member_phones'),
  ('20261101214500_plans_stay_until_dismissed', 'week_plan_recipes'),
  ('20261101231500_life_list', 'bird_sightings'),
  ('20261101231500_life_list', 'outings'),
  ('20261101231500_life_list', 'park_marks'),
  ('20261101233000_ebird_sync', 'sync_consents'),
  ('20261101233000_ebird_sync', 'bird_sync_runs')
) as t(migration, table_name)
order by migration, table_name;
