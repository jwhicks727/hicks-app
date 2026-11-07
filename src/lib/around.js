// ============================================
// around.js -- "What's around here?" on the phone: the order, the facts, when to ask
// ============================================
// Pure, so tests/around.test.mjs runs it in Node. The guide itself is written
// by the `claude` function and the map layer read by the `around` function
// (supabase/functions/_shared/around.js); this decides how they're shown.
// Distances are worked out here from the place's own map point to where the
// phone is, never sent anywhere.

import { miles } from './here.js'

/** The cell (a tenth of a degree, about ten kilometres) the functions are told about. */
export function cellIdOf(point) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null
  return `${(Math.round(point.lat * 10) / 10).toFixed(1)},${(Math.round(point.lng * 10) / 10).toFixed(1)}`
}

const MORNING = ['coffee', 'hikes', 'village', 'local-food', 'anna', 'books-records', 'art', 'mass', 'brewpubs', 'sky']
const AFTERNOON = ['hikes', 'village', 'local-food', 'anna', 'books-records', 'art', 'coffee', 'brewpubs', 'mass', 'sky']
const EVENING = ['local-food', 'brewpubs', 'sky', 'village', 'books-records', 'art', 'anna', 'mass', 'coffee', 'hikes']
const RAINY = ['books-records', 'art', 'coffee', 'anna', 'local-food', 'brewpubs', 'village', 'mass', 'sky', 'hikes']

/**
 * The order the guide's sections come in, for the moment: coffee and hikes in the
 * morning, food, brewpubs and the sky in the evening, indoor things first in the
 * rain, and Mass near the top on a Saturday evening or a Sunday.
 */
export function sectionOrder({ hour, rainy = false, weekday = 1 }) {
  const base = rainy ? RAINY : hour >= 5 && hour < 11 ? MORNING : hour >= 11 && hour < 17 ? AFTERNOON : EVENING
  const massTime = weekday === 0 ? hour < 13 : weekday === 6 && hour >= 14
  if (!massTime) return base
  return ['mass', ...base.filter((k) => k !== 'mass')]
}
export function ordered(sections, order) {
  return (sections || []).slice().sort((a, b) => (order.indexOf(a.key) + 100 * (order.indexOf(a.key) < 0)) - (order.indexOf(b.key) + 100 * (order.indexOf(b.key) < 0)))
}

/** How far a place is from where the phone is, in words, when the map knows the place. */
export function awayWords(item, point) {
  if (!item || item.lat == null || item.lng == null || !point) return ''
  const d = miles(point, item)
  return d < 0.2 ? 'Right here' : `${d < 10 ? Math.round(d * 10) / 10 : Math.round(d)} mi away`
}

/** A hike's figures in a line: "4.8 mi · 1,200 ft up · about 3 hr · dogs welcome". */
export function hikeWords(h) {
  if (!h) return ''
  const parts = []
  if (h.miles) parts.push(`${h.miles} mi`)
  if (h.climb) parts.push(`${Math.round(h.climb).toLocaleString('en-US')} ft up`)
  if (h.hours) parts.push(`about ${h.hours < 1 ? `${Math.round(h.hours * 60)} min` : `${Math.round(h.hours * 2) / 2} hr`}`)
  if (h.dogs === 'yes') parts.push('dogs welcome')
  if (h.dogs === 'no') parts.push('no dogs')
  return parts.join(' · ')
}

/**
 * When to set off to be down before sunset, with half an hour to spare, rounded
 * down to the quarter hour; null when there's no time today or nothing to go on.
 */
export function startBy(h, sunset, now) {
  if (!h || !h.hours || !(sunset instanceof Date) || !(now instanceof Date)) return null
  const t = new Date(sunset.getTime() - (h.hours * 60 + 30) * 60e3)
  t.setSeconds(0, 0)
  t.setMinutes(Math.floor(t.getMinutes() / 15) * 15)
  return t > now ? t : null
}

export const GUIDE_FRESH_MS = 30 * 864e5
/**
 * Should this phone ask for a guide now? Only when there's no fresh one, none is
 * being written, and this phone hasn't already asked about this area today.
 */
export function shouldAsk({ guide, askedOn, today }) {
  if (askedOn === today) return false
  if (!guide) return true
  if (guide.status === 'building') return false
  if (guide.status === 'failed') return true
  return Date.now() - Date.parse(guide.fetched_at) > GUIDE_FRESH_MS
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
/** What the open map knows nearby that the guide doesn't already mention: [{ kind, ...place }], nearest first. */
export function alsoOnTheMap(map, guide, n = 12) {
  if (!map) return []
  const named = new Set((guide && guide.sections ? guide.sections : []).flatMap((s) => s.items.map((i) => norm(i.name))))
  return Object.entries(map).flatMap(([kind, list]) => (list || []).map((p) => ({ ...p, kind })))
    .filter((p) => !named.has(norm(p.name))).sort((a, b) => a.km - b.km).slice(0, n)
}
export const MAP_KIND_WORDS = { coffee: 'Coffee', brewpubs: 'Brewery', books: 'Books', records: 'Records', trails: 'Trailhead', views: 'Viewpoint', mass: 'Catholic church', anna: 'For Anna', art: 'Art' }

/** A maps link that searches for a place's name and town, never an address. */
export const mapsSearch = (name, town) => `https://maps.google.com/?q=${encodeURIComponent([name, town].filter(Boolean).join(', '))}`
