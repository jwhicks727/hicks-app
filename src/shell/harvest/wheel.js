// The wheel: pieces of her round painting (cut by ring and wedge from the painting's own pixels) fly in from every side
// and slot into place; the wheel itself, only the round part and none of the corners, lifts off, spins slowly as it
// floats, and settles back into its place still turning, coming to rest exactly where it was. A copy of her pixels over a
// painting that stays whole.
import { frameGeometry, stage, boxOf, clamp, ease, shuffle } from './kit.js'

const WEDGES = 8, FIT = 0.965 // the wheel a little inside the edge the finder found, so no corner is taken in

/** A polygon (clip-path) for the ring segment between radii a and b and angles t0 to t1, in px, centre at (R, R). */
function segment(R, a, b, t0, t1) {
  const pt = (r, t) => `${(R + r * Math.cos(t)).toFixed(1)}px ${(R + r * Math.sin(t)).toFixed(1)}px`
  const n = 8, pts = []
  for (let i = 0; i <= n; i++) pts.push(pt(b, t0 + ((t1 - t0) * i) / n))
  for (let i = n; i >= 0; i--) pts.push(pt(a, t0 + ((t1 - t0) * i) / n))
  return `polygon(${pts.join(',')})`
}

export function playWheel({ layer, p, el, look }) {
  const url = p.small || p.src
  const geo = frameGeometry(el, p), { crop } = geo
  const R = look.disc.r * FIT * crop.width
  const fx = crop.left + look.disc.x * crop.width, fy = crop.top + look.disc.y * crop.height
  const base = (node) => {
    node.className = 'hv-chip'
    node.style.width = node.style.height = `${2 * R}px`
    node.style.backgroundImage = `url(${url})`
    node.style.backgroundSize = `${crop.width}px ${crop.height}px`
    node.style.backgroundPosition = `${crop.left - (fx - R)}px ${crop.top - (fy - R)}px`
    node.style.opacity = '0'
    layer.appendChild(node)
    return node
  }
  // The pieces: a middle circle, then two rings of eight wedges
  const defs = [{ clip: `circle(${(0.26 * R).toFixed(1)}px at ${R}px ${R}px)`, dir: -Math.PI / 2, near: 0.3 }]
  for (const [a, b, near] of [[0.26, 0.62, 0.6], [0.62, 1.01, 1]]) {
    for (let k = 0; k < WEDGES; k++) {
      const t0 = ((k - 0.5) * 2 * Math.PI) / WEDGES, t1 = ((k + 0.5) * 2 * Math.PI) / WEDGES
      defs.push({ clip: segment(R, a * R, b * R, t0, t1), dir: (t0 + t1) / 2 + (near < 1 ? Math.PI * 0.25 : 0), near })
    }
  }
  const order = shuffle(defs.map((_, i) => i))
  const chips = defs.map((d, i) => {
    const node = base(document.createElement('div'))
    node.style.clipPath = d.clip
    const start = 0.2 + order.indexOf(i) * 0.2 + Math.random() * 0.08, dur = 1.1 + Math.random() * 0.5
    const far = R * 1.5 + 80 + Math.random() * 140
    return { node, start, dur, dx: Math.cos(d.dir + (Math.random() - 0.5) * 0.5) * far, dy: Math.sin(d.dir + (Math.random() - 0.5) * 0.5) * far, spin: (Math.random() < 0.5 ? -1 : 1) * (28 + Math.random() * 50) }
  })
  const landed = Math.max(...chips.map((c) => c.start + c.dur)), lock = landed + 0.4
  // The wheel and the shadow it casts when it lifts
  const wheel = base(document.createElement('div')); wheel.style.borderRadius = '50%'
  const shadow = document.createElement('div')
  shadow.className = 'hv-chip hv-shadow'; shadow.style.width = shadow.style.height = `${2 * R}px`; shadow.style.opacity = '0'
  layer.insertBefore(shadow, layer.firstChild)
  const ring = document.createElement('div')
  ring.className = 'hv-chip hv-ring-pulse'; ring.style.width = ring.style.height = `${2 * R}px`; ring.style.opacity = '0'
  layer.appendChild(ring)
  const SPIN = 8.6, end = lock + 0.3 + SPIN + 0.6
  const bump = (s) => ease(clamp(s / 1.5)) * (1 - ease(clamp((s - (SPIN - 3.2)) / 3.2))) // up in 1.5 s, held, down over the last 3.2 s
  const stop = stage((dt, t) => {
    const r = boxOf(el)
    if (!r || t > end) { chips.forEach((c) => c.node.remove()); wheel.remove(); shadow.remove(); ring.remove(); return false }
    const at = (x, y) => `translate3d(${(r.left + fx - R + x).toFixed(1)}px, ${(r.top + fy - R + y).toFixed(1)}px, 0)`
    if (t < lock + 0.25) {
      for (const c of chips) {
        const f = clamp((t - c.start) / c.dur), e = 1 - Math.pow(1 - f, 3), over = f < 1 ? 0 : 0 // slotting in, easing out
        const k = f < 1 ? 1 - e : 0, pop = f >= 1 ? 1 + 0.03 * Math.sin(clamp((t - lock) / 0.4) * Math.PI) : 1
        c.node.style.opacity = t < c.start ? '0' : clamp((t - c.start) * 5).toFixed(2)
        c.node.style.transform = `${at(c.dx * k, c.dy * k)} rotate(${(c.spin * k).toFixed(1)}deg) scale(${(pop + over).toFixed(3)})`
      }
    }
    // The grab: a ring of light round the wheel, and the wheel takes its pieces
    if (t >= lock) {
      const g = clamp((t - lock) / 0.7)
      ring.style.opacity = (0.7 * (1 - g)).toFixed(3)
      ring.style.transform = `${at(0, 0)} scale(${(1 + 0.16 * g).toFixed(3)})`
      wheel.style.opacity = '1'
      if (t > lock + 0.25) chips.forEach((c) => { c.node.style.opacity = '0' })
      const s = Math.max(0, t - lock - 0.25), b = bump(s), turn = 360 * ease(clamp(s / SPIN))
      wheel.style.transform = `${at(0, -0.2 * R * b)} rotate(${turn.toFixed(2)}deg) scale(${(1 + 0.14 * b).toFixed(4)})`
      shadow.style.opacity = (0.38 * b).toFixed(3)
      shadow.style.transform = `${at(0.08 * R * b, 0.1 * R * b)} scale(${(1 + 0.06 * b).toFixed(4)})`
    }
    return true
  })
  return () => { stop(); chips.forEach((c) => c.node.remove()); wheel.remove(); shadow.remove(); ring.remove() }
}
