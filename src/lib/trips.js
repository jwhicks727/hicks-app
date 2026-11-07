// ============================================
// trips.js -- the family's towns while away, trips to keep, parks, home's watch
// ============================================
// Pure, so tests/trips.test.mjs runs it in Node. Which town one of us is in is
// shared with the family while away (Jason's decision, issue #19): the town
// and a tenth of a degree, one row per person, lapsing in twelve hours, never a
// log. A trip is kept only when someone says so: from the calendar, or "keep
// today" while away. Nothing here is made from where a phone has been.

import { miles, AWAY_MI, placeWords } from './here.js'
import { addDays } from './cal/dates.js'
import { NATIONAL_PARKS } from './life/parks.js'

export const SHARE_EVERY_MS = 60 * 60e3 // written again at most hourly in one place
export const SHARE_FOR_MS = 12 * 3600e3 // and it lapses twelve hours after the app was last opened there
export const KEEP_WITHIN_DAYS = 10 // "Keep this trip?" asks for ten days after it ends
const tenth = (x) => Math.round(x * 10) / 10

/** The row this phone shares while away, or null (home ground, out and about, no town yet). */
export function whereaboutsRow(here, memberId, now = Date.now()) {
  if (!memberId || !here || here.tier !== 'away' || !here.point) return null
  const town = (here.town && here.town.town) || (here.place && here.place.town) || ''
  if (!town) return null
  const t = here.town || {}
  return {
    member_id: memberId, town: String(town).slice(0, 120), region: t.region ? String(t.region).slice(0, 60) : null, cc: /^[A-Z]{2}$/.test(t.cc || '') ? t.cc : null,
    lat: tenth(here.point.lat), lng: tenth(here.point.lng), tz: here.tz ? String(here.tz).slice(0, 60) : null,
    updated_at: new Date(now).toISOString(), expires_at: new Date(now + SHARE_FOR_MS).toISOString(),
  }
}
/** Write again? A new town or area, or an hour since this phone last wrote. */
export function shouldShare(row, last) {
  if (!row) return false
  if (!last) return true
  return last.town !== row.town || last.lat !== row.lat || last.lng !== row.lng || Date.parse(row.updated_at) - Date.parse(last.updated_at) >= SHARE_EVERY_MS
}

/**
 * The others away now, by person (a person may have two sign-in rows; the
 * newest wins): [{ name, town, region, cc, lat, lng, since }]. Never mine, never lapsed.
 */
export function othersAway(rows, members, myName, now = Date.now()) {
  const nameOf = new Map((members || []).map((m) => [m.id, m.name]))
  const by = new Map()
  for (const r of rows || []) {
    const name = nameOf.get(r.member_id)
    if (!name || name === myName || Date.parse(r.expires_at) <= now) continue
    const prev = by.get(name)
    if (!prev || Date.parse(r.updated_at) > Date.parse(prev.since)) by.set(name, { name, town: r.town, region: r.region || '', cc: r.cc || '', lat: Number(r.lat), lng: Number(r.lng), since: r.updated_at })
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name))
}
/** "Laurie is in Big Bear Lake" (the town, the state elsewhere in the US, the country abroad). */
export const isInWords = (o) => `${o.name} is in ${placeWords({ town: o.town, region: o.region, cc: o.cc }) || o.town}`

const plain = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
/**
 * A national park near here, from the open map's park boundaries round the area
 * (`map.parks`): { park, visited, km } for the nearest of the sixty-three, or null.
 */
export function parkNear(map, marks = []) {
  const seen = new Map((marks || []).map((m) => [m.slug, m]))
  const found = []
  for (const p of (map && map.parks) || []) {
    const n = plain(p.name)
    if (!/national park/.test(n)) continue
    const park = NATIONAL_PARKS.find((x) => n === `${plain(x.name)} national park` || n.startsWith(`${plain(x.name)} national park`) || n === plain(x.name))
    if (park) found.push({ park, visited: (seen.get(park.slug) || {}).visited_on || null, km: p.km })
  }
  return found.sort((a, b) => a.km - b.km)[0] || null
}

/** Calendar trips just finished that haven't been kept yet: newest first. */
export function tripsToKeep(events, outings, today, home) {
  const kept = new Set((outings || []).map((o) => o.event_id).filter(Boolean))
  const since = addDays(today, -KEEP_WITHIN_DAYS)
  return (events || []).filter((e) => e && e.id && e.lat != null && e.lng != null && e.ends_on <= today && e.ends_on >= since && !kept.has(e.id) && miles(home, e) > AWAY_MI)
    .sort((a, b) => (a.ends_on < b.ends_on ? 1 : a.ends_on > b.ends_on ? -1 : 0))
}

/**
 * "Keep today in Temecula as a trip?": while away with no calendar trip here
 * today and nothing kept for today in this town. { title, starts_on, ends_on, place } or null.
 */
export function todayTrip(here, events, outings, today) {
  if (!here || here.tier !== 'away' || !here.point) return null
  const town = (here.town && here.town.town) || (here.place && here.place.town)
  if (!town) return null
  const planned = (events || []).some((e) => e && e.lat != null && e.starts_on <= today && e.ends_on >= today && miles(here.point, e) < 30)
  if (planned) return null
  const keptToday = (outings || []).some((o) => o.starts_on <= today && o.ends_on >= today && plain(o.place || o.title).includes(plain(town)))
  if (keptToday) return null
  return { title: String(town).slice(0, 120), starts_on: today, ends_on: today, place: placeWords(here.town) || town }
}

const day = (date) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
/**
 * While we're away, a word for the garden from home's forecast over the next few
 * days: heat, frost or a strong wind, the one that matters most; null when it's mild.
 */
export function homeWatch(days, today) {
  const ahead = (days || []).filter((d) => d && d.date >= today && d.date <= addDays(today, 3))
  const hot = ahead.find((d) => d.high >= 95)
  if (hot) return `Heat at home on ${day(hot.date)} (${hot.high}°): the pots will need someone.`
  const frost = ahead.find((d) => d.low != null && d.low <= 34)
  if (frost) return `Frost possible at home ${day(frost.date)} night (${frost.low}°): cover the tender ones.`
  const wind = ahead.find((d) => (d.gusts || 0) >= 40)
  if (wind) return `Wind at home on ${day(wind.date)}, gusts to ${Math.round(wind.gusts)} mph: the feeder may come down.`
  return null
}
