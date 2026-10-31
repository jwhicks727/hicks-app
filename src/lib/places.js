// ============================================
// places.js -- our places, where they are, and how to get there in a maps app
// ============================================
// Pure, so tests run it in Node. Every place is a town or a public building,
// found in a maps app by name; home is the town (HOME_TOWN), never the
// address, and has no maps link. A place sits on the map at its town, so
// places in one town fan out round it rather than pretending to a street.

import { HOME_TOWN } from './sky.js'

const LA = 'America/Los_Angeles'

// The map's three zoom stops, smallest first. `box` is what the stop must
// show: [west, south, east, north].
export const STOPS = {
  home: { name: 'Around home', layer: 'near', box: [-117.86, 33.97, -116.86, 34.34] },
  socal: { name: 'SoCal', layer: 'near', box: [-118.3, 32.62, -116.8, 34.32] },
  world: { name: 'The world', layer: 'world', box: [-165, -36, 125, 64] },
}
export const STOP_ORDER = ['home', 'socal', 'world']

// `stop` is the closest stop a place is drawn at on its own; zoomed further
// out, it joins the group round home. `maps` is what a maps app searches for.
export const PLACES = [
  { slug: 'home', name: 'Home', town: 'Fontana', lat: HOME_TOWN.lat, lng: HOME_TOWN.lng, tz: LA, stop: 'home', colour: '#D4553A', scene: 'home', line: 'Where Team Hicks lives', home: true },
  { slug: 'kordyak', name: 'Kordyak', town: 'Fontana', lat: HOME_TOWN.lat, lng: HOME_TOWN.lng, tz: LA, stop: 'home', colour: '#E0662F', scene: 'kordyak', line: 'Laurie’s school, in Rialto Unified', maps: 'Nancy R. Kordyak Elementary School, Fontana, CA' },
  { slug: 'ruble', name: 'Wayne Ruble', town: 'Fontana', lat: HOME_TOWN.lat, lng: HOME_TOWN.lng, tz: LA, stop: 'home', colour: '#4A7FD6', scene: 'ruble', line: 'Anna’s school, in Fontana Unified', maps: 'Wayne Ruble Middle School, Fontana, CA' },
  { slug: 'soar', name: 'SOAR', town: 'San Bernardino', lat: 34.1083, lng: -117.2898, tz: LA, stop: 'home', colour: '#5FA85A', scene: 'soar', line: 'Jason’s school', maps: 'SOAR Charter Academy, San Bernardino, CA' },
  { slug: 'sacred-heart', name: 'Sacred Heart', town: 'Rancho Cucamonga', lat: 34.1064, lng: -117.5931, tz: LA, stop: 'home', colour: '#B3263A', scene: 'parish', line: 'Our parish', maps: 'Sacred Heart Catholic Church, Rancho Cucamonga, CA' },
  { slug: 'redlands', region: 'San Bernardino County', name: 'Redlands', town: 'Redlands', lat: 34.0556, lng: -117.1825, tz: LA, stop: 'home', colour: '#E8892B', scene: 'redlands', line: 'Orange groves under the San Bernardino Mountains' },
  { slug: 'claremont', region: 'Los Angeles County', name: 'Claremont', town: 'Claremont', lat: 34.0967, lng: -117.7198, tz: LA, stop: 'home', colour: '#7A6BB0', scene: 'claremont', line: 'The Village and the colleges, under Mount Baldy' },
  { slug: 'san-dimas', region: 'Los Angeles County', name: 'San Dimas', town: 'San Dimas', lat: 34.1067, lng: -117.8067, tz: LA, stop: 'home', colour: '#8A9A3B', scene: 'san-dimas', line: 'Foothills and oaks' },
  { slug: 'big-bear', region: 'San Bernardino Mountains', name: 'Big Bear', town: 'Big Bear Lake', lat: 34.2439, lng: -116.9114, tz: LA, stop: 'home', colour: '#2F7D7A', scene: 'big-bear', line: 'Lake, pines and snow, up in the mountains', maps: 'Big Bear Lake, CA' },
  { slug: 'anaheim', region: 'Orange County', name: 'Anaheim', town: 'Anaheim', lat: 33.8121, lng: -117.919, tz: LA, stop: 'socal', colour: '#D66BA0', scene: 'anaheim', line: 'Castles, mountains and fireworks', maps: 'Disneyland Resort, Anaheim, CA' },
  { slug: 'long-beach', region: 'Los Angeles County', name: 'Long Beach', town: 'Long Beach', lat: 33.7701, lng: -118.1937, tz: LA, stop: 'socal', colour: '#2C6E9E', scene: 'long-beach', line: 'The old liner, the harbour and its cranes' },
  { slug: 'san-diego', region: 'San Diego County', name: 'San Diego', town: 'San Diego', lat: 32.7157, lng: -117.1611, tz: LA, stop: 'socal', colour: '#2A9D8F', scene: 'san-diego', line: 'Sailboats on the bay' },
  { slug: 'kona', region: 'Island of Hawaiʻi', name: 'Kona', town: 'Kailua-Kona', lat: 19.64, lng: -155.9969, tz: 'Pacific/Honolulu', stop: 'world', colour: '#E07A2E', scene: 'kona', line: 'Volcanoes, surf and palms on the Big Island', maps: 'Kailua-Kona, HI' },
  { slug: 'washington', region: 'District of Columbia', name: 'Washington', town: 'Washington, DC', lat: 38.8899, lng: -77.0091, tz: 'America/New_York', stop: 'world', colour: '#3F5FA8', scene: 'washington', line: 'The Capitol and the Monument', maps: 'Washington, DC' },
  { slug: 'new-york', region: 'New York City', name: 'New York', town: 'New York', lat: 40.7128, lng: -74.006, tz: 'America/New_York', stop: 'world', colour: '#5A6B7A', scene: 'new-york', line: 'The city and its skyline', maps: 'New York, NY' },
  { slug: 'paris', region: 'France', name: 'Paris', town: 'Paris', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', stop: 'world', colour: '#B5658F', scene: 'paris', line: 'The tower over the rooftops', maps: 'Paris, France' },
  { slug: 'beijing', region: 'China', name: 'Beijing', town: 'Beijing', lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai', stop: 'world', colour: '#C0392B', scene: 'beijing', line: 'The Temple of Heaven', maps: 'Beijing, China' },
]
export const placeBySlug = (slug) => PLACES.find((p) => p.slug === slug) || null

// What each stop draws: its own places, and one group for everything nearer
// home that is too close together to tell apart at that size.
const GROUPS = {
  socal: { slug: 'group-home', name: 'Around home', to: 'home', colour: '#D4553A' },
  world: { slug: 'group-socal', name: 'SoCal', to: 'socal', colour: '#D4553A' },
}
export function pinsAt(stop) {
  const rank = STOP_ORDER.indexOf(stop)
  const own = PLACES.filter((p) => p.stop === stop)
  const inner = PLACES.filter((p) => STOP_ORDER.indexOf(p.stop) < rank)
  const pins = own.map((p) => ({ ...p, kind: 'place' }))
  if (inner.length) pins.push({ ...GROUPS[stop], kind: 'group', lat: HOME_TOWN.lat, lng: HOME_TOWN.lng, count: inner.length })
  return pins
}

// ---- Mountains and lakes, drawn the way an old illustrated map would --------
// Rough outlines, from public maps: enough to say where the mountains are,
// never a survey. Mountains are drawn as rows of little peaks at a fixed size
// on screen; lakes are their own shape, to scale.
export const RANGES = [
  { name: 'San Gabriel Mountains', label: [-117.98, 34.3], poly: [[-118.38, 34.36], [-118.0, 34.4], [-117.66, 34.4], [-117.44, 34.33], [-117.46, 34.22], [-117.7, 34.18], [-118.0, 34.19], [-118.3, 34.25]], snow: true },
  { name: 'San Bernardino Mountains', label: [-117.06, 34.27], poly: [[-117.42, 34.32], [-117.1, 34.38], [-116.78, 34.36], [-116.64, 34.24], [-116.76, 34.07], [-117.02, 34.13], [-117.3, 34.18]], snow: true },
  { name: 'San Jacinto Mountains', label: [-116.68, 33.78], poly: [[-116.86, 33.88], [-116.66, 33.88], [-116.52, 33.68], [-116.7, 33.62], [-116.82, 33.76]], snow: true },
  { name: 'Santa Ana Mountains', label: [-117.57, 33.74], poly: [[-117.74, 33.86], [-117.6, 33.88], [-117.42, 33.64], [-117.5, 33.54], [-117.64, 33.7]] },
  { name: 'Santa Monica Mountains', label: [-118.75, 34.11], poly: [[-119.0, 34.12], [-118.5, 34.16], [-118.52, 34.09], [-119.0, 34.07]] },
  { name: 'Laguna Mountains', label: [-116.58, 32.92], poly: [[-116.78, 33.1], [-116.48, 33.06], [-116.4, 32.76], [-116.64, 32.72]] },
]
// The two peaks you can see from home on a clear day, white in winter
export const PEAKS = [
  { name: 'Mount Baldy', lat: 34.289, lng: -117.646 },
  { name: 'San Gorgonio', lat: 34.099, lng: -116.825 },
]
export const LAKES = [
  { name: 'Big Bear Lake', lat: 34.246, lng: -116.935, rx: 0.055, ry: 0.007, tilt: -6 },
  { name: 'Lake Arrowhead', lat: 34.255, lng: -117.19, rx: 0.014, ry: 0.006, tilt: 0 },
  { name: 'Lake Perris', lat: 33.86, lng: -117.17, rx: 0.02, ry: 0.012, tilt: 0 },
  { name: 'Lake Elsinore', lat: 33.665, lng: -117.35, rx: 0.036, ry: 0.015, tilt: -20 },
  { name: 'Diamond Valley Lake', lat: 33.68, lng: -117.03, rx: 0.032, ry: 0.008, tilt: 10 },
  { name: 'Salton Sea', lat: 33.31, lng: -115.85, rx: 0.2, ry: 0.07, tilt: 40 },
]

/** Is a point inside a polygon (both in px)? */
export function inside([x, y], poly) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
/**
 * Little peaks filling each range (outlines in px), a staggered grid `gap` px
 * apart, kept clear of `avoid` ([x, y, r]) and inside the W x H frame.
 */
export function peakGlyphs(polys, avoid, W, H, gap = 13, cap = 260) {
  const out = []
  for (const poly of polys) {
    const start = out.length
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1])
    const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(W, Math.max(...xs)), y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(H, Math.max(...ys))
    let row = 0
    for (let y = y0 + gap * 0.5; y < y1; y += gap * 0.72, row++) {
      for (let x = x0 + (row % 2 ? gap / 2 : 0); x < x1; x += gap) {
        if (out.length - start >= cap) break
        if (inside([x, y], poly) && !avoid.some(([ax, ay, r]) => Math.hypot(ax - x, ay - y) < r)) out.push([x, y])
      }
    }
  }
  return out
}

