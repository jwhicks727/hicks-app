import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pointOnEdge, garlandSlots, flightOf, arcAt, ease, closesAt, wholeness, GARLAND_LEAVES, REST_SECONDS, FADE_SECONDS } from '../src/lib/garland.js'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')

test('the edge is walked clockwise from the middle of the top', () => {
  assert.deepEqual(pointOnEdge(0, 200, 100), { x: 100, y: 0, run: 0 })
  assert.equal(pointOnEdge(100, 200, 100).x, 200, 'the top corner')
  const right = pointOnEdge(150, 200, 100); assert.equal(right.x, 200); assert.equal(right.y, 50); assert.equal(right.run, 90)
  const bottom = pointOnEdge(350, 200, 100); assert.equal(bottom.y, 100); assert.equal(bottom.run, 180)
  const left = pointOnEdge(-150, 200, 100); assert.equal(left.x, 0); assert.equal(left.run, 270)
  assert.equal(pointOnEdge(600, 200, 100).x, pointOnEdge(0, 200, 100).x, 'the edge closes on itself')
})

test('the garland grows from the top both ways and every leaf sits on the frame’s edge', () => {
  const slots = garlandSlots(300, 200, GARLAND_LEAVES, 7)
  assert.equal(slots.length, GARLAND_LEAVES)
  assert.deepEqual(slots.map((s) => s.order), [...slots.keys()])
  for (const s of slots) {
    assert.ok(s.x >= -0.001 && s.x <= 300.001 && s.y >= -0.001 && s.y <= 200.001, 'on the edge')
    assert.ok(s.x < 0.001 || s.x > 299.999 || s.y < 0.001 || s.y > 199.999)
    assert.ok(s.scale >= 0.8 && s.scale <= 1.15)
  }
  assert.ok(Math.abs(slots[0].x - 150) < 40 && slots[0].y === 0, 'the first leaf is at the top')
  assert.ok(slots[1].y > 100 || slots[1].x < 150 || slots[1].x > 150, 'and the second is on the other side')
  assert.deepEqual(garlandSlots(300, 200, 22, 7), slots, 'a day’s garland is the same everywhere')
  assert.notDeepEqual(garlandSlots(300, 200, 22, 8), slots)
})

test('leaves fly in arcs that start and end where they should, and stagger', () => {
  const a = { x: 10, y: 80 }, b = { x: 200, y: 20 }
  assert.deepEqual(arcAt(a, b, 0, 90), a); assert.deepEqual(arcAt(a, b, 1, 90), b)
  assert.ok(arcAt(a, b, 0.5, 90).y < 20, 'rises above both ends')
  assert.equal(ease(0), 0); assert.equal(ease(1), 1); assert.ok(ease(0.5) === 0.5)
  const r = () => 0.5
  const f = [0, 5, 21].map((o) => flightOf(o, 22, r))
  assert.ok(f[0].delay < f[1].delay && f[1].delay < f[2].delay)
  assert.ok(f.every((x) => x.dur >= 2.6 && x.dur <= 3.8))
  assert.equal(closesAt(f), f[2].delay + f[2].dur)
})

test('the garland rests whole, then fades away', () => {
  assert.equal(wholeness(0, 10), 1); assert.equal(wholeness(10 + REST_SECONDS, 10), 1)
  assert.ok(wholeness(10 + REST_SECONDS + FADE_SECONDS / 2, 10) > 0 && wholeness(10 + REST_SECONDS + FADE_SECONDS / 2, 10) < 1)
  assert.equal(wholeness(10 + REST_SECONDS + FADE_SECONDS, 10), 0)
})

test('the garland is transforms and opacity only, never takes a tap, and never plays under less motion', () => {
  const show = read('src/shell/GarlandShow.jsx'), season = read('src/shell/SeasonShow.jsx'), css = read('src/shell/season-show.css')
  assert.match(season, /const still = reducedMotion\(\)/)
  assert.match(season, /show\.kind === 'harvest'\) return <HarvestShow/)
  assert.doesNotMatch(show, /matchMedia/)
  assert.doesNotMatch(show, /style\.(left|top|width|height) = .*(\.x|\.y)/)
  assert.match(css, /\.garland-show \{[^}]*pointer-events: none/)
  assert.match(css, /html\[data-motion="less"\][^{]*\.garland-show/)
  assert.doesNotMatch(css, /filter:\s*blur/)
})
