// ============================================
// birds.js -- the birds seen around us this week, from eBird
// ============================================
// Plain JavaScript, shared by the `birds` Edge Function and the tests.
// eBird's API 2.0 (an X-eBirdApiToken header): recent sightings within a
// few miles of the town's centre, and the notable ones (rare here, or out
// of season) a little further out. A sighting at a private location keeps
// its bird and its day but not its place's name. Photos come from
// iNaturalist's taxa, and only one under a Creative Commons licence, kept
// with its photographer's credit. Unverified against the live services from
// here (the planning sandbox can't reach them).

export const EBIRD = 'https://api.ebird.org/v2/data/obs/geo/recent'
export const KEEP_MS = 60 * 60 * 1000 // asked at most once an hour
export const NEAR_KM = 15, NOTABLE_KM = 30, DAYS = 7

const at = (u, p) => { const x = new URL(u); for (const [k, v] of Object.entries(p)) x.searchParams.set(k, String(v)); return x.toString() }
export const recentUrl = ({ lat, lng }) => at(EBIRD, { lat: lat.toFixed(2), lng: lng.toFixed(2), dist: NEAR_KM, back: DAYS, maxResults: 300 })
export const notableUrl = ({ lat, lng }) => at(EBIRD + '/notable', { lat: lat.toFixed(2), lng: lng.toFixed(2), dist: NOTABLE_KM, back: DAYS, detail: 'simple', maxResults: 100 })
/** "Passerella iliaca [megarhyncha Group]" is eBird's name for a group of forms: iNaturalist knows the species, "Passerella iliaca". */
export const binomial = (sci) => String(sci || '').replace(/\[[^\]]*\]/g, ' ').trim().split(/\s+/).slice(0, 2).join(' ')
export const inatUrl = (sci) => at('https://api.inaturalist.org/v1/taxa', { q: binomial(sci), rank: 'species', per_page: 1 })
export const inatTaxonUrl = (id) => `https://api.inaturalist.org/v1/taxa/${encodeURIComponent(id)}`

const CODE = /^[a-z0-9]{3,12}$/
const clean = (s, n = 120) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n)

/**
 * The week's birds, one entry a species, the most often seen first:
 * { code, name, sci, last, count, where, checklist, notable, sightings }.
 * `where` and `checklist` are left out for a private location.
 */
export function shapeBirds(recent, notable) {
  const by = new Map()
  const add = (o, isNotable) => {
    const code = String(o.speciesCode || '')
    if (!CODE.test(code) || o.obsValid === false) return
    const b = by.get(code) || { code, name: clean(o.comName, 80), sci: clean(o.sciName, 80), last: '', count: 0, where: null, checklist: null, notable: false, sightings: 0 }
    const when = clean(o.obsDt, 16)
    if (when >= b.last) {
      b.last = when
      b.where = o.locationPrivate ? null : clean(o.locName, 80) || null
      b.checklist = !o.locationPrivate && /^S\d{4,12}$/.test(o.subId || '') ? o.subId : b.checklist
    }
    b.count = Math.max(b.count, Number(o.howMany) || 0)
    if (isNotable) b.notable = true
    else b.sightings++
    by.set(code, b)
  }
  for (const o of recent || []) add(o, false)
  for (const o of notable || []) add(o, true)
  return [...by.values()].sort((a, b) => (b.notable - a.notable) || b.sightings - a.sightings || b.last.localeCompare(a.last))
}

const PHOTO_HOST = /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\//
/** One photo, if it is under a Creative Commons licence and on iNaturalist's own hosts: { url, credit, licence }, else null. */
function openPhoto(p) {
  if (!p || !p.license_code || !/^cc/i.test(p.license_code)) return null
  const url = String(p.medium_url || p.square_url || '')
  if (!PHOTO_HOST.test(url)) return null
  return { url, credit: clean(p.attribution, 160), licence: String(p.license_code).toUpperCase() }
}

/** A licensed photo from an iNaturalist taxa answer: its default photo, if that one is open. */
export function photoOf(json) {
  const t = json && json.results && json.results[0]
  return openPhoto(t && t.default_photo)
}

/** The taxon's id from a taxa answer, to ask for its other photos. */
export function taxonIdOf(json) {
  const t = json && json.results && json.results[0]
  return t && Number.isInteger(t.id) ? t.id : null
}

/** Open-licence photos of research-grade sightings of a taxon, best-voted first: the last place to look when the taxon's own photos are all closed. */
export const inatObservationsUrl = (id) => at('https://api.inaturalist.org/v1/observations', { taxon_id: id, photo_license: 'cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa', quality_grade: 'research', order_by: 'votes', per_page: 5, photos: 'true' })
/** The first openly licensed photo in an observations answer (its small square swapped for the medium one). */
export function photoFromObservations(json) {
  for (const o of (json && json.results) || []) {
    for (const p of o.photos || []) {
      const hit = openPhoto({ ...p, medium_url: String(p.url || '').replace('/square.', '/medium.') })
      if (hit) return hit
    }
  }
  return null
}

