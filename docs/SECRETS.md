# Secrets

Every key, password and token the app depends on: where it lives, who can
revoke it, and what breaks if it goes. Nothing secret is ever written into
this repository, an issue, a commit or a chat.

| Secret | Where it lives | Whose | Used by | Status |
|---|---|---|---|---|
| Supabase database password | A password manager | Jason | Database maintenance only (migrations from a computer). The app never uses it. | Created 2026-10-31 |
| Supabase project URL and publishable (anon) key | `.env` (local), hosting settings | The family | The app itself. Not secret: they ship inside the app, and row-level security is what protects the data. | To add |
| `FIREBASE_SERVICE_ACCOUNT` (Firebase Hosting deploy key) | GitHub › Actions secrets, made by `firebase init hosting:github` | Jason | The Preview workflow (a preview link for each pull request from this repository, never from a fork) and the Deploy workflow (main only, through the `production` environment). It can deploy the hosting site and nothing else: revoke it in Google Cloud › IAM › Service accounts. | To add (docs/MORNING.md, step 8) |
| Supabase secret (service role) key | Supabase's own settings; scheduled jobs' secrets | Jason | Scheduled jobs that act for the family. Never in the app or `.env`. | Not used yet |
| `READ_SOURCES_KEY` (the calendar feed reader's nightly key) | The Edge Function's secrets (`supabase secrets set`) and Supabase's Vault (`read_sources_key`), nowhere else | Jason | The nightly run of `read-sources`; a parent's "Read now" uses their own sign-in instead. To change it: set a new one in both places. | To add (docs/DATABASE.md, "Reading calendar feeds") |
| Yahoo app password | The scheduled job's secrets | Laurie (her yes, revocable from her Yahoo account) | Reading the monthly lector schedule | Planned |
| GroupMe access token | The scheduled job's secrets | The family member it belongs to | Reading the altar servers' schedule posts | Later |
| Google sign-in (OAuth) client | Supabase auth settings | Jason | Sign-in and Google Calendar sync | Planned |
| Synoptic token | The weather job's secrets | Jason | Our stations' readings | Planned |
| QParent and ParentSquare sign-ins | The school job's secrets | A parent (their yes) | Anna's grades and school news, where there's no feed | Planned |
| Anthropic API key (`ANTHROPIC_API_KEY`) | The `claude` Edge Function's secrets (`supabase secrets set`), and the scouts' secrets later; a monthly spending limit set in Anthropic's console | Jason | Every Claude feature in the app (the Kitchen's planning and chat, a calendar from a screenshot, the garden's photos), through the one function, within the app's own daily and monthly caps (`AI_DAILY_CAP_CENTS`, `AI_MONTHLY_CAP_CENTS`, not secret) | To add (docs/DATABASE.md, "Claude") |
| eBird API key, Laurie's eBird login | The birding job's secrets | Laurie (her yes) | Her life list and nearby sightings | Planned |
