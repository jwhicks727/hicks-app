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
export const LEAD_SECONDS = { wheel: 6.5, stream: 8, embers: 5.5, lake: 7.5, tumble: 6.5, petals: 8.5, golden: 7.5, wind: 6, beam: 6.5, whirl: 7, garland: 7.5 }
export function leadSeconds(style, distance, vh = 800) {
  const base = LEAD_SECONDS[style] || 7
  return Math.round(clamp(base + (Math.max(0, distance - vh) / vh) * 1.6, base, base * 1.5) * 100) / 100
}

/** Where the page should be to keep a piece at `pageY` a little above the middle of the screen (never past either end). */
export const cameraTo = (pageY, vh, maxScroll) => Math.round(clamp(pageY - vh * 0.42, 0, Math.max(0, maxScroll)))

/** The stream's leaf: it rocks down the page like a real leaf let go, wide swings narrowing as it nears the water. */
export function rocking(t, S, E, { vw = 390 } = {}) {
  const e = smooth(t), ph = t * 3 * TAU, damp = Math.pow(1 - t, 0.8)
  return { x: lerp(S.x, E.x, e) + Math.sin(ph) * vw * 0.2 * damp, y: lerp(S.y, E.y, 0.15 * t + 0.85 * e) - Math.abs(Math.sin(ph)) * 22 * (1 - t), rot: 40 * Math.cos(ph) * damp, tilt: 25 + 20 * Math.sin(ph) * damp, k: 1 }
}

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

/**
 * The pumpkin bounces down the page from one card's top edge to the next (`ledges`: [{ y, x0, x1 }] in page coordinates,
 * the cards between the top and the painting), then into the painting. The path through those ledges: [{ x, y }].
 */
export function bouncePath(S, E, ledges = [], { vw = 390 } = {}) {
  const between = ledges.filter((l) => l.y > S.y + 60 && l.y < E.y - 60).sort((a, b) => a.y - b.y)
  const steps = between.length ? between.slice(0, 6) : [1, 2, 3].map((j) => ({ y: lerp(S.y, E.y, j / 4), x0: vw * 0.15, x1: vw * 0.85 }))
  const pts = [{ x: S.x, y: S.y }]
  steps.forEach((l, j) => { const want = lerp(S.x, E.x, (j + 1) / (steps.length + 1)) + (j % 2 ? -1 : 1) * vw * 0.18; pts.push({ x: clamp(want, l.x0 + 20, l.x1 - 20), y: l.y }) })
  pts.push({ x: E.x, y: E.y })
  return pts
}
/** The pumpkin on its bounces at t (0-1): each hop a parabola from one ledge up and over to the next, rolling as it goes. */
export function bouncing(t, path, { r = 20 } = {}) {
  const n = path.length - 1, f = clamp(t) * n, i = Math.min(n - 1, Math.floor(f)), l = f - i
  const a = path[i], b = path[i + 1], h = 34 + Math.max(0, 110 - i * 22)
  let travelled = 0
  for (let j = 0; j < i; j++) travelled += Math.abs(path[j + 1].x - path[j].x)
  travelled += Math.abs(b.x - a.x) * l
  return { x: lerp(a.x, b.x, l), y: lerp(a.y, b.y, l * l) - h * 4 * l * (1 - l), rot: ((travelled / r) * 180) / Math.PI * Math.sign(b.x - a.x || 1), k: 1 }
}

/** A petal flutters down like a butterfly: figure-eights across the page, wings beating, settling into the blossom. */
export function flutter(t, S, E, { vw = 390, sec = 8.5 } = {}) {
  const e = smooth(t)
  return { x: lerp(S.x, E.x, e) + vw * 0.22 * Math.sin(TAU * 1.25 * t) * Math.pow(1 - t, 0.6), y: lerp(S.y, E.y, e) + 46 * Math.sin(TAU * 2.5 * t) * (1 - t), rot: 18 * Math.sin(TAU * 1.25 * t) * (1 - t), yaw: 72 * Math.sin(t * sec * 16) * (1 - t * t), k: 1 }
}