/** The first openly licensed photo among a taxon's own: a bird's first photo is often not one. */
export function photoFromTaxon(json) {
  const t = json && json.results && json.results[0]
  return ((t && t.taxon_photos) || []).map((x) => openPhoto(x && x.photo)).find(Boolean) || null
}

// ---- More from the same API: hotspots, the county's numbers, what is possible, where a bird is ----
const API = 'https://api.ebird.org/v2'
export const COUNTY = 'US-CA-071'
export const KEEP_MORE_MS = 3 * 60 * 60 * 1000 // these change slowly: asked at most every three hours
export const KEEP_NEAREST_MS = 60 * 60 * 1000
export const hotspotsUrl = ({ lat, lng }) => at(API + '/ref/hotspot/geo', { lat: lat.toFixed(2), lng: lng.toFixed(2), dist: 25, back: DAYS, fmt: 'json' })
export const regionRecentUrl = (region = COUNTY, back = 30) => at(`${API}/data/obs/${encodeURIComponent(region)}/recent`, { back, maxResults: 10000 })
export const statsUrl = (date, region = COUNTY) => { const [y, m, d] = date.split('-').map(Number); return `${API}/product/stats/${encodeURIComponent(region)}/${y}/${m}/${d}` }
export const nearestUrl = (code, { lat, lng }) => at(`${API}/data/nearest/geo/recent/${encodeURIComponent(code)}`, { lat: lat.toFixed(2), lng: lng.toFixed(2), dist: 50, back: 14, maxResults: 12 })
export const validCode = (c) => CODE.test(String(c || ''))

/** Kilometres between two points (haversine). */
export function km(a, b) {
  const r = (x) => (x * Math.PI) / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/**
 * Hotspots near town (eBird's list of public birding places) with how many kinds of bird this week's
 * sightings put there, busiest first: [{ locId, name, species, last, km }]. Names are eBird's own place names.
 */
export function shapeHotspots(hotspots, recent, town) {
  const seen = new Map()
  for (const o of recent || []) {
    if (o.locationPrivate || !o.locId || !CODE.test(String(o.speciesCode || ''))) continue
    const e = seen.get(o.locId) || { codes: new Set(), last: '' }
    e.codes.add(o.speciesCode); const when = clean(o.obsDt, 16); if (when > e.last) e.last = when
    seen.set(o.locId, e)
  }
  return (hotspots || []).filter((h) => h && /^L\d{3,12}$/.test(String(h.locId || '')) && Number.isFinite(h.lat) && Number.isFinite(h.lng)).map((h) => {
    const e = seen.get(h.locId)
    return { locId: h.locId, name: clean(h.locName, 80), species: e ? e.codes.size : 0, last: e ? e.last : clean(h.latestObsDt, 16), km: Math.round(km(town, h) * 10) / 10 }
  }).sort((a, b) => (b.species - a.species) || b.last.localeCompare(a.last) || a.km - b.km).slice(0, 8)
}

/** The county's day in numbers: { date, checklists, contributors, species }, or null if it isn't numbers. */
export function shapeCounty(stats, date) {
  const n = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : null)
  const c = n(stats && stats.numChecklists), p = n(stats && stats.numContributors), sp = n(stats && stats.numSpecies)
  return c == null || sp == null ? null : { date, checklists: c, contributors: p, species: sp }
}

/** What has been reported across the county lately that this week's near sightings haven't: [{ code, name, sci, reports }], most reported first. */
export function shapePossible(regionObs, nearCodes = []) {
  const near = new Set(nearCodes), by = new Map()
  for (const o of regionObs || []) {
    const code = String(o.speciesCode || '')
    if (!CODE.test(code) || o.obsValid === false || near.has(code)) continue
    const b = by.get(code) || { code, name: clean(o.comName, 80), sci: clean(o.sciName, 80), reports: 0 }
    b.reports++; by.set(code, b)
  }
  return [...by.values()].sort((a, b) => b.reports - a.reports).slice(0, 30)
}

/** The nearest recent sightings of one bird: [{ where, when, count, checklist, km }], nearest first; a private spot has no name or link. */
export function shapeNearest(obs, town) {
  return (obs || []).filter((o) => o && Number.isFinite(o.lat) && Number.isFinite(o.lng)).map((o) => ({
    where: o.locationPrivate ? null : clean(o.locName, 80) || null, when: clean(o.obsDt, 16), count: Number(o.howMany) || 0,
    checklist: !o.locationPrivate && /^S\d{4,12}$/.test(o.subId || '') ? o.subId : null, km: Math.round(km(town, o) * 10) / 10,
  })).sort((a, b) => a.km - b.km).slice(0, 6)
}

// The words and links for the screen are in src/lib/birdWords.js.
