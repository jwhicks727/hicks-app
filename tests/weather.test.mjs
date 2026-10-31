import { test } from 'node:test'
import assert from 'node:assert/strict'
import { forecastUrl, alertsUrl, shapeForecast, shapeAlerts, windWords, conditions } from '../src/lib/weather.js'

// Shaped like Open-Meteo's answer (v1/forecast), cut down.
const hours = Array.from({ length: 48 }, (_, i) => `2026-10-${String(31 + Math.floor(i / 24) - (i >= 24 ? 0 : 0)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00`).map((t, i) => (i >= 24 ? `2026-11-01T${t.slice(11)}` : t))
const answer = {
  current: { time: '2026-10-31T17:30', temperature_2m: 71.4, apparent_temperature: 69.8, relative_humidity_2m: 12, weather_code: 0, wind_speed_10m: 14, wind_gusts_10m: 38, wind_direction_10m: 45, is_day: 1 },
  hourly: { time: hours, temperature_2m: hours.map((_, i) => 60 + (i % 24) / 2), precipitation_probability: hours.map(() => 0), weather_code: hours.map((_, i) => (i % 24 > 18 ? 0 : 2)), wind_gusts_10m: hours.map(() => 30), is_day: hours.map((_, i) => (i % 24 >= 7 && i % 24 < 18 ? 1 : 0)) },
  daily: { time: ['2026-10-31', '2026-11-01'], weather_code: [0, 3], temperature_2m_max: [78.2, 74.6], temperature_2m_min: [52.1, 50.4], precipitation_probability_max: [0, 10], wind_gusts_10m_max: [41, 22], uv_index_max: [5.1, 4.2] },
}

test('the forecast is asked for the town, in our units and time zone', () => {
  const u = new URL(forecastUrl())
  assert.equal(u.hostname, 'api.open-meteo.com')
  assert.equal(u.searchParams.get('latitude'), '34.092'); assert.equal(u.searchParams.get('temperature_unit'), 'fahrenheit')
  assert.equal(u.searchParams.get('timezone'), 'America/Los_Angeles'); assert.match(u.searchParams.get('daily'), /temperature_2m_max/)
  assert.equal(alertsUrl(), 'https://api.weather.gov/alerts/active?point=34.0922,-117.4350')
})

test('the answer becomes now, the next twelve hours and the week', () => {
  const f = shapeForecast(answer, '2026-10-31T17:30')
  assert.equal(f.now.temp, 71); assert.equal(f.now.words, 'Clear'); assert.equal(f.now.feels, 70)
  assert.equal(f.hours.length, 12); assert.equal(f.hours[0].label, 'Now'); assert.equal(f.hours[1].label, '6 PM'); assert.equal(f.hours[7].label, '12 AM')
  assert.equal(f.hours[2].pic, 'night', 'a clear evening is a clear night'); assert.equal(f.today.high, 78); assert.equal(f.days[1].words, 'Cloudy')
  assert.equal(f.now.wind.santaAna, true); assert.equal(f.now.wind.line, 'Windy from the northeast, gusts to 38 mph')
})

test('wind words, and the Santa Anas only when the wind is dry and from the east', () => {
  assert.equal(windWords(3, 6, 270, 50).line, 'Calm')
  assert.equal(windWords(12, 22, 250, 60).line, 'Breezy from the west, gusts to 22 mph'); assert.equal(windWords(12, 22, 250, 60).santaAna, false)
  assert.equal(windWords(20, 35, 60, 55).santaAna, false, 'humid: not a Santa Ana')
  assert.equal(conditions(95).words, 'Thunderstorms'); assert.equal(conditions(2, 0).pic, 'night-partly'); assert.equal(conditions(12345).pic, 'cloudy')
})

test('alerts: most serious first, one of each, tests left out, words capped', () => {
  const a = shapeAlerts({ features: [
    { properties: { event: 'Wind Advisory', severity: 'Moderate', headline: 'Wind Advisory until Sunday 6 PM', status: 'Actual', ends: '2026-11-01T18:00:00-08:00' } },
    { properties: { event: 'Red Flag Warning', severity: 'Severe', headline: 'Red Flag Warning', status: 'Actual', instruction: 'x'.repeat(2000) } },
    { properties: { event: 'Wind Advisory', severity: 'Moderate', headline: 'A second copy', status: 'Actual' } },
    { properties: { event: 'Test Message', severity: 'Minor', status: 'Test' } },
  ] })
  assert.deepEqual(a.map((x) => x.event), ['Red Flag Warning', 'Wind Advisory']); assert.equal(a[0].instruction.length, 600)
  assert.deepEqual(shapeAlerts(null), [])
})
