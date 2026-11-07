// ============================================
// here.js -- where one of us is, at town level, and what that means
// ============================================
// Pure, so tests/here.test.mjs runs it in Node. The phone's own reading is
// rounded to two places (about a kilometre) before anything is kept or asked
// (round2): that is the most that ever leaves the phone. Home stays the town
// (HOME_TOWN), never the address. Nothing here keeps a history: the app holds
// one reading at a time, on the device (src/lib/useHere.js).

import { HOME_TOWN } from './sky.js'
import { PLACES } from './places.js'
import { addDays, diffDays, WEEKDAYS } from './cal/dates.js'
import { conditions } from './weather.js'

/** Under NEAR_MI from home's town nothing changes; up to AWAY_MI is out and about; beyond is away. */
export const NEAR_MI = 10, AWAY_MI = 25
/** A reading is taken at most this often, on opening and on coming back to the app. */
export const READ_EVERY_MS = 10 * 60e3
/** A reading older than this is forgotten: the app never says where someone was hours ago. */
export const KEEP_MS = 6 * 3600e3
/** A trip on the calendar shows on Home this many days before it starts. */
export const TRIP_AHEAD_DAYS = 3

const R_MI = 3958.8
const rad = (x) => (x * Math.PI) / 180
/** Miles between two points, along the ground. */
export function miles(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R_MI * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Two places (about a kilometre): the most that ever leaves the phone. */
export const round2 = (x) => Math.round(x * 100) / 100
export const roundPoint = ({ lat, lng }) => ({ lat: round2(lat), lng: round2(lng) })
/** A cell about a kilometre across, for keeping a town's name. */
export const cellOf = ({ lat, lng }) => `${round2(lat).toFixed(2)},${round2(lng).toFixed(2)}`

/** Is this a usable reading from the phone? */
export const validPoint = (p) => Boolean(p) && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180

/**
 * 'home' (home ground: the schools and the parish are all within it), 'near'
 * (out and about) or 'away'. Another time zone is always away.
 */
export function tierFor(point, tz = null, home = HOME_TOWN) {
  if (!validPoint(point)) return null
  if (tz && tz !== home.tz) return 'away'
  const d = miles(home, point)
  return d < NEAR_MI ? 'home' : d <= AWAY_MI ? 'near' : 'away'
}

/** One of our places, when we're there (within about four miles of its pin), never home or the everyday places round it. */
export function ourPlaceAt(point) {
  if (!validPoint(point)) return null
  let best = null, bestD = 4
  for (const p of PLACES) {
    if (p.home || miles(HOME_TOWN, p) < NEAR_MI) continue
    const d = miles(p, point)
    if (d < bestD) { best = p; bestD = d }
  }
  return best
}

// ---- The town's name, from OpenStreetMap's own reverse lookup (Nominatim) ----
// Asked with the rounded point at the town's zoom, at most once per cell a
// month (useHere.js), within its usage policy; its data needs the credit
// "© OpenStreetMap contributors" wherever a name is shown.
export const OSM_CREDIT = '© OpenStreetMap contributors'
export function townUrl(point) {
  const { lat, lng } = roundPoint(point)
  return `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({ format: 'jsonv2', lat: lat.toFixed(2), lon: lng.toFixed(2), zoom: '10', addressdetails: '1', 'accept-language': 'en' })}`
}
const clean = (s, n = 60) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, n) : '')
/** The answer, shaped: { town, region, country, cc } or null. Read as data, capped. */
export function shapeTown(json) {
  const a = json && typeof json === 'object' && json.address
  if (!a || typeof a !== 'object') return null
  const town = clean(a.city || a.town || a.village || a.hamlet || a.municipality || a.suburb || a.county || '')
  if (!town) return null
  const cc = /^[a-z]{2}$/i.test(a.country_code || '') ? a.country_code.toUpperCase() : ''
  return { town, region: clean(a.state || a.region || ''), country: clean(a.country || ''), cc }
}
/** How to say where: the town in California, the town and state elsewhere in the US, the town and country abroad. */
export function placeWords(t) {
  if (!t || !t.town) return ''
  if (t.cc && t.cc !== 'US') return t.country ? `${t.town}, ${t.country}` : t.town
  if (t.region && t.region !== 'California') return `${t.town}, ${t.region}`
  return t.town
}

// ---- Trips on the calendar ---------------------------------------------------

/**
 * Trips coming up: our events with a place more than AWAY_MI from home that
 * start within `days` days (or are under way), soonest first. Each with its
 * distance, and `inDays` (0 today, negative once it's started).
 */
