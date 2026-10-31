// The world map's natural formations: on the map, smooth, and a few peaks per range.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DESERTS, FORESTS, ICE, RANGES, smoothRing, bandRect, rangePoints } from '../src/lib/formations.js'

test('every formation is a real ring on the map, drawn as a smooth closed path', () => {
  for (const [name, ring] of [...DESERTS, ...FORESTS, ...ICE]) {
    assert.ok(ring.length >= 4, `${name} needs at least four points`)
    for (const [lng, lat] of ring) assert.ok(lng >= -180 && lng <= 180 && lat >= -90 && lat <= 84, `${name}: ${lng}, ${lat} is off the map`)
    const d = smoothRing(ring)
    assert.match(d, /^M[\d.-]+ [\d.-]+(C[\d.\s-]+)+Z$/, name)
  }
})

test('bands of latitude and peaks along the ranges', () => {
  const r = bandRect(66.5, 78)
  assert.ok(r.height > 0 && r.y >= 0)
  const pts = rangePoints()
  for (const [name] of RANGES) assert.ok(pts.filter((p) => p.range === name).length >= 2, `${name} has too few peaks`)
  assert.ok(pts.some((p) => p.big))
})
