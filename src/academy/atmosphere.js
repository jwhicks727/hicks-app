// ============================================
// atmosphere.js -- the air of the academy: the light of the hour, the real sun and moon, the weather at home
// ============================================
// Pure, so tests run it in Node (tests/atmosphere.test.mjs). Everything the campus and the rooms show of the
// sky is real: the sun and the moon stand where SunCalc puts them over home's town, the clouds, rain and wind
// are the forecast's "now" (src/lib/weather.js), and with no forecast there is no weather at all, only the sun
// and moon. Nothing here is invented, except while someone is trying a sky on (`pretend`), and the screen says so.
//
// The campus is looked at facing south, the way the sun is watched in the northern half of the world: east is
// on the left, so the sun and the moon rise on the left and set on the right, and at noon shadows fall toward us.
// On the grid that makes +i (down and right) the north-west and +j (down and left) the north-east: a room's
// right-hand wall faces the south-west, so its window takes the sun from late morning until it sets.

import SunCalc from 'suncalc'
import { HOME_TOWN, SKIES, phaseOf, bearing } from '../lib/sky.js'
import { windOf } from '../lib/wind.js'
import { minutesOfDay, noonOf } from '../lib/skyYear.js'
import { seasonFor } from '../lib/seasons.js'
import { TW } from './iso.js'

const DEG = 180 / Math.PI
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
const ease = (x) => { const t = clamp(x); return t * t * (3 - 2 * t) }
const r2 = (x) => Math.round(x * 100) / 100

