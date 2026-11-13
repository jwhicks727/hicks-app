// The wheel (a round painting: her corn and pumpkin mandala). Its own painted things, each traced from the painting (the
// pumpkins, the ears of corn with their husks, the red petals, the leaves, the white plate: src/lib/harvestFind.js
// tracePieces), turn in a kaleidoscope at the top of the page that floats down it, the page following, and open into a ring
// round the frame; the painting steps
// aside, leaving the frame empty, and the pieces slot into their places on it one by one, the plate first. Then the circle
// itself (the round part only, none of the corners) appears beneath them, lifts, turns once slowly and settles, and her
// painting comes back. Every piece is a copy of her pixels; her painting is only hidden for a moment, never changed.
import { tracePieces } from '../../lib/harvestFind.js'
import { leadSeconds, rosette } from '../../lib/leads.js'
import { frameGeometry, stage, boxOf, clamp, ease, shuffle } from './kit.js'
import { camera } from './lead.js'

const FIT = 0.97 // the circle a little inside the edge the finder found, so no corner is taken in
const back = (x) => { const c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) } // a little past, then home

export function playWheel({ layer, p, el, look, lead = true }) {
  const url = p.small || p.src
  const geo = frameGeometry(el, p), { crop } = geo
  const px = look.px480, s = crop.width / px.width
  const R = look.disc.r * FIT * crop.width, fx = crop.left + look.disc.x * crop.width, fy = crop.top + look.disc.y * crop.height
  const traced = tracePieces(px, look.disc)
  if (!traced.length) return () => {}
  const vw = window.innerWidth
  // The circle and the shadow it casts when it lifts, behind the pieces
  const disc = document.createElement('div')
  disc.className = 'hv-chip'
  Object.assign(disc.style, { width: `${2 * R}px`, height: `${2 * R}px`, borderRadius: '50%', backgroundImage: `url(${url})`, backgroundSize: `${crop.width}px ${crop.height}px`, backgroundPosition: `${crop.left - (fx - R)}px ${crop.top - (fy - R)}px`, opacity: '0' })
  const shadow = document.createElement('div')
  shadow.className = 'hv-chip hv-shadow'; shadow.style.width = shadow.style.height = `${2 * R}px`; shadow.style.opacity = '0'
  layer.appendChild(shadow); layer.appendChild(disc)
  // The pieces: the plate first, then the rest in no particular order
  const order = [...traced.filter((t) => t.plate), ...shuffle(traced.filter((t) => !t.plate))]
  const pieces = order.map((t, i) => {
    const pc = t.piece, c = document.createElement('canvas'); c.width = pc.w; c.height = pc.h
    c.getContext('2d').putImageData(new ImageData(pc.rgba, pc.w, pc.h), 0, 0)
    c.className = 'hv-piece'; c.style.width = `${pc.w * s}px`; c.style.height = `${pc.h * s}px`; c.style.opacity = '0'
    layer.appendChild(c)
    const hx = crop.left + (pc.x + pc.w / 2) * s, hy = crop.top + (pc.y + pc.h / 2) * s // its place on the frame
    const dir = Math.atan2(hy - fy, hx - fx) + (t.plate ? -Math.PI / 2 : (Math.random() - 0.5) * 0.6)
    const ring = R * (1.3 + Math.random() * 0.35)
    return { el: c, w: pc.w * s, h: pc.h * s, hx, hy, plate: t.plate, ox: fx + Math.cos(dir) * ring, oy: fy + Math.sin(dir) * ring * (t.plate ? 1.4 : 1), spin: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 120), start: { x: vw * (0.08 + Math.random() * 0.84), y: -40 - Math.random() * 80 }, i }
  })
  const img = el.querySelector('.pf-img')
  const hide = (on) => { if (!img) return; img.style.transition = 'opacity .6s ease'; img.style.opacity = on ? '0' : '1' }
  const r0 = el.getBoundingClientRect()
  const discPage = { x: r0.left + fx, y: r0.top + window.scrollY + fy }
  const LEAD = lead ? leadSeconds('wheel', Math.max(0, discPage.y - window.scrollY), window.innerHeight) : 0
  // Pieces start at the top of the page (page coordinates), in a swirl down to their places round the frame
  const startScroll = window.scrollY
  pieces.forEach((pc) => { pc.sx = pc.start.x; pc.sy = startScroll + pc.start.y })
  const cam = lead ? camera() : null
  const SLOT = LEAD + 0.3, gap = 0.12, slotDur = 1.05
  const slotted = SLOT + gap * pieces.length + slotDur
  const CIRCLE = slotted + 0.2, SPIN0 = CIRCLE + 1.1, SPIN = 7, RESTORE = SPIN0 + SPIN
  const bump = (u) => ease(clamp(u / 1.4)) * (1 - ease(clamp((u - (SPIN - 2.8)) / 2.8)))
  let hidden = false
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > RESTORE + 1.2) { finish(); return false }
    const at = (x, y) => `translate3d(${(r.left + x).toFixed(1)}px, ${(r.top + y).toFixed(1)}px, 0)`
    // 1. Down from the top: each piece's place round the frame, in page coordinates, drawn on the screen as the page follows
    if (t < SLOT) {
      const u = LEAD ? clamp(t / LEAD) : 1
      let sumY = 0
      // A kaleidoscope of her pieces, turning as it floats down the page, opening into a ring round the frame
      const Sc = { x: vw / 2, y: startScroll + window.innerHeight * 0.24 }, Ec = { x: r.left + fx, y: r.top + window.scrollY + fy }
      for (const pc of pieces) {
        const to = { x: r.left + pc.ox, y: r.top + window.scrollY + pc.oy }
        const q = rosette(u, Sc, Ec, { i: pc.i, n: pieces.length, R: Math.min(R, vw * 0.42), to })
        sumY += q.y
        pc.el.style.opacity = Math.min(1, t * 3).toFixed(2)
        pc.el.style.transform = `translate3d(${(q.x - pc.w / 2).toFixed(1)}px, ${(q.y - window.scrollY - pc.h / 2).toFixed(1)}px, 0) rotate(${(q.rot + pc.spin * (1 - u)).toFixed(1)}deg) scale(${q.k.toFixed(3)})`
      }
      if (cam && u < 1) cam.follow(dt, sumY / pieces.length)
      return true
    }
    if (cam) cam.stop()
    // 2. The frame empties, and the pieces slot into their places on it, the plate first
    if (!hidden) { hidden = true; hide(true) }
    if (t < CIRCLE + 0.9) {
      for (const pc of pieces) {
        const f = clamp((t - SLOT - pc.i * gap) / slotDur), e = f <= 0 ? 0 : back(f), k = 1 - e
        const x = pc.hx + (pc.ox - pc.hx) * k, y = pc.hy + (pc.oy - pc.hy) * k
        pc.el.style.opacity = '1'
        pc.el.style.transform = `${at(x - pc.w / 2, y - pc.h / 2)} rotate(${(pc.spin * k).toFixed(1)}deg)`
      }
    }
    // 3. The circle appears beneath them, then takes them: one wheel
    if (t >= CIRCLE) {
      const g = clamp((t - CIRCLE) / 0.9)
      disc.style.opacity = ease(g).toFixed(3)
      if (t < SPIN0) disc.style.transform = `${at(fx - R, fy - R)} scale(${(0.82 + 0.18 * ease(g)).toFixed(4)})`
      if (t >= SPIN0 - 0.15) pieces.forEach((pc) => { pc.el.style.opacity = '0' })
    }
    // 4. The spin: it lifts, turns once slowly and settles where it was
    if (t >= SPIN0) {
      const u = t - SPIN0, b = bump(u), turn = 360 * ease(clamp(u / SPIN))
      disc.style.transform = `${at(fx - R, fy - R - 0.16 * R * b)} rotate(${turn.toFixed(2)}deg) scale(${(1 + 0.1 * b).toFixed(4)})`
      shadow.style.opacity = (0.34 * b).toFixed(3)
      shadow.style.transform = `${at(fx - R + 0.07 * R * b, fy - R + 0.09 * R * b)} scale(${(1 + 0.05 * b).toFixed(4)})`
    }
    // 5. Her painting comes back, and the wheel melts into it
    if (t >= RESTORE) { hide(false); disc.style.opacity = (1 - clamp((t - RESTORE) / 0.9)).toFixed(3) }
    return true
  })
  let finished = false
  function finish() {
    if (finished) return
    finished = true
    if (cam) cam.stop()
    hide(false)
    setTimeout(() => { if (img) { img.style.transition = ''; img.style.opacity = '' } }, 700)
    pieces.forEach((pc) => pc.el.remove()); disc.remove(); shadow.remove()
  }
  return () => { stop(); finish() }
}
