// ============================================
// gallery.js -- Laurie's gallery and Anna's Art: finding pieces by what they are, sorting them, and the walls that rotate
// ============================================
// Pure, so tests run it in Node (tests/gallery.test.mjs). The screens are
// src/places/lifelist/Gallery.jsx and src/places/Drawings.jsx, through the shared
// src/parts/ArtFinder.jsx; Anna's pieces come in as the same shape by `artOf`
// (src/lib/annasArt.js). What a piece can be found by:
//   - her own facts, or a parent's word on them: the year (and month), the medium, the seasons
//   - its colours and its shape, measured from her pixels (src/lib/artColour.js, src/lib/shapes.js)
//   - what Claude saw in it ("looks": what it shows, its mood, its style, its weather), read with
//     the photo and kept only once a parent has said it looks right; never her title, year or medium
// The featured wall changes every few days. Claude chooses one when it can
// (supabase/functions/_shared/claude.js, `feature-paintings`); until then, or when today's
// budget is spent, the app makes one from the facts above, so the wall never stands still.
import { SEASONS, SEASON_ORDER, windowsOf } from './seasons.js'
import { FAMILIES, FAMILY_ORDER, familiesOf, toneOf, TONES, rainbowKey } from './artColour.js'
import { SHAPES, shapeFamily } from './shapes.js'
import { seeded } from './scenes.js'
import { TOPICS } from './drawings.js'

// ---- What Claude may say a painting is like (the claude function's schema uses the same words) ----
export const MOODS = { cozy: 'Cozy', calm: 'Calm', joyful: 'Joyful', whimsical: 'Whimsical', spooky: 'Spooky', dreamy: 'Dreamy', bold: 'Bold', wistful: 'Wistful', festive: 'Festive', mysterious: 'Mysterious', romantic: 'Romantic', lively: 'Lively' }
export const STYLES = { realistic: 'Realistic', impressionistic: 'Impressionistic', abstract: 'Abstract', folk: 'Folk', illustrative: 'Illustrative', psychedelic: 'Psychedelic', minimal: 'Minimal' }
export const WEATHERS = { sunny: 'Sunny', rainy: 'Rainy', snowy: 'Snowy', stormy: 'Stormy', misty: 'Misty', night: 'At night', sunset: 'Sunset and dusk', none: 'No weather' }

const word = (t, n = 40) => String(t ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, n)

/** What Claude saw, as it may be kept: up to six things it shows (plain, lower case), up to three moods, one style, one weather. Null with nothing. */
export function cleanLooks(r) {
  if (!r || typeof r !== 'object') return null
  const subjects = [...new Set((Array.isArray(r.subjects) ? r.subjects : []).map((s) => word(s)).filter((s) => s && s.length > 1))].slice(0, 6)
  const moods = [...new Set((Array.isArray(r.moods) ? r.moods : []).filter((m) => MOODS[m]))].slice(0, 3)
  const style = STYLES[r.style] ? r.style : ''
  const weather = WEATHERS[r.weather] && r.weather !== 'none' ? r.weather : ''
  if (!subjects.length && !moods.length && !style && !weather) return null
  return { subjects, moods, style, weather }
}

/** A medium in one word for the filter: "Watercolor on paper" is Watercolor. */
export function mediumWord(medium) {
  const m = String(medium || '').toLowerCase()
  if (!m) return ''
  for (const [k, re] of [['Mixed media', /mixed|collage/], ['Watercolor', /water ?colou?r/], ['Gouache', /gouache/], ['Acrylic', /acrylic/], ['Oil', /\boils?\b/], ['Pastel', /pastel/], ['Crayon', /crayon/], ['Marker', /marker|felt.?tip/], ['Colored pencil', /colou?red pencil/], ['Ink', /\bink\b/], ['Pencil', /pencil|graphite|charcoal/], ['Paint', /paint|tempera/]]) if (re.test(m)) return k
  return 'Other'
}
/** Drawn or painted, from the medium: '' when it doesn't say (Anna's Art has both; her mother's are all painted). */
export function kindOf(medium) {
  const w = mediumWord(medium)
  if (['Watercolor', 'Gouache', 'Acrylic', 'Oil', 'Paint'].includes(w)) return 'painting'
  if (['Crayon', 'Marker', 'Colored pencil', 'Pencil', 'Ink', 'Pastel'].includes(w)) return 'drawing'
  return ''
}

