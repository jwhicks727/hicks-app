import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { miles, round2, roundPoint, cellOf, tierFor, ourPlaceAt, townUrl, shapeTown, placeWords, tripsAhead, whenWords, tripWindow, shapeTripDays, packWords, clockIn, hourIn, NEAR_MI, AWAY_MI } from '../src/lib/here.js'
import { PLACES, placeBySlug } from '../src/lib/places.js'
import { HOME_TOWN } from '../src/lib/sky.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('home ground, out and about, and away, measured against our own places', () => {
  const tier = (slug) => tierFor(placeBySlug(slug))
  for (const s of ['home', 'kordyak', 'ruble', 'soar', 'sacred-heart']) assert.equal(tier(s), 'home', s)
  for (const s of ['redlands', 'claremont', 'san-dimas']) assert.equal(tier(s), 'near', s)
  for (const s of ['big-bear', 'anaheim', 'long-beach', 'joshua-tree', 'lancaster', 'san-diego']) assert.equal(tier(s), 'away', s)
  assert.equal(Math.round(miles(HOME_TOWN, placeBySlug('big-bear'))), 32)
  assert.ok(NEAR_MI < AWAY_MI)
  // Temecula for the day is away
  assert.equal(tierFor({ lat: 33.49, lng: -117.15 }), 'away')
})

test('another time zone is always away; nonsense is nothing', () => {
  assert.equal(tierFor(placeBySlug('kona'), 'Pacific/Honolulu'), 'away')
  assert.equal(tierFor(placeBySlug('ruble'), 'America/Denver'), 'away')
  assert.equal(tierFor(placeBySlug('ruble'), HOME_TOWN.tz), 'home')
  assert.equal(tierFor(null), null)
  assert.equal(tierFor({ lat: NaN, lng: 1 }), null)
  assert.equal(tierFor({ lat: 95, lng: 1 }), null)
})

test('only a rounded position ever leaves the phone', () => {
  assert.equal(round2(34.243917), 34.24)
  assert.deepEqual(roundPoint({ lat: 34.243917, lng: -116.911356 }), { lat: 34.24, lng: -116.91 })
  assert.equal(cellOf({ lat: 34.2, lng: -116.9 }), '34.20,-116.90')
  const u = new URL(townUrl({ lat: 34.243917, lng: -116.911356 }))
  assert.equal(u.hostname, 'nominatim.openstreetmap.org')
  assert.equal(u.searchParams.get('lat'), '34.24')
  assert.equal(u.searchParams.get('lon'), '-116.91')
  assert.equal(u.searchParams.get('zoom'), '10', 'the town, never the street')
})

test('the town’s name is read as data, capped, and said the way we would say it', () => {
  assert.deepEqual(shapeTown({ address: { town: 'Big Bear Lake', county: 'San Bernardino County', state: 'California', country: 'United States', country_code: 'us' } }), { town: 'Big Bear Lake', region: 'California', country: 'United States', cc: 'US' })
  assert.equal(shapeTown({ address: { city: '<b>Paris</b>', country: 'France', country_code: 'fr' } }).town, 'bParis/b')
  assert.equal(shapeTown({ address: { village: 'x'.repeat(200) } }).town.length, 60)
  assert.equal(shapeTown({ address: { country_code: 'us' } }), null)
  assert.equal(shapeTown(null), null)
  assert.equal(shapeTown({ error: 'Unable to geocode' }), null)
  assert.equal(placeWords({ town: 'Temecula', region: 'California', cc: 'US' }), 'Temecula')
  assert.equal(placeWords({ town: 'Sedona', region: 'Arizona', cc: 'US' }), 'Sedona, Arizona')
  assert.equal(placeWords({ town: 'Paris', region: 'Île-de-France', country: 'France', cc: 'FR' }), 'Paris, France')
  assert.equal(placeWords(null), '')
})

test('our own place is recognised when we’re there, never home or the everyday places', () => {
  assert.equal(ourPlaceAt({ lat: 34.24, lng: -116.91 }).slug, 'big-bear')
  assert.equal(ourPlaceAt(HOME_TOWN), null)
  assert.equal(ourPlaceAt(placeBySlug('soar')), null)
  assert.equal(ourPlaceAt({ lat: 33.49, lng: -117.15 }), null)
  for (const p of PLACES.filter((x) => !x.home && miles(HOME_TOWN, x) >= NEAR_MI)) assert.equal(ourPlaceAt(p).slug, p.slug, p.slug)
})

