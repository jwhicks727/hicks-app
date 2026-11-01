import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eventIcon, watchable, whenWords, watchFlag, worstDay, daysUntil } from '../src/lib/watch.js'

test('events get a picture from their words', () => {
  assert.equal(eventIcon('Jason’s concert', 'Walt Disney Concert Hall, Los Angeles'), 'music')
  assert.equal(eventIcon('Anna’s campout', 'Wrightwood, CA'), 'tent')
  assert.equal(eventIcon('Hike Ontario Peak'), 'mountain')
  assert.equal(eventIcon('Beach day', 'Huntington Beach'), 'wave')
  assert.equal(eventIcon('Soccer game'), 'ball')
  assert.equal(eventIcon('Flight to Kona'), 'plane')
  assert.equal(eventIcon('Dentist', 'Rancho Cucamonga'), 'star')
})

test('only events with a place, soon, and not days off are watched', () => {
  const ev = (o) => ({ kind: 'event', starts_on: '2026-11-06', ends_on: '2026-11-06', place: 'Los Angeles', ...o })
  const list = watchable([
    ev({ id: 'a', title: 'Concert' }), ev({ id: 'b', title: 'Far off', starts_on: '2026-12-25', ends_on: '2026-12-25' }),
    ev({ id: 'c', title: 'No place', place: '' }), ev({ id: 'd', title: 'Day off', kind: 'no_school' }),
    ev({ id: 'e', title: 'Camp', starts_on: '2026-11-07', ends_on: '2026-11-08', place: 'Wrightwood' }), ev({ id: 'f', title: 'Past', starts_on: '2026-10-01', ends_on: '2026-10-02' }),
  ], '2026-11-02')
  assert.deepEqual(list.map((e) => e.id), ['a', 'e'])
  assert.equal(watchable([], '2026-11-02').length, 0); assert.equal(watchable(null, '2026-11-02').length, 0)
})

test('when, in words', () => {
  assert.equal(whenWords({ starts_on: '2026-11-02', ends_on: '2026-11-02' }, '2026-11-02'), 'Today')
  assert.equal(whenWords({ starts_on: '2026-11-03', ends_on: '2026-11-03' }, '2026-11-02'), 'Tomorrow')
  assert.equal(whenWords({ starts_on: '2026-11-06', ends_on: '2026-11-06' }, '2026-11-02'), 'Friday')
  assert.equal(whenWords({ starts_on: '2026-11-14', ends_on: '2026-11-15' }, '2026-11-02'), 'Sat 11/14 to Sun')
  assert.equal(daysUntil('2026-11-09', '2026-11-02'), 7)
})

test('a heads-up only when there is something to say', () => {
  assert.equal(watchFlag({ high: 72, low: 50, rain: 10, gusts: 12 }), null)
  assert.match(watchFlag({ high: 72, low: 50, rain: 70, inches: 0.3, gusts: 40 }), /Rain likely.*Windy, gusts to 40/)
  assert.match(watchFlag({ high: 99, low: 70, rain: 0 }), /Hot/); assert.match(watchFlag({ high: 50, low: 30, rain: 0 }), /Cold/); assert.equal(watchFlag(null), null)
  assert.equal(worstDay([{ rain: 10, gusts: 5 }, { rain: 80, gusts: 30 }, { rain: 20, gusts: 10 }]).rain, 80); assert.equal(worstDay([]), null)
})
