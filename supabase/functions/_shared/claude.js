// ============================================
// claude.js -- what the `claude` function asks, of which model, within what limits
// ============================================
// Plain JavaScript so tests/claude.test.mjs runs it in Node. The function
// (supabase/functions/claude/index.ts) does the asking; this decides the
// model, the tasks, their schemas and tools, what each may send, and the
// cost. Personal data reaches Claude only as the screen that asks says it
// will, and Laurie's food rules only on a parent's request (Jason's or Laurie's).

// ---- The model: always the latest Sonnet ----------------------------------------
// The app never names a model version. It asks the Models API which Sonnets
// are active and takes the newest, so a new Sonnet is used the day it
// arrives. FALLBACK_SONNET is only for when the list can't be read.
export const FALLBACK_SONNET = 'claude-sonnet-5-5'

/** The newest active model of a family ('sonnet') from a Models API list. */
export function pickLatest(models, family = 'sonnet') {
  const ok = (models || []).filter((m) => m && typeof m.id === 'string' && m.id.startsWith(`claude-${family}-`) &&
    (!m.status || m.status === 'active') && !m.deprecated_at)
  ok.sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0))
  return ok.length ? ok[0].id : null
}

// ---- Cost, for the caps --------------------------------------------------------
// Dollars per million tokens for the family; a newer Sonnet is taken to cost
// the same until this says otherwise (docs/SECRETS.md, the spending caps).
export const PRICES = { sonnet: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 } }
export const CAPS = { dayCents: 300, monthCents: 3000 } // $3 a day, $30 a month, unless set otherwise

/** Cents for a response's usage (every attempt, if a fallback ran). */
export function costCents(usage, price = PRICES.sonnet) {
  if (!usage) return 0
  const parts = Array.isArray(usage.iterations) && usage.iterations.length ? usage.iterations : [usage]
  let dollars = 0
  for (const u of parts) {
    dollars += ((u.input_tokens || 0) * price.input + (u.output_tokens || 0) * price.output +
      (u.cache_read_input_tokens || 0) * price.cacheRead + (u.cache_creation_input_tokens || 0) * price.cacheWrite) / 1e6
  }
  return Math.round(dollars * 100 * 10000) / 10000
}
/** Whether another call fits under the caps: null if so, otherwise why not. */
export function overCap(spend, caps = CAPS) {
  if (!spend) return null
  if (Number(spend.today_cents) >= caps.dayCents) return 'Today’s Claude budget is used up. It starts again tomorrow.'
  if (Number(spend.month_cents) >= caps.monthCents) return 'This month’s Claude budget is used up.'
  return null
}

// ---- Pictures and documents sent with a request ---------------------------------
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
/** Why a picture can't be sent, or null. A PDF only where the task takes documents. */
export function checkUpload(f, { pdf = false } = {}) {
  if (!f || typeof f.data !== 'string' || typeof f.media_type !== 'string') return 'Something to read is missing'
  const isPdf = f.media_type === 'application/pdf'
  if (!IMAGE_TYPES.includes(f.media_type) && !(pdf && isPdf)) return pdf ? 'A picture or a PDF, please' : 'A picture, please (JPEG, PNG, WebP or GIF)'
  if (!/^[A-Za-z0-9+/]+=*$/.test(f.data)) return 'That file didn’t come through whole'
  const bytes = Math.floor((f.data.length * 3) / 4)
  if (bytes > (isPdf ? 20 : 5) * 1024 * 1024) return isPdf ? 'That PDF is over 20 MB' : 'That picture is over 5 MB; the app shrinks pictures first, so try again'
  return null
}
export const uploadBlock = (f) => ({ type: f.media_type === 'application/pdf' ? 'document' : 'image', source: { type: 'base64', media_type: f.media_type, data: f.data } })
/** Several pictures sent together (a painting and its corners): one to `max`, each valid, under 12 MB in all. */
export function checkUploads(files, max = 5) {
  if (!Array.isArray(files) || !files.length || files.length > max) return `One to ${max} pictures, please`
  let total = 0
  for (const f of files) { const why = checkUpload(f); if (why) return why; total += f.data.length }
  if ((total * 3) / 4 > 12 * 1024 * 1024) return 'Those pictures are too big together; the app shrinks them first, so try again'
  return null
}

