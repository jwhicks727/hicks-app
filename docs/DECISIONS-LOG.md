# Hicks Family App — decisions log

Why things are the way they are. Newest first. A reversed decision gets a
new entry; the old one stays. The working rules for every project are in
`DESIGN-PRINCIPLES.md`; this file records what was decided for this one.

---

## 2026-11-02 — "Most reported" comes from sampled checklists, not eBird's recent-sightings feed

eBird's recent-sightings call returns one line per species (its latest), so every bird
had "1 report" and the rare ones, listed first, topped the "most reported" list. The
`birds` function now reads the latest ~40 checklists made within 25 km of town (the
county feed, then each checklist) and counts how many each bird is on; "most reported"
is that count (a rare bird never appears in it), shown as "On 31 of 40 recent
checklists", and highlights use it too. About 41 eBird calls an hour, kept for the hour.
Unverified against the live service until deployed; the old cached answer shows until
the next hourly refresh.

## 2026-11-02 — Birds around us grows: a page of its own, built on eBird's public API

Home's Birds card now shows a short list (most reported this week) and, only when
one is worth it, one or two tappable "Worth a look" highlights (a rare bird reported
again and again, in a big group, or there today; nothing on a quiet week) instead of a
grid of nine, and opens `/world/birds`: birding places
(eBird hotspots, busiest first), the county's day in numbers, what else has been
reported in the county this month, where one bird was last seen near us, a line
about birding in today's weather, and a bird bingo card for Anna (nine birds really
reported this week, ticks kept on the device). All through the `birds` Edge Function
(`kind: more` every three hours, `kind: nearest` per bird, hourly) with the same key;
other birders are never named. Photos: a bird with no open-licence photo of its own
now falls back to a well-voted open-licence sighting on iNaturalist, a failed lookup
is no longer remembered as "no photo", and the birds the screens show are all looked
up. Unverified against the live services until deployed.

## 2026-11-02 — The eBird feed doesn't carry her checklists; the file is the way, and the nightly run is off

The first discover run of the API route read 1,682 checklists from the county's
feed over 30 days and found none under her display name. Most of her checklists
are at private places (Home, address-like names), which eBird keeps out of its
public feeds, so the route cannot see them. Signing in is blocked by eBird's bot
check (entry above), so the file from My eBird › Download My Data, dropped on the
Bring in her birds page, is the way to get and refresh her birds. The workflow
has no schedule now and runs by hand only; the switch in the app is kept in case
the feed ever helps.

## 2026-11-02 — The eBird sync reads the public feed through the API, never signing in

The first discover run signed in fine, but eBird puts a bot check (Anubis) in
front of a person's own checklist pages, and the job never got past it. Beating
a deliberate bot check risks locking Laurie's account, so the sign-in route is
dropped (it reverses the 2026-11-01 entry that allowed it). The nightly job now
asks eBird's official API 2.0 for each day's county checklist feed, keeps the
checklists submitted under her display name (`EBIRD_DISPLAY_NAME`, a repository
variable in the `ebird` environment), and reads each new one's contents. No
password is held; `EBIRD_USERNAME` and `EBIRD_PASSWORD` are removed. Limits: the
feed holds at most 200 checklists a day and may leave out checklists at private
places (unverified until the first discover run), so the file download stays the
sure way to get everything. History is filled in by running the workflow with
`since` (up to 400 days a run). The switch in the app stays (a parent turns the
nightly read on or off).

## 2026-11-02 — Jason may switch the eBird sync on for Laurie, as a surprise

Jason wants to surprise Laurie with her life list filled in, so a parent can
now record the yes (Life List › Birds › "Switch on for Laurie"), not only
Laurie. This relaxes the 2026-11-01 entry's "Laurie's own sign-in" condition and
is Jason's call. What stays: the card says who switched it on, either parent
can switch it off at any time (migration 20261102000500), Laurie is to be told
afterwards, and every other safeguard (24-hour hold after a rejected sign-in,
secrets only in the `ebird` environment, 150 checklists a night, no names in logs).

## 2026-11-01 — A nightly job may sign in to eBird as Laurie, with her own yes

Jason asked not to import eBird files by hand. eBird has no API for a person's
own checklists, so a scheduled job (`sync-ebird.yml`, Playwright) signs in as
Laurie, lists her checklists, and reads each new one's contents through the
eBird API. This reverses "never by signing in to eBird" (the file import stays
as a faster backfill). Conditions: it runs only while a row in `sync_consents`
exists that Laurie's own sign-in wrote (Jason cannot say it for her), her login
lives only in the `ebird` GitHub environment (limited to `main`), the sign-in
page is checked against Cornell's and eBird's own domains before the password
is typed, a run is logged before signing in and a rejected sign-in (or an
unfinished run) holds every kind of run for 24 hours, there is no retry loop,
it takes at most 150 new checklists a night, and its logs hold counts, never
names or page text. The selectors and addresses are unverified until the first
`discover` run.

## 2026-11-01 — Laurie's blanket yes covers all her paintings

Jason has Laurie's blanket consent to scan and use every one of her
paintings in the app, so "Add a painting" no longer asks for her yes on each
piece (no checkbox, and `said_yes_by` is not written; the column stays as the
record of the ones saved before). This reverses the per-painting yes in
`docs/ART-CAPTURE.md`. Unchanged: her title, year and medium come from her,
never guessed; a painting is cropped and framed, never altered; none goes to
an image generator or is posted anywhere; and a painting stays in private
storage behind sign-in.

## 2026-11-01 — World leads with a place of the day, like a weather app

