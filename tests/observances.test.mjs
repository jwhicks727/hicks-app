import { test } from 'node:test'
import assert from 'node:assert/strict'
import { jewishHolyDays } from '../src/lib/cal/hebrew.js'
import { islamicDays } from '../src/lib/cal/islamic.js'
import { seasonsOf, seasonOn, moonPhases, phaseInstant, clockChanges } from '../src/lib/cal/nature.js'
import { observancesFor, observancesOn, spanWords, GROUPS } from '../src/lib/cal/observances.js'
import { nthWeekday, addDays, dow, todayAt } from '../src/lib/cal/dates.js'

test('dates never slide a day', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01'); assert.equal(addDays('2028-03-01', -1), '2028-02-29')
  assert.equal(dow('2026-11-01'), 0); assert.equal(nthWeekday(2026, 5, 1, -1), '2026-05-25')
  assert.equal(todayAt('America/Los_Angeles', new Date('2026-11-01T06:30:00Z')), '2026-10-31')
})

test('the Jewish holy days of five years', () => {
  const want = {
    2024: ['2024-04-23', '2024-10-03', '2024-10-12', '2024-12-26'], 2025: ['2025-04-13', '2025-09-23', '2025-10-02', '2025-12-15'],
    2026: ['2026-04-02', '2026-09-12', '2026-09-21', '2026-12-05'], 2027: ['2027-04-22', '2027-10-02', '2027-10-11', '2027-12-25'],
    2028: ['2028-04-11', '2028-09-21', '2028-09-30', '2028-12-13'],
  }
  for (const [y, [pass, rh, yk, han]] of Object.entries(want)) {
    const j = jewishHolyDays(Number(y))
    assert.deepEqual([j.passover, j.roshHashanah, j.yomKippur, j.hanukkah], [pass, rh, yk, han], y)
  }
})

test('Ramadan and the Eids are expected within a day or two', () => {
  const near = (a, b) => Math.abs((Date.parse(a) - Date.parse(b)) / 864e5) <= 2
  const y26 = Object.fromEntries(islamicDays(2026).map((x) => [x.key, x.date]))
  assert.ok(near(y26.ramadan, '2026-02-18')); assert.ok(near(y26.eidAlFitr, '2026-03-20')); assert.ok(near(y26.eidAlAdha, '2026-05-27'))
  assert.equal(islamicDays(2030).filter((x) => x.key === 'ramadan').length, 2, 'a year can hold two Ramadans')
})

test('solstices and equinoxes fall on the right home dates', () => {
  assert.deepEqual(seasonsOf(2025).map((s) => s.date), ['2025-03-20', '2025-06-20', '2025-09-22', '2025-12-21'])
  assert.deepEqual(seasonsOf(2026).map((s) => s.date), ['2026-03-20', '2026-06-21', '2026-09-22', '2026-12-21'])
  const dec = seasonsOf(2026)[3].at.toISOString()
  assert.ok(dec >= '2026-12-21T20:45' && dec <= '2026-12-21T20:56', dec)
  assert.equal(seasonOn('2026-10-31'), 'autumn'); assert.equal(seasonOn('2027-01-15'), 'winter')
})

test('the moon: Meeus’s own example, and the full moons of 2026', () => {
  const t = phaseInstant(-283).getTime(), want = Date.parse('1977-02-18T03:37:42Z')
  assert.ok(Math.abs(t - want) < 3 * 60e3, 'within three minutes of Meeus')
  const fulls = moonPhases(2026).filter((p) => p.key === 'full')
  assert.deepEqual(fulls.map((p) => p.date), ['2026-01-03', '2026-02-01', '2026-03-03', '2026-04-01', '2026-05-01', '2026-05-31', '2026-06-29', '2026-07-29', '2026-08-27', '2026-09-26', '2026-10-25', '2026-11-24', '2026-12-23'])
  assert.equal(fulls[5].moonName, 'Blue Moon'); assert.equal(fulls[9].moonName, 'Harvest Moon'); assert.equal(fulls[10].moonName, 'Hunter’s Moon'); assert.equal(fulls[11].moonName, 'Beaver Moon')
  const nov24 = fulls[11].at.toISOString(); assert.ok(nov24 >= '2026-11-24T14:48' && nov24 <= '2026-11-24T14:58', nov24)
  assert.equal(moonPhases(2026).filter((p) => p.key === 'new')[1].date, '2026-02-17')
})

test('the clocks change on the right Sundays', () => {
  assert.deepEqual(clockChanges(2026).map((c) => c.date), ['2026-03-08', '2026-11-01'])
  assert.deepEqual(clockChanges(2027).map((c) => c.date), ['2027-03-14', '2027-11-07'])
})

test('holidays land where they should', () => {
  const on = (id, y) => observancesFor(y).find((o) => o.id === id)
  assert.equal(on('mlk', 2026).start, '2026-01-19'); assert.equal(on('thanksgiving', 2026).start, '2026-11-26')
  assert.equal(on('memorial', 2026).start, '2026-05-25'); assert.equal(on('labor', 2026).start, '2026-09-07')
  assert.equal(on('election', 2026).start, '2026-11-03'); assert.equal(on('election', 2027), undefined)
  assert.equal(on('native-american-day', 2026).start, '2026-09-25'); assert.equal(on('grandparents', 2026).start, '2026-09-13')
  assert.equal(on('lunar-new-year', 2026).start, '2026-02-17'); assert.equal(on('lunar-new-year', 2026).word, 'The Year of the Horse begins')
  assert.deepEqual([on('gbbc', 2026).start, on('gbbc', 2026).end], ['2026-02-13', '2026-02-16'])
  assert.equal(on('global-big-day', 2026).start, '2026-05-09'); assert.equal(on('october-big-day', 2026).start, '2026-10-10')
  assert.deepEqual([on('teacher-week', 2023).start, on('teacher-week', 2025).start, on('teacher-week', 2026).start], ['2023-05-08', '2025-05-05', '2026-05-04'])
})