/** The seasons a home date ('YYYY-MM-DD') is in, the specific ones first (the app's own order). */
export function seasonsOn(today) {
  const y = Number(String(today).slice(0, 4))
  return SEASON_ORDER.filter((k) => [y - 1, y, y + 1].some((yy) => windowsOf(k, yy).some((w) => w.from <= today && today <= w.to)))
}

// ---- Facets: what the gallery can be narrowed by ------------------------------------------
/** Everything a painting can be found by, worked out once. */
export function factsOf(p) {
  const looks = p.looks || {}
  return {
    colours: familiesOf(p.palette), tones: toneOf(p.palette), year: p.year ? String(p.year) : '', medium: mediumWord(p.medium),
    seasons: p.seasons || [], moods: looks.moods || [], subjects: looks.subjects || [], style: looks.style || '', weather: looks.weather || '',
    shape: shapeFamily(p.shape), topics: p.topics || [], kind: kindOf(p.medium),
  }
}

/** The filters, each with what a painting is checked against and how its choices are named, in the order the screen shows them. */
export const FACETS = {
  colour: { label: 'Colour', of: (f) => f.colours, name: (k) => (FAMILIES[k] ? FAMILIES[k].label : k), order: (k) => FAMILY_ORDER.indexOf(k) },
  tone: { label: 'Feel', of: (f) => f.tones, name: (k) => TONES[k] || k },
  mood: { label: 'Mood', of: (f) => f.moods, name: (k) => MOODS[k] || k },
  subject: { label: 'What it shows', of: (f) => f.subjects, name: (k) => k[0].toUpperCase() + k.slice(1), min: 2 },
  year: { label: 'Year', of: (f) => (f.year ? [f.year] : []), name: (k) => k, order: (k) => -Number(k) },
  season: { label: 'Season', of: (f) => f.seasons, name: (k) => (SEASONS[k] ? SEASONS[k].label : k), order: (k) => SEASON_ORDER.indexOf(k) },
  medium: { label: 'Medium', of: (f) => (f.medium ? [f.medium] : []), name: (k) => k },
  style: { label: 'Style', of: (f) => (f.style ? [f.style] : []), name: (k) => STYLES[k] || k },
  weather: { label: 'Weather', of: (f) => (f.weather ? [f.weather] : []), name: (k) => WEATHERS[k] || k },
  shape: { label: 'Shape', of: (f) => (f.shape !== 'rect' ? [f.shape] : []), name: (k) => (SHAPES[k] ? SHAPES[k].label : k), order: (k) => Object.keys(SHAPES).indexOf(k) },
  kind: { label: 'Drawn or painted', of: (f) => (f.kind ? [f.kind] : []), name: (k) => ({ drawing: 'Drawings', painting: 'Paintings' })[k] || k },
  topic: { label: 'About', of: (f) => f.topics, name: (k) => TOPICS[k] || k },
}

/**
 * The choices each filter offers for a list: { colour: [{ key, label, n }], ... }, each choice found in at least one
 * painting (two for what it shows, so one-off words don't crowd it), the commonest first unless the facet has its own order.
 * A facet is left out when there's nothing to choose between: no choices, or one that every painting has.
 */
export function facetsOf(list) {
  const facts = list.map(factsOf), out = {}
  for (const [key, f] of Object.entries(FACETS)) {
    const n = new Map()
    for (const x of facts) for (const v of new Set(f.of(x))) n.set(v, (n.get(v) || 0) + 1)
    let choices = [...n].filter(([, c]) => c >= (f.min || 1)).map(([k, c]) => ({ key: k, label: f.name(k), n: c }))
    choices.sort(f.order ? (a, b) => f.order(a.key) - f.order(b.key) : (a, b) => b.n - a.n || a.label.localeCompare(b.label))
    if (key === 'subject') choices = choices.slice(0, 16)
    if (choices.length >= 2 || (choices.length === 1 && choices[0].n < list.length)) out[key] = choices
  }
  return out
}

/** The paintings that match every filter chosen (one choice a facet), and the words typed in, if any. */
export function applyFilters(list, filters = {}) {
  const q = word(filters.q, 60)
  return list.filter((p) => {
    const f = factsOf(p)
    for (const [key, facet] of Object.entries(FACETS)) if (filters[key] && !facet.of(f).includes(filters[key])) return false
    if (q) {
      const hay = [p.title, p.medium, p.year, ...f.topics.map((t) => TOPICS[t] || t), ...f.subjects, ...f.moods, f.style, f.weather, ...f.seasons.map((s) => SEASONS[s] && SEASONS[s].label), ...f.colours.map((c) => FAMILIES[c].label)].map((x) => word(x, 200)).join(' · ')
      if (!q.split(' ').every((t) => hay.includes(t))) return false
    }
    return true
  })
}
/** How many filters are chosen (the typed words count as one). */
export const filterCount = (filters = {}) => Object.keys(FACETS).filter((k) => filters[k]).length + (word(filters.q) ? 1 : 0)

