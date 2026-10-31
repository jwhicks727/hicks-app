# Setting it all up: one sitting, in order

For the morning everything goes live. About an hour. Do it on the computer,
signed in to Supabase, GitHub, Firebase and Anthropic's console. Nothing
secret goes into the repository or a chat: keys are pasted only where a
step says.

## 0. Show Laurie first, if you like (five minutes, no setup)

1. `git pull`, `npm install`, `npm run dev`, and open the address it prints
   (usually http://localhost:5173).
2. On Home, the Paintings panel shows her witch and the crow. The crow
   flies once a day; the little bird in the painting's corner sends it
   again.
3. Today is Día de los Muertos, so her leaves drift down slowly as petals.
   For Halloween's show, open Settings › Reading and motion › Try another
   season › Halloween › Play it.
4. Her Gallery: Apps › The Gallery.

A development copy with no `.env` (no database connected) shows the
paintings without signing in. Any copy with the database connected, hosted
or not, shows only a sign-in screen until someone on the family list has
signed in.

## 1. The database: ten migrations, in order

Supabase dashboard › SQL Editor › New query. For each file in
`supabase/migrations/`, oldest first, paste it in and Run:

1. `20261031230000_foundations.sql`
2. `20261031230100_kitchen.sql`
3. `20261031230200_event_places.sql`
4. `20261101060000_claude_and_kitchen_planning.sql`
5. `20261101060100_garden.sql`
6. `20261101060200_paintings.sql`
7. `20261101090000_journal.sql`
8. `20261101090100_academy.sql`
9. `20261101120000_parish_stations_birds.sql` (new: if you've run the
   first eight, run just this one)
10. `20261101183000_member_phones.sql` (new: Laurie's number, for "text the
    list"; if you've run the first nine, run just this one)

Each should say "Success. No rows returned". If one fails, stop and tell
Claude the message: don't edit a migration that has run.

## 2. The family

Still in the SQL editor: the three of you, with the addresses you sign in
with (docs/DATABASE.md, "After the first migration: the family"; the
family days block is there too, or add them in the app later).

## 3. Signing in

First the two values the app needs, from Supabase › Project Settings ›
API: copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` (the
Project URL) and `VITE_SUPABASE_ANON_KEY` (the *publishable* key; never the
secret or service key). `.env` is never committed. Without it the app says
the database isn't connected, and a build made without it ships that way.

Then Authentication › URL Configuration › Redirect URLs. Add:

- `http://localhost:5173/**`
- your Firebase address, once step 8 gives it:
  `https://hicks.web.app/**`
- every preview: `https://hicks--*.web.app/**`

And, on the same page, set **Site URL** to `https://hicks.web.app`: a
sign-in link that can't find its redirect falls back to it.

Then, for the sign-in code (the installed app can't use the link: on an
iPhone the link opens Safari, which signs in Safari, not the app),
Authentication › Emails › Templates › Magic link: add a line to the
message, `<p>Or type this code: {{ .Token }}</p>`, and Save. The sign-in
screen asks for the code after it sends the email.

Each of you then sets a password: sign in once (the emailed link is fine),
then Settings › Your password, and from then on sign in with your email and
that password, on the computer and the phone, with no email. In Supabase,
Authentication › Sign In / Providers › Email, set **Minimum password
length** as low as it will go: the app asks only for 4 characters of any
kind (this is a low-security family app), but Supabase has a minimum of its
own, 6 by default, and refuses anything shorter. If it won't go below 6, use
6; the wording of that setting is unverified.

The built-in email sender is limited to a few emails an hour; if the
sign-in screen says there were too many, wait, or add your own sender under
Authentication › Emails › SMTP Settings.

Then open the app (`npm run dev`, or https://hicks.web.app), enter your
address on the sign-in screen, and check your name appears on Home. When
all three of you have signed in once, Authentication › Sign In / Providers
› turn off "Allow new users to sign up": from then on only addresses
already made can sign in, on top of the family list every screen already
checks.

## 4. Claude

1. **The key.** console.anthropic.com › API keys › Create key, named "Team
   Hicks app". Under Billing › Limits, set a monthly limit (say $30). The
   app keeps its own caps too ($3 a day, $30 a month).
2. **Into Supabase, never the repo.** In a terminal, in the project folder:

   ```sh
   npx supabase login
   npx supabase secrets set ANTHROPIC_API_KEY=<paste the key> --project-ref <project-ref>
   npx supabase functions deploy claude --no-verify-jwt --project-ref <project-ref>
   npx supabase functions deploy readings --no-verify-jwt --project-ref <project-ref>
   npx supabase functions deploy read-sources --no-verify-jwt --project-ref <project-ref>
   ```

   The project ref is the part of the Supabase URL before `.supabase.co`.
3. **Check it:** Kitchen › Ask › "What can I make with what's in the
   fridge?". An answer means it works.
4. **Laurie's yes:** when she signs in, Kitchen › Rules & preferences has
   her switch. Her rules go to Claude only while it's on.

## 5. Your journal

Signed in as yourself: Apps › Journal (or end a sit and tap "On to your
journal"). To bring in the journal you've kept in Google Docs: Journal ›
"Questions, outlets, bringing a journal in" › drop in the file Claude made
from it (`journal-import.json`, sent to you in the chat, never put in the
repo), or download the Doc as Plain text (File › Download › .txt) and drop
that in. It checks the dates, shows how many pages it found, and brings
them in; days already written in the app are left alone. Your outlets come
with it. Only you can read any of it.

After it's in, delete the downloaded file from your computer if you like:
the journal lives in the database now, and "Download my journal" gives you
a fresh copy any time.

## 6. Anna's academy

Apps › The Academy. The first visit asks Anna to name her school and pick
her first rooms (any of them). After that: tasks on Today light stars,
goals have steps and end in a trophy, grades go in by hand (an A, or going
up, gets a medal), and "Cheer Anna" works for anything. To add pictures of
your own (an isometric pack you've bought): the pencil by the school's
name › "Pictures the family has added", with each one's licence
(docs/ACADEMY-ART.md).

## 7. Paintings into private storage

In the development copy (`npm run dev` on your computer, not the hosted
app), signed in as a parent: Apps › The Gallery › "Move them now". From then on they're behind sign-in everywhere
(docs/PAINTINGS-STORAGE.md).

## 8. Firebase Hosting (the free Spark plan)

1. console.firebase.google.com › Add project › "team-hicks" (or any name;
   note the project ID it gives). Analytics: off. Plan: Spark, the free
   one.
2. Build › Hosting › Get started (just click through; the files are in the
   repository already).
3. In a terminal:

   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use --add            # choose the project, alias "default"
   npm run build
   firebase deploy --only hosting
   ```

   (This build reads your `.env`: check it's filled in first.) The app
   lives on the Hosting site `hicks` (`"site": "hicks"` in `firebase.json`),
   at https://hicks.web.app. Add it to the redirect URLs (step 3).
   On your phone, open it in Safari, then Share › Add to Home Screen: Team
   Hicks, with its icon.
4. **For previews and automatic deploys,** run
   `firebase init hosting:github` and answer:
   - the repository: `jwhicks727/hicks-app`;
   - set up the workflow files? **No** (they're in `.github/workflows/`
     already). If it made any (`firebase-hosting-merge.yml`,
     `firebase-hosting-pull-request.yml`), delete them, or every merge
     deploys twice;
   - but **let it create the service account secret**. It names it for the
     project (`FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>`); the Deploy and
     Preview workflows accept that name for this project's id
     (`hicks-app-1b1a5`) and `FIREBASE_SERVICE_ACCOUNT`. A different
     project id needs its secret's name in both workflows.
   - If `firebase init` rewrote `firebase.json`, put the repository's back
     (`git checkout firebase.json`): the public directory is `dist`, the
     single-page rewrite and the paintings exclusion are in it.

   In the same place, under Variables, add:
   - `FIREBASE_PROJECT_ID`: the project ID (`hicks-app-1b1a5`);
   - `VITE_SUPABASE_URL`: the project's own address, `https://<project>.supabase.co`
     (Supabase › Project Settings › API › Project URL; never the dashboard's
     address, which makes every sign-in fail with "Failed to fetch");
   - `VITE_SUPABASE_ANON_KEY`: the publishable key, never the secret one.

   The Deploy and Preview workflows check all three before building
   (`scripts/check-settings.mjs`) and stop with what's wrong.

   The last two are not secret: they ship inside the app.
5. GitHub › Settings › Environments › New environment "production" ›
   Deployment branches: only `main`.

From here, every merge to `main` deploys the live app. Until this step is
done, the **Deploy** workflow fails on each push to `main` (it has no
secret to deploy with yet): that's expected. Once it's done, GitHub ›
Actions › Deploy › Run workflow deploys the latest.

## 9. The way work goes from now on

With the family using it, each piece of work goes on its own branch with a
draft pull request. The **Preview** workflow builds it, tests it, and posts
a preview link on the pull request (it lives 7 days), so you can try it on
your phone before it's merged. Merging deploys it.

## 10. Mass times, the schools' stations, and the birds

New since the first sitting. Each part works on its own; skip any for now.

1. **The migration.** If you haven't yet, run
   `20261101120000_parish_stations_birds.sql` (step 1, the ninth).
2. **Mass times from the parish.** No key needed:

   ```sh
   npx supabase functions deploy parish --no-verify-jwt --project-ref <project-ref>
   ```

   Then Apps › Admin › Mass times › "Read it again". It shows the week it
   read from sacredheartrc.org, each weekday marked Daily Mass. If it says
   the page didn't read as a week, the app keeps showing the diocese's
   listing (marked unchecked): tell Claude, with the page's address.
3. **The schools' own stations.** Make a free account at
   synopticdata.com (the Open Access tier, for non-commercial use), and in
   its console make a public token. Then:

   ```sh
   npx supabase secrets set SYNOPTIC_TOKEN=<paste the token> --project-ref <project-ref>
   npx supabase functions deploy stations --no-verify-jwt --project-ref <project-ref>
   ```

   Home's weather card grows "At the schools". If a school shows its
   airport instead, its own station is quiet or isn't open to the free
   tier; Admin › Weather stations can change it.
4. **Home's own station.** Admin › Weather stations › Home: the id of the
   station nearest the house (find it on mesowest.utah.edu), and an
   airport for its fallback. It's kept in the database only, and the app
   never shows it by name.
5. **Birds around us.** Signed in to eBird, open ebird.org/api/keygen and
   copy the key. Then:

   ```sh
   npx supabase secrets set EBIRD_API_KEY=<paste the key> --project-ref <project-ref>
   npx supabase functions deploy birds --no-verify-jwt --project-ref <project-ref>
   ```

   Home shows the week's birds round town right after the weather, the
   notable ones first in green.

   If the card shows a message instead, it says what's missing:

   | The card says | It means | Do |
   |---|---|---|
   | "isn't set up yet: it needs its function deployed and the eBird key set" | The `birds` function isn't deployed, or has no key. A function that isn't deployed answers with nothing the browser can read, so this is also what an undeployed one looks like. | Run both commands above. `npx supabase secrets list --project-ref <project-ref>` shows which secrets are set (names only). |
   | "eBird didn't accept the key" | The key was copied wrong or made for something else. | Copy it again from ebird.org/api/keygen and run `secrets set` again. |
   | "couldn't be reached just now" | eBird or Supabase didn't answer. | Nothing: it asks again within the hour. |

   If a function is deployed and still shows nothing, Supabase › Edge
   Functions › the function › Logs says why. A line about `outside_cache`
   means the ninth migration (step 1) hasn't been run: the function still
   works, but forgets between visits and asks the service every time.

