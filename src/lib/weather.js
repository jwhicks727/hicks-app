// ============================================
// weather.js -- the forecast at home, from Open-Meteo, and the National
// Weather Service's alerts. Pure: tests run it on saved answers.
// ============================================
// Both are free, need no key, and are fetched by the browser itself. Only
// the town's coordinates are sent (HOME_TOWN), never the address. The
// schools' own stations (Synoptic) come with its token (docs/PLAN.md).

import { HOME_TOWN } from './sky.js'

const HOURLY = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'precipitation_probability', 'precipitation', 'weather_code', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m', 'uv_index', 'is_day', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high']
const DAILY = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'precipitation_sum', 'wind_speed_10m_max', 'wind_gusts_10m_max', 'wind_direction_10m_dominant', 'uv_index_max', 'sunrise', 'sunset']
const CURRENT = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'weather_code', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m', 'is_day']

/** How far the home forecast reaches: three weeks back (what happened) and as far ahead as Open-Meteo goes. */
export const PAST_DAYS = 21, AHEAD_DAYS = 16

/**
 * The forecast at a point, in that point's own time zone (home's unless `tz`
 * says otherwise), `past` days back and `days` ahead.
 */
export function forecastUrl({ lat, lng, tz = HOME_TOWN.tz, past = 0, days = 7 } = HOME_TOWN) {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lng.toFixed(3), current: CURRENT.join(','), hourly: HOURLY.join(','), daily: DAILY.join(','),
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch', timezone: tz, forecast_days: String(days),
  })
  if (past) q.set('past_days', String(past))
  return `https://api.open-meteo.com/v1/forecast?${q}`
}
export function alertsUrl({ lat, lng } = HOME_TOWN) {
  return `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`
}

/** Right now at one of our places (its town's centre), in its own time zone. */
export function placeNowUrl({ lat, lng }) {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lng.toFixed(3), current: 'temperature_2m,weather_code,is_day', daily: 'temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit', timezone: 'auto', forecast_days: '1',
  })
  return `https://api.open-meteo.com/v1/forecast?${q}`
}
export function shapePlaceNow(json) {
  const c = json && json.current, d = json && json.daily
  if (!c) return null
  return { temp: Math.round(c.temperature_2m), high: d ? Math.round(d.temperature_2m_max[0]) : null, low: d ? Math.round(d.temperature_2m_min[0]) : null, ...conditions(c.weather_code, c.is_day) }
}

