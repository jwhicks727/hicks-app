// ============================================
// paintings.js -- Laurie's paintings: the gallery, and a painted bird that flies
// ============================================
// Pure, so tests run it in Node. The paintings themselves live behind
// sign-in, in the private `paintings` bucket and the `paintings` table
// (docs/PAINTINGS-STORAGE.md); the app reads them through
// src/parts/PaintingsProvider.jsx. PAINTINGS below are the ones first brought
// in with the code: development shows them from public/paintings/ (never
// deployed: firebase.json leaves that folder out), and Laurie's gallery moves
// them into the bucket with a tap. A painting with a `flyer` has one of its own birds cut out
// (scripts/lift-art.py): the bird and the patch of sky behind it composite
// back to the painting exactly, and at rest the painting is always shown
// whole, as she painted it.

export const PAINTINGS = [
  {
    slug: 'witch-and-crow',
    title: 'The witch and the crow', // a working title until Laurie names it
    named: false,
    year: null, medium: null, size: null, // hers to tell; never guessed
    src: '/paintings/witch-and-crow.jpg', small: '/paintings/witch-and-crow-720.jpg', w: 1440, h: 1920,
    seasons: ['halloween'],
    added: '2026-10-31',
    // The part a panel shows: the crow, the witch's hand and hat. [left, top, right, bottom], 0-1
    focus: [0.1, 0.14, 0.86, 0.7],
    flyer: {
      name: 'the crow',
      sprite: '/paintings/witch-and-crow-crow.png', at: [0.1743, 0.3297, 0.25, 0.1547], // [left, top, width, height], 0-1
      sky: '/paintings/witch-and-crow-sky.png', skyAt: [0.1674, 0.324, 0.2639, 0.1656],
      faces: 'right',
    },
    // The leaves she painted falling round the witch, lifted onto one sheet (scripts/lift-art.py leaves)
    leaves: { sheet: '/paintings/witch-and-crow-leaves.png', size: [842, 50], boxes: [[0,0,37,46],[39,0,54,39],[95,0,30,50],[127,0,48,28],[177,0,42,33],[221,0,43,47],[266,0,40,34],[308,0,35,38],[345,0,28,44],[375,0,30,46],[407,0,24,42],[433,0,31,37],[466,0,34,41],[502,0,30,38],[534,0,35,36],[571,0,32,39],[605,0,25,46],[632,0,36,34],[670,0,26,37],[698,0,24,42],[724,0,28,26],[754,0,28,30],[784,0,22,31],[808,0,32,25]] },
  },
  {
    slug: 'autumn-stream',
    title: 'Autumn stream', // a working title until Laurie names it
    named: false,
    year: null, medium: null, size: null, // hers to tell; never guessed
    src: '/paintings/autumn-stream.jpg', small: '/paintings/autumn-stream-720.jpg', w: 1600, h: 1600,
    seasons: ['fall', 'thanksgiving'],
    added: '2026-11-01',
    focus: [0.05, 0.05, 0.95, 0.95],
    // Leaf-shaped pieces of her own painted foliage, cut out whole at full size (scripts/lift-art.py autumn):
    // `px` is how many of the sheet's pixels make one screen pixel at scale 1, so they stay sharp.
    leaves: { sheet: '/paintings/autumn-stream-leaves.png', size: [1926, 139], px: 2, scale: [0.7, 1.15], boxes: [[0,0,75,107],[81,0,115,108],[202,0,138,58],[346,0,83,121],[435,0,148,65],[589,0,121,122],[716,0,79,139],[801,0,95,58],[902,0,106,105],[1014,0,102,74],[1122,0,56,132],[1184,0,52,112],[1242,0,152,126],[1400,0,58,115],[1464,0,48,117],[1518,0,64,107],[1588,0,69,102],[1663,0,111,88],[1780,0,42,105],[1828,0,92,129]] },
  },
  {
    slug: 'autumn-pond',
    title: 'Autumn pond', // a working title until Laurie names it
    named: false,
    year: null, medium: null, size: null, // hers to tell; never guessed
    src: '/paintings/autumn-pond.jpg', small: '/paintings/autumn-pond-720.jpg', w: 1600, h: 1600,
    seasons: ['fall', 'thanksgiving'],
    added: '2026-11-01',
    focus: [0.05, 0.05, 0.95, 0.95],
    leaves: { sheet: '/paintings/autumn-pond-leaves.png', size: [2034, 268], px: 2, scale: [0.7, 1.15], boxes: [[0,0,163,103],[169,0,120,70],[295,0,114,88],[415,0,147,54],[568,0,148,65],[722,0,117,152],[845,0,103,60],[954,0,179,89],[1139,0,58,107],[1203,0,177,76],[1386,0,65,139],[1457,0,168,111],[1631,0,86,140],[1723,0,91,122],[1820,0,67,112],[1893,0,135,71],[0,158,167,85],[173,158,45,110],[224,158,73,85],[303,158,58,101]] },
  },
]
export const paintingBySlug = (slug, list = PAINTINGS) => list.find((p) => p.slug === slug) || null
/** The painting for a season, else the newest. */
export const paintingFor = (season, list = PAINTINGS) => list.find((p) => p.seasons.includes(season)) || list[0] || null

