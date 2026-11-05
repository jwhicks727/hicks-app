// ============================================
// wind.js -- autumn's show is the wind at home, blowing Laurie's leaves
// ============================================
// Halloween's leaves fall; autumn's blow. The show reads the real wind at home
// (the forecast the weather card already uses: speed, gusts and the direction it
// comes from) and turns it into gusts across the screen: a calm day loosens a few
// leaves, a breezy one carries them across, a Santa Ana day streams them. The
// leaves lift out of the trees in her painting on Home, from the very places she
// painted them (src/lib/leafOrigins.js), ride the gusts, and come to rest on the
// tops of the cards below until the next gust or a quick scroll stirs them up.
// Pure, so tests run it in Node; src/shell/WindShow.jsx moves the leaves.

/** How the wind feels, by its speed in mph. */
export const LEVELS = [['calm', 4], ['breeze', 12], ['windy', 22], ['gale', Infinity]]

/**
 * The wind on screen, from the forecast's now ({ speed, gusts, dir }): which way it carries a leaf (`side`, +1 to
 * the right, toward the east, as on a map), how much of it goes across the screen (`across`), how strong it feels
 * (`level`). With no reading it is a calm, and says so (`known: false`): nothing invented.
 */
export function windOf(now) {
  const speed = now && Number.isFinite(now.speed) ? Math.max(0, now.speed) : null
  if (speed == null) return { known: false, level: 'calm', side: 1, across: 0.3, speed: 0, gusts: 0, dir: null }
  const dir = Number.isFinite(now.dir) ? now.dir : null
  const gusts = Number.isFinite(now.gusts) ? Math.max(now.gusts, speed) : speed
  // `dir` is where the wind comes FROM; it blows toward the opposite side. From the east (90) it carries a leaf left.
  const toward = dir == null ? 0 : -Math.sin((dir * Math.PI) / 180)
  return {
    known: true, speed, gusts, dir,
    level: LEVELS.find(([, top]) => speed < top)[0],
    side: toward < 0 ? -1 : 1,
    // A wind from the north or south still carries a leaf a little sideways on a flat screen
    across: Math.max(0.3, Math.round(Math.abs(toward) * 100) / 100),
  }
}

/**
 * The wind's push across the screen in px a second, the steady part and a gust at its height, measured against the
 * screen's width (`vw`, counted between 360 and 900) so a gust takes a few seconds to cross a phone and doesn't race
 * across a desktop: a breeze carries a leaf across in about six seconds, a gale's gust in about one and a half.
 */
export function pushOf(w, vw = 390) {
  const ref = Math.min(900, Math.max(360, vw))
  const base = Math.min(0.42, 0.04 + w.speed * 0.012) * w.across
  const peak = Math.min(0.9, 0.08 + Math.max(w.gusts, w.speed) * 0.016) * w.across
  return { base: Math.round(base * ref), peak: Math.round(Math.max(peak, base + 0.06) * ref) }
}

/** How many gusts a visit has, how many leaves each sets flying (from the painting where it can, the rest blown in), and the lull between them (seconds). */
export const GUSTS = {
  calm: { count: 2, leaves: 3, gap: [9, 14] },
  breeze: { count: 4, leaves: 6, gap: [6, 10] },
  windy: { count: 5, leaves: 8, gap: [5, 8] },
  gale: { count: 6, leaves: 10, gap: [4, 6] },
}
/** The most leaves in the air at once, resting on cards at once, and the longest the gusts keep coming (seconds). */
export const MAX_AIR = 24
export const MAX_RESTING = 10
export const SHOW_SECONDS = 120

/** The gusts for a visit: { at, rise, hold, fall, strength } in seconds, the first a moment after the page opens. */
export function gustPlan(w, r = Math.random, first = 2.5) {
  const rule = GUSTS[w.level]
  const out = []
  let t = first
  for (let i = 0; i < rule.count && t < SHOW_SECONDS; i++) {
    const g = { at: round(t), rise: round(0.7 + r() * 0.6), hold: round(0.9 + r() * 1.4), fall: round(1.6 + r() * 1.2), strength: round(0.6 + r() * 0.4) }
    out.push(g)
    t += g.rise + g.hold + g.fall + rule.gap[0] + r() * (rule.gap[1] - rule.gap[0])
  }
  return out
}

const round = (x) => Math.round(x * 100) / 100
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

/** How hard the gusts blow at time t (seconds), 0 to 1: each rises, holds and dies away. */
export function gustAt(plan, t) {
  let v = 0
  for (const g of plan) {
    const s = t - g.at
    if (s < 0 || s > g.rise + g.hold + g.fall) continue
    const e = s < g.rise ? ease(s / g.rise) : s < g.rise + g.hold ? 1 : 1 - ease((s - g.rise - g.hold) / g.fall)
    v = Math.max(v, e * g.strength)
  }
  return v
}

/** A gust crosses the screen from the side the wind comes from: how many seconds later it reaches x (px). */
export const FRONT = 700
export const delayAt = (x, vw, side) => Math.max(0, side > 0 ? x : vw - x) / FRONT

/** The wind across the screen at a leaf, px a second (signed): the steady push plus the gust reaching it now. */
export function windAt(w, push, plan, t, x, vw) {
  const g = gustAt(plan, t - delayAt(x, vw, w.side))
  return { x: w.side * (push.base + (push.peak - push.base) * g), gust: g }
}

/**
 * Where a leaf sits in the painting's frame (px from the frame's corner), from its origin (fractions of the
 * painting) and the frame's crop (src/lib/paintings.js cropFor), or null when the crop leaves it out of view.
 */
export function originInFrame(crop, origin, W, H) {
  const x = crop.left + origin[0] * crop.width, y = crop.top + origin[1] * crop.height
  return x >= 0 && x <= W && y >= 0 && y <= H ? { x, y } : null
}

/** How wide a leaf is where it was painted, in the frame: its box on the sheet, the sheet's scale to the painting, the frame's to the screen. */
export const paintedWidth = (box, sheetScale, crop, paintingWidth) => box[2] * sheetScale * (crop.width / paintingWidth)

/** A quick scroll stirs the leaves resting on cards: the lift (px a second, upward) and the sideways shove, or null for a slow scroll. */
export function stirOf(scrollSpeed, side) {
  const v = Math.abs(scrollSpeed)
  if (v < 900) return null
  return { up: Math.min(260, 80 + v * 0.08), across: side * Math.min(220, v * 0.06) }
}
