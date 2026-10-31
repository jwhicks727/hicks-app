# Secrets

Every key, password and token the app depends on: where it lives, who can
revoke it, and what breaks if it goes. Nothing secret is ever written into
this repository, an issue, a commit or a chat.

| Secret | Where it lives | Whose | Used by | Status |
|---|---|---|---|---|
| Supabase database password | A password manager | Jason | Database maintenance only (migrations from a computer). The app never uses it. | Created 2026-10-31 |
| Supabase project URL and publishable (anon) key | `.env` (local), hosting settings | The family | The app itself. Not secret: they ship inside the app, and row-level security is what protects the data. | To add |
| Supabase secret (service role) key | Supabase's own settings; scheduled jobs' secrets | Jason | Scheduled jobs that act for the family. Never in the app or `.env`. | Not used yet |
| Yahoo app password | The scheduled job's secrets | Laurie (her yes, revocable from her Yahoo account) | Reading the monthly lector schedule | Planned |
| GroupMe access token | The scheduled job's secrets | The family member it belongs to | Reading the altar servers' schedule posts | Later |
| Google sign-in (OAuth) client | Supabase auth settings | Jason | Sign-in and Google Calendar sync | Planned |
| Synoptic token | The weather job's secrets | Jason | Our stations' readings | Planned |
| QParent and ParentSquare sign-ins | The school job's secrets | A parent (their yes) | Anna's grades and school news, where there's no feed | Planned |
| Anthropic API key | The scouts' secrets, with a monthly spending limit | Jason | The daily jam and neighbourhood scouts | Planned |
| eBird API key, Laurie's eBird login | The birding job's secrets | Laurie (her yes) | Her life list and nearby sightings | Planned |