// ---- Projections: the world (equirectangular, 1000 wide, 84°N to 58°S) and
// Southern California (its own box, true shapes at 33.6°N) --------------------
export function project(layer, lat, lng, data) {
  if (layer === 'world') return [((lng + 180) / 360) * 1000, ((84 - lat) / 360) * 1000]
  return [(lng - data.box[0]) * data.cos0 * data.k, (data.box[3] - lat) * data.k]
}
/** Units per degree of longitude on a layer. */
export const unitsPerLng = (layer, data) => (layer === 'world' ? 1000 / 360 : data.cos0 * data.k)

/**
 * A camera that fits a stop's box inside a W x H frame, less `bands` px at
 * top and bottom for labels and `side` px each side: { lng, lat, span }, the
 * span being degrees of longitude across the whole width.
 */
export function fitCamera(stop, W, H, bands, side, near) {
  const s = STOPS[stop], [w, so, e, n] = s.box
  const ux = unitsPerLng(s.layer, near), uy = s.layer === 'world' ? 1000 / 360 : near.k
  const bw = (e - w) * ux, bh = (n - so) * uy
  const scale = Math.min((W - 2 * side) / bw, Math.max(40, H - 2 * bands) / bh)
  return { lng: (w + e) / 2, lat: (n + so) / 2, span: W / scale / ux }
}

