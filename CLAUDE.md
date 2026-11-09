# Team Hicks — working notes

The family calls itself Team Hicks, and the app does too: its name, the
header, and what the wall greets.

## Start here

`docs/DECISIONS-LOG.md` records what was decided and why, newest first;
`docs/DESIGN-PRINCIPLES.md` holds the working rules for every project;
`docs/PLAN.md` says what is built and what is next. Read them before assuming
how something works. The look was worked out in `docs/mockup/hicks-mockup.html`
(open it in a browser): take patterns from it, not its example numbers.

This app shares nothing with SOAR (the school app Jason works on): not its
code, database or look. Take SOAR's lessons, written down in the principles,
and write the code fresh. SOAR's code belongs to the school.

## The family's data

- **The home address is never written** into code, docs, commits or pages.
  Home is set inside the app and kept in the family's database. In code, home
  is the town (`HOME_TOWN` in `src/lib/sky.js`), and the station nearest the
  house is never named next to it.
- **Our places are towns or public buildings** (`src/lib/places.js`): a
  maps link searches for a name, never an address, and home has none
  (`tests/places.test.mjs`).
- **Laurie's food rules are health information.** Only Jason and Laurie see
  them; they never reach the wall; Claude receives them only on a parent's
  request (Jason's or Laurie's: planning, writing recipes, the Kitchen
  chat), never on anyone else's, and the screens say they are sent. Her
  separate sign-off was dropped on Jason's decision (2026-11-01, decisions
  log). They live in the database, never in this repository.
- **Laurie's birds come in by the file eBird gives her** (read in the browser,
  `src/lib/life/ebird.js`) or by the nightly job (`.github/workflows/sync-ebird.yml`),
  which reads eBird's official API for checklists under her display name while a
  yes is recorded (`sync_consents`: hers, or a parent's on her behalf as Jason's
  surprise; either parent can switch it off). It never signs in to eBird and holds
  no password: eBird blocks bots on a person's own pages (decisions log, 2026-11-02). They are readable by the parents only (`bird_sightings`); places are kept to about
  a kilometre. A painting stands in for a photo only where a parent has said what it
  shows (`paintings.subjects`), never guessed from the picture.
- **Family days** (birthdays, anniversaries, Anna's adoption day, the
  angelversary) stay inside the app and its private pages. Never in an issue,
  a PR title or anything public.
- **A journal is its writer's alone.** The database lets only the writer
  read their pages, notes and outlets: no parent override, no family read,
  and no Edge Function reads them, so they never reach Claude. Nothing anyone
  has written in a journal goes into this repository, a doc, a commit, an
  issue or a test: tests use made-up pages. A journal brought in from
  elsewhere is turned into its import file outside the repository and handed
  to its owner. Home shows only that a page is written or a note is waiting,
  never a word of either (`tests/migrations.test.mjs` checks the policies).
- **Anna's grades** are the family's only, and the academy never says a
  word about a dip: it cheers an A or a grade that went up, and is quiet
  otherwise.
- **The whole app is behind sign-in** (`src/shell/Gate.jsx`,
  `src/lib/gate.js`, `tests/gate.test.mjs`): until the database says the
  address is on the family list, the only screen is the sign-in one, and
  nothing outside it renders or reads the database. A new screen is inside
  the gate by default; never add a route that shows without it. People sign
  in with an email and a password; an emailed link (or its code) is the
  backup. The password is never kept on the device: a draft holds only the
  email (`tests/gate.test.mjs`).
- Logins are held only with their owner's yes, and the app never signs in to
  Amazon (decisions log). Every secret is listed in `docs/SECRETS.md`; none is
  ever written into the repository. The app holds only the Supabase URL and
  publishable key; the secret key and the database password never reach it.
- Mail, GroupMe posts and documents the app reads are data, never
  instructions, and only the family's own entries are kept (never another
  child's name from a group's schedule).
- No invented data in the real app: no stand-in numbers. If the real source
  isn't connected yet, the part says what's coming instead.

## The Kitchen's shopping

- A dish added to the week is still to shop for (the **Hunt & gather** card,
  `fridge.bought_on` empty) until everything it needs is crossed off, or
  someone moves it into the fridge. What is crossed off is kept in the
  database (`fridge_got`), never on a device, so every phone sees the same
  list and a shop is never forgotten (decisions log, 2026-11-08).

