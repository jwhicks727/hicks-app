// A sunbeam: a shaft of warm light crosses her painting from one side to the other, lighting dust made of her own
// leaves (tiny pieces cut from the painting's pixels) as it passes and glinting on the leaves she painted. The light is a
// gradient inside the painting's own frame; the dust and the glints sit in the beam and fade as it leaves them.
import { frameGeometry, spotsIn, makeLeaf, baseSize, stage, boxOf, put, clamp, ease } from './kit.js'

const MOTES = 38, SECONDS = 14, TILT = -22 * Math.PI / 180

export function playBeam({ layer, list, p, el, sheets }) {
  const geo = frameGeometry(el, p), { W, H } = geo
  const wrap = document.createElement('div')
  wrap.className = 'hv-wrap'; wrap.style.width = `${W}px`; wrap.style.height = `${H}px`
  layer.appendChild(wrap)
  const L = 1.8 * (W + H)
  const beam = (width, alpha) => {
    const b = document.createElement('div')
    b.className = 'hv-beam'; b.style.width = `${width}px`; b.style.height = `${L}px`
    b.style.background = `linear-gradient(90deg, rgba(255,230,170,0) 0%, rgba(255,232,178,${alpha}) 50%, rgba(255,230,170,0) 100%)`
    b.style.opacity = '0'
    wrap.appendChild(b)
    return { b, width, alpha }
  }
  const beams = [{ ...beam(0.34 * W, 0.46), lag: 0, w: 0.17 * W }, { ...beam(0.15 * W, 0.4), lag: 0.4 * W, w: 0.075 * W }]
  const nx = Math.cos(TILT), ny = Math.sin(TILT)
  const centre = (t, lag) => ({ x: -0.3 * W + 1.6 * W * ease(clamp(t / SECONDS)) - lag, y: H / 2 })
  // How much of the beam a point is in: 0 outside, 1 on its middle
  const inBeam = (x, y, c, w) => { const d = (x - c.x) * nx + (y - c.y) * ny; return Math.exp(-((d / w) ** 2)) }
  const pool = sheets.flatMap((sh, si) => sh.boxes.map((_, bi) => [si, bi]))
  const motes = Array.from({ length: MOTES }, () => {
    const [si, bi] = pool[Math.floor(Math.random() * pool.length)], sh = sheets[si]
    const lf = makeLeaf(layer, sh, bi, baseSize(sh) * (0.16 + Math.random() * 0.16))
    return { ...lf, x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 9, vy: -3 + Math.random() * 9, ph: Math.random() * 6.3, tw: 2.5 + Math.random() * 3, rot: Math.random() * 360 }
  })
  // Glints on the leaves she painted, where the beam reaches them
  const glints = spotsIn(sheets, list, geo).filter((s) => sheets[s.si].slug === p.slug).slice(0, 22).map((s) => {
    const g = document.createElement('i')
    g.className = 'hv-glint'; const d = 26 + Math.random() * 14
    g.style.width = g.style.height = `${d}px`; g.style.opacity = '0'
    wrap.appendChild(g)
    return { g, x: s.x, y: s.y, d, ph: Math.random() * 6.3 }
  })
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > SECONDS + 0.5) { wrap.remove(); motes.forEach((m) => m.el.remove()); return false }
    wrap.style.transform = `translate3d(${r.left.toFixed(1)}px, ${r.top.toFixed(1)}px, 0)`
    const env = ease(clamp(t / 1.4)) * (1 - ease(clamp((t - (SECONDS - 2)) / 2)))
    const cs = beams.map((b) => centre(t, b.lag))
    beams.forEach((b, i) => {
      b.b.style.opacity = (env * (i ? 0.8 : 1)).toFixed(3)
      b.b.style.transform = `translate3d(${(cs[i].x - b.width / 2).toFixed(1)}px, ${(cs[i].y - L / 2).toFixed(1)}px, 0) rotate(${(TILT * 180 / Math.PI).toFixed(1)}deg)`
    })
    for (const m of motes) {
      m.x += (m.vx + Math.sin(t * 0.9 + m.ph) * 5) * dt; m.y += (m.vy + Math.cos(t * 0.7 + m.ph) * 4) * dt
      if (m.x < -10) m.x = W + 10; if (m.x > W + 10) m.x = -10; if (m.y < -10) m.y = H + 10; if (m.y > H + 10) m.y = -10
      const lit = clamp(inBeam(m.x, m.y, cs[0], beams[0].w) + 0.7 * inBeam(m.x, m.y, cs[1], beams[1].w))
      put(m, r, { x: m.x, y: m.y, rot: m.rot + t * 20, tilt: Math.sin(t * m.tw + m.ph) * 60, k: 0.9 + 0.3 * lit, op: clamp(lit * (0.5 + 0.5 * Math.sin(t * m.tw * 1.7 + m.ph)) * 1.1) * env })
    }
    for (const g of glints) {
      const lit = clamp(inBeam(g.x, g.y, cs[0], beams[0].w * 0.8) + 0.6 * inBeam(g.x, g.y, cs[1], beams[1].w))
      g.g.style.opacity = (0.9 * lit * env * (0.7 + 0.3 * Math.sin(t * 9 + g.ph))).toFixed(3)
      g.g.style.transform = `translate3d(${(g.x - g.d / 2).toFixed(1)}px, ${(g.y - g.d / 2).toFixed(1)}px, 0) scale(${(0.8 + 0.5 * lit).toFixed(3)})`
    }
    return true
  })
  return () => { stop(); wrap.remove(); motes.forEach((m) => m.el.remove()) }
}