/**
 * Where to draw a painting in a W x H frame so `focus` fills it, covering the
 * frame and, if it can, keeping its bird (`p.flyer.at`) wholly in view:
 * { width, height, left, top } in px.
 */
export function cropFor(p, W, H, focus = [0, 0, 1, 1]) {
  const [fl, ft, fr, fb] = focus
  const s = Math.max(W / (p.w * (fr - fl)), H / (p.h * (fb - ft)), W / p.w, H / p.h)
  const width = p.w * s, height = p.h * s
  const cx = ((fl + fr) / 2) * width, cy = ((ft + fb) / 2) * height
  let left = W / 2 - cx, top = H / 2 - cy
  if (p.flyer) {
    const [bx, by, bw, bh] = p.flyer.at, m = 6
    // Its left edge no further left than the frame's, and its right edge no further right
    left = Math.min(Math.max(left, m - bx * width), W - m - (bx + bw) * width)
    top = Math.min(Math.max(top, m - by * height), H - m - (by + bh) * height)
  }
  return { width, height, left: Math.min(0, Math.max(W - width, left)), top: Math.min(0, Math.max(H - height, top)) }
}
/** A box given as fractions of the painting, in the frame's px. */
export const boxIn = (crop, [x, y, w, h]) => ({ left: crop.left + x * crop.width, top: crop.top + y * crop.height, width: w * crop.width, height: h * crop.height })

// ---- The flight: round the screen, a loop, and home to its place in the painting ----

/** Waypoints across a vw x vh screen, ending at `to` ({x, y}, the bird's centre at rest), arriving from the left. */
export function flightPoints(vw, vh, to) {
  const r = Math.min(vw * 0.15, vh * 0.12), c = { x: vw * 0.4, y: vh * 0.42 }
  const loop = [[-0.25, 1], [1, 0.2], [0, -1], [-1, 0], [0.3, 1]].map(([dx, dy]) => ({ x: c.x + dx * r, y: c.y + dy * r }))
  return [
    { x: vw + 80, y: vh * 0.14 }, { x: vw * 0.74, y: vh * 0.1 }, { x: vw * 0.34, y: vh * 0.2 }, { x: vw * 0.14, y: vh * 0.34 },
    ...loop,
    { x: vw * 0.72, y: vh * 0.58 }, { x: vw * 0.86, y: vh * 0.34 },
    { x: Math.max(30, to.x - Math.max(140, vw * 0.3)), y: to.y - Math.min(90, vh * 0.1) },
    { x: to.x, y: to.y },
  ]
}

/** A point and its direction on a Catmull-Rom curve through `pts`, at u from 0 to 1. */
export function along(pts, u) {
  const n = pts.length - 1, f = Math.min(n - 1e-9, Math.max(0, u * n)), i = Math.floor(f), t = f - i
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)]
  const k = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
  const dk = (a, b, c, d) => 0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t * t)
  return { x: k(p0.x, p1.x, p2.x, p3.x), y: k(p0.y, p1.y, p2.y, p3.y), dx: dk(p0.x, p1.x, p2.x, p3.x), dy: dk(p0.y, p1.y, p2.y, p3.y) }
}

