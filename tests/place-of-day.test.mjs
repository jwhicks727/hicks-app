import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dailyPlaces, placeOfDay, AN_HOUR_MILES, PLACES, milesBetween } from '../src/lib/places.js'
import { HOME_TOWN } from '../src/lib/sky.js'

test('only places from an hour away outward take a turn', () => {
  const slugs = dailyPlaces().map((p) => p.slug)
  for (const near of ['home', 'kordyak', 'ruble', 'soar', 'sacred-heart', 'redlands', 'claremont', 'san-dimas']) assert.ok(!slugs.includes(near), near)
  for (const far of ['big-bear', 'anaheim', 'long-beach', 'san-diego', 'kona', 'paris', 'beijing']) assert.ok(slugs.includes(far), far)
  for (const p of dailyPlaces()) assert.ok(milesBetween(HOME_TOWN, p) >= AN_HOUR_MILES)
  assert.equal(slugs[0], 'big-bear') // from an hour away, in the list's order
})

test('one place a day, in turn, the same for everyone, and it wraps', () => {
  const list = dailyPlaces()
  const a = placeOfDay('2026-11-02'), b = placeOfDay('2026-11-03')
  assert.notEqual(a.slug, b.slug)
  assert.equal(placeOfDay('2026-11-02', 1).slug, b.slug)
  assert.equal(placeOfDay('2026-11-02', list.length).slug, a.slug)
  const seen = new Set(Array.from({ length: list.length }, (_, i) => placeOfDay('2026-11-02', i).slug))
  assert.equal(seen.size, list.length)
  assert.ok(PLACES.includes(placeOfDay('1969-12-31')) && PLACES.includes(placeOfDay('nonsense')))
})
