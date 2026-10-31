# Design principles

Jason Hicks's working rules for every project, learned building SOAR
(`soar-charter-academy/soar-app`: about 305,000 lines, 17 modules, 290
migrations and 308 logged decisions, in daily use by a school's staff).

How to use this file: put it at `~/.claude/CLAUDE.md` on each machine so
every Claude session in every project reads it, or copy it into a new
repo's `CLAUDE.md` as the first section. A project's own `CLAUDE.md` can
narrow a principle (say what it means there) but shouldn't quietly drop one.
If a project really needs to break one, write down why in its decisions log.

Each principle says what it is, then the SOAR story that taught it, so a
future session can tell what the rule is protecting.

---

## A. The product

### 1. The bar is a product from a large software company
Modern, polished, useful, and kept current as standards move. Never ship
something that feels like an internal tool.
*SOAR:* staff compared it to the apps on their phones, not to the
spreadsheets it replaced.

### 2. Polish comes from consistency, and consistency is code
A small number of decisions applied without exception: one page width, three
heading levels, one accent button per screen, one way to switch views, one
kind of overlay. Write the standard down, then build it as shared components
so a new screen imports the look instead of copying it.
*SOAR:* Surveys looked better than every other module. The fix wasn't more
effects, it was `src/ui/` plus a written standard every module now uses.

### 3. Mobile first, with the desktop built to match
Design and build the phone layout first, then give the desktop the same
features in a layout made for a big screen: never a stretched phone, never
a cut-down desktop. This covers everything delivered, previews and docs
included: nobody scrolls sideways to read a sentence, and a table of
sentences becomes stacked cards on a phone. Hover never fires on touch,
and HTML5 drag-and-drop never fires on iOS Safari, so every hover has a tap
path and every drag has a tap equivalent. Tap targets are about 44px on a
touch device (`@media (pointer: coarse)`). Test at 390px wide and at
844 × 390 (a phone held sideways). Chrome's device mode is for layout only:
it fakes mouse events, so touch bugs pass there and fail on real phones.

### 4. Every screen has an address, and Back goes back
A screen and its tabs live in the URL (database ids only, never names or
search text). Every in-app Back walks the same history as the browser's Back
and Android's gesture. Filters and sorts stay out of history.
*SOAR:* a Back button that opened "the parent screen" dropped people
somewhere they had never been.

### 5. Half-done work survives interruption
iOS kills an installed web app in the background and reopens it at `/`. A
task someone types into, or that takes more than one tap, keeps its draft on
the device and offers "Pick up where you left off".

### 6. Everything shown can be tapped for more
A listed name, class, place or figure opens something: an expansion, a
sheet, its own page. Every overlay has its own close, closes on a tap outside
and on Escape, and a yes/no question is a designed confirm, never
`window.confirm()`.

### 7. Never invent data; design the empty state instead
No placeholder timestamps, totals or names in a real screen. If the source
isn't wired up, leave the element off. An empty list says what will appear
and how to add the first one.

### 8. A job that is waiting gets the shine, and only then
When something is waiting on the person looking (approve this, fix that),
one button carries the count and goes straight to the job. One per screen at
most, and never as decoration.

### 9. Figures stay on one line, and column counts are capped
"43.4%" never wraps into "43.4" and "%". A table never forces the page to
scroll sideways. One column per week looks fine at six weeks and is
unreadable at twelve on a phone, so cap what's displayed.

### 10. Accessibility is a setting every screen obeys
Text size, font swaps, reduced motion and contrast are app-wide settings, and
each new screen works with them: fonts through variables, text that wraps at
140%, motion checked through one helper.

### 11. A new screen introduces itself once
The first visit offers a short tour in a quiet pill. It's offered, never
forced, and can be replayed on request.

### 12. Respect the iPhone's real limits
Draw behind the status bar and pad with `env(safe-area-inset-*)`. No
`filter: blur()` on anything large: iPhone Safari repaints it in software and
froze overlays for seconds. Turn page zoom off deliberately and give back a
text-size setting in its place.

---

## B. People and their data

### 13. When recording is the point, the person holds the pencil
If writing it down is how someone learns or reflects, nothing auto-fills it:
no imported values, no pre-filled fields, no carrying last week forward.
Where someone could pick a suggestion or write their own, their own words
come first and suggestions sit one tap away.
*SOAR:* Leadership Notebooks. Importing a child's ALEKS minutes into their
tracker would have been "helpful" and would have taken away the learning.

### 14. Access is the database's answer
Who can see what is enforced in the database (row-level security), not
hidden in the interface. Never `using (true)`, even on a table that looks
harmless: the next table gets written by copying it.
*SOAR:* students' Google accounts are real signed-in sessions, so "any
signed-in user" meant every student could read the staff roster through the
API.

### 15. Shared screens show counts; individuals are the owner's
A screen many people see shows totals and engagement, not one person's
values beside another's. Per-person detail belongs to that person (and to
whoever must have it). A record shown in another module keeps its own
module's visibility rules, read fresh, never copied.
*SOAR:* Athletics copied calendar titles and put a staff-only event's wording
on the hallway TV.

