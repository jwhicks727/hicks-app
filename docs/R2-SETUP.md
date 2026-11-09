# The family's pictures in Cloudflare R2

Every picture the app keeps (Laurie's paintings, Anna's drawings, trip and garden
photos, the academy's own pictures) lives in one private Cloudflare R2 bucket,
`hicks-media`, under the old bucket name as a folder: `paintings/<slug>/full.jpg`,
`drawings/<file>.jpg`, `trips/…`, `garden/…`, `academy/…`. Why R2, and what was
weighed against it, is in the decisions log (2026-11-09).

## How it works

- **Nothing in the bucket is public.** It has no public address and no `r2.dev`
  link. A picture is reached only by a signed link that lasts minutes to a week.
- **The `media` Edge Function signs the links** (`supabase/functions/media/`,
  its rules in `supabase/functions/_shared/media.js`). It answers only a signed-in
  family member and keeps each area's old rules: the family sees everything; only
  Jason or Laurie add or take away paintings and academy pictures; anyone in the
  family adds a drawing, and only whoever added it, or a parent, takes it away;
  trip and garden photos are the family's. Drawings, trip, garden and academy
  files are added, never written over. The types and sizes are the old buckets'
  (`tests/media.test.mjs` reads them from the migrations).
- **R2's keys live only in that function's secrets** (docs/SECRETS.md). The app
  never holds them: it asks the function (`src/lib/media.js`), then fetches or
  sends the picture with the link it gets.
- **It works in any order.** Until R2's secrets are set, or before the function is
  deployed, the app keeps using Supabase's storage exactly as before. Once they
  are, new pictures go to R2, and any picture not copied over yet is still shown
  from Supabase (`MEDIA_FALLBACK`), so nothing goes missing while it moves.
- **Admin › Where pictures are kept** moves the rest: it looks at what each old
  bucket holds and what R2 has, copies what's missing (each copy checked
  afterwards: there, and the same size), and only then offers to free the space in
  Supabase, looking again first and taking away only copies R2 is seen to hold.

## Setting it up (once, about fifteen minutes)

Unverified until it's first done: Cloudflare's screens may be named a little
differently from these.

### 1. Cloudflare

1. Make a free account at dash.cloudflare.com (or sign in).
2. Left menu › **R2 Object Storage**. Cloudflare asks for a card to turn R2 on,
   even on the free tier (10 GB stored, and no charge for viewing pictures).
   Nothing is charged until the family passes the free allowance.
3. **Create bucket**: name `hicks-media`, location Automatic, storage class
   Standard. Leave public access off, and don't connect a domain.
4. In the bucket › **Settings** › **CORS policy** › Add, paste:

   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["content-type", "x-amz-meta-owner"],
       "ExposeHeaders": ["Content-Length", "ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   This only lets the app's pages read the answer to a signed link (the preview
   links each have their own address, hence `*`). It opens nothing: without a
   link's signature R2 answers no. If the screen refuses `*`, list
   `https://hicks.web.app` and `http://localhost:5173` instead; previews then show
   pictures but can't add them.
5. R2 overview › **Manage API tokens** › **Create API token** (an R2 token, not an
   account-wide one): permission **Object Read & Write**, applied to **the
   `hicks-media` bucket only**, no expiry. Create it, and keep the page open: it
   shows the **Access Key ID** and **Secret Access Key** once. The **Account ID**
   is on the R2 overview page (it's also the first part of the S3 address,
   `https://<account id>.r2.cloudflarestorage.com`).

### 2. Supabase

1. Supabase dashboard › the **Hicks App** project (never SOAR's) › **Edge
   Functions** › **Secrets**. Add three, pasting each value straight from
   Cloudflare's page (never into a chat):
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`

   Two more are optional: `R2_BUCKET` (only if the bucket isn't `hicks-media`) and
   `MEDIA_FALLBACK` (step 4).
2. Deploy the `media` function, from a computer:

   ```powershell
   cd C:\Users\Admin\projects\hicks-app-clone; git checkout main; git pull
   npx supabase projects list
   ```

   "Hicks App" must be in that list (if only SOAR's project is, use a token for the
   Hicks account in that window, `$env:SUPABASE_ACCESS_TOKEN = "..."`, made at
   supabase.com/dashboard/account/tokens, or `npx supabase logout` then `login`).
   Then:

   ```powershell
   npx supabase functions deploy media --no-verify-jwt --project-ref <Hicks App's reference>
   ```

   Or from a phone: `node scripts/one-file.mjs media` makes a single-file copy
   (Claude can hand it over). Dashboard › Edge Functions › **Deploy a new function**
   › **Via Editor**, name it `media`, replace the example with the copy, Deploy.
   Then in the function's **Details** turn **Verify JWT** off (it checks the caller
   itself, like the `claude` function).
3. Open the app and go to **Admin › Where pictures are kept**. It should say
   pictures are kept in Cloudflare R2. Add a painting or a drawing to see it work.
   If it still says Supabase's storage, check the three secrets' names and that
   Verify JWT is off, then reload. (Until a phone has once had an answer from R2,
   a `media` function it can't reach counts as not set up, so the app carries on
   with Supabase's storage; after that, a failure is shown as one.)

### 3. Moving what's already there

On the same Admin card (Jason or Laurie):

1. **See what's where**: how many pictures each area has in Supabase, and how
   many R2 already holds.
2. **Copy the rest into R2**: copies each missing picture, then looks again. A
   few hundred paintings take a few minutes; keep the app open. Anything that
   couldn't be copied is listed and stays in Supabase; run it again.
3. **Free the space in Supabase**, once every area says all are in R2. It asks
   first, looks again, and takes out only the copies R2 holds, the same size.

### 4. Afterwards

Once Supabase's storage is empty of pictures, set the secret
`MEDIA_FALLBACK` to `off`: the function then stops looking in Supabase for a
picture R2 doesn't have, which makes each link a little quicker.

Each drawing copied over keeps who added it (read from its row, or the batch
waiting), so only they or a parent can take it away, as before. A file no drawing
mentions any more is marked as added by whoever ran the move.

## Costs and limits

R2's free tier: 10 GB stored, a million uploads and ten million views a month,
and no charge for data going out. A painting takes a few megabytes with its small
copy and the original photo (an estimate), so the free tier holds a few thousand. Past it, about
$0.015 a GB a month (prices as of mid-2026, unverified here). Set a billing
notification in Cloudflare if wanted.

## Undoing it

Delete the three R2 secrets and the app goes back to Supabase's storage at once.
Pictures added while R2 was in use stay in R2 until copied back (nothing does
that yet), so do this only before the move, or ask for a copy-back first.
