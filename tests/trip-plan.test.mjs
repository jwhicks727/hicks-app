import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tripDays, dayWords, timeWords, stayRow, planRow, planDays, guideAreas, fromStayWords, staySearchUrl, shapeStays, planFromPlace, httpsOnly, byNearness } from '../src/lib/tripPlan.js'

// Made-up trips and places: the family's own plans and stays live in the database, never here.
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const trip = { id: 'e1', title: 'Yosemite in the spring', place: 'Yosemite Valley, California', lat: 37.7456, lng: -119.5936, starts_on: '2027-04-10', ends_on: '2027-04-12' }

test('a trip’s days, in words; a time in words', () => {
  assert.deepEqual(tripDays(trip), ['2027-04-10', '2027-04-11', '2027-04-12'])
  assert.deepEqual(tripDays({ starts_on: '2027-04-10', ends_on: '2027-04-10' }), ['2027-04-10'])
  assert.equal(tripDays({ starts_on: '2027-01-01', ends_on: '2027-06-01' }).length, 31, 'a month at most')
  assert.deepEqual(tripDays(null), [])
  assert.equal(dayWords('2027-04-10'), 'Saturday, Apr 10')
  assert.equal(timeWords('09:00'), '9 am')
  assert.equal(timeWords('14:30:00'), '2:30 pm')
  assert.equal(timeWords('12:00'), '12 pm')
  assert.equal(timeWords('00:15'), '12:15 am')
  assert.equal(timeWords(null), '')
})

test('a stay keeps its name, town and a point to about a hundred metres, never more; its days inside the trip', () => {
  const { row } = stayRow({ name: '  The Pine Lodge ', town: 'Yosemite Valley', region: 'California', lat: 37.746789, lng: -119.593612, from_date: '2027-04-12', to_date: '2027-04-10', note: 'Check in after 3' }, trip)
  assert.deepEqual(row, { event_id: 'e1', name: 'The Pine Lodge', town: 'Yosemite Valley', region: 'California', lat: 37.747, lng: -119.594, from_date: '2027-04-10', to_date: '2027-04-12', note: 'Check in after 3' })
  assert.equal(stayRow({ name: 'x', from_date: '2027-05-01' }, trip).row.from_date, null, 'a day outside the trip is left off')
  assert.equal(stayRow({ name: 'x', lat: 37.1 }, trip).row.lat, null, 'half a point is no point')
  assert.equal(stayRow({ name: '   ' }, trip).error, 'What’s the place called?')
  assert.equal(stayRow({ name: '<b>Inn</b>' }, trip).row.name, 'b Inn /b', 'markup is stripped, never kept')
})

test('a plan: a day in the trip or any day, a real time or none, an https link only', () => {
  const { row } = planRow({ title: 'Mist Trail', on_date: '2027-04-11', at_time: '08:30', place: 'Mist Trail', website: 'https://example.org/mist', note: 'Early, before the crowds' }, trip)
  assert.deepEqual(row, { event_id: 'e1', on_date: '2027-04-11', at_time: '08:30', title: 'Mist Trail', place: 'Mist Trail', website: 'https://example.org/mist', note: 'Early, before the crowds' })
  const loose = planRow({ title: 'Ice cream', on_date: '2027-05-01', at_time: '25:00', website: 'http://example.org' }, trip).row
  assert.equal(loose.on_date, null)
  assert.equal(loose.at_time, null)
  assert.equal(loose.website, null)
  assert.equal(planRow({ title: '' }, trip).error, 'What’s the plan?')
  assert.equal(httpsOnly('https://user:pw@example.org'), null)
})

test('plans by day, in time order with the untimed after, then any day', () => {
  const plans = [
    { id: 'a', on_date: '2027-04-11', at_time: '14:00:00', title: 'Picnic', created_at: '1' },
    { id: 'b', on_date: '2027-04-11', at_time: null, title: 'Sunset', created_at: '2' },
    { id: 'c', on_date: '2027-04-11', at_time: '08:30:00', title: 'Hike', created_at: '3' },
    { id: 'd', on_date: null, at_time: null, title: 'Postcards', created_at: '4' },
    { id: 'e', on_date: '2027-04-20', at_time: null, title: 'Moved', created_at: '5' },
  ]
  const g = planDays(trip, plans)
  assert.deepEqual(g.map((x) => x.words), ['Sunday, Apr 11', 'Any day'])
  assert.deepEqual(g[0].plans.map((p) => p.id), ['c', 'a', 'b'])
  assert.deepEqual(g[1].plans.map((p) => p.id), ['d', 'e'], 'a day the trip no longer has goes to any day')
  assert.deepEqual(planDays(trip, []), [])
})

