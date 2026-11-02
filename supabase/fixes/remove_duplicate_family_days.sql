-- One-off clean-up (run once): family days that were entered twice by a seed run
-- twice. Keeps one of each (same title and date) and deletes the extra. Family
-- members are NOT touched: each person's two rows are two sign-in addresses.
delete from public.family_days d
using (
  select id, row_number() over (partition by title, month, day order by created_at, id) as n
  from public.family_days
) x
where d.id = x.id and x.n > 1;
