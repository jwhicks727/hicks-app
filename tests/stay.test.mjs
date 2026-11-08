import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { manualStay, withStay, updateStays, recaps, setDismissed, stayId, stayWords, retryable, enqueue, dequeue, queuedFor, parseLines, RECAP_DAYS, KEEP_STAYS } from '../src/lib/stay.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const temecula = { tier: 'away', town: { town: 'Temecula', region: 'California', cc: 'US' } }

test('a stay away is the town and its first and last day, and nothing else', () => {
  const a = updateStays([], temecula, '2026-11-07')
  assert.deepEqual(a, [{ town: 'Temecula', region: 'California', cc: 'US', from: '2026-11-07', last: '2026-11-07', dismissed: false }])
  assert.deepEqual(Object.keys(a[0]).sort(), ['cc', 'dismissed', 'from', 'last', 'region', 'town'], 'no point, no path')
  // the next day there extends it; the same day again changes nothing
  const b = updateStays(a, temecula, '2026-11-08')
  assert.deepEqual([b.length, b[0].from, b[0].last], [1, '2026-11-07', '2026-11-08'])
  assert.deepEqual(updateStays(b, temecula, '2026-11-08'), b)
  // being home adds nothing; a long gap starts a new stay; a different town is its own
  assert.deepEqual(updateStays(a, { tier: 'home' }, '2026-11-08'), a)
  assert.equal(updateStays(a, temecula, '2026-11-12').length, 2)
  assert.equal(updateStays(a, { tier: 'away', town: { town: 'Big Bear Lake', region: 'California', cc: 'US' } }, '2026-11-08')[0].town, 'Big Bear Lake')
  assert.deepEqual(updateStays([], { tier: 'near', town: { town: 'Redlands' } }, '2026-11-07'), [], 'out and about isn’t a stay')
  assert.deepEqual(updateStays([], { tier: 'away' }, '2026-11-07'), [], 'no town yet, nothing remembered')
})

test('a stay is forgotten a week after its last day, and the phone remembers only a few', () => {
  const old = { town: 'Sedona', region: 'Arizona', cc: 'US', from: '2026-10-01', last: '2026-10-02', dismissed: false }
  assert.deepEqual(updateStays([old], { tier: 'home' }, '2026-11-07'), [])
  let list = []
  for (const [i, town] of ['A Town', 'B Town', 'C Town', 'D Town', 'E Town'].entries()) list = updateStays(list, { tier: 'away', town: { town, region: 'X' } }, `2026-11-0${i + 1}`)
  assert.equal(list.length, KEEP_STAYS)
  assert.equal(list[0].town, 'E Town')
  assert.equal(RECAP_DAYS, 7)
})

test('the recap shows for a week, until dismissed, and not for the town we are standing in', () => {
  const s = updateStays([], temecula, '2026-11-07')
  assert.equal(recaps(s, '2026-11-07').length, 1)
  assert.equal(recaps(s, '2026-11-14').length, 1, 'a week on, still there')
  assert.equal(recaps(s, '2026-11-15').length, 0, 'then it goes by itself')
  assert.equal(recaps(s, '2026-11-08', { town: 'temecula' }).length, 0, 'the list card covers the town we are in')
  const off = setDismissed(s, stayId(s[0]), true)
  assert.equal(recaps(off, '2026-11-08').length, 0)
  assert.equal(recaps(setDismissed(off, stayId(s[0]), false), '2026-11-08').length, 1, 'Undo brings it back')
  assert.equal(stayId(s[0]), 'temecula|2026-11-07')
  assert.equal(stayWords({ from: '2026-11-07', last: '2026-11-07' }), 'Nov 7')
  assert.equal(stayWords({ from: '2026-11-07', last: '2026-11-09' }), 'Nov 7 to 9')
  assert.equal(stayWords({ from: '2026-10-31', last: '2026-11-02' }), 'Oct 31 to Nov 2')
})

