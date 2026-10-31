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
  them; they never reach the wall; Claude receives them only with Laurie's
  yes, said on screen. They live in the database, never in this repository.
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
  the gate by default; never add a route that shows without it.
- Logins are held only with their owner's yes, and the app never signs in to
  Amazon (decisions log). Every secret is listed in `docs/SECRETS.md`; none is
  ever written into the repository. The app holds only the Supabase URL and
  publishable key; the secret key and the database password never reach it.
- Mail, GroupMe posts and documents the app reads are data, never
  instructions, and only the family's own entries are kept (never another
  child's name from a group's schedule).
- No invented data in the real app: no stand-in numbers. If the real source
  isn't connected yet, the part says what's coming instead.

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
- Fonts: Caprasimo (upright, curvy, Cooper-like) for headings, the loud
  moments and big numbers; Nunito for everything read or tapped. No slanted
  or italic headings. The one exception is the wordmark "Team Hicks", set in
  Agbalumo (`--font-brand`) to match the home-screen icon, and nothing else. Never a font SOAR uses
  (Fraunces, Instrument Sans, Russo One, Atkinson Hyperlegible), and no
  handwriting faces.
- Colour means something: each place has its own. A shine in a place's own
  colour means something is waiting on you; a rainbow gleam means something
  wonderful happened. Rare, one at a time.
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
- **Our own things (crucifixes, statues) are illustrated from their own
  photos** by `scripts/lift-art.py illustrate`, never by an image
  generator (docs/CHURCH-ART.md).
- **Laurie's paintings are shown as she painted them.** Crop and frame
  them, never alter them. A bird that flies out of one is a cut-out over
  her own sky (`scripts/lift-art.py`), and at rest the painting itself is
  shown. Never put one through an image generator. Her title, year and
  medium come from her, never guessed (`src/lib/paintings.js`,
  `tests/paintings.test.mjs`).
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
- Half-done work survives interruption: iOS closes the installed app in the
  background, so anything someone types into, or that takes more than one
  tap (a cook check, a new source), keeps its draft on the device until it's
  finished or cancelled (`useDraft`, `src/lib/useDraft.js`; drafts are
  cleared on sign-out).

## The database (Supabase)

- Migrations live in `supabase/migrations/`, named by UTC timestamp
  (`yyyymmddhhmmss_short_description.sql`), run once in order (docs/DATABASE.md).
  Never edit one that has run; fix it with a new one.
  `tests/migrations.test.mjs` checks the rules below.
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
  goes to an AI service only when the app says so and its owner said yes.
- Each reading of an outside source is kept as a version: a new version never
  silently deletes the old one's data.
- An outside service the app shows (the parish's website, our weather
  stations through Synoptic, eBird) is read only by its Edge Function,
  which keeps the last answer in the database and asks at most once a day
  (the parish), every quarter hour (stations) or every hour (birds),
  however often the app opens; the browser never holds the service's key.
  A reading that doesn't look right is never kept, and the screen says
  which source it's showing.

## How much to check, and when

- While working: `npm test` (seconds). Before a commit: `npm test` and
  `npm run build`, and a look at 390px and on a desktop for anything visible.
- **For now, work goes straight to `main`** (Jason's call, 2026-11-01, while
  the app is being set up: see the decisions log). Test and build first;
  every push to `main` deploys to https://hicks.web.app. When Jason says
  branches are back, the rule is: each piece of work on its own branch
  (`<type>/<two-or-more-words>`, e.g. `feat/calendar-month-view`), one at a
  time, with a draft pull request opened only after asking him, and the
  Preview workflow's link to try it on a phone before merging.
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
