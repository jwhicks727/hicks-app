import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { findWaterway, along, rideOf, progressAt } from '../src/lib/waterway.js'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')

// A made-up painting: warm foliage with a pale blue-grey stream curving up from the bottom edge, narrowing as it goes
function scene(W, H, stream) {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, f = y / H
    let c = [225, 130, 40] // foliage
    if (stream && f > 0.5) {
      const u = (f - 0.5) / 0.5, mid = W * (0.5 + 0.1 * Math.sin(u * 3)), half = W * (0.03 + 0.1 * u)
      if (Math.abs(x - mid) < half) c = [140, 150, 165]
    }
    data.set([...c, 255], i)
  }
  return { data, width: W, height: H }
}

test('a stream running up from the bottom edge is found, narrower far off and following its curve', () => {
  const way = findWaterway(scene(240, 240, true))
  assert.ok(way && way.points.length >= 8)
  const [far, near] = [way.points[0], way.points.at(-1)]
  assert.ok(far.y < near.y, 'far end first')
  assert.ok(far.half < near.half, 'it narrows toward the horizon')
  assert.ok(near.y > 0.9 && far.y < 0.7)
  assert.ok(way.points.every((p) => p.x > 0.3 && p.x < 0.7 && p.half > 0))
})

test('a painting with no stream, or with water filling it, has none', () => {
  assert.equal(findWaterway(scene(240, 240, false)), null)
  const lake = scene(240, 240, false)
  for (let y = 120; y < 240; y++) for (let x = 0; x < 240; x++) lake.data.set([140, 150, 165, 255], (y * 240 + x) * 4)
  assert.equal(findWaterway(lake), null, 'a lake is not a stream')
})

test('a leaf rides from the far end down to the near end, quickening, and its path is interpolated', () => {
  const way = findWaterway(scene(240, 240, true))
  const a = along(way, 0), b = along(way, 1), m = along(way, 0.5)
  assert.deepEqual(a, way.points[0]); assert.deepEqual(b, way.points.at(-1))
  assert.ok(m.y > a.y && m.y < b.y)
  assert.deepEqual(along(way, -3), a); assert.deepEqual(along(way, 9), b)
  assert.equal(progressAt(0, 10), 0); assert.equal(progressAt(10, 10), 1)
  assert.ok(progressAt(8, 10) - progressAt(7, 10) > progressAt(2, 10) - progressAt(1, 10), 'quicker near')
  const r = rideOf(() => 0.5)
  assert.ok(r.dur > 8 && Math.abs(r.lane) <= 0.6)
})

test('the show finds the stream from the painting’s own pixels, and plays without it as a garland', () => {
  const show = read('src/shell/GarlandShow.jsx')
  assert.match(read('src/shell/harvest/kit.js'), /findWaterway/)
  assert.match(show, /mode = way && crop \? 'stream' : 'garland'/)
  assert.match(show, /lookAt/)
  assert.doesNotMatch(show, /matchMedia/)
  assert.doesNotMatch(show, /style\.(left|top|width|height) = .*(\.x|\.y)/, 'moving leaves change only their transform and opacity')
})
