-- ============================================
-- Hunt & gather: a dish picked for the week waits here until it is shopped for.
-- ============================================
-- A fridge row with no `bought_on` is still to shop for (the Kitchen's Hunt & gather card). Its
-- shopping list is worked out from its ingredients (src/lib/kitchen/week.js);
-- each thing crossed off that list is a row in `fridge_got`. When everything a
-- dish needs is got, or someone taps "Into the fridge" or "Done shopping",
-- `bought_on` is set and the dish is in the fridge. Additive: everything
-- already in the fridge counts as bought on the day it was added.

alter table public.fridge add column if not exists bought_on date;
update public.fridge set bought_on = added_on where bought_on is null;

-- One row for each thing crossed off a dish's shopping list.
-- `item` is the list's own key for it ("buy/ginger"), never free text from anyone.
create table public.fridge_got (
  fridge_id uuid not null references public.fridge (id) on delete cascade,
  item text not null check (length(item) between 1 and 120),
  got_on date not null,
  created_at timestamptz not null default now(),
  primary key (fridge_id, item)
);

alter table public.fridge_got enable row level security;
-- As the fridge itself: the family reads, the parents change.
create policy fridge_got_read on public.fridge_got for select to authenticated using ((select public.is_family()));
create policy fridge_got_add on public.fridge_got for insert to authenticated with check ((select public.is_parent()));
create policy fridge_got_remove on public.fridge_got for delete to authenticated using ((select public.is_parent()));

revoke all on public.fridge_got from anon;
grant select, insert, delete on public.fridge_got to authenticated;