World's main weather is now one of our places each day, in its own sky: the
big temperature, the hour by hour and the week there, with the next three
places named under it. Home's weather, the sky and the wild come after, and
Our Places (the map) moves to the bottom, unchanged. Only places from an hour
away outward take a turn (30 straight-line miles from home, `AN_HOUR_MILES`:
Big Bear and Anaheim just clear it, Redlands, Claremont and San Dimas don't),
in the list's order, one a day, the same on every phone: the day's number
modulo the list, so no state is kept.

## 2026-11-01 — A photographed recipe's plain-line ingredients are read

A recipe read from a photo came back with no ingredients and a fuzzy blank where
its pictures go. The format says one ingredient list "grouped by blank lines",
and the photo reader wrote them as plain lines ("3 Tbsp butter"), while the
recipe reader only knew bullets. It now reads plain lines (from the first line
that begins with an amount, any short line until the steps), and an
"Ingredients" label; a recipe with none is warned about on the review screen.
A recipe's pictures are chosen from its ingredients at the time it is shown when
none were stored, and a recipe with none shows no blank. The Claude brief also asks
for bullets.

## 2026-11-01 — Life List is built: birds from her eBird file, trips, the parks

Life List opens on **Recent** (her newest birds, the next and last outing, the
parks' progress, her newest paintings, the birds she saw on this day in other
years), with Birds, Trips, Parks and the Gallery beside it.

- **Laurie's birds come in by file, never by sign-in.** She downloads
  MyEBirdData.csv from eBird (My eBird › Download My Data) and drops it on the
  app; it is read in the browser. The app never signs in to eBird and never holds
  her password (so her "yes" for a login isn't needed, and there's nothing to lock
  out). Birds Merlin heard or photographed reach her eBird through its checklists
  and arrive with the file. Only the birds, days and places are kept, positions to
  about a kilometre, **readable by the parents only**: where she walks says where
  she is. The same file twice changes nothing. Written to eBird's documented columns
  and unverified against her own file until she first uploads it.
- **Drill-downs:** her life list, each day she birded, each month across the years,
  each place, and each bird's own story, all linked.
- **Camping trips and Disneyland trips are celebrated** (their own colours, which of
  its kind it is, the nights); trips and ordinary outings are kept. The family reads;
  the parents add. A park trip that is over checks the park off.
- **The sixty-three national parks**, checked off as we go, one starred as next.
- **Her paintings stand in for photos, only where she has said what they show.** A
  parent tells a painting what it shows (a bird, a park, a place); it is never guessed
  from the picture. Wherever the Life List would show a photo of that thing, her
  painting takes its place.

## 2026-11-01 — Autumn's leaves are cut from her two autumn paintings, at full size

The leaves that drifted down in fall were 22 to 54 pixels wide, lifted from the
bottom of her witch painting and enlarged: soft and strange. Laurie's two new
autumn paintings (a stream through a forest, a pond of reflections) give foliage
painted large enough to cut out whole. `scripts/lift-art.py autumn` cuts
leaf-shaped pieces out of the flattened photos: her own pixels and the weave of
her canvas, a soft edge and nothing more; nothing is redrawn or generated. The
sheets are drawn at their own sharpness (`px`: two sheet pixels to a screen pixel),
so a leaf is about 40 to 110 screen pixels long and crisp on a retina screen. Fall
and Thanksgiving draw from both paintings; Halloween and the Day of the Dead keep
her witch's leaves. Until the new paintings are moved into the bucket the old
leaves stand in. Both paintings are working titles ("Autumn stream", "Autumn
pond"): her titles, years and media are hers to tell.

## 2026-11-01 — The place on World says why we're looking there

A label like "Today's place" is a pattern the eye learns to skip. The big card
now opens with how far it is and how it differs from home, then a headline from
the biggest difference (rain there and dry here, snow, a 12-degree gap, wind,
night already, or "much like home today, within 3°"), then a few plain lines:
its temperature against ours, the time and light there, tomorrow there, and the
place's own line (`src/lib/placeStory.js`, from the two forecasts and nothing
invented).

## 2026-11-01 — A plan stays until it's put away; World becomes a weather app

**Plans.** Plan the week looked up the plan by calendar week, so a list that was
waiting for Laurie's "1, 3, 8" (and the recipes written from the picks)
vanished at midnight when the week turned. Jason's call: lists and recipes are
a source of truth, kept until he or Laurie specifically puts them away. The open
plan is now the newest one nobody has dismissed (`week_plans.dismissed_at`),
whatever week it was made; the recipes written for it are kept with it, on the
device at once and in the database (`week_plan_recipes`, parents only: they
carry Laurie's plate). "Put this list away" and "Start over" ask first; Start
over keeps the old plan in the database as history. The old per-week device
draft is read once so last week's written recipes come back.

**World.** It leads with Weather at home (an endless hour strip and a day strip,
three weeks back to sixteen days ahead, each hour and day with its chance of
rain, inches expected and wind) beside Our places (the three schools side by
side, recess flags, alerts, and whatever is coming up somewhere with a place
in the calendar, with its weather), then today's place, the week, the sky, the
wild and the map last. Everything opens: an hour or day (`/world/day/<date>/<hh>`,
any date back as far as the archive goes), each figure of the sky
(`/world/sky/<sunrise|golden|sunset|lastlight|daylight|shadow|moon|air>`, a year
of it as a graph to touch), each school (`/world/place/<school>`: recess hour
by hour, alerts, the last day against home). Recess flags and the air are
guesses and say so. Joshua Tree is a place; every skyline moves; the SoCal map
draws the big freeways; the Wild card has a drawing for each season and its own
site's picture (read by the `wild` function) when one is there.

## 2026-11-01 — Clear list, and the list can be texted to Anna

Plan the week gets a "Clear list" (it asks first, since it wipes the whole
list) and a per-person "Text the list" for Laurie and Anna. Anna's number is
her Apple Watch's, kept in `member_phones` like Laurie's: parents read and
change it, her own account can't see it. The message is made and sent by the
phone's own Messages, never through the app.

## 2026-11-01 — A photographed recipe is approved, and the chat can fix recipes

The first photographed recipe came back calling a dish fine for Laurie when
it held onion, red pepper and tomatoes: the photo reader had never been given
her food rules. Jason's call: fix it in the app, not in the code, and by
talking to the chat. So:

- The photo reader now gets the kitchen's context, Laurie's rules included
  (a parent's task, like the others), and returns `checks`: conflicts with her
  rules and anything it had to guess.
- Nothing from a photo is saved on Claude's word. It is shown beside the
  picture with those checks, editable, and saved only once approved.
- The Kitchen chat can open any recipe (`read_recipe`, answered in the Edge
  Function as the caller, so Laurie's plate reaches only a parent) and
  propose changing one (`propose_recipe_change`). The card shows the saved
  version against the new one, line by line; Save replaces that recipe in
  place, keeping its ratings and fridge. Rules and preferences changes show
  the same comparison. Laurie's rules are offered to the chat for any
  parent, on any recipe, not only while a rules change is being proposed.

## 2026-11-01 — Plan the week: one idea at a time, Undo instead of asking

"More ideas" asked for another ten, and ten more was never wanted. Jason's
call: two smaller moves instead. "Add an idea" asks Claude for exactly one;
"Refresh the list" keeps the picked ideas in their places and swaps the
rest. Each idea has a ✕ that takes it off at once, with an Undo toast for a
few seconds rather than a yes/no question; only "Start over", which wipes
the whole list, asks first. The busy line ("Asking for ideas…") moved from
the bottom of the page to a pill at the top of the screen, so it is seen
from wherever the button was tapped. New ideas are told what is on the list
and what was taken off it this visit, so none comes straight back.

The undo toast is written fresh for this app (`src/ui/Toast.jsx`): the idea
came from SOAR, the code did not.

## 2026-11-01 — Laurie's food rules no longer need her sign-off to reach Claude

Reversing the earlier rule that Claude receives Laurie's food rules only while
her own switch says yes. Jason's call: a separate sign-off was thoughtful but
unnecessary in this household, and it left Claude planning without her rules
whenever she hadn't signed in to flip it. Now the rules go to Claude whenever a
parent (Jason or Laurie) plans the week, writes recipes or asks in the Kitchen
chat, so every dinner's core satisfies them. What stays: only Jason and Laurie
can read them, they go on no one else's request (Anna's chat questions carry
none), they never reach the wall or the repository, and the screens say they
are sent. The `ai_consents` table is no longer read and its rows are kept.
The earlier entries on this ("Claude everywhere" and the kitchen's) stand as
the history.

---

## 2026-11-01 — Text the week's ideas to Laurie; fish from an ordinary supermarket

The week's one-line ideas are numbered, and one tap opens Jason's own Messages
with the list for Laurie, so she answers "1, 3, 8" and he types that back to
pick those. The message is made and sent by the phone's messaging, never by
the app's servers. Her number is kept in its own table readable by parents
only, and without it the same button still opens a message and lets him choose
the recipient. Separately, the Kitchen's standing brief now says fish and
shellfish must be kinds an ordinary Southern California supermarket stocks all
year (Trader Joe's first), never trout and nothing that needs a fish market;
tastes such as Jason's dislike of tahini belong in the saved kitchen
preferences, which every request already carries.

---

## 2026-11-01 — The tab bar sits close to the bottom, and the sky always reaches it

The floating tab bar rode about 44 points above the bottom of an iPhone (10px
plus the whole home-indicator inset), its padding was generous, and on Kitchen a
plain band of page colour showed under it: the sky layer is `position: fixed;
inset: 0`, which is only as tall as the layout viewport, so when that comes up
short of the screen (a browser's own toolbar, a keyboard that left the layout
short) the page's flat background showed through and the bar looked pushed up.
The sky now has `min-height: 100lvh`, the tallest the screen can be. The bar
floats 4px plus 40% of the home-indicator inset above the bottom, with 4px
padding and 48px tabs (58px tall), and everything that floats above it (the
Ask button, the timers, the Apps sheet, the page's own bottom padding) is
placed by the same two numbers, `--tabbar` and `--tab-bottom`. Unverified on a
real phone: the band was not reproduced, and this fixes its likely cause.

---

## 2026-11-01 — The page fades into the sky under the status bar

On an installed iPhone the app draws under the status bar (`viewport-fit=cover`
with a translucent bar), so a card scrolling up ran straight behind the time and
battery and made them hard to read. As in Apple Podcasts, a strip of the same sky
now lies along the top, solid behind the status bar and fading out just below it
(about half the status bar's height again), so what scrolls up dissolves into the
sky. It appears only once the page has scrolled, so nothing at rest is dimmed, it
copies the sky exactly (light and dark), and it is as tall as the device's safe
area, which is nothing on a computer or in Safari's own bar. Unverified on a real
phone: it was checked in a browser with the safe area set by hand.

---

## 2026-11-01 — The leaves rest at the top and let go one at a time

Her leaves used to fall all together, once a day, in a burst that was over in
ten seconds. They now rest along the top edge of the screen, seven of them,
half out of sight, and while you browse one lets go every nine to seventeen
seconds and drifts down slowly (twenty to twenty-eight seconds; slower still
on the Day of the Dead), swaying and turning, while a new leaf fades in at its
perch. They wait while the app is in the background, stop after thirty in a
visit, and are absent under less motion and on the sit and cook screens.
Settings' "Play it" and the Paintings card's Play again let a few go at once.

---

## 2026-11-01 — The crow starts at the top and leads you down

The crow used to wait until the painting was well in view, so on a phone it
began only after you had scrolled to the witch and the effect was lost. Now,
once a day on each device, it starts a second after Home opens, flies over
the top of the page, and as it dives the page glides down with it, so the
witch is centred as it lands. Anything the person does (a scroll, a touch, a
key) ends the gliding at once and the crow lands where the painting now is.
It is slower again, nine seconds, and still flaps at its natural rate. Under
less motion, nothing moves.

## 2026-11-01 — Sign in with a password; the emailed link is the backup

The first sign-in on a phone hit Supabase's email limit: its built-in sender
allows only a few emails an hour, and an emailed link also opens the
browser rather than the installed app on an iPhone. So the main way in is an
email address and a password (Supabase knows people by email, so the email
is the username), which costs no email, works in the installed app, and
can be remembered by the phone's password manager. The emailed link, or
its code, stays as the way in for anyone with no password yet or who has
forgotten it. A password is set in Settings once signed in. The device
keeps none of it: only the email is remembered as a draft. Jason chose a
low bar for it, four characters of any kind and no character-type rules,
because this is a low-security family app; Supabase's own minimum (6 by
default) is the only floor beneath that.

## 2026-11-01 — Back to main, for the moment

The day the app went live was also the day of the most setup, with many
small fixes arriving a few minutes apart, and a branch and a pull request
for each was more to keep track of than the work itself. So, for now, work
goes straight to `main` again and each push deploys. The branch rule below
stays written down for when Jason says branches are back: one branch at a
time, a draft pull request only after asking him.

## 2026-11-01 — One branch for each piece of work

Now that the app is live at hicks.web.app, nothing is committed straight to
`main`: each piece of work gets its own branch, named for what it does, and
its draft pull request gets a preview link to try on a phone. A draft pull
request is opened only after asking Jason, branch by branch, and generally
one branch is in flight at a time. Merging to `main` deploys. Until it went live, small finished steps went straight to
`main`.

## 2026-11-01 — The whole app is behind sign-in

Reversing the first arrangement, where each screen asked for a sign-in for
itself and Settings held the form: nothing in the app shows until someone
has signed in and the database says the address is on the family list
(`is_family()`, the same check every table makes). Before that there is one
screen, the wordmark and an email box; no tab bar, no places, no calls to
the database. A signed-in address that isn't ours sees only "Not on the
family list" and a way to sign out. The email brings a link and a code: the
link for a browser, the code for the installed app, because on an iPhone a
link opens Safari and signs in Safari rather than the app. A development
copy with no database connected still shows the app, so it can be looked at
before anything is set up; a hosted copy built without the database's
address says so rather than showing the app. A sign-in failure says what it
tried to reach, because "Failed to fetch" almost always means the address
the app was built with is wrong.

## 2026-11-01 — Settings, Admin and Reports are plain icons

Settings, Admin and Reports had a grey tile each, which made them look like
more apps. They are plain line icons now, like Home and Calendar, at the
foot of the Apps sheet and of the rail. (This reverses "one quiet slate" in
the entry below on Admin; the apps keep their coloured tiles.)

## 2026-11-01 — The live address is hicks.web.app

The Firebase project (`hicks-app-1b1a5`) has a Hosting site of its own,
`hicks`, so the app lives at https://hicks.web.app rather than at the
project's default address, and `firebase.json` names it. The deploy key is
the secret `firebase init hosting:github` made, which it names for the
project, so the workflows accept that name as well as the plain one rather
than asking for a rename that can't be done without the key's value.

## 2026-11-01 — Mass times from the parish's own website

Sacred Heart's times come from sacredheartrc.org, read once a day by the
`parish` function, so the app has what the parish last posted rather than a
diocesan listing that may be out of date. The page is read as text: the
lines under a Mass-times heading, each day or range of days and its times,
with what each says about itself (Spanish, ASL, the vigil). Every weekday
Mass, and Saturday morning's, is marked **Daily Mass**; Saturday evening's
is Sunday's vigil. A week that differs from the last is kept as a new
version, never written over; a reading that doesn't look like a parish's
week is never kept, and the app goes on with the last good one, or the
diocese's listing marked unchecked. The reader was written to the usual
shape of a parish page without seeing this one (it couldn't be reached from
where it was written), so Admin › Mass times shows exactly what it read.

## 2026-11-01 — The schools beside home, and the birds round town

The schools' weather comes from the stations Jason chose (Kordyak SE685,
Wayne Ruble 980SE, SOAR NGC08), through Synoptic's free Open Access tier,
and home's from the station nearest the house, set in Admin and kept only
in the database. A station quiet for 90 minutes hands over to an airport
(Ontario for the Fontana schools, San Bernardino for SOAR), and the screen
says so rather than showing an old number as new. The `stations` function
keeps the last answer and asks at most every quarter hour, so a busy day
can't run through the free tier.

Birds around us is eBird's public sightings within about ten miles of the
town's centre (never the house), the notable ones a little further out and
first, in green. Photos are iNaturalist's, only under a Creative Commons
licence, each with its photographer's credit, in place of the Macaulay
Library embeds first planned: those need an embed per photo, and
iNaturalist answers a species name with a licensed photo in one request. A
sighting at a private location keeps its bird and its day, never its place.

## 2026-11-01 — Labels beside their places, tiles below, freeways round home

The map's names moved from bands at the top and bottom, joined to their
pins by long lines, to beside their own pins, bigger, each with its weather
now (and its time, abroad). Each label tries the sides of its pin, close
first, then a little further out with a short line, so crowded places still
read. The list below became tiles with what's happening there right now:
the weather, the day's high and low, the next sunrise or sunset, wind and
rain when they matter, and how far, or how far ahead. Around home draws the
freeways, so the map reads like the drive: Natural Earth's roads,
renumbered where it numbers them wrongly here, and the 210, which it lacks,
traced by hand. Each freeway's number slides along it to a spot no label
covers.

## 2026-11-01 — Admin, tools at the foot of Apps, and a light switch on Home

Setup is called Admin, at `/admin` (`/setup` still opens it). Settings,
Admin and Reports have icons, one quiet slate for all three, at the foot of
the Apps sheet and of the computer's rail. The button at the top of Home is
a sun or a moon that switches between light and dark in one tap; Settings
still offers the device's own. The paintings card has **Play again**: the
crow flies and the season's leaves fall once more. The glow's small replay
dot carries a replay arrow, so it says what it does.

## 2026-11-01 — The wordmark in the icon's font

"Team Hicks" at the top of the rail is set in Agbalumo, the font of the
home-screen icon's H, so the name and the icon match. It's the one place
Agbalumo is used; headings stay Caprasimo.

## 2026-11-01 — Flat apps, and moving rooms

The apps' icons were too soft and glossy for what they are, and too round.
They're flat now: a solid deep colour, nearly square corners, a thin outline
set just inside the edge and a glow of their own colour that widens when
pointed at or focused. The academy keeps the glossy 3D tiles for its kinds
of room, because that's Anna's and meant to be captivating, and they move:
each floats a little, a streak of light crosses it every few seconds, a halo
of its colour breathes behind it, and its picture breathes; under a pointer
it lifts and turns toward you, and a picked room pops. Each starts at a
different moment, so the grid ripples rather than pulses. All of it is
transform and opacity, and it stops under less motion.

## 2026-11-01 — Apps, a sheet, instead of Us

The fifth tab is **Apps**, and it opens a sheet rather than a page, the way
SOAR's new layout opens its Modules: a grid of the apps (Journal, The
Academy, Life List, The Gallery, Jams, The Garden) over whatever you were
looking at. Closing it leaves that screen as it was; a tile opens its app,
and Back from the app returns to where you were. The tab stays lit while an
app is open. On a computer the rail lists the apps under an "Apps" heading,
with no sheet. Every app has its own address now (`/journal`, `/garden`
joining `/academy`, `/lifelist`, `/jams`), and none has a Back link to a
menu. This replaces the Us page from earlier the same day; the code is our
own, written fresh, with only the idea taken from SOAR.

## 2026-11-01 — Outdoor tones, and cream for white

Us's tiles came down from bright to the mockup's own muted, outdoor tones:
the journal plum, the academy ochre, Life List deep sea, the gallery rust,
Jams lake blue, the garden moss. The academy's kinds of room stay bright:
it's Anna's, and it's meant to be loud. And the app's white is its cream
again everywhere words or icons sit on a colour (buttons, chips, the
icons, the switches' knobs, the shine), as `--on-colour`, where some had
drifted to pure white.

## 2026-11-01 — Icons on coloured tiles

The Us page's emoji were swapped for line icons drawn like the tab bar's,
each on a tile of its own colour (journal violet, academy amber, Life List
teal, the gallery rose, Jams indigo, the garden green), the way a phone's
app icons are: a gradient, a sheen, a soft shadow in its colour. The
computer's rail shows them small beside each name. The academy keeps its
emoji for the kinds of room, but each now sits on the same kind of tile in
its own colour, and the room buttons became proper cards: a tint of their
colour, a lift under the pointer, and a ring and a tick when picked. The
tiles' corners are rounder than the app's nearly square ones, because
they're icons, not controls.

## 2026-11-01 — Light and dark

There's a dark mode, chosen in Settings (Light, Dark, or like this device,
which follows a phone set to switch at sunset). The paper cards turn to a
warm dark brown, buttons to cream, and the hour's sky stays behind
everything, dimmed to evening, so dark still shows the time of day. The
maps have their own dark colours; the rooms, scenes and Laurie's paintings
keep theirs. The theme is set before the first paint, so the app never
flashes the wrong one.

## 2026-11-01 — Five tabs: Home, Calendar, Kitchen, World, Us

Seven tabs was too many for a phone (six was already the most it held
well), and the app keeps growing. Now there are five, the same for all
three of us: the four places we share, and **Us**, which holds everything
that's ours: the journal, Anna's academy, Life List, Laurie's gallery,
Jams and the garden. Life List, Jams and the academy keep their own
addresses, and the Us tab stays lit inside them; the journal and the
garden moved from under Home to `/us/journal` and `/us/garden`, though
their cards stay on Home and the sit still leads to the journal. On a
computer the rail lists what's under Us beneath it.

A tab of each person's own (the academy for Anna, Life List for Laurie,
Jams for Jason) was considered and set aside: Jason wanted the bar the same
for everyone, with Us as the way in. This replaces the seventh tab added for
the academy earlier the same day.

## 2026-11-01 — The icon: Agbalumo's H

Jason picked number 7 of the ten font H's: Agbalumo, a typeface named for
the African star apple (agbalumo in Yoruba), white on the evening sky. It
replaces the ChatGPT sprout, so the app's icon is no longer AI-made. Its
Android version is drawn from the font too, the H a little smaller on the
same sky, rather than shrinking the picture onto an extended sky, which
left a seam around the glow.

## 2026-11-01 — A private journal, after the sit

Jason journals after his morning sit, and asked for the app to send him
from one to the other.

- **Each person's own.** Only its writer can read a journal: the
  database has no parent or family override, and no Edge Function reads it,
  so it never goes to Claude. Home says only that today's page is written or
  that a note is waiting, never a word of either.
- **His shape, from his own journal:** the date, the day's question and its
  answer, anything else on his mind, then Gratitudes, numbered. Each weekday
  has its question, from his two sets (the school year's: Set the target,
  Reach out, Clear the friction…; and summer's), changing with the season.
  He can pick a set, write his own seven, or have none. A child's journal
  starts with gratitudes only.
- **After the sit,** the end screen gives the morning's sky (when the sun
  came up, where the moon is) and "On to your journal" until today's page
  is written. Settings can turn that off.
- **Looking back:** this day in other years; every page, searchable; and
  what he's grateful for most, a cloud of the words that come back, each
  opening the days behind it. On the journal's birthday, it says so.
- **Notes to your future self:** written now, sealed, opened on their day
  (or some surprise morning three to eight weeks on), waiting after a sit.
- **Outlets:** his list of what brings him back to himself, in groups, with
  "pick one for me".
- **Bringing it in:** the journal he's kept in a Google Doc was read once,
  turned into an import file outside the repository, and handed to him;
  nothing of it is in this repository. The app also reads a
  Doc downloaded as plain text, and gives the whole journal back as a file.

## 2026-11-01 — Anna's academy

Jason's long-held idea: a fantasy school designed and run by Anna, built
room by room. A place of its own, the seventh tab.

- **Isometric, and hers to build.** She names it, picks any of 21 kinds of
  room from the start (her office, classrooms, a Hall of Fame, a library,
  a cat café, an observatory, a chapel, a pool, a courtyard…), and arranges
  the campus and every room: a tap and arrows on a phone, or a drag. Each
  room comes furnished, and is full of detail: a window on the real sky, a
  clock with the real time, the real moon in the observatory, shelves of
  books, curtains, stained glass, string lights.
- **Celebrating her comes first.** A task done lights a star over the
  campus. A goal has steps and ends in a trophy. An A, or a grade better
  than the last in that class, earns a medal or a ribbon; a dip is never
  mentioned. Anyone can cheer her, for anything, and she can cheer herself.
  All of it lands in the Hall of Fame, and a fresh cheer shows on Home for
  the whole family.
- **Art:** Microsoft's Fluent Emoji (MIT), 245 of them, drawn once to small
  WebP files with the licence beside them; the rooms are drawn in code. The
  family can add pictures of its own (a pack bought for her, her drawings),
  each with its licence written down (docs/ACADEMY-ART.md).
- Grades go in by hand until QParent is connected (docs/PLAN.md).

## 2026-11-01 — Rooms indoors are plants from the side

A room's plants aren't a map to arrange: they line up along the floor by
the window, biggest first, each drawn as its kind (13 kinds), at its size,
in its pot. The kind is guessed from the name until chosen.

## 2026-11-01 — Maps in natural colours

The pastel continents were the content colours, not nature's. Now land is
green, the great deserts sand with a hint of dunes, the great forests a
deeper green, the far north tundra, the ice and the highest snows white,
and every big range a row of little brown peaks with white tips. Near home,
the land runs from coastal green to desert tan, and the peaks take snow
from November to April. Drawn simply: a hint of each formation, not a
survey.

## 2026-11-01 — A question for the dinner table

Each evening, one question for the table on Home, the same for all three
of us, never the same two nights running.

## 2026-11-01 — Ten more H icons, from fonts that are organic in themselves

Jason's follow-up: no sprouts or leaves added to a letter. Instead, find
fonts that already have something organic about them, however subtle, and
cast the net wide. About 120 display faces on Google Fonts were tried as a
plain white H on the icon's gradient. These ten are organic, read at
home-screen size, and aren't plain; they are side by side in
`compare-h2.png`:

1. **Matemasie:** a seed opening into its first two leaves (and a heart).
2. **Rubik Microbe:** built of cells.
3. **Rubik Wet Paint:** still wet, dripping off the brush.
4. **Rubik Bubbles:** foam, or a cumulus cloud building.
5. **Hanalei Fill:** two stalks of bamboo, knuckled at every node.
6. **Darumadrop One:** ink soaking into paper fibre, every edge ragged.
7. **Agbalumo:** named for the African star apple, with ripe, swelling
   curves.
8. **Rubik Beastly:** furred, or a thistle head.
9. **Akaya Kanadaka:** two knobbly twigs, lashed together.
10. **Rubik Moonrocks:** pumice, stone full of holes.

Each is the font's own H, nothing added, scaled into the same box as the
first three (`scripts/draw-h-icons.cjs`). All ten are under the SIL Open
Font License (read from each font file), which lets a picture of a letter
be used as an icon. Rubik Puddles and Moirai One were set aside because
their hairline outlines vanish at home-screen size.

## 2026-11-01 — Our crucifixes, illustrated, on the days about the Cross

- **The family's own crucifixes** appear on the Church card on the days
  that are about the Cross:
  - Ash Wednesday;
  - Palm Sunday;
  - Good Friday;
  - the Exaltation of the Holy Cross;
  - the Sacred Heart;
  - and, quietly, the Fridays of Lent.
- **Each is drawn from our own crucifix,** photographed on a plain
  background and made into a flat, inked illustration by
  `scripts/lift-art.py illustrate`. That step finds the photo's own
  colours, flattens them, outlines where they meet, and clears the
  background; it is not an image generator.
- They wait on the photos (docs/CHURCH-ART.md), then live behind sign-in
  like the paintings.

## 2026-11-01 — A few surprises

- **Tonight's sunset,** on Home through the afternoon. The forecast's
  clouds at the hour of sunset (low, middle and high) read the way sky
  watchers read them:
  - "Likely glorious": high clouds to catch the colour and a clear
    horizon;
  - "Probably hidden": low cloud on the horizon;
  - "Clean and golden": a clear sky.

  It says when golden hour starts, and that it's a guess from the
  forecast, not a promise.
- **Days off coming,** on Home when one is within four weeks. For each of
  us with a school calendar, it shows the next day off by name and how
  many school days are left before it. It's read from the approved
  no-school days, so it is only as right as the calendars.
- **This day in jam history,** on Jams: shows taped on today's date in
  years gone by, from Relisten and the Internet Archive. The family's
  bands come first, the Dead first of all, each a tap from playing. The
  shape of Relisten's answer is unverified until it's seen live; if it
  can't be read, the card links to Relisten's own page for the day.

## 2026-11-01 — Three H icons to choose from

Jason's idea: a white, blocky H in a leafy, organic style, on the gradient
the icon has now. There are three options in `docs/icon-options/`, side by
side in `compare-h.png`:

- **A, sprouting H:** a seedling rises from the crossbar.
- **B, leaf H:** the stems are two tall leaves, joined by a vine.
- **C, Caprasimo H:** the app's own display face, with a leaf unfurling
  from its shoulder.

They are drawn in code, not made by an image generator. The sprout stays
in use until one is chosen; switching is one command
(`scripts/make-icons.mjs`).

## 2026-11-01 — Colourful maps

The family loves colour, so the maps have more of it, though no more
detail:

- **The world:** each continent in its own soft colour:
  - coral for North America;
  - green for South America;
  - lavender for Europe;
  - gold for Africa;
  - rose for Asia;
  - sea-green for Oceania;
  - ice for Greenland.

  The continents are cut along longitude and latitude bands by
  `scripts/make-map.mjs`, with one coastline drawn over them all. The sea
  is a deeper blue with faint waves, and the night side shows more.
- **Southern California:** the land shades from green at the coast to gold
  inland. The mountains' peaks are purple, with snow on Baldy and San
  Gorgonio in winter. The lakes are turquoise.

## 2026-11-01 — Hosting on Firebase, previews on every pull request, paintings behind sign-in

- **Firebase Hosting, on the free Spark plan,** serves the app; Supabase
  keeps the data.
- **Merging to `main` deploys.** Every pull request, drafts included, gets
  its own preview link, posted on the pull request for a week, so work in
  progress can be tried on a phone. Previews skip docs-only changes and
  cancel themselves on a new push, to keep Actions minutes down.
  Pull requests from forks never get the deploy key.
- **Laurie's paintings live behind sign-in:** a table and a private bucket,
  read through week-long signed links (docs/PAINTINGS-STORAGE.md has the
  options weighed).
  - The paintings that came in with the code show only in a development
    copy, and `firebase.json` leaves them out of every deploy.
  - A parent moves them into the bucket with a tap.
  - A new one is added in her gallery, and can't be saved without "Laurie
    said yes".
- **The morning's setup is written down in order:** docs/MORNING.md.

## 2026-11-01 — The garden, from Home

- **The garden lives under Home** (`/home/garden`), with a card on Home
  for today's jobs.
- **Maps, not plans:**
  - **Areas:** the back yard, the patio, a room inside, each drawn
    colourfully: a mown lawn, or a room's wooden floor lit from its window.
  - **Spots:** beds and raised boxes in soil, with rosettes and a few
    blooms; terracotta pots; trees from above; the hummingbird feeder; the
    bird bath; paths; compost.
  - **To arrange:** drag on a desktop or with a finger, or choose a spot,
    tap Move and tap the map. Nothing needs a mouse.
  - The maps never hold an address or coordinates.
- **Care is worked out, not typed:**
  - **Watering:** each plant has its own rhythm, a day sooner at 95° or
    more, and is skipped when rain is likely.
  - **The feeder's nectar:** changed every 2 days at 90° and over, every 6
    when it's cool.
  - **The bird bath:** fresh every 2–3 days.
  - **Warnings:** wind (bring light pots in), heat, and frost (cover, and
    water the day before).
  - "Done" is one tap.
- **Photos stay in a private bucket** (the family only, signed links). One
  goes to Claude only when someone taps "Have Claude look", and the
  screen says so first. Claude names the plants, judges their health,
  and gives care for this climate and month. Its answer is kept with the
  photo.
- **What to plant each month** is a general guide for inland Southern
  California, with UC IPM linked for pests and problems.
- **The garden feeds the Kitchen:** picks logged in the last ten days are
  part of what Claude knows when it plans or chats.

## 2026-11-01 — The Kitchen's week, its rules, and Claude to talk to

- **The whole weekly workflow is in the app** (docs/KITCHEN.md):
  1. Ask for ideas: a number, and free words added to the ask, like
     breakfasts.
  2. Pick from them, and ask for more if you like.
  3. Have the picks written in Jason's format.
  4. Save them to the cookbook and the fridge.
- **The preferences and Laurie's food rules can be changed any time,** each
  change kept as a dated version. The rules stay Jason's and Laurie's
  alone, and go to Claude only while Laurie's own switch says yes.
- **Claude is a tap away anywhere in the Kitchen.** It proposes and the
  family confirms: nothing it suggests is saved until someone says so on
  screen.
- **The model is always "the latest Sonnet",** looked up from Anthropic's
  Models API each half-day. The app never names a version, so it keeps up
  with Anthropic's releases without a change here. That holds everywhere
  the app uses Claude.

## 2026-11-01 — Anything can come in as a picture, a paste or a drop

- **One way in, everywhere a file or a picture goes** (`src/ui/Dropzone.jsx`):
  - choose a file;
  - take a photo (on a phone);
  - paste it: a screenshot on the clipboard, anywhere on the screen while
    the drop zone shows, or with its Paste button;
  - drag it in on a desktop.

  Pasted text goes where text is wanted. Pictures are shrunk on the phone
  before they're sent.
- **A calendar from a picture** (Setup): a screenshot of a school calendar,
  a photo of a flyer, a PDF from an email. Claude reads the dates; a
  parent ticks the ones to keep; they go in under a source of their own,
  marked "Read from a picture", good until its last date.
- **A new event from a picture** (Calendar): an invitation, a ticket or a
  flyer fills the form in, for checking before it's saved.
- **A recipe from a photo or screenshot** (Kitchen › Add recipes): Claude
  rewrites it in Jason's format, faithfully, for him to check before
  saving. Obsidian files can be dropped in several at once.
- **Every one of these says on screen** that the picture goes to Claude
  (Anthropic), before it is sent.

## 2026-11-01 — A morning sit, and the teaching taken lightly

- **The breathing pause becomes the morning sit** (`/home/sit`): one short
  line to clear the mind and a timer, nothing else. The lines are from the
  Dhammapada, the suttas, old Zen sayings and Thay. It's ten minutes
  unless changed: a −/+ by the minute, with 5, 10, 15, 20 or 30 a tap
  away, and it remembers the last length. The bowl sounds at the start
  and end. The screen stays awake and dark; a faint ring fills as the time
  goes, and a tap shows or hides the minutes left. "End" stops early.
  There are no breathing instructions; Jason sits ten minutes most
  mornings and doesn't need guiding.
- **The teaching comes lightly, for someone who reads about Buddhism and
  doesn't practise it as a religion:**
  - On Sundays, Home's mindful card gives a word on one idea, in a few
    plain sentences, with one small thing to try that week. The ideas are
    impermanence, the middle way, interbeing, loving-kindness, the four
    noble truths, right speech, beginner's mind, equanimity, sympathetic
    joy, compassion, the present moment and the three jewels.
  - Other days it gives a line.
- **Only two Buddhist days on the calendar,** so each means something:
  - Vesak, on May's full moon;
  - Bodhi Day, on December 8.

  Each says what it is and offers a small practice. Thich Nhat Hanh's
  Continuation Day, his remembrance and Nirvana Day are gone from the
  calendar.
- **The season's show never plays over a sit, or over cook mode.**

## 2026-11-01 — Seasons move instead of colouring the sky

This reverses the seasonal wash of 2026-10-31.

- **The sky keeps its own colours all year.** The light wash of each
  season's colours over the sky is gone, and so is the painting faded
  along the bottom of every screen.
- **Each season shows itself as an animation, almost always from Laurie's
  paintings.** Once a day, a moment after the app opens, something she
  painted moves across the screen, over everything, never taking a tap,
  and not at all under less motion.
  - **Fall, Thanksgiving week and Halloween:** the leaves round her witch,
    lifted out of the painting by `scripts/lift-art.py leaves`, fall
    across the screen, swaying and turning.
  - **Día de los Muertos:** the same leaves drift down slowly, like
    marigold petals.
  - The crow still flies on Home's panel.
- **A season with none of her paintings has no show,** and Settings says
  so. It waits for her to paint one rather than taking stock art.
- **Settings › The season's show** switches it off. **Try another season**
  plays any season's show, and hangs its painting on Home, for that visit.

## 2026-11-01 — Answers from the family, and small changes

- **Places stay well-labelled places;** no "why it matters" lines.
- **The schools and the parish are pinned at their real buildings:**
  - Wayne Ruble, from a school directory;
  - SOAR, from the US Census geocoder, as SOAR's own app uses it;
  - Sacred Heart, from its Plus Code.

  Kordyak stays at the town's centre until it is geocoded. Home stays the
  town, as ever. Places sharing one spot fan out round it.
- **Anaheim's maps search is just "Anaheim, CA".**
- **Lancaster joins SoCal:** the Antelope Valley, with Joshua trees, a
  poppy bloom in spring, wind turbines on the far ridge, and the San
  Gabriels from the north.
- **"Must buy" becomes "Probably buy":** there may be scallions left over.
- **The Eiffel Tower is drawn as an open lattice:**
  - legs braced in zigzags;
  - the great arch;
  - its two platforms;
  - the shaft to the mast.

  The sky shows through.
- **Anaheim's fireworks open with a trio:** one large round burst and two
  smaller ones rising out of it, up and to either side, at about 60°,
  just overlapping it.
- **The crow starts small and far off,** and grows as it flies nearer,
  until it settles at its painted size. Its replay is a quiet little bird
  in the corner.
- **Hosting is Firebase,** on its free tier.

## 2026-10-31 — Laurie's first painting: the witch and the crow

- **Laurie's gallery** lives in the Life List (`/lifelist/paintings`, each
  painting at `/lifelist/paintings/<slug>`), framed and hung on the evening
  sky, newest first. It grows as her paintings are photographed
  (`docs/ART-CAPTURE.md`); each is a line in `src/lib/paintings.js` and its
  files in `public/paintings/`.
- **A "Paintings" panel on Home** (and on the Life List) shows the season's
  painting, or her newest, clipped to its heart, and opens her gallery.
- **The crow flies.** Once a day, when the panel comes into view, the crow
  leaves the painting, takes a jaunty turn round the whole screen (a loop
  included), and comes home to its place by the witch's hand. The small
  bird button sends it again; under less motion it only fades out and
  back. It is moved by transforms alone, over everything, and never takes
  a tap.
- **Her painting is never changed.** The crow is lifted out with
  `scripts/lift-art.py`: her own sky is filled in behind it from its
  surroundings (no image generator), and the crow is kept as a soft-edged
  cut-out. The two composite back to the painting to within about 2 of 255.
  The patch shows only while the crow is away; at rest the app shows her
  painting itself.
- **Halloween is her painting:** its art, and a palette taken from it (the
  glowing orange sky, the ember-red ground, the witch's olive robe). **Fall
  takes its colours from the same painting** until there is a fall
  painting of hers to use.
- **Trying on a season:** Settings › Reading and motion can show any
  season's colours, for that visit only, so Halloween can be shown off in
  November without leaving the app in October.
- The painting is in from Jason's photo of it on the wall, to show Laurie.
  Her title, year and medium are hers to give: until then it carries a
  working title, marked as one, and nothing else is guessed. If she'd
  rather it weren't in the app, it comes out with its line and its files.
  Nothing is hosted yet. Before hosting, decide which paintings may be in
  `public/`, where anyone with the address can open them.

## 2026-10-31 — Our places on one map, and each in its own sky

- **World opens on a map of all our places**, at three sizes: Around home
  (the valley towns, the schools, the parish, Big Bear), SoCal (adds
  Anaheim, Long Beach and San Diego) and The world (Kona, Washington, New
  York, Paris, Beijing). Places too close together to tell apart at a size
  become one pin that zooms in when tapped. Changing size flies between
  them. The size picked is a layout, so it stays out of the address.
- **Names sit in bands above and below the map,** each joined to its pin by
  a thin line, so a crowded valley stays readable on a phone; a name is a
  tap to the place's own page. The same places are listed under the map.
- **Stylised, not detailed:** land and sea from Natural Earth's outlines
  (public domain), simplified once by `scripts/make-map.mjs` and kept as a
  small file loaded only with the map. The world shows its night side as it
  is now and dashed paths from home; the mountains near home are drawn the
  way an old illustrated map would, rows of little peaks from rough
  outlines, with Mount Baldy and San Gorgonio white in winter, and the
  lakes (Big Bear, Arrowhead, Perris, Elsinore, Diamond Valley, the Salton
  Sea) to scale.
- **A pin is a town, not a street.** Places in one town fan out round it.
  Home is the town, as everywhere, and has no maps link.
- **Each place has a page** (`/world/place/<slug>`): its own skyline in its
  sky right now, the time there, how far it is, sunrise and sunset, the
  weather there (Open-Meteo, the town's coordinates only), and **Open in
  Maps** and **Directions**, which open the phone's own maps app: Apple
  Maps on an iPhone, iPad or Mac, the Android maps app, Google Maps
  elsewhere. Next and previous step through the places without adding to
  history. Home's page lists everywhere else, measured from home.
- **The skylines are drawn in code from generic shapes:** the decided ones
  (Big Bear, Paris, Kona, New York, Washington, Beijing, San Diego, Long
  Beach, San Dimas) and the rest: Fontana's mountains, palms and eucalyptus
  windbreaks; each school with its flag; the mission church; Redlands'
  groves and a Victorian; Claremont's clock tower and the Village; the
  Arrowhead above San Bernardino. Windows light after dark, clouds come
  with cloudy weather, the Eiffel Tower is gold from nightfall to a quarter
  to midnight and sparkles for five minutes on the hour.
- **Anaheim hints, never copies:** a generic fairy-tale castle, a craggy
  snow-topped peak, a Ferris wheel, a monorail running behind the castle,
  palms, and fireworks from 8 to 10 at night. No characters, ears, logos or
  park names on screen; only the maps search names the resort, so the
  phone finds it.
- Questions back to the family: why each place matters, in their words, to
  replace the plain descriptions; and whether any place is missing.

## 2026-10-31 — Wild seasons, and Thich Nhat Hanh

- **Nature's seasons near us,** as windows ("usually"), each linking to the
  people who watch them: Big Bear's nesting bald eagles, Jackie and Shadow
  (their cam); western monarchs on the coast (the Thanksgiving and New
  Year's counts); gray whales passing; wildflower season and superblooms;
  elephant seal pups; grunion runs; spring and fall migration nights
  (BirdCast, for Laurie); fall colour up the 395; Anna's hummingbirds
  nesting; California Poppy Day. A "Wild right now" card in World and on
  each day; a group Settings can switch off.
- **Jason likes Thich Nhat Hanh a lot.** A mindful moment on Home: a line of
  Thay's each day (and a few from Max Müller's 1881 *Dhammapada*, which
  belongs to everyone), with the book it's from. His words are his
  publishers', so they stay short, credited and private to the family. A
  Breathe screen at its own address: a circle in for four, out for six, his
  gatha "Breathing in, I calm my body. Breathing out, I smile.", one, three
  or five minutes, a bowl the phone strikes itself at the start and end.
  His Continuation Day (October 11, the angelversary too), his remembrance
  (January 22), Vesak on May's full moon, Bodhi Day and Nirvana Day, as
  "Mindful days". Cook mode ends with his line about washing the dishes.
  The mindful moment and the bowl each have a switch in Settings.

---

## 2026-10-31 — Many shared calendars, each event once, with a readable title

- **Shown once:** an event that arrives from several of the calendars we
  share (an invitation on two of ours, a district event copied into a
  school's) is the same event when it has the same feed id on the same day,
  or the same tidied title at the same time. Ours wins over a feed's copy;
  it still counts for everyone whose calendar it came from, so "whose days"
  finds it. Two schools' days off are never merged, whatever they're called.
- **Readable titles,** for display only (the feed's own words stay stored,
  so the rules can improve): "Invitation:", "FW:" and the like come off,
  Google's "@ Fri Nov 6 6pm…" tails and email addresses go, a leading
  [district] tag goes, and SHOUTING becomes Title Case while acronyms (PTA,
  IEP, SOAR, MPR) stay. A title a person wrote is left alone
  (`src/lib/cal/tidy.js`, tested).

---

## 2026-10-31 — Keepers, unicorns, the week's two lists, and asking for ratings

- **All 4s and 5s make a keeper; three 5s make a unicorn.** Keepers and
  unicorns come back on "Make it again" after three weeks uncooked, unicorns
  first; a unicorn is celebrated with the swirling light in pastel rainbow
  and a horn badge, and the light plays the moment the third 5 is given.
- **Not a grocery list:** Jason writes his by hand. The week's picks give two
  reminders beside it, Must buy and Check the pantry (with the fridge's
  staples counted as pantry), sorted by the words of each ingredient and
  merged across dishes.
- **Each of us is asked to rate,** for four days after a dinner is cooked,
  until we do or say "Not now" (the shine of a job waiting). Phone
  notifications would need the app installed and hosted first.

---

## 2026-10-31 — The year's colours, after SOAR's seasonal schedule

- **A seasonal wash over the sky,** following the shape of SOAR's schedule
  (`src/seasons.js` there): windows of dates, a specific holiday winning over
  the season around it, and a palette of an accent and three hues. Its
  holiday and season colours came across; the rest is the family's own.
- **The Church sets the big seasons,** worked out each year: Advent to
  Christmas Eve, Christmas until the Baptism of the Lord (not the 26th),
  Lent the quietest palette of all, Easter until Pentecost. Then Día de los
  Muertos, Halloween, Thanksgiving week, Valentine's (quiet in Lent), the
  Fourth, back to school, and the four seasons between.
- **It stays light:** soft glows in the corners over the sunset sky, never a
  new background, and a switch in Settings.
- **Laurie's paintings will make the visuals:** each season has a slot for
  one (`SEASON_ART`), shown faintly along the bottom of the sky
  (docs/ART-CAPTURE.md).
- **The icon stays the outline sprout;** the leafy one was too busy at
  home-screen size.

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
