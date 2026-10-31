# Hicks Family App — decisions log

Why things are the way they are. Newest first. A reversed decision gets a
new entry; the old one stays. The working rules for every project are in
`DESIGN-PRINCIPLES.md`; this file records what was decided for this one.

---

## 2026-10-31 — The swirling light wraps the occasion's card, not the screen

Jason saw it fill the screen's edges and asked for it on the event's card
only. It now swirls round the one card the occasion belongs to (a halo just
outside its edge and a bright rim on it, with snow, sparks or a light show
inside), then settles to a still rim in the occasion's colours: a concert's
own card, the family day's celebration, the Church card on a feast, the
day's observances on a holiday, the sky card for a solstice or an eclipse.
A separate occasion card appears only when there's no card to light (a
concert, or a day whose kind is switched off). This replaces the edge of the
screen and the chip of the entry below.

---

## 2026-10-31 — The home-screen icon, for now

Jason reworked the sprout icon in ChatGPT and asked for it to be used for
now. It is the one exception to "art is human-made": a stand-in for the
home-screen icon only, kept until a human-made icon replaces it. The
Android version sets it a little smaller on its own sky, so a circle crop
keeps the whole sprout. A second, leafier version is pinned beside it
(`docs/icon-options/`), and `scripts/make-icons.mjs` makes every size from
either.

---

## 2026-10-31 — The readings, read in the app

- **The text comes from the USCCB's own readings page,** fetched by a small
  Edge Function when one of us opens a day's readings, shown as plain text,
  and never stored or shown to anyone outside the family. The lectionary's
  text is copyrighted (CCD); this is the family reading it privately, the
  way we would on the USCCB's site, and the app credits it and always links
  to the page. If that ever seems too much, the link alone stays.
