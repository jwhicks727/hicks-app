import test from 'node:test'
import assert from 'node:assert/strict'
import { findDisc, findMirror, findFruit, cutFruit, findBlossom } from '../src/lib/harvestFind.js'

const px = (W, H, fn) => { const data = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data.set([...fn(x, y), 255], (y * W + x) * 4); return { data, width: W, height: H } }
// Pseudo-random but fixed, so a test never flickers
const noise = (x, y) => { const t = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return t - Math.floor(t) }

test('a disc painted on a square is found from its edge, corners and all', () => {
  const m = px(120, 120, (x, y) => (Math.hypot(x - 60, y - 61) < 54 ? [212 - noise(x, y) * 30, 165 - noise(y, x) * 30, 112] : [200, 85 + noise(x, y) * 25, 78]))
  const d = findDisc(m)
  assert.ok(d, 'found')
  assert.ok(Math.abs(d.x - 0.5) < 0.03 && Math.abs(d.y - 61 / 120) < 0.03 && Math.abs(d.r - 54 / 120) < 0.035, JSON.stringify(d))
  assert.equal(findDisc(px(120, 120, (x, y) => [noise(x, y) * 255, noise(y, x) * 255, noise(x + y, x - y) * 255])), null, 'noise has no disc')
  assert.equal(findDisc(px(120, 120, (x, y) => (x < 60 ? [220, 90, 60] : [60, 90, 200]))), null, 'one edge is not a disc')
})

test('a lake is a row below which the picture is the one above, and not a symmetric painting', () => {
  // Trees in coloured columns above a shore, their colours (darker) again below it
  const col = (x) => [[220, 120, 40], [200, 60, 50], [230, 190, 60], [80, 120, 60], [60, 90, 160], [240, 150, 90], [150, 80, 40], [90, 150, 90]][Math.floor((x / 160) * 8) % 8]
  const lake = px(160, 160, (x, y) => (y < 70 ? col(x) : y < 74 ? [30, 25, 20] : col(x).map((v) => v * 0.7)))
  const m = findMirror(lake)
  assert.ok(m && Math.abs(m.y - 72 / 160) < 0.08, JSON.stringify(m))
  assert.equal(findMirror(px(160, 160, (x, y) => [100 + (y / 160) * 100, 120, 140])), null, 'a plain sky has no mirror')
  const flipped = px(160, 160, (x, y) => (y < 70 ? col(x) : y < 74 ? [30, 25, 20] : col(159 - x).map((v) => v * 0.7)))
  assert.equal(findMirror(flipped), null, 'a picture that only matches itself turned over is no reflection')
})

test('fruit is cut whole with its soft edge, and a field of orange is not fruit', () => {
  const at = [[30, 30, 12], [80, 40, 9], [60, 90, 14], [100, 100, 10]]
  const m = px(130, 130, (x, y) => (at.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r) ? [225 - noise(x, y) * 20, 100, 31] : [240, 225, 190]))
  assert.equal(findFruit(m).length, 4)
  const cut = cutFruit(m)
  assert.equal(cut.length, 4)
  const c = cut[0].piece
  assert.equal(c.rgba.length, c.w * c.h * 4)
  const mid = ((c.h >> 1) * c.w + (c.w >> 1)) * 4
  assert.equal(c.rgba[mid + 3], 255, 'solid in the middle'); assert.ok(c.rgba[3] < 255, 'soft or empty at the corner')
  assert.ok(c.rgba[mid] > 190 && c.rgba[mid + 2] < 60, 'her pixel, untouched')
  assert.equal(findFruit(px(130, 130, () => [225, 100, 31])).length, 0, 'a field of orange is no fruit')
})

test('a blossom is one gold star cut into its petals, and a patch or a field of gold is no blossom', () => {
  const star = px(120, 120, (x, y) => { const dx = x - 60, dy = y - 60, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx), reach = 26 * (0.45 + 0.55 * Math.abs(Math.cos(2.5 * th))); return r < reach ? [240 - noise(x, y) * 15, 190, 40] : [235, 215, 170] })
  const b = findBlossom(star)
  assert.ok(b && b.pieces.length >= 4 && b.pieces.length <= 6, b && String(b.pieces.length))
  assert.ok(Math.abs(b.cx - 0.5) < 0.03 && Math.abs(b.cy - 0.5) < 0.03)
  for (const p of b.pieces) assert.ok(p.rgba.length === p.w * p.h * 4 && p.ax > 0 && p.ax < p.w && p.ay > 0 && p.ay < p.h)
  assert.equal(findBlossom(px(120, 120, () => [240, 190, 40])), null, 'a field of gold')
  assert.equal(findBlossom(px(120, 120, (x, y) => (Math.hypot(x - 60, y - 60) < 26 ? [240, 190, 40] : [235, 215, 170]))), null, 'a plain round patch has no petals')
})
