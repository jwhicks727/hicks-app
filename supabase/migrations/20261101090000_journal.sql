-- ============================================
-- The journal: each person's own, and nobody else's
-- ============================================
-- Run after 20261101060200_paintings.sql (docs/DATABASE.md).
-- Every row here is readable, writable and removable by the person who wrote
-- it, and by no one else: not the other parent, not the SQL of a screen, not
-- Claude (no Edge Function reads these tables). There is no parent override,
-- on purpose (docs/DECISIONS-LOG.md, 2026-11-01).

-- ---- A day's entry: the day's question and its answer, anything else, gratitudes ----
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default public.my_member_id() references public.family_members (id) on delete cascade,
  on_date date not null,
  prompt_title text check (prompt_title is null or length(prompt_title) <= 80),
  prompt text check (prompt is null or length(prompt) <= 300),
  answer text check (answer is null or length(answer) <= 20000),
  reflection text check (reflection is null or length(reflection) <= 40000),
  gratitudes text[] not null default '{}' check (coalesce(array_length(gratitudes, 1), 0) <= 12),
  imported boolean not null default false,              -- brought in from a journal kept elsewhere
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, on_date)
);
create trigger journal_entries_touch before update on public.journal_entries for each row execute function public.touch_updated_at();

-- ---- Notes to your future self: written now, opened on their day ----------------------
create table public.journal_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default public.my_member_id() references public.family_members (id) on delete cascade,
  written_on date not null,
  open_on date not null,
  surprise boolean not null default false,              -- its day isn't shown until it comes
  body text not null check (length(body) between 1 and 4000),
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  check (open_on > written_on)
);
create index journal_notes_due on public.journal_notes (member_id, open_on);

-- ---- Each person's journal settings: which questions, and their outlets ----------------
create table public.journal_settings (
  member_id uuid primary key default public.my_member_id() references public.family_members (id) on delete cascade,
  prompt_set text not null default 'season' check (prompt_set in ('season', 'school', 'summer', 'none', 'custom')),
  prompts jsonb check (prompts is null or (jsonb_typeof(prompts) = 'array' and jsonb_array_length(prompts) = 7)),
  outlets jsonb not null default '[]' check (jsonb_typeof(outlets) = 'array' and length(outlets::text) <= 20000),
  updated_at timestamptz not null default now()
);
create trigger journal_settings_touch before update on public.journal_settings for each row execute function public.touch_updated_at();

-- ---- Row-level security: the writer only ------------------------------------------------
alter table public.journal_entries enable row level security;
alter table public.journal_notes enable row level security;
alter table public.journal_settings enable row level security;

create policy jentries_read on public.journal_entries for select to authenticated using (member_id = (select public.my_member_id()));
create policy jentries_add on public.journal_entries for insert to authenticated with check (member_id = (select public.my_member_id()));
create policy jentries_change on public.journal_entries for update to authenticated using (member_id = (select public.my_member_id())) with check (member_id = (select public.my_member_id()));
create policy jentries_remove on public.journal_entries for delete to authenticated using (member_id = (select public.my_member_id()));

create policy jnotes_read on public.journal_notes for select to authenticated using (member_id = (select public.my_member_id()));
create policy jnotes_add on public.journal_notes for insert to authenticated with check (member_id = (select public.my_member_id()));
create policy jnotes_change on public.journal_notes for update to authenticated using (member_id = (select public.my_member_id())) with check (member_id = (select public.my_member_id()));
create policy jnotes_remove on public.journal_notes for delete to authenticated using (member_id = (select public.my_member_id()));

create policy jsettings_read on public.journal_settings for select to authenticated using (member_id = (select public.my_member_id()));
create policy jsettings_add on public.journal_settings for insert to authenticated with check (member_id = (select public.my_member_id()));
create policy jsettings_change on public.journal_settings for update to authenticated using (member_id = (select public.my_member_id())) with check (member_id = (select public.my_member_id()));

-- ---- Grants: signed-in users only, never the anonymous key ---------------------------------
revoke all on public.journal_entries, public.journal_notes, public.journal_settings from anon;
grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert, update, delete on public.journal_notes to authenticated;
grant select, insert, update on public.journal_settings to authenticated;