- **Any Mass:** on days with several (Christmas's Vigil, Night, Dawn and Day)
  the page's own list of Masses becomes a choice, each with its own address.
- **Unverified tonight:** USCCB's site couldn't be reached from the session
  where this was built, so the page's shape is as known, tested on a sample,
  and the app says plainly when a page doesn't read rather than guessing.

---

## 2026-10-31 — Outdoor events research themselves

- **Events can be added in the app** (any of us), with a place found on the
  map through Open-Meteo's place search. The app suggests "outdoors" from
  the words (camping, hike, trail, beach, park, birding…); the switch
  decides.
- **An outdoor event's page reads its place when it's opened:** the
  forecast there within 16 days, otherwise the same dates over the past five
  years (Open-Meteo's archive), so a trip months away still says what to
  pack; each night's moon and whether the sky will be dark; meteor showers;
  and what iNaturalist's observers have seen within about 12 km in that
  month, birds first for Laurie, then mammals, plants, reptiles and insects.
- **Only the place travels:** its name to find it, then its coordinates
  rounded to about a kilometre. The form asks for a park, town or venue,
  never someone's address. Results are kept for the session, not stored.
- **Read on opening, not by a job:** the events are few and the answers
  change (forecasts), so nothing runs in the background or costs anything.

---

## 2026-10-31 — The sky's events, worked out and illustrated

- **Eclipses are computed** (Meeus ch. 54), not listed: the kind, the time
  of greatest eclipse and each phase, and for an eclipse of the moon whether
  the moon is up at home for it. A solar eclipse is shown as seen far from
  here, with a map link, because where it is seen needs more than this.
- **Supermoons use the moon's real distance** (Meeus ch. 47): SunCalc's
  distance keeps only the main term and can't tell one perigee from
  another. A supermoon is within about 90% of the closest approach
  (361,524 km); the year's nearest full moon is called the biggest.
- **Each event gets a card on its day** with a drawn picture, a few lines of
  what it is, its times at home and links to read more, kids' pages first
  (NASA Space Place) so Anna can follow them too. A total eclipse of the
  moon seen from home gets the swirling light in copper red.

---

## 2026-10-31 — The Kitchen opens: Jason's recipes, read as he writes them

- **The handoff is split.** `docs/KITCHEN.md` holds the pattern (one
  dinner, three finishes; the daddy/daughter add-on), the weekly rhythm, the
  recipe format contract and the design. Laurie's food rules, and anything
  that names them, stay out of the repository.
- **Recipes are Jason's Obsidian files,** pasted or opened several at once,
  read exactly to the format, with gentle warnings where a file strays. The
  file is kept as written, so it can always be read again; a new reading
  with the same title replaces the old.
- **"Laurie's plate" is kept apart** (`recipe_private`), readable by Jason
  and Laurie only: it says what was kept off her plate, which is her health
  information. Anna sees Jason's plate and her add-on.
- **Built for a tired cook:** start-by time from when we want to eat, timers
  on every timed step that survive the phone closing the app, cook mode with
  the screen kept awake, the cook check, and an "Easy on the hands" filter
  for days his hands hurt.
- **Each of us rates only our own row,** enforced by the database
  (`my_member_id()`), and the scores show as L, J and A, as in the files.
- **The kitchen migration is named a minute after the foundations** (which
  were named ahead of time, for 23:00 UTC), so the two run in order.

---

## 2026-10-31 — The swirling light, in colours that mean something

Jason asked for occasional, wild, swirling light like a phone assistant's
glow, with colours that mean something. It wraps the edge of the screen for
about seven seconds, then fades:

- **Whose colours:** the family's own days get the rainbow; a concert gets a
  liquid light show (the jam bands' own tradition); Christmas and its eve
  red and green with white fluttering down; Easter gold and white; Pentecost
  fire with sparks rising; the Sacred Heart (the parish's feast) red and
  gold; Our Lady of Guadalupe her turquoise, gold and roses; Advent Sundays
  violet, Gaudete rose; the other great feasts their liturgical colour; and
  New Year, Halloween, the Fourth, Thanksgiving, Lunar New Year, Hanukkah,
  Valentine's, St Patrick's, Jerry's birthday, Cornell '77, the solstices and
  a total eclipse of the moon their own. Palm Sunday, the Triduum and days
  we remember stay quiet.
- **Occasional:** once a day per occasion, by itself; again whenever the
  occasion's chip (under Home's greeting, and at the top of the day) is
  tapped.
- **Built without blur** (masks for soft edges, transforms for motion), as
  blur repaints slowly on iPhones. Normal blending, not additive: added
  light washed the colours to white on the cream page.
- **Every animation name is unique across the stylesheets,** checked by a
  test: the light's "rise" sparks briefly replaced the app's own "rise"
  entrance, and every card on every screen faded to nothing.

---

## 2026-10-31 — The forecast at home, before the stations

- **Open-Meteo for the forecast, the National Weather Service for alerts,**
  both free with no key, fetched by the browser itself and kept for a
  quarter of an hour. Only the town's coordinates are sent, never the
  address. The schools' own readings wait for Synoptic's token; until then
  Home shows home's weather, and says the schools are coming.
- **The Santa Anas get a line of their own** when the wind is from the north
  or east, gusting 25 mph or more, with humidity at 30% or under.
- **Alerts are read as data:** only their event name, headline, severity,
  end time and instruction are shown, capped in length, most serious first.

---

## 2026-10-31 — Music is Jams; Team Hicks on the home screen

- **The Music tab is called Jams** (address `/jams`): more us, and jam bands
  come first there anyway.
- **Added to a phone's home screen, the app is "Team Hicks"** with the
  sprout on the evening sky as its icon (`public/manifest.webmanifest`,
  `public/icons/`). It opens full screen, like an app. This needs the app
  hosted on https first (still to decide: Firebase or Netlify).

---

## 2026-10-31 — Calendar feeds are read by a Supabase Edge Function

- **Feeds first.** Most school systems, Google Calendar and Outlook publish
  an iCal address, and it needs no sign-in, so `read-sources` reads those
  nightly and on a parent's "Read now". Documents and pictures (read into
  dates someone approves) come after.
- **Supabase, not GitHub Actions:** it sits beside the data, costs nothing
  at this size, and keeps the service key where it already is. The nightly
  run is `pg_cron` calling the function with its own key from the Vault;
  the key is never in the repository or the schedule's text.
- **A re-read never loses history:** events are matched by their feed id;
  an upcoming event that leaves the feed is hidden with a dated note (and
  comes back if the feed brings it back); past events are left alone; what
  a person hid stays hidden. Every reading is a `source_versions` row.
- **Caps:** 20 feeds a run, 15 seconds and 3 MB a feed, 3,000 events a
  feed, and "Read now" refuses a second read within two minutes. Only web
  addresses are fetched, never this machine or a private network.
- **Which events are days off** is guessed from their words ("break",
  "holiday", "no school"); staff and teacher work days count as school days.
  The guess decides the year view's stripes; a way to correct it comes with
  event editing.

---

## 2026-10-31 — Family days in Setup; each source says whose it is

- **Family days can be kept in the app** (Setup → Family days), not only in
  the SQL editor. Parents add, change and remove them; removing asks first,
  in the app's own dialog. A day with a year counts it ("Turning 12",
  "25th anniversary: silver"); a remembered day shows its own line and the
  Eternal Rest prayer.
- **Home celebrates from two days before** with the rainbow banner, and on
  a day we remember shows a quiet violet one.
- **Each calendar source says whose it is,** which is how the year view
  knows a school calendar's school (Laurie's is Kordyak, Anna's Wayne Ruble,
  Jason's SOAR), and how "whose days" filters a school's days off.
- **Half-typed forms are kept on the device** until saved or cancelled, and
  every draft is cleared on sign-out.

---

## 2026-10-31 — The calendar works out its own days

- **The Church year is computed here, not by romcal.** Running an outside
  package's code wasn't allowed in the overnight session, and the rules fit
  in one file anyway: `src/lib/cal/liturgy.js` ranks each day's candidates
  by the Church's Table of Liturgical Days, moves solemnities that meet a
  higher day (St Joseph in Holy Week to the Saturday before Palm Sunday,
  the Annunciation after the Easter octave, the Immaculate Conception off an
  Advent Sunday without its obligation), and keeps optional memorials beside
  the weekday rather than in its place. Tests pin known years
  (`tests/liturgy.test.mjs`). The U.S. saints' list is written out in
  `SANCTORAL`; a new optional memorial is one line there.
- **Holidays and heritage days are rules, not a list of dates.** Each is
  worked out per year (the third Monday of January, the Monday after the
  first Sunday of May), with a line about why it matters. Jewish holy days
  come from the Hebrew calendar's own arithmetic, so they are exact for any
  year. Ramadan and the Eids use the arithmetic Islamic calendar and are
  shown as *expected*, since the new moon's sighting decides. Lunar New Year
  is the one table (to 2035). Diwali is left out until a date source is
  checked.
- **Each kind can be switched off in Settings,** on the device: holidays,
  civil rights, heritage months, our neighbours' holy days, seasons and sky,
  birding, small joys. The Church's days are always there.
- **Solstices, equinoxes and the moon follow Meeus** (to a minute or two).
  SunCalc's moon was hours off, enough to put the January and March 2026
  full moons on the wrong day at home. Full moons carry their names; the one
  nearest the September equinox is the Harvest Moon, the next the Hunter's.
- **Moving through the calendar replaces the address; opening a day adds a
  step.** Switching view or stepping a month leaves Back to leave the
  calendar, as with filters; a day tapped from a month comes back to that
  month. Whose days to show (Everyone, or one of us) stays on the device.
- **The school calendars line up by person:** a calendar source marked as
  Laurie's is Kordyak, Anna's is Wayne Ruble, Jason's is SOAR; their
  no-school days are stripes in the year view.
- **Sacred Heart's Mass times are shown as unverified** until checked with
  the parish; on a holy day the app says the parish posts its own times
  rather than guessing, and on the eve it suggests the vigil.
- **The main stylesheet loads first,** so a place's own stylesheet wins a
  tie with it (the Today button lost its paper to `.btn.ghost` otherwise).

---

## 2026-10-31 — Upright headings: Caprasimo, not Shrikhand

Jason didn't want italic headings. Shrikhand is a slanted face, so the
greeting, place names and screen titles now use Caprasimo, the upright,
curvy Cooper-style face already used for big numbers. Shrikhand is dropped.
Nunito stays for everything read or tapped.

---

## 2026-10-31 — Settings, Setup and Reports; SOAR's rules for one developer

- **Settings, Setup and Reports work the way SOAR's do:** each place
  declares its setup sections and reports in `src/registry.js`, and they
  appear by themselves. Setup holds the calendar sources (paste, edit, mark
  checked, see what's going stale); Reports starts with the sources report;
  Settings has sign-in, text size and motion. Reached from a button on Home
  and the desktop rail.
- **Sign-in starts with an emailed link** (Supabase's own, nothing to set
  up), checked against the family's addresses in the database. Google
  sign-in comes with the Calendar sync, which needs it anyway.
- **SOAR's working rules that fit one developer** are in `CLAUDE.md`:
  addresses and Back, touch, the layout checks, the database rules (never
  `using (true)`, explicit grants, `where` on every update and delete, the
  1000-row cap, the date trap), sign-in back-off and private diagnostics for
  jobs, docs shipping with the change, and a review pass before merging
  anything touching data or secrets. The multi-developer parts (issue
  claims, review tiers, reviewers) are left behind. Migrations get SOAR's
  guard tests (`tests/migrations.test.mjs`). Small finished steps go to
  `main` until the app is in use; then branches and pull requests.

## 2026-10-31 — Anna's grades and her school's news

Anna's grades come in from QParent (Fontana Unified's parent portal), and
her school's announcements and events from ParentSquare, so the app can
flag, warn and celebrate: a missing assignment, a slipping grade, an A worth
a cheer. Official routes first (calendar feeds, email notifications,
exports); browser automation with a parent's own sign-in only where there's
no other way, under the same rules as every signed-in job (24-hour back-off,
no personal data in diagnostics). Only Jason, Laurie and Anna see her grades.
To check: each portal's terms on automated access.

## 2026-10-31 — The neighbourhood scout

A second daily agent, beside the jam scout, notices restaurants and
businesses opening and closing around home, in Redlands and in Claremont:
the news that rarely gets an announcement. It reads local news, city
planning and permit agendas, California ABC liquor licence applications
(new restaurants usually file one) and public posts, never sites whose terms
forbid it, and shows each find in World's "Around town" with its sources.
Same caps and rules as the jam scout.

## 2026-10-31 — A jam scout instead of a paid events API

No JamBase subscription. Instead, a scheduled AI agent (Claude with web
search) scans each morning for jam-band shows and coverage in the Inland
Empire and Los Angeles, and for things around the world worth knowing
about: festivals, livestreams, YouTube premieres, archive releases. It
follows Anna's and Laurie's music the same way: each person keeps their own
list of artists and kinds of music in Music (Anna's bands, Laurie's Christian
artists), updated whenever they like, and each find is tagged to whose
interest it matches. It saves
each find with its source links for Jason to confirm before a show goes on
the calendar, and never invents one. It has a daily cap on searches and a
monthly spending limit, sends only search words (never family data), and
treats every page it reads as data, never instructions. Free feeds sit
beside it: YouTube channels' own release feeds, new Live Music Archive
uploads, and bands' published tour calendars.

## 2026-10-31 — Calendar sources live in a Setup console, and they roll over

- **The school calendars:** Kordyak is Rialto Unified (Laurie's teacher
  calendar), Wayne Ruble is Fontana Unified (Anna's student calendar), and
  SOAR has its own (Jason's). Three different calendars, side by side in the
  year view.
- **A Setup console holds every source.** Paste a link or upload a file:
  PDF, Word, Google Doc or Sheet, a Drive folder, a Google Calendar, an iCal /
  webcal link, a web page, a photo of a printed calendar, or a forwarded
  email. Each is saved, can be updated and rechecked, and shows when it was
  last read. Feeds sync on their own; documents and pictures are read into
  dates that a person approves before they reach the calendar. A new version
  never silently deletes the old one's events.
- **Rollover nags:** each source knows the dates it covers. Weeks before it
  runs out, Setup and Home ask for the next one (the job-waiting shine),
  with a link to where it came from last time, and our phones get a reminder.
- **Laurie's lector schedule** comes by email to her Yahoo account each
  month. A scheduled job reads it with a Yahoo app password she creates and
  can revoke (her yes), looks only for the schedule's sender, keeps only her
  dates, and treats the mail as data, never instructions. Unverified: Yahoo
  app passwords for this, the sender and the format, and whether a forwarding
  rule could replace the login.
- **Anna's altar serving** is arranged in a GroupMe. Once she starts, a job
  reads it with a family member's own access, only the schedule posts, and
  keeps only Anna's dates: other children's names are never stored.
- **Supabase:** the family's own project ("Hicks Family" organisation, free
  plan), in West US (North California), with new tables not exposed
  automatically and row-level security switched on for every new table. The
  database password lives in a password manager; every secret is listed in
  `docs/SECRETS.md`.

## 2026-10-31 — The app gets its own repository, and a Music tab

- **`jwhicks727/hicks-app`, private.** React and Vite in plain JavaScript,
  like SOAR, so the habits carry over; the family's own Supabase project and
  Firebase hosting come in phase one. Built fresh: SOAR's code belongs to the
  school, so its lessons come across through the principles, not its files.
  The calendar too is written new, following SOAR's patterns.
- **Six places: Home, World, Calendar, Kitchen, Life List, Music.** Music
  celebrates our music, jam bands first: jam-scene shows near us, free live
  recordings from the Internet Archive's Live Music Archive in a built-in
  player, chill music from free sources, and each person's favourites
  (Jason's jam bands, Anna's bands, Laurie's Christian artists). Commercial
  recordings link out rather than play.
- **Life List covers more than birds,** and opens on **Recent**: new birds,
  outings, paintings and trips. Camping trips and Disneyland trips are
  celebrated; the national parks we want to see are checked off as we go.
- **The Calendar is a full calendar:** day, week, month and year views,
  synced with our Google calendars, the year view laying the three school
  calendars (Kordyak, Wayne Ruble, SOAR) side by side.
- **Days with personality.** Feasts and saints get line art and a warm
  invitation to pray the day's prayer; holidays, civil rights and heritage
  days (Martin Luther King Jr. Day, César Chávez Day, Juneteenth, Black
  History Month, Women's History Month, Hispanic Heritage Month, Native
  American Heritage Month, Lunar New Year, Diwali, Hanukkah and more),
  seasons and nature get the same care. Art from free sources whose licences
  allow it, each recorded.
- **The app is called Team Hicks,** as the family calls itself: the name,
  the header and the wall's greeting.
- **Two personal icons:** Home is a sprout (things growing at home), and
  the Calendar icon carries a small cross, since the Church year lives in it.
- **Laurie's hawk is a Cooper's Hawk** (Jason confirmed).
- The meal-planning handoff isn't in the repository yet: it holds Laurie's
  health information, so it is split first (rules, format and data model in
  the repo; her food rules in the database).

---

## 2026-10-31 — Five places: Home, World, Calendar, Kitchen, Life List

Replaces the Journal, Chapel and Shows tabs.

- **No Journal or Chapel area.** Laurie's art, the Catholic year and birding
  run through the whole app instead: the leaves and the gallery on Home, a
  painting heading each month of the Calendar, the Church year inside the
  Calendar, and birds near the top of Home. Her gallery is reached from its
  card on Home.
- **Life List** is Laurie's birding place. It holds her life list, what she
  saw on which day (a year of outings as a tap-able grid), how often each
  bird turns up (most seen, and by month), where she's seen it, and every
  sighting, each one tap from the next. New-to-the-list birds are marked on
  their day.
- **Shows are calendar items:** special ones, with their ticket, light show
  and scrapbook, opened from the calendar. A Music tab may come later.
- **The Calendar** weaves in the Church year (seasons, feasts, saints,
  traditional prayers, the family's own reflections, links to the day's
  readings at USCCB), Mass and confession times at **Sacred Heart, Rancho
  Cucamonga** (as the Diocese of San Bernardino lists them; confirm holy
  days with the parish), **Laurie's lectoring** and **Anna's altar-serving
  and middle school ministry** schedules (from the parish's scheduling
  system; which system, and whether it offers a calendar feed, is still to
  find out), family days, holidays big and small, seasons and nature (clock
  changes, full moons, meteor showers, solstices). A filter shows one
  person's days.

## 2026-10-31 — Family days are celebrated big

Anna's adoption day (November 1, 2015), the anniversary of Jason's dad's
passing (October 11, which Jason's mom calls his angelversary), Jason and
Laurie's dating anniversary (January 3, 1999) and wedding anniversary
(July 27, 2002), and the three birthdays (Jason June 30, 1980; Laurie
August 30, 1979; Anna July 15, 2015). In the two days before a happy one,
Home opens with a celebration banner: a rainbow rim and confetti that stop
under Reduce Motion. The Calendar keeps a Family days card with countdowns
and milestones (the 25th, silver, comes in July 2027). The angelversary is
marked gently, with a candle, never confetti, and All Souls remembers
Jason's dad by name in its prayer line. These dates are the family's own:
they stay inside the app and its private pages.

## 2026-10-31 — The Kitchen plans a week of recipes, not a night-by-night menu

Jason shops once for the week's recipes and decides night by night. Home
shows **what's left in the fridge**, with the recipe whose fresh
ingredients are nearest their end at the top. Tapping a recipe opens a
**cook check**: the app works out which ingredients go bad fastest (from
typical fridge times for each kind of food, counted from the day of the
shop), asks Jason to check those first ("Still good" or "Gone off", with
what to look for), says when the dish is good to cook, and offers the
recipe's swaps when something has turned. Pantry items aren't asked
about. In the full app, a check left halfway keeps its answers on the
device (the mockup forgets them on reload).

## 2026-10-31 — Schools at first glance, birds near the top

- Home's weather card shows the three schools right under home's weather:
  each one's temperature, sky, and how much warmer or cooler it is than
  home, labelled with who is there. Each opens **a page for that school**:
  right now (temperature, humidity, wind, gusts, rain), the last 24 hours
  against home's, how it differs from home over the week, the next three
  school days judged for recess (heat from 95°, gusts from 35 mph, rain
  from a 40% chance, over 9 AM to 2 PM), its alerts, and the station
  itself with a link to it on Synoptic.
- **"Birds around us" moves to Home, straight after the weather.**
- **Bird pictures:** Laurie's own photo first, otherwise an eBird photo from
  the Macaulay Library, embedded with its credit (the Library allows
  embedding for non-commercial use). Her painting of a bird replaces both;
  her hawk painting is the first. The planning sandbox can't reach eBird,
  so the mockup shows marked frames where photos go.

## 2026-10-31 — Each place's skyline, lit at night; the shadow seen from the side

- Every place card has its own drawn skyline: Big Bear's snowy peaks, lake
  and pines; the Eiffel Tower over Paris rooftops; Kona's volcano, surf and
  palms; New York's skyline; the Capitol and the Washington Monument; the
  Temple of Heaven in Beijing; San Diego's sailboats; the Queen Mary and the
  port cranes in Long Beach; San Dimas's foothills and oaks. Drawn wide, so
  a wider card shows more of the view rather than stretching it. After dark,
  windows light up and the Eiffel Tower sparkles.
- The shadow is drawn from the side: the sun at its real height, a person,
  and the shadow at its real length, with the line of light between them.
  After dark the moon takes the sun's place if it's up. (The first version,
  seen from above, read as an odd symbol.)
- Sunrise, golden hour, sunset and last light each wear their own sky
  colours.

## 2026-10-31 — Our stations, chosen

Jason picked them on Synoptic's free station map (the Synoptic Data Viewer;
synopticwx.com is Synoptic's forecast map and doesn't show stations). The
nearest turned out to be Southern California Edison's fire-weather stations
and one at a school, closer than any citizen (CWOP) station:

- **Kordyak:** SCE Sierra Ave, **SE685**.
- **Wayne Ruble:** SCE S Highland Ave, **980SE**.
- **SOAR:** the station at Marshall Elementary School, **NGC08**. SOAR's own
  app uses San Bernardino International Airport (KSBD), which stays as the
  fallback.
- **Home:** its nearest station, set inside the app, never written here
  (the same rule as the address).

On the evening they were chosen (Fri Oct 30, 8:10 PM) they read 57.0°,
59.4° and 59.7°, with 24-hour ranges of 55–63°, 57–64° and 59–67°:
microclimates you can see. Still to check: which readings each station
sends (rain especially, since fire-weather stations may not carry a rain
gauge), and whether Synoptic's free tier lets an app show these networks.
The next nearest station stands in when one goes quiet; Ontario and San
Bernardino airports are the last resort.

## 2026-10-31 — Each place in its own sky, clouds and all, with the sun's arc

The place cards' skies were one of seven fixed palettes, so most read as
plain "day" or "night". Now:

- **The colour follows the sun's real height there,** blended smoothly:
  pale noons, peach and orange low suns, pink dawns, rose-and-ember dusks,
  indigo nights. Mornings run cooler and pinker than evenings.
- **Weather shows in the sky.** An overcast or rainy place is greyed and
  carries drawn clouds; a partly cloudy one has a few. Clouds drift slowly,
  turn orange and pink when the sun is low, and go dark at night. They're
  soft shapes, not a blur filter, which iPhones repaint slowly.
- **The sun's arc:** a path from sunrise to sunset, as high as the sun gets
  there today (Kona's tall, Paris's low in November), with the part already
  travelled drawn solid and the sun where it is now. After dark, the sun
  sits on a dotted path under the ground, showing how far along the night
  is.

## 2026-10-31 — Every place one tap away, and the sky today

- **The Meanwhile card opens "All our places"** (its own address,
  `#places/<place>`), for a day someone gets curious. The chosen place sits
  on top in full; underneath, every place is a postcard in its own sky right
  now, nearest first, with its local time, weather picture and temperature.
  Choosing a postcard swaps the place without adding a step to history, so
  Back from the page always lands on World. World still shows only one
  place a day.
- **"Sun and moon" becomes "The sky today",** all worked out on the device
  from the date and home's position, with no outside service:
  - today's daylight, and how much more or less than yesterday;
  - a shadow dial: the sun's direction and how long your shadow is right
    now ("about 1.4 times your height, pointing northeast"), and when it's
    shortest; after dark, when shadows come back, and whether the moon is
    up and bright enough to cast its own;
  - the moon drawn as it looks tonight, with % lit, moonrise and moonset,
    and the next full moon with its traditional name ("the Beaver Moon").

## 2026-10-31 — Recipe pictures are coloured in

Replaces the round of colour behind each drawing (first offset, then
centred, both earlier today). Each ingredient's colour now fills the
drawing's own outline exactly, with the ink line on top, so the salmon is a
coral fish and the squash an amber squash. The colour shape is made from
the same drawing: every closed outline filled on its own, so the inside of
each line is filled and nothing outside it. The credit reads "coloured in".
The centred rounds stay on the short list as the alternative (one setting in
the art script switches between them).

## 2026-10-31 — No new home hardware at the outset

Nothing gets bought for the house to start the project. This reverses the
station purchase in "Our world around us" (2026-10-30) and puts the wall
screen off until later.

- **Weather comes from the neighbourhood, not our own station.** Home's
  measured weather comes from the nearest public citizen weather station
  (the Citizen Weather Observer Program, which NOAA's MADIS publishes with
  no restrictions), with the next nearest standing in when one goes quiet,
  and the nearest official station (Ontario airport, through
  api.weather.gov) as the last resort. Read through Synoptic's free
  non-commercial tier (a free token) or from findU. No Weather Underground
  key is needed. Still to check: how many stations report near home, how
  reliably, and Synoptic's current limits. Air quality would come from the
  EPA's AirNow monitors (a free key; to check). A station of our own stays
  a "maybe later".
- **Photos: Amazon stays exactly as it is, and the app reads a second copy
  we pay for.** The phones keep backing up to Amazon Photos, which keeps
  making the TV's smart albums. Each phone also backs up to Backblaze B2
  (about $6.95 a terabyte a month in October 2026; check before signing
  up) with an uploader app such as PhotoSync, whose paid tier sends new
  photos in the background. The existing library is downloaded from Amazon
  once, by hand. **The app never signs in to Amazon:** a nightly robot
  holding the family's Amazon login risks the whole account (shopping,
  cards, Prime) for photos we can get from the phones directly. No photo
  server at home.
- **The wall screen waits.** The Hearth starts on the phones, laptops and
  any tablet already in the house; a touch monitor comes once it earns its
  place.
- **Recipe pictures:** each ingredient's round of colour now sits centred
  behind its drawing, not offset.

## 2026-10-31 — Recipe pictures from the Food Icon Pack

Each recipe gets a simple, descriptive picture built from its main
ingredients, using the free **Food Icon Pack** that SOAR's Meals card uses
(draft PR #478 there): https://github.com/michaelbollin/food-icons, release
v1.0.0, by Michael Bollin, **CC BY 4.0**. It has 451 ingredients, 74
dishes, 121 utensils and 97 drinks, all in one consistent outline style.

- **How a picture is made:** two or three of the recipe's ingredients (or a
  pot for a stew), the pack's own line drawing in espresso ink, each over a
  soft dot of that ingredient's colour (coral salmon, amber squash, oat
  rice), on a warm peach-to-cream tile. A recipe card shows three in a row;
  a list row shows the main one with the second on a small badge.
- **Built, not hand-edited:** a small script takes only each icon's path
  data, checks it's plain drawing commands, rounds the numbers and fits
  each drawing to its own square, so a long fish and a tall squash sit at
  the same size.
- **Credit, as the licence asks:** the Kitchen shows "Pictures: line
  drawings from the free Food Icon Pack (CC BY 4.0), with a dot of colour
  added behind each", linked, and the app's credits list it. No AI-made art.
- In the full app, the ingredients for a picture come from the recipe's own
  ingredient list (the recipe format in the meal-planning spec), with Jason
  able to swap one.

## 2026-10-31 — A greeting by name, a quieter sunset, and "Meanwhile…"

- **The greeting says your name:** "Good evening, Jason", for whoever is
  signed in. The shared wall display greets the Hicks family. Evening runs
  from 5 PM to midnight, so the app never says "Good night" as if it were
  leaving.
- **The sunset is no longer a headline.** It sits in a small weather line
  under the date, with a little moving weather picture: "62° and raining ·
  sunset 5:58 PM", or the next sunrise after dark. The leaves' Pause is now
  a small icon button (it still says what it does to screen readers), so
  that line fits on a phone.
- **The other place is brought into the conversation, not announced.** No
  "Today's place" label. The card opens casually, "Meanwhile, up the
  mountain…", "Meanwhile, just down the 210…", "Meanwhile, back East…", and
  Home's weather card mentions it in passing: "Meanwhile in Big Bear Lake
  34°". Still one place a day, in turn.

## 2026-10-31 — Caprasimo, not Fraunces; outlined tiles; a floating tab bar

- **Caprasimo replaces Fraunces** for headings and big numbers. SOAR already
  uses Fraunces, and this app shares none of SOAR's look. Caprasimo is a free
  face drawn after Cooper Black: classic, curvy and very 1970s, and it pairs
  with Shrikhand. The weather sentence moves to Nunito, with the comparison
  word in its heaviest weight. Fonts SOAR uses (Fraunces, Instrument Sans,
  Russo One, Atkinson Hyperlegible) stay out of this app.
- **The label tiles are outlined, not filled.** Each card's tile has a thin
  outline in its place's colour (a gradient where the place has one) with
  the picture in that colour, on a light face. The filled tiles read as dark
  blocks.
- **The phone's tab bar floats.** It's a rounded rectangle (14px corners)
  sitting above the bottom edge and the home indicator, not a full-width bar.
  The open place gets a tile in its colour. On a computer it stays a side
  rail.

## 2026-10-31 — Warmer, cozier, friendlier

Jason found the first mockup boring: clean, but cool and plain, closer to a
tool than a home. The warm pass, with no handwriting anywhere:

- **Nunito**, a round and friendly sans, for everything read or tapped,
  replacing Instrument Sans. Small labels are no longer typewriter capitals;
  DM Mono is kept only for the old-school show tickets.
- **Warm materials:** cream paper cards with a faint grain, espresso ink and
  warm brown greys, warm-tinted shadows, and each card blushing at the top
  with its own place's colour.
- **A warmer sky:** peach horizons by day, a plum night with embers at the
  bottom, and a lamplight glow rising from the foot of every screen.
- **Friendly colour icons:** every card's label has a small glossy tile in
  its place's colour, with a white picture of what it is (a pot, a bird, a
  candle, a cross).
