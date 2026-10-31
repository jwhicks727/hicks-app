import { test } from 'node:test'
import assert from 'node:assert/strict'
import { occasionFor } from '../src/lib/occasions.js'
import { dayView } from '../src/lib/cal/day.js'

const occ = (d, data = {}, extra = {}) => occasionFor(dayView(d, data), extra)

test('the family’s own days get the rainbow, first of all', () => {
  const familyDays = [{ title: 'A birthday', month: 12, day: 25, year: 2015, kind: 'celebrate' }]
  assert.equal(occ('2026-12-25', { familyDays }).key, 'family')
  assert.equal(occ('2026-12-25', { familyDays }).colours.length, 8)
  assert.equal(occ('2026-10-11', { familyDays: [{ title: 'A day we remember', month: 10, day: 11, kind: 'remember' }] }), null, 'a remembered day stays quiet')
})

test('a concert is a light show', () => {
  const events = [{ id: 'e1', title: 'The String Cheese Incident', kind: 'show', starts_on: '2026-12-05', ends_on: '2026-12-05', starts_at: '2026-12-06T04:00:00Z', place: 'The Wiltern, Los Angeles' }]
  const o = occ('2026-12-05', { events })
  assert.equal(o.mode, 'liquid'); assert.equal(o.name, 'The String Cheese Incident')
  assert.equal(o.sub, '8:00 PM · The Wiltern'); assert.equal(o.href, '/calendar/event/e1'); assert.equal(o.on, 'event')
  assert.equal(occ('2026-12-25').on, 'church'); assert.equal(occ('2026-10-31').on, 'day'); assert.equal(occ('2026-12-21').on, 'sky')
})

test('Christmas is red and green with fluttering white; the Church’s feasts wear its colours', () => {
  const x = occ('2026-12-25'); assert.equal(x.key, 'christmas'); assert.equal(x.extra, 'flutter'); assert.ok(x.colours.includes('#1B9E4B'))
  assert.equal(occ('2027-03-28').key, 'easter'); assert.equal(occ('2027-05-16').extra, 'rise')
  assert.equal(occ('2026-11-01').key, 'feast'); assert.equal(occ('2026-06-29').colours[0], '#B8322A', 'Peter and Paul in red')
  assert.equal(occ('2026-06-12').key, 'sacredHeart'); assert.equal(occ('2026-12-12').key, 'guadalupe')
  assert.equal(occ('2026-12-13').key, 'advent'); assert.equal(occ('2026-12-13').colours[0], '#D98AA6', 'Gaudete Sunday in rose')
  assert.equal(occ('2026-03-29'), null, 'Palm Sunday is not a party'); assert.equal(occ('2026-04-03'), null, 'nor Good Friday')
})

test('holidays and small joys, and ordinary days stay ordinary', () => {
  assert.equal(occ('2026-10-31').key, 'halloween'); assert.equal(occ('2026-07-04').key, 'july4'); assert.equal(occ('2026-08-01').mode, 'liquid')
  assert.equal(occ('2026-12-21').key, 'winter'); assert.equal(occ('2026-11-05'), null); assert.equal(occ('2026-11-03'), null)
  assert.equal(occ('2026-03-03', {}, { eclipse: { type: 'total', visible: true } }).key, 'eclipse')
})
