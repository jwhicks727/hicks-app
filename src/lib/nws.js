// ============================================
// nws.js -- the backup forecast: the National Weather Service's hourly
// forecast, turned into the shape Open-Meteo answers in, so every screen
// (shapeForecast in weather.js) reads it unchanged. Pure: tests run it on
// saved answers. Used only when Open-Meteo can't be reached
// (src/lib/forecastSource.js). The United States only.
// ============================================
// What the Weather Service's hourly forecast does not carry is left empty, not
// made up: no UV, no cloud layers, no rain amounts, no gusts, and no days
// before now. A forecast from here is marked `source: 'nws'` so the card says so.

import SunCalc from 'suncalc'

export const NWS_HOST = 'api.weather.gov'
export const nwsPointUrl = ({ lat, lng }) => `https://${NWS_HOST}/points/${lat.toFixed(4)},${lng.toFixed(4)}`
/** The hourly-forecast address a /points answer names, only if it really is the Weather Service's. */
export function hourlyUrlFrom(points) {
  const u = points && points.properties && points.properties.forecastHourly
  try { const p = new URL(u); return p.protocol === 'https:' && p.hostname === NWS_HOST ? p.toString() : null } catch { return null }
}

const COMPASS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const degreesOf = (word) => { const i = COMPASS16.indexOf(String(word || '').toUpperCase()); return i < 0 ? null : i * 22.5 }
/** "5 to 10 mph" -> 10; "Calm" or nothing -> 0 or null. */
export function windMph(text) {
  const n = (String(text || '').match(/\d+(\.\d+)?/g) || []).map(Number)
  return n.length ? Math.max(...n) : /calm/i.test(String(text)) ? 0 : null
}

/** An Open-Meteo (WMO) weather code from the forecast's words and the chance of rain. */
export function codeFromWords(words, pop = null) {
  const t = String(words || '').toLowerCase()
  const light = /slight chance|isolated|patchy/.test(t) && (pop == null || pop < 30)
  if (/thunder/.test(t)) return 95
  if (/freezing rain|ice|sleet/.test(t)) return 66
  if (/snow|flurr|blizzard/.test(t)) return /light|flurr|slight/.test(t) ? 71 : 73
  if (/shower/.test(t)) return light ? 2 : 80
  if (/drizzle/.test(t)) return light ? 2 : 53
  if (/rain/.test(t)) return light ? 2 : /light/.test(t) ? 61 : 63
  if (/fog|haze|smoke|mist/.test(t)) return /fog|mist/.test(t) ? 45 : 3
  if (/overcast|mostly cloudy|cloudy/.test(t)) return /partly/.test(t) ? 2 : 3
  if (/partly|mostly sunny|mostly clear/.test(t)) return /mostly sunny|mostly clear/.test(t) ? 1 : 2
  if (/sunny|clear|fair/.test(t)) return 0
  return 3
}

/** How warm or cold it feels, from the temperature (°F), humidity (%) and wind (mph): the Weather Service's own formulas. */
export function feelsLike(t, rh, wind) {
  if (t == null) return null
  if (t >= 80 && rh != null) {
    return -42.379 + 2.04901523 * t + 10.14333127 * rh - 0.22475541 * t * rh - 0.00683783 * t * t - 0.05481717 * rh * rh + 0.00122874 * t * t * rh + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh
  }
  if (t <= 50 && wind != null && wind >= 3) { const v = wind ** 0.16; return 35.74 + 0.6215 * t - 35.75 * v + 0.4275 * t * v }
  return t
}

const clock = (d, tz) => new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d).replace(' ', 'T')
const lone = (xs) => (xs.length ? xs : [null])
const rnd = (v) => (v == null ? null : Math.round(v * 10) / 10)

/**
 * The Weather Service's hourly answer (properties.periods) as Open-Meteo's:
 * { current, hourly, daily, source: 'nws' }. Times are the place's own wall clock.
 * A last day with under twelve hours is left out, so no day shows a half-day's high.
 */