// ---- Colour ---------------------------------------------------------------------------------
const rgb = (hex) => { const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
/** Two colours mixed: k of `b` into `a`. */
export function mix(a, b, k) {
  if (!b || k <= 0) return a
  const p = rgb(a), q = rgb(b)
  return '#' + p.map((c, n) => Math.round(c + (q[n] - c) * clamp(k)).toString(16).padStart(2, '0')).join('')
}

/** A little seeded randomness, so a scene looks the same every time it's drawn. */
export function seeded(seed) {
  let s = 0
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

// ---- The sun and the moon -------------------------------------------------------------------
/** Where the sun and the moon stand over a place: height above the horizon and bearing from north, in degrees. */
export function lightsAt(now, at = HOME_TOWN) {
  const s = SunCalc.getPosition(now, at.lat, at.lng), m = SunCalc.getMoonPosition(now, at.lat, at.lng), ill = SunCalc.getMoonIllumination(now)
  return {
    sun: { alt: s.altitude * DEG, az: bearing(s.azimuth) },
    moon: { alt: m.altitude * DEG, az: bearing(m.azimuth), fraction: ill.fraction, waning: ill.phase > 0.5 },
  }
}

/** The bearings the campus's sky spans, left edge to right: a little past the farthest the sun or moon ever rises and sets at home. */
export const SKY_SPAN = [50, 310]
/**
 * Where something in the sky sits on the campus's sky: `box` is { x0, x1, horizon, zenith } in the drawing's
 * units. East is on the left. Below the horizon it keeps sinking, so the hills can hide it.
 */
export function skyPoint(az, alt, box) {
  const t = clamp((az - SKY_SPAN[0]) / (SKY_SPAN[1] - SKY_SPAN[0]))
  return { x: r2(box.x0 + (box.x1 - box.x0) * t), y: r2(box.horizon - (alt / 90) * (box.horizon - box.zenith)) }
}

// ---- The weather at home ----------------------------------------------------------------------
export const WEATHERS = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder']
// How much of the sky each kind covers, least to most: the forecast's own cloud layers are kept inside it
const COVER = { clear: [0, 0.15], partly: [0.25, 0.6], cloudy: [0.75, 1], fog: [0.6, 0.9], drizzle: [0.8, 1], rain: [0.85, 1], snow: [0.8, 1], thunder: [0.95, 1] }
const NONE = { known: false, kind: 'clear', cover: 0, fall: 0, wet: false, puddles: false, words: '', temp: null }

/**
 * The weather over the academy, from the forecast at home (src/lib/weather.js shapeForecast): what kind it is,
 * how much cloud (0 to 1), how hard it's coming down (0 to 1), and whether puddles are still on the ground
 * (it's wet now, or rain fell in the last six hours). With no forecast: no weather, and `known` says so.
 */
export function weatherOf(forecast) {
  const n = forecast && forecast.now
  if (!n || !n.pic) return NONE
  const kind = n.pic === 'night' ? 'clear' : n.pic === 'night-partly' ? 'partly' : WEATHERS.includes(n.pic) ? n.pic : 'cloudy'
  const line = forecast.timeline || []
  const at = line.findIndex((h) => h.now)
  const hour = at >= 0 ? line[at] : (forecast.hours || [])[0]
  const c = hour && hour.clouds
  const measured = c && [c.low, c.mid, c.high].some(Number.isFinite) ? Math.max(c.low || 0, (c.mid || 0) * 0.85, (c.high || 0) * 0.5) / 100 : null
  const [lo, hi] = COVER[kind]
  const words = String(n.words || '')
  const hard = /heavy|hail/i.test(words) ? 1 : /light/i.test(words) ? 0.5 : 0.75
  const fall = kind === 'drizzle' ? 0.35 : kind === 'rain' || kind === 'snow' ? hard : kind === 'thunder' ? 1 : 0
  const wet = kind === 'drizzle' || kind === 'rain' || kind === 'thunder'
  const lately = at >= 0 ? line.slice(Math.max(0, at - 6), at + 1).reduce((sum, h) => sum + (h.inches || 0), 0) : 0
  return { known: true, kind, cover: r2(measured == null ? (lo + hi) / 2 : clamp(measured, lo, hi)), fall, wet, puddles: wet || lately >= 0.02, words, temp: Number.isFinite(n.temp) ? n.temp : null }
}

/** A weather someone is trying on, never kept: the same shape as the real one, marked `pretend`. */
export function pretendWeather(kind) {
  const [lo, hi] = COVER[kind] || COVER.clear
  const wet = kind === 'drizzle' || kind === 'rain' || kind === 'thunder'
  return { known: true, pretend: true, kind, cover: r2((lo + hi) / 2), fall: kind === 'drizzle' ? 0.35 : kind === 'rain' || kind === 'snow' ? 0.75 : kind === 'thunder' ? 1 : 0, wet, puddles: wet, words: '', temp: null }
}
/** A wind to try on, in the forecast's own shape: the real direction is kept when there is one. */
export const PRETEND_WINDS = { calm: 2, breeze: 9, windy: 18, gale: 34 }
export const pretendWind = (level, real) => ({ speed: PRETEND_WINDS[level], gusts: PRETEND_WINDS[level] * 1.5, dir: real && Number.isFinite(real.dir) ? real.dir : 270 })

// ---- The times of day to try on ---------------------------------------------------------------
export const TRY_TIMES = [['dawn', 'Dawn'], ['morning', 'Morning'], ['day', 'Midday'], ['golden', 'Golden hour'], ['sunset', 'Sunset'], ['dusk', 'Dusk'], ['night', 'Night']]
/** A moment on `date` (home's 'YYYY-MM-DD') in the middle of a phase of the day, from that day's own sun. */
export function momentOf(phase, date, at = HOME_TOWN) {
  const t = SunCalc.getTimes(noonOf(date), at.lat, at.lng)
  const between = (a, b, k = 0.5) => new Date(a.getTime() + (b.getTime() - a.getTime()) * k)
  switch (phase) {
    case 'dawn': return between(t.dawn, t.sunrise)
    case 'morning': return between(t.sunrise, t.goldenHourEnd, 0.6)
    case 'day': return t.solarNoon
    case 'golden': return between(t.goldenHour, t.sunsetStart)
    case 'sunset': return between(t.sunsetStart, t.sunset, 0.8)
    case 'dusk': return between(t.sunset, t.dusk, 0.8)
    case 'night': return new Date(t.dusk.getTime() + 2.5 * 36e5)
    default: return null
  }
}

// ---- The light of the hour --------------------------------------------------------------------
// What the hour lays over everything outdoors: [a colour, how much of it]. Lamps and windows are drawn over it.
const AMBIENT = {
  night: ['#0F1538', 0.56], dawn: ['#4A4C8C', 0.3], morning: ['#FFDCA8', 0.07], day: [null, 0],
  golden: ['#FFB25A', 0.16], sunset: ['#B0586E', 0.24], dusk: ['#2C2258', 0.42],
}
// Indoors the lamps are on, so the evening only warms and dims a room a little
const INDOORS = {
  night: ['#2B1C3A', 0.36], dawn: ['#4A4C8C', 0.16], morning: ['#FFDCA8', 0.04], day: [null, 0],
  golden: ['#FFB25A', 0.1], sunset: ['#B0586E', 0.12], dusk: ['#33244F', 0.25],
}
const SUNLIGHT = { dawn: '#FFD9B0', morning: '#FFE9C2', day: '#FFF4D6', golden: '#FFC46B', sunset: '#FF9E6B', dusk: '#FFB08A', night: '#FFF4D6' }
const MOONLIGHT = '#CFE0FF'

/** The colours laid over the world at this hour and in this weather, outdoors or in a room. */
export function washesOf(phase, weather, moon, indoors = false) {
  const [tint, k] = (indoors ? INDOORS : AMBIENT)[phase]
  const out = []
  // A bright moon in a clear sky lifts the night a little
  const moonlit = phase === 'night' && moon && moon.alt > 5 && weather.cover < 0.6 ? 0.12 * moon.fraction : 0
  if (tint) out.push([tint, r2(k - (indoors ? moonlit / 2 : moonlit))])
  if (!indoors) {
    if (weather.kind === 'snow') out.push(['#EEF3F8', 0.34])
    else if (weather.kind === 'fog') out.push(['#C9CED3', 0.24])
    else if (weather.cover > 0.6) out.push(['#77808C', r2((weather.wet ? 0.24 : 0.14) * weather.cover)])
  }
  return out
}
/** A colour as it looks under those washes. */
export const toneWith = (washes) => (hex) => washes.reduce((c, [t, k]) => mix(c, t, k), hex)

/**
 * A shadow on the ground, for something one unit tall on screen: how far it reaches (dx, dy, in the same units)
 * and how dark it is. From the sun by day; from a bright moon on a clear night, faintly; null when neither
 * casts one (a low sun, an overcast sky).
 */
export function shadowOf(sun, moon, weather) {
  const from = sun.alt > 1 ? { ...sun, strength: ease(sun.alt / 6) * 0.24 } : moon.alt > 8 && moon.fraction > 0.3 ? { ...moon, strength: 0.13 * moon.fraction } : null
  if (!from) return null
  const opacity = r2(from.strength * (1 - clamp(weather.cover * 1.15)))
  if (opacity < 0.03) return null
  // A height on screen is squeezed by the view (cos 30°); the ground's depth by half
  const reach = Math.min(1 / Math.tan(from.alt / DEG), 3.2) / 0.866
  const a = from.az / DEG
  return { dx: r2(Math.sin(a) * reach), dy: r2(-0.5 * Math.cos(a) * reach), opacity }
}

/** The outline round a set of points (a building's foot and its shadow's far end), as SVG points. */
export function hull(points) {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  if (p.length < 3) return p
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const half = (list) => { const out = []; for (const q of list) { while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop(); out.push(q) } out.pop(); return out }
  return [...half(p), ...half([...p].reverse())]
}

// ---- The light through a room's window ---------------------------------------------------------
// One square is this tall on a wall, in the wall's own units (the view squeezes heights by cos 30°)
export const SQUARE_HIGH = (TW / Math.SQRT2) * 0.866
const clipTo = (poly, inside, cut) => {
  const out = []
  poly.forEach((a, n) => { const b = poly[(n + 1) % poly.length], ia = inside(a), ib = inside(b); if (ia) out.push(a); if (ia !== ib) out.push(cut(a, b)) })
  return out
}
const clipAxis = (poly, key, bound, keepAbove) => clipTo(poly, (p) => (keepAbove ? p[key] >= bound : p[key] <= bound), (a, b) => { const t = (bound - a[key]) / (b[key] - a[key]); return Object.fromEntries(Object.keys(a).map((k) => [k, k === key ? bound : a[k] + (b[k] - a[k]) * t])) })

/**
 * The patch of light a window in the right-hand wall throws into a room: where it falls on the floor ({ i, j }
 * in squares) and, when the sun is low in the west, where it climbs the left-hand wall ({ j, z }: along the wall
 * in squares, up it in wall units). `win` is the window on its wall: { from, to } in squares along it, and
 * { sill, top } in wall units above the floor. Null when the light doesn't come in that side.
 */
export function beamOf(light, win, n, wallHigh) {
  if (!light || light.alt < 1.5) return null
  const a = light.az / DEG
  const di = (Math.sin(a) - Math.cos(a)) / Math.SQRT2, dj = (-Math.sin(a) - Math.cos(a)) / Math.SQRT2
  if (dj < 0.12) return null // the sun is round the other side of the building, or only grazes this wall
  const drop = Math.tan(light.alt / DEG) * SQUARE_HIGH // wall units lost for each square travelled
  const corners = [[win.from, win.sill], [win.to, win.sill], [win.to, win.top], [win.from, win.top]]
  let floor = corners.map(([i, z]) => { const d = z / drop; return { i: i + di * d, j: dj * d } })
  for (const [key, bound, above] of [['i', 0, true], ['i', n, false], ['j', n, false]]) floor = floor.length ? clipAxis(floor, key, bound, above) : floor
  let wall = []
  if (di < -0.02) {
    wall = corners.map(([i, z]) => { const d = i / -di; return { j: dj * d, z: z - d * drop } })
    for (const [key, bound, above] of [['z', 0, true], ['z', wallHigh, false], ['j', n, false]]) wall = wall.length ? clipAxis(wall, key, bound, above) : wall
  }
  const tidy = (list) => list.map((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, r2(v)])))
  if (floor.length < 3 && wall.length < 3) return null
  return { floor: floor.length >= 3 ? tidy(floor) : [], wall: wall.length >= 3 ? tidy(wall) : [] }
}

