# The plan

Built in this order, each part in daily use before the next.

## 0. Foundations — started 2026-10-31

- [x] Five tabs, the same for everyone: Home, Calendar, Kitchen, World and
      Apps, a sheet of the journal, the academy, Life List, Laurie's Gallery, Jams
      and the Garden (2026-11-01), with Anna's Art and Pets after
      (2026-11-05).
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
- [x] The season's show: something from one of Laurie's paintings moves
      across the screen, starting in her painting on Home. At Halloween her
      painted leaves fall and the crow flies out of the painting and home again;
      in autumn and Thanksgiving the real wind at home lifts leaves out of her
      autumn paintings from where she painted them, blows them across the page,
      and lets them settle on the cards (2026-11-05). The sky keeps its own
      colours. Settings can try another season's show.
- [x] Home's **Art** card: Laurie's painting with Anna's newest drawing taped
      over a corner, each a tap from its gallery; "A gust" in autumn, and
      Anna's paper flutters in every gust (2026-11-05).
- [ ] A show for every season, as she paints them: Christmas, Advent,
      Lent, Easter, spring, summer, July 4th.
- [x] A plan stays until it's put away: Weekly planner shows the newest list nobody has dismissed, with the recipes written from it (`week_plans.dismissed_at`, `week_plan_recipes`).
- [x] World as a weather app: Weather at home with endless hour and day strips (back three weeks, ahead sixteen days; rain, inches and wind on each), Our places beside it (schools, recess flags, alerts, events coming up somewhere), the day, sky and air pages, every skyline moving, Joshua Tree, SoCal freeways, the Wild card's drawings and pictures.
- [x] The place on World tells why: how it differs from home right now, its light and time, tomorrow there (`placeStory.js`).
- [x] World leads with one of our places each day (from an hour away
      outward, in turn): its sky, the hour by hour and the week there; home's
      weather follows and Our Places is last (`src/places/world/PlaceOfDay.jsx`).
- [x] Photographed recipes are checked against Laurie's rules and approved
      before saving; the chat opens and fixes recipes, shown against what's saved.
- [x] Weekly planner, tended a little at a time: add one idea, refresh the
      ones not picked, or take one off with its ✕ and an Undo; starting
      over asks first, and what's under way shows at the top of the screen.
- [x] Weekly planner: the ideas are numbered; one tap opens Messages with the list
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
- [x] Her paintings added many at once (`/lifelist/paintings/add`): each photo
      straightened and cropped on the phone (`src/lib/autocrop.js`), a guided
      walk through them with a crop and turn tool to fix any it got wrong, and
      Claude reading the year by her signature and suggesting a working title,
      the medium and the seasons (all changeable). The batch waits in the family's
      storage, so it can be sent from a phone, cropped on a computer, or left half
      done and picked up on another device. Home keeps a season show's own painting.
