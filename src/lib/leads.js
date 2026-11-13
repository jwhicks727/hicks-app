// ============================================
// leads.js -- how each season's show carries you from the top of the page down to the painting
// ============================================
// Every season's show has the witch's shape (decisions log, 2026-11-13): it starts at the top of the page, something
// gorgeous carries you down to the painting (her crow did it first), the painting's own show plays there, and something
// subtle stays with you everywhere in the app afterwards (her leaves did that). This file is the first part's motion: each
// show its own, made of pieces of the painting, from the top of the page (S) to its place in the painting (E), both in
// page coordinates; the page follows the piece down (src/shell/harvest/lead.js) unless someone scrolls or touches first.
// Pure, so tests run it in Node (tests/leads.test.mjs).

export const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const lerp = (a, b, t) => a + (b - a) * t
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
const TAU = Math.PI * 2

/** How long each lead takes for a short trip (seconds); a longer page adds a little, never more than half again. */
export const LEAD_SECONDS = { wheel: 7, stream: 7.5, embers: 7, lake: 7.5, tumble: 7.5, petals: 10, golden: 7.5, wind: 8, beam: 7.5, whirl: 7.5, garland: 8 }
export function leadSeconds(style, distance, vh = 800) {
  const base = LEAD_SECONDS[style] || 7
  return Math.round(clamp(base + (Math.max(0, distance - vh) / vh) * 1.6, base, base * 1.5) * 100) / 100
}

/** Where the page should be to keep a piece at `pageY` a little above the middle of the screen (never past either end). */
export const cameraTo = (pageY, vh, maxScroll) => Math.round(clamp(pageY - vh * 0.42, 0, Math.max(0, maxScroll)))

/** A golden leaf spinning down like a maple seed: a steady fall, turning fast, its helix tightening as it lands. */
export function samara(t, S, E, { vw = 390, sec = 7.5 } = {}) {
  const e = smooth(t)
  return { x: lerp(S.x, E.x, e) + Math.sin(t * 9 * Math.PI) * vw * 0.1 * Math.pow(1 - t, 0.6), y: lerp(S.y, E.y, 0.3 * t + 0.7 * e), rot: t * sec * 760 * (1 - 0.6 * t), yaw: Math.sin(t * sec * 9) * 45 * (1 - t), k: 1 }
}

/** The lake's leaf skips down the page like a flat stone, hop after hop, each lower and shorter, and lands on the water. */
export const SKIPS = 5
export function skipping(t, S, E, { vw = 390 } = {}) {
  const u = clamp(t), f = u * SKIPS, i = Math.min(SKIPS - 1, Math.floor(f)), l = f - i
  const P = (j) => ({ x: lerp(S.x, E.x, j / SKIPS) + (j > 0 && j < SKIPS ? (j % 2 ? 1 : -1) * vw * 0.2 : 0), y: lerp(S.y, E.y, j / SKIPS) })
  const a = P(i), b = P(i + 1), h = 90 * (1 - i / SKIPS) + 24
  return { x: lerp(a.x, b.x, l), y: lerp(a.y, b.y, l) - h * 4 * l * (1 - l), rot: (b.x - a.x) * 0.12 * (l - 0.5), tilt: 50 + 15 * Math.sin(l * Math.PI), k: 1 }
}
/** Where and when the skipping leaf touches down (each touch leaves a ripple on the page), the last on the water itself. */
export function skipTouches(S, E, o = {}) {
  return Array.from({ length: SKIPS }, (_, j) => { const t = (j + 1) / SKIPS, p = skipping(t - 1e-9, S, E, o); return { t, x: p.x, y: p.y } })
}

// ---- Paths that use the page itself: the cards between the top and the painting ------------------------------
// `cards` are [{ x0, x1, y0, y1 }] in page coordinates, top to bottom, only those between the start and the painting.

/** A point a share u (0-1) of the way along a polyline, by its length, and the way it runs there (degrees). */
export function alongLine(pts, u) {
  const segs = []
  let total = 0
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(d); total += d }
  let want = clamp(u) * total
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i] || i === segs.length - 1) { const f = segs[i] ? clamp(want / segs[i]) : 1, a = pts[i], b = pts[i + 1]; return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f), run: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, length: total } }
    want -= segs[i]
  }
  return { ...pts[pts.length - 1], run: 90, length: total }
}

