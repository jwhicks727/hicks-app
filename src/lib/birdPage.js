// ============================================
// birdPage.js -- what the birds page says, worked out from the week's sightings
// ============================================
// Pure: the sightings come from the `birds` Edge Function (supabase/functions/_shared/birds.js),
// the weather from src/lib/weather.js. Nothing here names a person.

/** The five (or n) most reported birds this week, then the rarer notable ones, as two short lists. */
export const mostSeen = (list, n = 5) => (list || []).filter((b) => b.sightings > 0).slice().sort((a, b) => b.sightings - a.sightings || b.last.localeCompare(a.last)).slice(0, n)
export const rareOnes = (list, n = 5) => (list || []).filter((b) => b.notable).slice().sort((a, b) => b.last.localeCompare(a.last)).slice(0, n)

/**
 * One or two highlights: a notable bird doing something worth a look. Only what the week's sightings show
 * (no history is kept), so each says why in plain words: reported again and again, a big group, or turned up
 * today. A quiet week gives none, and the screen shows nothing rather than filler.
 */
export function highlights(list, today, n = 2) {
  const days = (when) => Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(String(when).slice(0, 10) + 'T12:00:00Z')) / 864e5)
  const out = []
  for (const b of (list || []).filter((x) => x.notable)) {
    const age = b.last ? days(b.last) : 99, why = []
    let score = 0
    if (b.sightings >= 3) { why.push(`reported ${b.sightings} times this week`); score += Math.min(b.sightings, 12) }
    if (b.count >= 8) { why.push(`as many as ${b.count} together`); score += Math.min(b.count / 4, 8) }
    if (age <= 0) { why.push('seen today'); score += 4 } else if (age === 1) { why.push('seen yesterday'); score += 2 }
    // Worth a highlight: seen more than once or in a group, or a rare bird that is there right now
    if (!(b.sightings >= 3 || b.count >= 8 || (age <= 0 && b.sightings >= 1))) continue
    out.push({ bird: b, why, score, headline: why[0] ? why[0][0].toUpperCase() + why[0].slice(1) : 'Notable' })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, n)
}

/** The Sunday a week starts on, as YYYY-MM-DD, from a day at home. */
export function weekStart(today) {
  const [y, m, d] = today.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() - t.getUTCDay())
  return t.toISOString().slice(0, 10)
}

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
/** Nine birds that were really reported near us this week, the same nine all week and for everyone; "Notable" ones too (a bonus). */
export function bingoCard(list, week) {
  const pool = (list || []).filter((b) => b.sightings > 0 || b.notable)
  return pool.slice().sort((a, b) => hash(week + a.code) - hash(week + b.code)).slice(0, 9)
}
/** Rows and columns of a 3 by 3 card that are all ticked: how many lines. */
export function bingoLines(ticked, card) {
  const on = card.map((b) => ticked.includes(b.code)), rows = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
  return card.length < 9 ? 0 : rows.filter((r) => r.every((i) => on[i])).length
}

/** A line about birding today, from the weather at home. Says only what the numbers support, and nothing when they say little. */
export function birdingLine(f) {
  if (!f || !f.now) return null
  const n = f.now, speed = n.speed ?? 0, gusts = n.gusts ?? 0
  if (n.wind && n.wind.santaAna) return 'A dry wind out of the east: hawks and falcons ride it, and small birds keep low out of it. Try a sheltered spot, or watch the sky.'
  if (/rain|shower|storm|drizzle/i.test(n.words || '')) return 'Wet out: fewer small birds on the move, but ducks, gulls and herons are happy near water, and the first clear hour after rain is busy.'
  if (gusts >= 25 || speed >= 18) return 'Windy: small birds shelter in thick bushes and treetops sway too much to see them. Hawks may be soaring.'
  if (n.temp >= 90) return 'Hot: the birds are most active early, and again near water in the evening.'
  if (speed <= 8 && /clear|sun|few clouds|mostly/i.test(n.words || '')) return 'Calm and clear: a good day to be out, and the first hours after sunrise are the best.'
  return null
}

/** Birds whose names match what was typed (any word starting with it), from the pools given, one entry a species. */
export function findBirds(query, ...pools) {
  const q = String(query || '').toLowerCase().trim()
  if (q.length < 2) return []
  const seen = new Map()
  for (const b of pools.flat()) if (b && b.code && !seen.has(b.code) && String(b.name || '').toLowerCase().split(/[\s-]+/).some((w) => w.startsWith(q)) || (b && String(b.name || '').toLowerCase().startsWith(q))) if (!seen.has(b.code)) seen.set(b.code, b)
  return [...seen.values()].slice(0, 8)
}
