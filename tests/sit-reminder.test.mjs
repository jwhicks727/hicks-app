import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readSitDay, sitStateFor, markSitDay, clearSitDay, reminderOn, sitHeading } from '../src/lib/sitReminder.js'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(join(root, p), 'utf8')

/** A stand-in for localStorage. */
function fakeStorage(start = {}) {
  const m = new Map(Object.entries(start))
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }
}

test('the day’s sit is due until it is sat or skipped, and yesterday’s answer doesn’t count today', () => {
  assert.equal(sitStateFor(null, '2026-11-05'), 'due')
  assert.equal(sitStateFor({ day: '2026-11-05', state: 'sat' }, '2026-11-05'), 'sat')
  assert.equal(sitStateFor({ day: '2026-11-05', state: 'skipped' }, '2026-11-05'), 'skipped')
  assert.equal(sitStateFor({ day: '2026-11-04', state: 'sat' }, '2026-11-05'), 'due', 'a new day asks again')
  assert.equal(sitStateFor({ day: '2026-11-05', state: 'nonsense' }, '2026-11-05'), 'due')
})

test('marking, reading and an Undo, kept on the device', () => {
  const s = fakeStorage()
  assert.equal(readSitDay(s), null)
  markSitDay(s, '2026-11-05', 'sat', 10)
  assert.deepEqual(readSitDay(s), { day: '2026-11-05', state: 'sat', minutes: 10 })
  markSitDay(s, '2026-11-05', 'skipped')
  assert.deepEqual(readSitDay(s), { day: '2026-11-05', state: 'skipped' }, 'no minutes for a skip')
  clearSitDay(s, '2026-11-05')
  assert.equal(readSitDay(s), null)
  markSitDay(s, '2026-11-04', 'sat', 10)
  clearSitDay(s, '2026-11-05')
  assert.deepEqual(readSitDay(s), { day: '2026-11-04', state: 'sat', minutes: 10 }, 'Undo only forgets today’s')
})

test('a broken or blocked store never breaks Home', () => {
  assert.equal(readSitDay(fakeStorage({ 'teamhicks.sit': '{not json' })), null)
  const blocked = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
  assert.equal(readSitDay(blocked), null)
  assert.doesNotThrow(() => markSitDay(blocked, '2026-11-05', 'sat', 10))
  assert.doesNotThrow(() => clearSitDay(blocked, '2026-11-05'))
})

test('on for the parents by default, off for everyone else, and Settings’ choice wins', () => {
  const parent = { role: 'parent' }
  const kid = { role: 'child' }
  assert.equal(reminderOn({}, parent), true)
  assert.equal(reminderOn({}, kid), false)
  assert.equal(reminderOn({}, null), false, 'not known yet: nothing shows')
  assert.equal(reminderOn({ mindful: false }, parent), false, 'with the mindful moment off, the default is off too')
  assert.equal(reminderOn({ sitReminder: false }, parent), false)
  assert.equal(reminderOn({ sitReminder: true }, kid), true)
  assert.equal(reminderOn({ sitReminder: true, mindful: false }, parent), true)
})

test('the heading follows the hour and the sit’s length', () => {
  assert.equal(sitHeading(6), 'Your ten minutes this morning')
  assert.equal(sitHeading(11), 'Your ten minutes this morning')
  assert.equal(sitHeading(12), 'Ten minutes, whenever you can')
  assert.equal(sitHeading(17, 15), 'Fifteen minutes, whenever you can')
  assert.equal(sitHeading(18), 'Ten minutes before bed')
  assert.equal(sitHeading(7, 7), 'Your 7 minutes this morning')
  assert.equal(sitHeading(20, 7), '7 minutes before bed')
})

test('the reminder is up front under Home’s greeting (after the day’s lists), a finished sit answers it, and Settings can switch it', () => {
  const home = read('src/places/Home.jsx')
  const at = home.indexOf('</header>')
  const next = home.slice(at, at + 300)
  // The morning and evening lists come first (decisions log, 2026-11-07), the sit straight after
  assert.match(next, /<\/header>\s*<ListsCard [^>]*\/>\s*<SitReminder /, 'right after the greeting and the lists')
  assert.match(read('src/parts/Sit.jsx'), /markSitDay\(localStorage, today, 'sat', m\)/)
  const settings = read('src/consoles/Settings.jsx')
  assert.match(settings, /Remind me to sit/)
  assert.match(settings, /reminderOn\(prefs, meHere\)/)
  const card = read('src/parts/SitReminder.jsx')
  for (const words of ['Sit now', 'Done already', 'Skip today', 'Undo']) assert.ok(card.includes(words), `the card offers “${words}”`)
})
