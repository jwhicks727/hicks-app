// ============================================
// tripPlan.js -- a planned trip's page: where we're staying, our plans, its guides
// ============================================
// Pure, so tests/trip-plan.test.mjs runs it in Node. A stay is a public building
// (a hotel, an inn, a campground) found on OpenStreetMap by the phone: its name,
// its town and its point to about a hundred metres, never a street address. The
// guide for a stay is asked by area: the functions are told a tenth-of-a-degree
// cell, the town and its region (useAround), never the stay's name. Distances
// from the stay to a guide's places are worked out here, on the phone.

import { addDays, diffDays, WEEKDAYS } from './cal/dates.js'
import { cellIdOf } from './around.js'
import { miles } from './here.js'

const STRIP = /[\u0000-\u001f\u007f<>]/g
const clean = (s, n) => (typeof s === 'string' ? s.replace(STRIP, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '')
const firstPart = (s) => String(s || '').split(',')[0].trim()
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const r3 = (v) => Math.round(Number(v) * 1000) / 1000
const pointOf = (lat, lng) => {
  const la = Number(lat), ln = Number(lng)
  return lat != null && lng != null && Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 ? { lat: r3(la), lng: r3(ln) } : null
}
export function httpsOnly(u) {
  if (typeof u !== 'string' || !u.trim()) return null
  try { const x = new URL(u.trim()); return x.protocol === 'https:' && !x.username && !x.password ? x.toString().slice(0, 600) : null } catch { return null }
}

/** Every day of the trip, first to last (a month at most). */
export function tripDays(trip) {
  if (!trip || !isDate(trip.starts_on)) return []
  const end = isDate(trip.ends_on) && trip.ends_on >= trip.starts_on ? trip.ends_on : trip.starts_on
  const n = Math.min(31, diffDays(trip.starts_on, end) + 1)
  return Array.from({ length: n }, (_, i) => addDays(trip.starts_on, i))
}
const inTrip = (trip, d) => isDate(d) && tripDays(trip).includes(d)

/** "Saturday, Jan 16". */
export function dayWords(d) {
  const [y, m, day] = d.split('-').map(Number)
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]}, ${M[m - 1]} ${day}`
}
/** "9 am", "2:30 pm", "12 pm"; '' for no time. */
export function timeWords(t) {
  const m = /^(\d{2}):(\d{2})/.exec(String(t || ''))
  if (!m) return ''
  const h = Number(m[1]), min = Number(m[2])
  return `${h % 12 || 12}${min ? `:${m[2]}` : ''} ${h < 12 ? 'am' : 'pm'}`
}

/**
 * A stay as it's kept, from the form: { row } or { error } in words. Its point is
 * held to three decimals (about a hundred metres), its days inside the trip's.
 */
export function stayRow(form, trip) {
  const name = clean(form && form.name, 160)
  if (!name) return { error: 'What’s the place called?' }
  const p = pointOf(form.lat, form.lng)
  let from = inTrip(trip, form.from_date) ? form.from_date : null, to = inTrip(trip, form.to_date) ? form.to_date : null
  if (from && to && to < from) [from, to] = [to, from]
  return { row: { event_id: trip.id, name, town: clean(form.town, 120) || null, region: clean(form.region, 80) || null, lat: p ? p.lat : null, lng: p ? p.lng : null, from_date: from, to_date: to, note: clean(form.note, 1000) || null } }
}

/** A plan as it's kept, from the form: { row } or { error } in words. A day outside the trip is "any day". */
export function planRow(form, trip) {
  const title = clean(form && form.title, 160)
  if (!title) return { error: 'What’s the plan?' }
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(form.at_time || '')) ? form.at_time : null
  return { row: { event_id: trip.id, on_date: inTrip(trip, form.on_date) ? form.on_date : null, at_time: time, title, place: clean(form.place, 160) || null, website: httpsOnly(form.website), note: clean(form.note, 1000) || null } }
}

const byTime = (a, b) => {
  const ta = a.at_time ? String(a.at_time).slice(0, 5) : '99:99', tb = b.at_time ? String(b.at_time).slice(0, 5) : '99:99'
  return ta < tb ? -1 : ta > tb ? 1 : String(a.created_at || '') < String(b.created_at || '') ? -1 : 1
}
/**
 * Our plans by day: the trip's days that have plans, in order, each with its plans by time
 * (untimed after), then "Any day" for plans on no day (or a day the trip no longer has).
 */
export function planDays(trip, plans) {
  const days = tripDays(trip)
  const out = days.map((d) => ({ date: d, words: dayWords(d), plans: (plans || []).filter((p) => p.on_date === d).sort(byTime) })).filter((g) => g.plans.length)
  const loose = (plans || []).filter((p) => !p.on_date || !days.includes(p.on_date)).sort(byTime)
  if (loose.length) out.push({ date: null, words: 'Any day', plans: loose })
  return out
}

/**
 * The areas the page writes guides for: each stay found on the map (its cell, town and
 * region), one per cell; with none, the trip's own place. `label` and `point` stay on
 * the phone (for the card's heading and the distances); only cell, town, region and cc
 * are ever sent (useAround).
 */
export function guideAreas(trip, stays) {
  const out = [], seen = new Set()
  for (const s of stays || []) {
    const p = pointOf(s.lat, s.lng)
    if (!p) continue
    const cell = cellIdOf(p)
    if (seen.has(cell)) continue
    seen.add(cell)
    out.push({ cell, town: s.town || '', region: s.region || '', cc: '', label: s.name, point: p, stayId: s.id })
  }
  if (!out.length && trip) {
    const p = pointOf(trip.lat, trip.lng)
    if (p) out.push({ cell: cellIdOf(p), town: firstPart(trip.place) || '', region: String(trip.place || '').split(',')[1]?.trim() || '', cc: '', label: firstPart(trip.place) || trip.title, point: null, stayId: null })
  }
  return out
}

/** "0.4 mi from the Inn", "Right by the Inn"; '' when the map doesn't know the place. */
export function fromStayWords(item, area) {
  if (!item || item.lat == null || item.lng == null || !area || !area.point) return ''
  const d = miles(area.point, item)
  if (d < 0.15) return `Right by ${area.label}`
  return `${d < 10 ? Math.round(d * 10) / 10 : Math.round(d)} mi from ${area.label}`
}

// ---- Finding where we're staying on OpenStreetMap (Nominatim), asked by the phone ----
// One search when someone taps "Find it" (never as they type, per its usage policy);
// what's typed goes to OpenStreetMap, and the form says so.
export function staySearchUrl(name, near = '') {
  const q = [clean(name, 120), clean(near, 80)].filter(Boolean).join(', ')
  return `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'jsonv2', limit: '6', addressdetails: '1', 'accept-language': 'en' })}`
}
/**
 * Its answer, shaped: [{ name, town, region, where, lat, lng }], the point to three decimals.
 * Only the place's own name and its town are kept: never the road or a house number.
 */
export function shapeStays(json) {
  const out = []
  for (const r of (Array.isArray(json) ? json : [])) {
    const a = (r && typeof r.address === 'object' && r.address) || {}
    const p = pointOf(r && r.lat, r && r.lon)
    if (!p) continue
    const town = clean(a.city || a.town || a.village || a.hamlet || a.municipality || a.county || '', 120)
    const region = clean(a.state || a.province || a.region || '', 80)
    const name = clean(r.name || '', 160) || clean(firstPart(r.display_name), 160)
    if (!name || /^\d/.test(name)) continue // a bare street address is no place's name
    out.push({ name, town, region, where: [town, region].filter(Boolean).join(', '), lat: p.lat, lng: p.lng })
    if (out.length >= 6) break
  }
  return out
}

/** A guide's place as a plan: what, where, its website, on the day chosen. */
export function planFromPlace(item, on_date = '') {
  return { title: clean(item && item.name, 160), place: clean(item && item.name, 160), website: httpsOnly(item && item.website) || '', on_date: on_date || '', at_time: '', note: '' }
}

/** A section's places nearest the stay first (those the map doesn't place keep their order, after); as they were with no stay. */
export function byNearness(items, area) {
  if (!area || !area.point) return items || []
  const d = (it) => (it && it.lat != null && it.lng != null ? miles(area.point, it) : Infinity)
  return (items || []).map((it, i) => ({ it, i, d: d(it) })).sort((a, b) => a.d - b.d || a.i - b.i).map((x) => x.it)
}
