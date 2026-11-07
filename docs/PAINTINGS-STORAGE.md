# Laurie's paintings, behind sign-in

Her paintings are for the family. Once the app is hosted, nothing of hers
may be reachable by someone who has only its address.

## The options looked at

1. **Supabase Storage, a private bucket, through signed links.** Chosen.
   - The `paintings` table holds each painting's details; the `paintings`
     bucket holds its files.
   - The family reads, and only the parents add or remove, by the same
     row-level security as the rest of the data.
   - The app asks for links that expire in a week, so a link copied out of
     the app stops working.
   - No new service, no second sign-in, and within Supabase's free storage
     (1 GB) for hundreds of paintings at 2400 px.
2. **Firebase Storage with Firebase's own security rules.** Would need
   Firebase Authentication as a second sign-in beside Supabase's, and the
   rules can't see who is family. Not chosen.
3. **An Edge Function that checks the caller and streams each picture.**
   Works, but every picture view becomes a function call, slower and
   counted against the free tier; signed links do the same job with
   Supabase's own storage. Not chosen.
4. **Files in the app with an unguessable name.** Anyone with the link
   sees the painting, and the links live forever in the built app. Not
   chosen.

## How it works

- `supabase/migrations/20261101060200_paintings.sql` makes the table and the
  private bucket. Each painting's files are `<slug>/full.jpg` (up to 2400 px)
  and `<slug>/small.jpg` (720 px, for the gallery). A painting that moves
  also has `flyer.png` (its bird, lifted out) and `sky.png` (her sky filled
  in behind it), or `leaves.png` (her painted leaves on one sheet), made by
  `scripts/lift-art.py`.
- `src/parts/PaintingsProvider.jsx` reads them for every screen once someone
  signs in. Signed out, a hosted app shows none.
- **The paintings that came in with the code** (`public/paintings/`) are
  shown only by a development copy (`npm run dev`), for building and
  showing her. `firebase.json` leaves that folder out of every deploy
  (`tests/paintings.test.mjs` checks).
- **Moving them in:** in a development copy, a parent signs in and taps
  Life List › Laurie's gallery › "Move them now". The files and their
  details go into the bucket and the table, and from then on every copy
  of the app reads them from there.
- **New paintings, one or many:** Laurie's gallery › "Add her paintings"
  (`/lifelist/paintings/add`, Jason or Laurie). Choose the photos or scans
  (docs/ART-CAPTURE.md); each is straightened and cropped to the painting on
  the phone, and Claude, unless that's switched off, reads the year by her
  signature and suggests a working title, the medium and the seasons. Go
  through them one at a time, fix what's off, and "Looks right: add it" saves
  each one's `full.jpg` and `small.jpg` and its row while the next comes up.
  The photos wait on the phone (IndexedDB) until they're saved, so the app
  closing loses nothing; signing out forgets them. Size isn't asked for (the
  column stays, for any she gives). Her blanket yes covers every painting, so
  nothing is ticked (the `said_yes_by` column stays as history for rows saved
  before). Making one move (a bird, her leaves) is a step for a computer, with
  `scripts/lift-art.py`.

## Autumn leaves from her paintings

`python3 scripts/lift-art.py autumn flat.png --slug <slug> --region x0,y0,x1,y1 ... --count 24`
cuts leaf-shaped pieces of her painted foliage (a region per patch of leaves, with
no sky or trunk in it) onto `<slug>-leaves.png` and prints its boxes for
`src/lib/paintings.js`; `px: 2` there says the sheet is drawn at half size so it stays
sharp. It needs scipy as well as Pillow and numpy. Flatten the wall photo first
(`flatten --corners`). Two autumn paintings came in this way; like the others, they sit
in `public/paintings/` for a development copy and Laurie's gallery moves them into the
bucket ("Move them now").

**Where each leaf came from.** `python3 scripts/leaf-origins.py autumn-pond autumn-stream`
fits every leaf on a sheet back into the painting it was cut from (they are her own pixels,
so each fits exactly) and writes `src/lib/leafOrigins.js`, which autumn's wind uses to lift
each leaf off from its own place. Run it again after a sheet is cut or recut; it refuses to
write if a leaf doesn't fit. It reads only the development copies and measures; it changes
nothing of hers.