// ---- The Kitchen's standing brief: the household and the format (docs/KITCHEN.md) ----
export const KITCHEN_BRIEF = `You help Team Hicks in their kitchen app. Jason cooks; Laurie and their daughter Anna (11) eat with him.

The household's pattern:
- Laurie's plate is the core of every dinner, never a compromise dish. The core is pescatarian.
- One dinner, three finishes: the core dish satisfies Laurie completely; each other plate gets one simple addition. Every recipe ends with Laurie's plate, Jason's plate (alliums, acid and heat live there: crispy shallots, shallot-garlic oil, scallion-ginger relish, garlic confit, lemon, chili crisp, hot sauce) and Anna's add-on (the "daddy/daughter add-on", which may be meat).
- Jason is confident and well equipped but often tired, sometimes with sore hands: then the week leans on the sheet pan, slow cooker, Instant Pot, no-cook, pre-cut and frozen produce, scissors over knives.
- Anna is adventurous and fickle; nuggets in the freezer mean a miss is never a crisis.
- The week: one-line ideas covering Laurie's plate only, never assigned to days; Jason picks some; full recipes follow.
- Trader Joe's is the default store. Expensive proteins sometimes wait for payday.
- Fish and shellfish: only kinds an ordinary Southern California supermarket stocks all year, Trader Joe's first: salmon, cod, halibut, tilapia, mahi mahi, shrimp, scallops, canned or pouched tuna and salmon, sardines and the like. Never trout, and nothing that needs a fish market or a special order.

The recipe format is a contract Jason has corrected more than once:
- Title as "# Title". Then exactly: "**Ratings —** L: /5 · J: /5 · A: /5" (breakfasts Laurie doesn't eat: "J: /5 · A: /5").
- **Total time** padded generously, with hands-on time in parentheses; **Serves**.
- One ingredient list, every ingredient on its own line as a Markdown bullet ("- 6 oz salmon"), grouped by single blank lines with no headers: produce and fresh herbs; protein; the per-person add-ons; pantry, spices and refrigerated. Precise amounts (oz, cups, Tbsp, tsp), never "1 package", never pre-prepped forms (the chopping is a step).
- Steps as bold numbers in plain paragraphs, never a Markdown list: "**1. (3 min)** Heat the oven…". A time on every step; amounts repeated inline and bold; every ingredient used; grams beside volume for baking.
- Closing sections in this order, leaving out what doesn't apply: **Plating**, **Laurie's plate**, **Jason's plate**, **Anna's add-on**, **Heat**, **Herbs** (cilantro only where the cuisine fits, always on the side, with an alternate), **Texture**, **Trader Joe's shortcuts**, **Notes**, **Why it works** (the technique argument, naming the one step that decides it).
- Voice: technique-forward and opinionated, like Bittman or NYT Cooking. Mechanisms, not just instructions. No padding: he reads fast and cooks tired.

Technique they keep: convection means reduce 25°F or cut time 25%, never both; roast frozen vegetables from frozen at 400–425°F; salt summer squash and blot it; scallops bone-dry; tofu never pressed, super-firm, four minutes undisturbed; bloom spice and curry paste 60–90 seconds in fat.

Laurie's food rules decide her plate. Whenever you read, write or change a recipe, check every ingredient that reaches her plate against them, including what hides in sauces, spice blends, broths, stocks and canned or jarred goods, and say plainly what conflicts and what to do instead. Never call a dish safe for her when her rules aren't in front of you.

How to talk: warmly and briefly, like a friend who cooks. Plain sentences. To look at a recipe in the cookbook, open it with read_recipe rather than guessing what it says. When something would change their saved preferences, Laurie's food rules, a recipe in the cookbook or this week's list, use the matching tool to propose it: nothing is saved until someone in the family confirms it on screen. Never invent a rating or a past dinner.`