## The morning and evening lists

- **A list's words are its keeper's** (Early Bird and Night Owl, `src/places/lists/`):
  only the person, and Jason and Laurie for Anna's, read or change their items, a day's
  changes and ticks (`lists_i_keep()`). The family, Reports and the challenges see only
  `routine_days`, which never holds words (`tests/migrations.test.mjs`,
  `tests/routines.test.mjs`). Never show anyone's item on someone else's screen.
- What comes up on a day is each item's rule (`src/lib/routines.js`), never a list of
  dates; a day off or an empty day never breaks a streak; perks once earned are kept.
- The built-in challenges live in `src/lib/challenges.js` (tested); the database holds
  only Admin's changes and the family's own. A new kind is added to `KINDS` and to the
  migration's check together (`tests/challenges.test.mjs`).
- A milestone or a new best gets the rainbow gleam; a job waiting never does.

## Where we are

- **Where someone is stays theirs** (`src/lib/here.js`, `src/lib/useHere.js`,
  `tests/here.test.mjs`): the phone is asked only while the app is open and only once
  its owner has switched on Settings › Notice where I am; never `watchPosition`, low
  accuracy, at most every ten minutes. The reading is rounded to about a kilometre
  (`roundPoint`) before it is kept or sent anywhere, kept only on the device, one at a
  time, forgotten after six hours and on sign-out. No history of where anyone has been,
  ever: a trip, a stamp or a scrapbook comes only from a trip someone chose to keep. The one
  exception is the **recap** (`src/lib/stay.js`, `tests/stay.test.mjs`, decisions log
  2026-11-08): this phone remembers the town and the first and last day of a stay away, for
  a week, on the device only, so Home can offer to add what was missed; never a point or a
  path, and gone on sign-out and when location is switched off.
- **Trip photos are the family's and private** (`trips` bucket, signed links; never in
  `public/` or `src/`). Claude may suggest what's in one (a plant, bird, animal, dish or place
  named by a sign), never identify or describe a person, and its tags are suggestions until
  someone confirms them; a match is kept only if it is a title the phone sent
  (`tests/photos.test.mjs`).
- Whatever someone records must not vanish: a save that fails waits on the phone and is
  sent again (`addBeenOrQueue`), and a real problem is shown on the form in words, never
  only in a toast.
- The family sees which **town** each of us is in while away (Jason, "full
  transparency"): `member_whereabouts`, one row a person written only by its owner's
  phone, a tenth of a degree, lapsing in twelve hours, removed at home, when switched
  off and on sign-out (`tests/trips.test.mjs`). Never a log, never a closer point.
- The travel app (`/yonder`) keeps only what someone chose: a postcard, a ticked hike, a
  heart, a packing item, a tagged recipe, a place on a town's list (`been_*`,
  `tests/been.test.mjs`). Postcards and hikes keep a town and a day,
  never a point (`tests/yonder.test.mjs`). Where Laurie can eat well is a parent's ask,
  answered to the screen and never stored.
- An Edge Function is told no more than it needs: the birds function gets a
  tenth-of-a-degree cell (`nearCell`, `tests/birds-near.test.mjs`), never a closer point.
- A guide to a place (`area_guides`) is kept by area, never by person: no member id,
  and Reports counts guides without naming the places (`tests/around.test.mjs`). A
  place in a guide is kept only with a source Claude's own searches returned.
- Where anyone is never reaches the wall or Reports, and the sign-in screen's sky
  never follows the phone (`<Sky />` in the gate, `<Sky follow />` inside).
- A screen that shows or sends where someone is says so, and names the services it
  goes to.

## Art in the academy

Every picture in Anna's academy is human-made, with its licence recorded:
Fluent Emoji (MIT) drawn by `scripts/academy-art.mjs`, the rooms drawn in
code, and pictures the family adds with their licence typed in
(`docs/ACADEMY-ART.md`). Never an image generator, never a picture whose
licence nobody wrote down.

## The look

- Phone first, with the desktop built to match. Test at 390px wide and at
  844 × 390 (a phone held sideways). Nothing scrolls sideways.
