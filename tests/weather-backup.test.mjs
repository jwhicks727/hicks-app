import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nwsToForecast, codeFromWords, windMph, hourlyUrlFrom, feelsLike } from '../src/lib/nws.js'
import { getJson, loadForecast, isForecast } from '../src/lib/forecastSource.js'
import { shapeForecast } from '../src/lib/weather.js'
import { HOME_TOWN } from '../src/lib/sky.js'

// Shaped like the Weather Service's /gridpoints/.../forecast/hourly answer, cut down: 40 hours from 1 PM.
const periods = Array.from({ length: 40 }, (_, i) => {
  const t = new Date(Date.UTC(2026, 10, 13, 21 + i)) // 1 PM Pacific is 21:00 UTC in November
  const local = new Date(t.getTime() - 8 * 3600e3).toISOString().slice(0, 13)
  const h = Number(local.slice(11))
  return {
    startTime: `${local}:00:00-08:00`, temperature: 60 + (h > 12 ? 12 - (h - 12) : h), temperatureUnit: 'F',
    probabilityOfPrecipitation: { value: h === 15 ? 40 : 0 }, relativeHumidity: { value: 30 },
    windSpeed: '5 to 10 mph', windDirection: 'NE', isDaytime: h >= 7 && h < 17, shortForecast: h === 15 ? 'Chance Light Rain' : h > 17 ? 'Mostly Clear' : 'Sunny',
  }
})
const nws = { properties: { periods } }
const point = { ...HOME_TOWN }

test('the Weather Service’s hours become a forecast the screens read unchanged', () => {
  const j = nwsToForecast(nws, point)
  assert.equal(j.source, 'nws'); assert.ok(isForecast(j))
  const f = shapeForecast(j, '2026-11-13T13:20')
  assert.equal(f.source, 'nws'); assert.equal(f.now.words, 'Clear'); assert.equal(f.now.pic, 'clear')
  assert.equal(f.hours.length, 12); assert.equal(f.hours[0].label, 'Now'); assert.equal(f.hours[1].label, '2 PM')
  assert.equal(f.hours[2].words, 'Light rain'); assert.equal(f.hours[2].rain, 40)
  assert.equal(f.now.speed, 10); assert.equal(f.now.dir, 45)
  assert.ok(f.today && f.today.sunrise && f.today.sunset, 'sun times are worked out, not asked for')
  assert.ok(f.days.length >= 2)
})

test('what the backup does not know is empty, never made up', () => {
  const f = shapeForecast(nwsToForecast(nws, point), '2026-11-13T13:20')
  assert.equal(f.timeline[0].uv, null); assert.equal(f.timeline[0].clouds, null); assert.equal(f.timeline[0].inches, null); assert.equal(f.now.gusts, null)
  assert.equal(f.today.uv, null)
})

test('an empty or broken answer is an error, not a blank card', () => {
  assert.throws(() => nwsToForecast({ properties: { periods: [] } }, point))
  assert.throws(() => nwsToForecast({}, point))
  assert.equal(isForecast({ current: {}, hourly: {}, daily: {} }), false)
  assert.equal(isForecast(null), false)
})

test('the forecast’s words become weather codes; a slight chance is not rain', () => {
  assert.equal(codeFromWords('Sunny'), 0); assert.equal(codeFromWords('Mostly Clear'), 1); assert.equal(codeFromWords('Partly Cloudy'), 2)
  assert.equal(codeFromWords('Mostly Cloudy'), 3); assert.equal(codeFromWords('Showers And Thunderstorms'), 95)
  assert.equal(codeFromWords('Light Rain Likely', 70), 61); assert.equal(codeFromWords('Slight Chance Light Rain', 10), 2)
  assert.equal(codeFromWords('Areas Of Fog', 0), 45); assert.equal(codeFromWords('Snow Showers'), 73)
})

