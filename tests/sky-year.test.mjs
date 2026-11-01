import { test } from 'node:test'
import assert from 'node:assert/strict'
import { skyValue, yearSeries, seasonMarks, shadowThroughDay, moonMonth, clockWords, lengthWordsMin, shadowWords, daysOfYear, SKY_KEYS } from '../src/lib/skyYear.js'

test('the year runs through its days', () => {
  assert.equal(daysOfYear(2026).length, 365); assert.equal(daysOfYear(2028).length, 366)
  assert.equal(daysOfYear(2026)[0], '2026-01-01'); assert.equal(daysOfYear(2026).at(-1), '2026-12-31')
})

test('sunrise and sunset swing the way they do at home through the year', () => {
  const sr = (d) => skyValue('sunrise', d), ss = (d) => skyValue('sunset', d)
  assert.ok(sr('2026-06-21') < 6 * 60 && sr('2026-06-21') > 5 * 60, 'June sunrise before six')
  assert.ok(sr('2026-12-21') > 6.5 * 60 && sr('2026-12-21') < 7.2 * 60, 'December sunrise nearly seven')
  assert.ok(ss('2026-06-21') > 19.5 * 60 && ss('2026-12-21') < 17.2 * 60, 'sunsets: late in June, early in December')
  assert.ok(skyValue('golden', '2026-06-21') < ss('2026-06-21') && skyValue('lastlight', '2026-06-21') > ss('2026-06-21'))
  const day = skyValue('daylight', '2026-06-21'), short = skyValue('daylight', '2026-12-21')
  assert.ok(day > 14 * 60 && short < 10.2 * 60)
})

test('the shadow at noon is shortest in summer', () => {
  assert.ok(skyValue('shadow', '2026-06-21') < 0.4, 'June noon shadow is short')
  assert.ok(skyValue('shadow', '2026-12-21') > 1.2, 'December noon shadow is longer than you')
  const day = shadowThroughDay('2026-11-01')
  assert.ok(day.length > 50 && day[0].ratio > day[Math.floor(day.length / 2)].ratio, 'long at the ends of the day, short at its middle')
  assert.ok(day.every((x) => x.minute >= 0 && x.minute < 1440))
})

test('the seasons are marked from the length of the day', () => {
  const m = Object.fromEntries(seasonMarks(2026).map((x) => [x.key, x.date]))
  assert.ok(['2026-06-20', '2026-06-21', '2026-06-22'].includes(m.summer), m.summer)
  assert.ok(['2026-12-20', '2026-12-21', '2026-12-22'].includes(m.winter), m.winter)
  assert.ok(m.spring >= '2026-03-18' && m.spring <= '2026-03-23', m.spring)
  assert.ok(m.fall >= '2026-09-20' && m.fall <= '2026-09-25', m.fall)
  assert.equal(yearSeries('sunrise', 2026).length, 365)
})

test('the moon over a month waxes and wanes', () => {
  const mm = moonMonth('2026-11-01', 30)
  assert.equal(mm.length, 30)
  assert.ok(Math.max(...mm.map((d) => d.fraction)) > 0.95 && Math.min(...mm.map((d) => d.fraction)) < 0.05)
  assert.ok(mm.some((d) => d.rise != null))
})

test('times and lengths in words; every key has its page', () => {
  assert.equal(clockWords(6 * 60 + 41), '6:41 AM'); assert.equal(clockWords(12 * 60), '12:00 PM'); assert.equal(clockWords(0), '12:00 AM'); assert.equal(clockWords(null), '—')
  assert.equal(lengthWordsMin(10 * 60 + 5), '10 h 05 m')
  assert.equal(shadowWords(null), 'none'); assert.match(shadowWords(0.3), /shorter/); assert.match(shadowWords(1), /your height/); assert.match(shadowWords(6), /long and thin/)
  for (const k of ['sunrise', 'golden', 'sunset', 'lastlight', 'daylight', 'shadow', 'moon']) assert.ok(SKY_KEYS[k].colour && SKY_KEYS[k].name)
})

test('today’s light as bands that fill the day, and the next moons', async () => {
  const { lightBands, nextMoons } = await import('../src/lib/skyYear.js')
  const b = lightBands('2026-11-01')
  assert.equal(b.length, 7); assert.equal(b[0].from, 0); assert.equal(b.at(-1).to, 1440)
  for (let i = 1; i < b.length; i++) assert.equal(b[i].from, b[i - 1].to)
  assert.ok(b.every((x) => x.to >= x.from))
  const n = nextMoons('2026-11-01')
  assert.match(n.full, /^2026-1[12]-/); assert.ok(n.new > '2026-11-01')
  // The shadow points away from the sun: west in the morning, east in the evening
  const day = shadowThroughDay('2026-11-01')
  assert.ok(day[0].bearing > 180 && day.at(-1).bearing < 180, `${day[0].bearing} ${day.at(-1).bearing}`)
})
