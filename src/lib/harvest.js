// ============================================
// harvest.js -- Thanksgiving week: a different painting and a different show every two days
// ============================================
// Every season (Fall, Thanksgiving, Christmas, Lent, the Fourth, summer, every one of them but Halloween, which is her
// witch's alone) is not one show but several, each made for a painting. Every two days Home hangs the next of her paintings
// tagged for that season (the same on every phone, by the date), and the phone looks at that painting's own pixels
// to decide what it is good for: a stream she painted carries her leaves down it; a fire she painted throws
// embers; a painting that is mostly gold takes a golden rain; the rest whirl or gather into a garland. Nothing is
// drawn or generated and nothing is told to the phone from outside: the show is read from her painting.
// Pure, so tests run it in Node; src/shell/HarvestShow.jsx plays it and src/shell/harvest/ holds each show.

/** How many days each painting (and its show) stays on Home. */
export const BLOCK_DAYS = 2

/** The shows, in the order a painting with no clear character takes them. */
export const STYLES = ['wheel', 'stream', 'embers', 'lake', 'tumble', 'petals', 'beam', 'golden', 'wind', 'whirl', 'garland']

/** What each says it is, for Settings and the painting's page. */
export const WHAT = {
  wheel: 'pieces of the round painting fly in from every side and slot into place, then the wheel itself lifts, spins slowly and settles back down',
  lake: 'her leaves land on the lake she painted, ripples spread, and her reflection shimmers',
  tumble: 'her pumpkins and gourds hop out of the painting and tumble into a pile at its foot',
  petals: 'the petals of her blossom lift off, flutter round the page like butterflies and come home',
  beam: 'a sunbeam crosses her painting, lighting up dust of her leaves and glinting on the ones she painted',
  stream: 'her leaves lift out of the trees, land on the stream she painted and float down it toward you',
  embers: 'sparks and embers rise from the fire she painted and drift up across the page',
  wind: 'the wind at home lifts pieces of the painting and blows them across the page, where they settle on the cards',
  golden: 'her golden leaves shimmer along the top of the painting, then fall like rain',
  whirl: 'a whirl of her leaves lifts out of the painting, spins up the page and scatters',
  garland: 'her leaves sail over and gather into a garland round the painting',
}

/** Days since 1970 for a calendar day 'yyyy-mm-dd' (built from its parts, so no time zone moves it). */
export const dayNumber = (day) => { const [y, m, d] = day.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000) }

/** Which block of days a day is in: the same on every phone. */
export const blockOf = (day) => Math.floor(dayNumber(day) / BLOCK_DAYS)

/** Her paintings tagged for a season, in a fixed order (by slug), so the order never moves when one is added. */
export const candidates = (list, key = 'thanksgiving') => list.filter((p) => (p.seasons || []).includes(key)).sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))

/** The painting Home hangs for a day in a season: the next of them every BLOCK_DAYS days, or null with none. */
export function pickPainting(list, day, key = 'thanksgiving') {
  const c = candidates(list, key)
  return c.length ? c[blockOf(day) % c.length] : null
}

const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }

/**
 * Which show a painting gets on a day, from how it looks (`look`: what its pixels held: fire, disc, way, mirror, bloom,
 * how many pieces of fruit, and the share that is gold): a fire throws embers, a painted wheel assembles and spins, a
 * stream carries leaves, a reflection is a lake, a blossom's petals fly, three or more pumpkins tumble, a golden
 * painting rains gold; anything else gets the wind, a sunbeam, a whirl or a garland, whichever its slug and the day say.
 */
export function styleFor(look, slug, day) {
  const l = look || {}
  if (l.fire) return 'embers'
  if (l.disc) return 'wheel'
  if (l.way) return 'stream'
  if (l.mirror) return 'lake'
  if (l.bloom) return 'petals'
  if (l.fruit >= 3) return 'tumble'
  if (l.gold > 0.25) return 'golden'
  const pool = l.gold > 0.12 ? ['golden', 'wind', 'beam', 'whirl', 'garland'] : ['wind', 'beam', 'whirl', 'garland']
  return pool[(hash(slug) + blockOf(day)) % pool.length]
}

// ---- Reading a painting's colours --------------------------------------------------------------------

/** Hue (degrees), saturation and value (0 to 1) of an RGB colour. */
export function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn
  let h = 0
  if (c) h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4
  return [(h * 60 + 360) % 360, mx ? c / mx : 0, mx / 255]
}

/** The share of a painting ({ data, width, height }) that is gold: yellow to amber, strong and bright. */
export function goldShare({ data, width: W, height: H }) {
  let n = 0
  for (let i = 0; i < W * H; i++) {
    const [h, s, v] = hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
    if (h >= 38 && h <= 64 && s > 0.5 && v > 0.6) n++
  }
  return n / (W * H)
}

/**
 * A fire in a painting, or null: a compact cluster of hot red-orange paint with dark all round it (a log, a hearth,
 * the night), in the lower part. { x, y, r, colour } as fractions of the painting (r its radius as a share of the
 * width) and the colour of its core. A big orange fruit, a sunset or a field of leaves is not a fire: too large, or
 * not ringed by dark.
 */
export function findFire({ data, width: W, height: H }) {
  const hot = new Uint8Array(W * H), dark = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const [h, s, v] = hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
    if ((h <= 28 || h >= 350) && s > 0.7 && v > 0.82) hot[i] = 1
    if (v < 0.3) dark[i] = 1
  }
  // Find the clusters of hot paint (4-connected), keeping the small, bright ones
  const seen = new Uint8Array(W * H)
  let best = null
  for (let s0 = 0; s0 < W * H; s0++) {
    if (!hot[s0] || seen[s0]) continue
    const stack = [s0]; seen[s0] = 1
    let n = 0, x0 = W, x1 = 0, y0 = H, y1 = 0, sx = 0, sy = 0
    while (stack.length) {
      const i = stack.pop(), x = i % W, y = (i - x) / W
      n++; sx += x; sy += y
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < W * H && hot[j] && !seen[j] && Math.abs((j % W) - x) <= 1) { seen[j] = 1; stack.push(j) }
    }
    const area = n / (W * H)
    if (area < 0.002 || area > 0.07) continue
    const cx = sx / n, cy = sy / n
    if (cy < H * 0.45) continue
    // Dark all round it: the ring a third as wide again as the cluster
    const gw = (x1 - x0 + 1), gh = (y1 - y0 + 1), pad = Math.max(3, Math.round(Math.max(gw, gh) * 0.6))
    let ring = 0, dk = 0
    for (let y = Math.max(0, y0 - pad); y <= Math.min(H - 1, y1 + pad); y++) for (let x = Math.max(0, x0 - pad); x <= Math.min(W - 1, x1 + pad); x++) {
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue
      ring++; if (dark[y * W + x]) dk++
    }
    const darkShare = ring ? dk / ring : 0
    if (darkShare < 0.2) continue
    const score = darkShare * Math.sqrt(area)
    if (!best || score > best.score) best = { score, x: cx / W, y: cy / H, r: Math.max(gw, gh) / 2 / W, n, x0, x1, y0, y1 }
  }
  if (!best) return null
  // The colour of its core: the mean of its hot pixels
  let r = 0, g = 0, b = 0, c = 0
  for (let y = best.y0; y <= best.y1; y++) for (let x = best.x0; x <= best.x1; x++) { const i = y * W + x; if (hot[i]) { r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; c++ } }
  return { x: round(best.x), y: round(best.y), r: round(best.r), colour: [Math.round(r / c), Math.round(g / c), Math.round(b / c)] }
}

const round = (x) => Math.round(x * 10000) / 10000