/** A layer's viewBox for a camera, in a W x H frame. */
export function viewBoxFor(layer, cam, W, H, near) {
  const vw = cam.span * unitsPerLng(layer, near), vh = (vw * H) / W
  const [cx, cy] = project(layer, cam.lat, cam.lng, near)
  return [cx - vw / 2, cy - vh / 2, vw, vh]
}
/** Where a place lands in the frame, in px. */
export function toScreen(layer, cam, W, H, near, lat, lng) {
  const [vx, vy, vw] = viewBoxFor(layer, cam, W, H, near)
  const [x, y] = project(layer, lat, lng, near)
  return [((x - vx) / vw) * W, ((y - vy) / vw) * W]
}
/** How much the Southern California layer shows over the world's, 0 to 1, by zoom. */
export function nearWeight(span) {
  const t = (Math.log(24) - Math.log(span)) / (Math.log(24) - Math.log(7))
  return Math.min(1, Math.max(0, t))
}
/** Part way from one camera to another: straight across, zooming evenly. */
export function tween(a, b, t) {
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  return { lng: a.lng + (b.lng - a.lng) * e, lat: a.lat + (b.lat - a.lat) * e, span: Math.exp(Math.log(a.span) + (Math.log(b.span) - Math.log(a.span)) * e) }
}