// ---- Lights on, by the kind of room -------------------------------------------------------------
const WARM = '#FFD98A'
// When each kind of room has its lights on, in hours of the day at home; they show once it's dark outside.
// The bakers start before dawn, the observatory works by red light all night, the dorm sleeps.
export const LIGHTS = {
  office: { hours: [[6, 21]], colour: WARM }, classroom: { hours: [[6.5, 18]], colour: WARM }, hall: { hours: [[0, 24]], colour: '#F2C14E' },
  library: { hours: [[6, 22]], colour: WARM }, art: { hours: [[7, 20]], colour: WARM }, lab: { hours: [[7, 21]], colour: '#DFF5E8' },
  music: { hours: [[7, 21]], colour: WARM }, gym: { hours: [[6, 21]], colour: '#FFF1C9' }, chapel: { hours: [[0, 24]], colour: '#FFB45E', flicker: true },
  cafe: { hours: [[6, 19.5]], colour: WARM }, greenhouse: { hours: [[0, 24]], colour: '#C9F59A' }, observatory: { hours: [[0, 6], [17, 24]], colour: '#FF6B5E' },
  theater: { hours: [[17, 22]], colour: '#FFC46B' }, pets: { hours: [[6, 21]], colour: WARM }, commons: { hours: [[6, 22.5]], colour: WARM },
  games: { hours: [[15, 22]], colour: '#FF7AD1' }, computer: { hours: [[7, 21]], colour: '#9FD8FF' }, bakery: { hours: [[4, 18]], colour: '#FFC97A' },
  pool: { hours: [[6, 21]], colour: '#7FE7F5' }, dorm: { hours: [[6, 7.5], [17, 21.5]], colour: '#FFC9A8' },
}
/** A room's lit windows at this hour: { colour, flicker } once it's dark outside and the room is in use, else null. */
export function lightOf(kind, hour, dark) {
  const l = LIGHTS[kind]
  if (!dark || !l || !l.hours.some(([from, to]) => hour >= from && hour < to)) return null
  return { colour: l.colour, flicker: Boolean(l.flicker) }
}
/** Smoke from a chimney: the bakery's oven before breakfast, the cafeteria's kitchen at lunch. */
export const smokes = (kind, hour) => (kind === 'bakery' && hour >= 4 && hour < 9) || (kind === 'cafe' && hour >= 10.5 && hour < 13)