/** The parts of the system prompt that change: what they've told the app, and what's in the kitchen now. */
export function kitchenNow({ today, preferences, rules, recipes = [], fridge = [], plan, page, garden = [] } = {}) {
  const lines = [`Today is ${today}.`]
  lines.push(preferences ? `The family's kitchen preferences, as last saved:\n${preferences.slice(0, 8000)}` : 'The family hasn’t saved any kitchen preferences yet.')
  if (rules) lines.push(`Laurie's food rules (private to Jason and Laurie; every dinner's core must satisfy them):\n${rules.slice(0, 8000)}`)
  else lines.push('Laurie’s food rules aren’t part of this conversation (they’re only for Jason’s and Laurie’s own requests, or none have been saved yet). Don’t guess at them; if a question needs them, say so.')
  if (recipes.length) lines.push('Their cookbook (title · average stars · last cooked):\n' + recipes.slice(0, 80).map((r) => `- ${r.title}${r.stars ? ` · ${r.stars}` : ''}${r.last ? ` · ${r.last}` : ''}`).join('\n'))
  if (fridge.length) lines.push('In the fridge to cook this week: ' + fridge.slice(0, 12).join('; '))
  if (garden.length) lines.push('From their own garden lately (worth cooking with): ' + garden.slice(0, 12).join('; '))
  if (plan && plan.ideas && plan.ideas.length) lines.push('This week’s ideas so far: ' + plan.ideas.slice(0, 20).map((i) => i.title).join('; '))
  if (page && page.recipe) lines.push(`They're looking at this recipe now (slug ${page.slug}):\n${page.recipe.slice(0, 16000)}`)
  return lines.join('\n\n')
}

// ---- Schemas for answers that come back as data ----------------------------------
const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, required, properties })
const str = { type: 'string' }, int = { type: 'integer' }, bool = { type: 'boolean' }
const MEALS = ['dinner', 'breakfast', 'lunch', 'snack', 'dessert', 'other']

export const IDEAS_SCHEMA = obj({ ideas: { type: 'array', items: obj({ title: str, line: str, meal: { type: 'string', enum: MEALS }, again: bool }) } })
export const PHOTO_RECIPE_SCHEMA = obj({ recipes: { type: 'array', items: obj({ title: str, body: str, total_minutes: int, hands_on_minutes: int, serves: int, tags: { type: 'array', items: str }, checks: { type: 'array', items: str } }) } })
export const RECIPES_SCHEMA = obj({ recipes: { type: 'array', items: obj({ title: str, body: str, total_minutes: int, hands_on_minutes: int, serves: int, tags: { type: 'array', items: str } }) } })
export const EVENTS_SCHEMA = obj({
  title: str, notes: str,
  events: { type: 'array', items: obj({ title: str, starts_on: str, ends_on: str, time: str, kind: { type: 'string', enum: ['no_school', 'school', 'event', 'other'] }, note: str }) },
})
// Laurie's painting: what her signature says, the year written with it, a working title, its medium, the seasons it
// suits, and whether it lies sideways. The season keys are src/lib/seasons.js's (tests/painting-batch.test.mjs keeps them in step).
export const PAINTING_SEASONS = { christmas: 'Christmas', advent: 'Advent', easter: 'Easter', lent: 'Lent', muertos: 'the Day of the Dead', halloween: 'Halloween', thanksgiving: 'Thanksgiving', valentine: 'Valentine’s Day', july4: 'the Fourth of July', 'back-to-school': 'back to school', summer: 'summer', spring: 'spring', fall: 'fall', winter: 'winter' }
export const PAINTING_SCHEMA = obj({
  signature: str, written: str, year: int, legible: { type: 'string', enum: ['clear', 'unsure', 'none'] }, title: str, medium: str,
  seasons: { type: 'array', items: { type: 'string', enum: Object.keys(PAINTING_SEASONS) } }, turn: int,
})
// Anna's drawing: a working title, whether it's about the pets, any day written on it, and whether it lies sideways
export const DRAWING_SCHEMA = obj({ title: str, topic: { type: 'string', enum: ['pets', 'none'] }, written_date: str, turn: int })
export const GARDEN_SCHEMA = obj({
  plants: { type: 'array', items: obj({ name: str, confidence: { type: 'string', enum: ['low', 'medium', 'high'] } }) },
  health: { type: 'string', enum: ['thriving', 'fine', 'watch', 'trouble', 'unsure'] },
  summary: str, findings: { type: 'array', items: str }, care: { type: 'array', items: str }, water: str, harvest: str, next_look: str,
})

