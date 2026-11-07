// ============================================
// been.js -- our list for each town: the places we've been, for next time
// ============================================
// Pure, so tests/been.test.mjs runs it in Node. Jason's ask (issue #19): for
// the towns we go back to, the restaurants, wineries, hikes and things we've
// done, with what we thought (loved, good, not again) and a note. A place is
// added by one of us, from the guide, from a hike ticked off, or by hand; a
// visit is a day we went. Nothing is made from where a phone has been.

export const KINDS = {
  eat: 'Places to eat', drink: 'Coffee, wine and beer', hike: 'Hikes', do: 'Things to do', shop: 'Shops', stay: 'Where we stayed', mass: 'Mass',
}
export const KIND_ORDER = ['eat', 'drink', 'hike', 'do', 'shop', 'stay', 'mass']
export const KIND_ONE = { eat: 'A place to eat', drink: 'Coffee, wine or beer', hike: 'A hike', do: 'Something to do', shop: 'A shop', stay: 'Where we stayed', mass: 'Mass' }
export const RATINGS = { loved: 'Loved it', good: 'Good', 'not-again': 'Not again' }

/** The kind a guide's section suggests. */
export const kindFromSection = (key) => ({ hikes: 'hike', coffee: 'drink', brewpubs: 'drink', 'local-food': 'eat', village: 'do', anna: 'do', art: 'do', 'books-records': 'shop', mass: 'mass', sky: 'do', trails: 'hike', views: 'do' }[key] || 'do')

export const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/&/g, ' and ').replace(/\b(the|a|an)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
const clean = (s, n) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '')

/** The town we're in, as the list keeps it (the town, its state, its country), or null. */
export function townOf(here) {
  const t = here && here.town
  const town = (t && t.town) || (here && here.place && here.place.town) || ''
  if (!town) return null
  return { town: clean(town, 120), region: t && t.region ? clean(t.region, 60) : null, cc: t && /^[A-Z]{2}$/.test(t.cc || '') ? t.cc : null }
}
/** Our town row for a place, matched by name and state (any case). */
export function findTown(towns, t) {
  if (!t) return null
  return (towns || []).find((x) => norm(x.town) === norm(t.town) && norm(x.region || '') === norm(t.region || '')) || null
}

/** A place to add, checked: its name, a known kind, a rating if given, a note, an https link. */
export function cleanPlace({ name, kind, rating = null, note = '', website = '' }) {
  const n = clean(name, 100)
  if (!n) return null
  let w = ''
  try { const u = new URL(String(website || '').trim()); if (u.protocol === 'https:') w = u.toString().slice(0, 300) } catch { /* not a link */ }
  return { name: n, kind: KINDS[kind] ? kind : 'do', rating: RATINGS[rating] ? rating : null, note: clean(note, 500) || null, website: w || null }
}

const RANK = { loved: 0, good: 1, null: 2, 'not-again': 3 }
/**
 * A town's places with their visits: [{ ...place, times, first, last }], loved first,
 * then good, then unrated, "not again" last; within each, the most visited and the
 * most recent first.
 */
export function withVisits(places, visits) {
  const by = new Map()
  for (const v of visits || []) { const a = by.get(v.place_id) || []; a.push(v.on_date); by.set(v.place_id, a) }
  return (places || []).map((p) => {
    const days = (by.get(p.id) || []).sort()
    return { ...p, times: days.length, first: days[0] || null, last: days[days.length - 1] || null }
  }).sort((a, b) => (RANK[a.rating ?? 'null'] - RANK[b.rating ?? 'null']) || (b.times - a.times) || String(b.last || '').localeCompare(String(a.last || '')) || a.name.localeCompare(b.name))
}
/** The list in kinds, in the list's own order: [{ kind, title, places }]. */
export function byKind(list) {
  return KIND_ORDER.map((k) => ({ kind: k, title: KINDS[k], places: (list || []).filter((p) => p.kind === k) })).filter((g) => g.places.length)
}
/** "9 places we've been · 4 loved" */
export function summaryWords(list) {
  const n = (list || []).length, loved = (list || []).filter((p) => p.rating === 'loved').length
  if (!n) return ''
  return `${n} ${n === 1 ? 'place' : 'places'} we’ve been${loved ? ` · ${loved} loved` : ''}`
}
/** "3 times, last on Nov 7, 2026" or "Once, on Nov 7, 2026" */
export function timesWords(p) {
  if (!p.times) return 'Not yet visited'
  const d = new Date(p.last + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return p.times === 1 ? `Once, on ${d}` : `${p.times} times, last on ${d}`
}

/** Our entry for a place in a guide, by its name (the same words, or one inside the other). */
export function matchBeen(name, list) {
  const n = norm(name)
  if (n.length < 3) return null
  return (list || []).find((p) => norm(p.name) === n) || (list || []).find((p) => { const m = norm(p.name); return m.length >= 4 && (m.includes(n) || n.includes(m)) }) || null
}

/** Where we went on a trip: the town's places with a visit between its first and last day. */
export function visitedBetween(list, visits, from, to) {
  const ids = new Set((visits || []).filter((v) => v.on_date >= from && v.on_date <= to).map((v) => v.place_id))
  return (list || []).filter((p) => ids.has(p.id))
}