- The sky of the hour sits behind everything; cards are warm paper with a
  blush of their place's colour; corners are nearly square (4px controls,
  6px cards; the floating tab bar is the one rounded exception).
- Fonts: Agbalumo, the wordmark's and the home-screen icon's own face, for
  "Team Hicks", headings, the loud moments and big numbers (`--font-brand`,
  `--font-voice`, `--font-display`); Nunito for everything read or tapped.
  Agbalumo's lean is the one slant allowed (decisions log, 2026-11-08): no
  italic or slanted style on top of it, and no other slanted face. Caprasimo
  is retired. Never a font SOAR uses (Fraunces, Instrument Sans, Russo One,
  Atkinson Hyperlegible), and no handwriting faces.
- Colour means something: each place has its own. A shine in a place's own
  colour means something is waiting on you; a rainbow gleam means something
  wonderful happened. Rare, one at a time.
- **Every season's show starts in the art on Home and plays with the page**
  (`src/lib/seasonShows.js`): the crow flies out of her painting and home again;
  autumn's wind (`src/lib/wind.js`, `src/shell/WindShow.jsx`) reads the real wind
  at home and lifts leaves from where she painted them (`src/lib/leafOrigins.js`,
  measured by `scripts/leaf-origins.py`, or cut on a painting's page from any autumn
  painting: `src/lib/leafCut.js`, which notes where each came from), then lets them settle on the cards. A new
  season's show finds its own motion rather than reusing another's, uses only real
  data (no stand-in wind), and never alters her painting: what moves is a copy of
  her pixels, over a painting that stays whole (`tests/wind.test.mjs`). Home
  hangs the painting the season's show plays from (`homePainting`), so a newer
  painting of the same season never takes its frame.
- **The swirling light** (`GlowWrap` in `src/ui/Glow.jsx`) is for
  occasions, and only ever round the occasion's own card, never the whole
  screen: a concert's event card, the family day's celebration card, the
  Church card on a feast, the day's other observances on a holiday, the sky
  card for a sky event. Its colours are the occasion's
  (`src/lib/occasions.js`, tested; `on` says which card). It plays by itself
  once a day, again from its small replay dot, then settles to a still rim;
  it never takes a tap, and is still under less motion. Transforms and
  opacity only: no blur.
- Every stylesheet lands in one bundle: an animation name is never reused
  (`tests/css-guard.test.mjs`).
- **Light and dark.** Settings chooses Light, Dark or the device's own
  (`src/lib/prefs.js` sets `html[data-theme]`; `index.html` sets it before
  the first paint). Colours are tokens (`--card`, `--ink`, `--muted`,
  `--line`, `--steady`) redefined under `:root[data-theme="dark"]`; never a
  `prefers-color-scheme` query of your own (`tests/css-guard.test.mjs`). A
  tinted background mixes its tint into the card
  (`color-mix(in srgb, #F2C14E 22%, var(--card))`) rather than naming a
  light colour, so it turns with the theme. A fixed light background keeps
  a fixed dark text colour with it. Illustrations (rooms, maps, scenes) keep
  their own colours. Check a new screen in both.
- **The app's white is cream** (`#FFF8EE`, the paper of the cards): words
  and icons on a colour use `var(--on-colour)`, never `#FFFFFF`.
  Illustrations (maps, rooms, windows, scenes) keep their own whites.
- **A place's icon** is a cream line icon (the tab icons' 24-unit grid) on
  a tile of its own colour (`IconTile`, `src/ui/IconTile.jsx`). The **apps**
  (`src/ui/apps.jsx`) are *flat*: a solid deep colour in the mockup's muted
  outdoor tones (plum, ochre, sea, rust, lake, moss), nearly square corners,
  an outline just inside the edge and a glow of their own colour, with no
  gradient, sheen or shadow. Settings, Admin and Reports are the exception:
  plain line icons with no tile, like the tabs'. The **academy's kinds of room** are the one
  glossy, 3D, bright look (`KIND_COLOURS`, `src/academy/rooms.js`), with
  their Fluent Emoji picture, and they move (`alive`: they float, a glint
  crosses them, a halo breathes, they lift under a pointer; transform and
  opacity only, still under less motion).