- **Things you can feel:** buttons with a solid edge that presses down, a
  tab that pops when it's chosen, and cards that rise in gently whenever a
  screen opens (a soft fade instead, for anyone with Reduce Motion on).

Corners stay nearly square, and controls stay bold and dependable.

## 2026-10-31 — Lettering: classic, curvy and a little psychedelic, not handwriting

Replaces "Handwritten, and still professional" in the look brief below. Jason
didn't like the handwriting face (Shantell Sans), so it's gone. Now:

- **Shrikhand** for the loud moments: the greeting, place names, the brand
  and show tickets. A heavy 1970s swash display face.
- **Fraunces, at full softness and with its "wonky" letters on,** for
  headings, big numbers and the weather sentence. A classic serif with
  rounded, Cooper-like curves.
- **Instrument Sans** stays for anything tapped or counted, and **DM Mono**
  for small labels, so controls stay bold and dependable.

All four are free on Google Fonts. Settled for now; open to another try if
it still isn't psychedelic enough.

## 2026-10-31 — One place a day, and weather you can wind back

Replaces the list of places in the entry below; the places themselves stay.

- **One place a day, not a list.** A list of nine places gets skimmed and
  then ignored, so World features one place each day in turn: its own sky
  right now, its local time, how far ahead or behind home it is, its sunrise
  or sunset, its weather in a sentence, and the land it's known for drawn
  along the bottom (mountains, sea, city, hills). Tomorrow's place is named
  underneath. Home and the three schools aren't in the turn: home has the
  top of the screen and the schools have their alerts.
