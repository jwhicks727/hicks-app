import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCalPath, calPath, stepDate, monthGrid, viewRange } from '../src/lib/cal/paths.js'
import { dayView } from '../src/lib/cal/day.js'

const today = '2026-10-31'

test('every calendar address reads back to a view and a day', () => {
  assert.deepEqual(parseCalPath([], today), { view: 'month', date: today })
  assert.deepEqual(parseCalPath(['day', '2026-11-01'], today), { view: 'day', date: '2026-11-01' })
  assert.deepEqual(parseCalPath(['week', '2026-11-04'], today), { view: 'week', date: '2026-11-01' })
  assert.deepEqual(parseCalPath(['month', '2026-12'], today), { view: 'month', date: '2026-12-01' })
  assert.deepEqual(parseCalPath(['month', '2026-10'], today), { view: 'month', date: today })
  assert.deepEqual(parseCalPath(['year', '2027'], today), { view: 'year', date: '2027-01-01' })
  for (const bad of [['day', '2026-02-30'], ['month', '2026-13'], ['week', 'soon'], ['banana']]) assert.deepEqual(parseCalPath(bad, today), { view: 'month', date: today })
  for (const view of ['day', 'week', 'month', 'year']) {
    const p = calPath(view, '2026-11-04'), back = parseCalPath(p.split('/').slice(2), today)
    assert.equal(calPath(back.view, back.date), p, p)
  }
})

test('stepping holds the day of the month where it can', () => {
  assert.equal(stepDate('month', '2026-01-31', 1), '2026-02-28'); assert.equal(stepDate('month', '2026-01-15', -1), '2025-12-15')
  assert.equal(stepDate('month', '2026-12-01', 1), '2027-01-01'); assert.equal(stepDate('week', '2026-11-01', 1), '2026-11-08')
  assert.equal(stepDate('day', '2026-12-31', 1), '2027-01-01'); assert.equal(stepDate('year', '2026-10-31', 1), '2027-01-01')
})

test('a month grid is whole weeks, Sunday first', () => {
  const g = monthGrid('2026-11-15')
  assert.equal(g[0], '2026-11-01'); assert.equal(g.length, 35); assert.equal(g.at(-1), '2026-12-05')
  const feb = monthGrid('2026-02-01'); assert.equal(feb[0], '2026-02-01'); assert.equal(feb.length, 28)
  assert.deepEqual(viewRange('month', '2026-11-15'), ['2026-11-01', '2026-12-05'])
  assert.deepEqual(viewRange('week', '2026-11-04'), ['2026-11-01', '2026-11-07'])
})

test('a day gathers the Church, the family, the sky and events, and filters by person', () => {
  const familyDays = [{ title: 'A birthday', month: 11, day: 1, year: 2015, kind: 'celebrate', for_whom: 'a' }]
  const events = [{ id: 1, title: 'Practice', starts_on: '2026-10-30', ends_on: '2026-11-02', for_whom: 'b' }, { id: 2, title: 'Everyone', starts_on: '2026-11-01', ends_on: '2026-11-01', for_whom: null }]
  const d = dayView('2026-11-01', { familyDays, events })
  assert.equal(d.lit.name, 'All Saints'); assert.equal(d.family[0].line, 'Turning 11'); assert.equal(d.events.length, 2)
  assert.ok(d.observances.some((o) => o.name === 'Clocks fall back'))
  const forA = dayView('2026-11-01', { familyDays, events, who: 'a' })
  assert.equal(forA.family.length, 1); assert.deepEqual(forA.events.map((e) => e.id), [2])
  assert.equal(dayView('2026-11-24').moon.moonName, 'Beaver Moon')
})

test('the school calendars line up by person, through the event or its source', async () => {
  const { noSchoolDays, schoolsWithCalendars } = await import('../src/lib/cal/schools.js')
  const members = [{ id: 'l', name: 'Laurie' }, { id: 'a', name: 'Anna' }, { id: 'j', name: 'Jason' }]
  const sources = [{ id: 's1', for_whom: 'l' }, { id: 's2', for_whom: 'a' }]
  const events = [
    { kind: 'no_school', source_id: 's1', starts_on: '2026-11-23', ends_on: '2026-11-27' },
    { kind: 'no_school', source_id: 's2', for_whom: null, starts_on: '2026-11-26', ends_on: '2026-11-26' },
    { kind: 'no_school', source_id: null, for_whom: 'j', starts_on: '2026-11-11', ends_on: '2026-11-11' },
    { kind: 'school', source_id: 's1', starts_on: '2026-11-30', ends_on: '2026-11-30' },
  ]
  const off = noSchoolDays(events, sources, members)
  assert.deepEqual([...off['2026-11-26']].sort(), ['kordyak', 'ruble']); assert.deepEqual([...off['2026-11-11']], ['soar'])
  assert.equal(Object.keys(off).length, 6); assert.equal(off['2026-11-30'], undefined)
  assert.deepEqual(schoolsWithCalendars(sources, members).map((s) => s.key), ['kordyak', 'ruble'])
})

test('a day off at two schools is said once, and joins a holiday of the same name', async () => {
  const { annotateEvents } = await import('../src/lib/cal/schools.js')
  const { itemsOf } = await import('../src/calendar/items.js')
  const members = [{ id: 'l', name: 'Laurie' }, { id: 'a', name: 'Anna' }]
  const sources = [{ id: 's1', for_whom: 'l' }, { id: 's2', for_whom: 'a' }]
  const events = annotateEvents([
    { id: 1, source_id: 's1', title: 'Thanksgiving break', kind: 'no_school', starts_on: '2026-11-26', ends_on: '2026-11-27' },
    { id: 2, source_id: 's2', title: 'Thanksgiving Break', kind: 'no_school', starts_on: '2026-11-26', ends_on: '2026-11-27' },
    { id: 3, source_id: 's2', title: 'Thanksgiving', kind: 'no_school', starts_on: '2026-11-26', ends_on: '2026-11-26' },
  ], sources, members)
  assert.equal(events[0].for_whom, 'l'); assert.equal(events[1].school.name, 'Wayne Ruble')
  const its = itemsOf(dayView('2026-11-26', { events }))
  const breaks = its.filter((i) => /break/i.test(i.label))
  assert.equal(breaks.length, 1); assert.equal(breaks[0].sub, 'No school at Kordyak and Wayne Ruble')
  const holiday = its.find((i) => i.label === 'Thanksgiving'); assert.equal(holiday.sub, 'No school at Wayne Ruble')
  assert.equal(its.filter((i) => i.label === 'Thanksgiving').length, 1)
  assert.equal(dayView('2026-11-26', { events, who: 'a' }).events.length, 2, 'Anna sees her own school')
})