- [x] **The gallery finds and rotates** (2026-11-08): adding her paintings (or the
      photos waiting) is at the top; a **featured wall** of four to eight that hang
      together for a few days (`gallery_features`, chosen by Claude from their facts,
      the weather at home, the season and a concert coming, or by the app from their
      own facts until it can); finding them by colour (measured from her pixels),
      feel, mood and what they show (Claude's words, kept once a parent says so), year,
      season, medium and canvas shape, with words typed in; sorting newest in, by when
      painted, as a rainbow, A to Z or shuffled. Next and previous on a painting follow
      the order shown (`src/lib/gallery.js`, `src/places/lifelist/Gallery.jsx`).
- [x] **The month by her signature** is read with the year when she wrote one, and
      `/lifelist/paintings/look-again` (Admin links to it) looks over the paintings
      already in: months and years by her signature, canvas shapes and Claude's words
      come back as suggestions to tick; colours and fingerprints are measured and kept.
- [x] **Any shape of canvas**: round, hexagon, octagon, triangle, diamond, arch, or
      traced corner by corner in the crop tool; the frame follows it everywhere
      (`src/lib/shapes.js`, `Framed`), and her painting is still only cropped.
- [x] **The crop tool holds still**: the first tap only picks it up, the zoomed view
      no longer follows the box mid-drag, nothing zooms by itself, every change can be
      undone (Undo and Redo, Ctrl or ⌘ Z), and a 3 x 3 grid sits in the box.
- [x] **A second photo of the same painting or drawing is noticed** as it's added
      (a fingerprint, `src/lib/artColour.js`): leave it out, add it anyway, or (for
      hers) put the new photo in the old one's place, keeping its title and details.
- [x] **Autumn's wind from any autumn painting**: a parent cuts leaves from a painting
      on its page (`AutumnLeaves.jsx`, `src/lib/leafCut.js`), so a new photo of one
      gets the show back with a tap; the first two keep the script's leaves.
- [ ] A better auto-crop (see the decisions log, 2026-11-08: Segment Anything in the
      browser is the candidate; not started).
- [ ] Laurie's paintings photographed (how: `docs/ART-CAPTURE.md`), all
      covered by her blanket yes; a painting she'd rather not have public waits for private
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

## 0b. Early Bird and Night Owl: the morning and evening lists — 2026-11-07

- [x] Each of us keeps a morning list and an evening list, first on Home above
      everything but the greeting (`src/parts/ListsCard.jsx`): the list the hour
      asks for, a tap from the other. Names chosen in Admin (Early Bird and Night
      Owl unless changed: Sunup & Sundown, Rise & Shine and Wind Down, First Light
      and Last Light, Dawn Chorus and Evensong).
- [x] Different days, worked out from each thing's own rule
      (`src/lib/routines.js`): which weekdays, every week or every other, any day
      or only school days or days off (from the school calendars in Admin),
      taking turns through a rotation, for a while or for good. A day that's
      different, from a quiet + and Skip under the list (on Home, and on each
      list's today card at `/home/lists`): + adds something just for today;
      Skip gives the list today off, with a reason (sick, away, a holiday, a
      busy day), which holds the streak. Each has an Undo. The day turns over
      at 3 AM.
- [x] Ticking: the box springs and the check draws itself, feathers burst (stars
      at night), the words strike through, the row slips into the "done" pile and
      the rest glide up; a note for each tick climbing a scale (Settings can mute
      them). A finished morning sends the hummingbird looping round the screen; a
      finished evening sends the owl to sleep under the stars.
- [x] Streaks and records (`/home/lists`): in a row now, longest ever, finished,
      earliest, quickest, golden feathers, mornings done before sunrise, perfect
      weeks, eight weeks of squares. Milestones (3, 7, 14, 21, 30, 50, 100…) get a
      rainbow gleam and a celebration; perks the bird keeps for good (a scarf at 7
      in a row, a flower, a crown, a ring of stars, a rainbow tail at 100). A
      streak that ends is mourned gently once, with a word of encouragement.
- [x] Jason and Laurie keep Anna's lists with her (`/home/lists/<id>`); a list's
      words are its keeper's (the family sees only how each day went: rings on
      Home, the family page, Reports).
- [x] Family challenges (`src/lib/challenges.js`, `/home/lists/family`): begin
      by themselves once two of us have finished a list on three days each; easy,
      a stretch and hard in a pattern that starts with a win; timed to suit
      (weekends from Saturday, weeks from Monday, Moonlit on the full moon's
      nights, Beat the Sun only while sunrise is late); won ones go on the family
      shelf. Admin switches them off, sets the pace, changes any, adds the
      family's own, starts one now or cancels one.
- [x] Surprises: a golden feather on a list now and then; beating the sun; a
      birthday's party ticks and a day off; a Team Hicks day (everyone, every
      list) when all our hummingbirds fly by together; Anna's hummingbird says
      hello by name; tap the owl three times.
- [x] Last night's evening list stays open the next day (Lists page, linked from Home) to tick what was forgotten.
- [ ] Run `20261107180000_morning_evening_lists.sql` (docs/DATABASE.md), then
      each of us makes our lists. Unverified against the live database until then.
- [ ] Push reminders on the phone for a list not done by a chosen time.

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