// ---- Labels: each in a band above or below the map, as near its pin as fits --
/**
 * Lay labels out in the bands: `items` [{ id, x, y, w }] (pin position and
 * label width, px), `W`, `H`, `rows` per band, `rowH`, `pad`, `gap`.
 * Returns { id: { left, top, side } }.
 */
export function layoutLabels(items, { W, H, rows, rowH, pad = 8, gap = 6 }) {
  const room = W - 2 * pad
  const width = (list) => list.reduce((s, i) => s + i.w + gap, -gap)
  const ys = items.map((i) => i.y), mid = items.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : H / 2
  // Pins spread up and down split by height; pins along one line (a valley's towns) take turns
  const flat = items.length && Math.max(...ys) - Math.min(...ys) < H * 0.25
  const byX = items.slice().sort((a, b) => a.x - b.x)
  let top = flat ? byX.filter((_, i) => i % 2 === 0) : items.filter((i) => i.y <= mid)
  let bottom = flat ? byX.filter((_, i) => i % 2 === 1) : items.filter((i) => i.y > mid)
  // Even the bands out when one holds too much
  const cap = room * rows
  const byMiddle = (list) => list.slice().sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid))
  while (width(top) > cap && width(bottom) < cap && top.length > 1) { const m = byMiddle(top)[0]; top = top.filter((i) => i !== m); bottom.push(m) }
  while (width(bottom) > cap && width(top) < cap && bottom.length > 1) { const m = byMiddle(bottom)[0]; bottom = bottom.filter((i) => i !== m); top.push(m) }
  const out = {}
  const place = (list, side) => {
    const sorted = list.slice().sort((a, b) => a.x - b.x)
    const lines = [sorted]
    if (rows > 1 && width(sorted) > room) {
      // Two rows of about the same width: widest first into whichever row is shorter
      const a = [], b = [], sum = (l) => l.reduce((t, i) => t + i.w, 0)
      for (const i of list.slice().sort((p, q) => q.w - p.w)) (sum(a) <= sum(b) ? a : b).push(i)
      lines.splice(0, 1, a.sort((p, q) => p.x - q.x), b.sort((p, q) => p.x - q.x))
    }
    lines.forEach((line, r) => {
      const lefts = spread(line.map((i) => i.x - i.w / 2), line.map((i) => i.w), pad, W - pad, gap)
      const topPx = side === 'top' ? rows * rowH - (r + 1) * rowH : H - rows * rowH + r * rowH
      line.forEach((i, k) => { out[i.id] = { left: lefts[k], top: topPx, side } })
    })
  }
  place(top, 'top')
  place(bottom, 'bottom')
  return out
}

