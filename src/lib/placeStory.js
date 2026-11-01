// ============================================
// placeStory.js -- why we're looking at that place today: how it differs from home
// ============================================
// Pure: tests/place-story.test.mjs. World's big card names the place of the
// day, and this is its reason in a few lines: the biggest difference from
// home right now (rain, snow, heat, cold, wind, dark, a day ahead), the
// temperature against ours, what time and light it is there, tomorrow there.
// Words from the two forecasts and the places' own distance; nothing invented.

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
/** The way from home to a place, as a compass word. */
export function compassFrom(home, p) {
  const dy = p.lat - home.lat, dx = (p.lng - home.lng) * Math.cos((home.lat * Math.PI) / 180)
  return COMPASS[Math.round((((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360) / 45) % 8]
}
const WET = ['rain', 'drizzle', 'thunder']
const lower = (s) => String(s || '').toLowerCase()
const round = (x) => Math.round(x)

/** "34 miles southwest of home", "2,400 miles away, 3 hours ahead". */
export function relationWords({ miles, direction, ahead }) {
  const mi = miles < 100 ? round(miles) : Math.round(miles / 10) * 10
  const far = miles >= 500
  const clock = ahead ? `${Math.abs(ahead) / 60 === 1 ? '1 hour' : `${Number.isInteger(Math.abs(ahead) / 60) ? Math.abs(ahead) / 60 : (Math.abs(ahead) / 60).toFixed(1)} hours`} ${ahead > 0 ? 'ahead' : 'behind'}` : null
  return far ? `${mi.toLocaleString('en-US')} miles away${clock ? `, ${clock}` : ''}` : `${mi} miles ${direction} of home`
}

/**
 * The story: { kicker, headline, lines }.
 * `place` { name }, `f` the place's forecast, `home` home's, `ahead` minutes its
 * clock is ahead of home's, `miles`, `direction`, `dark` is it dark there,
 * `clock` its time as words, `sunWords` e.g. "Sunset 5:20 PM".
 */
export function placeStory({ place, f, home, ahead = 0, miles, direction, dark, clock, sunWords }) {
  if (!f || !home) return null
  const name = place.name, here = home.now.temp, there = f.now.temp, diff = there - here, ad = Math.abs(diff)
  const wetThere = WET.includes(f.now.pic), wetHome = WET.includes(home.now.pic)
  const warmer = diff > 0 ? 'warmer' : ad >= 12 ? 'colder' : 'cooler'
  let headline
  if (f.now.pic === 'snow' && home.now.pic !== 'snow') headline = `Snow in ${name} while we’re at ${here}°`
  else if (f.now.pic === 'thunder' && home.now.pic !== 'thunder') headline = `Thunderstorms over ${name}`
  else if (wetThere && !wetHome) headline = `It’s raining in ${name}, and dry at home`
  else if (wetHome && !wetThere) headline = `Wet at home, but ${name} is ${lower(f.now.words)}`
  else if (ad >= 12) headline = `${name} is ${ad}° ${warmer} than home`
  else if (f.now.gusts != null && f.now.gusts >= 30 && (home.now.gusts ?? 0) < 20) headline = `Windy in ${name}: gusts to ${round(f.now.gusts)} mph`
  else if (ahead >= 600 && dark) headline = `It’s already night in ${name}`
  else if (ad >= 5) headline = `A little ${warmer} in ${name}: ${ad}° ${diff > 0 ? 'above' : 'below'} home`
  else headline = `${name} is much like home today, within ${Math.max(1, ad)}°`
  const lines = []
  lines.push(`${there}° and ${lower(f.now.words)} there, ${ad < 2 ? 'about the same as' : diff > 0 ? `${ad}° warmer than` : `${ad}° cooler than`} our ${here}°.${f.today ? ` Today’s range: ${f.today.low}° to ${f.today.high}°.` : ''}`)
  if (ahead) lines.push(`It’s ${clock} there (${Math.abs(ahead) / 60 === 1 ? '1 hour' : `${Number.isInteger(Math.abs(ahead) / 60) ? Math.abs(ahead) / 60 : (Math.abs(ahead) / 60).toFixed(1)} hours`} ${ahead > 0 ? 'ahead' : 'behind'}): ${dark ? 'dark' : 'daylight'}${sunWords ? `. ${sunWords}` : ''}.`)
  else if (sunWords) lines.push(`${sunWords}.`)
  const tom = f.days && f.days.find((d, i) => i > 0)
  if (tom) lines.push(`Tomorrow: ${lower(tom.words)}, ${round(tom.high)}° and ${round(tom.low)}°${tom.rain >= 40 ? `, ${tom.rain}% chance of rain` : ''}${tom.gusts >= 30 ? `, gusty to ${round(tom.gusts)} mph` : ''}.`)
  return { kicker: relationWords({ miles, direction, ahead }), headline, lines, line: place.line || null }
}