- [x] Her school, built room by room: name, motto, colours (Wayne Ruble's among 18), up to five mascots that all
      roam the lawn; any of
      21 kinds of room from the start; the campus and every room arranged
      with a tap and arrows, or a drag; detail galore (the real sky, time
      and moon in the rooms).
- [x] Tasks light stars; goals have steps and end in trophies; grades by
      hand, an A or a better grade cheered; cheers for anything; the Hall of
      Fame; a fresh cheer on Home.
- [x] Fluent Emoji (MIT) for the things in rooms; the family's own
      pictures with their licences.
- [x] **Home's real sky over it all** (2026-11-11, `src/academy/atmosphere.js`): the
      sun and moon where they are, the forecast's clouds, rain, fog, storms, snow and
      wind; the light of the hour, shadows away from the sun, windows lit after dark
      while each kind of room is in use; far hills, drifting clouds, puddles after rain,
      the flag and trees in the wind; the seasons on the ground and string lights at
      Christmas. In a room: a real view in the window, the patch of sun where the sun
      throws it (the chapel's in the colours of its glass), lamps that glow at night.
- [x] **What's in it stirs** (`src/academy/life.js`): animals stroll and sleep, steam,
      bubbles, notes and sparkles rise, the mascot roams the lawn. The family's own
      pictures are filed as staying put, wandering (a pet) or giving light (a lamp).
- [x] **Try a sky**: a time of day, a weather and a wind to pretend with, until the app
      is closed; the campus says when it's pretend.
- [ ] Pets from a pack's sprite sheet (walking and sitting frames), once we see what
      the packs hold. Sound, behind a switch.
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

## 1e. Anna's Art (an app)

- [x] Her drawings taped to a wall, newest first, each one tap from large; anyone
      in the family adds one (a photo, with a title, the day she drew it if
      known, her own words if she said any, and whether it's about the pets);
      whoever added it, or a parent, changes it or takes it down, with an Undo
      (`src/places/Drawings.jsx`, `annas_drawings`, the private `drawings`
      bucket; never in the app's own files).
- [x] Adding drawings many at once (`/drawings/add`, anyone in the family): each
      photo straightened and cropped to the paper as it's sent up, a guided walk
      through them with the crop and turn tool, and Claude suggesting a working
      title, whether it's about the pets and any day written on it (all changeable;
      her words never guessed). The batch waits in the family's storage, so Anna can
      send from her tablet and a parent finish at a computer. A drawing keeps its
      original, so it can be cropped again from its page.
- [x] Called **Anna's Art** (2026-11-08), since she paints too; its address stays
      `/drawings`. A photo that looks like one already on her wall is flagged as it's added.
- [x] Hold a piece of Anna's or Laurie's art (or right-click it) to save, copy or share it, or copy its app link; each piece's page has
      the same menu behind a button (`src/ui/PieceMenu.jsx`, `src/lib/pieceMenu.js`, decisions log 2026-11-13).
- [ ] Drawings tied to a person or a pet's page once Pets is built.

## 1f. Pets (an app)

- [x] **The launch** (2026-11-05): a twilight scene drawn in code with Anna's
      "My Cats" drawing pegged to a clothesline, her three cats peeking over the
      wall (Kona, Portia and Goldie), hearts and stars rising as on her page, and
      Appa howling at the moon. Plays by itself the first time on a device,
      "Watch it again" after, never under Reduce Motion. The drawing is always the
      first one in Anna's Art marked "Our pets", the one the scene was made round; a
      tall one hangs narrower so it never covers the cats (`src/places/pets/`).
- [ ] A page for each of them: photo or Anna's drawing, birthday or gotcha day,
      weight over time.
- [ ] Vet visits, shots and medicines, with reminders on the calendar.
- [ ] Feeding and walks: who did what today.

## 1g. Away from home: our own travel app (issue #19) — started 2026-11-07

The app follows us on a trip: the weather, the sky and the birds where we are, a guide
to the place that appears by itself, and around it our own travel app, from the
countdown to a scrapbook with the trip's recipes in it. The full design, the decisions
and the phases are in issue #19; what's built is ticked here.

- [x] Settings › **Notice where I am**, each person on each device, off until switched
      on, with what it does and what it sends said first. The phone is asked only while
      the app is open (on opening and on coming back, at most every ten minutes, low
      accuracy, never watched); the reading is rounded to about a kilometre at once,
      kept only on the device, forgotten after six hours, on sign-out or when switched
      off; no history (`src/lib/here.js`, `src/lib/useHere.js`, `tests/here.test.mjs`).
- [x] Home ground (under 10 miles), out and about (to 25) and away (beyond, or another
      time zone). Away, Home's greeting says where ("Good afternoon from Big Bear
      Lake"), the date, sun times and clock are local (home's clock beside them in
      another time zone), the sky behind everything is the sky there, and the weather
      card is the weather there (now, twelve hours, the week, the Weather Service's
      alerts in the US) with home's in a line beneath (`src/parts/HereCards.jsx`). Out
      and about, home's weather card adds a line for where you are. The lists keep
      home's day.
- [x] **Coming up** on Home: a trip on the calendar (an event with a place more than
      25 miles away) from three days before it starts until we're there: when, how far,
      its forecast for those days and what to pack, from the forecast alone. It works
      whether or not Notice where I am is on.
- [ ] Unverified on a real iPhone: whether the installed app asks for location again
      each time it opens, and how to undo a "Don't Allow".
- [x] **Birds around here** (2026-11-07): away, Home's Birds card and `/world/birds`
      are the birds around where we are (most reported, rare, birding places), with
      what iNaturalist's observers see there this month; for Jason and Laurie, "Could
      be a lifer for Laurie" (birds reported there that aren't on her list, worked out
      on the phone from her own sightings, `src/lib/life/lifers.js`). eBird is asked
      about a tenth-of-a-degree cell, ten new places a day at most. Unverified live
      until migration 20261107230000 runs and the `birds` function is deployed again.
- [x] **What's around here?** (2026-11-07): away, Home leads with a guide to the place
      that writes itself (no button): the place's picture (Laurie's painting where a
      parent has said she painted it, else a Featured or Quality photo from Wikimedia
      Commons, credited), its height, weather and sunset, then hikes (short, medium,
      long, with when to set off before sunset), the village, coffee roasters,
      brewpubs, the local food, things for Anna, records and books, art, Mass and the
      sky, in the moment's order (`/world/around`; a kept one at `/world/around/<id>`).
      Every place has its sources, distance, OpenStreetMap's hours where known, and
      Directions. What the open map and Wikipedia know nearby shows at once, and the
      guide streams in within about a minute, kept for the family for a month. A trip
      on the calendar gets its guide written two days ahead, linked from Coming up.
      Out and about, a small card offers it. Admin › What's around here keeps the
      family's interests; Reports counts guides and their cost, never the places.
      Unverified live until migration 20261107231000 runs and the `around` and
      `claude` functions are deployed.
