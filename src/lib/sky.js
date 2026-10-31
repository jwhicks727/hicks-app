// ============================================
// sky.js -- the colour of the sky, the time of day, the moon, your shadow
// ============================================
// Pure functions, no React, so tests can run them in Node. The sun and moon
// positions come from SunCalc (passed in), worked out on the device from
// home's town-level position: no outside service, and never the address.

// Home, at town level only (Fontana's centre). The exact home position is set
// inside the app and kept in the family's own database, never in code.
export const HOME_TOWN = { lat: 34.0922, lng: -117.435, tz: 'America/Los_Angeles' }

// The sky behind everything, by phase of the day. Colours from the vision
// board's pins, warmed (decisions log, 2026-10-31).
export const SKIES = {
  night: { name: 'Night', dark: true, g: ['#120F22', '#2A1E3D', '#5A3A55'] },
  dawn: { name: 'Dawn', dark: true, g: ['#3C3F7A', '#B08A9A', '#F0B98A'] },
  morning: { name: 'Morning', dark: false, g: ['#7E9FD3', '#C2B4C4', '#F4D8B4'] },
  day: { name: 'Day', dark: false, g: ['#6E9ED6', '#9CC4E6', '#F1DCC0'] },
  golden: { name: 'Golden hour', dark: false, g: ['#A9A6B8', '#E6B47F', '#D88A4C'] },
  sunset: { name: 'Sunset', dark: true, g: ['#3B5F87', '#D6664D', '#E08452', '#E9A962'] },
  dusk: { name: 'Dusk', dark: true, g: ['#1E1733', '#5B3B5E', '#B07A82', '#E0A070'] },
}

/** Which phase of the day `now` is in, from SunCalc.getTimes() for that day. */
export function phaseOf(now, t) {
  const mid = new Date((t.sunset.getTime() + t.dusk.getTime()) / 2)
  if (now < t.dawn || now >= t.dusk) return 'night'
  if (now < t.sunrise) return 'dawn'
  if (now < t.goldenHourEnd) return 'morning'
  if (now < t.goldenHour) return 'day'
  if (now < t.sunsetStart) return 'golden'
  if (now < mid) return 'sunset'
  return 'dusk'
}

export function skyGradient(key) {
  return `linear-gradient(180deg, ${SKIES[key].g.join(', ')})`
}

/** "Good evening" runs to midnight, so the app never says goodbye by mistake. */
export function greeting(hour) {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']

/** SunCalc's azimuth (from south, west positive) as a bearing from north. */
export function bearing(azimuth) {
  return (((azimuth * 180) / Math.PI + 180) % 360 + 360) % 360
}

/** A shadow's length in words, from its ratio to your height. */
export function lengthWords(ratio) {
  if (ratio < 0.6) return `about ${Math.round(ratio * 10) / 10} times your height`
  if (ratio < 1.2) return 'about as long as you are tall'
  return `about ${ratio < 10 ? Math.round(ratio * 10) / 10 : Math.round(ratio)} times your height`
}

/** The lit part of the moon as an SVG path, centred on 0,0 with radius r, lit on the right (mirror it when waning). */
export function moonLitPath(fraction, r) {
  const tx = r * Math.abs(1 - 2 * fraction)
  return `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${tx.toFixed(2)} ${r} 0 0 ${fraction > 0.5 ? 1 : 0} 0 ${-r}Z`
}

export function moonName(phase) {
  if (phase < 0.03 || phase > 0.97) return 'New moon'
  if (phase < 0.22) return 'Waxing crescent'
  if (phase < 0.28) return 'First quarter'
  if (phase < 0.47) return 'Waxing gibbous'
  if (phase < 0.53) return 'Full moon'
  if (phase < 0.72) return 'Waning gibbous'
  if (phase < 0.78) return 'Last quarter'
  return 'Waning crescent'
}

// Traditional names, by the month the full moon falls in.
export const FULL_MOON_NAMES = ['Wolf', 'Snow', 'Worm', 'Pink', 'Flower', 'Strawberry', 'Buck', 'Sturgeon', 'Corn', 'Hunter’s', 'Beaver', 'Cold']

/**
 * A line for the end of a morning sit: when the sun came (or comes) up, and
 * where the moon is, in words. `hm` formats a Date as a clock time at home.
 */
export function morningSky(now, SunCalc, hm, at = HOME_TOWN) {
  const t = SunCalc.getTimes(now, at.lat, at.lng)
  const sun = now >= t.sunrise ? `The sun came up at ${hm(t.sunrise)}` : `The sun comes up at ${hm(t.sunrise)}`
  const ill = SunCalc.getMoonIllumination(now), pos = SunCalc.getMoonPosition(now, at.lat, at.lng)
  const name = moonName(ill.phase).toLowerCase()
  const article = /^[aeiou]/.test(name) ? 'an' : 'a'
  if (name === 'new moon') return `${sun}, and the moon is new: no moon to find today.`
  const where = pos.altitude > 0.05 ? `still up in the ${COMPASS[Math.round(bearing(pos.azimuth) / 45) % 8]}` : 'below the horizon for now'
  return `${sun}. The moon is ${article} ${name}, ${Math.round(ill.fraction * 100)}% lit, ${where}.`
}
