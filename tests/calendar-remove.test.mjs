// Removing a calendar takes its dates with it, in that order, behind a question
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/consoles/Setup.jsx', import.meta.url), 'utf8')

test('a calendar’s dates are deleted before the calendar itself, each by name', () => {
  const dates = src.indexOf(".from('calendar_events').delete().eq('source_id', s.id)")
  const source = src.indexOf(".from('sources').delete().eq('id', s.id)")
  assert.ok(dates > 0 && source > dates, 'dates first, then the source (the events table only unlinks them when a source goes)')
})

test('it asks first, with Confirm, and says how many dates go', () => {
  assert.match(src, /<Confirm title=\{`Remove /)
  assert.doesNotMatch(src, /window\.confirm/)
  assert.match(src, /count: 'exact', head: true/)
})
