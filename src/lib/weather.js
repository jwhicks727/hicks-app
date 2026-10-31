// ============================================
// weather.js -- the forecast at home, from Open-Meteo, and the National
// Weather Service's alerts. Pure: tests run it on saved answers.
// ============================================
// Both are free, need no key, and are fetched by the browser itself. Only
// the town's coordinates are sent (HOME_TOWN), never the address. The
// schools' own stations (Synoptic) come with its token (docs/PLAN.md).

import { HOME_TOWN } from './sky.js'

const HOURLY = ['temperature_2m', 'precipitation_probability', 'weather_code', 'wind_gusts_10m', 'is_day']
const DAILY = ['weather_code', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'wind_gusts_10m_max', 'uv_index_max']
const CURRENT = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'weather_code', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m', 'is_day']

export function forecastUrl({ lat, lng } = HOME_TOWN) {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lng.toFixed(3), current: CURRENT.join(','), hourly: HOURLY.join(','), daily: DAILY.join(','),
    temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', precipitation_unit: 'inch', timezone: HOME_TOWN.tz, forecast_days: '7',
  })
  return `https://api.open-meteo.com/v1/forecast?${q}`
}
export function alertsUrl({ lat, lng } = HOME_TOWN) {
  return `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lng.toFixed(4)}`
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
const hourWord = (h) => (h === 0 ? '12 AM' : h === 12 ? 'Noon' : h < 12 ? `${h} AM` : `${h - 12} PM`)

/**
 * Open-Meteo's answer, shaped for the screens, at `nowIso` (local
 * 'YYYY-MM-DDTHH:MM'): { now, hours (the next 12), days (7) }.
 */
export function shapeForecast(json, nowIso) {
  const c = json.current, h = json.hourly, d = json.daily
  const start = Math.max(0, h.time.findIndex((t) => t.slice(0, 13) === nowIso.slice(0, 13)))
  const hours = h.time.slice(start, start + 12).map((t, i) => ({
    time: t, label: i === 0 ? 'Now' : hourWord(hourOf(t)), temp: Math.round(h.temperature_2m[start + i]),
    rain: h.precipitation_probability?.[start + i] ?? null, gusts: Math.round(h.wind_gusts_10m?.[start + i] ?? 0),
    ...conditions(h.weather_code[start + i], h.is_day?.[start + i] ?? 1),
  }))
  const days = d.time.map((t, i) => ({
    date: t, high: Math.round(d.temperature_2m_max[i]), low: Math.round(d.temperature_2m_min[i]), rain: d.precipitation_probability_max?.[i] ?? null,
    gusts: Math.round(d.wind_gusts_10m_max?.[i] ?? 0), uv: d.uv_index_max?.[i] ?? null, ...conditions(d.weather_code[i], 1),
  }))
  const wind = windWords(c.wind_speed_10m, c.wind_gusts_10m, c.wind_direction_10m, c.relative_humidity_2m)
  return {
    now: { temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), humidity: Math.round(c.relative_humidity_2m), wind, ...conditions(c.weather_code, c.is_day) },
    hours, days, today: days[0] || null,
  }
}

const SEVERITY = { Extreme: 3, Severe: 2, Moderate: 1, Minor: 0, Unknown: 0 }
/** The Weather Service's active alerts, most serious first: { event, headline, severity, ends, instruction }. */
export function shapeAlerts(json) {
  const seen = new Set()
  return (json?.features || []).map((f) => f.properties || {})
    .filter((p) => p.event && p.status !== 'Test' && !seen.has(p.event) && seen.add(p.event))
    .map((p) => ({ event: String(p.event).slice(0, 120), headline: String(p.headline || '').slice(0, 300), severity: p.severity || 'Unknown', level: SEVERITY[p.severity] ?? 0, ends: p.ends || p.expires || null, instruction: String(p.instruction || '').slice(0, 600) }))
    .sort((a, b) => b.level - a.level)
}
