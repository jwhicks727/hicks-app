# The database

The family's own Supabase project (free plan, West US). New tables are not
exposed automatically, and row-level security is on for every table: each
migration grants and guards its own tables explicitly. Nothing is readable
without signing in as one of the family.

## Running a migration

Migrations live in `supabase/migrations/`, named by timestamp
(`yyyymmddhhmmss_short_description.sql`, UTC). Run each new one once, in
order, in the Supabase dashboard: SQL Editor → New query → paste the file →
Run. (The Supabase CLI's `supabase db push` does the same, from a computer.)
Never edit a migration after it has run; fix it with a new one.

## After the first migration: the family

Add the three of us once, in the SQL editor, with the addresses we sign in
with. These addresses never go in the repository.

```sql
insert into public.family_members (name, email, role, colour) values
  ('Jason',  '<Jason''s sign-in address>',  'parent', '#C42D20'),
  ('Laurie', '<Laurie''s sign-in address>', 'parent', '#3F5C31'),
  ('Anna',   '<Anna''s sign-in address>',   'child',  '#2E8B3E');
```

Then the family days. They live in the database, not in code: add them in
the app (Admin → Family days, once a parent has signed in), or all at once
here. The years are counted for you ("Turning 12", "25th anniversary:
silver"); `note` is the line under a day with no year to count.

```sql
insert into public.family_days (title, month, day, year, kind, for_whom, note)
select v.title, v.month, v.day, v.year, v.kind, m.id, v.note
from (values
  ('Anna''s adoption day', 11, 1, 2015, 'celebrate', 'Anna', null),
  ('Jason and Laurie''s dating anniversary', 1, 3, 1999, 'celebrate', null, null),
  ('Wedding anniversary', 7, 27, 2002, 'celebrate', null, null),
  ('Jason''s birthday', 6, 30, 1980, 'celebrate', 'Jason', null),
  ('Laurie''s birthday', 8, 30, 1979, 'celebrate', 'Laurie', null),
  ('Anna''s birthday', 7, 15, 2015, 'celebrate', 'Anna', null),
  ('Angelversary', 10, 11, null, 'remember', 'Jason', 'Remembering Jason''s dad')
) as v(title, month, day, year, kind, who, note)
left join public.family_members m on m.name = v.who;
```

Each calendar source in Admin has a "Whose is it": mark Kordyak's calendar
as Laurie's, Wayne Ruble's as Anna's and SOAR's as Jason's, and the year
view lines up their days off.

## Reading calendar feeds

The `read-sources` Edge Function (`supabase/functions/read-sources/`) reads
every calendar source in Admin that is a feed (iCal, webcal, or a Google
Calendar's iCal address) into `calendar_events`, nightly and when a parent
presses "Read now". Each reading is kept in `source_versions`; a feed that
hasn't changed writes nothing; an upcoming event that leaves the feed is
hidden with a dated note, never deleted, and nothing in the past is touched
(the rules: `supabase/functions/_shared/sync.js`). Documents, pictures and
web pages are not read yet.

Once, from a computer with Node (the project's reference is the part of the
Supabase URL before `.supabase.co`):

```sh
npx supabase login
npx supabase functions deploy read-sources --no-verify-jwt --project-ref <project-ref>
openssl rand -hex 32        # the nightly schedule's key: keep it for the next two steps
npx supabase secrets set READ_SOURCES_KEY=<that key> --project-ref <project-ref>
```

`--no-verify-jwt` is deliberate: the function checks its caller itself (a
signed-in parent, through `is_parent()`, or the schedule's key) and turns
everyone else away.

Then the nightly run, in the SQL editor. Switch on `pg_cron` and `pg_net`
first (Database → Extensions). The key goes into Supabase's Vault, not into
the schedule's text:

```sql
select vault.create_secret('<that key>', 'read_sources_key');

select cron.schedule('read-calendar-feeds', '17 11 * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/read-sources',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-read-sources-key', (select decrypted_secret from vault.decrypted_secrets where name = 'read_sources_key')),
    body := '{}'::jsonb)
$$);
```

`17 11 * * *` is 11:17 UTC: 3:17 AM at home in winter, 4:17 AM in summer.
To stop it: `select cron.unschedule('read-calendar-feeds');`. Each run reads
at most 20 feeds, waits at most 15 seconds for each, and refuses a feed over
3 MB.

## The readings

The `readings` Edge Function (`supabase/functions/readings/`) reads the Mass
readings for a date (and, on days with several Masses, each one) from the
USCCB's readings page, for a signed-in family member to read in the app. It
stores nothing and answers no one else. Its reading of the page
(`supabase/functions/_shared/readings.js`) is unverified against the live
site: if the app says the page "didn't read cleanly", USCCB's page has
changed shape, and the link to it still works. Deploy it like the feed
reader:

```sh
npx supabase functions deploy readings --no-verify-jwt --project-ref <project-ref>
```

## Mass times, the stations and the birds

Three Edge Functions read the outside world for the family, each answering
only a signed-in family member and keeping what it read where the family
can read it but not change it. They use the service role key Supabase gives
every function; nothing to set for that.

- **`parish`** reads Sacred Heart's website (the home page, then up to
  three of its own Mass-times pages) at most once a day, or once in ten
  minutes when a parent taps Admin › Mass times › Read it again. Its
  reading (`supabase/functions/_shared/parish.js`) takes the lines under
  a Mass-times heading, each day or range of days and its times; every
  weekday Mass is a Daily Mass. A week that differs from the last is a new
  row of `parish_schedules`, so every version is kept; one that doesn't
  look like a parish's week (no Sunday Mass, too few weekdays) is never
  kept. Unverified against the live site until it first runs: Admin shows
  what it read, or that it couldn't.
- **`stations`** reads the stations in `weather_stations` through Synoptic
  with `SYNOPTIC_TOKEN`, at most every quarter hour (sooner after a change
  in Admin), keeping the answer in `outside_cache`. A station quiet for 90
  minutes hands over to its fallback airport. Home's readings go out
  without its station's id, name or place.
- **`birds`** reads eBird with `EBIRD_API_KEY` at most once an hour, about
  the town's centre (this week, within about ten miles; the notable ones
  within twenty), and looks up a photo on iNaturalist for the first dozen
  species, kept only with a Creative Commons licence and its credit. A
  sighting at a private location keeps its bird and day, not its place.

- **`wild`** reads each wild season's own site (the eagle cam, the monarch
  count, BirdCast and the rest, listed in `_shared/wildpics.js`) at most once a
  week and keeps the address of its preview picture, its page and the site's
  name in `outside_cache` (key `wild`, from migration 20261101214500). The
  browser loads the picture from the site itself; only https, only the site's
  own host, only a real image of a sensible size. A page with no picture of its
  own is left out and the card keeps its drawing. Unverified against the live
  sites until it first runs.

```sh
npx supabase functions deploy wild --no-verify-jwt --project-ref <project-ref>
npx supabase functions deploy parish --no-verify-jwt --project-ref <project-ref>
npx supabase secrets set SYNOPTIC_TOKEN=... --project-ref <project-ref>
npx supabase functions deploy stations --no-verify-jwt --project-ref <project-ref>
npx supabase secrets set EBIRD_API_KEY=... --project-ref <project-ref>
npx supabase functions deploy birds --no-verify-jwt --project-ref <project-ref>
```

Synoptic and eBird answers are written to their documented formats and
unverified against the live services until the functions first run.

## Claude

The `claude` Edge Function (`supabase/functions/claude/`) is the app's one
door to Claude. It answers only a signed-in family member, and the
planning tasks only Jason or Laurie. What each task sends, and to which
model, is in `supabase/functions/_shared/claude.js`.

- **Always the latest Sonnet.** The function asks Anthropic's Models API
  which Sonnets are active and uses the newest. No version is written into
  the app; a new Sonnet is used the day it arrives.
- **Within a budget.** Each call is recorded in `ai_usage`. Once the family
  has spent the day's cap ($3 unless `AI_DAILY_CAP_CENTS` says otherwise)
  or the month's ($30, `AI_MONTHLY_CAP_CENTS`), it declines until the next
  day or month. Set a spending limit in Anthropic's console too.
- **Laurie's food rules** reach Claude only for a parent's request (Jason's
  or Laurie's), never anyone else's. The `ai_consents` table, where she
  once answered yes or no, is no longer read; its rows are kept as history.
- **A refused request** is retried server-side on Anthropic's recommended
  fallback model (`fallbacks: "default"`).

Set the key and deploy:

```sh
npx supabase secrets set ANTHROPIC_API_KEY=... --project-ref <project-ref>
npx supabase functions deploy claude --no-verify-jwt --project-ref <project-ref>
```

## Signing in

For now, a sign-in link by email (Supabase's own, no setup needed). Once the
three of us have signed in, turn off new sign-ups (Authentication → Sign In /
Providers → "Allow new users to sign up"), so nobody else can make an account.
Google sign-in comes with the Calendar sync, which needs it anyway.

Add the app's address to Authentication → URL Configuration → Redirect URLs
(`http://localhost:5173` while building; the hosted address later), or the
sign-in link won't come back to the app.

## The tables

| Table | Holds | Who can read | Who can change |
|---|---|---|---|
| `family_members` | The three of us. A person may have two rows (two sign-in addresses); the app treats same-named rows as one person (`src/lib/cal/people.js`, the lowest id stands for them) | The family | The SQL editor only |
| `sources` | Every outside calendar, document, folder or feed, with what it covers and when it goes stale | The family | Parents |
| `source_versions` | Each reading of a source, kept as history | The family | Parents add; nobody changes |
| `calendar_events` | Events from sources and from us; "proposed" until approved when read from a document. Our own can have a place (name and coordinates) and be marked outdoors | The family | The family; parents remove |
| `family_days` | Birthdays, anniversaries, Anna's adoption day, the angelversary | The family | Parents |
| `recipes` | Jason's recipe files, less Laurie's plate; their three pictures | The family | Parents |
| `recipe_private` | Each recipe's "Laurie's plate" (protein, what was kept off) | Parents only | Parents |
| `recipe_ratings` | Our 1–5 ratings, one each per recipe | The family | Each of us, our own only (`my_member_id()`) |
| `fridge` | The recipes bought for this week, until cooked | The family | Parents |
| `ai_usage` | Each call to Claude: who, which task, which model, tokens and cost | Parents all; each of us our own | Only `ai_record()`, from the `claude` function |
| `ai_consents` | Once: each owner's yes or no to sending something of theirs to Claude (Laurie's food rules). No longer read since 2026-11-01; kept as history | Parents, and each of us our own | Each of us, our own only |
| `food_rules` | Laurie's food rules, every version kept, dated, with what changed | Parents only | Parents add a new version; nobody edits one |
| `kitchen_preferences` | The kitchen's tastes, dislikes, pantry and equipment, every version kept | The family | Parents add a new version |
| `week_plans` | A plan's ask, the ideas Claude gave, the ones picked; `dismissed_at` when put away (a plan stays open until then, whatever week it was made) | The family | Parents |
| `week_plan_recipes` | The full recipes written for a plan's picks, until saved to the cookbook or put away (they carry Laurie's plate) | Parents only | Parents |
| `garden_areas` | The garden's areas: the yard, the patio, a room inside; about how big; a room's light | The family | The family; parents remove |
| `garden_spots` | What's on an area's map: beds, boxes, pots, trees, feeders, baths, paths; where (in percent of the area) and how sunny; indoors, a pot's plant type, size and pot, for the side view | The family | The family; parents remove |
| `garden_plants` | What grows in a spot: variety, when planted, water every N days | The family | The family |
| `garden_log` | Care as it's done: watered, fed, pruned, picked, refilled, notes | The family | The family |
| `garden_photos` | A spot's photos (in the private `garden` bucket, read through signed links), and what Claude said when asked | The family | The family |
| `annas_drawings` | Anna's Gallery: a drawing's title, the day she drew it, her own words, what it's about (`pets` hangs it in the Pets launch), its size; the pictures (a large one and a small one) in the private `drawings` bucket, read through signed links | The family | Anyone in the family adds their own; whoever added it, or a parent, changes or removes it (and its files) |
| `paintings` | Laurie's paintings: title (and whether it's her title), year, medium, size, seasons, what part a panel shows, the bird or leaves that move; the files in the private `paintings` bucket | The family | Parents (her blanket yes covers them all; `said_yes_by` is history) |
| `bird_sightings` | Laurie's birds from her eBird download: one row per bird per checklist, the place by name and to about a kilometre | Parents only | Parents (the file is read in the browser; same file twice changes nothing) |
| `outings` | Camping trips, Disneyland trips, trips and outings: dates, place, who came, a national park if it was one, notes | The family | Parents |
| `park_marks` | The national parks: the day we went, whether it's starred as next, a note | The family | Parents |
| `journal_entries` | A person's journal: one page a day, the day's question and answer, anything else, gratitudes; whether it was brought in from elsewhere; each day's fingerprint in the writer's Google Doc and here as the two last agreed (`doc_hash`, `app_hash`) | Its writer only, not even a parent | Its writer only |
| `journal_notes` | Notes to your future self: written, sealed until their day (a surprise day isn't shown), opened | Its writer only | Its writer only |
| `journal_settings` | A person's journal settings: which questions, their own questions, their outlets; the Google Doc it keeps in step with (`doc_id`, `doc_title`), the line its days stop above (`doc_stop`), when they last agreed, and days removed here since (`doc_removed`) | Its writer only | Its writer only |
| `academy_settings` | Anna's academy: its name, motto, colours, mascot (one row) | The family | The family |
| `academy_rooms` | Its rooms: kind, name, square on the campus, walls and floor, and what's in each (a list of pictures with their square, size, flip and colour) | The family | The family |
| `academy_tasks` | Anna's tasks: what, which class, when due, when done (each done lights a star) | The family | The family |
| `academy_goals` | Her goals: why, a picture, steps, when reached (a trophy) | The family | The family |
| `academy_grades` | Her grades, entered by hand (QParent later): class, letter or percent, term, date | The family (the three of us) | The family; parents remove |
| `academy_cheers` | Cheers for Anna, for anything: what for, a note, a picture, who from | The family | The family adds as themselves; parents or the cheerer remove |
| `member_phones` | A family member's phone number (E.164), so the Kitchen can open a text to Laurie in one tap | Parents only | Parents only |
| `parish_schedules` | Sacred Heart's week of Masses and confession as read from its website, a new row whenever it changes; when first seen and last checked | The family | Only the `parish` function |
| `weather_stations` | Which station each place reads (home, Kordyak, Wayne Ruble, SOAR) and its fallback airport | The family | Parents (station and fallback only) |
| `sync_consents` | Laurie's own yes to the nightly eBird sync | Parents | A parent records a yes under their own id; either parent can remove it |
| `bird_sync_runs` | A log of each nightly eBird run (written before it signs in, so a rejected sign-in is never retried within 24 hours) | Parents | Nobody from the app: only the job (service role) |
| `outside_cache` | The last answer from Synoptic (`stations`) and eBird (`birds`), as the functions shaped it | The family | Only the `stations` and `birds` functions |
| `academy_assets` | Pictures the family adds for the rooms (in the private `academy` bucket), each with its licence and source | The family | Parents |

Migration index:

| Migration | What it does |
|---|---|
| `20261031230000_foundations` | The family, sources and their versions, calendar events, family days; `is_family()`, `is_parent()`; row-level security and grants. |
| `20261031230100_kitchen` | Recipes, Laurie's plate kept apart, ratings, the fridge; `my_member_id()`. Named a minute after the foundations so it runs after them. |
| `20261031230200_event_places` | Events get a place (name, coordinates, both or neither), an outdoors switch and who made them. |
| `20261101060000_claude_and_kitchen_planning` | Claude's usage and the caps (`ai_spend()`, `ai_record()`), consents, Laurie's food rules (versioned, parents only), kitchen preferences, week plans. |
| `20261101060100_garden` | The garden's areas, spots, plants, care log and photos, and the private `garden` bucket for the photos (family only). |
| `20261101060200_paintings` | Laurie's paintings, behind sign-in: the table and the private bucket (family reads, parents add). |
| `20261101090000_journal` | Each person's journal: entries, notes to your future self, settings. Every policy is the writer's only, with no parent or family override (tests/migrations.test.mjs checks). |
| `20261101090100_academy` | Anna's academy: settings, rooms, tasks, goals, grades, cheers, the family's own pictures and the private `academy` bucket (family reads; parents add pictures). |
| `20261101120000_parish_stations_birds` | What the app reads from outside: Sacred Heart's schedules (every version), the station each place reads (the schools' seeded, home's set in Admin), and the last answer from Synoptic and eBird. The family reads; the functions write; parents choose the stations. |
| `20261102120000_birds_more_cache` | `outside_cache` also takes the key `birds-more` (hotspots, county numbers, this month's possibles) |
| `20261101183000_member_phones` | A family member's phone number, parents only (own table, so the people list stays readable by everyone), for "text the list to Laurie". |
| `20261101233000_ebird_sync` | Laurie's own yes to the nightly eBird sync, and the log of each run (parents read both; only she writes her yes; only the job writes the log) |
| `20261105143346_journal_doc_sync` | A journal kept in step with its writer's Google Doc: the link and its state on `journal_settings`, each day's fingerprints on `journal_entries`. No new policy or grant: both tables are already the writer's only. |
| `20261105040000_annas_gallery` | Anna's Gallery: `annas_drawings` and the private `drawings` bucket (JPEGs, 8 MB). Everyone in the family reads; whoever adds a drawing, or a parent, changes or removes it and its files. |
| `20261102000500_ebird_sync_parent_can_stop` | Either parent can remove the sync's yes, so Laurie can stop one Jason switched on |
