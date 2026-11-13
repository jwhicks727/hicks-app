// ============================================
// waterway.js -- finds the stream in a painting, from its own pixels
// ============================================
// Thanksgiving's show lets her leaves float down a stream she painted (src/shell/GarlandShow.jsx).
// Nothing is traced by hand and nothing is generated: this looks at the painting's colours, finds a band of
// water running up from the bottom edge (it narrows toward the horizon, as a stream does), and gives back where
// its middle and its width are, as fractions of the painting, from the far end down to the near end. A lake that
// fills the picture, a path, a sky: no band, so no waterway, and the show gathers a garland instead.
// Pure, so tests run it in Node (tests/waterway.test.mjs); the phone looks at a small copy of the painting.

/** The long side of the copy that is looked at (px). */
export const WATER_WORK = 240

/** Cool paint, not warm foliage, bank or bark: no redder than it is blue, and not near black. A stream in a photo is often pale and grey-blue. */
const isWater = (r, g, b) => b > r - 10 && b > 50

/** The runs of water across one row, joined over small gaps (a white streak, a trunk's reflection). */
function runs(mask, W, y, gap) {
  const out = []
  let a = -1, last = -1
  for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue
    if (a < 0) { a = x; last = x; continue }
    if (x - last > gap) { out.push([a, last]); a = x }
    last = x
  }
  if (a >= 0) out.push([a, last])
  return out
}

/**
 * The stream in a painting, or null. `px` is { data, width, height } (RGBA). Returns
 * { points: [{ x, y, half }] } in fractions of the painting, ordered from the far end (top) to the near end
 * (bottom): `x` its middle, `y` its row, `half` half its width.
 */
export function findWaterway({ data, width: W, height: H }) {
  const mask = new Uint8Array(W * H)
  for (let i = 0, j = 0; i < W * H; i++, j += 4) mask[i] = isWater(data[j], data[j + 1], data[j + 2]) ? 1 : 0
  const gap = Math.max(2, Math.round(W * 0.13))
  // Begin near the bottom edge, in the widest run toward the middle
  let y = Math.floor(H * 0.96), run = null
  for (; y > H * 0.8 && !run; y--) {
    const rs = runs(mask, W, y, gap).filter((r) => r[1] - r[0] >= W * 0.06 && (r[0] + r[1]) / 2 > W * 0.2 && (r[0] + r[1]) / 2 < W * 0.8)
    if (rs.length) run = rs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0]
  }
  if (!run) return null
  const pts = [{ y, a: run[0], b: run[1] }]
  let prev = run
  for (y = y - 1; y > H * 0.4; y--) {
    const w = prev[1] - prev[0] + 1
    const cand = runs(mask, W, y, gap).filter((r) => r[1] >= prev[0] - w * 0.3 && r[0] <= prev[1] + w * 0.3)
    if (!cand.length) break
    // Merge what overlaps the last row into one run, so a split by an island of colour doesn't end it
    const m = [Math.min(...cand.map((r) => r[0])), Math.max(...cand.map((r) => r[1]))]
    // A stream narrows toward the horizon: a run that suddenly widens is the haze of far trees, not water
    if (m[1] - m[0] + 1 > w * 1.35 + W * 0.02) break
    pts.push({ y, a: m[0], b: m[1] }); prev = m
  }
  if (pts.length < 8) return null
  const near = pts[0], far = pts[pts.length - 1]
  const nearHalf = (near.b - near.a + 1) / 2 / W, farHalf = (far.b - far.a + 1) / 2 / W
  const span = (near.y - far.y) / H
  // A stream, not a lake or a sliver: wide enough at the bottom to float a leaf, narrower far off, and tall enough to follow
  if (span < 0.15 || nearHalf < 0.04 || nearHalf > 0.3 || farHalf > nearHalf * 0.85) return null
  // Far to near, thinned to about 40 points, with the middle smoothed along the stream
  const ordered = pts.reverse()
  const step = Math.max(1, Math.ceil(ordered.length / 40))
  const thin = ordered.filter((_, i) => i % step === 0 || i === ordered.length - 1)
  const mid = thin.map((p) => (p.a + p.b + 1) / 2 / W)
  const smooth = mid.map((_, i) => { let s = 0, n = 0; for (let k = -2; k <= 2; k++) { if (mid[i + k] != null) { s += mid[i + k]; n++ } } return s / n })
  const half = thin.map((p) => (p.b - p.a + 1) / 2 / W)
  const hs = half.map((_, i) => { let s = 0, n = 0; for (let k = -2; k <= 2; k++) { if (half[i + k] != null) { s += half[i + k]; n++ } } return s / n })
  return { points: thin.map((p, i) => ({ x: round(smooth[i]), y: round(p.y / H), half: round(hs[i]) })) }
}

const round = (x) => Math.round(x * 10000) / 10000

/** A point u (0 far, 1 near) of the way down the stream, interpolated: { x, y, half } as fractions of the painting. */
export function along(way, u) {
  const p = way.points, f = Math.min(1, Math.max(0, u)) * (p.length - 1), i = Math.min(p.length - 2, Math.floor(f)), t = f - i
  const mix = (k) => p[i][k] + (p[i + 1][k] - p[i][k]) * t
  return { x: mix('x'), y: mix('y'), half: mix('half') }
}

/**
 * How a leaf rides the stream: how long the trip takes (seconds, quickening as it nears), how far to one side of the
 * middle it keeps (a share of the half-width, -0.6 to 0.6), how it bobs. `r` is a random source.
 */
export function rideOf(r = Math.random) {
  return { dur: 8.5 + r() * 4, lane: (r() - 0.5) * 1.2, bob: 0.4 + r() * 0.5, wobble: 2 + r() * 3, turn: (r() < 0.5 ? -1 : 1) * (20 + r() * 40) }
}

/** How far down the stream (0 to 1) a leaf is `s` seconds into its ride: slow where the water is far and still, quicker near. */
export const progressAt = (s, dur) => { const f = Math.min(1, Math.max(0, s / dur)); return f * (0.75 + 0.25 * f) }
