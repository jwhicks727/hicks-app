// Our chosen stations, read from answers shaped like Synoptic's v2 timeseries (made up)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stationsUrl, shapeStations, choose } from '../supabase/functions/_shared/stations.js'
import { besideHome, readAgo, seriesRange } from '../src/lib/stationWords.js'

const NOW = Date.parse('2026-10-31T22:00:00Z')
const times = (n, stepMin, endIso) => Array.from({ length: n }, (_, i) => new Date(Date.parse(endIso) - (n - 1 - i) * stepMin * 60000).toISOString().replace('.000', ''))
const station = (stid, endIso, temps, extra = {}) => ({ STID: stid, NAME: `Station ${stid}`, LATITUDE: '34.1', LONGITUDE: '-117.4', OBSERVATIONS: { date_time: times(temps.length, 10, endIso), air_temp_set_1: temps, relative_humidity_set_1: temps.map(() => 20), wind_speed_set_1: temps.map(() => 8.2), ...extra } })
const answer = { SUMMARY: { RESPONSE_CODE: 1 }, UNITS: { air_temp: 'Fahrenheit', wind_speed: 'Miles/hour' }, STATION: [
  station('SE685', '2026-10-31T21:50:00Z', [70, 71.4, null, 72.2]),
  station('980SE', '2026-10-31T18:00:00Z', [66, 67]), // quiet: four hours old
  station('KONT', '2026-10-31T21:53:00Z', [69, 70.1]),
  station('ZZ9', '2026-10-31T21:55:00Z', [64.04]),
] }

test('the request: each station once, a day of readings, in Fahrenheit and mph', () => {
  const u = new URL(stationsUrl(['SE685', 'se685', 'KONT', 'bad id!', null], 'tok'))
  assert.equal(u.searchParams.get('stid'), 'SE685,KONT')
  assert.equal(u.searchParams.get('recent'), '1440')
  assert.equal(u.searchParams.get('units'), 'english,speed|mph')
})

test('the latest reading with a temperature, and a quiet station marked quiet', () => {
  const s = shapeStations(answer, NOW)
  assert.equal(s.SE685.latest.temp, 72.2)
  assert.equal(s.SE685.quiet, false)
  assert.equal(s['980SE'].quiet, true)
  assert.ok(s.SE685.series.length >= 2)
})

test('Celsius and knots are turned into Fahrenheit and mph', () => {
  const s = shapeStations({ UNITS: { air_temp: 'Celsius', wind_speed: 'knots' }, STATION: [station('KSBD', '2026-10-31T21:50:00Z', [20], { wind_speed_set_1: [10] })] }, NOW)
  assert.equal(s.KSBD.latest.temp, 68)
  assert.equal(s.KSBD.latest.wind, 11.5)
})

test('a quiet station hands over to its fallback, and home never names its station', () => {
  const rows = [{ place: 'kordyak', stid: 'SE685', fallback: 'KONT' }, { place: 'ruble', stid: '980SE', fallback: 'KONT' }, { place: 'home', stid: 'ZZ9', fallback: null }, { place: 'soar', stid: 'NGC08', fallback: null }]
  const c = choose(rows, shapeStations(answer, NOW))
  assert.equal(c.kordyak.source, 'own'); assert.equal(c.kordyak.stid, 'SE685')
  assert.equal(c.ruble.source, 'fallback'); assert.equal(c.ruble.stid, 'KONT'); assert.ok(c.ruble.quietSince)
  assert.equal(c.home.latest.temp, 64)
  assert.equal(c.home.stid, undefined); assert.equal(c.home.name, undefined); assert.equal(c.home.lat, undefined)
  assert.equal(c.soar, null) // nothing heard, no fallback: nothing made up
})

test('words for the screen', () => {
  assert.equal(besideHome(74.4, 71.2), '3° warmer than home')
  assert.equal(besideHome(70, 70.8), 'about the same as home')
  assert.equal(besideHome(65, 70), '5° cooler than home')
  assert.equal(readAgo(NOW - 12 * 60000, NOW), '12 min ago')
  assert.deepEqual(seriesRange([[{ temp: 61.2 }], [{ temp: 74.9 }]]), [61, 75])
})
