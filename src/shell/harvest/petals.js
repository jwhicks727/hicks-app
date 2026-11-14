// Petals: the blossom she painted comes apart into its petals (cut from the painting's own pixels by the shape of the
// blossom), which lift off, flutter round the page like butterflies, wings beating, and fly home to fit exactly where
// they were. A copy of her pixels over a painting that stays whole.
import { frameGeometry, stage, boxOf, clamp, ease } from './kit.js'

const FLY = 9, HOME = 2.6

export function playPetals({ layer, p, el, look }) {
  const geo = frameGeometry(el, p), { W, H, crop } = geo
  const px = look.px480, s = crop.width / px.width
  const petals = look.bloom.pieces.map((pc, i, all) => {
    const c = document.createElement('canvas'); c.width = pc.w; c.height = pc.h
    c.getContext('2d').putImageData(new ImageData(pc.rgba, pc.w, pc.h), 0, 0)
    c.className = 'hv-piece'
    c.style.width = `${pc.w * s}px`; c.style.height = `${pc.h * s}px`; c.style.transformOrigin = `${pc.ax * s}px ${pc.ay * s}px`; c.style.opacity = '0'
    layer.appendChild(c)
    const hx = crop.left + (pc.x + pc.ax) * s, hy = crop.top + (pc.y + pc.ay) * s
    return { el: c, ox: pc.ax * s, oy: pc.ay * s, hx, hy, k: 0.7 + i * 0.05, a: 0.55 * W + Math.random() * 0.45 * W, b: 0.4 * H + Math.random() * 0.5 * H, wa: 0.4 + Math.random() * 0.25, wb: 0.55 + Math.random() * 0.3, ph: Math.random() * 6.28, ps: Math.random() * 6.28, beat: 15 + Math.random() * 8, lift: 0.5 + i * 0.12, up: 8 + Math.random() * 10 }
  })
  const end = FLY + HOME + 1.2
  const path = (pt, t) => ({ x: W / 2 + Math.cos(pt.wa * t + pt.ph) * pt.a * 0.62, y: H * 0.45 - pt.up * t * 0.7 + Math.sin(pt.wb * t + pt.ps) * pt.b * 0.5 })
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > end) { petals.forEach((pt) => pt.el.remove()); return false }
    for (const pt of petals) {
      const t0 = t - pt.lift
      if (t0 < 0) { pt.el.style.opacity = '0'; continue }
      // away: blends from home to the flight path over 1.4 s; back: blends from the path home over the last HOME seconds
      const out = ease(clamp(t0 / 1.4)), back = ease(clamp((t0 - FLY) / HOME)), mix = out * (1 - back)
      const q = path(pt, t0), q2 = path(pt, t0 + 0.05)
      const x = pt.hx + (q.x - pt.hx) * mix, y = pt.hy + (q.y - pt.hy) * mix
      const beat = Math.sin(t0 * pt.beat) * 78 * mix * (0.5 + 0.5 * Math.sin(t0 * 1.7 + pt.ph))
      const head = (Math.atan2(q2.y - q.y, q2.x - q.x) * 180) / Math.PI * 0.35 * mix
      const pop = 1 + 0.18 * Math.sin(clamp(t0 / 0.6) * Math.PI) * (1 - back) + 0.2 * mix
      pt.el.style.opacity = '1'
      pt.el.style.transform = `translate3d(${(r.left + x - pt.ox).toFixed(1)}px, ${(r.top + y - pt.oy).toFixed(1)}px, 0) rotate(${(head).toFixed(1)}deg) rotateY(${beat.toFixed(1)}deg) scale(${pop.toFixed(3)})`
    }
    return true
  })
  return () => { stop(); petals.forEach((pt) => pt.el.remove()) }
}
