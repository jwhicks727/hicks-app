import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guessKind, staleness } from '../src/lib/sources.js'

test('pasting a link is usually enough to know what it is', () => {
  assert.equal(guessKind('https://calendar.google.com/calendar/embed?src=abc'), 'google_calendar')
  assert.equal(guessKind('webcal://example.org/school.ics'), 'ical')
  assert.equal(guessKind('https://example.org/2026-27-calendar.pdf'), 'pdf')
  assert.equal(guessKind('https://docs.google.com/document/d/xyz/edit'), 'google_doc')
  assert.equal(guessKind('https://drive.google.com/drive/folders/abc'), 'drive_folder')
  assert.equal(guessKind('https://www.example.org/calendar'), 'web_page')
  assert.equal(guessKind(''), null)
})

test('a calendar nags before it runs out, and is stale after', () => {
  const src = { covers_until: '2027-06-04', remind_days: 30 }
  assert.equal(staleness(src, '2027-03-01').state, 'ok')
  assert.equal(staleness(src, '2027-05-10').state, 'soon')
  assert.equal(staleness(src, '2027-06-04').state, 'soon')
  assert.equal(staleness(src, '2027-06-05').state, 'stale')
  assert.equal(staleness({ covers_until: null }, '2027-06-05').state, 'open')
})

test('a calendar read from a picture: real dates only, no repeats, ticked ones into rows', async () => {
  const { cleanReading, eventRows } = await import('../src/lib/cal/fromPicture.js')
  const read = cleanReading([
    { title: 'Thanksgiving break', starts_on: '2026-11-23', ends_on: '2026-11-27', time: '', kind: 'no_school', note: '' },
    { title: 'Thanksgiving  Break', starts_on: '2026-11-23', ends_on: '2026-11-27', time: '', kind: 'no_school', note: '' },
    { title: 'Back to school night', starts_on: '2026-09-03', ends_on: '2026-09-01', time: '18:30', kind: 'school', note: '' },
    { title: 'Nonsense', starts_on: '2026-13-40', ends_on: '', time: '', kind: 'event', note: '' },
    { title: '', starts_on: '2026-10-01', ends_on: '', time: '', kind: 'event', note: '' },
    { title: 'Picture day', starts_on: '2026-10-02', ends_on: '', time: '25:00', kind: 'weird', note: '' },
  ])
  assert.deepEqual(read.map((e) => e.title), ['Back to school night', 'Picture day', 'Thanksgiving break'])
  assert.equal(read[0].ends_on, '2026-09-03', 'an end before its start becomes the start')
  assert.equal(read[1].time, ''); assert.equal(read[1].kind, 'event')
  const rows = eventRows(read, { sourceId: 's1', forWhom: 'm-a' })
  assert.equal(rows[0].starts_at, '2026-09-04T01:30:00.000Z', '6:30 PM at home')
  assert.equal(rows[2].starts_at, null); assert.equal(rows[2].kind, 'no_school'); assert.equal(rows[2].status, 'approved')
  assert.match(rows[2].external_id, /^pic:2026-11-23:thanksgiving-break$/)
})
