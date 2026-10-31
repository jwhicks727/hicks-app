// ============================================
// iso.js -- the academy's isometric geometry
// ============================================
// Pure, so tests run it in Node. A room is an N×N floor of diamond tiles,
// 64 wide and 32 tall, with two back walls; the campus is the same grid,
// larger, with a little building on each room's square. i runs down to the
// right, j down to the left; (0, 0) is the back corner.

export const TW = 64, TH = 32

/** A grid corner's place on screen. */
export const pt = (i, j) => ({ x: (i - j) * (TW / 2), y: (i + j) * (TH / 2) })
/** The middle of a square. */
export const mid = (i, j) => pt(i + 0.5, j + 0.5)
/** The diamond of a square, as SVG points. */
export function tile(i, j, inset = 0) {
  const a = pt(i + inset, j + inset), b = pt(i + 1 - inset, j + inset), c = pt(i + 1 - inset, j + 1 - inset), d = pt(i + inset, j + 1 - inset)
  return `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`
}
const P = (...ps) => ps.map((p) => `${p.x},${p.y}`).join(' ')

/** The floor, and the slab under it (its two front faces), for an n×n room. */
export function floorShapes(n, depth = 12) {
  const t = pt(0, 0), r = pt(n, 0), b = pt(n, n), l = pt(0, n)
  const dn = (p) => ({ x: p.x, y: p.y + depth })
  return { top: P(t, r, b, l), left: P(l, b, dn(b), dn(l)), right: P(b, r, dn(r), dn(b)) }
}

/** The two back walls of an n×n room, `h` tall, with a thin cap along each top. */
export function wallShapes(n, h, cap = 6) {
  const t = pt(0, 0), r = pt(n, 0), l = pt(0, n)
  const up = (p, k = h) => ({ x: p.x, y: p.y - k })
  return {
    left: P(l, t, up(t), up(l)),
    right: P(t, r, up(r), up(t)),
    capLeft: P(up(l), up(t), { x: t.x, y: t.y - h - cap }, { x: l.x - cap, y: l.y - h - cap / 2 }),
    capRight: P(up(t), up(r), { x: r.x + cap, y: r.y - h - cap / 2 }, { x: t.x, y: t.y - h - cap }),
  }
}

/**
 * An SVG transform that lays flat wall-space onto a wall: x along the wall
 * (one square = 32 units, from its outer end to the back corner on the left
 * wall, from the back corner on the right), y downward from the floor line.
 * Text drawn in wall-space reads left to right on both walls.
 */
export const wallMatrix = (side, n) => (side === 'left' ? `matrix(1 -0.5 0 1 ${-n * (TW / 2)} ${n * (TH / 2)})` : 'matrix(1 0.5 0 1 0 0)')
/** Wall-space length of a wall: */
export const wallLength = (n) => n * (TW / 2)

/** The square under a point on screen (in the drawing's own units), or null off the floor. */
export function cellAt(x, y, n) {
  const i = Math.floor((x / (TW / 2) + y / (TH / 2)) / 2), j = Math.floor((y / (TH / 2) - x / (TW / 2)) / 2)
  return i >= 0 && j >= 0 && i < n && j < n ? { i, j } : null
}

/** Things drawn back to front, so nearer ones stand in front. */
export const byDepth = (a, b) => (a.i + a.j) - (b.i + b.j) || a.i - b.i

/** The viewBox that holds an n×n room with walls `h` tall. */
export function roomBox(n, h, pad = 14) {
  const w = n * TW
  return { x: -w / 2 - pad, y: -h - pad - 8, w: w + pad * 2, h: n * TH + h + pad * 2 + 22 }
}

/** The four moves on the grid, as arrows on screen: each goes along one edge of the diamond. */
export const MOVES = [
  ['nw', '↖', 'Back left', -1, 0], ['ne', '↗', 'Back right', 0, -1],
  ['sw', '↙', 'Front left', 0, 1], ['se', '↘', 'Front right', 1, 0],
]