test('guides are asked by area: each stay’s cell, town and region, never its name; else the trip’s place', () => {
  const stays = [
    { id: 's1', name: 'The Pine Lodge', town: 'Yosemite Valley', region: 'California', lat: 37.747, lng: -119.594 },
    { id: 's2', name: 'Cabin next door', town: 'Yosemite Valley', region: 'California', lat: 37.74, lng: -119.6 },
    { id: 's3', name: 'Somewhere not found', town: '', lat: null, lng: null },
  ]
  const a = guideAreas(trip, stays)
  assert.equal(a.length, 1, 'one guide per cell')
  assert.deepEqual({ cell: a[0].cell, town: a[0].town, region: a[0].region }, { cell: '37.7,-119.6', town: 'Yosemite Valley', region: 'California' })
  const sent = { cell: a[0].cell, town: a[0].town, region: a[0].region, cc: a[0].cc }
  assert.ok(!JSON.stringify(sent).includes('Pine Lodge'), 'the stay’s name is never in what useAround sends')
  const two = guideAreas(trip, [stays[0], { id: 's4', name: 'Hotel in the city', town: 'San Francisco', region: 'California', lat: 37.79, lng: -122.41 }])
  assert.deepEqual(two.map((x) => x.cell), ['37.7,-119.6', '37.8,-122.4'], 'a trip with two stops has two guides')
  const none = guideAreas(trip, [])
  assert.deepEqual({ cell: none[0].cell, town: none[0].town, region: none[0].region, point: none[0].point }, { cell: '37.7,-119.6', town: 'Yosemite Valley', region: 'California', point: null })
  assert.deepEqual(guideAreas({ ...trip, lat: null, lng: null }, []), [])
})

test('how far a guide’s place is from where we’re staying, worked out on the phone', () => {
  const area = { label: 'The Pine Lodge', point: { lat: 37.747, lng: -119.594 } }
  assert.equal(fromStayWords({ lat: 37.747, lng: -119.594 }, area), 'Right by The Pine Lodge')
  assert.equal(fromStayWords({ lat: 37.727, lng: -119.594 }, area), '1.4 mi from The Pine Lodge')
  assert.equal(fromStayWords({ lat: null, lng: null }, area), '')
  assert.equal(fromStayWords({ lat: 37.7, lng: -119.6 }, { label: 'x', point: null }), '')
})

test('a section’s places come nearest the stay first; unplaced ones after, in their order', () => {
  const area = { label: 'Lodge', point: { lat: 37.747, lng: -119.594 } }
  const items = [{ name: 'far', lat: 37.9, lng: -119.6 }, { name: 'unknown', lat: null, lng: null }, { name: 'near', lat: 37.75, lng: -119.59 }, { name: 'unknown2' }]
  assert.deepEqual(byNearness(items, area).map((x) => x.name), ['near', 'far', 'unknown', 'unknown2'])
  assert.deepEqual(byNearness(items, { point: null }).map((x) => x.name), ['far', 'unknown', 'near', 'unknown2'])
})

test('finding where we’re staying: one search on OpenStreetMap, the place’s own name and town only', () => {
  const u = new URL(staySearchUrl('The Pine Lodge', 'Yosemite Valley'))
  assert.equal(u.hostname, 'nominatim.openstreetmap.org')
  assert.equal(u.searchParams.get('q'), 'The Pine Lodge, Yosemite Valley')
  const found = shapeStays([
    { name: 'The Pine Lodge', lat: '37.7467891', lon: '-119.5936123', display_name: 'The Pine Lodge, 9000 Some Road, Yosemite Valley, California', address: { road: 'Some Road', house_number: '9000', village: 'Yosemite Valley', state: 'California', postcode: '95389' } },
    { name: '', lat: '37.1', lon: '-119.1', display_name: '123 Some Street, Somewhere', address: { road: 'Some Street', town: 'Somewhere' } },
    { name: 'No point', lat: 'x', lon: 'y' },
  ])
  assert.deepEqual(found, [{ name: 'The Pine Lodge', town: 'Yosemite Valley', region: 'California', where: 'Yosemite Valley, California', lat: 37.747, lng: -119.594 }])
  assert.ok(!JSON.stringify(found).match(/Some Road|9000|95389/), 'never a road, house number or postcode')
  assert.deepEqual(shapeStays(null), [])
})

test('a guide’s place becomes a plan with its name and website', () => {
  assert.deepEqual(planFromPlace({ name: 'Village Roasters', website: 'https://example.org' }, '2027-04-11'), { title: 'Village Roasters', place: 'Village Roasters', website: 'https://example.org/', on_date: '2027-04-11', at_time: '', note: '' })
})

test('stays and plans: the family’s, kept on the trip’s event, a stay’s point held to about a hundred metres', () => {
  const sql = src('supabase/migrations/20261114120000_trip_stays_and_plans.sql')
  assert.match(sql, /lat numeric\(6, 3\)/)
  assert.match(sql, /lng numeric\(7, 3\)/)
  assert.doesNotMatch(sql, /\b(address|street|road|postcode|house)\b\s+text/i, 'never an address column')
  for (const t of ['trip_stays', 'trip_plans']) {
    assert.match(sql, new RegExp(`${t}[\\s\\S]*?event_id uuid not null references public\\.calendar_events \\(id\\) on delete cascade`))
    for (const p of ['read', 'add', 'change', 'remove']) assert.match(sql, new RegExp(`create policy ${t}_${p} on public\\.${t} [^;]*\\(select public\\.is_family\\(\\)\\)`))
  }
})
