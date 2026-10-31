import { test } from 'node:test'
import assert from 'node:assert/strict'
import { familyLine, familyOn, upcoming, occurrence } from '../src/lib/cal/family.js'
import { parishDay } from '../src/lib/cal/sacredHeart.js'
import { liturgicalDay } from '../src/lib/cal/liturgy.js'

// Example rows only: the family's own days live in the database.
const rows = [
  { title: 'Sam’s birthday', month: 3, day: 9, year: 2014, kind: 'celebrate' },
  { title: 'Wedding anniversary', month: 6, day: 5, year: 2001, kind: 'celebrate' },
  { title: 'Gotcha day', month: 9, day: 12, year: 2019, kind: 'celebrate' },
  { title: 'Grandma’s day', month: 4, day: 2, year: 2010, kind: 'remember', note: 'Remembering Grandma' },
  { title: 'Leap birthday', month: 2, day: 29, year: 2000, kind: 'celebrate' },
]

test('family days read the way we say them', () => {
  assert.equal(familyLine(rows[0], 2026), 'Turning 12')
  assert.equal(familyLine(rows[1], 2026), '25th anniversary: silver')
  assert.equal(familyLine(rows[1], 2027), '26th anniversary')
  assert.equal(familyLine(rows[2], 2026), '7 years since September 12, 2019')
  assert.equal(familyLine(rows[3], 2026), 'Remembering Grandma')
})

test('a February 29 day is kept on the 28th in other years', () => {
  assert.equal(occurrence(rows[4], 2026), '2026-02-28'); assert.equal(occurrence(rows[4], 2028), '2028-02-29')
  assert.equal(familyOn('2026-02-28', rows).length, 1)
})

test('what’s coming, soonest first, rolling into next year', () => {
  const next = upcoming('2026-10-31', rows, 3)
  assert.deepEqual(next.map((r) => r.date), ['2027-02-28', '2027-03-09', '2027-04-02'])
  assert.equal(next[1].line, 'Turning 13'); assert.equal(next[0].inDays, 120)
})

test('the parish: a holy day and its eve say so, rather than guess', () => {
  const sat = parishDay('2026-10-31', liturgicalDay('2026-10-31'), liturgicalDay('2026-11-01'))
  assert.match(sat.mass.at(-1), /vigil/); assert.equal(sat.confession, '3:30–4:30 PM'); assert.equal(sat.note, null)
  const dec7 = parishDay('2026-12-07', liturgicalDay('2026-12-07'), liturgicalDay('2026-12-08'))
  assert.match(dec7.note, /vigil Mass this evening/)
  assert.match(parishDay('2026-12-08', liturgicalDay('2026-12-08'), liturgicalDay('2026-12-09')).note, /posts its own Mass times/)
})
