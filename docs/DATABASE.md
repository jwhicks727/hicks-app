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
the app (Setup → Family days, once a parent has signed in), or all at once
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

Each calendar source in Setup has a "Whose is it": mark Kordyak's calendar
as Laurie's, Wayne Ruble's as Anna's and SOAR's as Jason's, and the year
view lines up their days off.

## Reading calendar feeds

The `read-sources` Edge Function (`supabase/functions/read-sources/`) reads
every calendar source in Setup that is a feed (iCal, webcal, or a Google
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
- **Laurie's food rules** reach Claude only for a parent's request, and
  only while her own latest answer in `ai_consents` is yes.
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
| `family_members` | The three of us | The family | The SQL editor only |
| `sources` | Every outside calendar, document, folder or feed, with what it covers and when it goes stale | The family | Parents |
| `source_versions` | Each reading of a source, kept as history | The family | Parents add; nobody changes |
| `calendar_events` | Events from sources and from us; "proposed" until approved when read from a document. Our own can have a place (name and coordinates) and be marked outdoors | The family | The family; parents remove |
| `family_days` | Birthdays, anniversaries, Anna's adoption day, the angelversary | The family | Parents |
| `recipes` | Jason's recipe files, less Laurie's plate; their three pictures | The family | Parents |
| `recipe_private` | Each recipe's "Laurie's plate" (protein, what was kept off) | Parents only | Parents |
| `recipe_ratings` | Our 1–5 ratings, one each per recipe | The family | Each of us, our own only (`my_member_id()`) |
| `fridge` | The recipes bought for this week, until cooked | The family | Parents |
| `ai_usage` | Each call to Claude: who, which task, which model, tokens and cost | Parents all; each of us our own | Only `ai_record()`, from the `claude` function |
| `ai_consents` | Each owner's yes or no to sending something of theirs to Claude (Laurie's food rules); the latest row stands | Parents, and each of us our own | Each of us, our own only |
| `food_rules` | Laurie's food rules, every version kept, dated, with what changed | Parents only | Parents add a new version; nobody edits one |
| `kitchen_preferences` | The kitchen's tastes, dislikes, pantry and equipment, every version kept | The family | Parents add a new version |
| `week_plans` | A week's ask, the ideas Claude gave, the ones picked | The family | Parents |

Migration index:

| Migration | What it does |
|---|---|
| `20261031230000_foundations` | The family, sources and their versions, calendar events, family days; `is_family()`, `is_parent()`; row-level security and grants. |
| `20261031230100_kitchen` | Recipes, Laurie's plate kept apart, ratings, the fridge; `my_member_id()`. Named a minute after the foundations so it runs after them. |
| `20261031230200_event_places` | Events get a place (name, coordinates, both or neither), an outdoors switch and who made them. |
| `20261101060000_claude_and_kitchen_planning` | Claude's usage and the caps (`ai_spend()`, `ai_record()`), consents, Laurie's food rules (versioned, parents only), kitchen preferences, week plans. |
