-- ============================================
-- Anna's academy: her school of rooms, goals, tasks, grades and cheers
-- ============================================
-- Run after 20261101090000_journal.sql (docs/DATABASE.md).
-- The family reads everything here and builds it together; Anna is the
-- principal. Her grades are seen only by the three of us (the family). The
-- pictures the family adds (a licensed pack, a drawing of hers) live in the
-- private `academy` bucket, each with its licence recorded, and only the
-- parents add or remove them.

-- ---- The school itself: one row ------------------------------------------------
create table public.academy_settings (
  id boolean primary key default true check (id),
  name text not null default 'Anna’s Academy' check (length(name) between 1 and 80),
  motto text check (motto is null or length(motto) <= 160),
  colours text[] not null default '{#1C2B22,#3FA34D,#F2C14E}' check (coalesce(array_length(colours, 1), 0) <= 4),
  mascot text check (mascot is null or length(mascot) <= 60),
  updated_at timestamptz not null default now()
);
create trigger academy_settings_touch before update on public.academy_settings for each row execute function public.touch_updated_at();

-- ---- Rooms: where each sits on the campus, its look, and what's in it ----------------
create table public.academy_rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind ~ '^[a-z]{2,20}$'),
  name text not null check (length(name) between 1 and 60),
  cx int not null default 0 check (cx between 0 and 20),
  cy int not null default 0 check (cy between 0 and 20),
  style jsonb not null default '{}' check (jsonb_typeof(style) = 'object' and length(style::text) <= 2000),
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 120),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger academy_rooms_touch before update on public.academy_rooms for each row execute function public.touch_updated_at();

-- ---- Tasks: each one done lights a star ---------------------------------------------
create table public.academy_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  subject text check (subject is null or length(subject) <= 60),
  due_on date,
  done_on date,
  created_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index academy_tasks_open on public.academy_tasks (done_on, due_on);

-- ---- Goals: steps toward something; reached, a trophy -----------------------------------
create table public.academy_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 160),
  why text check (why is null or length(why) <= 1000),
  icon text check (icon is null or icon ~ '^[a-z0-9-]{1,40}$'),
  due_on date,
  steps jsonb not null default '[]' check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 30),
  done_on date,
  created_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger academy_goals_touch before update on public.academy_goals for each row execute function public.touch_updated_at();

-- ---- Grades: entered by hand for now (QParent later, docs/PLAN.md) -------------------------
create table public.academy_grades (
  id uuid primary key default gen_random_uuid(),
  class_name text not null check (length(class_name) between 1 and 60),
  term text check (term is null or length(term) <= 40),
  mark text check (mark is null or length(mark) <= 8),
  percent numeric(5, 2) check (percent is null or percent between 0 and 150),
  on_date date not null default current_date,
  note text check (note is null or length(note) <= 500),
  created_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  check (mark is not null or percent is not null)
);
create index academy_grades_by_class on public.academy_grades (class_name, on_date);

-- ---- Cheers: anyone in the family celebrating Anna, for anything --------------------------
create table public.academy_cheers (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 160),
  note text check (note is null or length(note) <= 1000),
  icon text check (icon is null or icon ~ '^[a-z0-9-]{1,40}$'),
  on_date date not null default current_date,
  from_member uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---- Pictures the family adds, each with its licence -----------------------------------------
create table public.academy_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  cat text not null default 'Ours' check (length(cat) between 1 and 40),
  path text not null check (path ~ '^[0-9a-f-]{36}\.(png|webp)$'),
  licence text not null check (length(licence) between 3 and 300),   -- "CC0, Kenney Furniture Kit", "Bought from …, personal use", "Drawn by Anna"
  source text check (source is null or length(source) <= 500),
  created_by uuid default public.my_member_id() references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---- Row-level security ----------------------------------------------------------------------
alter table public.academy_settings enable row level security;
alter table public.academy_rooms enable row level security;
alter table public.academy_tasks enable row level security;
alter table public.academy_goals enable row level security;
alter table public.academy_grades enable row level security;
alter table public.academy_cheers enable row level security;
alter table public.academy_assets enable row level security;

create policy asettings_read on public.academy_settings for select to authenticated using ((select public.is_family()));
create policy asettings_add on public.academy_settings for insert to authenticated with check ((select public.is_family()));
create policy asettings_change on public.academy_settings for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));

create policy arooms_read on public.academy_rooms for select to authenticated using ((select public.is_family()));
create policy arooms_add on public.academy_rooms for insert to authenticated with check ((select public.is_family()));
create policy arooms_change on public.academy_rooms for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy arooms_remove on public.academy_rooms for delete to authenticated using ((select public.is_family()));

create policy atasks_read on public.academy_tasks for select to authenticated using ((select public.is_family()));
create policy atasks_add on public.academy_tasks for insert to authenticated with check ((select public.is_family()));
create policy atasks_change on public.academy_tasks for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy atasks_remove on public.academy_tasks for delete to authenticated using ((select public.is_family()));

create policy agoals_read on public.academy_goals for select to authenticated using ((select public.is_family()));
create policy agoals_add on public.academy_goals for insert to authenticated with check ((select public.is_family()));
create policy agoals_change on public.academy_goals for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy agoals_remove on public.academy_goals for delete to authenticated using ((select public.is_family()));

create policy agrades_read on public.academy_grades for select to authenticated using ((select public.is_family()));
create policy agrades_add on public.academy_grades for insert to authenticated with check ((select public.is_family()));
create policy agrades_change on public.academy_grades for update to authenticated using ((select public.is_family())) with check ((select public.is_family()));
create policy agrades_remove on public.academy_grades for delete to authenticated using ((select public.is_parent()));

create policy acheers_read on public.academy_cheers for select to authenticated using ((select public.is_family()));
create policy acheers_add on public.academy_cheers for insert to authenticated with check ((select public.is_family()) and from_member = (select public.my_member_id()));
create policy acheers_remove on public.academy_cheers for delete to authenticated using ((select public.is_parent()) or from_member = (select public.my_member_id()));

create policy aassets_read on public.academy_assets for select to authenticated using ((select public.is_family()));
create policy aassets_add on public.academy_assets for insert to authenticated with check ((select public.is_parent()));
create policy aassets_change on public.academy_assets for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy aassets_remove on public.academy_assets for delete to authenticated using ((select public.is_parent()));

-- ---- The pictures' bucket: private; the family sees them, the parents add and remove -------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academy', 'academy', false, 2097152, array['image/png', 'image/webp'])
on conflict (id) do nothing;
create policy academy_files_read on storage.objects for select to authenticated using (bucket_id = 'academy' and (select public.is_family()));
create policy academy_files_add on storage.objects for insert to authenticated with check (bucket_id = 'academy' and (select public.is_parent()));
create policy academy_files_remove on storage.objects for delete to authenticated using (bucket_id = 'academy' and (select public.is_parent()));

-- ---- Grants: signed-in users only, never the anonymous key ------------------------------------------
revoke all on public.academy_settings, public.academy_rooms, public.academy_tasks, public.academy_goals, public.academy_grades, public.academy_cheers, public.academy_assets from anon;
grant select, insert, update on public.academy_settings to authenticated;
grant select, insert, update, delete on public.academy_rooms to authenticated;
grant select, insert, update, delete on public.academy_tasks to authenticated;
grant select, insert, update, delete on public.academy_goals to authenticated;
grant select, insert, update, delete on public.academy_grades to authenticated;
grant select, insert, delete on public.academy_cheers to authenticated;
grant select, insert, update, delete on public.academy_assets to authenticated;
