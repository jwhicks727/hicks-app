# The plan

Built in this order, each part in daily use before the next.

## 0. Foundations — started 2026-10-31

- [x] Five tabs, the same for everyone: Home, Calendar, Kitchen, World and
      Apps, a sheet of the journal, the academy, Life List, the Gallery, Jams
      and the Garden (2026-11-01).
- [x] Light and dark, chosen in Settings or following the device; a sun
      or moon on Home switches between them in one tap
      (2026-11-01).

- [x] The repository, the look (tokens, fonts, cards), the six places, the
      sky of the hour behind everything, the floating tab bar and desktop rail.
- [x] Addresses for every screen, and Back that walks real history.
- [x] The sky today: sun times, daylight against yesterday, your shadow, the
      moon as it looks, the next full moon.
- [ ] The family's own Supabase project (Jason creates it; settings in `.env`).
      West US (North California); new tables not exposed automatically;
      automatic row-level security on.
- [x] The season's show: once a day, something from one of Laurie's
      paintings moves across the screen (her painted leaves fall through
      fall and Halloween; the crow flies on Home). The sky keeps its own
      colours. Settings can try another season's show.
- [ ] A show for every season, as she paints them: Christmas, Advent,
      Lent, Easter, spring, summer, July 4th.
- [x] A plan stays until it's put away: Plan the week shows the newest list nobody has dismissed, with the recipes written from it (`week_plans.dismissed_at`, `week_plan_recipes`).
- [x] World as a weather app: Weather at home with endless hour and day strips (back three weeks, ahead sixteen days; rain, inches and wind on each), Our places beside it (schools, recess flags, alerts, events coming up somewhere), the day, sky and air pages, every skyline moving, Joshua Tree, SoCal freeways, the Wild card's drawings and pictures.
- [x] The place on World tells why: how it differs from home right now, its light and time, tomorrow there (`placeStory.js`).
- [x] World leads with one of our places each day (from an hour away
      outward, in turn): its sky, the hour by hour and the week there; home's
      weather follows and Our Places is last (`src/places/world/PlaceOfDay.jsx`).
- [x] Photographed recipes are checked against Laurie's rules and approved
      before saving; the chat opens and fixes recipes, shown against what's saved.
- [x] Plan the week, tended a little at a time: add one idea, refresh the
      ones not picked, or take one off with its ✕ and an Undo; starting
      over asks first, and what's under way shows at the top of the screen.
- [x] Plan the week: the ideas are numbered; one tap opens Messages with the list
      to Laurie (her number kept parents-only in the database), she answers
      "1, 3, 8", and typing that back picks those. The Kitchen's standing
      brief keeps fish to kinds an ordinary Southern California supermarket
      stocks, never trout.
- [x] Admin can remove a calendar (its dates go with it, after a question), and
      each calendar says when it was added, so a duplicate can be told from the
      original.
- [x] Settings can play Home's opening (the crow and the leaves) again, and
      shows which build a device is running.
- [x] Laurie's gallery (Life List) and the Paintings panel on Home; her
      witch and crow colours Halloween; its crow flies once a day from the
      top of Home, and the page glides down with it to the witch.
- [ ] Laurie's paintings photographed (how: `docs/ART-CAPTURE.md`), each
      with her yes; a painting she'd rather not have public waits for private
      storage behind sign-in, since anything in `public/` can be fetched by
      its address once hosted.
- [x] Everything behind sign-in: a sign-in screen (email and password, with
      an emailed link or code as the backup) is all there is until the
      address is on the family list. Passwords are set in Settings.
- [x] Settings (text size, motion), Admin (calendar
      sources: paste, edit, mark checked, staleness) and Reports (calendar
      sources), all following `src/registry.js`. Home shows the rollover
      shine when a source is due.
- [x] The first migration (`supabase/migrations/20261031230000_foundations.sql`):
      the family, sources and their versions, calendar events, family days,
      with row-level security and explicit grants; guard tests for every
      migration.
- [ ] Run the first migration and add the family (docs/DATABASE.md).
- [x] Reading calendar feeds (iCal, webcal, Google Calendar's iCal
      address): the `read-sources` Edge Function, nightly and on "Read now",
      keeping every reading and never deleting an event (to deploy:
      docs/DATABASE.md, "Reading calendar feeds").
