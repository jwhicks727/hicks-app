// The week's ideas as a text to Laurie, and her numbers back
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listText, smsLink, normalizePhone, picksFromReply } from '../src/lib/kitchen/text.js'

const ideas = [
  { title: 'Sheet-pan salmon with lemon and asparagus', line: 'Crisp edges, everything on one pan, done in 25 minutes', meal: 'dinner' },
  { title: 'Shrimp and white bean stew', line: 'A slow-cooker night', meal: 'dinner', again: true },
  { title: 'Cottage cheese pancakes', line: '', meal: 'breakfast' },
]

test('the list is numbered from one, says how to answer, and fits a text', () => {
  const t = listText(ideas, '2026-11-01')
  assert.match(t, /^Dinner ideas for the week of Nov 1\. Which ones sound good\? Reply with the numbers, like “1, 3, 8”:\n\n1\. Sheet-pan salmon/)
  assert.match(t, /\n2\. Shrimp and white bean stew — A slow-cooker night/)
  assert.match(t, /\n3\. Cottage cheese pancakes \(breakfast\)$/)
  assert.ok(t.length < 900)
  const long = Array.from({ length: 10 }, (_, i) => ({ title: 'T'.repeat(200), line: 'L'.repeat(300), meal: 'dinner' }))
  assert.ok(listText(long, '2026-11-01').split('\n').slice(2).every((l) => l.length <= 190), 'a long idea is cut, with a dot dot dot')
  assert.match(listText(ideas, 'oops'), /^Dinner ideas for the week\. /)
})

test('the link opens a message to her number, or to whoever you choose', () => {
  const body = 'Hi\n1. Salmon — yes'
  assert.equal(smsLink('+19095551234', body), 'sms:+19095551234?&body=Hi%0A1.%20Salmon%20%E2%80%94%20yes')
  assert.equal(smsLink(null, 'x'), 'sms:?&body=x')
})

test('a number as typed becomes E.164, or is refused', () => {
  assert.equal(normalizePhone('(909) 555-1234'), '+19095551234')
  assert.equal(normalizePhone('909.555.1234'), '+19095551234')
  assert.equal(normalizePhone('1 909 555 1234'), '+19095551234')
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958')
  for (const bad of ['', '555-1234', '0909555123', 'call me', '+0123456789', '12345678901234567']) assert.equal(normalizePhone(bad), null, bad)
})

test('her reply picks by number, however she writes it', () => {
  assert.deepEqual(picksFromReply('1, 3, 8', 10), [0, 2, 7])
  assert.deepEqual(picksFromReply('Let’s do #2 and 5!', 10), [1, 4])
  assert.deepEqual(picksFromReply('1 3 3 1', 10), [0, 2], 'no repeats')
  assert.deepEqual(picksFromReply('8, 11, 0, 12', 10), [7], 'numbers off the list are ignored')
  assert.deepEqual(picksFromReply('none of them', 10), [])
  assert.deepEqual(picksFromReply('', 10), [])
})