// ---- Tasks: who may ask, how hard to think, what comes back ------------------------
export const TASKS = {
  'kitchen-chat': { who: 'family', effort: 'low', maxTokens: 8000, says: 'your message, and the kitchen’s preferences and cookbook titles' },
  'plan-week': { who: 'parent', effort: 'medium', maxTokens: 8000, schema: IDEAS_SCHEMA },
  'write-recipes': { who: 'parent', effort: 'medium', maxTokens: 64000, stream: true, schema: RECIPES_SCHEMA },
  'recipe-from-image': { who: 'parent', effort: 'medium', maxTokens: 16000, schema: PHOTO_RECIPE_SCHEMA, upload: true },
  'calendar-from-image': { who: 'parent', effort: 'low', maxTokens: 16000, schema: EVENTS_SCHEMA, upload: true, pdf: true },
  'garden-photo': { who: 'family', effort: 'medium', maxTokens: 8000, schema: GARDEN_SCHEMA, upload: true },
  // Reads only: the year by her signature and a working title, for a parent to check on screen (src/places/lifelist/AddPaintings.jsx)
  // Reads only: a working title, the topic and any day written on one of Anna's drawings, for whoever is adding it to check on screen (src/places/AddDrawings.jsx)
  'read-drawing': { who: 'family', effort: 'low', maxTokens: 1500, schema: DRAWING_SCHEMA, upload: true, says: 'the cropped photo of her drawing; back come a working title, whether it is about the pets, and any day written on it' },
  'read-painting': { who: 'parent', effort: 'medium', maxTokens: 4000, schema: PAINTING_SCHEMA, uploads: 5, says: 'the cropped photo of her painting, and its four corners enlarged; back come a working title, the year by her signature, its medium and seasons' },
  // What's around here (supabase/functions/_shared/around.js): written by itself when one of us is away or a trip is coming
  'around-here': { who: 'family', effort: 'medium', maxTokens: 16000, says: 'the town you’re in, the area to about ten kilometres, and the family’s interests from Settings' },
  // Where Laurie can eat well near here: a parent's ask, with her food rules (as for any recipe); the answer isn't kept
  'eat-well': { who: 'parent', effort: 'medium', maxTokens: 8000, says: 'Laurie’s food rules, the town and the area to about ten kilometres' },
}

// ---- The Kitchen chat's tools: proposals only, confirmed on screen ------------------
export function kitchenTools({ canRules = false } = {}) {
  const t = (name, description, input_schema) => ({ name, description, strict: true, input_schema })
  const tools = [
    t('propose_preferences', 'Propose a new version of the family’s saved kitchen preferences (tastes, dislikes, pantry, equipment, habits). Give the whole new text, and a one-line summary of what changed. Shown to the family to confirm; nothing is saved until they do.', obj({ text: str, summary: str })),
    t('read_recipe', 'Open a recipe in their cookbook and read the whole of it (for Jason or Laurie, Laurie’s plate too). Give its title as the cookbook lists it.', obj({ title: str })),
    t('propose_recipe', 'Propose adding a new recipe to the cookbook, written in Jason’s format. Shown to confirm before it is saved.', obj({ title: str, body: str })),
    t('propose_recipe_change', 'Propose a changed version of a recipe already in the cookbook: its slug (from read_recipe or the page), the whole new Markdown file in Jason’s format with every section kept (Laurie’s plate included), and a one-line summary of what changed. Shown side by side with the saved version; nothing is saved until they confirm.', obj({ slug: str, body: str, summary: str })),
    t('add_ideas', 'Propose one-line ideas to add to this week’s list. Shown to confirm before they are added.', obj({ ideas: { type: 'array', items: obj({ title: str, line: str, meal: { type: 'string', enum: MEALS } }) } })),
  ]
  if (canRules) tools.push(t('propose_food_rules', 'Propose a new version of Laurie’s food rules. Give the whole new text and a one-line summary of what changed. Only Jason or Laurie can confirm it; the old version is kept.', obj({ text: str, summary: str })))
  return tools
}

// ---- What a request may carry --------------------------------------------------------
/** The chat history from the app, checked: alternating turns, a sane size, pictures valid. */
export function checkHistory(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 60) return 'A conversation of 1 to 60 turns, please'
  if (JSON.stringify(messages).length > 6_000_000) return 'That conversation is too long; start a new one'
  if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') return 'The conversation must start and end with you'
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return 'Each turn is yours or Claude’s'
    if (typeof m.content === 'string') continue
    if (!Array.isArray(m.content)) return 'A turn’s content is text or blocks'
    for (const b of m.content) if (b && b.type === 'image') { const why = checkUpload({ data: b.source && b.source.data, media_type: b.source && b.source.media_type }); if (why) return why }
  }
  return null
}

