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
  Away from home (`kind: near`), the app sends a tenth-of-a-degree cell
  (about ten kilometres), never a closer point; the function asks eBird about
  the cell's centre (the week's sightings, the notable ones, the hotspots, and
  a sample of twenty checklists from the county its hotspots are filed under),
  keeps each cell's answer an hour under `birds-near:<lat>,<lng>` (migration
  20261107230000), and asks about at most ten new cells a day. Home's own cell
  gets `{ home: true }`. Deploy it again after the merge for this to work.

- **`around`** reads what the open map knows around an area away from home: a
  tenth-of-a-degree cell from the app, never a closer point. OpenStreetMap
  through Overpass (roasters, breweries, book and record shops, trailheads,
  viewpoints, Catholic churches, museums and galleries, within 15 km), and
  Wikipedia's articles near the cell with their Wikimedia Commons photos (open
  licences only, with the author and licence). It keeps the answer in
  `area_guides` (kind `map`), reads again at most weekly per cell and about a
  dozen new cells a day. No key. Deploy it after the merge:
  `npx supabase functions deploy around --no-verify-jwt --project-ref <project-ref>`.

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
- **Anna's drawings, as they're added** (`read-drawing`, anyone in the family): the cropped photo of the drawing, one picture. Claude suggests a working title, whether it's about the pets and any day written on it; her words are never asked for, and a name written on a drawing is never taken. Nothing is written until whoever is adding it says it looks right on screen. About a cent a drawing (an estimate, not yet measured), within the caps.
- **Laurie's paintings, as they're added** (`read-painting`, Jason or Laurie
  only): the cropped photo and its four corners enlarged (five pictures at
  most, `checkUploads`). Claude reads the year by her signature and suggests a
  working title, the medium and the seasons; nothing is written until a parent
  says it looks right on screen. About two cents a painting (an estimate, not
  yet measured), within the caps; at the day's cap the screen stops asking and
  the rest can be typed in or read the next day.
- **Laurie's paintings looked at again** (`look-painting`, Jason or Laurie): the
  painting and its corners, for the one-time look over her gallery
  (`/lifelist/paintings/look-again`). Back come any month (and year) by her
  signature, the canvas's shape, and a few words for what it shows and how it
  feels; no title, medium or seasons. Nothing is written until a parent ticks it
  and saves. About two cents a painting (an estimate), within the caps.
  `read-painting` asks for the same month, shape and words when a painting is added.
- **The gallery's featured wall** (`feature-paintings`, anyone in the family, by
  itself): no pictures, only the paintings' facts the gallery keeps (titles,
  years, months, mediums, seasons, colours, shapes, the words kept about each),
  today's weather at home, the season and the coming week's concerts on the
  calendar (never a family day). Only slugs of paintings the caller can read are
  kept. One wall is up at a time, asked for when the last comes down (at most once
  a day on a device) or when a parent asks for another; at most four new ones a
  day; kept in `gallery_features` with the service role, like the guides. About a
  cent or two a wall (an estimate).
