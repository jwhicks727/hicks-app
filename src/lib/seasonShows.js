// ============================================
// seasonShows.js -- each season shows itself in motion, from Laurie's paintings
// ============================================
// The sky keeps its own colours all year (decisions log, 2026-11-01). A
// season instead plays a short animation across the screen, made from what
// she painted: at Halloween the leaves round her witch rest along the top edge
// of the screen, just out of sight, and let go one at a time (now only the Day of the Dead's); in autumn and at Halloween the wind
// at home lifts leaves out of her autumn paintings and blows them across the
// page (kind 'wind': src/lib/wind.js, src/shell/WindShow.jsx).
// A season with none of her paintings yet has no show; it waits for one.
// Pure, so tests run it in Node.

import { paintingBySlug, paintingFor, PAINTINGS } from './paintings.js'
import { LEAF_ORIGINS } from './leafOrigins.js'
import { seeded } from './scenes.js'
import { pickPainting } from './harvest.js'
import { todayAt } from './cal/dates.js'

export const SHOWS = {
  // Halloween's leaves are her witch's own, in flurries the wind carries and lets settle on the cards (the wind show, with
  // `own`: only this painting's leaves, never an autumn painting's); the crow flies on Home. Her witch's leaves have no
  // measured places in the painting, so they are blown in from upwind rather than lifted out of it.
  halloween: { painting: 'witch-and-crow', own: true, kind: 'wind', what: 'flurries of her witch’s leaves blow across the page and settle on the cards, and the crow flies on Home' },
  muertos: { painting: 'witch-and-crow', kind: 'leaves', what: 'her painted leaves rest along the top and drift down one at a time, slow, like marigold petals', slow: true },
  // Autumn's leaves are pieces of her autumn paintings, cut out at full size: the two first cut by the script, and any
  // autumn painting a parent has cut leaves from on its page (src/places/lifelist/AutumnLeaves.jsx). Until one is in,
  // her witch's leaves stand in.
  // Thanksgiving is several shows, each made for a painting: every two days Home hangs the next of her Thanksgiving
  // paintings and the phone reads its pixels to choose the show (src/lib/harvest.js, src/shell/HarvestShow.jsx): a stream
  // carries her leaves, a fire throws embers, a golden painting rains gold, the rest whirl or gather a garland.
  thanksgiving: { painting: 'autumn-stream', paintings: ['autumn-stream', 'autumn-pond'], fallback: 'witch-and-crow', kind: 'harvest', what: 'a different painting of hers and a different show every two days: leaves float down a painted stream, embers rise from a painted fire, golden leaves rain, or a whirl or garland of leaves gathers, whichever suits the painting on Home' },
  fall: { painting: 'autumn-stream', paintings: ['autumn-stream', 'autumn-pond'], fallback: 'witch-and-crow', kind: 'wind', what: 'the wind at home lifts leaves out of her autumn paintings and blows them across the page, where they settle on the cards' },
}
/** The seasons whose paintings autumn's wind may take leaves from. */
export const WIND_SEASONS = ['fall', 'thanksgiving']
/** The most paintings the wind takes leaves from at once. */
export const WIND_SHEETS = 3

/** Where a painting's leaves came from in it: kept with its row when cut in the app, else measured by scripts/leaf-origins.py. */
export function originsOf(p) {
  if (!p || !p.leaves) return null
  if (Array.isArray(p.leaves.origins) && p.leaves.origins.length) return { scale: p.leaves.originScale || 1, origins: p.leaves.origins }
  return LEAF_ORIGINS[p.slug] || null
}

/** A painting's leaf sheet as the show uses it: the file, the boxes, how sharp to draw it, how big. Her older sheet is small, so it is drawn larger. */
const sheetOf = (p) => ({ slug: p.slug, sheet: p.leaves.sheet, size: p.leaves.size, boxes: p.leaves.boxes, px: p.leaves.px || 1.25, scale: p.leaves.scale || [1.1, 1.9], origins: originsOf(p) })

/**
 * The show for a season with its painting(s) (from `list`, the paintings the
 * app has): { key, kind, what, painting, sheets, ... }, or null. A season may
 * draw its leaves from several of her paintings; one that has none of them in
 * yet falls back to another's (her witch's), and has no show only if neither
 * is there.
 */
export function showFor(key, list = PAINTINGS, day = todayAt()) {
  const s = SHOWS[key]
  if (!s) return null
  const has = (slug) => { const p = paintingBySlug(slug, list); return p && p.leaves && p.leaves.sheet ? p : null }
  let mine = (s.paintings || [s.painting]).map(has).filter(Boolean)
  // The wind also takes leaves from any autumn painting that has had them cut (newest first, as the list comes)
  if ((s.kind === 'wind' || s.kind === 'harvest') && !s.own) {
    const more = list.filter((p) => !mine.includes(p) && p.leaves && p.leaves.sheet && originsOf(p) && (p.seasons || []).some((k) => WIND_SEASONS.includes(k)))
    mine = [...mine, ...more].slice(0, WIND_SHEETS)
  }
  const use = mine.length ? mine : [s.fallback && has(s.fallback)].filter(Boolean)
  // A harvest show hangs its own painting of the day, with or without leaves cut from it (the phone cuts them when it plays)
  const pick = s.kind === 'harvest' ? pickPainting(list, day) : null
  if (!use.length && !pick) return null
  const sheets = use.map(sheetOf)
  if (pick && pick.leaves && pick.leaves.sheet && originsOf(pick)) { sheets.unshift(sheetOf(pick)); sheets.splice(WIND_SHEETS) }
  return { key, ...s, painting: pick || use[0], sheets: sheets.filter((x, i) => sheets.findIndex((y) => y.slug === x.slug) === i) }
}

/**
 * The painting Home hangs in a season: the one its show plays from, when it has one (every season's show
 * starts in the art on Home, so a newer painting of the same season never takes its frame), else her
 * newest of that season, else her newest.
 */
export function homePainting(key, list = PAINTINGS, day = todayAt()) {
  const show = showFor(key, list, day)
  return (show && show.painting) || paintingFor(key, list)
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
