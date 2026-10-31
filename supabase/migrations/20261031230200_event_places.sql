-- ============================================
-- Events get a place: where it is, and whether it's outdoors
-- ============================================
-- Run after 20261031230100_kitchen.sql. An outdoor event's page reads the
-- weather and what's been seen near its place (docs/DATABASE.md). Only the
-- place's coordinates, rounded to about a kilometre, are sent anywhere.

alter table public.calendar_events
  add column place text check (place is null or length(place) <= 200),
  add column lat double precision check (lat is null or lat between -90 and 90),
  add column lng double precision check (lng is null or lng between -180 and 180),
  add column outdoors boolean not null default false,
  add column created_by uuid default auth.uid() references auth.users (id) on delete set null;

-- A place has both coordinates or neither.
alter table public.calendar_events add constraint calendar_events_place_both check ((lat is null) = (lng is null));