- A place's own class names carry its prefix (`ac-` for the academy, `jr-`
  for the journal, `g` for the garden): every stylesheet is global, and a
  bare `.celebrate` or `.flag` meets another place's.
- Art is human-made, with its source and licence recorded in README.md. No
  AI-made art, the home-screen icon included: it's the letter H set in
  Agbalumo (decisions log, 2026-11-01). Laurie's paintings replace photos
  wherever she has painted the thing.
- **Food pictures** (`public/food/`, the Food Icon Pack): the line drawing
  is never changed; the colour under it is a shape `scripts/food-fills.py`
  works out from the ink, and each drawing's colour is chosen by name in
  `COLOURS` (`src/lib/kitchen/food.js`), never from a word inside the name
  ("peanuts" is not green because it holds "pea"). A new drawing gets a
  colour there and its shapes from the script (`tests/food-icons.test.mjs`).
- **Our own things (crucifixes, statues) are illustrated from their own
  photos** by `scripts/lift-art.py illustrate`, never by an image
  generator (docs/CHURCH-ART.md).
- **Laurie's paintings are shown as she painted them.** Crop and frame
  them, never alter them. A bird that flies out of one is a cut-out over
  her own sky (`scripts/lift-art.py`), and at rest the painting itself is
  shown. Never put one through an image generator. Her title, year and
  medium are hers, or a parent's word on them, never guessed from the style:
  when paintings are added (`src/places/lifelist/AddPaintings.jsx`), Claude reads
  the year she wrote by her signature and suggests a working title (always
  `named: false`), the medium and the seasons, each shown with where it came
  from for Jason or Laurie to confirm or change before it's saved; Claude only
  reads the photo, and makes nothing from it (decisions log, 2026-11-07;
  `src/lib/paintings.js`, `tests/paintings.test.mjs`,
  `tests/painting-batch.test.mjs`). The crop and the straightening are worked
  out on the phone (`src/lib/autocrop.js`, `src/lib/paintingBatch.js`): only
  cropped, turned and shrunk, never altered. A painting's original photo is kept
  behind sign-in at `<slug>/original.jpg`, with its crop (`paintings.original`, `crop`),
  so a parent can crop it again from its page (`src/places/lifelist/RecropPainting.jsx`).
  A month she wrote with the year is read the same way (what she wrote first, never the
  season it shows: `monthFromReading`). A **round or many-sided canvas** keeps the box
  crop; its shape (`paintings.shape`, `src/lib/shapes.js`) is the frame drawn round it
  (`Framed`), never a cut of her pixels, and a shaped painting is shown whole in a panel.
  Her colours and a fingerprint are measured on the device (`src/lib/artColour.js`);
  Claude's words about a painting (`looks`) are kept only once a parent says so and are for
  finding and the featured wall, never her title, year or medium nor `subjects`
  (`tests/gallery.test.mjs`). The **featured wall** (`gallery_features`) is written only by
  the `claude` function from the paintings' facts, never their pictures; until it can, the
  app hangs its own from those facts (`src/lib/gallery.js`).
- **The crop tool holds still** (`src/places/lifelist/Cropper.jsx`): the first tap only
  picks it up, the view never follows the box while it's dragged, nothing zooms by itself,
  every change can be undone (Ctrl or ⌘ Z, never while typing), and a crop from storage is
  compared by value. A second photo of something already in is a question (leave it out,
  add it anyway, or replace the photo), never a silent duplicate.
- **Anna's drawings are hers, and private** (Anna's Art, `src/places/Drawings.jsx`,
  at `/drawings`: drawings and paintings both): they live
  in the private `drawings` bucket and are read through signed links, never in
  `public/` or `src/` (anything in the built app can be opened by anyone with the
  address), and a drawing is shown whole, as she drew it: crop and frame it, never
  alter it. When drawings are added (`src/places/AddDrawings.jsx`) Claude suggests
  a working title, whether it's about the pets and any day written on it, each shown
  with where it came from for whoever is adding it to confirm or change (Jason, decisions
  log 2026-11-08); her words are only ever what someone types, and a name written on a
  drawing is never taken from it. Only the cropped photo goes to Claude, the screen says
  so, and it can be switched off. Crop and straighten on the phone, like Laurie's
  (`src/lib/drawingBatch.js`), and the original is kept (`annas_drawings.original`,
  `crop`) so a drawing can be cropped again. Anything that moves around a drawing (the
  Pets launch) is drawn in code (`tests/drawings.test.mjs`, `tests/drawing-batch.test.mjs`).
  The Pets launch always hangs the first drawing marked "Our pets", never a newer one.
