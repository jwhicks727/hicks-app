// ============================================
// skyYear.js -- the sun and moon over a year, worked out on the device
// ============================================
// Pure: tests/sky-year.test.mjs. Every figure comes from SunCalc at home's
// coordinates (the town's, never the address); times are home's wall clock.

import SunCalc from 'suncalc'
import { HOME_TOWN, bearing } from './sky.js'

const { lat, lng, tz } = HOME_TOWN
const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
/** Minutes after midnight at home, with the seconds as a fraction; null for an invalid date. */
export function minutesOfDay(d) {
  if (!d || Number.isNaN(d.getTime())) return null
  const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, x.value]))
  return +p.hour * 60 + +p.minute + +p.second / 60
}
/** A date string's noon at home (about), safe for SunCalc to read the right day. */
export const noonOf = (date) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 20)) }
export const dateStr = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
export const daysOfYear = (y) => { const n = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365; return Array.from({ length: n }, (_, i) => { const d = new Date(Date.UTC(y, 0, 1 + i)); return dateStr(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) }) }

/** What each sky page graphs: its words, its colours (the tiles' own) and how to read a value. */
export const SKY_KEYS = {
  sunrise: { name: 'Sunrise', colour: '#F2A33A', unit: 'time', blurb: 'When the sun clears the horizon' },
  golden: { name: 'Golden hour', colour: '#E8892B', unit: 'time', blurb: 'When the light turns warm and long, before sunset' },
  sunset: { name: 'Sunset', colour: '#D6664D', unit: 'time', blurb: 'When the sun slips below the horizon' },
  lastlight: { name: 'Last light', colour: '#8A5BC4', unit: 'time', blurb: 'When the sky has gone dark after sunset' },
  daylight: { name: 'Daylight', colour: '#F2C14E', unit: 'length', blurb: 'How long the sun is up' },
  shadow: { name: 'Your shadow', colour: '#6B4A8E', unit: 'ratio', blurb: 'How long you cast at the sun’s highest' },
  moon: { name: 'The moon', colour: '#6C7FB8', unit: 'phase', blurb: 'Its phase, and when it rises and sets' },
}

/** One day's number for a sky key: minutes of the day (times), minutes long (daylight), shadow lengths in heights (noon). */
export function skyValue(key, date) {
  const t = SunCalc.getTimes(noonOf(date), lat, lng)
  if (key === 'sunrise') return minutesOfDay(t.sunrise)
  if (key === 'sunset') return minutesOfDay(t.sunset)
  if (key === 'golden') return minutesOfDay(t.goldenHour)
  if (key === 'lastlight') return minutesOfDay(t.dusk)
  if (key === 'daylight') return (t.sunset - t.sunrise) / 6e4
  if (key === 'shadow') return shadowRatio((SunCalc.getPosition(t.solarNoon, lat, lng).altitude * 180) / Math.PI)
  return null
}
/** Shadow length as a multiple of height, from the sun's height in degrees; null when it's down. */
export const shadowRatio = (altDeg) => (altDeg > 0.5 ? 1 / Math.tan((altDeg * Math.PI) / 180) : null)

/** A year of one key: [{ date, value }]. */
export const yearSeries = (key, year) => daysOfYear(year).map((date) => ({ date, value: skyValue(key, date) }))

/** The solstices and equinoxes of a year, found from how high the sun stands at noon (an equinox: it stands at 90° less the latitude). */
export function seasonMarks(year) {
  const days = daysOfYear(year)
  const noon = days.map((date) => ({ date, alt: (SunCalc.getPosition(SunCalc.getTimes(noonOf(date), lat, lng).solarNoon, lat, lng).altitude * 180) / Math.PI }))
  const level = 90 - lat
  const near = (from, to) => noon.filter((x) => x.date >= `${year}-${from}` && x.date <= `${year}-${to}`).reduce((a, b) => (Math.abs(b.alt - level) < Math.abs(a.alt - level) ? b : a))
  return [
    { key: 'spring', name: 'Spring equinox', date: near('03-10', '03-30').date },
    { key: 'summer', name: 'Longest day', date: noon.reduce((a, b) => (b.alt > a.alt ? b : a)).date },
    { key: 'fall', name: 'Autumn equinox', date: near('09-10', '09-30').date },
    { key: 'winter', name: 'Shortest day', date: noon.reduce((a, b) => (b.alt < a.alt ? b : a)).date },
  ]
}