// ---- The year on the ground ---------------------------------------------------------------------
/** The season the ground shows, by the month: winter, spring, summer or fall. */
export const groundSeason = (date) => ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'][Number(String(date).slice(5, 7)) - 1] || 'summer'
// What grows on a square nothing's been built on, by season; a holiday brings its own (every picture is one already in the catalog)
const FLOWERS = { spring: ['tulip', 'cherry-blossom', 'blossom', 'hibiscus'], summer: ['sunflower', 'rose', 'hibiscus', 'mushroom'], fall: ['mushroom', 'fallen-leaf', 'maple-leaf', 'rock'], winter: ['rock', 'mushroom', 'evergreen-tree', 'rock'] }
const HOLIDAY = { halloween: ['jack-o-lantern', 'jack-o-lantern', 'ghost', 'spider-web'], muertos: ['jack-o-lantern', 'candle', 'bouquet', 'candle'], christmas: ['christmas-tree', 'snowman-without-snow', 'wrapped-gift', 'christmas-tree'], thanksgiving: ['maple-leaf', 'fallen-leaf', 'mushroom', 'maple-leaf'], easter: ['tulip', 'rabbit', 'blossom', 'cherry-blossom'], valentine: ['rose', 'bouquet', 'rose', 'tulip'], july4: ['sunflower', 'fireworks', 'rose', 'sparkler'] }
export const sceneryFor = (season) => HOLIDAY[season.key] || FLOWERS[season.ground] || FLOWERS.summer
/** String lights along the roofs through Advent and Christmas: the colours, or null the rest of the year. */
export const roofLights = (season) => (season.key === 'christmas' ? ['#E8546B', '#F2C14E', '#5FA85A', '#4A7FD6'] : season.key === 'advent' ? ['#8A5BC4', '#8A5BC4', '#E79AB8', '#8A5BC4'] : null)

