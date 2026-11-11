// ============================================
// shapes.js -- the shape of a canvas: round, a hexagon, a triangle, or any shape at all
// ============================================
// Pure, so tests run it in Node (tests/shapes.test.mjs). Laurie sometimes paints on a
// round canvas, a hexagon or a triangle. Her painting is still cropped to the box round
// it (the photo's pixels, only cropped and turned); its shape says which part of that
// box is canvas, so a frame can follow it and the wall in the corners is never shown.
// Nothing of hers is altered: the shape is a frame drawn round her painting, not a cut.
//
// A shape is stored as `null` (a rectangle, most of them), `{ kind }` for one of the
// shapes below, or `{ kind: 'polygon', points }` for one traced by hand: its corners as
// [x, y] fractions of the box, going round.

const arch = () => {
  // A round top over straight sides: a half-ellipse across the top third, then down
  const pts = []
  for (let i = 0; i <= 12; i++) { const a = Math.PI - (i * Math.PI) / 12; pts.push([0.5 + 0.5 * Math.cos(a), 0.34 - 0.34 * Math.sin(a)]) }
  return [...pts, [1, 1], [0, 1]].map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000])
}

const bezier = (p0, p1, p2, p3, n) => Array.from({ length: n }, (_, i) => {
  const t = (i + 1) / n, u = 1 - t
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
})
const heart = () => {
  // Laurie's heart-shaped canvas, drawn from her photo of it: a tip at the bottom, sides that swell out to their widest
  // a little over a third of the way down, two full round lobes, and a shallow dip between them (measured against her photo: about a fifteenth of the way down). Left half by four curves
  // from the tip, up and over the lobe to the dip; the right half is its mirror, so it is level and the same both sides.
  const left = [
    ...bezier([0.5, 1], [0.42, 0.9], [0.1, 0.72], [0.01, 0.5], 8),
    ...bezier([0.01, 0.5], [-0.03, 0.34], [0, 0.14], [0.12, 0.05], 6),
    ...bezier([0.12, 0.05], [0.2, -0.04], [0.37, -0.03], [0.5, 0.07], 8),
  ]
  const pts = [...left.slice(0, -1), [0.5, 0.07], ...left.slice(0, -1).reverse().map(([x, y]) => [1 - x, y])]
  // The outline starts at the tip and runs up the left side; the right half comes back down, so the tip is the last corner too
  const ring = [[0.5, 1], ...pts.filter(([, y], i) => !(y === 1 && i === 0))]
  const xs = ring.map(([x]) => x), ys = ring.map(([, y]) => y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  // Stretched so the heart touches all four sides of its box: a tight crop of it fits the frame exactly
  return ring.map(([x, y]) => [Math.round(((x - x0) / (x1 - x0)) * 1000) / 1000, Math.round(((y - y0) / (y1 - y0)) * 1000) / 1000])
}

export const SHAPES = {
  rect: { label: 'Rectangle' },
  round: { label: 'Round' }, // a circle, or an oval in a box that isn't square
  hexagon: { label: 'Hexagon', points: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]] },
  'hexagon-up': { label: 'Hexagon, point up', points: [[0.5, 0], [1, 0.25], [1, 0.75], [0.5, 1], [0, 0.75], [0, 0.25]] },
  octagon: { label: 'Octagon', points: [[0.293, 0], [0.707, 0], [1, 0.293], [1, 0.707], [0.707, 1], [0.293, 1], [0, 0.707], [0, 0.293]] },
  triangle: { label: 'Triangle', points: [[0.5, 0], [1, 1], [0, 1]] },
  'triangle-down': { label: 'Triangle, point down', points: [[0, 0], [1, 0], [0.5, 1]] },
  diamond: { label: 'Diamond', points: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]] },
  arch: { label: 'Arch', points: arch() },
  heart: { label: 'Heart', points: heart() },
  polygon: { label: 'Its own shape' }, // traced by hand: tap its corners
}
/** The order the crop screen offers them in. */
export const SHAPE_ORDER = ['rect', 'round', 'hexagon', 'hexagon-up', 'octagon', 'triangle', 'triangle-down', 'diamond', 'arch', 'heart', 'polygon']
/** What Claude may say a painting's shape is (supabase/functions/_shared/claude.js keeps the same list). */
export const READ_SHAPES = ['rectangle', 'round', 'hexagon', 'octagon', 'triangle', 'diamond', 'arch', 'other']

const r3 = (v) => Math.round(Math.min(1, Math.max(0, Number(v))) * 1000) / 1000

/** A shape as it may be kept: null for a rectangle or anything not understood; a hand-traced one needs 3 to 32 corners. */
export function cleanShape(s) {
  if (!s || typeof s !== 'object' || !SHAPES[s.kind] || s.kind === 'rect') return null
  if (s.kind !== 'polygon') return { kind: s.kind }
  const pts = (Array.isArray(s.points) ? s.points : []).filter((p) => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isFinite(Number(v)))).map(([x, y]) => [r3(x), r3(y)])
  if (pts.length < 3 || pts.length > 32) return null
  return { kind: 'polygon', points: pts }
}

/** Is it anything but a rectangle? */
export const isShaped = (s) => Boolean(cleanShape(s))

/** Its corners as [x, y] fractions of the box, or null for a rectangle or a round one. */
export function shapePoints(s) {
  const c = cleanShape(s)
  if (!c || c.kind === 'round') return null
  return c.kind === 'polygon' ? c.points : SHAPES[c.kind].points
}

const pc = (v) => `${Math.round(v * 10000) / 100}%`
/** The CSS clip-path that keeps only the canvas: '' for a rectangle. */
export function clipPathOf(s) {
  const c = cleanShape(s)
  if (!c) return ''
  if (c.kind === 'round') return 'ellipse(50% 50% at 50% 50%)'
  return `polygon(${shapePoints(c).map(([x, y]) => `${pc(x)} ${pc(y)}`).join(', ')})`
}

/** The outline as an SVG path in a 100 x 100 box (stretched to the crop box on screen): '' for a rectangle. */
export function outlineOf(s) {
  const c = cleanShape(s)
  if (!c) return ''
  if (c.kind === 'round') return 'M0 50A50 50 0 1 0 100 50A50 50 0 1 0 0 50Z'
  return shapePoints(c).map(([x, y], i) => `${i ? 'L' : 'M'}${Math.round(x * 1000) / 10} ${Math.round(y * 1000) / 10}`).join('') + 'Z'
}

/** Its name in words, for the gallery's filter and a painting's page. */
export const shapeName = (s) => { const c = cleanShape(s); return c ? SHAPES[c.kind].label : SHAPES.rect.label }

/** The family a shape belongs to, for the filter (both hexagons are hexagons, both triangles triangles). */
export function shapeFamily(s) {
  const c = cleanShape(s)
  if (!c) return 'rect'
  return { 'hexagon-up': 'hexagon', 'triangle-down': 'triangle' }[c.kind] || c.kind
}

/** Claude's word for a canvas's shape as one of ours (null for a rectangle or 'other', which a person traces). */
export function shapeFromReading(word) {
  const w = String(word || '').toLowerCase()
  if (w === 'round' || w === 'oval' || w === 'circle') return { kind: 'round' }
  if (['hexagon', 'octagon', 'triangle', 'diamond', 'arch'].includes(w)) return { kind: w }
  return null
}
