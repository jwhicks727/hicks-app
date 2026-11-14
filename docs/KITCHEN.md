# The Kitchen

Jason's cooking, as he ran it in his meal-planning chat since mid-2026 and as
the app now holds it. This is the part of that handoff that belongs in the
repository: the household's pattern, the weekly rhythm, the recipe format and
the Kitchen's design. **Laurie's food rules are not here.** They are health
information: they live in the database, readable by Jason and Laurie only,
and reach Claude only on a parent's request (CLAUDE.md, "The family's data").

## The household and the pattern

- **Jason** cooks: confident, well equipped, often tired, sometimes with sore
  hands. When his hands hurt, the week leans on the sheet pan, slow cooker,
  Instant Pot, no-cook, pre-cut and frozen produce, scissors over knives and
  parchment. The cookbook's "Easy on the hands" filter finds those recipes.
- **Laurie's** plate is the core of every dinner, never a compromise dish.
- **Anna**, 11, is adventurous and fickle; nuggets in the freezer mean a miss
  is never a crisis.
- **One dinner, three finishes:** the core dish satisfies Laurie completely;
  each other plate gets one simple addition. Every recipe ends with
  **Laurie's plate** (protein, and what was kept off), **Jason's plate**
  (where the alliums, acid and heat live: his crispy shallots and
  shallot-garlic oil, scallion-ginger relish, garlic confit, lemon, chili
  crisp, hot sauce) and **Anna's add-on**, the "daddy/daughter add-on" (never
  a "family upgrade"). The add-on slot may be meat; the core is pescatarian.
