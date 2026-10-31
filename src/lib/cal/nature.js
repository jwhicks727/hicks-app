// ============================================
// nature.js -- the year's turning points and the sky's calendar: solstices
// and equinoxes (Meeus, Astronomical Algorithms, ch. 27) and the moon's
// phases (ch. 49), each to a minute or two; meteor showers;
// and the clocks changing. Pure: tests run it in Node.
// ============================================

import { ds, addDays, nthWeekday, parts } from './dates.js'

const TZ = 'America/Los_Angeles'
const homeDate = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(t)

// Meeus table 27.C: [A, B, C] for the periodic terms.
const TERMS = [[485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186], [182, 27.85, 445267.112], [156, 73.14, 45036.886],
  [136, 171.52, 22518.443], [77, 222.54, 65928.934], [74, 296.72, 3034.906], [70, 243.58, 9037.513], [58, 119.81, 33718.147], [52, 297.17, 150.678],
  [50, 21.02, 2281.226], [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417], [18, 155.12, 67555.328], [17, 288.79, 4562.452],
  [16, 198.04, 62894.029], [14, 199.76, 31436.921], [12, 95.39, 14577.848], [12, 287.11, 31931.756], [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]]
const MEAN = [ // years 2000-3000, Meeus table 27.B
  [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
  [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030],
  [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
  [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032],
]
const rad = (deg) => (deg * Math.PI) / 180

/** The instant of a solstice or equinox: which 0 March, 1 June, 2 September, 3 December. */
export function seasonInstant(y, which) {
  const Y = (y - 2000) / 1000, c = MEAN[which]
  const jde0 = c[0] + c[1] * Y + c[2] * Y ** 2 + c[3] * Y ** 3 + c[4] * Y ** 4
  const T = (jde0 - 2451545) / 36525
  const W = rad(35999.373 * T - 2.47)
  const dl = 1 + 0.0334 * Math.cos(W) + 0.0007 * Math.cos(2 * W)
  const S = TERMS.reduce((s, [A, B, C]) => s + A * Math.cos(rad(B + C * T)), 0)
  const jde = jde0 + (0.00001 * S) / dl
  return new Date((jde - 2440587.5) * 864e5 - 69e3) // less about 69 s, Terrestrial to Universal Time
}

export const SEASONS = [
  { key: 'spring', name: 'Spring begins', word: 'The March equinox: day and night about even' },
  { key: 'summer', name: 'Summer begins', word: 'The June solstice: the longest day of the year' },
  { key: 'autumn', name: 'Autumn begins', word: 'The September equinox: day and night about even' },
  { key: 'winter', name: 'Winter begins', word: 'The December solstice: the shortest day, and the light starts coming back' },
]

/** The four turning points of year `y`, as home dates with their instant. */
export function seasonsOf(y) {
  return SEASONS.map((s, i) => { const t = seasonInstant(y, i); return { ...s, date: homeDate(t), at: t } })
}

/** Which season a home date is in. */
export function seasonOn(d) {
  const y = parts(d)[0], s = seasonsOf(y)
  if (d < s[0].date) return 'winter'
  if (d < s[1].date) return 'spring'
  if (d < s[2].date) return 'summer'
  if (d < s[3].date) return 'autumn'
  return 'winter'
}

export const FULL_MOONS = ['Wolf Moon', 'Snow Moon', 'Worm Moon', 'Pink Moon', 'Flower Moon', 'Strawberry Moon', 'Buck Moon', 'Sturgeon Moon', 'Corn Moon', 'Hunter’s Moon', 'Beaver Moon', 'Cold Moon']
const PHASES = [['new', 'New moon'], ['first', 'First quarter'], ['full', 'Full moon'], ['last', 'Last quarter']]

// Meeus ch. 49: [coefficient, E power, M, M', F, Omega] for each periodic term.
const NEW_FULL = {
  new: [-0.40720, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208],
  full: [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209],
}

/** The instant of a phase: k counts lunations from January 6, 2000 (0, .25, .5, .75 for the four phases). */
export function phaseInstant(k) {
  const T = k / 1236.85
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T ** 2 - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2
  const M = rad(2.5534 + 29.1053567 * k - 0.0000014 * T ** 2 - 0.00000011 * T ** 3)
  const Mp = rad(201.5643 + 385.81693528 * k + 0.0107582 * T ** 2 + 0.00001238 * T ** 3 - 0.000000058 * T ** 4)
  const F = rad(160.7108 + 390.67050284 * k - 0.0016118 * T ** 2 - 0.00000227 * T ** 3 + 0.000000011 * T ** 4)
  const O = rad(124.7746 - 1.56375588 * k + 0.0020672 * T ** 2 + 0.00000215 * T ** 3)
  const sin = Math.sin, frac = ((k % 1) + 1) % 1
  let c
  if (frac < 0.01 || frac > 0.99 || Math.abs(frac - 0.5) < 0.01) {
    const a = NEW_FULL[frac < 0.01 || frac > 0.99 ? 'new' : 'full']
    c = a[0] * sin(Mp) + a[1] * E * sin(M) + a[2] * sin(2 * Mp) + a[3] * sin(2 * F) + a[4] * E * sin(Mp - M) + a[5] * E * sin(Mp + M) + a[6] * E * E * sin(2 * M)
      - 0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M) - 0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F)
      + 0.00038 * E * sin(M - 2 * F) - 0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(O) - 0.00007 * sin(Mp + 2 * M) + 0.00004 * sin(2 * Mp - 2 * F)
      + 0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F) + 0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) + 0.00003 * sin(Mp - M + 2 * F)
      - 0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp)
  } else {
    c = -0.62801 * sin(Mp) + 0.17172 * E * sin(M) - 0.01183 * E * sin(Mp + M) + 0.00862 * sin(2 * Mp) + 0.00804 * sin(2 * F) + 0.00454 * E * sin(Mp - M)
      + 0.00204 * E * E * sin(2 * M) - 0.0018 * sin(Mp - 2 * F) - 0.0007 * sin(Mp + 2 * F) - 0.0004 * sin(3 * Mp) - 0.00034 * E * sin(2 * Mp - M)
      + 0.00032 * E * sin(M + 2 * F) + 0.00032 * E * sin(M - 2 * F) - 0.00028 * E * E * sin(Mp + 2 * M) + 0.00027 * E * sin(2 * Mp + M) - 0.00017 * sin(O)
      - 0.00005 * sin(Mp - M - 2 * F) + 0.00004 * sin(2 * Mp + 2 * F) - 0.00004 * sin(Mp + M + 2 * F) + 0.00004 * sin(Mp - 2 * M) + 0.00003 * sin(Mp + M - 2 * F)
      + 0.00003 * sin(3 * M) + 0.00002 * sin(2 * Mp - 2 * F) + 0.00002 * sin(Mp - M + 2 * F) - 0.00002 * sin(3 * Mp + M)
    const W = 0.00306 - 0.00038 * E * Math.cos(M) + 0.00026 * Math.cos(Mp) - 0.00002 * Math.cos(Mp - M) + 0.00002 * Math.cos(Mp + M) + 0.00002 * Math.cos(2 * F)
    c += frac < 0.5 ? W : -W
  }
  const A = [[299.77, 0.107408, 325], [251.88, 0.016321, 165], [251.83, 26.651886, 164], [349.42, 36.412478, 126], [84.66, 18.206239, 110], [141.74, 53.303771, 62],
    [207.14, 2.453732, 60], [154.84, 7.30686, 56], [34.52, 27.261239, 47], [207.19, 0.121824, 42], [291.34, 1.844379, 40], [161.72, 24.198154, 37], [239.56, 25.513099, 35], [331.55, 3.592518, 23]]
  let extra = 0
  A.forEach(([a, b, coef], i) => { extra += coef * 1e-6 * sin(rad(a + b * k - (i === 0 ? 0.009173 * T ** 2 : 0))) })
  jde += c + extra
  return new Date((jde - 2440587.5) * 864e5 - 69e3)
}

