// Golden rain: her leaves shimmer where she painted them, like aspens in a breeze, in a wave across the painting from
// left to right, then let go in the same order and fall like rain, past the frame and down the page. More fall from the
// top edge to fill the curtain. A copy of her pixels over a painting that stays whole.
import { frameGeometry, spotsIn, makeLeaf, baseSize, stage, boxOf, put, clamp, shuffle } from './kit.js'

const ORIGIN_LEAVES = 20, EXTRA = 12

export function playGolden({ layer, list, p, el, sheets }) {
  const geo = frameGeometry(el, p), { W, H } = geo
  const own = spotsIn(sheets, list, geo).filter((s) => sheets[s.si].slug === p.slug).slice(0, ORIGIN_LEAVES)
  const leaves = []
  // Shimmering in place, then falling
  own.sort((a, b) => a.x - b.x).forEach((s) => {
    const sh = sheets[s.si], lf = makeLeaf(layer, sh, s.bi, baseSize(sh) * (0.85 + Math.random() * 0.2))
    const wave = 0.4 + 1.8 * clamp(s.x / W), shimmer = 1.8 + Math.random() * 0.8
    leaves.push({ ...lf, kind: 'own', x0: s.x, y0: s.y, k0: Math.min(1, s.k0w / lf.w), wave, go: wave + shimmer + Math.random() * 0.6, phase: Math.random() * 6.3, g: 70 + Math.random() * 40, drift: (Math.random() - 0.5) * 40 })
  })
  // The rest of the curtain from the top edge of the frame
  const pool = sheets.flatMap((sh, si) => sh.boxes.map((_, bi) => [si, bi]))
  shuffle(pool).slice(0, own.length ? EXTRA : EXTRA + 8).forEach(([si, bi], i) => {
    const sh = sheets[si], lf = makeLeaf(layer, sh, bi, baseSize(sh) * (0.8 + Math.random() * 0.25))
    leaves.push({ ...lf, kind: 'rain', x0: W * (0.04 + Math.random() * 0.92), y0: -18, k0: 0.9, wave: 0, go: 3 + i * 0.32 + Math.random() * 0.4, phase: Math.random() * 6.3, g: 60 + Math.random() * 40, drift: (Math.random() - 0.5) * 50 })
  })
  const end = Math.max(...leaves.map((l) => l.go)) + (H + 160) / 60 + 3
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > end) { for (const l of leaves) l.el.remove(); return false }
    for (const l of leaves) {
      if (l.kind === 'own' && t < l.wave) { l.el.style.opacity = '0'; continue }
      if (l.kind === 'rain' && t < l.go) { l.el.style.opacity = '0'; continue }
      if (t < l.go) {
        // Shimmer: a quick quake about its own axis, fiercest in the middle of it, as aspen leaves turn
        const f = (t - l.wave) / (l.go - l.wave), amp = Math.sin(clamp(f) * Math.PI)
        // lifting a little off the painting and growing as it quakes, so the copy is seen against the leaf it came from
        put(l, r, { x: l.x0 + Math.sin(t * 19 + l.phase) * 2.2 * amp, y: l.y0 - 14 * amp, rot: Math.sin(t * 7 + l.phase) * 10 * amp, yaw: Math.sin(t * 14 + l.phase) * 62 * amp, k: l.k0 + (1.5 - l.k0) * amp, op: Math.min(1, (t - l.wave) * 5) })
        continue
      }
      // Rain: gathering speed, swaying, turning over and over; gone a little below the frame
      const s = t - l.go, y = l.y0 + 14 * s + 0.5 * l.g * s * s * 0.5
      const x = l.x0 + l.drift * s * 0.35 + Math.sin(s * 2.1 + l.phase) * 15
      put(l, r, { x, y, rot: Math.sin(s * 1.6 + l.phase) * 28, yaw: Math.sin(s * 5 + l.phase) * 58, k: 1.5 + (1 - 1.5) * clamp(s / 1.2), op: 1 - clamp((y - H) / 170) })
    }
    return true
  })
  return () => { stop(); for (const l of leaves) l.el.remove() }
}