// ---- Sorting ------------------------------------------------------------------------------
export const SORTS = { added: 'Newest in', painted: 'Newest painted', oldest: 'Oldest painted', rainbow: 'By colour', title: 'A to Z', shuffle: 'Shuffled' }
/** The sorts in words for whoever made them: "Newest painted" for Laurie's, "Newest made" for Anna's. */
export const sortsFor = (verb = 'painted') => ({ ...SORTS, painted: `Newest ${verb}`, oldest: `Oldest ${verb}` })

/** The list in an order: the gallery's own (newest in) unless asked otherwise; unknown years go last either way. `seed` shuffles. */
export function sortPaintings(list, by = 'added', seed = 1) {
  const xs = [...list]
  const when = (p) => (p.year ? p.year * 100 + (p.month || 0) : null)
  if (by === 'painted' || by === 'oldest') {
    const dir = by === 'painted' ? -1 : 1
    return xs.sort((a, b) => (when(a) === null) - (when(b) === null) || dir * ((when(a) || 0) - (when(b) || 0)) || String(b.added).localeCompare(String(a.added)))
  }
  if (by === 'rainbow') return xs.sort((a, b) => rainbowKey(a.palette) - rainbowKey(b.palette) || a.title.localeCompare(b.title))
  if (by === 'title') return xs.sort((a, b) => a.title.localeCompare(b.title))
  if (by === 'shuffle') { const r = seeded(seed); for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]] } return xs }
  return xs // the gallery's own order: newest in first
}

// ---- The featured wall: a few of her paintings that hang together, for a few days ----------
export const FEATURE_DAYS = 3
const dayNumber = (d) => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5)
const dayOf = (n) => new Date(n * 864e5).toISOString().slice(0, 10)

/** Which few-day window a home date is in: its number, and its first and last days ('YYYY-MM-DD'). */
export function featureWindow(today, days = FEATURE_DAYS) {
  const n = Math.floor(dayNumber(today) / days)
  return { n, from: dayOf(n * days), to: dayOf(n * days + days - 1) }
}

const MOOD_LINES = { cozy: 'Ones to curl up with.', calm: 'Quiet ones, for a slow morning.', joyful: 'The cheerful ones.', whimsical: 'A little bit of magic.', spooky: 'A shiver or two.', dreamy: 'Half awake, half dreaming.', bold: 'The loud ones.', wistful: 'For a thoughtful mood.', festive: 'Dressed up for a party.', mysterious: 'Something going on in each.', romantic: 'Soft-hearted ones.', lively: 'Everything moving.' }

/**
 * Walls the app can make by itself from the pieces' own facts: a year, a colour, a season that's on, a mood Claude
 * saw and a parent kept, a subject, a medium, a shape, what it's about. Each holds four to eight; fewer than four makes
 * no wall. `who` and `verb` word it for the artist ("by Laurie", "painted"; "by Anna", "made").
 */
