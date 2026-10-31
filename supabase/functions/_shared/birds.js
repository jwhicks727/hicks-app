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
export const inatUrl = (sci) => at('https://api.inaturalist.org/v1/taxa', { q: sci, rank: 'species', per_page: 1 })

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

/** A licensed photo from an iNaturalist taxa answer: { url, credit, licence } or null. */
export function photoOf(json) {
  const t = json && json.results && json.results[0]
  const p = t && t.default_photo
  if (!p || !p.license_code || !/^cc/i.test(p.license_code)) return null
  const url = String(p.medium_url || p.square_url || '')
  if (!/^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\//.test(url)) return null
  return { url, credit: clean(p.attribution, 160), licence: String(p.license_code).toUpperCase() }
}

// The words and links for the screen are in src/lib/birdWords.js.
