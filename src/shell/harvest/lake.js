// The lake wakes: her leaves land on the water she painted, ripples spread where each lands, and her own reflection
// shimmers in bands (strips of her painting's water, copied and slid sideways, never altered), then settles back still.
import { frameGeometry, spotsIn, makeLeaf, baseSize, stage, boxOf, put, clamp, ease, shuffle } from './kit.js'

const LEAVES = 11

export function playLake({ layer, list, p, el, sheets, look }) {
  const geo = frameGeometry(el, p), { W, H, crop } = geo
  const url = p.small || p.src
  const water0 = Math.max(0, crop.top + look.mirror.y * crop.height + 3), water1 = Math.min(H, crop.top + crop.height)
  const wh = water1 - water0
  if (wh < 40) return () => {}
  // Her water, in bands, kept inside the frame
  const wrap = document.createElement('div')
  wrap.className = 'hv-wrap'; wrap.style.width = `${W}px`; wrap.style.height = `${H}px`
  layer.appendChild(wrap)
  const n = Math.min(24, Math.max(8, Math.floor(wh / 7))), sh = wh / n
  const strips = Array.from({ length: n }, (_, i) => {
    const s = document.createElement('div'), top = water0 + i * sh
    s.className = 'hv-strip'
    s.style.top = `${top.toFixed(1)}px`; s.style.width = `${W}px`; s.style.height = `${(sh + 1).toFixed(1)}px`
    s.style.backgroundImage = `url(${url})`
    s.style.backgroundSize = `${crop.width}px ${crop.height}px`
    s.style.backgroundPosition = `${crop.left}px ${(crop.top - top).toFixed(1)}px`
    wrap.appendChild(s)
    return { s, i, depth: i / n }
  })
  // Ripples, reused
  const rings = Array.from({ length: 30 }, () => { const e = document.createElement('i'); e.className = 'hv-ring'; wrap.appendChild(e); return { e, born: -9, x: 0, y: 0, f: 0 } })
  const ripple = (t, x, y) => { for (let k = 0; k < 3; k++) { const r = rings.find((q) => t - q.born > 2.6 && q.born > -9 ? true : q.born === -9); if (r) { r.born = t + k * 0.24; r.x = x; r.y = y } } }
  // Leaves from her trees, down to the water
  const spots = spotsIn(sheets, list, geo).filter((s) => s.y < water0 - 4 && sheets[s.si].slug === p.slug)
  const pool = shuffle(sheets.flatMap((sh2, si) => sh2.boxes.map((_, bi) => [si, bi])))
  const leaves = Array.from({ length: LEAVES }, (_, i) => {
    const sp = spots[i], [si, bi] = sp ? [sp.si, sp.bi] : pool[i % pool.length]
    const sh2 = sheets[si], lf = makeLeaf(layer, sh2, bi, baseSize(sh2) * (0.8 + Math.random() * 0.25))
    const land = { x: W * (0.12 + Math.random() * 0.76), y: water0 + wh * (0.18 + Math.random() * 0.66) }
    const from = sp ? { x: sp.x, y: sp.y } : { x: W * Math.random(), y: -14 }
    return { ...lf, from, land, go: 0.9 + i * 0.75 + Math.random() * 0.3, dur: 1.8 + Math.random() * 0.8, k0: sp ? Math.min(1, sp.k0w / lf.w) : 0.8, rot0: Math.random() * 360 - 180, ph: Math.random() * 6.3, drift: (Math.random() - 0.5) * 10, landed: false }
  })
  const end = Math.max(...leaves.map((l) => l.go + l.dur)) + 6.5
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > end) { wrap.remove(); leaves.forEach((l) => l.el.remove()); return false }
    wrap.style.transform = `translate3d(${r.left.toFixed(1)}px, ${r.top.toFixed(1)}px, 0)`
    const env = ease(clamp(t / 2)) * (1 - ease(clamp((t - (end - 3)) / 3)))
    for (const q of strips) {
      const a = (1.2 + 6.5 * q.depth) * env
      q.s.style.transform = `translate3d(${(a * (Math.sin(t * 1.9 + q.i * 0.7) + 0.55 * Math.sin(t * 3.1 + q.i * 1.9))).toFixed(2)}px, 0, 0)`
    }
    for (const g of rings) {
      const f = (t - g.born) / 2.4
      if (f < 0 || f > 1) { if (g.f !== 0) { g.e.style.opacity = '0'; g.f = 0 } continue }
      g.f = f
      const sx = 0.5 + 6 * ease(f)
      g.e.style.opacity = (0.75 * (1 - f)).toFixed(3)
      g.e.style.transform = `translate3d(${(g.x - 8).toFixed(1)}px, ${(g.y - 8).toFixed(1)}px, 0) scale(${sx.toFixed(2)}, ${(sx * 0.32).toFixed(2)})`
    }
    for (const l of leaves) {
      const s = t - l.go
      if (s < 0) { l.el.style.opacity = '0'; continue }
      if (s < l.dur) {
        const f = s / l.dur, e = f * f * (3 - 2 * f), cx = (l.from.x + l.land.x) / 2 + Math.sin(l.ph) * 30, cy = Math.min(l.from.y, l.land.y) - 24, u = 1 - e
        put(l, r, { x: u * u * l.from.x + 2 * u * e * cx + e * e * l.land.x, y: u * u * l.from.y + 2 * u * e * cy + e * e * l.land.y, rot: l.rot0 + Math.sin(f * 9 + l.ph) * 40, tilt: Math.sin(f * Math.PI * 3 + l.ph) * 60 * (1 - e) + 68 * e, k: l.k0 + (0.78 - l.k0) * e, op: Math.min(1, s * 6) })
      } else {
        if (!l.landed) { l.landed = true; ripple(t, l.land.x, l.land.y) }
        const w = s - l.dur
        put(l, r, { x: l.land.x + l.drift * w, y: l.land.y + Math.sin(w * 1.3 + l.ph) * 1.2, rot: l.rot0 + w * 6, tilt: 68 + Math.sin(w * 1.6 + l.ph) * 4, k: 0.78, op: 1 - ease(clamp((w - 3.2) / 2.4)) })
      }
    }
    return true
  })
  return () => { stop(); wrap.remove(); leaves.forEach((l) => l.el.remove()) }
}