/** Right now at several places in one request (Open-Meteo answers a list for a list of points). */
export function placesNowUrl(list) {
  const q = new URLSearchParams({
    latitude: list.map((p) => p.lat.toFixed(3)).join(','), longitude: list.map((p) => p.lng.toFixed(3)).join(','),
    current: 'temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m',
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', timezone: 'auto', forecast_days: '1',
  })
  return `https://api.open-meteo.com/v1/forecast?${q}`
}
const clock = (iso) => { const m = /T(\d\d):(\d\d)/.exec(iso || ''); if (!m) return null; const h = Number(m[1]); return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}` }
const clockHour = (iso) => { const m = /T(\d\d):(\d\d)/.exec(iso || ''); return m ? Number(m[1]) + Number(m[2]) / 60 : null }
/**
 * Each place's weather right now, by slug: temp, words, picture, high, low, wind,
 * humidity, the day's chance of rain, and its sunrise and sunset in its own time.
 * `list` is in the order the request named them.
 */
export function shapePlacesNow(json, list) {
  const arr = Array.isArray(json) ? json : json ? [json] : []
  const out = {}
  list.forEach((p, i) => {
    const j = arr[i], c = j && j.current, d = j && j.daily
    if (!c) return
    out[p.slug] = {
      temp: Math.round(c.temperature_2m), ...conditions(c.weather_code, c.is_day),
      high: d ? Math.round(d.temperature_2m_max[0]) : null, low: d ? Math.round(d.temperature_2m_min[0]) : null,
      wind: c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) : null, humidity: c.relative_humidity_2m ?? null,
      rain: d && d.precipitation_probability_max ? d.precipitation_probability_max[0] : null,
      sunrise: d ? clock(d.sunrise[0]) : null, sunset: d ? clock(d.sunset[0]) : null,
      sunriseH: d ? clockHour(d.sunrise[0]) : null, sunsetH: d ? clockHour(d.sunset[0]) : null, isDay: Boolean(c.is_day),
    }
  })
  return out
}

// WMO weather codes, as Open-Meteo gives them: [words, picture]
const CODES = {
  0: ['Clear', 'clear'], 1: ['Mostly clear', 'clear'], 2: ['Partly cloudy', 'partly'], 3: ['Cloudy', 'cloudy'],
  45: ['Fog', 'fog'], 48: ['Freezing fog', 'fog'],
  51: ['Light drizzle', 'drizzle'], 53: ['Drizzle', 'drizzle'], 55: ['Heavy drizzle', 'drizzle'], 56: ['Freezing drizzle', 'drizzle'], 57: ['Freezing drizzle', 'drizzle'],
  61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'], 66: ['Freezing rain', 'rain'], 67: ['Freezing rain', 'rain'],
  71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'], 77: ['Snow grains', 'snow'],
  80: ['Showers', 'rain'], 81: ['Showers', 'rain'], 82: ['Heavy showers', 'rain'], 85: ['Snow showers', 'snow'], 86: ['Snow showers', 'snow'],
  95: ['Thunderstorms', 'thunder'], 96: ['Thunderstorms with hail', 'thunder'], 99: ['Thunderstorms with hail', 'thunder'],
}
export function conditions(code, isDay = 1) {
  const [words, pic] = CODES[code] || ['', 'cloudy']
  return { words, pic: !isDay && (pic === 'clear' || pic === 'partly') ? (pic === 'clear' ? 'night' : 'night-partly') : pic }
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
export const fromDirection = (deg) => COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8]

/** Wind in words; a dry wind out of the northeast or east is the Santa Anas. */
export function windWords(speed, gusts, deg, humidity) {
  const from = fromDirection(deg)
  const santaAna = ['northeast', 'east', 'north'].includes(from) && gusts >= 25 && (humidity == null || humidity <= 30)
  const how = gusts >= 45 ? 'Very windy' : gusts >= 30 ? 'Windy' : gusts >= 18 ? 'Breezy' : speed >= 5 ? 'A light breeze' : 'Calm'
  return { line: how === 'Calm' ? 'Calm' : `${how} from the ${from}${gusts >= 18 ? `, gusts to ${Math.round(gusts)} mph` : ''}`, santaAna }
}

const hourOf = (iso) => Number(iso.slice(11, 13))
export const hourWord = (h) => (h === 0 ? '12 AM' : h === 12 ? 'Noon' : h < 12 ? `${h} AM` : `${h - 12} PM`)
const num = (v, k = 1) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * k) / k : null)

/**
 * Every hour and every day in an Open-Meteo answer (forecast or archive), at
 * `nowIso` (local 'YYYY-MM-DDTHH:MM'): each hour with its rain chance, the
 * inches expected, the wind and where it's from; each day the same. `past`
 * marks what has already happened, `now` the hour we're in.
 */
export function shapeTimeline(json, nowIso) {
  const h = (json && json.hourly) || { time: [] }, d = (json && json.daily) || { time: [] }
  const nowH = String(nowIso || '').slice(0, 13), today = String(nowIso || '').slice(0, 10)
  const timeline = h.time.map((t, i) => ({
    time: t, date: t.slice(0, 10), hour: hourOf(t), label: hourWord(hourOf(t)),
    temp: num(h.temperature_2m?.[i]), fine: num(h.temperature_2m?.[i], 10), feels: num(h.apparent_temperature?.[i]), humidity: num(h.relative_humidity_2m?.[i]),
    rain: num(h.precipitation_probability?.[i]), inches: num(h.precipitation?.[i], 100),
    wind: num(h.wind_speed_10m?.[i]), gusts: num(h.wind_gusts_10m?.[i]), dir: num(h.wind_direction_10m?.[i]), uv: num(h.uv_index?.[i], 10),
    clouds: h.cloud_cover_low ? { low: h.cloud_cover_low[i], mid: h.cloud_cover_mid?.[i] ?? null, high: h.cloud_cover_high?.[i] ?? null } : null,
    past: t.slice(0, 13) < nowH, now: t.slice(0, 13) === nowH,
    ...conditions(h.weather_code?.[i], h.is_day?.[i] ?? 1),
  })).filter((x) => x.temp != null)
  const days = d.time.map((t, i) => ({
    date: t, high: num(d.temperature_2m_max?.[i]), low: num(d.temperature_2m_min?.[i]),
    rain: num(d.precipitation_probability_max?.[i]), inches: num(d.precipitation_sum?.[i], 100),
    wind: num(d.wind_speed_10m_max?.[i]), gusts: num(d.wind_gusts_10m_max?.[i]) ?? 0, dir: num(d.wind_direction_10m_dominant?.[i]),
    uv: d.uv_index_max?.[i] ?? null, sunrise: d.sunrise?.[i] || null, sunset: d.sunset?.[i] || null,
    past: t < today, today: t === today, ...conditions(d.weather_code?.[i], 1),
  })).filter((x) => x.high != null)
  return { timeline, allDays: days }
}

/**
 * Open-Meteo's answer, shaped for the screens, at `nowIso` (local
 * 'YYYY-MM-DDTHH:MM'): { now, hours (the next 12), days (today and the six
 * after), today, timeline (every hour it holds), allDays (every day) }.
 */
export function shapeForecast(json, nowIso) {
  const c = json.current
  const { timeline, allDays } = shapeTimeline(json, nowIso)
  const start = Math.max(0, timeline.findIndex((t) => t.now))
  const hours = timeline.slice(start, start + 12).map((x, i) => ({ ...x, label: i === 0 ? 'Now' : x.label }))
  const first = Math.max(0, allDays.findIndex((x) => x.date >= String(nowIso).slice(0, 10)))
  const days = allDays.slice(first, first + 7)
  const wind = windWords(c.wind_speed_10m, c.wind_gusts_10m, c.wind_direction_10m, c.relative_humidity_2m)
  return {
    now: { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: Math.round(c.relative_humidity_2m), speed: num(c.wind_speed_10m), gusts: num(c.wind_gusts_10m), dir: num(c.wind_direction_10m), wind, ...conditions(c.weather_code, c.is_day) },
    hours, days, today: days[0] || null, timeline, allDays, nowIndex: start,
    source: json.source === 'nws' ? 'nws' : 'open-meteo', // 'nws' is the backup (src/lib/nws.js): no UV, rain amounts or past days
  }
}

/** A day of weather from Open-Meteo's archive (what happened), shaped like the forecast's: { hours, day }. */
export function archiveUrl({ lat, lng, tz = HOME_TOWN.tz }, from, to = from) {
  return `https://archive-api.open-meteo.com/v1/archive?${new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lng.toFixed(3), start_date: from, end_date: to, timezone: tz,
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset',
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch',
  })}`
}

/** Inches in words: "0.12 in", "a trace" under a hundredth, nothing when dry. */
export const inchWords = (x) => (x == null || x <= 0 ? '' : x < 0.01 ? 'a trace' : `${x.toFixed(2)} in`)
/** An arrow's turn for wind *from* `deg`: it points the way the wind blows. */
export const windTurn = (deg) => (deg == null ? 0 : (deg + 180) % 360)

const SEVERITY = { Extreme: 3, Severe: 2, Moderate: 1, Minor: 0, Unknown: 0 }
/** The Weather Service's active alerts, most serious first: { event, headline, severity, ends, instruction }. */
export function shapeAlerts(json) {
  const seen = new Set()
  return (json?.features || []).map((f) => f.properties || {})
    .filter((p) => p.event && p.status !== 'Test' && !seen.has(p.event) && seen.add(p.event))
    .map((p) => ({ event: String(p.event).slice(0, 120), headline: String(p.headline || '').slice(0, 300), severity: p.severity || 'Unknown', level: SEVERITY[p.severity] ?? 0, ends: p.ends || p.expires || null, instruction: String(p.instruction || '').slice(0, 600) }))
    .sort((a, b) => b.level - a.level)
}

// ---- Air, recess and the sky's treats ---------------------------------------------
/** Open-Meteo's air quality at a point: the US index now and by the hour. */
export function airUrl({ lat, lng, tz = HOME_TOWN.tz }) {
  return `https://air-quality-api.open-meteo.com/v1/air-quality?${new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lng.toFixed(3), timezone: tz, current: 'us_aqi,pm2_5,ozone', hourly: 'us_aqi', past_days: '1', forecast_days: '2',
  })}`
}
export const AQI_BANDS = [
  { max: 50, name: 'Good', colour: '#3E9B5A' }, { max: 100, name: 'Moderate', colour: '#D9A826' }, { max: 150, name: 'Unhealthy for sensitive groups', colour: '#E8892B' },
  { max: 200, name: 'Unhealthy', colour: '#D9473A' }, { max: 300, name: 'Very unhealthy', colour: '#8E4AA8' }, { max: Infinity, name: 'Hazardous', colour: '#7A1F3A' },
]
export const aqiBand = (aqi) => (aqi == null ? null : AQI_BANDS.find((b) => aqi <= b.max))
/** { now, band, hours: [{ time, aqi }], pm25, ozone } from the air quality answer, or null. */
export function shapeAir(json) {
  const c = json && json.current
  if (!c || c.us_aqi == null) return null
  const h = json.hourly || { time: [], us_aqi: [] }
  return { now: Math.round(c.us_aqi), band: aqiBand(c.us_aqi), pm25: c.pm2_5 ?? null, ozone: c.ozone ?? null, hours: h.time.map((t, i) => ({ time: t, aqi: h.us_aqi[i] })).filter((x) => x.aqi != null) }
}

/**
 * Can the children play outside? A guess from the forecast and the air, never
 * the school's say: { level: 'go' | 'care' | 'inside', reasons: [words] }.
 * `hour` is a timeline hour; `aqi` a number or null.
 */
export function recessFlag(hour, aqi = null) {
  if (!hour) return null
  const reasons = []
  let level = 0
  const bump = (lv, why) => { level = Math.max(level, lv); reasons.push(why) }
  const feels = hour.feels ?? hour.temp
  if (aqi != null) { if (aqi > 150) bump(2, `Air is unhealthy (${aqi})`); else if (aqi > 100) bump(1, `Air is rough for sensitive lungs (${aqi})`) }
  if (feels != null) { if (feels >= 105) bump(2, `It feels like ${Math.round(feels)}°`); else if (feels >= 95) bump(1, `Hot: feels like ${Math.round(feels)}°, shade and water`); else if (feels <= 38) bump(1, `Cold: feels like ${Math.round(feels)}°`) }
  if (hour.gusts != null) { if (hour.gusts >= 45) bump(2, `Gusts to ${Math.round(hour.gusts)} mph`); else if (hour.gusts >= 30) bump(1, `Gusty, to ${Math.round(hour.gusts)} mph`) }
  if (hour.pic === 'thunder') bump(2, 'Thunder about')
  else if ((hour.inches ?? 0) >= 0.05 || (hour.rain ?? 0) >= 70) bump(2, 'Rain likely')
  else if ((hour.inches ?? 0) > 0 || (hour.rain ?? 0) >= 40) bump(1, 'A chance of rain')
  if ((hour.uv ?? 0) >= 8) bump(1, `Strong sun (UV ${Math.round(hour.uv)}): sunscreen and hats`)
  return { level: ['go', 'care', 'inside'][level], reasons: reasons.length ? reasons : ['A good day to be out'] }
}

/**
 * A night for stars from the clouds at nine and the moon's light: { grade:
 * 'dazzling' | 'good' | 'so-so' | 'poor', words }. `cloud` is total cover %,
 * `moon` the lit fraction 0-1.
 */
export function stargazing(cloud, moon) {
  if (cloud == null) return null
  if (cloud >= 70) return { grade: 'poor', words: 'Clouds will cover the stars tonight.' }
  if (cloud >= 35) return { grade: 'so-so', words: 'Patchy cloud: the brightest stars, between the gaps.' }
  if (moon <= 0.25) return { grade: 'dazzling', words: 'Clear and a thin moon: the best kind of night for stars. Look for the Milky Way away from the lights.' }
  if (moon <= 0.7) return { grade: 'good', words: 'Clear, with a middling moon: the bright stars and planets will show well.' }
  return { grade: 'good', words: 'Clear but a bright moon: lovely, though it washes the faint stars out.' }
}

/**
 * Could there be a rainbow? Rain somewhere near with the sun low behind you,
 * the old rule: showers in the hour, sun between 5 and 42 degrees up, and
 * the sky not wholly shut. A hopeful guess, said as one.
 */
export function rainbowChance(hour, sunAltDeg) {
  if (!hour || sunAltDeg == null) return false
  const showers = (hour.rain ?? 0) >= 30 && (hour.rain ?? 0) <= 85 && (hour.pic === 'rain' || hour.pic === 'drizzle' || hour.pic === 'partly' || hour.pic === 'cloudy')
  return showers && sunAltDeg >= 5 && sunAltDeg <= 42 && (hour.clouds ? hour.clouds.low < 90 : true)
}

/**
 * Today's high against yesterday's, in words: "Today will be much cooler than yesterday: a high of 68° against
 * 84°". { text (the whole sentence), intro ("Today will be"), lead ("much cooler": the screen sets it in
 * capitals and a colour), rest, tone ('cool' | 'warm' | 'same'), big (15° or more), d }. Within 3° it says
 * "Today will be nearly the same as yesterday" rather than nothing, so the line is always there; null only
 * when either day is missing.
 */
export function sinceYesterday(allDays) {
  const today = (allDays || []).find((d) => d.today), i = today ? allDays.indexOf(today) : -1, y = i > 0 ? allDays[i - 1] : null
  if (!today || !y || today.high == null || y.high == null) return null
  const d = today.high - y.high, a = Math.abs(d)
  const figures = `a high of ${today.high}° against ${y.high}°`
  const intro = 'Today will be'
  if (a < 3) return { big: false, d, tone: 'same', intro, lead: 'nearly the same', rest: `as yesterday: ${figures}`, text: `${intro} nearly the same as yesterday: ${figures}` }
  const word = a >= 15 ? 'much ' : a >= 8 ? '' : 'a little '
  const lead = `${word}${d > 0 ? 'warmer' : 'cooler'}`
  return { big: a >= 15, d, tone: d > 0 ? 'warm' : 'cool', intro, lead, rest: `than yesterday: ${figures}`, text: `${intro} ${lead} than yesterday: ${figures}` }
}