- **Fish:** only kinds an ordinary Southern California supermarket stocks all year
  (Trader Joe's first): salmon, cod, halibut, tilapia, mahi mahi, shrimp,
  scallops, canned or pouched tuna and salmon, sardines. Never trout, and
  nothing that needs a fish market or a special order.
- **The week:** ten one-line ideas covering Laurie's plate only, no day
  assignments ever; Jason picks three to six; the full recipes follow;
  ratings come later, often much later. Recipes he shops for go "in the
  fridge" and leave it when cooked.

## The recipe format

A contract: Jason has corrected deviations more than once, and the app reads
exactly this (`src/lib/kitchen/recipe.js`, tested in `tests/recipe.test.mjs`).

- `lowercase-with-dashes.md`, title as `# H1`.
- Near the top, exactly: `**Ratings —** L: /5 · J: /5 · A: /5` (breakfasts
  Laurie doesn't eat: `J: /5 · A: /5`).
- **Total time**, padded generously, with hands-on time in parentheses;
  **Serves**.
- One ingredient list, grouped by single blank lines with no headers:
  produce and fresh herbs; protein; the per-person add-ons; pantry, spices
  and refrigerated. Precise amounts (oz, cups, Tbsp, tsp), never "1
  package", never pre-prepped forms ("cucumber, chopped": the chopping is a
  step). Chat previews collapse the blank lines; Obsidian, and the app, keep
  them.
- Steps as literal bold numbers in plain paragraphs, never a Markdown
  ordered list: `**1. (3 min)** Heat the oven…`. A time on every step;
  amounts repeated inline and bold ("add the **2 Tbsp curry paste**"); prep
  woven in at the smart moment; every ingredient used in a step; grams beside
  volume for baking.
- Closing sections, in this order, leaving out what doesn't apply:
  **Plating**, **Laurie's plate**, **Jason's plate**, **Anna's add-on**,
  **Heat**, **Herbs** (cilantro only where the cuisine fits, always on the
  side, always with an alternate), **Texture**, **Trader Joe's shortcuts**,
  **Notes**, **Why it works** (the technique argument, naming the one step
  that decides it).
- Voice: technique-forward and opinionated, like Bittman or NYT Cooking.
  Mechanisms, not just instructions. No padding: he reads fast and cooks
  tired.

## How the app holds it

- **Recipes** are stored as the file Jason writes, less Laurie's plate,
  which is split out into `recipe_private` (parents only). A recipe opened
  again from Obsidian with the same title replaces the old one.
- **The recipe page** (`/kitchen/recipe/<slug>`): its three pictures (the
  Food Icon Pack, coloured in to each drawing's own outline), time and
  hands-on time, "Dinner at … start by …", ratings (each of us taps only our
  own), the three plates, the **cook check**, ingredients with their
  pictures to tick off as they come out, steps with a timer on each time,
  then the closing sections, Why it works set apart.
- **The cook check** lists the fresh things most likely to have turned,
  fastest first, from how long each keeps and how many days the recipe has
  been in the fridge (since it was shopped for), with how to tell (`KEEPS` in
  `src/lib/kitchen/food.js`). "Good" or "Gone" for each; a gone one says to
  swap it or pick more up.
- **Cook mode** (`…/cook`): one step at a time in big type, its timer a tap
  away, the ingredients a tap away, the screen kept awake; swipe or the big
  buttons to move; Back leaves it. It ends on the plating and the three
  plates. In each step the amounts **and the ingredients it names** are
  picked out in the same bold colour, matched against the recipe's own
  ingredient list (`stepParts` in `src/lib/kitchen/recipe.js`): "whisk **3
  Tbsp** **peanut butter** with the **hoisin sauce**". The recipe page's
  steps do the same.
- **Timers** are kept on the device as their end times, so one started
  before the phone closed the app is still right; each chimes and buzzes
  once.
- **Photos in the chat, and what's on hand.** The Kitchen chat's "Add photos" attaches up to four pictures of what
  is in the house. Claude reads them once (`note_on_hand` proposes each thing with its amount, where it lives and a note); a
  parent's yes keeps the list on the open plan (`week_plans.on_hand`), and the weekly planner and the recipe writer cook
  around it (`kitchenNow`). The planner's On hand card lists it, each item removable. Photos are never stored (the chat's
  history keeps only a count), and people in a photo are never described.
- **Home** shows what's still in the fridge, and how many dishes are still
  to shop for, only while there are some.
- **Food pictures.** Each ingredient's drawing (the Food Icon Pack's line
  drawing, never changed) has its colour underneath, filling the whole
  drawing: `scripts/food-fills.py` works the shapes out from the ink, closing
  the small gaps where a line stops short of another, so a lime, a cilantro
  sprig or a head of lettuce is coloured all over, while thin stems stay
  ink. Every drawing's colour is chosen for it by name in
  `src/lib/kitchen/food.js` (`COLOURS`, from one small palette), never from
  a word inside its name. Forty-odd fruits and vegetables have their stems,
  leaves or husk in green (`SECOND`, with the points that pick those regions
  in `scripts/food-fills.json`); the avocado's pit is brown. Accents are read
  ("Gruyère"), and a nut butter is its nut. To change a colour, move the name
  to another list in `COLOURS`; to change a shape, adjust
  `scripts/food-fills.json` and run the script (`--show DIR` draws each
  drawing's regions, numbered). `tests/food-icons.test.mjs` checks them.
- **Keepers and unicorns.** A recipe everyone who rated it gave 4 or 5 (two
  of us at least) is a keeper; all three of us giving it 5 is a unicorn,
  celebrated with its own light and badge, and again the moment the third 5
  lands. Both come back on "Make it again" once they haven't been cooked in
  three weeks, unicorns first (`src/lib/kitchen/week.js`).
- **Hunt & gather, then the fridge.** "Add to this week" (on a recipe, or
  "And add them to this week" when saving the planner's recipes) puts a dish
  on the **Hunt & gather** card first: picked, still to shop for. Its likely
  shopping list is there with it, worked out from the ingredients of those
  dishes only: **Probably buy** (produce and herbs, protein, fresh dairy and
  bread) and **Check the pantry** (fridge staples like miso, Parmesan and
  chili crisp; the freezer; the shelves), each line saying which dish needs
  how much.
  - Crossing a thing off takes it off the list at once, with an Undo. Once a
    dish has everything, it moves into the fridge by itself; when the list is
    empty the card goes with a poof, and nothing asks again.
  - "Into the fridge" on a dish moves just that one; "Done shopping" moves
    them all, crossed off or not; on the recipe page a dish still to shop
    for has "Shopped: into the fridge" and "Not this week".
  - It is all kept in the database (`fridge.bought_on`, `fridge_got`), so
    every phone sees the same list and nothing is remembered on a device.
    A dish added later brings back only its own share of something already
    crossed off. Only Jason and Laurie cross things off; Anna sees the list.
  - "Bought 3 days ago" and the cook check count from the day a dish went
    into the fridge, not the day it was picked.
- **Rating, after.** For four days after a dinner is cooked, each of us is
  asked "How was it?" on Home and in the Kitchen, with stars to tap, until
  we've rated it or said "Not now".

## Technique worth keeping

From the handoff, for the recipes and for whoever writes them:

- Convection: reduce 25°F **or** cut time 25%, never both; convect roast
  browns better than convect bake.
- Oven bacon: cold start, 400°F, 17–22 min, foil and parchment, no rack.
- Roast frozen vegetables from frozen at 400–425°F.
- Salt summer squash and blot it before it meets heat; salt anything
  sweet-vegetable harder than feels right.
- Scallops: cold-water thaw, bone-dry, ten minutes on paper towels.
  Lobster tails: thaw fully, butterfly with shears, 135–140°F.
- Tofu: never press. Super-firm, drained, patted dry, four minutes
  undisturbed. Seitan: tear, don't cut.
- Bloom dry spice and curry paste 60–90 seconds in fat; give a long braise a
  second hit of spice at the end.
- Trader Joe's is the default store; slow cooker, Instant Pot, convection
  oven and broiler are all at hand. Expensive proteins sometimes wait for
  payday.

## Planning the week, the rules, and asking Claude

- **Weekly planner** (`/kitchen/plan`, Jason and Laurie):
  1. Ask for ideas: ten unless changed, and anything added to the ask
     ("three breakfasts too", "a slow-cooker night", "my hands are sore
     this week").
  2. Claude gives one-line ideas covering Laurie's plate, never assigned to
     days. Keepers coming back are marked "Again".
  3. Tap the ones to make. Tend the list as you go: "Add an idea" asks
     for one more and puts it at the end; "Refresh the list" keeps the
     picked ones where they are and swaps every other one for something
     new; the ✕ beside an idea takes it off at once, with an Undo for a
     few seconds rather than a question. New ideas never repeat one on the
     list or one taken off it this visit. "Start over with new ideas"
     wipes the list, so it asks first (the old list stays in the
     database as that week's earlier version).
     "Clear list" empties the list without asking for new ideas, and
     asks first too.
  The list can be texted to Laurie or to Anna in one tap (each number is
  kept once, in the parents-only `member_phones` table; Anna's is her
  Apple Watch's). Whoever answers "1, 3, 8", you type it under "Their
  reply".
  4. "Write the picked" writes them in full, in the format above.
  5. Read them, then save them to the cookbook, and to the fridge if you
     like.

  The ask is kept on the device. The ideas and picks are kept with the plan
  (`week_plans`), and so are the written recipes (`week_plan_recipes`,
  parents only, and on the device too). **A plan is never looked up by the
  calendar week**: the newest plan nobody has put away is the open one, so a
  list waiting for Laurie's answer is still here a week later, marked "from the
  week of 10/25". "Put this list away" (it asks first) and "Start over" are the
  only ways it goes; the old plan stays in the database.
- **Rules & preferences** (`/kitchen/rules`):
  - **The kitchen's preferences:** tastes, dislikes, what's loved lately,
    the pantry, the equipment. The family reads them; the parents change
    them.
  - **Laurie's food rules:** only Jason and Laurie see them.

  Every change is a new, dated version with a note of what changed; the
  old ones stay.
- **Laurie's rules and Claude:** they go to Claude when Jason or Laurie plan
  the week, write recipes or ask in the Kitchen chat, so every dinner's core
  satisfies them, and never on anyone else's request. (There used to be a
  sign-off switch for Laurie; it was dropped, decisions log 2026-11-01.)
- **Ask, from anywhere in the Kitchen:** the red button opens a
  conversation with Claude. It sees:
  - what you type;
  - the preferences;
  - the cookbook's titles and ratings;
  - the recipe you're on;
  - Laurie's rules, when a parent is asking.

  Anything it suggests saving comes as a card to confirm: a change to the
  preferences or the rules, a recipe for the cookbook, ideas for the week.
  The conversation stays on the device until "New".
- **Claude is always the latest Sonnet,** within the family's budget
  (docs/DATABASE.md, "Claude").

## Still to build

- `check_plate`: a recipe checked against Laurie's rules.
- `adapt`, the substitution engine.

## Photographed recipes, and fixing recipes by chat

- A photo or screenshot on **Add recipes** is read by Claude with Laurie's
  food rules and the preferences. It is shown beside its picture with "Look
  at these" (conflicts with her rules, guesses), editable, and saved only
  after you tick that it matches the picture.
- **Ask** (the chat, from anywhere in Kitchen) can open any recipe in the
  cookbook by name and read it whole, Laurie's plate too for a parent. On a
  recipe's page, "Check this one against Laurie's rules" starts it. When it
  suggests a fix, the card shows what's saved against the new version,
  line by line; **Save it** replaces that recipe (ratings and fridge stay).
  The same comparison shows for changes to the rules and preferences.