test('a place that can’t be saved waits on the phone: queued once, in order, only for real failures', () => {
  assert.equal(retryable('The town couldn’t be added just now'), true)
  assert.equal(retryable('It couldn’t be added just now'), true)
  assert.equal(retryable('A name, please'), false, 'a bad entry is never queued')
  assert.equal(retryable(null), false)
  const t = { town: 'Temecula', region: 'California' }
  const q1 = enqueue([], { town: t, place: { name: 'Pechanga Grill', kind: 'eat' }, day: '2026-11-07' })
  assert.equal(q1.length, 1)
  assert.ok(q1[0].id)
  assert.equal(enqueue(q1, { town: t, place: { name: 'pechanga grill', kind: 'eat' }, day: '2026-11-07' }).length, 1, 'the same place and day isn’t queued twice')
  const q2 = enqueue(q1, { town: t, place: { name: 'Pechanga Grill', kind: 'eat' }, day: '2026-11-08' })
  assert.equal(q2.length, 2)
  assert.equal(queuedFor(q2, { town: 'temecula', region: 'california' }).length, 2)
  assert.equal(queuedFor(q2, { town: 'Sedona', region: 'Arizona' }).length, 0)
  assert.deepEqual(dequeue(q2, q2[0].id).map((x) => x.day), ['2026-11-08'])
  let big = []
  for (let i = 0; i < 80; i++) big = enqueue(big, { town: t, place: { name: `Place ${i}` }, day: '2026-11-07' })
  assert.equal(big.length, 60, 'a sane size')
})

test('several places typed at once: bullets and numbers stripped, blanks and repeats dropped', () => {
  assert.deepEqual(parseLines('Wilson Creek Winery\n- Pechanga Grill\n2) Old Town Spice Merchants\n\n  wilson creek winery  \n• Bad Burger'), ['Wilson Creek Winery', 'Pechanga Grill', 'Old Town Spice Merchants', 'Bad Burger'])
  assert.deepEqual(parseLines(''), [])
  assert.equal(parseLines('x'.repeat(300))[0].length, 100)
  assert.equal(parseLines(Array.from({ length: 50 }, (_, i) => `Place ${i}`).join('\n')).length, 30)
})

test('the phone forgets a stay on sign-out and when location is switched off; saves are checked loudly, not by toast', () => {
  assert.match(src('src/lib/auth.js'), /clearStays\(\)\n\s+clearOutbox\(\)\n\s+resetPhotos\(\)/)
  assert.match(src('src/lib/useHere.js'), /clearStays\(\); state = blank; emit\(\)/)
  const store = src('src/lib/stayStore.js')
  assert.ok(!/lat|lng|point|latitude/i.test(store.replace(/never a point[^\n]*/gi, '')), 'the store has no place for a position')
  const been = src('src/places/yonder/Been.jsx')
  assert.match(been, /\{err && <p className="err" role="alert">\{err\}<\/p>\}/, 'a real problem stays on the form, in words')
  assert.match(been, /addBeenOrQueue\(t, \{ name: d\.name/)
  const recap = src('src/places/yonder/Recap.jsx')
  assert.match(recap, /What you typed is still here/)
  assert.match(src('src/places/Home.jsx'), /useRememberStay\(here, today\)/)
  assert.match(src('src/places/Home.jsx'), /<RecapCards here=\{here\} me=\{me\} today=\{today\} \/>/)
})

test('a recap started by hand: a town and days inside the last week, checked in words', () => {
  const today = '2026-11-08'
  const ok = manualStay({ town: '  Temecula ', region: 'California', from: '2026-11-07', last: '2026-11-07' }, today)
  assert.deepEqual(ok.stay, { town: 'Temecula', region: 'California', cc: null, from: '2026-11-07', last: '2026-11-07', dismissed: false })
  assert.equal(manualStay({ town: 'Sedona', from: '2026-11-06' }, today).stay.last, '2026-11-06', 'no last day means the first')
  assert.equal(manualStay({ town: 'Sedona', region: '', from: '2026-11-06' }, today).stay.region, null)
  assert.equal(manualStay({ town: '', from: '2026-11-07' }, today).error, 'Which town?')
  assert.equal(manualStay({ town: 'X', from: 'soon' }, today).error, 'Which day did it start?')
  assert.match(manualStay({ town: 'X', from: '2026-11-07', last: '2026-11-06' }, today).error, /before the first/)
  assert.match(manualStay({ town: 'X', from: '2026-11-09', last: '2026-11-09' }, today).error, /future/)
  assert.match(manualStay({ town: 'X', from: '2026-10-01', last: '2026-10-02' }, today).error, /last 7 days/)
  assert.match(manualStay({ town: 'X', from: '2026-11-04', last: '2026-11-12' }, '2026-11-12').error, /a week at most/)
  assert.ok(manualStay({ town: 'X', from: '2026-11-01', last: '2026-11-08' }, today).stay, 'a full week is fine')
  assert.deepEqual(Object.keys(ok.stay).sort(), ['cc', 'dismissed', 'from', 'last', 'region', 'town'], 'still no point, no path')
  // it joins the list, replacing the same trip, and shows as a recap
  const once = withStay([], ok.stay), twice = withStay(once, { ...ok.stay, last: '2026-11-08' })
  assert.equal(twice.length, 1)
  assert.equal(recaps(twice, today).length, 1)
})

