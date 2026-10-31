import { test } from 'node:test'
import assert from 'node:assert/strict'
import { looksOutdoors, geocodeUrl, shapePlaces, tripForecastUrl, pastYearsUrls, summarizePast, sightingsUrl, shapeSightings } from '../src/lib/outdoors.js'

test('outdoor events are recognised by their words', () => {
  for (const t of ['Camping at Big Bear', 'Hike Ontario Peak', 'Beach day', 'Birding at Prado', 'Joshua Tree trip', 'Picnic in the park']) assert.ok(looksOutdoors(t, t.includes('Joshua') ? 'Joshua Tree National Park' : ''), t)
  for (const t of ['Dentist', 'Board meeting', 'Piano recital']) assert.equal(looksOutdoors(t), false, t)
})

test('only rounded coordinates leave the app', () => {
  const u = new URL(tripForecastUrl(34.243917, -116.911356, '2026-11-07', '2026-11-08'))
  assert.equal(u.searchParams.get('latitude'), '34.24'); assert.equal(u.searchParams.get('longitude'), '-116.91'); assert.equal(u.searchParams.get('start_date'), '2026-11-07')
  const s = new URL(sightingsUrl(34.243917, -116.911356, 11))
  assert.equal(s.hostname, 'api.inaturalist.org'); assert.equal(s.searchParams.get('lat'), '34.24'); assert.equal(s.searchParams.get('iconic_taxa'), 'Aves')
  assert.equal(new URL(geocodeUrl('Big Bear Lake')).searchParams.get('name'), 'Big Bear Lake')
})

test('past years are asked for the same dates', () => {
  const urls = pastYearsUrls(34.24, -116.91, '2027-02-27', '2027-03-01', 2026, 3).map((x) => new URL(x))
  assert.deepEqual(urls.map((u) => [u.searchParams.get('start_date'), u.searchParams.get('end_date')]), [['2026-02-27', '2026-03-01'], ['2025-02-27', '2025-03-01'], ['2024-02-27', '2024-03-01']])
  const sum = summarizePast([{ daily: { temperature_2m_max: [55.2, 60.1], temperature_2m_min: [30.4, 33], precipitation_sum: [0, 0.3] } }, { daily: { temperature_2m_max: [48, 51], temperature_2m_min: [25, 28], precipitation_sum: [0.01, 0] } }, null])
  assert.deepEqual(sum, { high: [48, 60], low: [25, 33], wetDays: 1, days: 4, years: 2 })
  assert.equal(summarizePast([]), null)
})

test('places and sightings are shaped and capped; links and photos must be https', () => {
  assert.deepEqual(shapePlaces({ results: [{ name: 'Big Bear Lake', admin1: 'California', country: 'United States', country_code: 'US', latitude: 34.24391, longitude: -116.91142 }] }), [{ name: 'Big Bear Lake', where: 'California', lat: 34.24, lng: -116.91 }])
  const s = shapeSightings({ results: [
    { count: 42, taxon: { id: 9083, name: 'Cyanocitta stelleri', preferred_common_name: 'Steller’s Jay', default_photo: { medium_url: 'https://inaturalist-open-data.s3.amazonaws.com/photos/1/medium.jpg', attribution: '(c) someone, some rights reserved (CC BY-NC)' } } },
    { count: 3, taxon: { id: 2, name: 'Odd bird', default_photo: { medium_url: 'javascript:alert(1)' } } },
  ] })
  assert.equal(s[0].name, 'Steller’s Jay'); assert.equal(s[0].url, 'https://www.inaturalist.org/taxa/9083'); assert.match(s[0].credit, /CC BY-NC/)
  assert.equal(s[1].photo, null, 'only https photos'); assert.equal(s[1].name, 'Odd bird')
})
