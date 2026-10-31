// ============================================
// seasonShows.js -- each season shows itself in motion, from Laurie's paintings
// ============================================
// The sky keeps its own colours all year (decisions log, 2026-11-01). A
// season instead plays a short animation across the screen, made from what
// she painted: the leaves round her witch fall through fall and Halloween.
// A season with none of her paintings yet has no show; it waits for one.
// Pure, so tests run it in Node.

import { paintingBySlug, PAINTINGS } from './paintings.js'
import { seeded } from './scenes.js'

export const SHOWS = {
  halloween: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves fall across the screen, and the crow flies on Home', count: 18 },
  muertos: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves drift down, slow, like marigold petals', count: 12, slow: true },
  thanksgiving: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves fall across the screen', count: 14 },
  fall: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves fall across the screen', count: 14 },
}

/** The show for a season with its painting (from `list`, the paintings the app has): { key, kind, what, painting, ... }, or null. */
export function showFor(key, list = PAINTINGS) {
  const s = SHOWS[key], p = s && paintingBySlug(s.painting, list)
  if (!s || !p || (s.kind === 'leaves' && !(p.leaves && p.leaves.sheet))) return null
  return { key, ...s, painting: p }
}

/**
 * Each leaf's fall across a screen: where it starts and ends (vw), how long
 * it takes, when it starts, how it sways and turns, and which of her leaves
 * it is. The same every time for a day, so a replay matches.
 */
export function leafFalls(show, seed = 1) {
  const r = seeded(seed), boxes = show.painting.leaves.boxes
  return Array.from({ length: show.count }, (_, i) => {
    const x0 = r() * 100, drift = (r() - 0.35) * 40
    return {
      leaf: boxes[i % boxes.length],
      x0, x1: x0 + drift,
      dur: (show.slow ? 9 : 6.5) + r() * 4,
      delay: r() * (show.slow ? 5 : 3.5),
      sway: 18 + r() * 34, swayDur: 1.6 + r() * 1.6,
      spin: (r() < 0.5 ? -1 : 1) * (180 + r() * 360),
      scale: 0.9 + r() * 0.9,
    }
  })
}
/** How long a show runs before it's gone (ms). */
export const showLength = (falls) => Math.max(...falls.map((f) => (f.delay + f.dur) * 1000)) + 300