/** The fire's fuse: down the outside of each card, one side then the other, across the gaps between them, and into the fire. */
export function fusePath(S, E, cards, { pad = 7 } = {}) {
  const pts = [{ x: S.x, y: S.y }]
  cards.forEach((c, i) => {
    const x = i % 2 ? c.x1 + pad : c.x0 - pad
    pts.push({ x, y: c.y0 - pad }, { x, y: c.y1 + pad })
  })
  pts.push({ x: E.x, y: E.y })
  return pts
}

/**
 * The pumpkin's plinko: it drops onto each card's top edge, rolls along it to the nearer end, rolls off and drops onto the
 * next, then into the painting. Segments [{ kind: 'drop'|'roll', a, b, s }] with `s` the seconds each takes at that speed.
 */
export function plinkoPath(S, E, cards, { vw = 390, r = 20 } = {}) {
  const segs = []
  let at = { x: S.x, y: S.y }
  cards.slice(0, 5).forEach((c, i) => {
    const land = { x: clamp(at.x, c.x0 + r, c.x1 - r), y: c.y0 - r }
    segs.push({ kind: 'drop', a: at, b: land, s: Math.sqrt(Math.max(30, land.y - at.y) / 600) })
    const leftNear = land.x - c.x0 < c.x1 - land.x, off = { x: (i % 2 ? !leftNear : leftNear) ? c.x0 - r * 0.2 : c.x1 + r * 0.2, y: c.y0 - r }
    segs.push({ kind: 'roll', a: land, b: off, s: Math.abs(off.x - land.x) / 260 })
    at = off
  })
  segs.push({ kind: 'drop', a: at, b: { x: E.x, y: E.y }, s: Math.sqrt(Math.max(30, E.y - at.y) / 600) })
  return segs
}
/** Where the pumpkin is at t (0-1) on its plinko, and how far it has rolled (degrees of turn for its radius). */
export function plinkoAt(segs, t, { r = 20 } = {}) {
  const total = segs.reduce((a, s) => a + s.s, 0)
  let want = clamp(t) * total, rolled = 0
  for (const sg of segs) {
    const f = sg.s ? clamp(want / sg.s) : 1
    if (want <= sg.s || sg === segs[segs.length - 1]) {
      if (sg.kind === 'roll') { const x = lerp(sg.a.x, sg.b.x, f); rolled += x - sg.a.x; return { x, y: sg.a.y, rot: (rolled / r) * 57.3, k: 1 } }
      // a drop: forward a little as it falls, and down faster and faster
      return { x: lerp(sg.a.x, sg.b.x, f), y: lerp(sg.a.y, sg.b.y, f * f), rot: ((rolled + (sg.b.x - sg.a.x) * f) / r) * 57.3, k: 1 }
    }
    if (sg.kind === 'roll') rolled += sg.b.x - sg.a.x
    want -= sg.s
  }
  return { ...segs[segs.length - 1].b, rot: (rolled / r) * 57.3, k: 1 }
}

/** The butterflies' stops: a place on the top edge of each card on the way, then the blossom. [{ x, y }] */
export function hopStops(S, E, cards, { r = Math.random } = {}) {
  return [{ x: S.x, y: S.y }, ...cards.slice(0, 4).map((c) => ({ x: lerp(c.x0 + 30, c.x1 - 30, 0.2 + r() * 0.6), y: c.y0 })), { x: E.x, y: E.y }]
}
/** A butterfly at t (0-1): it flies from stop to stop in an arc, fluttering, and rests a moment on each card, wings slow. */
export function hopAt(stops, t, { i = 0, sec = 9 } = {}) {
  const n = stops.length - 1, rest = 0.35 // a share of each leg spent resting at its start (not at the top)
  const f = clamp(t) * n, k = Math.min(n - 1, Math.floor(f)), l = f - k
  const resting = k > 0 && l < rest
  const fly = k > 0 ? clamp((l - rest) / (1 - rest)) : l
  const a = stops[k], b = stops[k + 1], e = smooth(fly), off = (i - 1) * 16
  const x = lerp(a.x, b.x, e) + off * (resting ? 0.4 : 1) + Math.sin(fly * Math.PI * 2 + i) * 18 * (1 - Math.abs(2 * fly - 1))
  const y = lerp(a.y, b.y, e) - Math.sin(fly * Math.PI) * (40 + 30 * (i % 2)) + (resting ? -4 : 0)
  const beat = resting ? 30 + 30 * Math.sin(t * sec * 3 + i) : 72 * Math.sin(t * sec * 17 + i)
  return { x, y, yaw: beat, rot: resting ? 0 : 12 * Math.sin(fly * Math.PI * 4 + i), k: 1, resting }
}

