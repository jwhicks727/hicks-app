# Secrets

Every key, password and token the app depends on: where it lives, who can
revoke it, and what breaks if it goes. Nothing secret is ever written into
this repository, an issue, a commit or a chat.

| Secret | Where it lives | Whose | Used by | Status |
|---|---|---|---|---|
| Supabase database password | A password manager | Jason | Database maintenance only (migrations from a computer). The app never uses it. | Created 2026-10-31 |
| Supabase project URL and publishable (anon) key | `.env` (local), hosting settings | The family | The app itself. Not secret: they ship inside the app, and row-level security is what protects the data. | To add |
| `FIREBASE_SERVICE_ACCOUNT_HICKS_APP_1B1A5` (Firebase Hosting deploy key; the workflows also accept the name `FIREBASE_SERVICE_ACCOUNT`) | GitHub › Actions secrets, made by `firebase init hosting:github` | Jason | The Preview workflow (a preview link for each pull request from this repository, never from a fork) and the Deploy workflow (main only, through the `production` environment). It can deploy the hosting site and nothing else: revoke it in Google Cloud › IAM › Service accounts. | To add (docs/MORNING.md, step 8) |
| Supabase secret (service role) key | Supabase's own settings, which give it to every Edge Function as `SUPABASE_SERVICE_ROLE_KEY` (nothing to set) | Jason | The `parish`, `stations` and `birds` functions, to keep what they read (`parish_schedules`, `outside_cache`) where the family can only read it. Never in the app or `.env`. | In use |
| `READ_SOURCES_KEY` (the calendar feed reader's nightly key) | The Edge Function's secrets (`supabase secrets set`) and Supabase's Vault (`read_sources_key`), nowhere else | Jason | The nightly run of `read-sources`; a parent's "Read now" uses their own sign-in instead. To change it: set a new one in both places. | To add (docs/DATABASE.md, "Reading calendar feeds") |
| Yahoo app password | The scheduled job's secrets | Laurie (her yes, revocable from her Yahoo account) | Reading the monthly lector schedule | Planned |
| GroupMe access token | The scheduled job's secrets | The family member it belongs to | Reading the altar servers' schedule posts | Later |
| Google sign-in (OAuth) client | Supabase auth settings | Jason | Sign-in and Google Calendar sync | Planned |
| `SYNOPTIC_TOKEN` (Synoptic Data, the free Open Access tier) | The `stations` Edge Function's secrets (`supabase secrets set`), nowhere else | Jason | The schools' and home's station readings, asked at most every quarter hour. To change it: make a new token in Synoptic's console, set it, delete the old one. | To add (docs/MORNING.md, step 10) |
| QParent and ParentSquare sign-ins | The school job's secrets | A parent (their yes) | Anna's grades and school news, where there's no feed | Planned |
| Anthropic API key (`ANTHROPIC_API_KEY`) | The `claude` Edge Function's secrets (`supabase secrets set`), and the scouts' secrets later; a monthly spending limit set in Anthropic's console | Jason | Every Claude feature in the app (the Kitchen's planning and chat, a calendar from a screenshot, the garden's photos), through the one function, within the app's own daily and monthly caps (`AI_DAILY_CAP_CENTS`, `AI_MONTHLY_CAP_CENTS`, not secret) | To add (docs/DATABASE.md, "Claude") |
| `EBIRD_API_KEY` (eBird API 2.0) | The `birds` Edge Function's secrets, nowhere else | Jason (or Laurie, on her account) | This week's public sightings round town, asked at most once an hour. It reads public data only, not anyone's own list. | To add (docs/MORNING.md, step 10) |
| `EBIRD_DISPLAY_NAME` (a variable, not a secret) | The `ebird` GitHub environment's variables | Laurie | The nightly eBird sync (`sync-ebird.yml`): which checklists in eBird's public feed are hers. No eBird password is held (decisions log, 2026-11-02); delete `EBIRD_USERNAME` and `EBIRD_PASSWORD` from the environment | Built; needs the name set |
| `SUPABASE_SERVICE_ROLE_KEY` in the `ebird` GitHub environment | The same environment | Jason | The nightly eBird sync writes `bird_sightings` and its run log. Also `EBIRD_API_KEY` there (the same key the `birds` function uses), to read checklist contents | Built; needs setting |
