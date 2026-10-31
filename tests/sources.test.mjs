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