### 16. Hold a login only with its owner's yes
A password is stored only when the person whose account it is agrees;
otherwise that person uploads the export. A stored login lives in the
secrets store, never in a table the app reads. The job that uses it backs
off for a day after a rejected login, because a locked account costs more
than a missed night, and its diagnostics never record personal data.
*SOAR:* state testing accounts belong to staff under a test-security
agreement, so SOAR never signs in to them and results come in by upload.
A family member's own account, lent by them, is a different case.

### 17. Say when personal data leaves for an outside service
Anything sent to an AI model or another company is named on screen. Speech
and AI features are given the app's own words unless the person chooses
otherwise.

### 18. Identity has one meaning, enforced
A one-to-one mapping gets a unique index plus a check in the writer that
explains a collision in a sentence. "Unmatched" counts each reason separately
and names it, so the number sends someone to a screen that can fix it.

---

## C. Engineering

### 19. One app, one database, modules in folders
Adapt one shell rather than forking it per audience. The module list is code;
who can use what is data. A new module loads when it's opened.

### 20. Read outside systems once, into your own database
A scheduled job reads each outside source and stores it; screens read your
database, never the vendor. Fold a new pull into an existing job rather than
adding one: every scheduled job's cost compounds.

### 21. Assume the data will grow and the platform will truncate
Page through anything that could pass 1,000 rows (Supabase truncates
silently). Keep each request far under the statement timeout however long the
list gets: do per-row work a few rows at a time and keep the results.

### 22. Dates are calendar dates
`new Date('2026-09-28')` is UTC midnight, the 27th in Pacific. Build dates
from their parts and compare calendar dates as strings.

### 23. Migrations are named by timestamp and never edited after they run
Fix a run migration with a new one. A snapshot column is only worth writing if
the read path prefers it.

### 24. Secrets stay out of anything a pull request can run
Test jobs reference no secret. Jobs that use secrets run from the main branch
only, in a protected environment. CI minutes are a budget: multiply runs by
minutes before adding a schedule.

---

## D. How the work is done

### 25. The spec and the decisions log are the source of truth
A spec says what is, in present tense. A dated decisions log says why, and
keeps reversed decisions rather than deleting them. A remembered earlier
conversation is not the spec.
*SOAR:* reversed course more than once (one app vs. three, build in place vs.
a new repo). The log is why nobody re-argues a settled question.

### 26. Documentation ships in the same change
A change that makes a doc wrong fixes the doc in the same pull request, the
same as tests and lint.

### 27. A rule that matters is enforced by a test or a hook
If forgetting a rule would hurt, a test fails on it, and the working notes
say which test. Memory doesn't scale; a guard does.

### 28. Check quickly while working, fully once
Lint and test the changed files during the work; run the whole suite once
when it's done. Batch fixes into one push.

### 29. Review your own work the way a skeptic would, security first
Before handing anything over: can one person reach another's data, is
outside input trusted, are there caps on cost and flooding, is personal data
leaving without saying so, is a grant broader than the job needs, can a sync
silently delete history?

### 30. Short sessions, one task each
End a session by saying what changed and what's next. Check the branch and
`git status` before assuming state. One branch is one complete, tested change.