- [x] **Which town each of us is in** (2026-11-07, Jason: "full transparency"): while away,
      the others' Home has "Meanwhile: Laurie is in Big Bear Lake: 41°, clear". The
      phone shares the town and a tenth of a degree (`member_whereabouts`, one row a
      person, never a log), lapsing twelve hours after the app was last opened there;
      gone on home ground, when switched off, or on sign-out. Never on the wall or Reports.
- [x] **The rest of the app joins in:** Mass near here on a Saturday evening or Sunday
      morning away (the guide's own Mass section, else the Catholic churches the open
      map knows, times unchecked); a national park near here from the open map's park
      boundaries, checked off by a parent with the rainbow gleam for a new one; "Keep
      this trip?" for a calendar trip just over or a day away nothing planned, kept as an
      outing with an Undo (`outings.event_id`); the lists' Skip offers "Away" first; the
      garden hears about heat, frost or wind at home (`src/lib/trips.js`). Shows near
      here wait for the jam scout. Unverified live until migration 20261107232000 runs.
- [x] **The travel app** (2026-11-07; Yonder unless Admin names it Postcards, Field Trip,
      Wayfaring or Wanderings; `/yonder`, `src/places/yonder/`, `src/lib/yonder.js`):
      the next trip counting its sleeps over the sky there now, with "your fourth time
      in Big Bear" from kept trips; a shared packing list (our own items first,
      suggestions from the forecast and the trip a tap away); while away, a postcard to
      the family (Laurie's painting or the place's photo on the front, a stamp drawn in
      code; it shows in Meanwhile), Our day (`/yonder/day`: coffee, a hike that fits
      before sunset, lunch, the afternoon, golden hour, Mass, dinner, the Milky Way in
      its season, worked out on the phone, moved with arrows), a trip quest for Anna in
      her academy, and the town in jam history (the Live Music Archive). Each kept trip
      has a scrapbook (`/yonder/trip/<id>`: the hikes and their totals, the recipes,
      postcards, Laurie's birds and lifers with the gleam, hearts, the guide we had) and
      a stamp in the passport (`/yonder/passport`). Someday keeps hearted places.
- [x] **Recipes from the trip** (Jason's ask): a recipe written while away or on a
      calendar trip is tagged to it unless unticked; cook mode can say "cooked on our
      trip"; any recipe's page adds it to a kept trip; "Bring it home" in a scrapbook
      opens the Kitchen chat with the dish asked for and tags the recipe after
      (`trip_recipes`, `src/kitchen/TripTag.jsx`).
- [x] **And on Home:** a prayer for the road on the morning a trip begins, two skies in
      another time zone, a card abroad (words, money, plugs, the emergency number), snow
      drifting when it's really snowing where we are, "You just gained an hour", a year
      ago today; at height, cook mode's word on boiling; the journal asks a travel
      question while away (picked on the phone); "We did it" on a guide's hike (the
      longest yet gets the gleam) and a heart for Someday; for the parents, where Laurie
      can eat well (the `eat-well` task, her rules sent, the answer not kept).
- [x] **Our list for each town** (2026-11-07, Jason's ask on a day in Temecula): for the
      towns we keep going back to, the places to eat, coffee, wine and beer, hikes,
      things to do, shops, where we stayed and Mass, each with what we thought (loved,
      good, not again), a note for next time, and the days we went. Added from a guide's
      place ("We went here"), a hike ticked off, or by hand; on Home whenever we're in
      that town (away or out and about), loved first, "We went today" a tap away; a
      page for each town (`/yonder/town/<id>`); "Where we went" in a trip's scrapbook;
      the guide marks places we've been ("♥ Loved · 3×", "Not again")
      (`been_towns`, `been_places`, `been_visits`; `src/lib/been.js`). Unverified live
      until migration 20261107234000 runs.
- [x] **A stay's recap, and saves that wait** (2026-11-08, Jason's ask after a day in
      Temecula, where two places didn't save because their tables weren't there yet):
      after a stay away, Home shows a card named for the town ("Temecula", Nov 7) for a
      week or until put away, with the places added so far to rate and note, "Add places
      we went" (one a line, many at once, for any day of the stay), "Keep it as a trip"
      for a parent, and "Not for the scrapbook: put it away" with an Undo. A place that
      can't be saved (no signal, a hiccup) waits on the phone, shows as "waiting to be
      sent" with Send now, and is sent again by itself; a real problem stays on the
      form in words with what was typed kept (`src/lib/stay.js`, `Recap.jsx`). For a trip
      the phone didn't see, "Start a recap for a recent trip" in the travel app takes a
      town and days from the last week and puts the same card on Home.
- [x] **The trip photo reel, tagged by Claude** (2026-11-08, Jason's ask): photos added by
      hand (many at once, in the paintings uploader's style) to a stay's recap or a kept
      trip's scrapbook, sent to the private `trips` bucket and read through signed links.
      Claude looks at each (if left on) and suggests what's in it: plants, birds, other
      animals, a dish, a place named by a sign, never a person; a dish it matches to one of
      our recipes and a place to one on the town's list are linked. The suggestions count
      once someone confirms them ("Looks right" does all of a reel's), and then the photo
      turns up on that recipe's page, on the place's row in the town's list, on the bird's
      page in the Life List, and in the Garden's "Plants we've seen on trips". Tags can be
      fixed, linked, added by hand and removed (`trip_photos`, `photo_tags`,
      `src/lib/photos.js`, `src/parts/PhotoReel.jsx`). Unverified live until migration
      20261108130000 runs and the `claude` function is deployed again.
- [ ] Still to come: road-trip bingo and "along the way" (they need the route), the
      weather we had in a scrapbook, Anna's drawings shown in it (a link for now),
      Openverse and Park Service photos, Caltrans chain controls read live, and shows near
      here this week (with the jam scout). Unverified live until migration
      20261107233000 runs and the `claude` function is deployed again.

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

- [x] Recent first: new birds, the next and last outing, the parks, her newest
      paintings, birds on this day (`src/places/lifelist/Recent.jsx`).
- [x] Laurie's birds from her eBird download (by file, no sign-in), parents only:
      her life list, each day, each month, each place, each bird's story
      (`src/places/lifelist/Birds.jsx`, `src/lib/life/`). Merlin's finds come in
      through her eBird checklists. Unverified against her own file until the first upload.
- [x] eBird by file is the way (the nightly sync found none of her checklists: most are at private places; decisions log 2026-11-02). Built and tried:
      `sync-ebird.yml` reads eBird's API (no sign-in) for checklists under her display
      name, once a parent has switched it on. Still to do: set the `EBIRD_DISPLAY_NAME`
      variable; run the workflow with `discover`, then with `since` to fill in history. Steps: `docs/MORNING.md` 13.
- [x] Camping and Disneyland trips, celebrated; trips and outings kept (`Trips.jsx`).
- [x] The national parks checklist, sixty-three, starred and checked off (`Parks.jsx`).
- [x] Her painting stands in for a photo wherever a parent has said what it shows
      (a bird, a park, a place): `PaintingSubjects.jsx`, `src/lib/life/subjects.js`.
      Where there is no painting, the thing's own drawing (no photos are fetched).
- [x] Birds around us page `/world/birds` (hotspots, county numbers, this month's possibles, where's that bird, weather line, bingo; `BirdsPage.jsx`, `src/lib/birdPage.js`). Unverified live until the function is redeployed.
- [x] Birds around us on Home, right after the weather: this week's
      sightings round town from eBird, the notable ones first in green,
      each a tap from when and where it was last seen.

## 4. Kitchen

- [x] The Cookbook tab: shelves, sorts, ingredient search, what can I make with, tonight's weather pick, opened lately, surprise me, short list, cooked counts (`Cookbook.jsx`, `src/lib/kitchen/cookbook.js`); servings scaler and Share on a recipe.

- [x] Write a recipe by hand (`/kitchen/write`) and edit one (`/kitchen/recipe/<slug>/edit`), parents only: `RecipeEditor.jsx`, with a live reading of the text.

- [x] The Kitchen menu (`KitchenMenu.jsx`) and the cookbook on its own screen (`/kitchen/cookbook`, `Cookbook.jsx`); a dish's pictures come from its name (`artFromTitle`).

- [x] Hunt & gather (`HuntGather.jsx`): a dish added to the week waits there, still to shop for, with the shopping list of those dishes only. Crossing a thing off takes it off (with an Undo); a dish with everything moves into the fridge by itself, and the empty card poofs away. "Into the fridge" on one dish, "Done shopping" for all. Kept in the database, the same on every phone (`fridge.bought_on`, `fridge_got`; runs once `20261108170000_still_to_shop` has run). It replaces "Done shopping" on one device, which forgot the shop as soon as another dish was added.

- [x] Cook mode picks out the ingredients a step names as well as its amounts, matched against the recipe's own ingredient list (`stepParts`); the recipe page's steps too.

- [x] Food pictures coloured in properly: the shapes under each drawing worked out again by `scripts/food-fills.py` (the whole drawing, gaps in its outline closed, never a web between leaves), a colour chosen for every drawing by name in `src/lib/kitchen/food.js` (`COLOURS`), stems and leaves in a second colour where the drawing has them, and accents read ("Gruyère").

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

**Built (2026-11-05):** the day's sit waits at the top of Home, right under
the greeting (`src/parts/SitReminder.jsx`, `src/lib/sitReminder.js`): the
morning's heading ("Your ten minutes this morning", then "whenever you can"
after noon and "before bed" after six), the day's line, and Sit now, Done
already and Skip today. Finishing a sit of a minute or more marks the day;
each answer goes at once with an Undo, and the card is back the next day.
It is on for the parents unless the mindful moment is off, and Settings
("Remind me to sit") or the card's own small line switches it off. The
day's answer and the switch are kept on the device, like the sit's length.

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