- **What's around here (`around-here`)** writes a guide to an area in the
  background (Supabase's `EdgeRuntime.waitUntil`), with Anthropic's web search
  (at most 12 searches a guide, each counted against the caps at an estimated
  cent), finishing with one strict tool, `save_guide`. Sent: the town, a
  tenth-of-a-degree cell, and `travel_settings.interests`. Before it's kept,
  every place must carry a source its own searches returned, and is matched to
  the open map (`_shared/around.js`, `cleanGuide`). It keeps the guide in
  `area_guides` with the service role (one being written per area at a time, at
  most four new guides a day, each kept a month), by place, never by person.
- **A trip photo's tags (`photo-tags`)** is the family's task: one shrunk photo, the town
  and day, and the titles of the cookbook and of the places on that town's list; it
  answers with a short caption and up to eight subjects (plant, bird, animal, dish,
  place, other), each with a confidence and, for a dish or place, a `match` that is kept
  only if it is exactly one of the titles sent. It is told never to identify or describe a
  person, and `cleanPhotoTags` drops any subject or caption that does. The phone keeps
  the answer as suggestions.
- **Where Laurie can eat well (`eat-well`)** is a parent's task: her food rules
  (read as the caller), the town and the cell, web search (at most 8), one strict
  tool (`save_places`), each place kept only with a source its own searches
  returned. The answer goes to the screen and is never stored.

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
| `drawing_inbox` | A batch of Anna's drawings waiting to be added: one row a photo (`data`: its crop, title, day, topic and where it stands) and who sent it (`added_by`); its three pictures under `inbox/<id>/` in the private `drawings` bucket. Not kept on any device | Whoever sent a photo, and the parents | Whoever sent it, and the parents; a row goes when its batch is put away |
| `annas_drawings` | Anna's Art: a drawing's (or painting's) title, the day she drew it, her own words, what it's about (the first `pets` one hangs in the Pets launch), its size, its fingerprint (`print`, measured on the device, to notice a second photo of it); the pictures (a large one and a small one) in the private `drawings` bucket, read through signed links | The family | Anyone in the family adds their own; whoever added it, or a parent, changes or removes it (and its files) |
| `painting_inbox` | A batch of Laurie's paintings waiting to be added: one row a photo (`data`: its crop, title, year, medium, seasons and where it stands), its three pictures under `inbox/<id>/` in the private `paintings` bucket. Not kept on any device | Parents | Parents; a row goes when its batch is put away |
| `paintings` | Laurie's paintings: title (and whether it's her title), year and the month she wrote with it (`month`), medium, size, seasons, what part a panel shows, the bird or leaves that move (`leaves` holds where each leaf came from when cut in the app), the original photo's flag and the crop it was saved with (`original`, `crop`), the canvas's shape when it isn't a rectangle (`shape`), its colours and fingerprint (`palette`, `print`, measured on the device), and what Claude saw in it once a parent kept it (`looks`: what it shows, moods, style, weather; never her title, year or medium, never `subjects`); the files in the private `paintings` bucket, the original at `<slug>/original.jpg`, leaves at `<slug>/leaves.png` | The family | Parents (her blanket yes covers them all; `said_yes_by` is history) |
| `gallery_features` | The gallery's featured walls: a title, a line, why today, four to eight painting slugs, its first and last day, and the model. Chosen by Claude from the paintings' facts (`feature-paintings`); every one kept | The family | Only the `claude` function writes one; a parent takes one down |
| `bird_sightings` | Laurie's birds from her eBird download: one row per bird per checklist, the place by name and to about a kilometre | Parents only | Parents (the file is read in the browser; same file twice changes nothing) |
| `outings` | Camping trips, Disneyland trips, trips and outings: dates, place, who came, a national park if it was one, notes; the calendar event a kept trip came from (`event_id`, one outing per event) | The family | Parents |
| `park_marks` | The national parks: the day we went, whether it's starred as next, a note | The family | Parents |
| `journal_entries` | A person's journal: one page a day, the day's question and answer, anything else, gratitudes; whether it was brought in from elsewhere | Its writer only, not even a parent | Its writer only |
| `journal_notes` | Notes to your future self: written, sealed until their day (a surprise day isn't shown), opened | Its writer only | Its writer only |
| `journal_settings` | A person's journal settings: which questions, their own questions, their outlets | Its writer only | Its writer only |
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
| `outside_cache` | The last answer from Synoptic (`stations`) and eBird (`birds`, `birds-more`, and `birds-near:<cell>` for each place away from home), as the functions shaped it | The family | Only the `stations` and `birds` functions |
| `area_guides` | What's around here, by area (a tenth-of-a-degree cell): what the open map knows there (`map`, a week at a time) and Claude's guide (`guide`, a month at a time; `building` while it's written). Every version a new row; it says which place, never who asked or who was there | The family | Only the `around` and `claude` functions |
| `member_whereabouts` | Which town each of us is in while away: one row a person (overwritten, never a log), the town, region and country, a tenth-of-a-degree point (`numeric(4,1)`), when it lapses (twelve hours on) | The family | Each of us our own row only (`my_member_id()`) |
| `travel_settings` | One row: the family's interests, what the guide is written for (sent to Claude with each guide, as the screens say), and the travel app's name (`app_name`) | The family | Parents |
| `trip_recipes` | A recipe found, cooked or brought home from a kept trip (one recipe can belong to several) | The family | Parents |
| `postcards` | A postcard to the family: the town and the day, a line of words, who sent it (never a point) | The family | Each of us our own; the sender or a parent removes |
| `packing_items` | A calendar trip's packing list: our own items and the suggestions someone added, ticked off | The family | The family |
| `trip_hikes` | A guide's hike ticked off: its name, miles and climb, the day and the town, who ticked it | The family | Each of us our own; the ticker or a parent removes |
| `trip_photos` | A photo from a trip: its town and day, its two files in the private `trips` bucket (a large one and a small one), a caption, when Claude looked at it, who added it. Never a point | The family | The family adds and captions; whoever added it, or a parent, removes |
| `photo_tags` | What's in a photo: a plant, bird, animal, dish, place or other, its name, a scientific name and Claude's confidence, whether it's `suggested` or `confirmed`, and a link to a recipe or a place on a town's list | The family | The family |
| `been_towns` | Our list for each town: the towns we keep a list for (town, state, country), one row each, so a town's page has an id | The family | The family adds |
| `been_places` | A place on a town's list: its name, what kind (eat, drink, hike, do, shop, stay, Mass), loved / good / not again, a note, its link | The family | The family adds and changes; whoever added it, or a parent, removes |
| `been_visits` | A day we went to a place on a town's list (one a day) | The family | The family adds; whoever added it, or a parent, removes |
| `someday` | A place from a guide hearted for next time we're near: the area, the town, its name and line | The family | The family adds; whoever hearted it, or a parent, removes |
| `routine_items` | The things on each person's morning and evening lists: words, a picture, which weekdays, every week or every other, any day or school days or days off, turns, until when, order; taken off (`archived_on`) rather than deleted | Its keeper, and the parents for Anna's | Its keeper, and the parents for Anna's (`lists_i_keep()`) |
| `routine_changes` | A day that's different: something skipped, something added just for the day, a day off (with its reason) | Its keeper, and the parents for Anna's | The same |
| `routine_ticks` | One per thing done, per day | Its keeper, and the parents for Anna's | The same; a tick is removed to untick |
| `routine_days` | How each person's list went each day, with no words: done, open or resting; how many on it and done; first and last tick; a golden feather; the streak through that day and the longest ever (worked out by the keeper's device) | The family (streaks, the rings on Home, the challenges) | Its keeper, and the parents for Anna's |
| `routine_settings` | The lists' names, and whether the family challenges run and how often (one row) | The family | Parents |
| `family_challenges` | Admin's changes to the built-in challenges (`src/lib/challenges.js`) by key, and the family's own | The family | Parents |
| `challenge_runs` | Each challenge the family takes on: what it asked as planned, its days, and whether it was won, got away or was cancelled | The family | Anyone's device plans the next or says how one ended (only while planned); parents start, change, cancel and remove |
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
| `20261101214500_plans_stay_until_dismissed` | A week plan stays open until someone puts it away (`dismissed_at`), whatever week it was made for. |
| `20261101231500_life_list` | The Life List: Laurie's birds from eBird, trips, the national parks, and the subjects a painting stands in for. Parents see her birds; the family reads the rest. |
| `20261102120000_birds_more_cache` | `outside_cache` also takes the key `birds-more` (hotspots, county numbers, this month's possibles) |
| `20261101183000_member_phones` | A family member's phone number, parents only (own table, so the people list stays readable by everyone), for "text the list to Laurie". |
| `20261101233000_ebird_sync` | Laurie's own yes to the nightly eBird sync, and the log of each run (parents read both; only she writes her yes; only the job writes the log) |
| `20261108200000_gallery_shapes_months_features` | `paintings.month`, `shape`, `palette`, `print` and `looks`, `annas_drawings.print`, and `gallery_features` (the featured walls, written only by the `claude` function; the family reads, a parent takes one down). Additive. |
| `20261108150000_drawing_inbox` | `drawing_inbox` (a batch of Anna's drawings waiting to be added, so it can be sent from one device and finished on another; whoever sent a photo and the parents see and change it); `annas_drawings.original` and `crop` (a drawing keeps its original photo and its crop, so it can be cropped again); and a policy so a parent can add a drawing for Anna from a set she sent. Additive. |
| `20261105040000_annas_gallery` | Anna's Gallery (now Anna's Art): `annas_drawings` and the private `drawings` bucket (JPEGs, 8 MB). Everyone in the family reads; whoever adds a drawing, or a parent, changes or removes it and its files. |
| `20261108120000_painting_inbox` | `painting_inbox`: a batch of photos waiting to be checked, parents only (Jason or Laurie, either), so it can be sent from a phone and cropped on a computer or picked up on another device. The pictures use the `paintings` bucket's existing policies. Additive. |
| `20261108090000_paintings_recrop` | Two columns on `paintings`: `original` (the photo is kept at `<slug>/original.jpg`) and `crop` (the crop it was saved with), so a painting can be cropped again from her gallery. Additive; the family reads and the parents change, as before. |
| `20261107230000_birds_near_cache` | `outside_cache` also takes `birds-near:<lat>,<lng>` keys: the birds where one of us is, a tenth-of-a-degree cell each, kept an hour |
| `20261107231000_around_here` | What's around here: `area_guides` (the map layer and the guide, by area, every version kept, written only by the functions) and `travel_settings` (the family's interests; parents write) |
| `20261107232000_family_towns_trips` | `member_whereabouts` (which town each of us is in while away; one row a person, only its owner writes it) and `outings.event_id` (a kept trip's calendar event, one outing per event) |
| `20261107233000_travel_app` | The travel app: its name on `travel_settings`; `trip_recipes`, `postcards`, `packing_items`, `trip_hikes` and `someday`. Postcards and hikes keep a town and a day, never a point |
| `20261108130000_trip_photos` | The trip photo reel: `trip_photos`, `photo_tags` and the private `trips` bucket (JPEGs, 6 MB, the family only). Claude's tags start as suggestions |
| `20261107234000_our_list_each_town` | Our list for each town: `been_towns`, `been_places`, `been_visits`. The town only, never a point |
| `20261107180000_morning_evening_lists` | The morning and evening lists: items, a day's changes and ticks (their keeper's, and the parents' for Anna's, through `lists_i_keep()`), how each day went (`routine_days`, no words, family-readable), the lists' settings, the challenges and their runs. `tests/migrations.test.mjs` checks that a list's words never reach the whole family. |
| `20261102000500_ebird_sync_parent_can_stop` | Either parent can remove the sync's yes, so Laurie can stop one Jason switched on |