test('a trip on the calendar shows up to three days ahead, and only a trip away', () => {
  const today = '2026-11-07' // a Saturday
  const ev = (id, starts_on, ends_on, lat, lng, place = '') => ({ id, title: 'Trip ' + id, starts_on, ends_on, lat, lng, place })
  const events = [
    ev('bear', '2026-11-10', '2026-11-12', 34.24, -116.91, 'Big Bear Lake, California'),
    ev('redlands', '2026-11-08', '2026-11-08', 34.06, -117.18, 'Redlands'),
    ev('nowhere', '2026-11-08', '2026-11-08', null, null),
    ev('later', '2026-11-11', '2026-11-11', 33.77, -118.19),
    ev('over', '2026-11-01', '2026-11-06', 34.13, -116.31),
    ev('now', '2026-11-06', '2026-11-08', 33.49, -117.15, 'Temecula'),
  ]
  const trips = tripsAhead(events, today)
  assert.deepEqual(trips.map((t) => t.id), ['now', 'bear'])
  assert.equal(trips[0].inDays, -1)
  assert.equal(trips[1].inDays, 3)
  assert.equal(trips[1].miles, 32)
  assert.equal(whenWords(trips[1], today), 'Tuesday')
  assert.equal(whenWords({ ...trips[1], inDays: 1 }, today), 'Tomorrow')
  assert.equal(whenWords({ starts_on: today, ends_on: '2026-11-09', inDays: 0 }, today), 'Today, for 3 days')
  assert.equal(whenWords({ starts_on: today, ends_on: today, inDays: 0 }, today), 'Today')
  assert.equal(whenWords(trips[0], today), 'Day 2 of 3')
  assert.deepEqual(tripsAhead(null, today), [])
})

test('the forecast covers the trip’s days from today, no further than sixteen days', () => {
  assert.deepEqual(tripWindow({ starts_on: '2026-11-06', ends_on: '2026-11-08' }, '2026-11-07'), { from: '2026-11-07', to: '2026-11-08' })
  assert.deepEqual(tripWindow({ starts_on: '2026-11-10', ends_on: '2026-12-30' }, '2026-11-07'), { from: '2026-11-10', to: '2026-11-22' })
  assert.equal(tripWindow({ starts_on: '2026-12-01', ends_on: '2026-12-03' }, '2026-11-07'), null)
})

test('what to pack comes only from the forecast, the most important first', () => {
  const days = shapeTripDays({ daily: {
    time: ['2026-11-10', '2026-11-11', '2026-11-12'],
    temperature_2m_max: [48.2, 41, 52], temperature_2m_min: [24.4, 20.6, 28],
    precipitation_probability_max: [10, 80, 0], precipitation_sum: [0, 0.4, 0], wind_gusts_10m_max: [20, 41, 12], uv_index_max: [4, 2, 5],
    weather_code: [1, 73, 0],
  } })
  assert.equal(days.length, 3)
  assert.deepEqual(days[1], { date: '2026-11-11', high: 41, low: 21, rain: 80, inches: 0.4, gusts: 41, uv: 2, code: 73, words: 'Snow', pic: 'snow' })
  const pack = packWords(days)
  assert.equal(pack.length, 3)
  assert.match(pack[0], /^Snow in the forecast on Wednesday/)
  assert.match(pack[1], /below freezing \(down to 21°\)/)
  assert.match(pack[2], /Gusty, to 41 mph/)
  assert.deepEqual(packWords(shapeTripDays({ daily: { time: ['2026-11-10'], temperature_2m_max: [72], temperature_2m_min: [55], precipitation_probability_max: [0], precipitation_sum: [0], wind_gusts_10m_max: [10], uv_index_max: [5], weather_code: [0] } })), [])
  assert.match(packWords([{ date: '2026-07-04', high: 104, low: 78, rain: 0, gusts: 10, uv: 11, code: 0 }])[0], /Hot \(up to 104°\)/)
  assert.match(packWords([{ date: '2026-03-07', high: 62, low: 47, rain: 70, inches: 0.3, gusts: 10, uv: 3, code: 63 }])[0], /Rain likely on Saturday/)
  assert.deepEqual(packWords([]), [])
})

test('the clock and the hour are told where we are', () => {
  const t = new Date('2026-11-07T23:30:00Z')
  assert.equal(clockIn(t, 'America/Los_Angeles'), '3:30 PM')
  assert.equal(clockIn(t, 'Europe/Paris'), '12:30 AM')
  assert.equal(hourIn(t, 'Pacific/Honolulu'), 13)
})

test('the phone is asked gently, the reading is rounded before it is kept, and it goes on sign-out', () => {
  const s = src('src/lib/useHere.js')
  assert.ok(!/watchPosition/.test(s), 'never watched')
  assert.match(s, /enableHighAccuracy: false/)
  assert.match(s, /const r = \{ \.\.\.roundPoint\(p\)/, 'rounded before anything is kept')
  assert.ok(!/supabase/.test(s), 'nothing written to the database')
  assert.match(s, /readPrefs\(\)\.here === true/, 'only when switched on')
  assert.match(src('src/lib/auth.js'), /clearDrafts\(\)\n\s+forgetHere\(\)/)
  // The sign-in screen's sky never follows the phone; the app's does
  assert.match(src('src/shell/Gate.jsx'), /<Sky \/>/)
  assert.match(src('src/App.jsx'), /<Sky follow \/>/)
})
