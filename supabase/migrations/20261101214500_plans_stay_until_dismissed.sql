-- ============================================
-- A plan stays until someone puts it away, and keeps the recipes written for it (and room for the wild pictures' cache)
-- ============================================
-- Run after 20261101183000_member_phones.sql (docs/DATABASE.md).
-- Plan the week used to show only the calendar week's plan, so a list waiting
-- for an answer (Laurie's "1, 3, 8") vanished at midnight on Saturday. Now the
-- newest plan nobody has put away is the open one, whatever week it was made.

alter table public.week_plans add column dismissed_at timestamptz;
create index week_plans_open on public.week_plans (created_at desc) where dismissed_at is null;

-- The full recipes Claude wrote for a plan's picks, kept until they are saved
-- to the cookbook or put away, on every device, not just the phone that asked.
-- Parents only: they carry Laurie's plate, which the family reads nowhere else.
create table public.week_plan_recipes (
  plan_id uuid primary key references public.week_plans (id) on delete cascade,
  recipes jsonb not null default '[]'::jsonb check (jsonb_typeof(recipes) = 'array'),
  updated_at timestamptz not null default now()
);
create trigger week_plan_recipes_touch before update on public.week_plan_recipes for each row execute function public.touch_updated_at();

alter table public.week_plan_recipes enable row level security;
create policy plan_recipes_read on public.week_plan_recipes for select to authenticated using ((select public.is_parent()));
create policy plan_recipes_add on public.week_plan_recipes for insert to authenticated with check ((select public.is_parent()));
create policy plan_recipes_change on public.week_plan_recipes for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy plan_recipes_remove on public.week_plan_recipes for delete to authenticated using ((select public.is_parent()));

revoke all on public.week_plan_recipes from anon;
grant select, insert, update, delete on public.week_plan_recipes to authenticated;

-- The `wild` function keeps the address of each wild season's picture (from the
-- site that has the news) in the same cache as the stations and the birds
alter table public.outside_cache drop constraint outside_cache_key_check;
alter table public.outside_cache add constraint outside_cache_key_check check (key in ('stations', 'birds', 'wild'));
