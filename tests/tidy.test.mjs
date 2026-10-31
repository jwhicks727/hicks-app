import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tidyTitle, dedupeEvents } from '../src/lib/cal/tidy.js'
import { forWho } from '../src/lib/cal/day.js'

test('titles as a person would write them', () => {
  assert.equal(tidyTitle('Invitation: Parent conference @ Fri Nov 6, 2026 3pm - 3:30pm (PST) (teacher@example.org)'), 'Parent conference')
  assert.equal(tidyTitle('Updated invitation: Book club'), 'Book club')
  assert.equal(tidyTitle('FW: RE: Field trip permission'), 'Field trip permission')
  assert.equal(tidyTitle('[RUSD] NO SCHOOL - VETERANS DAY HOLIDAY'), 'No School - Veterans Day Holiday')
  assert.equal(tidyTitle('PTA MEETING IN THE MPR'), 'PTA Meeting in the MPR')
  assert.equal(tidyTitle('SOAR STAFF PD DAY'), 'SOAR Staff PD Day')
  assert.equal(tidyTitle('Minimum Day (copy)'), 'Minimum Day')
  assert.equal(tidyTitle('Anna – dentist 🦷'), 'Anna – dentist 🦷', 'a title written by a person is left alone')
  assert.equal(tidyTitle('  '), 'Untitled')
})

test('one event from several calendars shows once, and still counts for each of us', () => {
  const events = [
    { id: 1, source_id: 's-l', external_id: 'abc123@google.com', title: 'Invitation: Back to School Night', starts_on: '2026-09-03', ends_on: '2026-09-03', starts_at: '2026-09-04T01:00:00Z', for_whom: 'l' },
    { id: 2, source_id: 's-j', external_id: 'abc123@google.com', title: 'Back to School Night', starts_on: '2026-09-03', ends_on: '2026-09-03', starts_at: '2026-09-04T01:00:00Z', for_whom: 'j' },
    { id: 3, source_id: 's-a', external_id: 'other-uid', title: 'BACK TO SCHOOL NIGHT', starts_on: '2026-09-03', ends_on: '2026-09-03', starts_at: '2026-09-04T01:00:00Z', for_whom: 'a' },
    { id: 4, source_id: 's-a', external_id: 'x', title: 'Back to School Night', starts_on: '2026-09-10', ends_on: '2026-09-10', starts_at: '2026-09-11T01:00:00Z', for_whom: 'a' },
    { id: 5, source_id: null, title: 'Dentist', starts_on: '2026-09-03', ends_on: '2026-09-03', starts_at: null, for_whom: 'a', place: 'Fontana' },
    { id: 6, source_id: 's-l', external_id: 'd', title: 'DENTIST', starts_on: '2026-09-03', ends_on: '2026-09-03', starts_at: null, for_whom: 'l' },
  ]
  const out = dedupeEvents(events)
  assert.equal(out.length, 3)
  const night = out.find((e) => e.starts_on === '2026-09-03' && /school/i.test(e.title))
  assert.equal(night.title, 'Back to School Night'); assert.equal(night.copies, 3); assert.deepEqual(night.also_for, ['l', 'j', 'a'])
  assert.ok(forWho('j')(night) && forWho('a')(night), 'filtering to any of us still finds it')
  const dentist = out.find((e) => /dentist/i.test(e.title))
  assert.equal(dentist.id, 5, 'our own event wins over a feed’s copy'); assert.equal(dentist.title, 'Dentist')
  assert.equal(out.filter((e) => e.starts_on === '2026-09-10').length, 1, 'the same title another week is its own event')
})

test('two schools’ days off stay two, whatever they’re called', () => {
  const k = { key: 'kordyak' }, r = { key: 'ruble' }
  const out = dedupeEvents([
    { id: 1, source_id: 's1', external_id: 'a', title: 'Thanksgiving Break', kind: 'no_school', starts_on: '2026-11-25', ends_on: '2026-11-27', school: k },
    { id: 2, source_id: 's2', external_id: 'b', title: 'Thanksgiving Break', kind: 'no_school', starts_on: '2026-11-25', ends_on: '2026-11-27', school: r },
  ])
  assert.equal(out.length, 2)
})
