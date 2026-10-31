import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sunsetOdds, hourAtSunset } from '../src/lib/sunset.js'
import { nextDaysOff, daysOffWords } from '../src/lib/daysOff.js'
import { shapeToday, todayUrl } from '../src/lib/relisten.js'

test('a sunset worth stepping out for: high clouds, clear horizon', () => {
  assert.equal(sunsetOdds({ low: 5, mid: 30, high: 50 }).grade, 'glorious')
  assert.equal(sunsetOdds({ low: 90, mid: 30, high: 50 }).grade, 'hidden')
  assert.equal(sunsetOdds({ low: 0, mid: 0, high: 2 }).grade, 'clear')
  assert.equal(sunsetOdds({ low: 10, mid: 90, high: 95 }).grade, 'good')
  assert.equal(sunsetOdds(null), null)
  const hours = [{ time: '2026-11-03T16:00', clouds: { low: 1, mid: 2, high: 3 } }, { time: '2026-11-03T17:00', clouds: { low: 4, mid: 5, high: 6 } }]
  assert.equal(hourAtSunset(hours, '2026-11-03T16:50:00Z').time, '2026-11-03T17:00')
  assert.equal(hourAtSunset(hours, '2026-11-04T16:50:00Z'), null)
})

test('school days until each of us has a day off', () => {
  const off = { '2026-11-11': new Set(['ruble', 'kordyak']), '2026-11-23': new Set(['kordyak']), '2026-11-25': new Set(['ruble']) }
  const x = nextDaysOff({ off, titles: { '2026-11-11': { ruble: 'Veterans Day' } }, today: '2026-11-04' })
  assert.deepEqual(x.map((d) => [d.school.key, d.date, d.schoolDays]), [['kordyak', '2026-11-11', 4], ['ruble', '2026-11-11', 4]])
  assert.equal(x.find((d) => d.school.key === 'ruble').title, 'Veterans Day')
  assert.equal(daysOffWords({ schoolDays: 1 }), '1 school day to go')
  assert.equal(daysOffWords({ schoolDays: 0, date: '2026-11-09' }), 'After the weekend')
  assert.deepEqual(nextDaysOff({ off: {}, today: '2026-11-04' }), [])
})

test('this day in jam-band history: ours first, the Dead first of all, forgiving of the shape', () => {
  assert.equal(todayUrl(5, 8), 'https://api.relisten.net/api/v2/shows/today?month=5&day=8')
  const shows = shapeToday([
    { artist: { name: 'Phish', slug: 'phish' }, display_date: '1998-05-08', venue: { name: 'Somewhere', location: 'NY' } },
    { artist: { name: 'Someone Else', slug: 'x' }, display_date: '2001-05-08' },
    { artist: { name: 'Grateful Dead', slug: 'grateful-dead' }, display_date: '1977-05-08', venue: { name: 'Barton Hall', location: 'Ithaca, NY' } },
    { artist: { name: 'Grateful Dead', slug: 'grateful-dead' }, display_date: 'not a date' },
  ])
  assert.deepEqual(shows.map((s) => s.artist), ['Grateful Dead', 'Phish', 'Someone Else'])
  assert.equal(shows[0].url, 'https://relisten.net/grateful-dead/1977/05/08')
  assert.deepEqual(shapeToday({ shows: [] }), [])
  assert.deepEqual(shapeToday(null), [])
})
