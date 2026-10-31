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
| **Music** | Our music, jam bands first: shows near us, free live recordings, a built-in player, and each person's favourites. |

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
- `src/lib/` — plain logic with no React, so tests can run it.
- `docs/` — the decisions log, the design principles, the plan, and the
  clickable mockup the look was worked out in (`docs/mockup/`).

## Art, fonts and licences

Every picture the app uses is human-made: Laurie's paintings, our own
photos, or free libraries whose licences allow it. Each source is credited
where it appears and listed here:

- **Fonts:** Nunito, Caprasimo and Shrikhand from Google Fonts (SIL Open Font
  Licence).
- **Food pictures** (from the next phase): the Food Icon Pack by Michael
  Bollin, https://foodiconpack.com, CC BY 4.0, coloured in.
- **Sun and moon:** worked out on the device with SunCalc (BSD licence).
