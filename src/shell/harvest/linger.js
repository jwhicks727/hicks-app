// The last part of every season's show, the witch's shape (src/lib/leads.js): something subtle that stays with you on
// every screen, all day, made of pieces of the painting on Home, as her leaves resting along the top edge did. Each show
// has its own: a small copy of the wheel turning in a corner, a garland along the top edge, gold leaves letting go one at
// a time, a leaf floating by on the water, an ember rising, a ripple, a pumpkin rolling past, a petal fluttering down, a
// soft sweep of light, a leaf spiralling down. Copies of her pixels; transforms and opacity only; never a tap taken; it
// waits while the app is in the background and has a most-per-sitting (LINGER), and SeasonShow never runs it under less
// motion or on a quiet screen.
import { lingerGap, LINGER } from '../../lib/leads.js'
import { leafPerches, dropOf, dropGap, MAX_DROPS } from '../../lib/seasonShows.js'
import { makeLeaf, baseSize, clamp, ease } from './kit.js'
import { dab, shadowLeaf } from './lead.js'

const canvasOf = (layer, pc, s) => {
  const c = document.createElement('canvas'); c.width = pc.w; c.height = pc.h
  c.getContext('2d').putImageData(new ImageData(pc.rgba, pc.w, pc.h), 0, 0)
  c.className = 'hv-piece'; c.style.width = `${pc.w * s}px`; c.style.height = `${pc.h * s}px`; c.style.opacity = '0'
  layer.appendChild(c)
  return { el: c, w: pc.w * s, h: pc.h * s }
}
const put = (n, x, y, q = {}) => {
  n.el.style.opacity = (q.op == null ? 1 : q.op).toFixed(3)
  n.el.style.transform = `translate3d(${(x - n.w / 2).toFixed(1)}px, ${(y - n.h / 2).toFixed(1)}px, 0) rotate(${(q.rot || 0).toFixed(1)}deg) rotateX(${(q.tilt || 0).toFixed(1)}deg) rotateY(${(q.yaw || 0).toFixed(1)}deg) scale(${(q.k == null ? 1 : q.k).toFixed(3)})`
}

