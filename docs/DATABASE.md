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
| `calendar_events` | Events from sources and from us; "proposed" until approved when read from a document | The family | The family; parents remove |
| `family_days` | Birthdays, anniversaries, Anna's adoption day, the angelversary | The family | Parents |

Migration index:

| Migration | What it does |
|---|---|
| `20261031230000_foundations` | The family, sources and their versions, calendar events, family days; `is_family()`, `is_parent()`; row-level security and grants. |