- **Gorgeous weather everywhere, after SOAR.** Hand-drawn weather art that
  moves gently (sun rays turn, clouds drift, rain and snow fall, stars
  twinkle), still under Reduce Motion, and only while it's on screen. Home's
  weather is said in SOAR's sentence: "It is raining and mild, nearly the
  same as yesterday", with only the comparison word coloured, orange for
  warmer and blue for cooler.
- **Weather Underground's two strips, day by day and hour by hour, that wind
  back as well as forward.** Each opens on now. Swiping back shows what
  actually happened, measured by our own station; ahead is the forecast,
  drawn dashed. Measured rain is shown as an amount; forecast rain as a
  chance plus an amount. A missing hour says "No reading" rather than being
  filled in. Behind the hours is the sky at every hour, worked out from the
  sun's height and greyed by the clouds. Day by day goes a week each way,
  hour by hour three days each way, and the station keeps every hour, so
  going further back is possible later.

Shown with example numbers in the mockup.

## 2026-10-30 — Our world around us, front and centre: weather in depth

Weather and the rest of "our world around us" (sky, sun and moon, air,
birds nearby) sit front and centre: a World card near the top of Home and a
World place of its own.

- **Places that matter to the family, not random ones:** home (Fontana);
  the three schools, Nancy R. Kordyak Elementary (Laurie's, Fontana), Wayne
  Ruble Middle School (Anna's, Fontana) and SOAR (Jason's, San Bernardino);
  San Dimas, Long Beach, San Diego and Big Bear; and around the world, Kona,
  Washington DC, New York, Paris and Beijing, each with its local time and
  its sky right now.
- **The home address is never written into documents or pages.** Home is
  set inside the app and kept in the family's own database; maps show it at
  town level.
- **Weather alerts for home and all three schools**, from the National
  Weather Service, pushed to every phone, since everyone spends the day at
  a school.
- **Birds around us:** the common birds are celebrated for showing up, and
  an uncommon bird actively being seen nearby (eBird's notable sightings)
  gets the Field Journal's green shine, with how far away and how recently.
- **We're buying a backyard station** as part of the plan. Recommended: an
  Ecowitt Wittboy (about $200 in 2026 reviews) with Ecowitt's outdoor PM2.5
  and lightning sensors, so smoke and storms are measured at home too.
  Simpler alternative: a WeatherFlow Tempest (about $349). Prices to check
  before buying.
- **Microclimate from a chosen station.** Each place's weather can come from
  a particular station picked on a map, as Weather Underground's map used to
  allow. Weather Underground now issues API keys only to people who run a
  station, so the options are a backyard station of our own (which also gets
  us a key) or public CWOP stations (citizen stations shared through NOAA's
  MADIS). Not yet checked against current terms.
- **Forecasts and comparisons** from Open-Meteo (no key, free for
  non-commercial use, credited under CC BY 4.0); **alerts and official
  stations** from the National Weather Service; **air** from a nearby
  sensor (PurpleAir now bills for API use except on your own sensors).
- In smoke season the air card rises to the top and takes its warning colour.

## 2026-10-30 — Anna's colours: Wildcat black and green

Anna attends Wayne Ruble Middle School in Fontana: the Wildcats (a tiger, a
cheetah and a panther), black and green, per Jason. The school's own site
couldn't be opened from the planning session, so the exact green and the
mascot art are still to be confirmed. Her house is Isibindi, so black
leads. That's the draft colour for Anna's corner; the exact green is a
guess until we see the school's own. Her academy's name, crest and rooms
remain hers to choose.

## 2026-10-30 — Ombré everywhere, the sky celebrated, and sunsets every day

Ombré is part of the app's language in general, as on Eastern Parkway's
site, and above all it celebrates the sky:

- **The sky of the hour sits behind everything.** It follows the real time of
  day through night, dawn, morning, day, golden hour, sunset and dusk,
  worked out on the device from home's location with no outside service.
  The colours come from the vision board's pins.
- **Ombré beyond the sky:** each place's colour as a fade, show tickets and
  stickers in their own fades, and progress that fills like a lightening sky.
  Never under words you need: anything read or tapped sits on a solid face.
- **Sunsets are celebrated every day.** The app knows tonight's sunset time
  and shows it; golden hour warms the screens; at sunset the sky peaks and
  the wall says so quietly. The family's own sunset photos go into a sunset
  log and their colours are sampled into the app's sunset sky.

Live sketch on the vision board (times for San Bernardino as an example).

## 2026-10-30 — Concerts are celebrated like no other calendar event

Jason's concerts come up on the calendar and get a celebration of their own:

- **A custom old-school ticket for each show**, in the band's colours (from
  the poster or Jason's photos, so no two match), with a rainbow foil strip.
  The stub tears off once the show has happened.
- **Trippy animation:** on show day the Hearth becomes a slow liquid light
  show in the ticket's colours, always with a visible Pause and still under
  Reduce Motion. On the calendar, the show's row wears the rainbow gleam and
  a countdown builds.
- **A scrapbook per show:** photos and art from the actual show, the poster,
  Jason's notes in his words, who went. The setlist comes from setlist.fm (API
  free for non-commercial use, with a followable link back; check its rules on
  caching), and a recording, when the band allows taping, from the Internet
  Archive's Live Music Archive.

An "Add your photos" shine (in the corner's own colour) waits after a show
until the scrapbook has something in it. Sketch on the vision board.

## 2026-10-30 — Colour means something, and the rainbow means wonder

Colour carries meaning, as SOAR's per-module colours do, even though this app
won't have modules in the same way. Each place has its own colour so you
always know where you are. The draft, on the vision board and not final:
each person's corner wears that person's colour (the Kitchen spatula red,
the Field Journal monstera green, the Academy whatever Anna chooses); the
Hearth's colour is the sky ombré itself; the Chapel's is the Church's colour
of the day; the family's shared things are mission purple; the Workshop is
brushed steel.

There is room for gleaming rainbow buttons and icons, used for effect. Two
kinds of gleam, so both keep their meaning:

- **A shine in the place's own colour means something is waiting on you.**
  SOAR's rule (`ui-btn-shine`): one at a time, the count on its face, gone
  once the job is done.
- **A rainbow gleam means something wonderful happened:** a life bird, a
  dinner with top marks from everyone, a goal Anna met, a family Moment.
  Rainbow icons are earned stickers. Rare, one at a time, never on everyday
  buttons, words always on a solid face, still under Reduce Motion.

This deliberately departs from SOAR, where the shine is never a rainbow.

## 2026-10-30 — The look starts from the family's own vision board

None of the researched references (artists, then sites and apps) has hit the
look yet. The direction now comes from photos Jason takes: Laurie's paintings
(rough shots are fine), menus he likes, record art and similar. The website of
the band Eastern Parkway (parkwayjams.com) stays as the touchstone for
"simple but full of vibe." Art the
app uses comes from Laurie, Anna, Jason, or free or cheap libraries of
human-made assets, with each item's licence and source recorded. The
inspiration board and the sites-and-apps page stay as reference, not as the
direction.

From the touchstone, Jason named the two things to carry over: **the
background is an ombré that fades through sky tones**, and **hand-drawn
leaves fall gently through the interface**. Both go in. The leaves are cut
from Laurie's paintings, never block a tap, have a visible Pause as well as
following Reduce Motion, and the sky's tones can follow the real time of day.

## 2026-10-30 — The look: friendly art, bold and dependable controls

Jason's brief, to be kept on every screen:

- **Friendly colour and art; bold, dependable function.** The art can play;
  the controls never do. Filled buttons, heavy labels, high contrast, about
  48-point targets.
- **Corners nearly square from the start**: about 4px on controls and 6px on
  cards. No pill shapes anywhere.
- **Nature and colour celebrated**, not used as decoration.
- **Handwritten, and still professional.** A handwriting voice for greetings
  and notes, a plain sturdy face for anything tapped or counted. Candidates:
  Shantell Sans (Informality and Bounce axes), Playpen Sans, or fonts made
  from the family's own handwriting. Not chosen yet.
- **Laurie's paintings are cut-out material.** Each season gets one moment cut
  from one of her paintings. In autumn, leaves snipped from her painting drift
  through and settle on the tree from that painting, which sits in the
  interface in some jaunty way. It plays once per season, never blocks a tap,
  and with Reduce Motion the leaves are simply already settled.
- **Art never sits behind words you need.** Text that matters gets a solid
  backing.

The first four looks (Cabin, Trailhead, Journal, Field Guide) were set aside:
none landed. The direction now starts from the inspiration board
(cut-paper artists, nature illustrators, album art, prints, games,
handwriting typefaces). Hiring an artist is on the table; Laurie's paintings
lead and an artist would build lettering and icons around them.

## 2026-10-30 — Mobile first, with the desktop built to match

Every screen is drawn for a phone first, then gets a full desktop layout
with the same features. This covers previews and documents too: nobody
scrolls sideways to read a sentence. (Principle 3.)

## 2026-10-30 — Jason's cooking joins: the Kitchen

Jason's meal planning, run in another chat since mid-2026, becomes the
Kitchen. `docs/MEAL-PLANNING-HANDOFF.md` is its spec as written on
2026-10-30: versioned food rules, one dinner with three finishes, the weekly
ten ideas, the recipe format contract, the substitution engine and the data
model. The Kitchen also celebrates his cooking: his cookbook with photos and
ratings, tonight's dinner on the wall, a hall of fame of favourites, and a
Moment when a dish earns top marks.

Laurie's food rules are health information. Only Jason and Laurie see them,
they never reach the wall, and the planning assistant (Claude) receives them
only with Laurie's yes, which the app says on screen. (Principle 17.)

## 2026-10-30 — Bird photos on species pages, paintings in the gallery

A species page shows Laurie's bird photos. Her paintings are featured in
their own gallery, and a species page links to her painting of that bird
when there is one.

## 2026-10-30 — Photos come from Amazon Photos by hand

Amazon Photos has no official API. The one library that reaches it uses
copied browser cookies against undocumented endpoints, so the app doesn't
use it. Favourites are downloaded and added in the Workshop; the app keeps
resized copies, never the library.

## 2026-10-30 — Logins are stored with their owner's yes

Laurie's eBird login can be lent to a nightly browser job: it's her own
account. Merlin is a phone app with no API, but every sighting she saves in
it appears among her eBird checklists, so the eBird job covers both. The job
keeps the password as a secret, backs off for a day after a rejected login,
and records no personal data in its diagnostics. Her full history comes in
once from eBird's "Download My Data" file. (Principle 16, reworded.)

## 2026-10-30 — A new project, apart from SOAR

The Hicks Family App is a new private repo with its own Supabase project,
sharing nothing with the school's. It takes SOAR's working principles and
stack, and none of SOAR's look.