- Animations are welcome. Under the device's Reduce Motion they become a
  gentle fade or stop (`src/lib/motion.js`). No `filter: blur()` on anything
  large: iPhones repaint it slowly. Soft shapes come from gradients.

## How it's built

- React and Vite, plain JavaScript. Logic with no React lives in `src/lib/`
  so `npm test` can run it in Node.
- **Every screen has an address** (`/world/school/soar`) and an in-app Back
  walks the same history as the browser's and the phone's swipe
  (`src/lib/router.js`, `Crumb` in `src/shell/Link.jsx`). Never a Back
  button that just opens the parent. Filters, sorts and layouts stay out of
  the address; switching between items on one screen replaces the address
  rather than adding a step.
- **Settings, Admin and Reports follow the registry** (`src/registry.js`):
  a place declares its setup sections and reports there and they appear by
  themselves. `tests/registry.test.mjs` keeps it in step with the router. A
  new place, or a new kind of data, adds its setup section and its report.
- **The calendar works its days out** (`src/lib/cal/`): a holiday or
  observance is a rule for any year with a line about why it matters, in a
  group Settings can switch off, never a list of this year's dates. The
  Church's day comes from `liturgicalDay()`; anything that only might be
  right (Islamic dates, unchecked Mass times) says so on screen. Family
  days are only ever read from the database. Tests pin known years.
- **A place's stylesheet** sits beside its screens and is imported by them;
  `styles.css` loads first (`src/main.jsx`), so a place's rule wins a tie.
- **A job that's waiting gets the shine** (`.shine`, the count on its face,
  straight to the job): only while there is something to do, at most one per
  screen. A rainbow gleam is for something wonderful, never a job.

## Touch, screens and settings

- Touch is not a mouse: nothing works only on hover or by dragging (iOS
  Safari never fires HTML5 drag from touch); give every drag a tap. A touch
  tooltip stays until the next tap elsewhere. Tap targets about 44px; grow
  small controls with `@media (pointer: coarse)`, not a width breakpoint.
- Test at 390px wide and at 844 × 390 (sideways: only about 340px of height,
  so screens scroll). Anything fixed near an edge adds the safe-area inset.
- A table never makes the page scroll sideways (fixed layout with percentage
  columns, or its own scroller). A figure ("43%", "15 of 24") never wraps;
  let the words beside it wrap.
- SVG charts: a `viewBox`, width 100%, height auto; pointer to chart
  coordinates through `getScreenCTM().inverse()`.
- Settings' text size (up to 140%) and motion apply everywhere: let text
  wrap, and decide on motion with `src/lib/motion.js` and the
  `html[data-motion]` setting, never a fresh `matchMedia` of your own.
- Every sheet or pop-up has its own close and closes on a tap outside or
  Escape; a yes/no is `Confirm` (`src/ui/Confirm.jsx`), never
  `window.confirm()`. An overlay is drawn at the top of the page (a portal):
  inside a card, the card's entrance animation pins it to the card.
- Taking one small thing away (an idea off a list) happens at once, with an
  Undo (`Toast`, `src/ui/Toast.jsx`), never a question; wiping a whole list
  asks first with `Confirm`. Something under way that takes a while shows
  at the top of the screen (`Working`, same file), not at the end of the
  page.
- Half-done work survives interruption: iOS closes the installed app in the
  background, so anything someone types into, or that takes more than one
  tap (a cook check, a new source), keeps its draft on the device until it's
  finished or cancelled (`useDraft`, `src/lib/useDraft.js`; drafts are
  cleared on sign-out). A batch of Laurie's paintings or Anna's drawings waiting to be
  added is not kept on a device at all: it waits in the family's storage (`painting_inbox`
  and `inbox/<id>/` in the private `paintings` bucket, parents only; `drawing_inbox` and
  `inbox/<id>/` in the `drawings` bucket, whoever sent a photo and the parents;
  `src/lib/inboxStore.js`), so it survives the app closing and can be picked up on another
  device (send from a phone, crop on a computer). A device keeps only a small draft of
  which photo it was on.