test('a span shows on its first day, and quietly after', () => {
  const nov1 = observancesOn('2026-11-01')
  assert.ok(nov1.some((o) => o.id === 'native-american-heritage' && !o.ongoing))
  assert.ok(nov1.some((o) => o.id === 'dia-de-muertos'))
  assert.ok(nov1.some((o) => o.name === 'Clocks fall back'))
  const nov2 = observancesOn('2026-11-02').find((o) => o.id === 'dia-de-muertos')
  assert.equal(nov2.ongoing, true); assert.equal(nov2.dayOf, 2)
  const jan1 = observancesOn('2027-01-01')
  assert.ok(jan1.some((o) => o.id === 'kwanzaa' && o.ongoing), 'last year’s Kwanzaa reaches into January')
  assert.ok(jan1.some((o) => o.id === 'cbc' && o.ongoing))
  assert.equal(spanWords(observancesFor(2026).find((o) => o.id === 'hispanic-heritage')), 'through October 15')
})

test('a switched-off group stays off', () => {
  assert.ok(observancesOn('2026-02-04').some((o) => o.group === 'civil'))
  assert.ok(!observancesOn('2026-02-04', { civil: false }).some((o) => o.group === 'civil'))
  for (const o of observancesFor(2026)) assert.ok(GROUPS[o.group], o.id)
})

test('eclipses: the kinds, the dates, and whether the moon is up at home', async () => {
  const { eclipsesOf } = await import('../src/lib/cal/nature.js')
  const e26 = eclipsesOf(2026)
  assert.deepEqual(e26.map((e) => `${e.date} ${e.kind} ${e.type}`), ['2026-02-17 solar annular', '2026-03-03 lunar total', '2026-08-12 solar total', '2026-08-27 lunar partial'])
  const mar = e26[1]
  assert.ok(Math.abs(mar.at - Date.parse('2026-03-03T11:33Z')) < 10 * 60e3, mar.at.toISOString())
  assert.equal(mar.visible, true); assert.equal(mar.wholeVisible, true)
  assert.ok(mar.phases.total[1] - mar.phases.total[0] > 50 * 60e3, 'about an hour of totality')
  assert.ok(e26[3].magnitude > 0.9 && e26[3].magnitude < 0.96, String(e26[3].magnitude))
  assert.equal(eclipsesOf(2025).find((e) => e.date === '2025-09-07').visible, false, 'Asia’s, at our midday')
  assert.equal(eclipsesOf(2024).find((e) => e.date === '2024-04-08').type, 'total')
  assert.deepEqual(eclipsesOf(2027).filter((e) => e.kind === 'solar').map((e) => `${e.date} ${e.type}`), ['2027-02-06 annular', '2027-08-02 total'])
})

test('supermoons, and the biggest full moon of the year', () => {
  const fulls = moonPhases(2026).filter((p) => p.key === 'full')
  const big = fulls.find((p) => p.biggest)
  assert.equal(big.date, '2026-12-23'); assert.equal(big.supermoon, true); assert.ok(big.km < 360000, String(big.km))
  assert.equal(fulls.find((p) => p.date === '2026-05-31').supermoon, false, 'May’s blue moon is far away')
})

test('the sky’s events come with words, times and links', async () => {
  const { astronomyOn } = await import('../src/lib/cal/astro.js')
  const mar3 = astronomyOn('2026-03-03')
  assert.deepEqual(mar3.map((a) => a.kind), ['eclipse-lunar', 'full'])
  assert.equal(mar3[0].title, 'A total eclipse of the moon'); assert.equal(mar3[0].links[0][1], 'https://www.timeanddate.com/eclipse/lunar/2026-march-3')
  assert.deepEqual(mar3[0].times.map((t) => t[0]), ['The shadow’s bite begins', 'Totality begins', 'Totality ends', 'The bite is gone'])
  assert.match(astronomyOn('2026-12-23')[0].lines.join(' '), /biggest full moon of the year/)
  assert.equal(astronomyOn('2026-08-12')[0].kind, 'eclipse-solar'); assert.equal(astronomyOn('2026-12-13')[0].kind, 'meteors')
  assert.equal(astronomyOn('2026-12-21')[0].season, 'winter'); assert.deepEqual(astronomyOn('2026-11-05'), [])
  for (const a of [...mar3, ...astronomyOn('2026-12-13'), ...astronomyOn('2026-12-21')]) for (const [, url] of a.links) assert.match(url, /^https:\/\//)
})

test('wild seasons and mindful days, with who to read', async () => {
  const on = (id, y) => observancesFor(y).find((o) => o.id === id)
  assert.deepEqual([on('eagles', 2027).start, on('eagles', 2027).end], ['2027-01-01', '2027-06-15'])
  assert.equal(on('monarchs', 2026).end, '2027-02-28'); assert.match(on('monarchs', 2026).links[0][1], /^https:\/\/www\.westernmonarchcount\.org/)
  assert.ok(observancesOn('2027-01-10').some((o) => o.id === 'whales' && o.ongoing), 'last winter’s whales are still passing in January')
  assert.equal(on('vesak', 2026).start, '2026-05-01'); assert.equal(on('thay-continuation', 2026).start, '2026-10-11')
  for (const o of observancesFor(2026)) for (const [, url] of o.links || []) assert.match(url, /^https:\/\//, o.id)
})
