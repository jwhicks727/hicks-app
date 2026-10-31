// ============================================
// seasonShows.js -- each season shows itself in motion, from Laurie's paintings
// ============================================
// The sky keeps its own colours all year (decisions log, 2026-11-01). A
// season instead plays a short animation across the screen, made from what
// she painted: the leaves round her witch rest along the top edge of the
// screen, just out of sight, and let go one at a time through fall and Halloween.
// A season with none of her paintings yet has no show; it waits for one.
// Pure, so tests run it in Node.

import { paintingBySlug, PAINTINGS } from './paintings.js'
import { seeded } from './scenes.js'

export const SHOWS = {
  halloween: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves rest along the top of the screen and drift down one at a time, and the crow flies on Home' },
  muertos: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves rest along the top and drift down one at a time, slow, like marigold petals', slow: true },
  thanksgiving: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves rest along the top of the screen and drift down one at a time' },
  fall: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves rest along the top of the screen and drift down one at a time' },
}

/** The show for a season with its painting (from `list`, the paintings the app has): { key, kind, what, painting, ... }, or null. */
export function showFor(key, list = PAINTINGS) {
  const s = SHOWS[key], p = s && paintingBySlug(s.painting, list)
  if (!s || !p || (s.kind === 'leaves' && !(p.leaves && p.leaves.sheet))) return null
  return { key, ...s, painting: p }
}

/** How many leaves rest along the top edge. */
export const PERCHES = 7
/** The most leaves that let go in one visit: unhurried, and then it is done. */
export const MAX_DROPS = 30

/**
 * The leaves resting along the top edge, just off the screen, waiting: where
 * each sits across it (vw), how it is turned, how big it is, and which of her
 * leaves it is. Spread out, never bunched, and the same for a given day.
 */
export function leafPerches(show, seed = 1, count = PERCHES) {
  const r = seeded(seed + 17), boxes = show.painting.leaves.boxes
  return Array.from({ length: count }, (_, i) => ({
    leaf: boxes[(i * 5 + 3) % boxes.length],
    x: 5 + (i + 0.1 + r() * 0.75) * (88 / count),
    tilt: Math.round(-45 + r() * 90),
    scale: 1.1 + r() * 0.8,
  }))
}

/**
 * One perched leaf let go: it falls slowly, drifts a little sideways, sways and
 * turns gently. `r` is a random source (Math.random).
 */
export function dropOf(show, perch, r = Math.random) {
  return {
    ...perch,
    dur: (show.slow ? 26 : 20) + r() * 8,
    drift: Math.round((r() - 0.4) * 24),
    sway: Math.round(14 + r() * 22), swayDur: 3 + r() * 2.5,
    spin: (r() < 0.5 ? -1 : 1) * Math.round(120 + r() * 200),
  }
}

/** Seconds until the next leaf lets go: unhurried. */
export const dropGap = (show, r = Math.random) => (show.slow ? 12 : 9) + r() * 8
