// ============================================
// garland.js -- Thanksgiving's show: her leaves gather into a garland round the painting
// ============================================
// Autumn's show blows her leaves about; Thanksgiving's gathers them. A few moments after
// Home opens, leaves lift out of her autumn paintings from the places she painted them,
// sail over in unhurried arcs (turning as they come, like a leaf let go and caught), and
// settle one by one along the edge of the painting's frame until it wears a wreath of her
// own brushwork. It builds from the top of the frame and closes at the bottom, left and
// right together, and then rests, each leaf breathing a little, before it fades.
// Only her pixels and the page's real layout: no stand-in leaves, no data it doesn't have.
// Pure, so tests run it in Node; src/shell/GarlandShow.jsx moves the leaves.

/** How many leaves make the garland, how long it rests once closed, and how long it takes to fade (seconds). */
export const GARLAND_LEAVES = 22
export const REST_SECONDS = 55
export const FADE_SECONDS = 4

/**
 * A point `s` px along the frame's edge, going clockwise from the middle of the top, and the way the edge runs there
 * (degrees, 0 = to the right). The frame is W by H; the garland sits on the edge itself, half over the painting.
 */
export function pointOnEdge(s, W, H) {
  const P = 2 * (W + H)
  let d = ((s % P) + P) % P
  d += W / 2 // start from the middle of the top
  d %= P
  if (d < W) return { x: d, y: 0, run: 0 }
  d -= W
  if (d < H) return { x: W, y: d, run: 90 }
  d -= H
  if (d < W) return { x: W - d, y: H, run: 180 }
  d -= W
  return { x: 0, y: H - d, run: 270 }
}

/**
 * Where the garland's leaves rest: `count` places spaced round the frame, the first at the middle of the top and each
 * next one on the other side, so it grows both ways and closes at the bottom. Each has its place (`x`, `y`, in px
 * from the frame's corner), how it lies (`rot`, along the edge a little off), its size (`scale`, a multiplier) and
 * the order it arrives (`order`, 0 first). The same for the same seed, so a day's garland is its own.
 */
export function garlandSlots(W, H, count = GARLAND_LEAVES, seed = 1, r = seeded01(seed)) {
  const P = 2 * (W + H), step = P / count
  return Array.from({ length: count }, (_, i) => {
    const k = Math.ceil(i / 2), dir = i % 2 === 0 ? 1 : -1
    const s = dir * k * step + (r() - 0.5) * step * 0.35
    const at = pointOnEdge(s, W, H)
    return { order: i, x: at.x, y: at.y, rot: Math.round(at.run + (dir > 0 ? 38 : -38) + (r() - 0.5) * 50), scale: 0.8 + r() * 0.35 }
  })
}

/** A small repeatable random source, 0 to 1 (so a day's garland is the same on every phone). */
export function seeded01(seed) {
  let a = (seed >>> 0) || 1
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** How a leaf flies: when it sets off (seconds after the garland begins) and how long it takes, the later ones a little after the earlier. */
export function flightOf(order, count = GARLAND_LEAVES, r = Math.random) {
  return { delay: 0.35 * order + r() * 0.3, dur: 2.6 + r() * 1.2, turns: (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.9), lift: 70 + r() * 90 }
}

export const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

/** A point on a quadratic curve from a to b whose middle is lifted `lift` px up: where a leaf is at t, 0 to 1 (eased by the caller). */
export function arcAt(a, b, t, lift) {
  const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - lift
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }
}

/** How long the whole garland takes to close, from the first leaf setting off to the last landing (seconds). */
export function closesAt(flights) {
  return Math.max(0, ...flights.map((f) => f.delay + f.dur))
}

/** The garland's own opacity at time t: whole while it builds and rests, then gone over FADE_SECONDS. */
export function wholeness(t, closes) {
  const gone = closes + REST_SECONDS
  return t <= gone ? 1 : Math.max(0, 1 - (t - gone) / FADE_SECONDS)
}
