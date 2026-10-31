-- ============================================
-- The Kitchen: Jason's recipes, our ratings, and what's in the fridge
-- ============================================
-- Run after 20261031230000_foundations.sql (docs/DATABASE.md). Named a minute
-- after it so it sorts after it; the foundations' name was set ahead of time.
--
-- Laurie's food rules are not here: they are health information and get
-- their own migration, readable by Jason and Laurie only. For the same
-- reason a recipe's "Laurie's plate" section is kept apart, in
-- recipe_private, which only the parents can read.

-- Which family member is signed in (null for anyone else).
create or replace function public.my_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.family_members m
  where m.email is not null and lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;
revoke execute on function public.my_member_id() from public, anon;
grant execute on function public.my_member_id() to authenticated;

-- ---- Recipes: the file as Jason writes it, less Laurie's plate ---------------
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,80}$'),
  title text not null check (length(title) between 1 and 200),
  body text not null check (length(body) <= 60000),
  total_minutes int check (total_minutes between 0 and 2880),
  hands_on_minutes int check (hands_on_minutes between 0 and 2880),
  serves int check (serves between 1 and 50),
  tags text[] not null default '{}',
  art text[] not null default '{}' check (cardinality(art) <= 3),   -- its three pictures (public/food/)
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger recipes_touch before update on public.recipes for each row execute function public.touch_updated_at();

-- ---- Laurie's plate: protein and what was kept off. Parents only. ------------
create table public.recipe_private (
  recipe_id uuid primary key references public.recipes (id) on delete cascade,
  laurie_plate text check (laurie_plate is null or length(laurie_plate) <= 8000),
  updated_at timestamptz not null default now()
);

-- ---- Ratings: each of us rates for ourselves, 1 to 5 ----------------------
create table public.recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  member_id uuid not null references public.family_members (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  rated_at timestamptz not null default now(),
  unique (recipe_id, member_id)
);

-- ---- The fridge: the recipes bought for this week, until cooked ------------
create table public.fridge (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  added_on date not null,
  status text not null default 'waiting' check (status in ('waiting', 'cooked', 'skipped')),
  done_on date,
  created_at timestamptz not null default now()
);
create unique index fridge_one_waiting on public.fridge (recipe_id) where status = 'waiting';
create index fridge_by_status on public.fridge (status, added_on);

-- ---- Row-level security --------------------------------------------------------
alter table public.recipes enable row level security;
alter table public.recipe_private enable row level security;
alter table public.recipe_ratings enable row level security;
alter table public.fridge enable row level security;

create policy recipes_read on public.recipes for select to authenticated using ((select public.is_family()));
create policy recipes_add on public.recipes for insert to authenticated with check ((select public.is_parent()));
create policy recipes_change on public.recipes for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy recipes_remove on public.recipes for delete to authenticated using ((select public.is_parent()));

create policy private_read on public.recipe_private for select to authenticated using ((select public.is_parent()));
create policy private_add on public.recipe_private for insert to authenticated with check ((select public.is_parent()));
create policy private_change on public.recipe_private for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy private_remove on public.recipe_private for delete to authenticated using ((select public.is_parent()));

-- Everyone in the family sees the ratings; each writes only their own.
create policy ratings_read on public.recipe_ratings for select to authenticated using ((select public.is_family()));
create policy ratings_add on public.recipe_ratings for insert to authenticated with check (member_id = (select public.my_member_id()));
create policy ratings_change on public.recipe_ratings for update to authenticated using (member_id = (select public.my_member_id())) with check (member_id = (select public.my_member_id()));
create policy ratings_remove on public.recipe_ratings for delete to authenticated using (member_id = (select public.my_member_id()));

create policy fridge_read on public.fridge for select to authenticated using ((select public.is_family()));
create policy fridge_add on public.fridge for insert to authenticated with check ((select public.is_parent()));
create policy fridge_change on public.fridge for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy fridge_remove on public.fridge for delete to authenticated using ((select public.is_parent()));

-- ---- Grants: signed-in users only, never the anonymous key --------------------
revoke all on public.recipes, public.recipe_private, public.recipe_ratings, public.fridge from anon;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_private to authenticated;
grant select, insert, update, delete on public.recipe_ratings to authenticated;
grant select, insert, update, delete on public.fridge to authenticated;
