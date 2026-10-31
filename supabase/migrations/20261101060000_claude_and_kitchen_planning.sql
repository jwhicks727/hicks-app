-- ============================================
-- Claude in the app, and the Kitchen's week: rules, preferences, plans
-- ============================================
-- Run after 20261031230200_event_places.sql (docs/DATABASE.md).
--
-- Claude is reached only through the `claude` Edge Function, which checks
-- the caller is family, keeps to a daily and monthly spend, and records
-- each call here. Laurie's food rules are health information: Jason and
-- Laurie only, every version kept, and sent to Claude only while her own
-- yes (ai_consents) stands.

-- ---- What each call to Claude cost, for the caps and for Reports ------------
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.family_members (id) on delete set null,
  task text not null check (length(task) <= 40),
  model text not null check (length(model) <= 80),
  input_tokens int not null default 0 check (input_tokens >= 0),
  output_tokens int not null default 0 check (output_tokens >= 0),
  cost_cents numeric(10, 4) not null default 0 check (cost_cents >= 0),
  created_at timestamptz not null default now()
);
create index ai_usage_by_time on public.ai_usage (created_at);

-- The family's spend so far today and this month (home's time), in cents.
-- Anyone in the family may ask, so a cap applies to everyone alike.
create or replace function public.ai_spend() returns table (today_cents numeric, month_cents numeric)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(cost_cents) filter (where (created_at at time zone 'America/Los_Angeles')::date = (now() at time zone 'America/Los_Angeles')::date), 0),
    coalesce(sum(cost_cents) filter (where date_trunc('month', created_at at time zone 'America/Los_Angeles') = date_trunc('month', now() at time zone 'America/Los_Angeles')), 0)
  from public.ai_usage
  where public.is_family() and created_at > now() - interval '32 days'
$$;

-- A call, recorded as the signed-in member's.
create or replace function public.ai_record(p_task text, p_model text, p_in int, p_out int, p_cents numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_family() then raise exception 'For the family only'; end if;
  insert into public.ai_usage (member_id, task, model, input_tokens, output_tokens, cost_cents)
  values (public.my_member_id(), left(p_task, 40), left(p_model, 80), greatest(p_in, 0), greatest(p_out, 0), greatest(p_cents, 0));
end $$;

-- ---- A yes, given by its owner, for something of theirs to go to Claude ------
-- The latest row for (member, what) is the answer; a no is a new row.
create table public.ai_consents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.family_members (id) on delete cascade,
  what text not null check (what in ('food_rules')),
  granted boolean not null,
  at timestamptz not null default now()
);
create index ai_consents_latest on public.ai_consents (member_id, what, at desc);

-- ---- Laurie's food rules: versioned, dated, never edited in place ------------
create table public.food_rules (
  id uuid primary key default gen_random_uuid(),
  belongs_to uuid not null references public.family_members (id) on delete cascade,  -- whose rules
  body text not null check (length(body) between 1 and 20000),
  note text check (note is null or length(note) <= 500),                           -- what changed
  created_by uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index food_rules_latest on public.food_rules (belongs_to, created_at desc);

-- ---- The kitchen's preferences: tastes, pantry, equipment; versioned ---------
create table public.kitchen_preferences (
  id uuid primary key default gen_random_uuid(),
  body text not null check (length(body) between 1 and 20000),
  note text check (note is null or length(note) <= 500),
  created_by uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---- A week's plan: what was asked, the ideas, the ones picked ----------------
create table public.week_plans (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  asked text check (asked is null or length(asked) <= 2000),   -- anything added to the ask ("and three breakfasts")
  ideas jsonb not null default '[]'::jsonb check (jsonb_typeof(ideas) = 'array'),
  picked int[] not null default '{}',
  status text not null default 'ideas' check (status in ('ideas', 'picked', 'written')),
  created_by uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index week_plans_by_week on public.week_plans (week_of desc, created_at desc);
create trigger week_plans_touch before update on public.week_plans for each row execute function public.touch_updated_at();

-- ---- Row-level security --------------------------------------------------------
alter table public.ai_usage enable row level security;
alter table public.ai_consents enable row level security;
alter table public.food_rules enable row level security;
alter table public.kitchen_preferences enable row level security;
alter table public.week_plans enable row level security;

-- Usage: the parents read it all (Reports); each of us reads our own. Written only through ai_record().
create policy ai_usage_read on public.ai_usage for select to authenticated
  using ((select public.is_parent()) or member_id = (select public.my_member_id()));

-- A yes or no is its owner's to give; the parents can see where things stand.
create policy consents_read on public.ai_consents for select to authenticated
  using ((select public.is_parent()) or member_id = (select public.my_member_id()));
create policy consents_add on public.ai_consents for insert to authenticated
  with check (member_id = (select public.my_member_id()));

-- Food rules: Jason and Laurie only. Kept, never changed: a change is a new version.
create policy rules_read on public.food_rules for select to authenticated using ((select public.is_parent()));
create policy rules_add on public.food_rules for insert to authenticated with check ((select public.is_parent()));

-- Preferences and plans: the family reads; the parents write.
create policy prefs_read on public.kitchen_preferences for select to authenticated using ((select public.is_family()));
create policy prefs_add on public.kitchen_preferences for insert to authenticated with check ((select public.is_parent()));
create policy plans_read on public.week_plans for select to authenticated using ((select public.is_family()));
create policy plans_add on public.week_plans for insert to authenticated with check ((select public.is_parent()));
create policy plans_change on public.week_plans for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy plans_remove on public.week_plans for delete to authenticated using ((select public.is_parent()));

-- ---- Grants: signed-in users only, never the anonymous key --------------------
revoke all on public.ai_usage, public.ai_consents, public.food_rules, public.kitchen_preferences, public.week_plans from anon;
grant select on public.ai_usage to authenticated;
grant select, insert on public.ai_consents to authenticated;
grant select, insert on public.food_rules to authenticated;
grant select, insert on public.kitchen_preferences to authenticated;
grant select, insert, update, delete on public.week_plans to authenticated;
revoke execute on function public.ai_spend() from public, anon;
revoke execute on function public.ai_record(text, text, int, int, numeric) from public, anon;
grant execute on function public.ai_spend() to authenticated;
grant execute on function public.ai_record(text, text, int, int, numeric) to authenticated;
