# The plan

Built in this order, each part in daily use before the next.

## 0. Foundations — started 2026-10-31

- [x] The repository, the look (tokens, fonts, cards), the six places, the
      sky of the hour behind everything, the floating tab bar and desktop rail.
- [x] Addresses for every screen, and Back that walks real history.
- [x] The sky today: sun times, daylight against yesterday, your shadow, the
      moon as it looks, the next full moon.
- [ ] The family's own Supabase project (Jason creates it; settings in `.env`).
      West US (North California); new tables not exposed automatically;
      automatic row-level security on.
- [ ] A Setup console (admins only): every outside source the app reads,
      pasted in once, rechecked on demand, with when it was last read and
      when it goes stale.
- [ ] Sign-in for the three of us, and the greeting by name.
- [ ] Hosting (Firebase, as SOAR uses), and the app installable on our phones.

## 1. Calendar

- [ ] Day, week, month and year views.
- [ ] Two-way sync with our Google calendars.
- [ ] The year view: the three school calendars side by side, clickable:
      Kordyak (Rialto Unified, Laurie's teacher calendar), Wayne Ruble
      (Fontana Unified, Anna's student calendar), SOAR (Jason's).
- [ ] **The Setup console's calendar sources.** Paste a link or upload a
      file and it's saved, read and rechecked later. Takes any common
      delivery: a PDF, a Word file, a Google Doc or Sheet, a Drive folder, a
      Google Calendar, an iCal / webcal link (Outlook, iCloud and most school
      systems publish one), a web page, a photo or scan of a printed
      calendar, or a forwarded email. Feeds (Google Calendar, iCal) sync on
      their own; documents and pictures are read into dates that someone
      approves before they reach the calendar. Each source keeps its history:
      a new version never silently deletes the old one's events.
- [ ] **Rollover nags.** Each source knows the dates it covers (a school
      year, a month of lector dates). A few weeks before it runs out, Setup
      and Home ask for next year's (the job-waiting shine), with a link to
      where it came from last time, and a reminder on our phones.
- [ ] The Church year with romcal: feasts, saints, colours; traditional
      prayers with a warm invitation to pray them; readings at USCCB.
- [ ] Sacred Heart, Rancho Cucamonga: Mass and confession times.
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
- [ ] Family days celebrated big; holidays, civil rights and heritage days,
      seasons and nature, each with its own art.
- [ ] Concerts as special events with their ticket and scrapbook.

Art to check before use: Christicons (Christian line icons), the Wellcome
Collection's public-domain saint engravings, Corpus Christi Watershed's free
Catholic line art, the St. Nicholas Center's CC0 images.

## 2. World

- [ ] Weather from our stations through Synoptic: Kordyak SE685, Wayne Ruble
      980SE, SOAR NGC08, home its nearest (set in the app).
- [ ] Day by day and hour by hour, wound back and forward; school pages;
      one other place a day; NWS alerts for home and the schools.

## 3. Life List

- [ ] Recent first: new birds, outings, paintings, trips.
- [ ] Laurie's eBird history, drill-downs by day, bird, month and place.
- [ ] Camping and Disneyland trips; the national parks checklist.
- [ ] Bird pictures: her photo, else an embedded Macaulay Library photo with
      its credit; her painting replaces both.

## 4. Kitchen

- [ ] The week's recipes, the fridge, the cook check, ratings, the plates.
      The meal-planning spec is split first: the planning rules, recipe
      format and data model come into this repository; Laurie's own food
      rules go to the database (they are health information).

## 5. Music

- [ ] Jam-scene shows near us (JamBase's API: pricing to check; Ticketmaster's
      Discovery API as a fallback), added to the calendar.
- [ ] Free live recordings from the Internet Archive's Live Music Archive
      (bands that allow taping), in a built-in player.
- [ ] Chill and relaxing music from free sources (to find).
- [ ] Each person's favourites: Jason's jam bands, Anna's bands, Laurie's
      Christian artists. Their commercial recordings link out rather than play.
