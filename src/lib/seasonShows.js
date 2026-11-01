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
  // Autumn's leaves are pieces of her two autumn paintings, cut out at full size; until they are in, her witch's leaves stand in
  thanksgiving: { painting: 'autumn-stream', paintings: ['autumn-stream', 'autumn-pond'], fallback: 'witch-and-crow', kind: 'leaves', what: 'leaves cut from her two autumn paintings rest along the top of the screen and drift down one at a time' },
  fall: { painting: 'autumn-stream', paintings: ['autumn-stream', 'autumn-pond'], fallback: 'witch-and-crow', kind: 'leaves', what: 'leaves cut from her two autumn paintings rest along the top of the screen and drift down one at a time' },
}

/** A painting's leaf sheet as the show uses it: the file, the boxes, how sharp to draw it, how big. Her older sheet is small, so it is drawn larger. */
const sheetOf = (p) => ({ slug: p.slug, sheet: p.leaves.sheet, size: p.leaves.size, boxes: p.leaves.boxes, px: p.leaves.px || 1.25, scale: p.leaves.scale || [1.1, 1.9] })

/**
 * The show for a season with its painting(s) (from `list`, the paintings the
 * app has): { key, kind, what, painting, sheets, ... }, or null. A season may
 * draw its leaves from several of her paintings; one that has none of them in
 * yet falls back to another's (her witch's), and has no show only if neither
 * is there.
 */
export function showFor(key, list = PAINTINGS) {
  const s = SHOWS[key]
  if (!s) return null
  const has = (slug) => { const p = paintingBySlug(slug, list); return p && p.leaves && p.leaves.sheet ? p : null }
  const mine = (s.paintings || [s.painting]).map(has).filter(Boolean)
  const use = mine.length ? mine : [s.fallback && has(s.fallback)].filter(Boolean)
  if (!use.length) return null
  return { key, ...s, painting: use[0], sheets: use.map(sheetOf) }
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
  const r = seeded(seed + 17), sheets = show.sheets
  return Array.from({ length: count }, (_, i) => {
    const si = i % sheets.length, sh = sheets[si], [lo, hi] = sh.scale
    return {
      si, leaf: sh.boxes[(i * 5 + 3 + Math.floor(i / sheets.length) * 7) % sh.boxes.length],
      x: 5 + (i + 0.1 + r() * 0.75) * (88 / count),
      tilt: Math.round(-45 + r() * 90),
      scale: lo + r() * (hi - lo),
    }
  })
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
