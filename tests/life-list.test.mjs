import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv } from '../src/lib/life/csv.js'
import { parseEbird, timeOf, dateOf } from '../src/lib/life/ebird.js'
import { lifeList, newBirds, byDay, dayList, byMonth, monthList, byPlace, placeList, speciesStory, totals, speciesKey, checklistUrl, slug } from '../src/lib/life/birdStats.js'
import { NATIONAL_PARKS, REGIONS, withMarks, parkProgress, findParks, parkBySlug } from '../src/lib/life/parks.js'
import { KINDS, nightsOf, datesWords, whereIs, whenWords, sorted, tally, celebrate, checkOuting } from '../src/lib/life/trips.js'
import { paintingOf, subjectOf, cleanSubjects, subjectWords } from '../src/lib/life/subjects.js'

const HEAD = 'Submission ID,Common Name,Scientific Name,Taxonomic Order,Count,State/Province,County,Location ID,Location,Latitude,Longitude,Date,Time,Protocol,Duration (Min),All Obs Reported,Distance Traveled (Km),Area Covered (Ha),Number of Observers,Breeding Code,Observation Details,Checklist Comments,ML Catalog Numbers'
const line = (o) => [o.sub, o.common, o.sci, o.order, o.count, 'US-CA', 'San Bernardino', o.locId || 'L1', o.loc || 'Lytle Creek, "the wash"', '34.2345', '-117.4321', o.date, o.time || '07:30 AM', 'eBird - Traveling Count', '45', '1', '1.2', '', '2', '', '', o.comments || '', o.ml || ''].map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')
const FILE = [HEAD,
  line({ sub: 'S100', common: 'Anna’s Hummingbird', sci: 'Calypte anna', order: 2200, count: 3, date: '2025-11-02' }),
  line({ sub: 'S100', common: 'House Finch', sci: 'Haemorhous mexicanus', order: 9000, count: 'X', date: '2025-11-02', comments: 'On the "feeder",\nall morning' }),
  line({ sub: 'S101', common: 'Anna’s Hummingbird', sci: 'Calypte anna', order: 2200, count: 1, date: '2026-04-10', time: '4:05 PM', locId: 'L2', loc: 'Prado Regional Park', ml: 'ML123' }),
  line({ sub: 'S101', common: 'Sparrow sp.', sci: 'Passeridae sp.', order: 9100, count: 2, date: '2026-04-10', time: '4:05 PM', locId: 'L2', loc: 'Prado Regional Park' }),
  line({ sub: 'S102', common: 'Acorn Woodpecker', sci: 'Melanerpes formicivorus', order: 3000, count: 2, date: '2026-10-30', locId: 'L2', loc: 'Prado Regional Park' }),
  line({ sub: 'S102', common: 'House Finch', sci: 'Haemorhous mexicanus', order: 9000, count: 6, date: '2026-10-30', locId: 'L2', loc: 'Prado Regional Park' }),
].join('\r\n')

test('a CSV file reads quotes, commas, line breaks and a byte-order mark', () => {
  assert.deepEqual(parseCsv('﻿a,b\r\n"x,1","he said ""hi"""\r\n\r\nlast,"two\nlines"'), [['a', 'b'], ['x,1', 'he said "hi"'], ['last', 'two\nlines']])
  assert.deepEqual(parseCsv(''), [])
})

test('eBird’s download becomes sightings: rounded places, X counts, times and dates', () => {
  assert.equal(timeOf('07:30 AM'), '07:30'); assert.equal(timeOf('4:05 PM'), '16:05'); assert.equal(timeOf('12:10 AM'), '00:10'); assert.equal(timeOf('nope'), null)
  assert.equal(dateOf('2026-10-31'), '2026-10-31'); assert.equal(dateOf('10/3/2026'), '2026-10-03'); assert.equal(dateOf('x'), null)
  const r = parseEbird(FILE)
  assert.equal(r.error, null); assert.equal(r.rows.length, 6); assert.equal(r.skipped, 0)
  const a = r.rows[0]
  assert.deepEqual([a.species, a.sci_name, a.count, a.observed_on, a.observed_time, a.lat, a.lng, a.state], ['Anna’s Hummingbird', 'Calypte anna', 3, '2025-11-02', '07:30', 34.23, -117.43, 'US-CA'])
  assert.equal(r.rows[1].count, null, '"X" is present, not a number'); assert.match(r.rows[1].comments, /feeder/)
  assert.equal(r.rows[2].has_media, true); assert.equal(r.rows[2].observed_time, '16:05')
  assert.equal(parseEbird('Name,Date\nx,2026-01-01').error.startsWith('That doesn’t look like eBird’s'), true)
  assert.equal(parseEbird(HEAD).error, 'That file has no sightings in it.')
  assert.equal(parseEbird(HEAD + '\nS1,Some Bird,,,,,,,,,,,,,,,,,,,,,').error, 'None of those rows had a bird and a date.')
})

