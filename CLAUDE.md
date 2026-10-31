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
- **Laurie's food rules are health information.** Only Jason and Laurie see
  them; they never reach the wall; Claude receives them only with Laurie's
  yes, said on screen. They live in the database, never in this repository.
- **Family days** (birthdays, anniversaries, Anna's adoption day, the
  angelversary) stay inside the app and its private pages. Never in an issue,
  a PR title or anything public.
- Logins are held only with their owner's yes, and the app never signs in to
  Amazon (decisions log).
- No invented data in the real app: no stand-in numbers. If the real source
  isn't connected yet, the part says what's coming instead.

## The look

- Phone first, with the desktop built to match. Test at 390px wide and at
  844 × 390 (a phone held sideways). Nothing scrolls sideways.
- The sky of the hour sits behind everything; cards are warm paper with a
  blush of their place's colour; corners are nearly square (4px controls,
  6px cards; the floating tab bar is the one rounded exception).
- Fonts: Shrikhand for the loud moments, Caprasimo for headings and big
  numbers, Nunito for everything read or tapped. Never a font SOAR uses
  (Fraunces, Instrument Sans, Russo One, Atkinson Hyperlegible), and no
  handwriting faces.
- Colour means something: each place has its own. A shine in a place's own
  colour means something is waiting on you; a rainbow gleam means something
  wonderful happened. Rare, one at a time.
- Art is human-made, with its source and licence recorded in README.md. No
  AI-made art. Laurie's paintings replace photos wherever she has painted the
  thing.
- Animations are welcome. Under the device's Reduce Motion they become a
  gentle fade or stop (`src/lib/motion.js`). No `filter: blur()` on anything
  large: iPhones repaint it slowly. Soft shapes come from gradients.

## How it's built

- React and Vite, plain JavaScript. Logic with no React lives in `src/lib/`
  so `npm test` can run it in Node.
- Every screen has an address (`/world/school/soar`) and an in-app Back walks
  the same history as the browser's (`src/lib/router.js`). Filters, sorts and
  layouts stay out of the address.
- Touch is not a mouse: nothing works only on hover or by dragging. Tap
  targets about 44px.
- Before calling a change done: `npm test`, `npm run build`, and a look at
  390px and on a desktop.
- Docs ship with the change: a decision goes in the decisions log the same
  day, and the plan says what moved.
