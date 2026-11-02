import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reportsWords, highlights, mostSeen, rareOnes, weekStart, bingoCard, bingoLines, birdingLine, findBirds } from '../src/lib/birdPage.js'
import { nearbyChecklists, countSpecies, withFrequency, shapeHotspots, shapeCounty, shapePossible, shapeNearest, km, hotspotsUrl, nearestUrl, validCode, statsUrl } from '../supabase/functions/_shared/birds.js'

const town = { lat: 34.09, lng: -117.43 }
const b = (code, o = {}) => ({ code, name: code.toUpperCase(), sci: 'x y', last: '2026-11-01 08:00', reports: 1, sample: 40, notable: false, ...o })

test('most reported is by checklists, never a rare bird; rare ones are listed by how new they are', () => {
  const list = [b('aaa', { reports: 12 }), b('bbb', { reports: 31 }), b('ccc', { notable: true, reports: 4, last: '2026-11-02 07:00' }), b('ddd', { notable: true, reports: 1 })]
  assert.deepEqual(mostSeen(list, 5).map((x) => x.code), ['bbb', 'aaa'], 'a rare bird is never "most reported"')
  assert.deepEqual(rareOnes(list).map((x) => x.code), ['ccc', 'ddd'], 'the newest rare one first')
  assert.equal(reportsWords({ reports: 31, sample: 40 }), 'On 31 of 40 recent checklists'); assert.equal(reportsWords({ reports: 0, sample: 0 }), 'Seen this week')
})

test('the bingo card is nine real birds, the same all week, and lines count', () => {
  const list = Array.from({ length: 20 }, (_, i) => b('s' + String(i).padStart(2, '0')))
  assert.equal(weekStart('2026-11-04'), '2026-11-01'); assert.equal(weekStart('2026-11-01'), '2026-11-01')
  const card = bingoCard(list, '2026-11-01')
  assert.equal(card.length, 9); assert.deepEqual(card.map((x) => x.code), bingoCard(list, '2026-11-01').map((x) => x.code))
  assert.notDeepEqual(card.map((x) => x.code), bingoCard(list, '2026-11-08').map((x) => x.code), 'a new card each week')
  assert.equal(bingoLines([], card), 0)
  assert.equal(bingoLines(card.slice(0, 3).map((x) => x.code), card), 1)
  assert.equal(bingoLines(card.map((x) => x.code), card), 8)
  assert.equal(bingoLines([], list.slice(0, 4)), 0, 'a short week has no card to win')
})

test('a line about birding today, only from what the weather says', () => {
  assert.match(birdingLine({ now: { wind: { santaAna: true }, words: 'Clear', temp: 70, speed: 20, gusts: 30 } }), /east/)
  assert.match(birdingLine({ now: { words: 'Light rain', temp: 55, speed: 5, gusts: 8 } }), /Wet/)
  assert.match(birdingLine({ now: { words: 'Mostly clear', temp: 70, speed: 4, gusts: 6 } }), /Calm and clear/)
  assert.equal(birdingLine({ now: { words: 'Cloudy', temp: 65, speed: 10, gusts: 14 } }), null)
  assert.equal(birdingLine(null), null)
})

test('typing finds birds by any word of the name', () => {
  const pool = [{ code: 'rorpig', name: 'Rock Pigeon' }, { code: 'annhum', name: 'Anna’s Hummingbird' }, { code: 'ameroa', name: 'American Roadrunner' }]
  assert.deepEqual(findBirds('road', pool).map((x) => x.code), ['ameroa'])
  assert.deepEqual(findBirds('hum', pool, pool).map((x) => x.code), ['annhum'], 'once, even from two pools')
  assert.deepEqual(findBirds('r', pool), [], 'one letter is too little')
})

