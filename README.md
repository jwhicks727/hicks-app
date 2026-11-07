# Team Hicks

The Hicks family app (we call ourselves Team Hicks): our world, our calendar, our kitchen, our life list and
our music, for the three of us, on our phones, our computers and (later) a
screen on the wall.

It is a private family project, apart from any school system: its own
repository, its own database, its own look.

## The places

Five tabs, the same for all of us: four places we share, and **Apps**,
which opens a sheet of everything else over whatever you're looking at. On
a computer, the side rail lists the apps under their own heading.

| Tab | What it is |
|---|---|
| **Home** | Today at a glance, starting with each person's **Early Bird** and **Night Owl** lists (their morning and evening to-dos, with streaks, records and family challenges), then the sky, the weather at home and at each school (or, away from home with Settings › Notice where I am on, the weather where you are, and a trip on the calendar coming up), birds around us, the day's calendar, what's left in the fridge, family days, a question for the dinner table, cheers for Anna, the morning sit (which leads on to the journal), and cards for the garden and the journal. |
| **Calendar** | A full calendar (day, week, month, year), synced with our Google calendars, with the Church year, Mass times, our ministries, family days, holidays, heritage days, seasons and nature woven in. |
| **Kitchen** | Jason's cooking: the week's recipes, what's left in the fridge, a cook check before cooking. |
| **World** | All our places on one map (around home, SoCal, the world), each with its own page, its skyline in its sky right now and a link into the phone's maps app; weather in depth; the sky, the sun and the moon; a page for each school. |
| **Apps** | A sheet of the apps below; the tab stays lit while one is open. |

The apps (each at its own address):

| Place | What it is |
|---|---|
| **Journal** (`/journal`) | Each person's own journal, readable by them alone: the day's question, anything else, gratitudes; this day in other years; notes to your future self. |
| **The Academy** (`/academy`) | Anna's own school, built room by room in isometric art: she names it, adds any room, arranges everything. Above all it celebrates her: tasks light stars, goals end in trophies, good grades earn medals, and anyone can cheer her. |
| **Life List** (`/lifelist`) | Everything we've seen and done: Laurie's birds, camping and Disneyland trips, the national parks we're checking off. |
| **Laurie's Gallery** (`/lifelist/paintings`) | Laurie's paintings, behind sign-in. |
| **Anna's Gallery** (`/drawings`) | Anna's drawings, taped to a wall, behind sign-in; anyone in the family can add one. |
| **Jams** (`/jams`) | Our music, jam bands first: shows near us, free live recordings, a built-in player, and each person's favourites. |
| **The Garden** (`/garden`) | Maps of the yard, each room's plants side by side, what needs doing today, photos Claude can look at. |
| **Pets** (`/pets`) | Coming soon: Appa and the cats, launched with a scene around Anna's drawing of them. |

What's built so far, and what's next: [`docs/PLAN.md`](docs/PLAN.md).

## Running it

You need Node 20 or later.

```
npm ci
npm run dev      # a local server, usually http://localhost:5173
npm test         # the tests in tests/
npm run build    # the production build, into dist/
```

`.env.example` lists the settings the app will need once its database is
connected. Copy it to `.env` (never committed) and fill it in.

## Hosting

The app is on Firebase Hosting (the free plan), and its data on Supabase.
Setting it all up, in order: `docs/MORNING.md`.

- **Every change is a branch with a draft pull request** (CLAUDE.md,
  "Branches, previews and merging"); nothing is committed straight to `main`.
- **Every pull request gets a preview link,** drafts included
  (`.github/workflows/preview.yml`): the branch's name is checked, the tests
  run, the app is built and put on its own Firebase preview channel. The link
  is posted on the pull request and lasts a week. The preview uses the live
  database, so try changes there with care.
- **Merging to `main` deploys it** (`.github/workflows/deploy.yml`).
- **Before a merge,** `node scripts/pre-submit.mjs` lists what the branch
  touches and what to check in each area.
- **Signing in on a preview with an emailed link** needs the preview addresses
  in Supabase: Authentication › URL Configuration › Redirect URLs, add
  `https://hicks--*.web.app/**` (the pattern is unverified until tried; the
  password sign-in works without it).
- **Laurie's paintings are never in the hosted files.** They live behind
  sign-in, in private storage (`docs/PAINTINGS-STORAGE.md`).

## Where things are