// ---- The wind, as the campus shows it -----------------------------------------------------------
// By how it feels (src/lib/wind.js LEVELS): seconds for a cloud to cross, for the flag to ripple once, how far a tree leans (degrees)
const AIR = { calm: { drift: 150, flag: 4.2, sway: 0.7 }, breeze: { drift: 80, flag: 2.4, sway: 1.6 }, windy: { drift: 44, flag: 1.2, sway: 3 }, gale: { drift: 24, flag: 0.7, sway: 5 } }
/** The wind on the campus: `to` is +1 when it blows toward the right of the screen (the west). */
export function airOf(now) {
  const w = windOf(now)
  return { ...w, ...AIR[w.level], to: w.known ? -w.side : 1 }
}

/** A far line of hills, as an SVG path closed along `floor`: the same every time for the same seed. */
export function ridge(seed, x0, x1, base, amp, floor, step = 14) {
  const r = seeded(seed)
  const waves = [0, 1, 2].map((k) => ({ f: (0.012 + r() * 0.02) * (k + 1), p: r() * 7, a: amp / (k + 1.4) }))
  const y = (x) => base - Math.abs(waves.reduce((s, w) => s + Math.sin(x * w.f + w.p) * w.a, 0)) - amp * 0.25
  let d = `M${x0} ${floor} L${x0} ${r2(y(x0))}`
  for (let x = x0 + step; x <= x1 + step; x += step) d += ` Q${r2(x - step / 2)} ${r2(y(x - step / 2) - 1.2)} ${Math.min(x, x1)} ${r2(y(Math.min(x, x1)))}`
  return `${d} L${x1} ${floor} Z`
}

