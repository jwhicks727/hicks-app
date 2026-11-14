// Embers: sparks cut from the fire she painted (a soft round piece of her own flame, taken from the painting's pixels)
// rise from it, flicker and drift up the page; a faint glow of the fire's own colour breathes round it. The painting stays whole.
import { frameGeometry, stage, boxOf, clamp } from './kit.js'

const POOL = 44, SECONDS = 18

/** One ember sprite: a piece of her fire, round and soft-edged, as a small canvas. */
function sprite(bmp, fire, d) {
  const c = document.createElement('canvas'), S = 28
  c.width = S; c.height = S
  const g = c.getContext('2d')
  const sz = Math.max(6, fire.r * bmp.width * 0.3)
  const sx = (fire.x + (Math.random() - 0.5) * fire.r * 0.7) * bmp.width - sz / 2, sy = (fire.y + (Math.random() - 0.3) * fire.r * 0.5) * bmp.height - sz / 2
  g.drawImage(bmp, sx, sy, sz, sz, 0, 0, S, S)
  g.globalCompositeOperation = 'destination-in'
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.55, 'rgba(0,0,0,.9)'); grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad; g.fillRect(0, 0, S, S)
  c.className = 'hv-piece'; c.style.width = c.style.height = `${d}px`; c.style.opacity = '0'
  return c
}

export function playEmbers({ layer, p, el, look }) {
  const { bmp, fire } = look
  const geo = frameGeometry(el, p), { crop } = geo
  const fx = crop.left + fire.x * crop.width, fy = crop.top + fire.y * crop.height, rf = Math.max(14, fire.r * crop.width)
  const glow = document.createElement('i')
  glow.className = 'hv-glow'
  const [cr, cg, cb] = fire.colour
  glow.style.width = glow.style.height = `${rf * 7}px`
  glow.style.background = `radial-gradient(circle, rgba(${cr},${cg},${cb},.7) 0, rgba(${cr},${cg},${cb},.28) 36%, rgba(${cr},${cg},${cb},0) 70%)`
  glow.style.opacity = '0'
  layer.appendChild(glow)
  const embers = Array.from({ length: POOL }, (_, i) => {
    const d = 7 + Math.random() * 12
    return { el: sprite(bmp, fire, d), d, born: -1, life: 3.2 + Math.random() * 3, x: 0, y: 0, vx: 0, vy: 0, ph: Math.random() * 6.3, i }
  })
  embers.forEach((e) => layer.appendChild(e.el))
  let next = 1.2
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > SECONDS + 7) { glow.remove(); embers.forEach((e) => e.el.remove()); return false }
    // Glow: in over a second and a half, flickering, out at the end
    const flick = 0.7 + 0.3 * Math.sin(t * 9.3) * Math.sin(t * 5.1 + 1) + 0.1 * Math.sin(t * 23)
    glow.style.opacity = (clamp(t / 1.5) * (1 - clamp((t - SECONDS) / 4)) * 0.85 * flick).toFixed(3)
    glow.style.transform = `translate3d(${(r.left + fx - rf * 3.5).toFixed(1)}px, ${(r.top + fy - rf * 3.9).toFixed(1)}px, 0) scale(${(0.94 + 0.08 * Math.sin(t * 3.1)).toFixed(3)})`
    // Let one go every so often while the fire burns
    if (t < SECONDS && t >= next) {
      const e = embers.find((x) => x.born < 0 || t - x.born > x.life)
      if (e) { e.born = t; e.life = 3.2 + Math.random() * 3; e.x = fx + (Math.random() - 0.5) * rf * 1.3; e.y = fy - rf * 0.3; e.vx = (Math.random() - 0.35) * 14; e.vy = -(26 + Math.random() * 48) }
      next = t + 0.07 + Math.random() * 0.16
    }
    for (const e of embers) {
      if (e.born < 0) continue
      const age = t - e.born
      if (age > e.life) { e.el.style.opacity = '0'; continue }
      const f = age / e.life
      e.x += (e.vx + Math.sin(age * 1.9 + e.ph) * (10 + age * 6)) * dt
      e.y += e.vy * dt * (1 - f * 0.4)
      const op = Math.pow(Math.sin(f * Math.PI), 0.7) * (0.6 + 0.4 * Math.sin(age * 15 + e.ph))
      e.el.style.opacity = clamp(op).toFixed(3)
      e.el.style.transform = `translate3d(${(r.left + e.x - e.d / 2).toFixed(1)}px, ${(r.top + e.y - e.d / 2).toFixed(1)}px, 0) scale(${(1.15 - 0.6 * f).toFixed(3)})`
    }
    return true
  })
  return () => { stop(); glow.remove(); embers.forEach((e) => e.el.remove()) }
}