/** Where to scroll so the bird's place (its y on screen now) sits about mid-screen; unchanged if it is already comfortably in view. */
export function leadTo(scrollY, placeY, vh, maxScroll) {
  if (placeY >= vh * 0.15 && placeY <= vh * 0.72) return scrollY
  return Math.round(Math.max(0, Math.min(maxScroll, scrollY + placeY - vh * 0.48)))
}
/** How far the page has followed the bird by time t (0-1) of the flight: nothing at first, then a smooth ride down, done before the landing. */
export function followAt(t) {
  const x = Math.min(1, Math.max(0, (t - 0.28) / 0.5))
  return x * x * (3 - 2 * x)
}

/** How far along the path at time t (0-1): brisk at first, slowing to land. */
export const progress = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 1.7)

/**
 * The bird at time t (0-1) of a flight of `ms`: its centre, which way it
 * faces, its tilt (degrees), the squash of a wingbeat, and its size (px
 * wide): small and far off at first, growing as it comes nearer, to `land`.
 */
export function birdAt(pts, t, { ms = 5600, land, faces = 'right' }) {
  const u = progress(t), p = along(pts, u)
  const bob = Math.sin(t * Math.PI * 7) * 7 * (1 - t)
  const right = p.dx >= 0, dir = faces === 'right' ? (right ? 1 : -1) : (right ? -1 : 1)
  const ang = (Math.atan2(p.dy, Math.abs(p.dx) || 1e-6) * 180) / Math.PI
  const tilt = Math.max(-55, Math.min(55, ang)) * (right ? 1 : -1) * (1 - Math.pow(t, 6))
  const beats = (t * ms) / 1000 * 4.6 * Math.PI // about 2.3 wingbeats a second
  const flap = t < 0.96 ? 1 - 0.34 * Math.abs(Math.sin(beats)) : 1
  return { x: p.x, y: p.y + bob, dir, tilt, flap, size: land * (0.26 + 0.74 * Math.pow(u, 1.25)) }
}

// ---- The paintings as stored: a row and its files in the bucket -------------------
/** The files a painting keeps in the bucket, by name: `<slug>/<name>`. */
export const FILES = { src: 'full.jpg', small: 'small.jpg', sprite: 'flyer.png', sky: 'sky.png', sheet: 'leaves.png' }
export const storedPaths = (slug, row) => Object.fromEntries(Object.entries(FILES).filter(([k]) => k === 'src' || k === 'small' || (k === 'sprite' || k === 'sky' ? row.flyer : k === 'sheet' ? row.leaves : true)).map(([k, f]) => [k, `${slug}/${f}`]))
/** A stored row, with signed links for its files, in the shape the app draws from. */
export function fromRow(row, urls) {
  const u = (k) => urls[`${row.slug}/${FILES[k]}`] || ''
  return {
    slug: row.slug, title: row.title, named: row.named, year: row.year, medium: row.medium, size: row.size,
    src: u('src'), small: u('small') || u('src'), w: row.w, h: row.h, seasons: row.seasons || [], added: row.added,
    focus: row.focus || [0, 0, 1, 1],
    flyer: row.flyer ? { ...row.flyer, sprite: u('sprite'), sky: u('sky') } : undefined,
    leaves: row.leaves ? { ...row.leaves, sheet: u('sheet') } : undefined,
  }
}
/** A bundled painting as a row to store (its files go in alongside, by storedPaths). */
export function toRow(p) {
  const strip = (o, drop) => (o ? Object.fromEntries(Object.entries(o).filter(([k]) => !drop.includes(k))) : null)
  return { slug: p.slug, title: p.title, named: p.named, year: p.year, medium: p.medium, size: p.size, w: p.w, h: p.h, seasons: p.seasons, added: p.added, focus: p.focus, flyer: strip(p.flyer, ['sprite', 'sky']), leaves: strip(p.leaves, ['sheet']) }
}