export function localFeatures(list, today, { who = 'Laurie', verb = 'painted' } = {}) {
  const out = []
  const add = (key, title, line, ps) => { if (ps.length >= 4) out.push({ key, title, line, slugs: ps.map((p) => p.slug) }) }
  const by = (fn) => { const m = new Map(); for (const p of list) for (const k of fn(p)) m.set(k, [...(m.get(k) || []), p]); return m }
  for (const [y, ps] of by((p) => (p.year ? [p.year] : []))) add(`year:${y}`, `All ${verb} in ${y}`, ps.length >= 6 ? `${ps.length} from the same year.` : 'From the same year.', ps)
  for (const [c, ps] of by((p) => familiesOf(p.palette).filter((k) => k !== 'neutral'))) add(`colour:${c}`, { red: 'Seeing red', orange: 'Orange, every one', yellow: 'Mellow yellows', green: 'Something green', teal: 'Teal and sea-glass', blue: 'Feeling blue', purple: 'Purple patches', pink: 'In the pink', earth: 'Down to earth' }[c], 'Hung together for their colour.', ps)
  const on = seasonsOn(today)
  for (const [s, ps] of by((p) => (p.seasons || []).filter((k) => on.includes(k)))) add(`season:${s}`, `For ${SEASONS[s].label}`, 'The season we’re in.', ps)
  for (const [m, ps] of by((p) => (p.looks && p.looks.moods) || [])) add(`mood:${m}`, `${MOODS[m]} ones`, MOOD_LINES[m], ps)
  for (const [w, ps] of by((p) => (p.looks && p.looks.subjects) || [])) add(`subject:${w}`, `${w[0].toUpperCase()}${w.slice(1)}${/s$/.test(w) ? '' : 's'}, by ${who}`, `One thing, ${verb} many ways.`, ps)
  for (const [m, ps] of by((p) => (mediumWord(p.medium) && mediumWord(p.medium) !== 'Other' ? [mediumWord(p.medium)] : []))) add(`medium:${m}`, `All in ${m.toLowerCase()}`, verb === 'painted' ? 'The same paint, many places.' : 'One box of supplies, many ideas.', ps)
  for (const [k, ps] of by((p) => (p.topics || []).filter((t) => TOPICS[t]))) add(`topic:${k}`, k === 'pets' ? `Our pets, by ${who}` : TOPICS[k], k === 'pets' ? `Appa and the cats, as ${who} sees them.` : 'All about one thing.', ps)
  for (const [t, ps] of by((p) => toneOf(p.palette))) add(`tone:${t}`, TONES[t], { colourful: 'Turn it up.', soft: 'Easy on the eyes.', dark: 'For the evening.', bright: 'Like a window open.' }[t], ps)
  const shaped = list.filter((p) => shapeFamily(p.shape) !== 'rect')
  if (shaped.length >= 3) out.push({ key: 'shape', title: 'Not a rectangle among them', line: 'Round, many-sided and pointed canvases.', slugs: shaped.map((p) => p.slug) })
  return out
}

/** The app's own wall for a window: one of the walls above, the same all window long, and not the one before if it can help it. At most eight, chosen the same way all window. */
export function appFeature(list, today, words) {
  const all = localFeatures(list, today, words).sort((a, b) => a.key.localeCompare(b.key))
  if (!all.length) return null
  const { n, from, to } = featureWindow(today)
  const pick = (k) => all[Math.floor(seeded(k * 7919 + 13)() * all.length)]
  let f = pick(n)
  if (all.length > 1 && pick(n - 1).key === f.key) f = all[(all.indexOf(f) + 1) % all.length]
  const r = seeded(n + 101), slugs = [...f.slugs]
  for (let i = slugs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slugs[i], slugs[j]] = [slugs[j], slugs[i]] }
  return { ...f, slugs: slugs.slice(0, 8), by: 'app', from, until: to }
}

/**
 * The wall Claude chose that is up today, from the kept rows (newest first or not): its paintings that are still in her
 * gallery, in its order. Null when none is up, or when fewer than three of its paintings are left.
 */
export function claudeFeature(rows = [], list = [], today) {
  const have = new Set(list.map((p) => p.slug))
  const up = [...rows].filter((r) => r && r.made_on <= today && today <= r.until).sort((a, b) => String(b.created_at || b.made_on).localeCompare(String(a.created_at || a.made_on)))
  for (const r of up) {
    const slugs = (r.slugs || []).filter((s) => have.has(s))
    if (slugs.length >= 3) return { id: r.id, title: r.title, line: r.line, why: r.why || '', slugs, by: 'claude', from: r.made_on, until: r.until }
  }
  return null
}

/** What goes to Claude for choosing a wall: each painting's facts in a line's worth, never a picture. */
export function catalogOf(list) {
  return list.slice(0, 400).map((p) => {
    const f = factsOf(p)
    return {
      slug: p.slug, title: p.title, year: p.year || null, month: p.month || null, medium: p.medium || '',
      seasons: f.seasons, colours: f.colours, feel: f.tones, shows: f.subjects, moods: f.moods, style: f.style, weather: f.weather,
      shape: f.shape === 'rect' ? '' : f.shape, about: f.topics, kind: f.kind,
    }
  })
}

/** The weather at home in a line for Claude ("Light rain, 58°F now; 80% chance of rain today"), or '' without it. */
export function weatherLine(now, today) {
  if (!now || !now.words) return ''
  const rain = today && Number.isFinite(today.rain) && today.rain >= 40 ? `; ${today.rain}% chance of rain today` : ''
  return `${now.words}, ${now.temp}°F now${rain}`
}

/** What's coming in the next week that a wall might be hung for: concerts on the calendar only (never a family day). */
export function comingFor(events = [], today) {
  return events.filter((e) => e && e.kind === 'show' && e.starts_on >= today).slice(0, 6).map((e) => `a concert on ${e.starts_on}: ${String(e.title || '').slice(0, 70)}`)
}