- `src/places/` — one file per place, and the screens under each.
- `src/parts/` — pieces shared between places (the sky today, ...).
- `src/shell/` — the sky behind everything, the tab bar, links and Back.
- `src/parts/ListsCard.jsx` and `src/places/lists/` — the morning and evening
  lists (Early Bird and Night Owl): Home's card, `/home/lists` for your own
  (and Anna's, for a parent), `/home/lists/family`; the rules are
  `src/lib/routines.js` (what comes up on a day, streaks, records) and
  `src/lib/challenges.js` (the family challenges), the data `src/lib/useLists.js`.
- `src/consoles/` — Settings, Admin and Reports, built from `src/registry.js` (reached from the foot of the Apps sheet, or the computer's rail).
- `src/calendar/` — the calendar's day, week, month and year views.
- `src/places/world/` — the map of our places and each place's page;
  the places themselves are `src/lib/places.js`, their skylines' shapes
  `src/lib/scenes.js`, and the map's outlines `src/lib/mapdata.js`
  (generated by `scripts/make-map.mjs`; regenerate rather than edit).
- `src/places/lifelist/` and `src/parts/PaintingFrame.jsx` — Laurie's
  gallery, and a painting whose bird can fly; the paintings themselves are
  `src/lib/paintings.js` and `public/paintings/`.
- `src/kitchen/` — the cookbook, a recipe, cook mode and timers
  (`docs/KITCHEN.md`).
- `src/academy/` — Anna's academy: the campus and rooms (drawn in code,
  isometric), tasks, goals, grades and the Hall of Fame; its pictures are
  `src/academy/items.js` and `public/academy/` (`docs/ACADEMY-ART.md`). It
  loads only when opened.
- `src/shell/AppsSheet.jsx` and `src/ui/apps.jsx` — the Apps tab's sheet
  and its list. `src/places/journal/` is the journal (with
  `src/lib/journal.js`: each person's own, readable by them alone);
  `src/places/garden/` the garden.
- `src/lib/` — plain logic with no React, so tests can run it.
  `src/lib/cal/` works out the calendar: the Church's day (`liturgy.js`),
  the saints' lines and prayers, holidays and heritage days
  (`observances.js`), Jewish and Islamic holy days, solstices, equinoxes
  and the moon (`nature.js`), Sacred Heart's Mass times, and how family
  days read. Nothing there is typed in per year except Lunar New Year,
  whose table runs to 2035.
- `supabase/migrations/` — the database, one migration at a time
  (`docs/DATABASE.md`).
- `supabase/functions/` — jobs that run on Supabase: `read-sources` reads
  the calendar feeds nightly. Its logic is in `_shared/`, plain JavaScript
  the tests run too.
- `.github/workflows/sync-ebird.yml` — the nightly job that brings in
  Laurie's new checklists from eBird's API under her display name (only with a yes
  recorded in the app) (`scripts/sync-ebird.mjs`; no sign-in;
  secrets in the `ebird` environment, `docs/SECRETS.md`). Run by hand only (no schedule).
- `docs/` — the decisions log, the design principles, the plan, and the
  clickable mockup the look was worked out in (`docs/mockup/`).

## Art, fonts and licences

Every picture the app uses is human-made: Laurie's paintings, our own
photos, or free libraries whose licences allow it. Each source is credited
where it appears and listed here. How Laurie's paintings are photographed
and added: `docs/ART-CAPTURE.md`.

- **Autumn's wind** lifts Laurie's painted leaves from the very places she painted them
  (measured by `scripts/leaf-origins.py`, which only fits her own cut-out pixels back into
  her painting) and blows them with the real wind at home, from the same Open-Meteo forecast
  the weather card reads. Her painting itself is never changed.
- **Anna's drawings** are hers: each is added in Anna's Gallery and kept in the family's
  private storage, behind sign-in, never in the app's own files. The Pets launch
  hangs her drawing "My Cats" in a scene drawn in code (the moon, wall, cats, hearts,
  stars, pegs and Appa are this repository's own shapes, no one's artwork), with
  the cats coloured as Jason describes them; no image generator is involved
  (`src/places/pets/PetsLaunch.jsx`).
- **Fonts:** Nunito and Caprasimo from Google Fonts (SIL Open Font Licence). The
  wordmark "Team Hicks" is set in Agbalumo (Sorkin Type, SIL Open Font Licence,
  from Google Fonts), the home-screen icon's own font.
- **Food pictures:** the Food Icon Pack by Michael Bollin,
  https://foodiconpack.com, CC BY 4.0 (`public/food/LICENSE.txt`): its
  ingredient drawings, one file each in `public/food/`, with their path data
  rounded and a fill shape added so the app can colour each one in.
- **Sun and moon:** worked out on the device with SunCalc (BSD licence);
  the calendar's solstices, equinoxes, moon phases, the moon's distance and
  eclipses follow Jean Meeus, *Astronomical Algorithms* (chapters 27, 47, 49
  and 54), and its Hebrew and Islamic
  dates Dershowitz and Reingold, *Calendrical Calculations*.
- **Weather:** the forecast is Open-Meteo's (https://open-meteo.com, data
  CC BY 4.0, credited on each weather card); alerts are the National Weather
  Service's (public domain). Both are asked for by the browser with the
  town's coordinates only. The weather pictures are drawn on the 24-unit
  grid.
- **Laurie's paintings:** hers, used with her permission and listed in
  `src/lib/paintings.js`: *The witch and the crow* (a working title),
  photographed on the wall at home. Its crow is lifted out to fly by
  `scripts/lift-art.py`, which fills her sky in behind it from its
  surroundings; the painting is always shown unaltered at rest.
- **Maps:** land and sea outlines from Natural Earth (public domain,
  https://www.naturalearthdata.com), by way of the world-atlas package's
  TopoJSON files (ISC licence), read as data and simplified by
  `scripts/make-map.mjs`. The mountains and lakes near home are rough
  outlines drawn for the app. The places' skylines are generic silhouettes
  drawn in code (`src/lib/scenes.js`), no one's artwork or logo.
- **Freeways (Around home and the big ones across SoCal):** Natural Earth's roads (public domain), read
  by `scripts/make-freeways.mjs` into `src/lib/freeways.js`, renumbered
  where Natural Earth numbers them wrongly here; the 210 through Fontana,
  which it lacks, is traced by hand through its interchanges.
- **Wild right now:** a drawing for each season, made in code, and the preview picture its own site names (the eagle cam, the monarch count, BirdCast and the rest), read once a week by the `wild` function and credited on the card; the browser loads the picture from the site.
- **Where we are:** the town's name away from home comes from OpenStreetMap's Nominatim (https://nominatim.openstreetmap.org, data © OpenStreetMap contributors, ODbL, credited on the card that shows it), asked by the phone with its position rounded to about a kilometre, at most once a month for each area. The weather there is Open-Meteo's and the alerts the National Weather Service's, as at home.
- **What's around here:** places from OpenStreetMap (© OpenStreetMap contributors, ODbL) through the Overpass API, and Wikipedia's articles nearby with photos from Wikimedia Commons, each shown with its author and licence (open licences only); a place's own picture from its own website, credited to it. The guide is written by Claude from its own web searches, with every place's sources on screen.
- **Air quality and the weather's past and future:** Open-Meteo's air quality and archive services (https://open-meteo.com), through the browser, the town's coordinates only.
- **Mass times:** read from Sacred Heart's own website
  (https://www.sacredheartrc.org/) by the `parish` function, once a day;
  until it has been read, the Diocese of San Bernardino's listing, marked
  unchecked.
- **The schools' stations:** readings through Synoptic Data's Open Access
  tier (https://synopticdata.com, free for non-commercial use, credited
  where shown); the stations belong to the networks that run them.
- **Birds around us:** sightings from eBird (https://ebird.org), the Cornell
  Lab of Ornithology, asked about the town's centre; each photo is from
  iNaturalist (https://www.inaturalist.org), only one with a Creative
  Commons licence, shown with its photographer's credit.
- **Jam history:** shows taped on this day, from Relisten
  (https://relisten.net), which streams the Internet Archive's Live Music
  Archive, from bands that allow taping. Read by the browser with only the
  date.
- **Sightings:** an outdoor event shows what iNaturalist's observers have
  recorded nearby (https://www.inaturalist.org), each photo with its own
  observer's credit and licence as iNaturalist gives it, and a link back.
- **Mindfulness:** short lines from Thich Nhat Hanh's books, credited to
  each and read privately by the family (his words are his publishers',
  Parallax Press and Plum Village); lines from Max Müller's 1881 translation
  of the *Dhammapada* (public domain). The bowl is made by the phone.
- **Prayers:** the traditional English forms, which belong to everyone; the
  saints' one-line stories are our own.
- **Calendar pictures:** small line icons drawn on the same 24-unit grid;
  the sky's events (moons, eclipses, meteors, the sun's paths) are drawn as
  simple shapes in `src/calendar/AstroArt.jsx`. Their links go to NASA Space
  Place, NASA Science, timeanddate.com and the American Meteor Society.
  Catholic and saint line art comes later, from sources still to be checked
  (`docs/PLAN.md`).
- **Icons:** Home's sprout is Lucide's (https://lucide.dev, ISC licence); the
  other tab icons are drawn on the same 24-unit grid. The home-screen icon
  (`public/icons/`, named "Team Hicks" by `public/manifest.webmanifest`) is
  the letter H set in Agbalumo (Sorkin Type, SIL Open Font License, from
  Google Fonts), white on the evening sky, drawn by
  `scripts/draw-h-icons.cjs` (with a maskable version for Android's circle)
  and sized by `scripts/make-icons.mjs`. The other options, including the
  ChatGPT sprouts it replaced, are in `docs/icon-options/`.
- **The academy:** its furniture, animals and prizes, and the pictures on its room buttons, are Fluent Emoji by
  Microsoft (MIT licence; https://github.com/microsoft/fluentui-emoji),
  drawn to WebP by `scripts/academy-art.mjs` with the licence beside them
  in `public/academy/`. The rooms and campus are drawn in code. Pictures
  the family adds carry their own licence (`docs/ACADEMY-ART.md`).
- **Indoor plants** are drawn in code (`src/places/garden/PlantArt.jsx`).
- **The lists' hummingbird and owl** (an Anna's hummingbird on Anna's list, a
  western screech-owl in the evenings), their scarves, flowers and crowns, the
  feathers, trophies and the lists' small line icons are drawn in code
  (`src/places/lists/Birds.jsx`, `src/places/lists/icons.jsx`), and their
  sounds are made by the phone itself (`src/places/lists/sounds.js`): nothing
  recorded, nothing generated.
- **The apps** each have a line icon drawn on the tab icons' 24-unit grid,
  on a tile in their own colour (`src/ui/apps.jsx`, `src/ui/IconTile.jsx`).