/** A murmuration: a cloud of leaves loops across the top like starlings, then pours down to the painting. One leaf, i of n. */
export function murmur(t, S, E, { vw = 390, vh = 800, i = 0, n = 20 } = {}) {
  const loop = clamp(t / 0.45), dive = smooth(clamp((t - 0.38) / 0.62))
  const a = loop * TAU * 1.1
  const top = { x: vw / 2 + Math.sin(a) * vw * 0.3, y: S.y + vh * 0.16 + Math.sin(a * 2) * vh * 0.07 }
  const c = { x: lerp(top.x, E.x, dive), y: lerp(top.y, E.y, dive) }
  const spread = (1 - dive * 0.88) * (58 + 30 * Math.sin(t * 7 + i))
  const ph = (i / n) * TAU
  return { x: c.x + Math.cos(ph + t * 9) * spread + Math.sin(t * 13 + i * 2.1) * 10, y: c.y + Math.sin(ph * 1.7 + t * 8) * spread * 0.6, rot: t * 700 + i * 31, tilt: 60 * Math.sin(t * 11 + i), k: 1 }
}

/** The mandala's kaleidoscope: its pieces turn in a rosette round a centre that floats down the page, opening into a ring at the frame. */
export function rosette(t, S, E, { i = 0, n = 12, R = 120, to = null } = {}) {
  const e = smooth(t), c = { x: lerp(S.x, E.x, e), y: lerp(S.y, E.y, e) }
  const a = (i / n) * TAU + t * 5.2, rr = R * (0.32 + 0.12 * Math.sin(t * 6 + i)) * (1 - 0.3 * Math.sin(t * Math.PI))
  const spot = { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr }
  const open = smooth(clamp((t - 0.8) / 0.2))
  return to ? { x: lerp(spot.x, to.x, open), y: lerp(spot.y, to.y, open), rot: (a * 180) / Math.PI * (1 - open), k: 0.7 + 0.3 * open } : { ...spot, rot: (a * 180) / Math.PI, k: 0.7 }
}

/** A swag of bunting from a to b, sagging in the middle: a point a share u along it. */
export function swag(a, b, u, sag = 60) { return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) + sag * 4 * u * (1 - u) } }
/** The garland's anchors down the page: the outer edges, one side then the other, a swag between each, then the frame. */
export function buntingAnchors(S, E, { vw = 390, step = 260 } = {}) {
  const pts = [{ x: vw * 0.06, y: S.y }]
  let y = S.y, i = 1
  while (y + step < E.y - 40) { y += step; pts.push({ x: i % 2 ? vw * 0.94 : vw * 0.06, y }); i++ }
  pts.push({ x: E.x, y: E.y })
  return pts
}

// ---- What stays: how often the subtle part comes back ---------------------------------------------------------

/** Seconds between one subtle moment and the next, for each show (a range), and the most in one sitting. */
export const LINGER = {
  stream: { gap: [16, 26], max: 30 }, embers: { gap: [5, 9], max: 160 }, lake: { gap: [9, 15], max: 60 }, tumble: { gap: [28, 40], max: 20 },
  petals: { gap: [12, 20], max: 40 }, golden: { gap: [9, 17], max: 30 }, beam: { gap: [30, 45], max: 16 }, whirl: { gap: [16, 24], max: 30 },
  garland: { gap: [40, 60], max: 12 }, wheel: { gap: [0, 0], max: 1 }, wind: { gap: [0, 0], max: 1 },
}
export const lingerGap = (style, r = Math.random) => { const g = (LINGER[style] || LINGER.stream).gap; return g[0] + r() * (g[1] - g[0]) }