test('hotspots with the week at each, the county in numbers, what else is about, where a bird is', () => {
  const hot = [{ locId: 'L100', locName: 'Quiet Pond', lat: 34.1, lng: -117.4, latestObsDt: '2026-10-30 09:00' }, { locId: 'L200', locName: 'Busy Park', lat: 34.2, lng: -117.5, latestObsDt: '2026-11-01 09:00' }, { locId: 'bad' }]
  const recent = [{ locId: 'L200', speciesCode: 'aaa', obsDt: '2026-11-01 08:00' }, { locId: 'L200', speciesCode: 'bbb', obsDt: '2026-11-01 09:00' }, { locId: 'L200', speciesCode: 'bbb', obsDt: '2026-11-01 10:00' }, { locId: 'L100', speciesCode: 'aaa', obsDt: '2026-10-30 09:00', locationPrivate: true }]
  const h = shapeHotspots(hot, recent, town)
  assert.deepEqual(h.map((x) => [x.name, x.species]), [['Busy Park', 2], ['Quiet Pond', 0]], 'busiest first; a private sighting adds nothing')
  assert.deepEqual(shapeCounty({ numChecklists: 311, numContributors: 90, numSpecies: 187 }, '2026-11-01'), { date: '2026-11-01', checklists: 311, contributors: 90, species: 187 })
  assert.equal(shapeCounty({ nope: 1 }, '2026-11-01'), null)
  const p = shapePossible([{ speciesCode: 'aaa', comName: 'A' }, { speciesCode: 'ccc', comName: 'C' }, { speciesCode: 'ccc', comName: 'C' }, { speciesCode: 'ddd', comName: 'D' }], ['aaa'])
  assert.deepEqual(p.map((x) => [x.code, x.reports]), [['ccc', 2], ['ddd', 1]])
  const n = shapeNearest([{ lat: 34.5, lng: -117.4, locName: 'Far', subId: 'S9999', obsDt: 'x', howMany: 2 }, { lat: 34.1, lng: -117.43, locName: 'Near', locationPrivate: true, subId: 'S1111' }], town)
  assert.equal(n[0].where, null); assert.equal(n[0].checklist, null, 'a private spot has no name or link'); assert.equal(n[1].where, 'Far')
  assert.ok(km(town, { lat: 34.19, lng: -117.43 }) > 10 && km(town, { lat: 34.19, lng: -117.43 }) < 12)
  assert.match(hotspotsUrl(town), /ref\/hotspot\/geo/); assert.match(nearestUrl('houspa', town), /nearest\/geo\/recent\/houspa/); assert.match(statsUrl('2026-11-01'), /stats\/US-CA-071\/2026\/11\/1$/)
  assert.equal(validCode('houspa'), true); assert.equal(validCode('../x'), false)
})

test('a highlight is a notable bird doing something: again and again, a group, or there today; a quiet week has none', () => {
  const list = [
    b('quiet', { notable: true, reports: 1, last: '2026-10-30 08:00' }),
    b('busy', { notable: true, reports: 6, last: '2026-11-01 08:00' }),
    b('flock', { notable: true, reports: 1, count: 14, last: '2026-10-31 08:00' }),
    b('today', { notable: true, reports: 1, last: '2026-11-02 07:00' }),
    b('common', { reports: 40, count: 30, last: '2026-11-02 07:00' }),
  ]
  const h = highlights(list, '2026-11-02')
  assert.equal(h.length, 2, 'at most two')
  assert.deepEqual(h.map((x) => x.bird.code), ['busy', 'today'], 'reported again and again first, then the one there today (the group scores lower)')
  assert.ok(h.every((x) => x.bird.notable), 'a common bird is never a highlight')
  assert.match(h[0].headline, /^Turning up on 6 of 40 recent checklists/)
  assert.equal(highlights([b('quiet', { notable: true, reports: 1, last: '2026-10-30 08:00' })], '2026-11-02').length, 0)
  assert.equal(highlights([], '2026-11-02').length, 0)
})

test('how often a bird shows up comes from the latest checklists near town, not the one-line-a-species feed', () => {
  const town = { lat: 34.09, lng: -117.43 }
  const lists = [{ subId: 'S1111', obsDt: '2026-11-02 08:00', loc: { latitude: 34.1, longitude: -117.4 } }, { subId: 'S2222', obsDt: '2026-11-01 08:00', loc: { latitude: 34.1, longitude: -117.4 } }, { subId: 'S3333', obsDt: '2026-11-02 09:00', loc: { latitude: 35.5, longitude: -117.4 } }, { subId: 'bad' }]
  assert.deepEqual(nearbyChecklists(lists, town), ['S1111', 'S2222'], 'near town only, newest first')
  const { counts, sample } = countSpecies([{ obs: [{ speciesCode: 'houfin' }, { speciesCode: 'houfin' }, { speciesCode: 'amecro' }] }, { obs: [{ speciesCode: 'houfin' }] }, null, { obs: [{ speciesCode: 'purfin', obsValid: false }] }])
  assert.equal(sample, 3); assert.deepEqual(counts, { houfin: 2, amecro: 1 }, 'a bird twice on one checklist counts once; an invalid line counts for nothing')
  const kept = withFrequency([{ code: 'purfin', last: 'b', notable: true }, { code: 'houfin', last: 'a' }, { code: 'amecro', last: 'c' }], counts, sample, 2)
  assert.deepEqual(kept.map((x) => x.code), ['purfin', 'houfin'], 'every notable bird is kept, then the most reported, up to the limit')
  assert.equal(kept.find((x) => x.code === 'houfin').reports, 2)
})
