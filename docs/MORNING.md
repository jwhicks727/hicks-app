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
4. Her gallery: Life List › Laurie's gallery.

A development copy shows the paintings without signing in. A hosted copy
never will.

## 1. The database: six migrations, in order

Supabase dashboard › SQL Editor › New query. For each file in
`supabase/migrations/`, oldest first, paste it in and Run:

1. `20261031230000_foundations.sql`
2. `20261031230100_kitchen.sql`
3. `20261031230200_event_places.sql`
4. `20261101060000_claude_and_kitchen_planning.sql`
5. `20261101060100_garden.sql`
6. `20261101060200_paintings.sql`

Each should say "Success. No rows returned". If one fails, stop and tell
Claude the message: don't edit a migration that has run.

## 2. The family

Still in the SQL editor: the three of you, with the addresses you sign in
with (docs/DATABASE.md, "After the first migration: the family"; the
family days block is there too, or add them in the app later).

## 3. Signing in

Authentication › URL Configuration › Redirect URLs. Add:

- `http://localhost:5173/**`
- your Firebase address, once step 6 gives it:
  `https://<project-id>.web.app/**`
- every preview: `https://<project-id>--*.web.app/**`

Then open the app (`npm run dev`), Settings › sign in, and check your name
appears on Home.

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

## 5. Paintings into private storage

In the development copy, signed in as a parent: Life List › Laurie's
gallery › "Move them now". From then on they're behind sign-in everywhere
(docs/PAINTINGS-STORAGE.md).

## 6. Firebase Hosting (the free Spark plan)

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

   The address it prints is the app. Add it to the redirect URLs (step 3).
   On your phone, open it in Safari, then Share › Add to Home Screen: Team
   Hicks, with its icon.
4. **For previews and automatic deploys,** run
   `firebase init hosting:github` and answer:
   - the repository: `jwhicks727/hicks-app`;
   - set up the workflow files? **No** (they're in `.github/workflows/`
     already);
   - but **let it create the service account secret**. If it names the
     secret anything other than `FIREBASE_SERVICE_ACCOUNT`, rename it in
     GitHub › Settings › Secrets and variables › Actions.

   In the same place, under Variables, add:
   - `FIREBASE_PROJECT_ID`: the project ID;
   - `VITE_SUPABASE_URL`: the Supabase URL;
   - `VITE_SUPABASE_ANON_KEY`: the publishable key.

   The last two are not secret: they ship inside the app.
5. GitHub › Settings › Environments › New environment "production" ›
   Deployment branches: only `main`.

From here, every merge to `main` deploys the live app.

## 7. The way work goes from now on

With the family using it, each piece of work goes on its own branch with a
draft pull request. The **Preview** workflow builds it, tests it, and posts
a preview link on the pull request (it lives 7 days), so you can try it on
your phone before it's merged. Merging deploys it.
