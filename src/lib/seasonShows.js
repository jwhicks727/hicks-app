// ============================================
// seasonShows.js -- each season shows itself in motion, from Laurie's paintings
// ============================================
// The sky keeps its own colours all year (decisions log, 2026-11-01). A season instead plays a
// short animation, made from what she painted and starting in the painting on Home: every
// season but Halloween is a rotation of her paintings tagged for it, each with the show its own
// pixels suggest (src/lib/harvest.js, src/shell/HarvestShow.jsx); Halloween alone is her witch's
// (flurries of her leaves in the wind, kind 'wind': src/lib/wind.js, src/shell/WindShow.jsx).
// A season with none of her paintings yet has no show; it waits for one.
// Pure, so tests run it in Node.

import { paintingBySlug, paintingFor, PAINTINGS } from './paintings.js'
import { LEAF_ORIGINS } from './leafOrigins.js'
import { seeded } from './scenes.js'
import { pickPainting } from './harvest.js'
import { todayAt } from './cal/dates.js'
import { SEASON_ORDER } from './seasons.js'

// Every season but Halloween is the same thing: a rotation. Every two days Home hangs the next of her paintings tagged for
// the season, and the phone reads that painting's own pixels to choose the show it suits (src/lib/harvest.js,
// src/shell/HarvestShow.jsx): a wheel assembles, a stream carries her leaves, a fire throws embers, a lake ripples, fruit
// tumbles, petals flutter, gold rains, or the wind, a sunbeam, a whirl or a garland. A season with none of her paintings
// yet has no show. Halloween alone is her witch's (her flurries and the crow): she belongs to no other season, and none of
// her leaves ever stands in for another's (decisions log, 2026-11-13).
const ROTATION = 'a different painting of hers every two days, and a show made for it: a wheel that assembles and spins, leaves down a painted stream, embers from a painted fire, a lake that ripples, pumpkins that tumble, petals that flutter, golden rain, the wind, a sunbeam, a whirl or a garland of its own leaves, whichever suits the painting on Home'
export const SHOWS = {
  // Halloween's leaves are her witch's own, in flurries the wind carries and lets settle on the cards (the wind show, with
  // `own`: only this painting's leaves); the crow flies on Home. Her witch's leaves have no measured places in the painting,
  // so they are blown in from upwind rather than lifted out of it.
  halloween: { painting: 'witch-and-crow', own: true, kind: 'wind', what: 'flurries of her witch’s leaves blow across the page and settle on the cards, and the crow flies on Home' },
  ...Object.fromEntries(SEASON_ORDER.filter((k) => k !== 'halloween').map((k) => [k, { kind: 'harvest', what: ROTATION }])),
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
 * The show for a season on a day, with its painting (from `list`, the paintings the app has): { key, kind, what,
 * painting, sheets, ... }, or null. A rotation season (all but Halloween) hangs the painting of the day, the next of those
 * tagged for the season every two days; `sheets` are leaves already cut from it, and from other paintings of the same
 * season (Fall and Thanksgiving share their leaves), and the phone cuts more from the painting itself as it plays. A season
 * with no painting of hers has no show; her witch never stands in for another's.
 */
export function showFor(key, list = PAINTINGS, day = todayAt()) {
  const s = SHOWS[key]
  if (!s) return null
  if (s.kind === 'harvest') {
    const pick = pickPainting(list, day, key)
    if (!pick) return null
    const tags = WIND_SEASONS.includes(key) ? WIND_SEASONS : [key]
    const cut = (p) => p.leaves && p.leaves.sheet && originsOf(p) && (p.seasons || []).some((k) => tags.includes(k))
    const sheets = [pick, ...list.filter((p) => p !== pick)].filter(cut).slice(0, WIND_SHEETS).map(sheetOf)
    return { key, ...s, painting: pick, sheets }
  }
  const has = (slug) => { const p = paintingBySlug(slug, list); return p && p.leaves && p.leaves.sheet ? p : null }
  const mine = (s.paintings || [s.painting]).map(has).filter(Boolean)
  if (!mine.length) return null
  return { key, ...s, painting: mine[0], sheets: mine.map(sheetOf) }
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
