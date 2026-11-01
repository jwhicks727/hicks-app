// ============================================
// trips.js -- camping trips, Disneyland trips and the other outings we keep
// ============================================
// Pure: tests/life-list.test.mjs. Camping and Disneyland trips are celebrated:
// a card with their own colours and a tally. Dates are calendar dates as
// strings, never parsed as a Date at UTC midnight.

export const KINDS = {
  camping: { name: 'Camping', plural: 'camping trips', colour: '#4E6C3D', celebrate: true, art: 'tent' },
  disneyland: { name: 'Disneyland', plural: 'Disneyland trips', colour: '#D66BA0', celebrate: true, art: 'castle' },
  trip: { name: 'Trip', plural: 'trips', colour: '#3BA3A8', celebrate: false, art: 'plane' },
  outing: { name: 'Outing', plural: 'outings', colour: '#E0662F', celebrate: false, art: 'sun' },
}
export const KIND_ORDER = ['camping', 'disneyland', 'trip', 'outing']

const day = (d) => Math.round(Date.parse(d + 'T12:00:00Z') / 864e5)
export const nightsOf = (o) => Math.max(0, day(o.ends_on) - day(o.starts_on))
export const daysUntil = (date, today) => day(date) - day(today)

/** The dates in words: "Nov 7", "Nov 7 to 9", "Nov 28 to Dec 1", with the year when it isn't this one. */
export function datesWords(o, today) {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const f = (d, withYear) => `${M[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}${withYear ? `, ${d.slice(0, 4)}` : ''}`
  const y = today ? today.slice(0, 4) : null, other = y && (o.starts_on.slice(0, 4) !== y || o.ends_on.slice(0, 4) !== y)
  if (o.ends_on === o.starts_on) return f(o.starts_on, other)
  const sameMonth = o.starts_on.slice(0, 7) === o.ends_on.slice(0, 7)
  return `${f(o.starts_on, false)} to ${sameMonth ? +o.ends_on.slice(8, 10) : f(o.ends_on, false)}${other ? `, ${o.ends_on.slice(0, 4)}` : ''}`
}

/** Where an outing stands: 'ahead' (with days to go), 'now', or 'done' (with days since). */
export function whereIs(o, today) {
  if (o.starts_on > today) return { state: 'ahead', days: daysUntil(o.starts_on, today) }
  if (o.ends_on >= today) return { state: 'now', days: 0 }
  return { state: 'done', days: day(today) - day(o.ends_on) }
}

/** The words for it: "In 12 days", "Tomorrow", "Right now", "Last week", "3 months ago". */
export function whenWords(o, today) {
  const w = whereIs(o, today)
  if (w.state === 'now') return 'Right now'
  if (w.state === 'ahead') return w.days === 1 ? 'Tomorrow' : w.days < 14 ? `In ${w.days} days` : w.days < 60 ? `In ${Math.round(w.days / 7)} weeks` : `In ${Math.round(w.days / 30)} months`
  const d = w.days
  return d === 1 ? 'Yesterday' : d < 14 ? `${d} days ago` : d < 60 ? `${Math.round(d / 7)} weeks ago` : d < 700 ? `${Math.round(d / 30)} months ago` : `${Math.round(d / 365)} years ago`
}

/** The outings by when they happen: what's coming (soonest first) and what's been (latest first). */
export function sorted(outings, today) {
  const ahead = outings.filter((o) => o.ends_on >= today).sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1))
  const done = outings.filter((o) => o.ends_on < today).sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1))
  return { ahead, done }
}

/** The tally: { all, nights, byKind: { camping: { trips, nights }, ... }, thisYear } */
export function tally(outings, today) {
  const done = outings.filter((o) => o.ends_on < today || (o.starts_on <= today && o.ends_on >= today))
  const byKind = Object.fromEntries(KIND_ORDER.map((k) => [k, { trips: 0, nights: 0 }]))
  for (const o of done) { const b = byKind[o.kind]; if (b) { b.trips++; b.nights += nightsOf(o) } }
  const y = today.slice(0, 4)
  return { all: done.length, nights: done.reduce((n, o) => n + nightsOf(o), 0), byKind, thisYear: done.filter((o) => o.starts_on.slice(0, 4) === y).length }
}

const ord = (n) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`

/** A line to celebrate one, for the two kinds we celebrate (others get none): which of its kind it is, and where it stands. */
export function celebrate(o, outings, today) {
  const k = KINDS[o.kind]
  if (!k || !k.celebrate) return null
  const same = outings.filter((x) => x.kind === o.kind).sort((a, b) => (a.starts_on < b.starts_on ? -1 : a.starts_on > b.starts_on ? 1 : 0))
  const nth = same.findIndex((x) => x.id === o.id) + 1 || same.length + 1
  const noun = o.kind === 'camping' ? 'camping trip' : 'Disneyland trip', w = whereIs(o, today), nights = nightsOf(o)
  if (w.state === 'ahead') return `Our ${ord(nth)} ${noun} is ${w.days <= 7 ? 'almost here' : 'on the way'}.`
  if (w.state === 'now') return o.kind === 'camping' ? 'Out under the sky right now.' : 'Having the happiest time right now.'
  return `Our ${ord(nth)} ${noun}${nights ? `: ${nights} ${nights === 1 ? 'night' : 'nights'}` : ''}.`
}

/** A trip's form, checked: the row to save, or { error }. */
export function checkOuting(f) {
  const title = String(f.title || '').replace(/\s+/g, ' ').trim()
  if (!title) return { error: 'Give it a name.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.starts_on || '')) return { error: 'When does it start?' }
  const ends = /^\d{4}-\d{2}-\d{2}$/.test(f.ends_on || '') ? f.ends_on : f.starts_on
  if (ends < f.starts_on) return { error: 'It can’t end before it starts.' }
  if (!KINDS[f.kind]) return { error: 'What kind of outing is it?' }
  return { row: { kind: f.kind, title: title.slice(0, 120), starts_on: f.starts_on, ends_on: ends, place: String(f.place || '').trim().slice(0, 200) || null, with_whom: String(f.with_whom || '').trim().slice(0, 200) || null, park: f.park || null, notes: String(f.notes || '').trim().slice(0, 2000) || null } }
}
