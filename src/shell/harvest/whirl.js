// A whirl of leaves: they lift from where she painted them, are drawn into a spinning column that climbs the page
// (nearer leaves bigger and brighter, the far side dimmer), and scatter at the top, drifting down. A copy of her pixels.
import { frameGeometry, spotsIn, makeLeaf, baseSize, stage, boxOf, put, clamp, ease, shuffle } from './kit.js'

const LEAVES = 22

export function playWhirl({ layer, list, p, el, sheets }) {
  const geo = frameGeometry(el, p), { W, H } = geo
  const spots = spotsIn(sheets, list, geo).slice(0, LEAVES)
  const pool = sheets.flatMap((sh, si) => sh.boxes.map((_, bi) => [si, bi]))
  const leaves = []
  const add = (si, bi, x0, y0, k0w) => {
    const sh = sheets[si], lf = makeLeaf(layer, sh, bi, baseSize(sh) * (0.95 + Math.random() * 0.25))
    const u = Math.random()
    leaves.push({ ...lf, x0, y0, k0: k0w ? Math.min(1, k0w / lf.w) : 0.7, u, R: 22 + 88 * u, w0: 4.4 - 2.6 * u, th: Math.random() * 6.28, up: (Math.random() - 0.5) * 56 - u * 30, join: 0.35 + leaves.length * 0.09, scatter: 7 + Math.random() * 2.2, spin: (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 200), rot0: Math.random() * 180 - 90, phase: Math.random() * 6.3 })
  }
  spots.forEach((s) => add(s.si, s.bi, s.x, s.y, s.k0w))
  shuffle(pool).slice(0, Math.max(0, LEAVES - spots.length)).forEach(([si, bi]) => add(si, bi, W * (0.2 + Math.random() * 0.6), H * 0.95, 0))
  // The column's axis: from the middle of the frame's lower half, climbing the page and leaning a little to one side
  const side = Math.random() < 0.5 ? -1 : 1
  const axis = (t) => ({ x: W * 0.5 + side * (t * 22 + Math.sin(t * 0.8) * 26), y: H * 0.72 - t * 46 })
  const end = Math.max(...leaves.map((l) => l.scatter)) + 5.5
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > end) { for (const l of leaves) l.el.remove(); return false }
    for (const l of leaves) {
      const s = t - l.join
      if (s < 0) { l.el.style.opacity = '0'; continue }
      const orbit = (tt) => {
        const th = l.th + l.w0 * tt, a = axis(tt + l.join), grow = ease(clamp(tt / 2)) // the column widens as it forms
        return { x: a.x + Math.cos(th) * l.R * grow, y: a.y + Math.sin(th) * l.R * grow * 0.36 + l.up * grow, front: Math.sin(th) }
      }
      if (t < l.scatter) {
        const o = orbit(s), e = ease(s / 1.1)
        const x = l.x0 + (o.x - l.x0) * e, y = l.y0 + (o.y - l.y0) * e
        put(l, r, { x, y, rot: l.rot0 + l.spin * s * 0.6, tilt: 55 * Math.sin(s * 3 + l.phase), k: (l.k0 + (1 - l.k0) * e) * (0.88 + 0.22 * o.front), op: Math.min(1, s * 6) * (0.78 + 0.22 * o.front) })
      } else {
        // Let go along the way it was turning, slowing, and sinking
        const s0 = l.scatter - l.join, o = orbit(s0), o2 = orbit(s0 - 0.05)
        const vx = (o.x - o2.x) / 0.05, vy = (o.y - o2.y) / 0.05, q = t - l.scatter, drag = 1 - Math.exp(-q * 1.3)
        const x = o.x + vx * drag / 1.3 * 0.8 + Math.sin(q * 2 + l.phase) * 12, y = o.y + vy * drag / 1.3 * 0.8 + 38 * q + Math.sin(q * 1.4 + l.phase) * 6
        put(l, r, { x, y, rot: l.rot0 + l.spin * (s0 * 0.6 + q * 0.5), tilt: 55 * Math.sin(q * 3 + l.phase), k: 1, op: 1 - clamp((q - 3) / 2.4) })
      }
    }
    return true
  })
  return () => { stop(); for (const l of leaves) l.el.remove() }
}