/** An ember falls like a shooting star from a top corner, curving down into the fire, quickening, a trail behind it. */
export function comet(t, S, E, { vw = 390 } = {}) {
  const u = Math.pow(clamp(t), 1.35), c = { x: vw * 0.12, y: lerp(S.y, E.y, 0.55) }
  const x = (1 - u) * (1 - u) * S.x + 2 * u * (1 - u) * c.x + u * u * E.x, y = (1 - u) * (1 - u) * S.y + 2 * u * (1 - u) * c.y + u * u * E.y
  return { x, y, rot: 0, k: 1.5 - 0.5 * t }
}

/** The wind's flock: leaves sweep in from the side the wind comes from, across the top and down the page in an S. */
export function gust(t, S, E, { vw = 390, side = 1, i = 0 } = {}) {
  const tt = clamp(t - i * 0.045), e = smooth(tt)
  return { x: lerp(S.x, E.x, e) + side * vw * 0.38 * Math.sin(Math.PI * 1.5 * tt) * (1 - tt) + Math.sin(i * 1.7) * 26 * (1 - tt), y: lerp(S.y, E.y, e) + Math.cos(i * 2.3) * 20 * (1 - tt), rot: (tt * 540 + i * 47) * side, tilt: 60 * Math.sin(tt * 14 + i), k: tt > 0 ? 1 : 0 }
}

/** The sunbeam: a band of light that slides down the page from the top to the painting (its middle, in page coordinates). */
export function beamDown(t, S, E) {
  const e = smooth(t)
  return { x: lerp(S.x, E.x, e), y: lerp(S.y, E.y, e), k: 1 }
}

/** A little whirl of leaves travels down the page, wandering, each leaf on its own orbit round the moving column. */
export function devil(t, S, E, { vw = 390, sec = 7, i = 0, n = 7 } = {}) {
  const e = smooth(t), cx = lerp(S.x, E.x, e) + vw * 0.18 * Math.sin(3 * Math.PI * t) * (1 - t), cy = lerp(S.y, E.y, e)
  const a = (i / n) * TAU + t * sec * 5.5, r = 18 + i * 5
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.36 - i * 7, rot: a * 57.3, tilt: 50 * Math.sin(a), k: 0.8 + 0.25 * (Math.sin(a) + 1) / 2 }
}

/** A ribbon of leaves, each following the one before, swoops down the page to the top of the frame. */
export function ribbon(t, S, E, { vw = 390, i = 0 } = {}) {
  const tt = clamp(t - i * 0.035), e = smooth(tt)
  return { x: lerp(S.x, E.x, e) + vw * 0.3 * Math.sin(TAU * 1.2 * tt) * (1 - tt), y: lerp(S.y, E.y, e), rot: 30 * Math.cos(TAU * 1.2 * tt) + i * 13, tilt: 30 * Math.sin(tt * 10 + i), k: tt > 0 ? 1 : 0 }
}

/** The wheel's pieces fall from the top in a swirl, each to its own place in a ring round the frame, ready to slot in. */
export function swarm(t, from, to, { vw = 390, i = 0 } = {}) {
  const tt = clamp((t - (i % 9) * 0.025) / 0.92), e = smooth(tt)
  return { x: lerp(from.x, to.x, e) + Math.sin(tt * TAU + i) * vw * 0.12 * (1 - tt), y: lerp(from.y, to.y, Math.pow(e, 1.1)), rot: (1 - e) * (i % 2 ? 1 : -1) * (120 + (i * 37) % 200), k: 0.7 + 0.3 * e }
}

// ---- What stays: how often the subtle part comes back ---------------------------------------------------------

/** Seconds between one subtle moment and the next, for each show (a range), and the most in one sitting. */
export const LINGER = {
  stream: { gap: [16, 26], max: 30 }, embers: { gap: [5, 9], max: 160 }, lake: { gap: [9, 15], max: 60 }, tumble: { gap: [28, 40], max: 20 },
  petals: { gap: [12, 20], max: 40 }, golden: { gap: [9, 17], max: 30 }, beam: { gap: [30, 45], max: 16 }, whirl: { gap: [16, 24], max: 30 },
  garland: { gap: [40, 60], max: 12 }, wheel: { gap: [0, 0], max: 1 }, wind: { gap: [0, 0], max: 1 },
}
export const lingerGap = (style, r = Math.random) => { const g = (LINGER[style] || LINGER.stream).gap; return g[0] + r() * (g[1] - g[0]) }