- [x] Every event once across the calendars we share, with tidy, readable
      titles (display only; the feeds' words stay stored).
- [ ] Reading documents and pictures into dates someone approves.
- [ ] Sign-in for the three of us (built: the email link), and the
      greeting by name (built: Home greets whoever is signed in).
- [ ] Hosting (Firebase, as SOAR uses), and the app installable on our phones.

## 1. Calendar

- [x] Day, week, month and year views, each with its own address
      (`/calendar/month/2026-11`, `/calendar/day/2026-11-01`); swipe or the
      arrows to move, a tapped day opens it. The year view lays out the
      school calendars (or, switched, the Church year's colours).
- [x] The calendar's engine, worked out with no package and tested against
      known years: the Church's day for any date (U.S. calendar, Province of
      Los Angeles), with its colour, rank, transfers, holy days of
      obligation, fasting and the readings' cycles; a line about each feast
      and saint and a warm invitation to pray, with the traditional prayers;
      holidays, civil rights days, heritage months, our neighbours' holy days
      (Jewish exact, Islamic expected), birding days and small joys, each
      kind switchable in Settings; solstices, equinoxes, moon phases with
      their names, meteor showers and the clocks changing.
- [x] Sacred Heart's Mass times read from the parish's own website once a
      day (the `parish` function), every version kept, weekday Masses
      marked Daily Mass; the diocese's listing, marked unchecked, until the
      first reading. Admin shows the week it read and reads it again.
- [ ] Two-way sync with our Google calendars.
- [ ] The year view: the three school calendars side by side, clickable:
      Kordyak (Rialto Unified, Laurie's teacher calendar), Wayne Ruble
      (Fontana Unified, Anna's student calendar), SOAR (Jason's).
- [ ] **The Admin console's calendar sources.** Paste a link or upload a
      file and it's saved, read and rechecked later. Takes any common
      delivery: a PDF, a Word file, a Google Doc or Sheet, a Drive folder, a
      Google Calendar, an iCal / webcal link (Outlook, iCloud and most school
      systems publish one), a web page, a photo or scan of a printed
      calendar, or a forwarded email. Feeds (Google Calendar, iCal) sync on
      their own; documents and pictures are read into dates that someone
      approves before they reach the calendar. Each source keeps its history:
      a new version never silently deletes the old one's events.
- [ ] **Rollover nags.** Each source knows the dates it covers (a school
      year, a month of lector dates). A few weeks before it runs out, Admin
      and Home ask for next year's (the job-waiting shine), with a link to
      where it came from last time, and a reminder on our phones.
- [x] The Church year: feasts, saints, colours; traditional prayers with a
      warm invitation to pray them.
- [x] The readings for any day and any of its Masses, read in the app
      (`readings` function, to deploy; unverified against USCCB's live page
      until it runs), with USCCB's own page always a tap away. Worked out here
      rather than with romcal (decisions log).
- [x] Sacred Heart, Rancho Cucamonga: Mass and confession times, and a word
      on holy days and their eves (unverified until checked).
- [ ] **Laurie's lectoring**, read from the monthly schedule email in her
      Yahoo Mail: a scheduled job signs in with a Yahoo app password she
      creates and can revoke (her yes, said on screen), looks only for mail
      from the schedule's sender, keeps only her own dates, and treats the
      mail as data, never instructions. To check: the sender, the format, and
      whether a forwarding rule could replace the login.
- [ ] **Anna's altar serving**, from the altar servers' GroupMe, once she
      starts: read with a family member's own GroupMe access, only the
      schedule posts, keeping only Anna's dates. Other children's names are
      never stored. Her middle school ministry from wherever its schedule
      lives (to find out).
- [x] Family days celebrated big (a rainbow day in the month, confetti on
      the day), read from the database once signed in; holidays, civil
      rights and heritage days, seasons and nature, each with a line about it.
- [x] The sky's events highlighted, each with a picture, what it is, its
      times at home and links to read more (NASA Space Place, NASA,
      timeanddate, the American Meteor Society): full moons and their names,
      supermoons and the year's biggest, new moons, eclipses of the moon
      (and whether it's up here) and of the sun, meteor showers, solstices
      and equinoxes.
- [ ] Their own art: saint and feast line art, holiday and season pictures.
- [ ] Our crucifixes, photographed and illustrated (`scripts/lift-art.py
      illustrate`), on the days about the Cross: Ash Wednesday, Palm Sunday,
      Good Friday, the Holy Cross, the Sacred Heart (docs/CHURCH-ART.md).
      Waiting on the photos.
- [x] Admin keeps the family days (add, change, remove, with a proper
      question before removing) and says whose each calendar source is; a
      half-typed entry survives the phone closing the app. Reports shows the
      family days kept and the next ones.
- [x] The swirling light on occasions, in their own colours, round the
      occasion's own card (on Home and the day itself), with a small dot to
      play it again.
- [x] Home opens with the family day banner (two days ahead), Today in the
      Church with an invitation to pray, and the Masses still to come.
- [x] Adding and changing our own events in the app, with a place found on
      the map; an outdoor one (camping, a hike, the beach: the app suggests
      it) shows the weather there (the forecast within 16 days, else the
      same dates over the past five years), each night's moon and dark
      skies, meteor showers, and what iNaturalist's observers have seen
      nearby that month: birds first, with photos and their credits.
- [ ] Concerts as special events with their ticket and scrapbook.

Art to check before use: Christicons (Christian line icons), the Wellcome
Collection's public-domain saint engravings, Corpus Christi Watershed's free
Catholic line art, the St. Nicholas Center's CC0 images.

## 1b. Anna's academy (an app)

- [x] Her school, built room by room: name, motto, colours, mascot; any of
      21 kinds of room from the start; the campus and every room arranged
      with a tap and arrows, or a drag; detail galore (the real sky, time
      and moon in the rooms).
- [x] Tasks light stars; goals have steps and end in trophies; grades by
      hand, an A or a better grade cheered; cheers for anything; the Hall of
      Fame; a fresh cheer on Home.
- [x] Fluent Emoji (MIT) for the things in rooms; the family's own
      pictures with their licences.
- [ ] Anna's grades from QParent (Fontana Unified's parent portal), and her
      school's announcements and events from ParentSquare, with flags,
      warnings and celebrations in the app: a missing assignment, a grade
      slipping, an A worth a cheer. Official routes first (a calendar feed,
      email notifications, an export); browser automation (Playwright) with a
      parent's own sign-in where there's no other way. Only Jason, Laurie and
      Anna see her grades. To check: each portal's terms on automated access.
- [ ] Her clubs, teams, altar serving and Girl Scouts as rooms or
      banners, from the calendar.
- [ ] Rooms that grow: a second floor, a room unlocked by a goal.

## 1c. The journal (an app)

- [x] Each person's own, readable by them alone; never to Claude.
- [x] The day's question by weekday (two sets, or your own, or none),
      anything else, numbered gratitudes; the sit leads to it.
- [x] On this day; every page with a search; what you're grateful for most;
      notes to your future self; your outlets.
- [x] Bringing a journal in (the file Claude made, or a Google Doc as
      plain text) and taking it out.
- [ ] A gentle reminder on the phone once hosted, if wanted.

## 1d. The garden (an app)

- [x] Maps of the yard and of each room's plants: beds, boxes, pots, trees,
      the hummingbird feeder, the bird bath, paths. Arranged by dragging,
      or with a tap on a phone.
- [x] What grows where: the variety, when it was planted, how often to
      water.
- [x] Today's care, from what's been logged and the forecast. Watering
      comes sooner in a heat wave and is skipped with rain coming. Fresh
      nectar is due sooner the hotter it is. Wind, heat and frost bring
      warnings.
- [x] Photos for each spot, kept privately. Claude looks at one when
      asked.
- [x] What to plant this month.
- [x] What the garden gave lately reaches the Kitchen's planning.
- [x] Rooms indoors as a side view: each pot's kind of plant, size and pot.
- [ ] A photo timeline for each plant, side by side; a reminder pushed to a
      phone once the app is hosted.

## 2. World

- [x] The forecast at home (Open-Meteo: now, the next twelve hours, the
      week) and the National Weather Service's alerts, on Home and World,
      with a word when the Santa Anas blow. Only the town's coordinates are
      sent.
- [x] All our places on one map, at three sizes (around home, SoCal, the
      world), with a page for each: its skyline in its own sky, the time and
      weather there, how far, and Open in Maps / Directions in the phone's
      own maps app (`src/lib/places.js`, `src/places/world/`).
- [ ] Kordyak's building geocoded (4580 Mango Ave), so its pin is the school rather than the town.
- [x] Weather from our stations through Synoptic: Kordyak SE685, Wayne Ruble
      980SE, SOAR NGC08, home its nearest (set in Admin), each with an
      airport standing in when it goes quiet; "At the schools" on Home's
      weather, and each school's page has its station and the last day
      beside home's.
- [x] The map: each place's name beside its pin with its weather now (and
      its time abroad); the places below as tiles with what's happening
      there (weather, high and low, the next sunrise or sunset, wind, rain,
      how far or how far ahead); Around home draws the freeways.
- [ ] Day by day and hour by hour, wound back and forward; school pages
      (the school's place page grows its station and recess flags); one of
      our places on World each day; NWS alerts for home and the schools.
- [ ] **The neighbourhood scout:** a daily agent that notices new restaurants
      and businesses opening, and ones closing, around home, in Redlands and in
      Claremont: the kind of news that never gets an announcement. Read from
      local news, city planning and permit agendas, California ABC liquor
      licence applications (a new restaurant usually files one), and public
      posts, never sites whose terms forbid it. Shown in World as "Around
      town", each with its sources.

## 3. Life List

- [ ] Recent first: new birds, outings, paintings, trips.
- [ ] Laurie's eBird history, drill-downs by day, bird, month and place.
- [ ] Camping and Disneyland trips; the national parks checklist.
- [ ] Bird pictures: her photo, else a licensed photo with its credit (Birds
      around us uses iNaturalist's Creative Commons photos); her painting
      replaces both.
- [x] Birds around us on Home, right after the weather: this week's
      sightings round town from eBird, the notable ones first in green,
      each a tap from when and where it was last seen.

## 4. Kitchen

- [x] The meal-planning handoff split: the pattern, the weekly rhythm, the
      recipe format and the design are in `docs/KITCHEN.md`; Laurie's food
      rules stay out of the repository.
- [x] Recipes from Jason's Obsidian files (paste or open several), the
      recipe page (three plates, cook check, ingredient pictures, timed
      steps, start-by time, ratings), cook mode, timers, the fridge and its
      Home card. Runs once `20261031230100_kitchen` has run.
- [x] Keepers and unicorns (celebrated, and back on "Make it again"); the
      week's Probably buy and Check the pantry lists; each of us asked to rate
      in the days after a dinner.
- [ ] Laurie's food rules and `check_plate`; the weekly ten ideas and pins;
      `adapt`, the substitution engine.

## 5. Jams

- [ ] **The jam scout:** a scheduled AI agent (Claude with web search) that
      looks every morning for jam-band shows and coverage near us, and for
      what's happening around the world worth knowing: festivals, livestreams,
      new releases. It does the same for Anna's and Laurie's music: each of us
      keeps a list of artists and kinds of music in Jams, changed whenever we
      like, and each find is tagged to whose interest it matches. It saves what it finds with its source links; Jason
      confirms a show before it reaches the calendar. Capped searches a day
      and a monthly spending limit; it sends only search words, never family
      data; and it treats every web page as data, never instructions.
- [ ] Free feeds alongside it: YouTube channels' own release feeds (no key),
      new uploads in the Internet Archive's Live Music Archive, and bands'
      own tour calendars where they publish one. No JamBase.
- [x] This day in jam history: shows taped on today's date, the family's
      bands first, each a tap from playing on Relisten (unverified against
      the live service).
- [ ] Free live recordings from the Internet Archive's Live Music Archive
      (bands that allow taping), in a built-in player.
- [ ] Chill and relaxing music from free sources (to find).
- [ ] Each person's favourites: Jason's jam bands, Anna's bands, Laurie's
      Christian artists. Their commercial recordings link out rather than play.

## 6. Mindfulness, and the Buddhist year

Jason doesn't practise but enjoys Buddhism and mindfulness, so the app
celebrates them the way it celebrates everything else: woven into the
places, quietly, never mixed into the Church's own cards, and only for those
who want it. A sketch for the next session; the questions come first.

**Built (2026-11-01):** the morning sit on Home (`/home/sit`): one line to
clear the mind and a timer, ten minutes unless changed; a line from the
teaching each day, and on Sundays a word on one idea with one small thing to
try; two Buddhist days on the calendar (Vesak, Bodhi Day), each with a
practice. Teaching stays light: Jason reads about it and doesn't practise.

**To settle first**

- Which traditions or teachers speak to him (Zen, Plum Village and Thich
  Nhat Hanh, Tibetan, Theravada and insight meditation, secular
  mindfulness)? That decides the dates (Vesak alone falls on three
  different days by tradition) and the words.
- Whose is it: Jason's alone, or the family's to switch on? It wants to be a
  per-person setting (in the database, like whose days the calendar shows),
  not a device one.
- Words: only translations that belong to everyone (Max Müller's 1881
  *Dhammapada*, the older sutta translations); Thich Nhat Hanh's gathas and
  most modern translations are copyrighted, so they'd be links, not text.
- Sound: a bell, or silence?

**Where it could live**

- **Home: a pause.** A small card for whoever has it on, with a breathing
  circle that grows and shrinks (in for four, out for six), an optional
  struck bowl made by the phone itself (no recording to license), and one,
  three or five minutes. Under less motion, a count instead of the circle.
  Never a streak or a nag.
- **The calendar: the Buddhist year,** as its own switchable group like the
  others: Vesak, Bodhi Day (December 8, the same day as the Immaculate
  Conception, each on its own card), Nirvana Day (February 15), Dharma Day
  and Sangha Day on their full moons, Obon in the summer for remembering
  those before us (kin to All Souls), Losar; the uposatha days on the new
  and full moons the app already works out, as quiet "days for practice".
  Thich Nhat Hanh was born on October 11, the angelversary: the day could
  hold both, if Jason would like that, or not.
- **The swirling light** for Vesak in lotus pink, white and gold; Bodhi Day
  in fig-leaf green and gold.
- **The bridges that are already there:** the Ignatian Examen as an evening
  invitation among the prayers (Catholic contemplative practice, and
  mindful at heart); a mindful walk suggested on an outdoor event (the first
  ten minutes in silence); birding as noticing; a pause before cooking in
  cook mode; a "chill" shelf in Jams for sitting music.