test('wind text and feels-like', () => {
  assert.equal(windMph('5 to 10 mph'), 10); assert.equal(windMph('15 mph'), 15); assert.equal(windMph('Calm'), 0); assert.equal(windMph(undefined), null)
  assert.equal(feelsLike(70, 30, 5), 70); assert.ok(feelsLike(95, 50, 3) > 95); assert.ok(feelsLike(30, 50, 15) < 30)
})

test('only the Weather Service’s own address is followed', () => {
  assert.equal(hourlyUrlFrom({ properties: { forecastHourly: 'https://api.weather.gov/gridpoints/SGX/1,2/forecast/hourly' } }), 'https://api.weather.gov/gridpoints/SGX/1,2/forecast/hourly')
  assert.equal(hourlyUrlFrom({ properties: { forecastHourly: 'https://evil.example/forecast' } }), null)
  assert.equal(hourlyUrlFrom({ properties: { forecastHourly: 'http://api.weather.gov/x' } }), null)
  assert.equal(hourlyUrlFrom({ properties: { forecastHourly: 'nonsense' } }), null)
  assert.equal(hourlyUrlFrom(null), null)
})

// A fetch that answers by address, and one that never answers until it's aborted.
const reply = (json, ok = true, status = 200) => ({ ok, status, json: async () => json })
const hangs = (_url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted'))))
const openMeteo = { current: { temperature_2m: 70 }, hourly: { time: ['2026-11-13T13:00'] }, daily: { time: ['2026-11-13'] } }

test('a request that never answers is given up on, not waited for forever', async () => {
  await assert.rejects(getJson('https://x.example', { timeout: 30, fetchFn: hangs }), /timed out/)
  await assert.rejects(getJson('https://x.example', { fetchFn: async () => reply({}, false, 503) }), /503/)
})

test('Open-Meteo first; the Weather Service when it hangs, errors or sends rubbish', async () => {
  const calls = []
  const make = (om) => async (url, o) => {
    calls.push(String(url).split('?')[0])
    if (url.startsWith('https://api.open-meteo.com')) return om(url, o)
    if (url.startsWith('https://api.weather.gov/points/')) return reply({ properties: { forecastHourly: 'https://api.weather.gov/gridpoints/SGX/1,2/forecast/hourly', timeZone: 'America/Los_Angeles' } })
    if (url.startsWith('https://api.weather.gov/gridpoints/')) return reply(nws)
    throw new Error('unexpected ' + url)
  }
  let r = await loadForecast(point, { fetchFn: make(async () => reply(openMeteo)), timeout: 50 })
  assert.equal(r.source, 'open-meteo'); assert.equal(calls.length, 1)

  for (const om of [hangs, async () => reply({}, false, 500), async () => reply({ error: true }), async () => { throw new TypeError('network') }]) {
    r = await loadForecast(point, { fetchFn: make(om), timeout: 30 })
    assert.equal(r.source, 'nws'); assert.ok(isForecast(r.json))
  }
})

test('with both down, it says Open-Meteo’s trouble and never hangs', async () => {
  await assert.rejects(loadForecast(point, { fetchFn: hangs, timeout: 20 }), /timed out/)
  await assert.rejects(loadForecast(point, { fetchFn: hangs, timeout: 20, backup: false }), /timed out/)
})

test('a place away, whose zone Open-Meteo would work out, takes the Weather Service’s zone', async () => {
  const f = async (url) => {
    if (url.startsWith('https://api.open-meteo.com')) throw new Error('down')
    if (url.includes('/points/')) return reply({ properties: { forecastHourly: 'https://api.weather.gov/gridpoints/PSR/9,9/forecast/hourly', timeZone: 'America/Phoenix' } })
    return reply(nws)
  }
  const r = await loadForecast({ lat: 33.4, lng: -112.07, tz: 'auto' }, { fetchFn: f })
  assert.equal(r.source, 'nws'); assert.equal(r.json.timezone, 'America/Phoenix')
})