// ---- The asks that aren't a conversation ----------------------------------------------
export function planAsk({ count = 10, asked = '', avoid = [], skip = [] }) {
  const n = Math.max(1, Math.min(20, Number(count) || 10))
  const no = (Array.isArray(skip) ? skip : []).map((t) => String(t).trim().slice(0, 160)).filter(Boolean).slice(0, 60)
  return `Give ${n === 1 ? 'one one-line dinner idea' : `${n} one-line dinner ideas`} for this week, covering Laurie's plate only, never assigned to days.` +
    (asked ? ` Also: ${String(asked).slice(0, 1500)}` : '') +
    (avoid.length ? `\nRecently cooked (vary from these unless they're keepers): ${avoid.slice(0, 40).join('; ')}` : '') +
    (no.length ? `\nAlready on this week's list, or taken off it (give different ones): ${no.join('; ')}` : '') +
    '\nMark again: true for any that is one of their keepers coming back. Make every idea specific enough to picture.'
}
export function writeAsk({ ideas = [] }) {
  return 'Write these as full recipes in Jason’s format, every closing section that applies, the body as the whole Markdown file:\n' +
    ideas.slice(0, 8).map((i, k) => `${k + 1}. ${i.title}${i.line ? ` — ${i.line}` : ''}`).join('\n')
}
export const RECIPE_FROM_IMAGE_ASK = 'This is a recipe, photographed or screenshotted. Rewrite it in Jason’s format as one recipe, keeping its amounts and method faithfully, and say in Notes what you changed. Write only what the source says: the ingredient list is exactly the source’s ingredients (never add a protein, a garnish, a shallot, a chili crisp, a lemon or any ingredient it doesn’t have) and its steps are its steps; make no Jason’s plate or Anna’s add-on of your own, and no sections the source doesn’t have. Always write Laurie’s plate: check every ingredient against her food rules (what’s in the sauces, blends and canned goods too) and say exactly what her plate leaves out or swaps. In checks, list what Jason should look at before saving it, one short line each: every conflict with Laurie’s rules, and anything you had to guess (a word you couldn’t read, a missing amount, time or temperature). An empty list only when there is truly nothing. If it isn’t a recipe, return no recipes.'

/**
 * The recipe read_recipe means: the same title (any case), else the one title
 * containing it, else the one sharing the most words with it. Null when unsure.
 */
export function findRecipe(list = [], wanted = '') {
  const norm = (t) => String(t).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
  const w = norm(wanted)
  if (!w) return null
  const exact = list.filter((r) => norm(r.title) === w)
  if (exact.length) return exact[0]
  const inside = list.filter((r) => norm(r.title).includes(w) || w.includes(norm(r.title)))
  if (inside.length === 1) return inside[0]
  const words = new Set(w.split(' ').filter((x) => x.length > 2))
  let best = null, score = 0, tie = false
  for (const r of list) {
    const n = norm(r.title).split(' ').filter((x) => words.has(x)).length
    if (n > score) { best = r; score = n; tie = false } else if (n === score && n > 0) tie = true
  }
  return score >= Math.min(2, words.size) && !tie ? best : null
}
export function calendarAsk({ hint = '', year }) {
  return `This is a calendar, a schedule or a flyer. List every dated event in it. Dates as YYYY-MM-DD (assume ${year} or the school year shown when the year is missing); an event spanning days has its last day in ends_on, otherwise ends_on equals starts_on. time is HH:MM in 24-hour time, or empty for all day. kind: no_school for holidays and days off, school for school events, otherwise event. Keep only what's written; never invent one. Put the document's own title in title.` + (hint ? `\nAbout it: ${String(hint).slice(0, 500)}` : '')
}
export function gardenAsk({ spot = '', plants = [], indoor = false, question = '', month }) {
  return `This is a photo from the family's ${indoor ? 'indoor plants' : 'garden'} in Fontana, California (inland Southern California, USDA zone 9b–10a, hot dry summers, Santa Ana winds, frost rare). It's ${month}.` +
    (spot ? ` It's of ${spot}.` : '') + (plants.length ? ` They've said it holds: ${plants.slice(0, 20).join(', ')}.` : '') +
    ' Name the plants you see, judge their health honestly, and give care that fits this climate and season: plain, specific, a few lines each. Say plainly when you can’t tell from the photo.' +
    (question ? `\nTheir question: ${String(question).slice(0, 800)}` : '')
}

