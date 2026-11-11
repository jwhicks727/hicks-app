import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { clampZoom, clampPan, panAround, MAX_ZOOM } from '../src/lib/zoom.js'

test('zoom stays between whole and the maximum', () => {
  assert.equal(clampZoom(0.3), 1)
  assert.equal(clampZoom(2), 2)
  assert.equal(clampZoom(99), MAX_ZOOM)
})

test('a picture can only be moved as far as its edge reaches the screen\'s', () => {
  const img = { w: 300, h: 400 }, stage = { w: 400, h: 800 }
  assert.deepEqual(clampPan({ x: 50, y: 50 }, 1, img, stage), { x: 0, y: 0 }) // smaller than the stage: centred
  const c = clampPan({ x: 999, y: -999 }, 2, img, stage) // 600 x 800 on a 400 x 800 stage
  assert.equal(c.x, 100)
  assert.equal(Math.abs(c.y), 0)
})

test('zooming keeps the point under the fingers still', () => {
  const at = { x: 80, y: -40 }, t = panAround({ x: 0, y: 0 }, 1, 2, at)
  // the picture's point under `at` is (at - t) / scale before and after
  assert.equal((at.x - 0) / 1, (at.x - t.x) / 2)
  assert.equal((at.y - 0) / 1, (at.y - t.y) / 2)
})

test('both galleries hold their art up through the zoom view; the page itself still never zooms', () => {
  assert.match(readFileSync('src/places/Drawings.jsx', 'utf8'), /<ZoomArt /)
  assert.match(readFileSync('src/places/lifelist/PaintingPage.jsx', 'utf8'), /<ZoomArt /)
  const css = readFileSync('src/ui/zoomview.css', 'utf8')
  assert.match(css, /touch-action: none/)
})
