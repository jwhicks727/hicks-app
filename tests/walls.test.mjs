// Things hung on an academy room's walls: where a point on screen lands, keeping a picture on its wall, and where
// Anna's drawings and Laurie's paintings go up.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { wallAt, wallLength } from '../src/academy/iso.js'
import { onWall, onFloor, hungSize, clampWall, nudge, otherWall, hangSpot, hangArt, wallFeatures, WALL_H, HANG } from '../src/academy/walls.js'
import { artRatio } from '../src/academy/ownArt.js'

const N = 6, L = wallLength(N)
// wallMatrix as numbers, to check wallAt is its inverse
const lay = (side, x, y) => (side === 'right' ? { X: x, Y: x / 2 + y } : { X: x - N * 32, Y: -x / 2 + y + N * 16 })

test('a point on screen finds its spot on the wall it lies on, and nothing off them', () => {
  for (const side of ['left', 'right']) for (const [x, y] of [[10, -20], [96, -75], [180, -140]]) {
    const { X, Y } = lay(side, x, y), w = wallAt(X, Y, N, WALL_H)
    assert.equal(w.side, side); assert.ok(Math.abs(w.x - x) < 1e-9 && Math.abs(w.y - y) < 1e-9)
  }
  assert.equal(wallAt(0, 40, N, WALL_H), null)        // on the floor
  assert.equal(wallAt(20, -200, N, WALL_H), null)     // above the wall
})

test('a hung picture keeps its shape and stays wholly on its wall', () => {
  assert.deepEqual(hungSize(2, 1), { w: HANG, h: HANG / 2 })
  assert.deepEqual(hungSize(0.5, 1), { w: HANG / 2, h: HANG })
  const size = hungSize(1, 1)
  assert.deepEqual(clampWall({ w: 'left', x: -50, y: 30 }, size, N), { w: 'left', x: 24, y: -24 })
  assert.deepEqual(clampWall({ w: 'right', x: 999, y: -999 }, size, N), { w: 'right', x: L - 24, y: -WALL_H + 24 })
  const big = hungSize(1, 9) // bigger than the wall: centred, never off it
  assert.equal(clampWall({ w: 'right', x: 0, y: 0 }, big, N).x, L / 2)
})

test('arrows move it along and up the wall; the other wall mirrors it', () => {
  const size = hungSize(1, 1), it = { w: 'right', x: 100, y: -80 }
  assert.deepEqual(nudge(it, 1, 0, size, N), { w: 'right', x: 108, y: -80 })
  assert.deepEqual(nudge(it, 0, -1, size, N), { w: 'right', x: 100, y: -88 })
  assert.deepEqual(otherWall(it, size, N), { w: 'left', x: L - 100, y: -80 })
})

test('a new picture finds a clear spot; drawings put on the floor before go up on a wall', () => {
  const sizeOf = () => hungSize(1, 1), size = sizeOf()
  const first = hangSpot([], size, sizeOf, N)
  assert.equal(first.w, 'right')
  const second = hangSpot([{ id: 'a', k: 'p:crow', ...first }], size, sizeOf, N)
  assert.ok(second.w !== first.w || Math.abs(second.x - first.x) >= size.w)
  const items = [{ id: 'chair', k: 'chair', i: 1, j: 1, s: 1 }, { id: 'pic', k: 'd:d1', i: 2, j: 2, s: 1 }]
  const out = hangArt(items, sizeOf, N)
  assert.deepEqual(out[0], items[0])
  assert.ok(onWall(out[1]) && out[1].i === undefined && out[1].j === undefined && out[1].k === 'd:d1')
  assert.ok(onFloor(out[0]) && !onWall({ w: 'up' }))
})

test('a piece’s shape comes from what is kept about it', () => {
  assert.equal(artRatio('d:d1', { drawings: [{ id: 'd1', width: 300, height: 200 }] }), 1.5)
  assert.equal(artRatio('p:crow', { paintings: [{ slug: 'crow', w: 100, h: 200 }] }), 0.5)
  assert.equal(artRatio('p:gone', {}), 0.8)
})

test('the room hangs pictures over its walls, framed and never altered', () => {
  const scene = fs.readFileSync('src/academy/RoomScene.jsx', 'utf8'), page = fs.readFileSync('src/academy/RoomPage.jsx', 'utf8')
  assert.match(scene, /function WallPiece/)
  const piece = scene.slice(scene.indexOf('function WallPiece'), scene.indexOf('/** Dust in the sunlight'))
  assert.ok(!/hue-rotate|filter|scale\(-1/.test(piece), 'a hung picture is never recoloured or flipped')
  assert.match(page, /isOwnArt\(k\) \? \{ id, k, s: 1, \.\.\.hangSpot/)
})

test('a new picture keeps clear of the window, the board and the clock, and covers least when it can’t', () => {
  const sizeOf = () => hungSize(1, 1), size = sizeOf()
  const f = wallFeatures('tasks', '#3E7A4C')
  const cover = (p) => f.reduce((t, q) => t + (q.w !== p.w ? 0 : Math.max(0, Math.min(q.x1, p.x + size.w / 2) - Math.max(q.x0, p.x - size.w / 2)) * Math.max(0, Math.min(q.y1, p.y + size.h / 2) - Math.max(q.y0, p.y - size.h / 2))), 0)
  let items = []
  // A classroom has room beside its window for two clear of everything; the next ones only brush its edges
  for (let k = 0; k < 4; k++) {
    const p = hangSpot(items, size, sizeOf, N, WALL_H, f)
    assert.ok(k < 2 ? cover(p) === 0 : cover(p) < size.w * size.h * 0.05, `picture ${k} over the room's own things`)
    items = [...items, { id: 'x' + k, k: 'd:' + k, s: 1, ...p }]
  }
  // A wall of shelves leaves only the right wall; once that's full, the next goes where it covers least
  const full = wallFeatures('shelves', '#7A4A2B')
  assert.deepEqual(full.find((q) => q.w === 'left'), { w: 'left', x0: 0, x1: 192, y0: -150, y1: 0 })
  assert.deepEqual(wallFeatures('anything', 'glass'), [])
  const many = []
  for (let k = 0; k < 12; k++) many.push({ id: 'm' + k, k: 'd:' + k, s: 1, ...hangSpot(many, size, sizeOf, N, WALL_H, full) })
  for (const a of many) for (const b of many) if (a !== b && a.w === b.w) assert.ok(Math.abs(a.x - b.x) >= size.w || Math.abs(a.y - b.y) >= size.h, 'two pictures put up on top of each other')
})
