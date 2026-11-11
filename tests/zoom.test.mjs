// Pinch zoom on the academy: the maths keeps the picture covering its frame and the pinched point still.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FIT, clampView, zoomAt, panBy, spread, pinch, MAX_ZOOM } from '../src/academy/zoom.js'

test('zoom stays between fit and the maximum, and never leaves a gap', () => {
  assert.deepEqual(clampView({ s: 0.5, x: -50, y: 20 }, 400, 300), FIT)
  const z = clampView({ s: 9, x: 100, y: -9999 }, 400, 300)
  assert.equal(z.s, MAX_ZOOM); assert.equal(z.x, 0); assert.equal(z.y, 300 - 300 * MAX_ZOOM)
})

test('zooming keeps the point under the fingers where it was', () => {
  const v = zoomAt(FIT, 2, 300, 100, 400, 300)
  assert.equal(v.s, 2)
  assert.equal((300 - v.x) / v.s, 300) // the picture point under x=300 is still 300
  assert.equal((100 - v.y) / v.s, 100)
})

test('panning is held inside the picture; at fit there is nowhere to go', () => {
  assert.deepEqual(panBy(FIT, 40, 40, 400, 300), FIT)
  const v = panBy({ s: 2, x: 0, y: 0 }, -999, -999, 400, 300)
  assert.deepEqual([v.x, v.y], [-400, -300])
})

test('a pinch zooms by the change in spread and follows the middle', () => {
  const a = spread({ x: 100, y: 100 }, { x: 200, y: 100 }), b = spread({ x: 50, y: 100 }, { x: 250, y: 100 })
  const v = pinch(FIT, a, b, 400, 300)
  assert.equal(v.s, 2)
  assert.deepEqual(pinch(FIT, { d: 0, x: 0, y: 0 }, b, 400, 300), FIT)
})