/** Run a show's subtle part on every screen; returns its stop. `parts` holds what was cut from the painting. */
export function runLinger(style, { layer, p, look, parts }) {
  const sheets = parts.sheets || [], own = sheets[0]
  const vw = () => window.innerWidth, vh = () => window.innerHeight
  const timers = new Set(), live = []
  let raf = 0, last = 0, t = 0, count = 0, dead = false
  const later = (fn, s) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn() }, s * 1000); timers.add(id) }
  const loop = (stamp) => {
    raf = 0
    if (dead) return
    const dt = last ? Math.min(0.05, (stamp - last) / 1000) : 0
    last = stamp; t += dt
    for (let i = live.length - 1; i >= 0; i--) {
      const it = live[i], age = t - it.born
      if (age > it.life) { it.nodes.forEach((n) => n.el.remove()); live.splice(i, 1); continue }
      it.step(age, dt)
    }
    if (live.length) raf = requestAnimationFrame(loop)
    else last = 0
  }
  const add = (it) => { it.born = t; live.push(it); if (!raf) raf = requestAnimationFrame(loop) }
  // A traveller every so often, while the app is in front, up to the most for a sitting
  const every = (spawn, first = 6) => {
    const tick = () => {
      if (count >= (LINGER[style] || {}).max) return
      if (document.visibilityState === 'visible') { spawn(); count++ }
      later(tick, lingerGap(style))
    }
    later(tick, first)
  }
  const keep = [] // pieces that stay (the corner wheel, the garland, the perches, the hearth)
  const unhook = []

  if (style === 'wheel' && look.disc) {
    // A small copy of the wheel, mostly out of sight in the top corner, turning very slowly, and rolling as the page scrolls
    const D = 88, ring = document.createElement('div'), d = document.createElement('div'), bgW = D / (2 * look.disc.r * 0.97), bgH = bgW * (p.h / p.w)
    ring.className = 'hv-corner'; d.className = 'hv-corner-disc'
    Object.assign(ring.style, { width: `${D}px`, height: `${D}px` })
    Object.assign(d.style, { width: `${D}px`, height: `${D}px`, backgroundImage: `url(${p.small || p.src})`, backgroundSize: `${bgW}px ${bgH}px`, backgroundPosition: `${D / 2 - look.disc.x * bgW}px ${D / 2 - look.disc.y * bgH}px` })
    ring.appendChild(d); layer.appendChild(ring); keep.push(ring)
    const roll = () => { d.style.transform = `rotate(${(window.scrollY * 0.45).toFixed(1)}deg)` }
    roll(); window.addEventListener('scroll', roll, { passive: true })
    unhook.push(() => window.removeEventListener('scroll', roll))
  } else if (style === 'garland' && own) {
    // A garland of her leaves strung along the top edge, each swaying a little; now and then one lets go and grows back
    const n = 11, leaves = []
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, lf = makeLeaf(layer, own, (i * 3) % own.boxes.length, baseSize(own) * 0.6)
      const wrap = document.createElement('span'); wrap.className = 'hv-swag'
      wrap.style.left = `${(u * 100).toFixed(2)}vw`; wrap.style.top = `${(2 + 14 * Math.sin(Math.PI * u)).toFixed(1)}px`
      wrap.style.setProperty('--tilt', `${Math.round((u - 0.5) * 50 + (i % 2 ? 20 : -20))}deg`); wrap.style.animationDelay = `${(-i * 0.7).toFixed(1)}s`; wrap.style.animationDuration = `${(4.5 + (i % 4) * 0.6).toFixed(1)}s`
      lf.el.style.opacity = '1'; lf.el.style.transform = `translate(-50%, -50%)`
      layer.removeChild(lf.el); wrap.appendChild(lf.el); layer.appendChild(wrap); keep.push(wrap); leaves.push({ wrap, lf, u })
    }
    every(() => {
      const g = leaves[Math.floor(Math.random() * leaves.length)], x0 = g.u * vw(), y0 = 2 + 14 * Math.sin(Math.PI * g.u), drift = (Math.random() - 0.5) * 60
      g.wrap.style.opacity = '0'
      const node = makeLeaf(layer, own, Math.floor(Math.random() * own.boxes.length), baseSize(own) * 0.6)
      add({ nodes: [node], life: 11, step: (a) => { const f = a / 10; put(node, x0 + drift * f + Math.sin(a * 2.2) * 18, y0 + (vh() + 40) * ease(f), { rot: Math.sin(a * 1.6) * 40, tilt: 50 * Math.sin(a * 3), op: 1 - clamp((f - 0.9) / 0.1) }); if (a > 6) g.wrap.style.opacity = String(Math.min(1, (a - 6) / 2)) } })
    }, 30)
  } else if (style === 'golden' && own) {
    // Her golden leaves resting along the top edge, letting go one at a time: the witch's own way, with this painting's leaves
    const show = { sheets: [own] }, perches = leafPerches(show, Number(String(new Date().getDate())) + 3)
    const els = perches.map((pc) => {
      const sp = document.createElement('span'); sp.className = 'ss-perch'
      const k = pc.scale / own.px, box = pc.leaf
      sp.style.left = `${pc.x}vw`; sp.style.setProperty('--tilt', `${pc.tilt}deg`); sp.style.setProperty('--h', `${box[3] * k}px`)
      const i = document.createElement('i'); Object.assign(i.style, { width: `${box[2] * k}px`, height: `${box[3] * k}px`, backgroundImage: `url(${own.sheet})`, backgroundSize: `${own.size[0] * k}px ${own.size[1] * k}px`, backgroundPosition: `${-box[0] * k}px ${-box[1] * k}px` })
      sp.appendChild(i); layer.appendChild(sp); keep.push(sp)
      return sp
    })
    let dropped = 0
    const drop = () => {
      if (dropped >= MAX_DROPS) return
      if (document.visibilityState === 'visible') {
        const j = Math.floor(Math.random() * perches.length), f = dropOf(show, perches[j]), k = f.scale / own.px, box = f.leaf
        const d = document.createElement('span'); d.className = 'ss-drop'
        d.style.setProperty('--x0', `${f.x}vw`); d.style.setProperty('--x1', `${f.x + f.drift}vw`); d.style.setProperty('--dur', `${f.dur}s`); d.style.setProperty('--h', `${box[3] * k}px`)
        const sw = document.createElement('span'); sw.className = 'ss-sway'; sw.style.setProperty('--sway', `${f.sway}px`); sw.style.setProperty('--swaydur', `${f.swayDur}s`)
        const i = document.createElement('i'); Object.assign(i.style, { width: `${box[2] * k}px`, height: `${box[3] * k}px`, backgroundImage: `url(${own.sheet})`, backgroundSize: `${own.size[0] * k}px ${own.size[1] * k}px`, backgroundPosition: `${-box[0] * k}px ${-box[1] * k}px` })
        i.style.setProperty('--tilt', `${f.tilt}deg`); i.style.setProperty('--spin', `${f.spin}deg`); i.style.setProperty('--dur', `${f.dur}s`)
        sw.appendChild(i); d.appendChild(sw); layer.appendChild(d)
        els[j].style.opacity = '0'
        later(() => { els[j].style.opacity = '1'; els[j].classList.add('arrives') }, f.dur * 0.55)
        later(() => d.remove(), f.dur + 1)
        dropped++
      }
      later(drop, dropGap(show))
    }
    later(drop, 4)
  } else if (style === 'stream' && own) {
    // Now and then a leaf floats past along the bottom of the screen, as if on the water
    every(() => {
      const node = makeLeaf(layer, own, Math.floor(Math.random() * own.boxes.length), baseSize(own) * 0.8), dir = Math.random() < 0.5 ? 1 : -1, y = vh() - 128 - Math.random() * 30
      add({ nodes: [node], life: 17, step: (a) => { const f = a / 17, x = dir > 0 ? -40 + (vw() + 80) * f : vw() + 40 - (vw() + 80) * f; put(node, x, y + Math.sin(a * 1.4) * 3, { rot: a * 8 * dir, tilt: 62, op: Math.min(1, a, (17 - a)) }) } })
    })
  } else if (style === 'embers' && look.fire && look.bmp) {
    // A hearth: a glow of her fire's own colour breathes along the bottom of the screen, and now and then an ember rises
    const [r, g, b] = look.fire.colour, hearth = document.createElement('div')
    hearth.className = 'hv-hearth'
    hearth.style.background = `radial-gradient(ellipse at 50% 100%, rgba(${r},${g},${b},.2) 0, rgba(${r},${g},${b},.07) 45%, rgba(${r},${g},${b},0) 72%)`
    layer.appendChild(hearth); keep.push(hearth)
    every(() => {
      const fire = look.fire, node = dab(layer, look.bmp, fire.x + (Math.random() - 0.5) * fire.r * 0.6, fire.y, Math.max(6, fire.r * look.bmp.width * 0.3), 7 + Math.random() * 7)
      const x0 = vw() * (0.1 + Math.random() * 0.8), life = 4 + Math.random() * 3, vy = 40 + Math.random() * 40, ph = Math.random() * 6.3
      add({ nodes: [node], life, step: (a) => { const f = a / life; put(node, x0 + Math.sin(a * 1.8 + ph) * (8 + a * 5), vh() + 10 - vy * a, { op: Math.pow(Math.sin(f * Math.PI), 0.7) * (0.55 + 0.45 * Math.sin(a * 14 + ph)), k: 1.1 - 0.5 * f }) } })
    }, 3)
  } else if (style === 'lake') {
    // A faint ripple spreads somewhere on the screen, as if a leaf had touched water there
    every(() => {
      const x = vw() * (0.1 + Math.random() * 0.8), y = vh() * (0.2 + Math.random() * 0.6)
      const rings = [0, 0.25, 0.5].map(() => { const e = document.createElement('i'); e.className = 'hv-ring hv-ring-page'; e.style.opacity = '0'; layer.appendChild(e); return { el: e, w: 16, h: 16 } })
      add({ nodes: rings, life: 3.2, step: (a) => rings.forEach((r, k) => { const f = clamp((a - k * 0.25) / 2.6), sx = 0.5 + 4 * ease(f); r.el.style.opacity = f > 0 && f < 1 ? (0.45 * (1 - f)).toFixed(3) : '0'; r.el.style.transform = `translate3d(${(x - 8).toFixed(1)}px, ${(y - 8).toFixed(1)}px, 0) scale(${sx.toFixed(2)}, ${(sx * 0.34).toFixed(2)})` }) })
    }, 5)
  } else if (style === 'tumble' && parts.fruit && parts.fruit.length) {
    // Peekaboo: one of her pumpkins peeks in from the side of the screen, has a little wiggle, and ducks away again
    every(() => {
      const f = parts.fruit[Math.floor(Math.random() * parts.fruit.length)], node = canvasOf(layer, f.piece, 0.75), side = Math.random() < 0.5 ? -1 : 1
      const y = vh() * (0.3 + Math.random() * 0.4), hidden = side < 0 ? -node.w / 2 : vw() + node.w / 2, peek = side < 0 ? node.w * 0.12 : vw() - node.w * 0.12
      add({ nodes: [node], life: 5, step: (a) => { const inn = ease(clamp(a / 0.7)) * (1 - ease(clamp((a - 4.1) / 0.7))), x = hidden + (peek - hidden) * inn, wig = a > 0.9 && a < 3.6 ? Math.sin((a - 0.9) * 9) * 12 * Math.sin(((a - 0.9) / 2.7) * Math.PI) : 0; put(node, x, y, { rot: side * -18 * inn + wig }) } })
    }, 10)
  } else if (style === 'petals' && look.bloom) {
    // A butterfly (one of her petals) flies in, lands on the top edge of a card on the screen, rests a while with its wings
    // slowly opening and closing, then flies off
    every(() => {
      const pc = look.bloom.pieces[Math.floor(Math.random() * look.bloom.pieces.length)], node = canvasOf(layer, pc, 0.55)
      const cards = [...document.querySelectorAll('main .card')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 120 && r.top > vh() * 0.12 && r.top < vh() * 0.8)
      const c = cards[Math.floor(Math.random() * cards.length)]
      const rest = c ? { x: c.left + 30 + Math.random() * (c.width - 60), y: c.top - node.h * 0.3 } : { x: vw() * 0.5, y: vh() * 0.4 }
      const from = { x: Math.random() < 0.5 ? -30 : vw() + 30, y: vh() * 0.15 }, to = { x: from.x < 0 ? vw() + 30 : -30, y: -30 }, ph = Math.random() * 6.3
      add({ nodes: [node], life: 10, step: (a) => {
        const fin = clamp(a / 2.5), fout = clamp((a - 6.5) / 3), sitting = a >= 2.5 && a < 6.5
        const q = a < 2.5 ? { x: from.x + (rest.x - from.x) * ease(fin) + Math.sin(a * 5 + ph) * 16 * (1 - fin), y: from.y + (rest.y - from.y) * ease(fin) - Math.sin(fin * Math.PI) * 40 } : sitting ? rest : { x: rest.x + (to.x - rest.x) * ease(fout) + Math.sin(a * 5 + ph) * 16, y: rest.y + (to.y - rest.y) * ease(fout) }
        put(node, q.x, q.y, { yaw: sitting ? 25 + 30 * Math.sin(a * 2.4) : 70 * Math.sin(a * 16), op: Math.min(1, a * 2, (10 - a) * 2) })
      } })
    }, 8)
  } else if (style === 'beam') {
    // Dappled light drifts across the screen now and then: soft patches of sun with the shadows of her leaves in them
    every(() => {
      const spots = [0, 1, 2].map((i) => { const e = document.createElement('i'), d = 120 + i * 30; e.className = 'hv-glow'; e.style.width = `${d}px`; e.style.height = `${d * 0.7}px`; e.style.background = 'radial-gradient(ellipse, rgba(255,238,190,.32) 0, rgba(255,232,178,.1) 45%, rgba(255,232,178,0) 70%)'; layer.appendChild(e); return { el: e, w: d, h: d * 0.7, ph: i * 2 } })
      const shades = own ? [0, 1, 2].map((i) => ({ ...shadowLeaf(layer, own, i * 3, baseSize(own) * 1.5), ph: i * 1.7 })) : []
      const y0 = vh() * (0.25 + Math.random() * 0.5), dir = Math.random() < 0.5 ? 1 : -1
      add({ nodes: [...spots, ...shades], life: 14, step: (a) => { const f = a / 14, env = Math.sin(f * Math.PI), cx = dir > 0 ? -120 + (vw() + 240) * f : vw() + 120 - (vw() + 240) * f; spots.forEach((s2) => put(s2, cx + Math.cos(a * 0.6 + s2.ph) * 60, y0 + Math.sin(a * 0.7 + s2.ph) * 40, { op: env })); shades.forEach((s2, i) => put(s2, cx + Math.cos(a * 0.4 + s2.ph) * 70 + (i - 1) * 20, y0 + Math.sin(a * 0.5 + s2.ph) * 46, { rot: a * 20 + i * 60, op: env * 0.9 })) } })
    }, 12)
  } else if (style === 'whirl' && own) {
    // A tiny whirl of her leaves spins up near a bottom corner, rises a little, and fizzles out
    every(() => {
      const n = 5, leaves = Array.from({ length: n }, (_, i) => makeLeaf(layer, own, (i * 3 + Math.floor(Math.random() * 9)) % own.boxes.length, baseSize(own) * 0.55))
      const x0 = Math.random() < 0.5 ? vw() * 0.14 : vw() * 0.86, y0 = vh() - 140
      add({ nodes: leaves, life: 5, step: (a) => { const f = a / 5, env = Math.sin(f * Math.PI); leaves.forEach((nd, i) => { const ang = (i / n) * 6.283 + a * 7, r = 10 + 22 * env; put(nd, x0 + Math.cos(ang) * r, y0 - 90 * ease(f) + Math.sin(ang) * r * 0.38 - i * 6, { rot: ang * 57.3, tilt: 50 * Math.sin(ang), op: env }) }) } })
    }, 9)
  }
  return () => { dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); unhook.forEach((f) => f()); live.forEach((it) => it.nodes.forEach((n) => n.el.remove())); keep.forEach((n) => n.remove()) }
}