export function tripsAhead(events, today, days = TRIP_AHEAD_DAYS, home = HOME_TOWN) {
  const last = addDays(today, days)
  return (events || [])
    .filter((e) => e && e.lat != null && e.lng != null && e.starts_on && e.ends_on >= today && e.starts_on <= last)
    .map((e) => ({ id: e.id, title: e.title, place: e.place || '', lat: e.lat, lng: e.lng, starts_on: e.starts_on, ends_on: e.ends_on, miles: Math.round(miles(home, e)), inDays: diffDays(today, e.starts_on) }))
    .filter((t) => t.miles > AWAY_MI)
    .sort((a, b) => (a.starts_on < b.starts_on ? -1 : a.starts_on > b.starts_on ? 1 : a.miles - b.miles))
}

/** "Today", "Tomorrow", "Friday", or "Day 2 of 3" once it's started. */
export function whenWords(trip, today) {
  if (trip.inDays > 1) return WEEKDAYS[new Date(trip.starts_on + 'T12:00:00Z').getUTCDay()]
  if (trip.inDays === 1) return 'Tomorrow'
  const length = diffDays(trip.starts_on, trip.ends_on) + 1
  if (trip.inDays === 0) return length > 1 ? `Today, for ${length} days` : 'Today'
  return `Day ${1 - trip.inDays} of ${length}`
}

/** The trip's dates the forecast can reach: from today (or its start) to its end, at most sixteen days out. */
export function tripWindow(trip, today) {
  const from = trip.starts_on > today ? trip.starts_on : today
  const cap = addDays(today, 15)
  const to = trip.ends_on < cap ? trip.ends_on : cap
  return from <= to ? { from, to } : null
}

const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)
/** The trip's days from Open-Meteo (src/lib/outdoors.js, tripForecastUrl), shaped. */
export function shapeTripDays(json) {
  const d = (json && json.daily) || { time: [] }
  return (d.time || []).map((date, i) => ({
    date, high: n(d.temperature_2m_max?.[i]), low: n(d.temperature_2m_min?.[i]), rain: n(d.precipitation_probability_max?.[i]),
    inches: typeof d.precipitation_sum?.[i] === 'number' ? Math.round(d.precipitation_sum[i] * 100) / 100 : null,
    gusts: n(d.wind_gusts_10m_max?.[i]), uv: typeof d.uv_index_max?.[i] === 'number' ? d.uv_index_max[i] : null, code: d.weather_code?.[i] ?? null,
    ...conditions(d.weather_code?.[i], 1),
  })).filter((x) => x.high != null && x.low != null)
}

const SNOW = new Set([71, 73, 75, 77, 85, 86])
const dayName = (date) => WEEKDAYS[new Date(date + 'T12:00:00Z').getUTCDay()]
/**
 * What to pack, from the trip's days: at most three lines, the one that
 * matters most first. Only what the forecast says; nothing when it's mild.
 */
export function packWords(days) {
  if (!days || !days.length) return []
  const out = []
  const low = Math.min(...days.map((d) => d.low)), high = Math.max(...days.map((d) => d.high))
  const snow = days.find((d) => SNOW.has(d.code))
  const wet = days.find((d) => (d.rain ?? 0) >= 50 || (d.inches ?? 0) >= 0.1)
  const gust = Math.max(...days.map((d) => d.gusts ?? 0))
  const uv = Math.max(...days.map((d) => d.uv ?? 0))
  if (snow) out.push(`Snow in the forecast on ${dayName(snow.date)}: boots, and check the road for chain controls before you go.`)
  if (low <= 32) out.push(`Nights below freezing (down to ${low}°): the warm coats, hats and gloves.`)
  else if (low <= 45) out.push(`Cold nights (down to ${low}°): bring layers.`)
  if (high >= 95) out.push(`Hot (up to ${high}°): plenty of water, hats and shade.`)
  if (wet && !snow) out.push(`Rain likely on ${dayName(wet.date)}: the rain jackets.`)
  if (gust >= 35) out.push(`Gusty, to ${gust} mph: hold on to hats.`)
  if (uv >= 8 && high < 95) out.push('Strong sun: sunscreen and hats.')
  return out.slice(0, 3)
}

// ---- Time where we are -------------------------------------------------------

/** The phone's own time zone: it follows local time when we travel. */
export function deviceZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch { return null }
}
/** "6:12 PM" in a time zone. */
export const clockIn = (now, tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(now)
/** The hour (0-23) in a time zone. */
export const hourIn = (now, tz) => Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now))
