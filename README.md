# Team Hicks

The Hicks family app (we call ourselves Team Hicks): our world, our calendar, our kitchen, our life list and
our music, for the three of us, on our phones, our computers and (later) a
screen on the wall.

It is a private family project, apart from any school system: its own
repository, its own database, its own look.

## The places

| Place | What it is |
|---|---|
| **Home** | Today at a glance: the sky, the weather at home and at each school, birds around us, the day's calendar, what's left in the fridge, family days. |
| **World** | Weather in depth, wound back to what happened as well as forward; the sky, the sun and the moon; one other place a day; a page for each school. |
| **Calendar** | A full calendar (day, week, month, year), synced with our Google calendars, with the Church year, Mass times, our ministries, family days, holidays, heritage days, seasons and nature woven in. |
| **Kitchen** | Jason's cooking: the week's recipes, what's left in the fridge, a cook check before cooking. |
| **Life List** | Everything we've seen and done: Laurie's birds, camping and Disneyland trips, the national parks we're checking off, her paintings. Opens on what's recent. |
| **Jams** | Our music, jam bands first: shows near us, free live recordings, a built-in player, and each person's favourites. |

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

## Where things are

- `src/places/` — one file per place, and the screens under each.
- `src/parts/` — pieces shared between places (the sky today, ...).
- `src/shell/` — the sky behind everything, the tab bar, links and Back.
- `src/consoles/` — Settings, Setup and Reports, built from `src/registry.js`.
- `src/calendar/` — the calendar's day, week, month and year views.
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
- `docs/` — the decisions log, the design principles, the plan, and the
  clickable mockup the look was worked out in (`docs/mockup/`).

## Art, fonts and licences

Every picture the app uses is human-made: Laurie's paintings, our own
photos, or free libraries whose licences allow it. Each source is credited
where it appears and listed here:

- **Fonts:** Nunito and Caprasimo from Google Fonts (SIL Open Font Licence).
- **Food pictures** (from the next phase): the Food Icon Pack by Michael
  Bollin, https://foodiconpack.com, CC BY 4.0, coloured in.
- **Sun and moon:** worked out on the device with SunCalc (BSD licence);
  the calendar's solstices, equinoxes and moon phases follow Jean Meeus,
  *Astronomical Algorithms* (chapters 27 and 49), and its Hebrew and Islamic
  dates Dershowitz and Reingold, *Calendrical Calculations*.
- **Weather:** the forecast is Open-Meteo's (https://open-meteo.com, data
  CC BY 4.0, credited on each weather card); alerts are the National Weather
  Service's (public domain). Both are asked for by the browser with the
  town's coordinates only. The weather pictures are drawn on the 24-unit
  grid.
- **Prayers:** the traditional English forms, which belong to everyone; the
  saints' one-line stories are our own.
- **Calendar pictures:** small line icons drawn on the same 24-unit grid.
  Catholic and saint line art comes later, from sources still to be checked
  (`docs/PLAN.md`).
- **Icons:** Home's sprout is Lucide's (https://lucide.dev, ISC licence); the
  other tab icons are drawn on the same 24-unit grid. The home-screen icon
  (`public/icons/`) is that sprout on the evening sky, named "Team Hicks" by
  `public/manifest.webmanifest`.
