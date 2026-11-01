-- ============================================
-- Life List: Laurie's birds, our outings, the national parks, what her paintings show
-- ============================================
-- Run after 20261101214500_plans_stay_until_dismissed.sql (docs/DATABASE.md).

-- ---- Laurie's bird sightings, from the file eBird gives her ---------------------
-- One row per bird on each checklist. Read and written by the parents only:
-- where she walks says where she is. Places keep their name and about a
-- kilometre of position (two decimals); never an exact point.
create table public.bird_sightings (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.family_members (id) on delete cascade,
  submission_id text not null check (length(submission_id) between 1 and 40),
  species text not null check (length(species) between 1 and 120),
  sci_name text not null default '' check (length(sci_name) <= 120),
  taxon_order numeric,
  count int check (count is null or count >= 0),               -- null: present, not counted ("X")
  observed_on date not null,
  observed_time time,
  state text check (state is null or length(state) <= 20),
  county text check (county is null or length(county) <= 80),
  location text not null default '' check (length(location) <= 200),
  location_id text check (location_id is null or length(location_id) <= 20),
  lat numeric(6, 2), lng numeric(6, 2),
  protocol text check (protocol is null or length(protocol) <= 80),
  duration_min int, distance_km numeric, observers int,
  has_media boolean not null default false,
  comments text check (comments is null or length(comments) <= 600),
  source text not null default 'ebird' check (source in ('ebird', 'merlin')),
  imported_at timestamptz not null default now(),
  unique (member_id, submission_id, sci_name, species)
);
create index bird_sightings_by_day on public.bird_sightings (member_id, observed_on desc);
alter table public.bird_sightings enable row level security;
create policy sightings_read on public.bird_sightings for select to authenticated using ((select public.is_parent()));
create policy sightings_add on public.bird_sightings for insert to authenticated with check ((select public.is_parent()));
create policy sightings_change on public.bird_sightings for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy sightings_remove on public.bird_sightings for delete to authenticated using ((select public.is_parent()));

-- ---- Outings: camping, Disneyland, trips ------------------------------------------
create table public.outings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('camping', 'disneyland', 'trip', 'outing')),
  title text not null check (length(title) between 1 and 120),
  starts_on date not null,
  ends_on date not null,
  place text check (place is null or length(place) <= 200),
  with_whom text check (with_whom is null or length(with_whom) <= 200),
  park text check (park is null or park ~ '^[a-z0-9-]{2,60}$'),   -- a national park's slug, if it was one
  notes text check (notes is null or length(notes) <= 2000),
  created_by uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index outings_by_date on public.outings (starts_on desc);
create trigger outings_touch before update on public.outings for each row execute function public.touch_updated_at();
alter table public.outings enable row level security;
create policy outings_read on public.outings for select to authenticated using ((select public.is_family()));
create policy outings_add on public.outings for insert to authenticated with check ((select public.is_parent()));
create policy outings_change on public.outings for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy outings_remove on public.outings for delete to authenticated using ((select public.is_parent()));

-- ---- The national parks: which we've been to, which we want ---------------------------
create table public.park_marks (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  visited_on date,
  want boolean not null default false,
  note text check (note is null or length(note) <= 500),
  updated_at timestamptz not null default now()
);
create trigger park_marks_touch before update on public.park_marks for each row execute function public.touch_updated_at();
alter table public.park_marks enable row level security;
create policy park_marks_read on public.park_marks for select to authenticated using ((select public.is_family()));
create policy park_marks_add on public.park_marks for insert to authenticated with check ((select public.is_parent()));
create policy park_marks_change on public.park_marks for update to authenticated using ((select public.is_parent())) with check ((select public.is_parent()));
create policy park_marks_remove on public.park_marks for delete to authenticated using ((select public.is_parent()));

-- ---- What a painting shows, so it can stand in for a photo ---------------------------
-- Keys like park:joshua-tree, bird:anna-s-hummingbird, place:big-bear; set by a parent, never guessed.
alter table public.paintings add column subjects text[] not null default '{}' check (cardinality(subjects) <= 12);

revoke all on public.bird_sightings, public.outings, public.park_marks from anon;
grant select, insert, update, delete on public.bird_sightings, public.outings, public.park_marks to authenticated;
