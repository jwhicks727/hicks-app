-- ============================================
-- Phone numbers, for "text the list to Laurie"
-- ============================================
-- Run after 20261101120000_parish_stations_birds.sql (docs/DATABASE.md).
-- A number lets the Kitchen open a message to her with one tap (the message
-- is made and sent by the phone's own Messages, never by this app). Parents
-- only: the children's accounts can't read or change any number. Kept in its
-- own table, not on family_members, so the people list stays readable by all.

create table public.member_phones (
  member_id uuid primary key references public.family_members (id) on delete cascade,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),   -- E.164, like +19095551234
  updated_at timestamptz not null default now()
);

alter table public.member_phones enable row level security;
create policy member_phones_read on public.member_phones for select to authenticated using ((select public.is_parent()));
create policy member_phones_add on public.member_phones for insert to authenticated with check ((select public.is_parent()));
create policy member_phones_change on public.member_phones for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy member_phones_remove on public.member_phones for delete to authenticated using ((select public.is_parent()));

revoke all on public.member_phones from anon;
grant select, insert, update, delete on public.member_phones to authenticated;