/** One row of labels pushed apart until none overlap, kept inside [lo, hi]. */
export function spread(lefts, widths, lo, hi, gap) {
  const x = lefts.slice(), n = x.length
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < n; i++) x[i] = Math.max(x[i], i ? x[i - 1] + widths[i - 1] + gap : lo)
    for (let i = n - 1; i >= 0; i--) x[i] = Math.min(x[i], i < n - 1 ? x[i + 1] - gap - widths[i] : hi - widths[i])
  }
  for (let i = 0; i < n; i++) x[i] = Math.max(x[i], i ? x[i - 1] + widths[i - 1] + 2 : lo) // squeezed: let them touch
  return x
}

// ---- The night side of the world, from where the sun is overhead ------------
const rad = Math.PI / 180
/** The point on Earth with the sun straight overhead: { lat, lng }. */
export function subsolar(date) {
  const d = date.getTime() / 864e5 - 10957.5 // days from J2000
  const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad
  const lat = Math.asin(Math.sin(e) * Math.sin(L)) / rad
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad
  let eqt = (q - ra) / 15 // hours
  eqt = ((eqt % 24) + 36) % 24 - 12
  const utc = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const lng = ((-15 * (utc - 12 + eqt)) % 360 + 540) % 360 - 180
  return { lat, lng }
}
/** The night side as a path on the world layer, from 84°N to 58°S. */
export function nightPath(date) {
  const s = subsolar(date), dec = Math.max(Math.abs(s.lat), 0.1) * Math.sign(s.lat || 1)
  const pts = []
  for (let lng = -180; lng <= 180; lng += 3) {
    const lat = Math.atan(-Math.cos((lng - s.lng) * rad) / Math.tan(dec * rad)) / rad
    pts.push(project('world', Math.max(-58, Math.min(84, lat)), lng))
  }
  const edge = dec > 0 ? project('world', -58, 0)[1] : 0 // the pole in the dark
  return 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + `L1000 ${edge}L0 ${edge}Z`
}

// ---- Distance and time from home --------------------------------------------
export function milesBetween(a, b) {
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}
export function distanceWords(place) {
  if (place.town === 'Fontana') return place.home ? 'Fontana' : 'Here in Fontana'
  const mi = milesBetween(HOME_TOWN, place)
  const r = mi < 100 ? Math.round(mi) : Math.round(mi / 10) * 10
  return `About ${r.toLocaleString('en-US')} miles from home`
}
/** Minutes a time zone is ahead of home's at `now` (negative behind). */
export function minutesAhead(tz, now) {
  const wall = (zone) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]))
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute)
  }
  return Math.round((wall(tz) - wall(LA)) / 6e4)
}
export function aheadWords(tz, now) {
  const m = minutesAhead(tz, now)
  if (!m) return 'Same time as home'
  const h = Math.abs(m) / 60, n = Number.isInteger(h) ? String(h) : h.toFixed(1)
  return `${n} hour${h === 1 ? '' : 's'} ${m > 0 ? 'ahead of' : 'behind'} home`
}

// ---- Opening a place in the phone's own maps app ------------------------------
/**
 * Links to find a place, and directions to it, in the maps app this device
 * has: Apple Maps on an iPhone, iPad or Mac, the Android maps app through
 * geo:, Google Maps on the web otherwise. Home has none (its spot is kept in
 * the app, not in code).
 */
export function mapsLinks(place, ua = '') {
  if (place.home) return null
  const q = encodeURIComponent(place.maps || `${place.town}, CA`)
  const ll = `${place.lat.toFixed(4)},${place.lng.toFixed(4)}`
  if (/iPhone|iPad|iPod|Macintosh/.test(ua)) return { app: 'Apple Maps', open: `https://maps.apple.com/?q=${q}&ll=${ll}`, directions: `https://maps.apple.com/?daddr=${q}` }
  const google = `https://www.google.com/maps/dir/?api=1&destination=${q}`
  if (/Android/.test(ua)) return { app: 'Maps', open: `geo:${ll}?q=${q}`, directions: google }
  return { app: 'Google Maps', open: `https://www.google.com/maps/search/?api=1&query=${q}`, directions: google }
}
