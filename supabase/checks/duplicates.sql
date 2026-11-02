-- Read-only: are any family members or family days in the table twice?
-- Shows every row of either table that has another with the same name/title.
-- Emails are hidden (only whether one is set). Changes nothing.
select 'member' as what, name as title, role as detail, (email is not null) as has_email, id::text, created_at
from public.family_members
where name in (select name from public.family_members group by name having count(*) > 1)
union all
select 'day', title, month || '/' || day, null, id::text, created_at
from public.family_days
where (title, month, day) in (select title, month, day from public.family_days group by title, month, day having count(*) > 1)
order by what, title, created_at;