// ---- Laurie's paintings: the year by her signature, and a working title -----------------
/** What each picture of a painting is, in the order the app sends them. */
export const PAINTING_PARTS = ['The whole painting:', 'Its top-left corner, enlarged:', 'Its top-right corner, enlarged:', 'Its bottom-left corner, enlarged:', 'Its bottom-right corner, enlarged:']
export function paintingAsk({ titles = [], year }) {
  const used = (Array.isArray(titles) ? titles : []).map((t) => String(t).replace(/\s+/g, ' ').trim().slice(0, 80)).filter(Boolean).slice(0, 200)
  return `These are photos of one painting by Laurie, who paints for the family. The first is the whole painting; the others are its corners enlarged, where she usually signs and often dates her work.

1. Find her signature. In signature, write what it says, exactly as painted (initials, a name, a date); empty if you see none.
2. In written, copy the date painted with her signature exactly as it appears ("'19", "2019", "6/21"), or empty if there is none. Read only what is painted there: never estimate a date from the style, the subject or anything else. In year, give the four-digit year that date means (a two-digit year is the one not in the future; it is ${year} now), or 0 when nothing is written. legible: clear when you can read every digit with confidence, unsure when any digit is hard to make out, none when no date is written.
3. In title, give a working title until Laurie names it: two to five words in sentence case, plain and descriptive of what it shows, like "Autumn pond", "Autumn stream" or "The witch and the crow". Not poetic, no quotation marks.${used.length ? ` Make it different from her paintings' titles so far: ${used.join('; ')}.` : ''}
4. In medium, what it looks painted in and on, the way a gallery label says it: "Watercolor on paper", "Acrylic on canvas", "Oil on canvas board", "Gouache on paper". Judge it from the paint and the surface in the photo; the family checks it before it's saved. Empty if you truly can't tell.
5. In seasons, when in the year it would suit hanging on the family's home screen, from what it shows: autumn leaves are fall (and thanksgiving, for a harvest or a warm autumn scene); snow is winter; blossom and new green are spring; beaches and long bright days are summer; a witch, a black cat or a jack-o'-lantern is halloween; a nativity, a Christmas tree or holly is christmas. One or two, the most fitting first; none (an empty list) when it suits any time of year. The seasons: ${Object.entries(PAINTING_SEASONS).map(([k, v]) => `${k} (${v})`).join(', ')}.
6. In turn, if the painting is shown sideways or upside down (its signature or its subject says so), the degrees clockwise to turn it upright: 90, 180 or 270. Otherwise 0.`
}
/** The pictures, each with a line saying which part of the painting it is, then the ask. */
export function paintingContent(files, ask) {
  return [...files.slice(0, PAINTING_PARTS.length).flatMap((f, i) => [{ type: 'text', text: PAINTING_PARTS[i] }, uploadBlock(f)]), { type: 'text', text: ask }]
}

// ---- Anna's drawings: a working title, the topic, and any day written on it ---------------
/** What Claude is asked about a drawing. Her words are never asked for: they're what she said, not what a picture shows. */
export function drawingAsk({ titles = [], today }) {
  const used = (Array.isArray(titles) ? titles : []).map((t) => String(t).replace(/\s+/g, ' ').trim().slice(0, 80)).filter(Boolean).slice(0, 200)
  return `This is a photo of a drawing by a child in the family, Anna.

1. In title, give a working title: two to five words in sentence case, plain and warm, describing what the drawing shows, like "Three cats on the couch" or "A rainbow over the house". Describe what is drawn; do not take the names of people or pets from any writing on it. No quotation marks.${used.length ? ` Make it different from the titles so far: ${used.join('; ')}.` : ''}
2. In topic, "pets" if the main subject is a pet animal (a cat, a dog, a rabbit and the like), otherwise "none".
3. In written_date, if a date is written on the drawing, give it as YYYY-MM-DD (today is ${today}; a date is never in the future; if only a day and month are written, use this year, or last year if that would be in the future). Empty if no date is written. Read only what is written: never estimate a date from the style or anything else.
4. In turn, if the drawing is shown sideways or upside down, the degrees clockwise to turn it upright: 90, 180 or 270. Otherwise 0.`
}