test('her life list: lifers by first day, groups left out, then by day, month and place', () => {
  const rows = parseEbird(FILE).rows
  const life = lifeList(rows)
  assert.deepEqual(life.map((b) => b.species), ['Anna’s Hummingbird', 'Acorn Woodpecker', 'House Finch'], 'in birders’ order; "Sparrow sp." is not a species')
  const anna = life.find((b) => b.key === 'calypte-anna')
  assert.deepEqual([anna.first.date, anna.last.date, anna.days, anna.checklists, anna.best, anna.media], ['2025-11-02', '2026-04-10', 2, 2, 3, true])
  assert.equal(lifeList(rows, 'first')[0].species, 'Acorn Woodpecker'); assert.equal(newBirds(rows, '2026-01-01').length, 1)
  const days = byDay(rows)
  assert.deepEqual(days.map((d) => [d.date, d.species, d.lifers]), [['2026-10-30', 2, 1], ['2026-04-10', 1, 0], ['2025-11-02', 2, 2]])
  assert.deepEqual(dayList(rows, '2025-11-02').map((x) => x.species), ['Anna’s Hummingbird', 'House Finch'])
  const m = byMonth(rows); assert.equal(m.length, 12); assert.deepEqual([m[3].species, m[9].species, m[10].species, m[0].species], [1, 2, 2, 0])
  assert.deepEqual(monthList(rows, 11).map((b) => b.species), ['Anna’s Hummingbird', 'House Finch'])
  const places = byPlace(rows)
  assert.deepEqual(places.map((p) => [p.key, p.species, p.lifers]), [['l2', 3, 1], ['l1', 2, 2]].map(([k, s]) => [k, s, places.find((q) => q.key === k).lifers]))
  assert.equal(places[0].name, 'Prado Regional Park'); assert.deepEqual(placeList(rows, 'l2').map((b) => b.species).sort(), ['Acorn Woodpecker', 'Anna’s Hummingbird', 'House Finch'])
  const story = speciesStory(rows, 'calypte-anna')
  assert.deepEqual([story.days, story.best, story.months[3], story.months[10], story.first.observed_on, story.last.observed_on], [2, 3, 1, 1, '2025-11-02', '2026-04-10'])
  assert.equal(story.sightings[0].date, '2026-04-10'); assert.equal(speciesStory(rows, 'nope'), null)
  assert.deepEqual(totals(rows), { species: 3, checklists: 3, days: 3, places: 2, years: 2, first: '2025-11-02', last: '2026-10-30' })
  assert.equal(totals([]).species, 0); assert.equal(checklistUrl('S100'), 'https://ebird.org/checklist/S100'); assert.equal(checklistUrl('<script>'), null)
  assert.equal(speciesKey({ species: 'House Finch' }), 'house-finch'); assert.equal(slug('Anna’s Hummingbird'), 'anna-s-hummingbird')
})

test('sixty-three national parks, each once, in named regions, with marks on the ones we have been to', () => {
  assert.equal(NATIONAL_PARKS.length, 63)
  assert.equal(new Set(NATIONAL_PARKS.map((p) => p.slug)).size, 63)
  for (const p of NATIONAL_PARKS) { assert.ok(REGIONS.includes(p.region), p.slug); assert.match(p.slug, /^[a-z0-9-]+$/); assert.ok(p.name && p.states) }
  assert.deepEqual(NATIONAL_PARKS.filter((p) => p.region === 'California').map((p) => p.slug).sort(), ['channel-islands', 'death-valley', 'joshua-tree', 'kings-canyon', 'lassen-volcanic', 'pinnacles', 'redwood', 'sequoia', 'yosemite'])
  assert.deepEqual(parkProgress([]).next.slug, 'channel-islands', 'nothing yet: the nearest first, the California ones')
  const marks = [{ slug: 'joshua-tree', visited_on: '2026-03-14' }, { slug: 'zion', want: true }, { slug: 'yosemite', visited_on: null, want: false }]
  const w = withMarks(marks), jt = w.find((p) => p.slug === 'joshua-tree')
  assert.deepEqual([jt.visited, w.find((p) => p.slug === 'zion').want], ['2026-03-14', true])
  const pr = parkProgress(marks); assert.deepEqual([pr.been, pr.total, pr.left, pr.percent, pr.next.slug], [1, 63, 62, 2, 'zion'], 'a starred park is next')
  assert.equal(findParks('smoky')[0].slug, 'great-smoky-mountains'); assert.ok(findParks('utah').length === 0 && findParks('UT').length >= 5); assert.equal(findParks('').length, 63); assert.equal(parkBySlug('x'), null)
})

