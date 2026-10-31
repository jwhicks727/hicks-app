// ============================================
// paintings.js -- Laurie's paintings: the gallery, and a painted bird that flies
// ============================================
// Pure, so tests run it in Node. Each painting is photographed the way
// docs/ART-CAPTURE.md says and added here with its files in public/paintings/;
// newest first. A painting with a `flyer` has one of its own birds cut out
// (scripts/lift-bird.py): the bird and the patch of sky behind it composite
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
  },
]
export const paintingBySlug = (slug) => PAINTINGS.find((p) => p.slug === slug) || null
/** The painting for a season, else the newest. */
export const paintingFor = (season) => PAINTINGS.find((p) => p.seasons.includes(season)) || PAINTINGS[0] || null

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

/** How far along the path at time t (0-1): brisk at first, slowing to land. */
export const progress = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 1.7)

/**
 * The bird at time t (0-1) of a flight of `ms`: its centre, which way it
 * faces, its tilt (degrees), the squash of a wingbeat, and its size from
 * `fly` to `land` (px wide).
 */
export function birdAt(pts, t, { ms = 5600, fly, land, faces = 'right' }) {
  const u = progress(t), p = along(pts, u)
  const bob = Math.sin(t * Math.PI * 7) * 7 * (1 - t)
  const right = p.dx >= 0, dir = faces === 'right' ? (right ? 1 : -1) : (right ? -1 : 1)
  const ang = (Math.atan2(p.dy, Math.abs(p.dx) || 1e-6) * 180) / Math.PI
  const tilt = Math.max(-55, Math.min(55, ang)) * (right ? 1 : -1) * (1 - Math.pow(t, 6))
  const beats = (t * ms) / 1000 * 4.6 * Math.PI // about 2.3 wingbeats a second
  const flap = t < 0.96 ? 1 - 0.34 * Math.abs(Math.sin(beats)) : 1
  const k = Math.min(1, Math.max(0, (t - 0.68) / 0.32)), ease = k * k * (3 - 2 * k)
  return { x: p.x, y: p.y + bob, dir, tilt, flap, size: fly + (land - fly) * ease }
}
