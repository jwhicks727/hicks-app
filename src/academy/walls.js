// ============================================
// walls.js -- things hung on a room's two back walls
// ============================================
// Pure, so tests run it in Node (tests/walls.test.mjs). A thing on the floor keeps its square ({ i, j }); a thing on a
// wall keeps its wall and where its middle is, in wall-space ({ w: 'left' | 'right', x, y }, iso.js wallMatrix: x along
// the wall from its left end as you look at it, y up from the floor line, so always negative). Both live in the same
// list of the room's items, and nothing else changes about how a room is kept.
// Anna's drawings and Laurie's paintings always hang (src/academy/ownArt.js): a picture belongs on a wall.

import { wallLength } from './iso.js'
import { isOwnArt } from './ownArt.js'

export const WALL_H = 150          // a wall's height in wall-space (RoomScene's H)
export const HANG = 40             // the longer side of a hung picture at size 1, in wall-space (a square is 32)
const EDGE = 4                     // how close a picture comes to a wall's ends, its top and the floor
const STEP = 8                     // one tap of an arrow moves it this far
const GAP = 10                     // room left between two pictures put up by themselves (their frames and tape stick out)

export const onWall = (it) => Boolean(it && (it.w === 'left' || it.w === 'right'))
export const onFloor = (it) => !onWall(it)

/** A hung picture's width and height in wall-space, from its shape (width ÷ height) and size. */
export function hungSize(ratio = 0.8, s = 1) {
  const r = ratio > 0 && Number.isFinite(ratio) ? Math.min(4, Math.max(0.25, ratio)) : 0.8
  return r >= 1 ? { w: HANG * s, h: (HANG * s) / r } : { w: HANG * s * r, h: HANG * s }
}

/** Keep a hung thing wholly on its wall (n squares long, h tall): its middle moved in as far as its size needs. */
export function clampWall(p, size, n, h = WALL_H) {
  const L = wallLength(n)
  const hw = Math.min(size.w / 2, L / 2 - EDGE), hh = Math.min(size.h / 2, h / 2 - EDGE)
  const x = Math.min(L - EDGE - hw, Math.max(EDGE + hw, p.x)), y = Math.min(-EDGE - hh, Math.max(-h + EDGE + hh, p.y))
  return { w: p.w === 'left' ? 'left' : 'right', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
}

/** One arrow's move along the wall: dx, dy are -1, 0 or 1 as they look on screen (dy -1 is up). */
export function nudge(it, dx, dy, size, n, h = WALL_H) {
  return clampWall({ w: it.w, x: it.x + dx * STEP, y: it.y + dy * STEP }, size, n, h)
}

/** The same spot on the other wall (mirrored, so it stays the same distance from the back corner). */
export function otherWall(it, size, n, h = WALL_H) {
  const L = wallLength(n)
  return clampWall({ w: it.w === 'left' ? 'right' : 'left', x: L - it.x, y: it.y }, size, n, h)
}

/**
 * What a room already has on its walls, roughly, by its kind's detail (as RoomScene draws them), so a new picture
 * doesn't go up over the window, the board or the clock: [{ w, x0, x1, y0, y1 }] in wall-space. It can still be moved there.
 */
export function wallFeatures(detail, wall) {
  if (wall === 'none' || wall === 'glass') return []
  const out = [], L = (x0, x1, y0, y1) => out.push({ w: 'left', x0, x1, y0, y1 }), R = (x0, x1, y0, y1) => out.push({ w: 'right', x0, x1, y0, y1 })
  if (['shelves', 'bakery', 'fame'].includes(detail)) L(0, 192, -150, 0)
  else if (['tasks', 'goals', 'menu', 'lab', 'music', 'code'].includes(detail)) L(14, 190, -130, -36)
  else if (detail === 'chapel') L(66, 116, -132, -54)
  else if (detail === 'art') L(14, 180, -122, -56)
  else if (!['theater', 'stars', 'paws', 'neon', 'pool', 'gym'].includes(detail)) L(26, 144, -114, -48)
  if (!['fame', 'shelves', 'bakery', 'theater'].includes(detail)) L(162, 190, -142, -114)
  if (detail === 'chapel') R(66, 126, -130, -36)
  else if (detail === 'stars') R(58, 134, -124, -48)
  else if (detail === 'gym') R(66, 126, -142, -80)
  else if (!['pool', 'theater'].includes(detail)) R(42, 118, -118, -36)
  if (detail === 'tasks') R(0, 192, -150, -124)
  if (detail === 'fame') R(120, 188, -132, -42)
  if (detail === 'art') R(126, 178, -120, -60)
  return out
}

/**
 * Where a new picture hangs: along the walls (at eye height first, then a little lower and higher; the right wall before the left),
 * the first spot that overlaps no other picture and none of `avoid` (wallFeatures); if every spot touches the room's
 * own things, the one that covers least of them. `sizeOf(it)` gives each hung thing's size. If nowhere is clear of the
 * other pictures, the right wall's middle.
 */
export function hangSpot(items, size, sizeOf, n, h = WALL_H, avoid = []) {
  const L = wallLength(n), hung = items.filter(onWall)
  const boxOf = (p, s, gap) => ({ x0: p.x - s.w / 2 - gap, x1: p.x + s.w / 2 + gap, y0: p.y - s.h / 2 - gap, y1: p.y + s.h / 2 + gap })
  const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))
  let best = null
  // Heights every few units, the nearest to eye height (three fifths up the wall) first
  const ys = Array.from({ length: Math.floor(h / 6) }, (_, k) => -3 - k * 6).sort((a, b) => Math.abs(a + h * 0.6) - Math.abs(b + h * 0.6))
  for (const y of ys) {
    for (const w of ['right', 'left']) {
      for (let k = 1; k <= 15; k++) {
        const p = clampWall({ w, x: (L * k) / 16, y }, size, n, h), me = boxOf(p, size, GAP / 2)
        if (hung.some((o) => o.w === p.w && overlap(boxOf(o, sizeOf(o), GAP / 2), me) > 0)) continue
        const cover = avoid.reduce((t, f) => t + (f.w === p.w ? overlap(f, boxOf(p, size, 1)) : 0), 0)
        if (cover === 0) return p
        if (!best || cover < best.cover) best = { p, cover }
      }
    }
  }
  return best ? best.p : clampWall({ w: 'right', x: L / 2, y: -h * 0.6 }, size, n, h)
}

/**
 * A room's items, with any of Anna's drawings or Laurie's paintings that were put on the floor (before pictures hung)
 * moved up onto a wall. Everything else comes back as it was.
 */
export function hangArt(items, sizeOf, n, h = WALL_H, avoid = []) {
  let out = items
  for (const it of items) {
    if (!isOwnArt(it.k) || onWall(it)) continue
    const { i, j, ...rest } = it // eslint-disable-line no-unused-vars
    const spot = hangSpot(out.filter((x) => x.id !== it.id), sizeOf(it), sizeOf, n, h, avoid)
    out = out.map((x) => (x.id === it.id ? { ...rest, ...spot } : x))
  }
  return out
}