// ---- All of it, at a moment -----------------------------------------------------------------------
const homeDate = (now, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now)

/**
 * The air of the academy at `now`: the phase of the day and its sky, the sun and moon, the weather and wind at
 * home (from `forecast`, or none), the light and the shadows they make, and the season. `tryOn` is
 * { time, weather, wind } (any of them), someone's pretend sky for this visit: `pretend` says so.
 * `waiting` is true while the forecast is still on its way (so the screen doesn't call it unreachable).
 */
export function atmosphereAt({ now = new Date(), forecast = null, tryOn = null, waiting = false, at = HOME_TOWN } = {}) {
  const today = homeDate(now, at.tz)
  const when = (tryOn && tryOn.time && momentOf(tryOn.time, today, at)) || now
  const phase = phaseOf(when, SunCalc.getTimes(when, at.lat, at.lng))
  const { sun, moon } = lightsAt(when, at)
  const weather = tryOn && WEATHERS.includes(tryOn.weather) ? pretendWeather(tryOn.weather) : weatherOf(forecast)
  const real = forecast && forecast.now ? { speed: forecast.now.speed, gusts: forecast.now.gusts, dir: forecast.now.dir } : null
  const wind = airOf(tryOn && PRETEND_WINDS[tryOn.wind] ? pretendWind(tryOn.wind, real) : real)
  const daylight = r2(ease((sun.alt + 6) / 14))
  const date = homeDate(when, at.tz)
  const outdoors = washesOf(phase, weather, moon), indoors = washesOf(phase, weather, moon, true)
  // The light that comes in at a window: the sun's by day, a bright moon's by night
  const clear = 1 - clamp(weather.cover * 1.05)
  const beam = sun.alt > 1.5
    ? { ...sun, colour: SUNLIGHT[phase], strength: r2(ease((sun.alt - 0.5) / 4.5) * clear * 0.46), of: 'sun' }
    : moon.alt > 6 && moon.fraction > 0.25 ? { ...moon, colour: MOONLIGHT, strength: r2(moon.fraction * clear * 0.2), of: 'moon' } : null
  return {
    now: when, hour: r2((minutesOfDay(when) || 0) / 60), date, phase, sky: SKIES[phase], daylight, dark: daylight < 0.5,
    sun: { ...sun, up: sun.alt > -0.8 }, moon: { ...moon, up: moon.alt > 0 },
    weather, wind, washes: outdoors, washesIn: indoors, tone: toneWith(outdoors),
    shadow: shadowOf(sun, moon, weather), beam: beam && beam.strength >= 0.05 ? beam : null,
    season: { ground: groundSeason(date), key: seasonFor(date).key },
    pretend: Boolean(tryOn && (tryOn.time || tryOn.weather || tryOn.wind)), waiting: Boolean(waiting && !forecast),
  }
}

/** A line for under the campus: what the sky over the school is, and that it's home's own. */
export function skyWords(a) {
  if (a.pretend) return 'A pretend sky, just for now.'
  const w = a.weather
  if (!w.known) return a.waiting ? 'Home’s sun and moon, right now. Looking at the weather…' : 'Home’s sun and moon, right now. The weather couldn’t be reached, so the sky is shown clear.'
  const wind = a.wind.known && a.wind.level !== 'calm' ? `, ${{ breeze: 'a breeze', windy: 'windy', gale: 'very windy' }[a.wind.level]}` : ''
  const temp = w.temp == null ? '' : `, ${w.temp}°`
  return `Home’s sky, right now: ${(w.words || 'cloudy').toLowerCase()}${temp}${wind}.${w.puddles && !w.wet ? ' Puddles from the rain earlier.' : ''}`
}