export function nwsToForecast(json, { lat, lng, tz }) {
  const periods = ((json && json.properties && json.properties.periods) || []).filter((p) => p && typeof p.startTime === 'string' && typeof p.temperature === 'number')
  if (!periods.length) throw new Error('The Weather Service sent no hours.')
  const rows = periods.map((p) => {
    const f = p.temperatureUnit === 'C' ? p.temperature * 9 / 5 + 32 : p.temperature
    const pop = p.probabilityOfPrecipitation && typeof p.probabilityOfPrecipitation.value === 'number' ? p.probabilityOfPrecipitation.value : 0
    const rh = p.relativeHumidity && typeof p.relativeHumidity.value === 'number' ? p.relativeHumidity.value : null
    const wind = windMph(p.windSpeed)
    return { time: p.startTime.slice(0, 13) + ':00', temp: f, feels: feelsLike(f, rh, wind), rh, pop, wind, dir: degreesOf(p.windDirection), code: codeFromWords(p.shortForecast, pop), day: p.isDaytime ? 1 : 0 }
  })
  const first = rows[0]
  const dates = [...new Set(rows.map((r) => r.time.slice(0, 10)))]
  const keep = dates.filter((d, i) => i < dates.length - 1 || rows.filter((r) => r.time.startsWith(d)).length >= 12 || dates.length === 1)
  const daily = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_probability_max: [], precipitation_sum: [], wind_speed_10m_max: [], wind_gusts_10m_max: [], wind_direction_10m_dominant: [], uv_index_max: [], sunrise: [], sunset: [] }
  for (const d of keep) {
    const day = rows.filter((r) => r.time.startsWith(d))
    const noon = day.reduce((a, b) => (Math.abs(Number(b.time.slice(11, 13)) - 13) < Math.abs(Number(a.time.slice(11, 13)) - 13) ? b : a))
    const sun = SunCalc.getTimes(new Date(`${d}T20:00:00Z`), lat, lng)
    daily.time.push(d); daily.weather_code.push(noon.code)
    daily.temperature_2m_max.push(Math.max(...day.map((r) => r.temp))); daily.temperature_2m_min.push(Math.min(...day.map((r) => r.temp)))
    daily.precipitation_probability_max.push(Math.max(...day.map((r) => r.pop)))
    daily.precipitation_sum.push(null); daily.wind_speed_10m_max.push(Math.max(...lone(day.map((r) => r.wind).filter((x) => x != null)))); daily.wind_gusts_10m_max.push(null)
    daily.wind_direction_10m_dominant.push(noon.dir); daily.uv_index_max.push(null)
    daily.sunrise.push(Number.isNaN(sun.sunrise.getTime()) ? null : clock(sun.sunrise, tz)); daily.sunset.push(Number.isNaN(sun.sunset.getTime()) ? null : clock(sun.sunset, tz))
  }
  const inDays = (r) => keep.includes(r.time.slice(0, 10))
  const hs = rows.filter(inDays)
  return {
    source: 'nws',
    timezone: tz,
    current: { time: first.time, temperature_2m: first.temp, apparent_temperature: first.feels, relative_humidity_2m: first.rh ?? 50, weather_code: first.code, wind_speed_10m: first.wind ?? 0, wind_gusts_10m: null, wind_direction_10m: first.dir ?? 0, is_day: first.day },
    hourly: {
      time: hs.map((r) => r.time), temperature_2m: hs.map((r) => rnd(r.temp)), apparent_temperature: hs.map((r) => rnd(r.feels)), relative_humidity_2m: hs.map((r) => r.rh),
      precipitation_probability: hs.map((r) => r.pop), weather_code: hs.map((r) => r.code), wind_speed_10m: hs.map((r) => r.wind), wind_direction_10m: hs.map((r) => r.dir), is_day: hs.map((r) => r.day),
    },
    daily,
  }
}