/** Your shadow through a day, every ten minutes the sun is up: [{ minute, alt, ratio, bearing }]. */
export function shadowThroughDay(date) {
  const out = []
  const base = noonOf(date).getTime() - 20 * 36e5 + 8 * 36e5 // midnight at home (PST), near enough to step from; the wall clock is read back below
  for (let m = 0; m < 1440; m += 10) {
    const at = new Date(base + m * 6e4)
    const w = minutesOfDay(at)
    const p = SunCalc.getPosition(at, lat, lng), alt = (p.altitude * 180) / Math.PI
    const r = shadowRatio(alt)
    if (r != null) out.push({ minute: w, alt, ratio: r, bearing: (bearing(p.azimuth) + 180) % 360 })
  }
  return out.sort((a, b) => a.minute - b.minute)
}

/** The moon over `days` days from a date: phase (0-1), lit fraction, rise and set (minutes). */
export function moonMonth(date, days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(noonOf(date).getTime() + i * 864e5), ill = SunCalc.getMoonIllumination(d), mt = SunCalc.getMoonTimes(d, lat, lng)
    const ds = d.toISOString().slice(0, 10)
    return { date: ds, phase: ill.phase, fraction: ill.fraction, rise: mt.rise ? minutesOfDay(mt.rise) : null, set: mt.set ? minutesOfDay(mt.set) : null }
  })
}

/** "6:41 AM" from minutes after midnight. */
export function clockWords(min) {
  if (min == null) return '—'
  const m = Math.round(min) % 1440, h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0')
  return `${((h + 11) % 12) + 1}:${mm} ${h < 12 ? 'AM' : 'PM'}`
}
/** "13 h 42 m". */
export const lengthWordsMin = (min) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')} m`
/** A shadow's length in words, from a multiple of height. */
export const shadowWords = (r) => (r == null ? 'none' : r < 0.6 ? 'shorter than you' : r < 1.15 ? 'about your height' : r < 3 ? `about ${(Math.round(r * 2) / 2).toString()}× your height` : `${Math.round(r)}× your height, long and thin`)

/** Today's light as bands across the day: [{ key, from, to, colour, name }] in minutes after midnight. */
export function lightBands(date) {
  const t = SunCalc.getTimes(noonOf(date), lat, lng), m = (d) => minutesOfDay(d)
  const cuts = [[m(t.dawn), 'night'], [m(t.sunrise), 'dawn'], [m(t.goldenHourEnd), 'golden-am'], [m(t.goldenHour), 'day'], [m(t.sunset), 'golden-pm'], [m(t.dusk), 'dusk']]
  if (cuts.some(([x]) => x == null)) return []
  const names = { night: ['Night', '#1B1838'], dawn: ['Dawn', '#7D6FA8'], 'golden-am': ['Morning gold', '#F2A86E'], day: ['Day', '#7EB3E0'], 'golden-pm': ['Golden hour', '#E8892B'], dusk: ['Dusk', '#8A5BC4'] }
  const order = ['night', 'dawn', 'golden-am', 'day', 'golden-pm', 'dusk', 'night']
  const edges = [0, ...cuts.map(([x]) => x), 1440]
  return order.map((k, i) => ({ key: k + i, from: edges[i], to: edges[i + 1], colour: names[k][1], name: names[k][0] }))
}

/** The next full and new moons from a date: { full, new } as date strings. */
export function nextMoons(date) {
  const mm = moonMonth(date, 40)
  const cross = (target) => { for (let i = 1; i < mm.length; i++) { const a = mm[i - 1].phase, b = mm[i].phase; if (target === 0.5 ? a < 0.5 && b >= 0.5 : a > 0.9 && b < 0.1) return mm[i].date } return null }
  return { full: cross(0.5), new: cross(0) }
}
