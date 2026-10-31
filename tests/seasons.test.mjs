import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seasonFor, SEASONS, SEASON_ORDER, windowsOf } from '../src/lib/seasons.js'

const at = (d) => seasonFor(d).key

test('the Church’s seasons move with Easter, and Christmas lasts until the Baptism', () => {
  assert.equal(at('2026-11-29'), 'advent'); assert.equal(at('2026-12-23'), 'advent')
  assert.equal(at('2026-12-24'), 'christmas'); assert.equal(at('2027-01-09'), 'christmas'); assert.equal(at('2027-01-10'), 'christmas', 'the Baptism itself')
  assert.equal(at('2027-01-11'), 'winter')
  assert.equal(at('2026-02-18'), 'lent'); assert.equal(at('2026-04-04'), 'lent'); assert.equal(at('2026-04-05'), 'easter'); assert.equal(at('2026-05-24'), 'easter')
  assert.equal(at('2027-02-10'), 'lent', 'Lent moves with Easter: 2027’s starts February 10')
})

test('a holiday wins over the season around it, as in SOAR’s schedule', () => {
  assert.equal(at('2026-10-20'), 'halloween'); assert.equal(at('2026-11-01'), 'muertos'); assert.equal(at('2026-11-03'), 'fall')
  assert.equal(at('2026-11-26'), 'thanksgiving'); assert.equal(at('2026-11-22'), 'thanksgiving'); assert.equal(at('2026-11-30'), 'advent')
  assert.equal(at('2027-02-14'), 'lent', 'Valentine’s in Lent stays quiet'); assert.equal(at('2026-02-14'), 'valentine')
  assert.equal(at('2026-07-04'), 'july4'); assert.equal(at('2026-08-15'), 'back-to-school'); assert.equal(at('2026-09-20'), 'fall')
})

test('every day of five years has a season, and every season has its colours', () => {
  for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2030, 0, 1); t += 864e5) assert.ok(SEASONS[at(new Date(t).toISOString().slice(0, 10))])
  for (const k of SEASON_ORDER) { assert.match(SEASONS[k].accent, /^#[0-9A-F]{6}$/i); assert.equal(SEASONS[k].field.length, 3); assert.ok(windowsOf(k, 2026).length) }
})