test('camping and Disneyland trips are celebrated, the others only kept', () => {
  const o = (id, kind, a, b, extra = {}) => ({ id, kind, title: id, starts_on: a, ends_on: b, ...extra })
  const list = [o('c1', 'camping', '2026-06-05', '2026-06-08'), o('d1', 'disneyland', '2026-08-01', '2026-08-01'), o('c2', 'camping', '2026-11-13', '2026-11-15'), o('t1', 'trip', '2026-09-01', '2026-09-05')]
  const today = '2026-11-02'
  assert.deepEqual([nightsOf(list[0]), nightsOf(list[1])], [3, 0])
  assert.equal(datesWords(list[0], today), 'Jun 5 to 8'); assert.equal(datesWords(o('x', 'trip', '2026-11-28', '2026-12-01'), today), 'Nov 28 to Dec 1'); assert.equal(datesWords(o('y', 'trip', '2027-01-02', '2027-01-02'), today), 'Jan 2, 2027')
  assert.deepEqual(whereIs(list[2], today), { state: 'ahead', days: 11 }); assert.equal(whereIs(list[0], today).state, 'done'); assert.equal(whereIs(o('n', 'trip', '2026-11-01', '2026-11-03'), today).state, 'now')
  assert.equal(whenWords(list[2], today), 'In 11 days'); assert.equal(whenWords(o('t', 'trip', '2026-11-03', '2026-11-03'), today), 'Tomorrow'); assert.equal(whenWords(list[1], today), '3 months ago'); assert.equal(whenWords(o('n', 'trip', '2026-11-02', '2026-11-02'), today), 'Right now')
  const s = sorted(list, today); assert.deepEqual([s.ahead.map((x) => x.id), s.done.map((x) => x.id)], [['c2'], ['t1', 'd1', 'c1']])
  const t = tally(list, today); assert.deepEqual([t.all, t.nights, t.byKind.camping, t.byKind.disneyland.trips, t.thisYear], [3, 7, { trips: 1, nights: 3 }, 1, 3])
  assert.equal(celebrate(list[0], list, today), 'Our 1st camping trip: 3 nights.'); assert.equal(celebrate(list[2], list, today), 'Our 2nd camping trip is on the way.')
  assert.equal(celebrate(list[1], list, today), 'Our 1st Disneyland trip.'); assert.equal(celebrate(list[3], list, today), null)
  assert.match(celebrate(o('c3', 'camping', '2026-11-05', '2026-11-06'), [...list, o('c3', 'camping', '2026-11-05', '2026-11-06')], today), /2nd camping trip is almost here/)
  assert.ok(KINDS.camping.celebrate && KINDS.disneyland.celebrate && !KINDS.trip.celebrate)
  assert.equal(checkOuting({ kind: 'camping', title: ' ', starts_on: '2026-11-13' }).error, 'Give it a name.'); assert.equal(checkOuting({ kind: 'camping', title: 'x', starts_on: 'soon' }).error, 'When does it start?')
  assert.equal(checkOuting({ kind: 'camping', title: 'x', starts_on: '2026-11-13', ends_on: '2026-11-12' }).error, 'It can’t end before it starts.'); assert.equal(checkOuting({ kind: 'party', title: 'x', starts_on: '2026-11-13' }).error, 'What kind of outing is it?')
  const ok = checkOuting({ kind: 'camping', title: ' Wrightwood   campout ', starts_on: '2026-11-13', place: ' Wrightwood ' }).row
  assert.deepEqual([ok.title, ok.ends_on, ok.place, ok.notes, ok.park], ['Wrightwood campout', '2026-11-13', 'Wrightwood', null, null])
})

test('a painting stands in for a photo only where it has been told what it shows', () => {
  const ps = [{ slug: 'a', subjects: ['bird:anna-s-hummingbird'] }, { slug: 'b', subjects: ['park:joshua-tree', 'place:big-bear'] }, { slug: 'c' }]
  assert.equal(paintingOf(ps, 'park:joshua-tree').slug, 'b'); assert.equal(paintingOf(ps, subjectOf('bird', 'Anna’s Hummingbird')).slug, 'a'); assert.equal(paintingOf(ps, 'park:zion'), null)
  assert.deepEqual(cleanSubjects(['park:zion', 'park:zion', 'tree:oak', 'bird:Bad Key', 'place:big-bear']), ['park:zion', 'place:big-bear']); assert.equal(cleanSubjects(Array.from({ length: 30 }, (_, i) => `place:p${i}`)).length, 12)
  assert.equal(subjectWords('park:joshua-tree', NATIONAL_PARKS), 'Joshua Tree'); assert.equal(subjectWords('bird:anna-s-hummingbird'), 'Anna S Hummingbird')
})

test('on this day: the birds she saw on this date in other years', async () => {
  const { onThisDay } = await import('../src/lib/life/birdStats.js')
  const rows = parseEbird(FILE).rows
  assert.deepEqual(onThisDay(rows, '2026-11-02'), [{ year: '2025', species: ['Anna’s Hummingbird', 'House Finch'] }])
  assert.deepEqual(onThisDay(rows, '2025-11-02'), [], 'not this year’s own')
})