/**
 * The moon's four phases in year `y`, as home dates. A full moon carries its
 * traditional name: the one nearest the September equinox is the Harvest
 * Moon and the next the Hunter's Moon; the second in a month is a blue moon.
 */
const phaseCache = new Map()
export function moonPhases(y) {
  if (phaseCache.has(y)) return phaseCache.get(y)
  const out = []
  const k0 = Math.floor((y - 2000) * 12.3685) - 1
  for (let k = k0; k < k0 + 15; k++) {
    PHASES.forEach(([key, name], i) => {
      const at = phaseInstant(k + i / 4), date = homeDate(at)
      if (date.startsWith(String(y))) out.push({ key, name, date, at })
    })
  }
  out.sort((p, q) => p.at - q.at)
  const fulls = out.filter((p) => p.key === 'full')
  const sept = seasonInstant(y, 2).getTime()
  const harvest = fulls.reduce((best, p) => (Math.abs(p.at - sept) < Math.abs(best.at - sept) ? p : best), fulls[0])
  fulls.forEach((p, i) => {
    const m = parts(p.date)[1]
    p.moonName = FULL_MOONS[m - 1]
    if (p === harvest) p.moonName = 'Harvest Moon'
    else if (fulls[i - 1] === harvest) p.moonName = 'Hunter’s Moon'
    const sameMonth = fulls.filter((q) => parts(q.date)[1] === m)
    if (sameMonth.length === 2 && sameMonth[1] === p) p.moonName = 'Blue Moon'
  })
  phaseCache.set(y, out)
  return out
}

/** Meteor showers at their usual peak nights (the night that begins on this date). */
export const METEOR_SHOWERS = [
  { m: 1, d: 3, name: 'Quadrantid meteors', word: 'A short, sharp peak; best before dawn' },
  { m: 4, d: 22, name: 'Lyrid meteors', word: 'Best after midnight, looking up and away from the lights' },
  { m: 5, d: 5, name: 'Eta Aquariid meteors', word: 'Dust from Halley’s Comet; best in the hour before dawn' },
  { m: 8, d: 12, name: 'Perseid meteors', word: 'The summer favourite: a warm night, a blanket, after midnight' },
  { m: 10, d: 21, name: 'Orionid meteors', word: 'Halley’s Comet again; best after midnight' },
  { m: 11, d: 17, name: 'Leonid meteors', word: 'Fast and bright; best before dawn' },
  { m: 12, d: 13, name: 'Geminid meteors', word: 'The year’s richest shower, and good before midnight too' },
]

/** The clocks: forward on the second Sunday of March, back on the first Sunday of November. */
export function clockChanges(y) {
  return [
    { date: nthWeekday(y, 3, 0, 2), name: 'Clocks spring forward', word: 'At 2 AM: an hour less sleep, and light into the evening' },
    { date: nthWeekday(y, 11, 0, 1), name: 'Clocks fall back', word: 'At 2 AM: an hour more sleep, and the sun sets an hour earlier' },
  ]
}

export { ds, addDays }