## The database (Supabase)

- Migrations live in `supabase/migrations/`, named by UTC timestamp
  (`yyyymmddhhmmss_short_description.sql`), run once in order (docs/DATABASE.md).
  Never edit one that has run; fix it with a new one.
  `tests/migrations.test.mjs` checks the rules below.
- **Giving Jason a migration to run** (Jason's preference, 2026-11-01): one
  PowerShell line that copies the file to the clipboard, starting with the
  `cd`, then the dashboard steps one at a time. Say what the SQL does in a
  sentence first, and that it runs once (a second run errors with "already
  exists"):
  `cd C:\Users\Admin\projects\hicks-app-clone; git pull; Get-Content supabase\migrations\<file>.sql -Raw | Set-Clipboard`
  then Supabase dashboard → SQL Editor → new query → paste → Run, and what
  "Success" looks like. Never ask him to open or copy the file by hand.
- **Check the Supabase account before any CLI command** (2026-11-08): Jason's
  machine is often logged into the SOAR school account, which sees only SOAR's
  project and is refused (403) on this one; this app's database is a separate
  Supabase account and project, called "Hicks App". Whenever you give Jason
  Supabase CLI commands (a function deploy, `supabase link`, secrets), start
  with `npx supabase projects list`, say that "Hicks App" must be in the list
  (and that SOAR's project must never be the target), and if it isn't, give
  the fix before the command: a token for the Hicks account in that one
  window (`$env:SUPABASE_ACCESS_TOKEN = "..."`, made at
  supabase.com/dashboard/account/tokens, never pasted into chat), or
  `npx supabase logout` then `login`. Give the branch switch too, since he
  works on several branches: `cd C:\Users\Admin\projects\hicks-app-clone; git checkout main; git pull`
  before a deploy of merged work, and `git checkout <his branch>` after.
- New tables are not exposed automatically: each migration grants its
  tables to `authenticated`, never to `anon`, and switches on row-level
  security. Never `using (true)`: a signed-in stranger must see nothing.
  Gate with `public.is_family()` / `public.is_parent()`, called inside a
  sub-select (`using ((select public.is_family()))`), which runs once per
  query rather than once per row.
- Every `update` and `delete` has a `where`, even on a one-row table:
  Supabase rejects one without, but only live, never in a local test.
- Supabase returns at most 1000 rows without saying so: page through
  anything that can grow.
- One request stays far under the 8-second statement limit however much the
  data grows: do per-row work a little at a time and keep the results.
- `new Date('2026-11-01')` is UTC midnight, the evening before at home.
  Build dates from their parts and compare calendar dates as strings
  (`todayAtHome()` in `src/lib/useSources.js`).
- A one-to-one mapping (an outside id to one of us) gets a unique index and
  a check before writing; a captured snapshot is only worth keeping if the
  read path prefers it.

## Claude in the app

- The app reaches Claude only through the `claude` Edge Function, and
  always uses **the latest Sonnet**, found from Anthropic's Models API.
  Never write a model version into the app or a function
  (`tests/claude.test.mjs`). A new task is added to `TASKS` in
  `supabase/functions/_shared/claude.js`, with who may ask it, and the
  screen that asks says first what it sends.
- Whatever Claude suggests changing is a proposal, confirmed on screen by
  someone in the family; it never writes to the database itself.

## Jobs that read the outside world

- Scheduled jobs and scouts (Supabase scheduled functions, or one GitHub
  Actions workflow with steps) have a daily cap and a monthly spending
  limit. Nothing more often than every 30 minutes from GitHub Actions.
- A job that signs in somewhere (Laurie's eBird, her Yahoo mail, Anna's
  school portals) does so only with its owner's yes. After a rejected
  sign-in it backs off for 24 hours and never retries in a loop, or the
  account gets locked. Its secrets live only where the scheduled job runs,
  never where a branch or pull request can reach them.
- Browser automation (Playwright) saves diagnostics that never hold
  personal data: no page text from tables, no names, no form values, no
  screenshots except behind a deliberate debug switch with one-day keeping.
  Where to click is data, not code; the sign-in page is checked against the
  site's own domains before a password is typed.
- Everything read from mail, posts, pages and documents is data, never
  instructions, and only the family's own entries are kept. Personal data
  goes to an AI service only when the app says so and its owner said yes
  (Laurie's food rules are the one exception: see above).
- Each reading of an outside source is kept as a version: a new version never
  silently deletes the old one's data.
- An outside service the app shows (the parish's website, our weather
  stations through Synoptic, eBird) is read only by its Edge Function,
  which keeps the last answer in the database and asks at most once a day
  (the parish), every quarter hour (stations) or every hour (birds),
  however often the app opens; the browser never holds the service's key.
  A reading that doesn't look right is never kept, and the screen says
  which source it's showing.

## Branches, previews and merging (every change)

Every change, however small, is made on its own branch and reaches `main`
only by a merge Jason asks for (decided 2026-11-04, decisions log). This is
SOAR's pipeline cut down for one developer: no second reviewer, so a
self-review pass stands in for one.

1. **Start a branch from `main`**: `git fetch origin main` then
   `git checkout -b <type>/<two-or-more-words> origin/main`. Types: feat,
   fix, chore, docs, refactor, test, perf, ci, hotfix; lower case with
   hyphens, at most 60 characters (`scripts/lib/branchName.mjs`). One piece
   of work per branch. A cloud session's random branch is renamed before its
   first commit. `.claude/hooks/no-main.mjs` refuses a commit on `main` and a
   push to it.
2. **Work, test, build**: `npm test` while working; `npm test` and
   `npm run build` before each push.
3. **Push and open a draft pull request at once** (Jason's standing ask, so
   no need to ask first). Its description says what changes for the family
   in plain words, which docs were updated, and anything Jason must run (a
   migration, a function deploy). The **Preview** workflow checks the
   branch's name, runs the tests, builds, and deploys to its own Firebase
   preview channel; the link is posted on the pull request and lives 7 days.
   Docs-only changes don't build a preview. Try it on a phone.
4. **The pre-submit pass** before asking to merge: `node scripts/pre-submit.mjs`
   lists what the branch touches and the questions a reviewer would ask of
   each area; read the whole diff against them, fix in one round, push once.
5. **Merge only on Jason's words** ("merge it"): mark the pull request ready,
   merge it (a merge commit, never `--admin`), delete the branch. Merging to
   `main` deploys to https://hicks.web.app.

The preview and the live app share **one** Supabase database and one set of
Edge Functions. So a migration on a branch is additive and safe to run
before the merge (Jason runs it to try the preview, and it is live from
then), and a changed Edge Function is deployed after the merge, not from a
branch. Say both in the pull request.

## How much to check, and when

- While working: `npm test` (seconds). Before a push: `npm test` and
  `npm run build`, and a look at 390px and on a desktop for anything visible
  (the preview link makes this easy on a phone).
- Laurie's paintings never go in `public/` to be deployed: they live in
  the private `paintings` bucket (docs/PAINTINGS-STORAGE.md), and
  `firebase.json` leaves `public/paintings/` out.
- Before merging something that touches data, sign-in, a job or a secret,
  review it the way a second developer would: one person reaching another's
  data, trusting outside input, no caps on cost, personal data sent to an
  AI service without saying so, secrets reachable from a branch push, grants
  broader than the job needs, syncs that delete history.

## Docs ship with the change

| If the change… | Update |
|---|---|
| adds or changes a place, screen or the shell | `docs/PLAN.md`, and `README.md` if a newcomer would need it |
| adds a migration, table, grant or function | `docs/DATABASE.md` (tables and the migration index) |
| decides something, or reverses an earlier decision | `docs/DECISIONS-LOG.md`, a new dated entry, keeping the old one |
| adds a secret, a job or an outside service | `docs/SECRETS.md` |
| adds art, a font or an icon | the credits in `README.md` |
| adds a rule a future session must follow | this file |

Docs are written in the present tense about what is; the history and the
reasons go in the decisions log. Anything unverified says so.
