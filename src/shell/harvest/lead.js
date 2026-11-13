// The first part of every season's show, the witch's shape (src/lib/leads.js): from the top of the page, pieces of the
// painting carry you down to it, the page following as her crow's does (a scroll, a touch or a key ends the following),
// and land where the painting's own show begins. Every piece is a copy of her pixels; transforms and opacity only.
import { cropFor } from '../../lib/paintings.js'
import { along } from '../../lib/waterway.js'
import { leadSeconds, cameraTo, rocking, samara, skipping, skipTouches, bouncePath, bouncing, flutter, comet, gust, beamDown, devil, ribbon } from '../../lib/leads.js'
import { makeLeaf, baseSize, clamp, ease } from './kit.js'

/** The page following a piece down: never above where it started, and let go as soon as someone scrolls, touches or types. */
export function camera() {
  let taken = false, cur = window.scrollY
  const start = cur, take = () => { taken = true }
  const EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown']
  EVENTS.forEach((ev) => window.addEventListener(ev, take, { passive: true }))
  return {
    follow(dt, pageY) {
      if (taken) return
      const vh = window.innerHeight, max = document.documentElement.scrollHeight - vh
      const want = Math.max(start, cameraTo(pageY, vh, max))
      cur += (want - cur) * Math.min(1, dt * 2.6)
      if (Math.abs(window.scrollY - cur) > 0.5) window.scrollTo({ top: Math.round(cur), left: 0, behavior: 'instant' })
    },
    stop() { EVENTS.forEach((ev) => window.removeEventListener(ev, take)) },
  }
}

/** A point in her painting (fractions of it) on the page, through the frame's crop. */
export function pagePoint(el, p, fx, fy) {
  const r = el.getBoundingClientRect(), c = cropFor(p, el.clientWidth, el.clientHeight, p.focus)
  return { x: r.left + c.left + fx * c.width, y: r.top + window.scrollY + c.top + fy * c.height }
}
const frameAt = (el, fx, fy) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width * fx, y: r.top + window.scrollY + r.height * fy } }

/** Where each lead lands: the place in the painting its show starts from. */
function landing(style, el, p, look, parts) {
  if (style === 'stream' && look.way) { const q = along(look.way, 0); return pagePoint(el, p, q.x, q.y) }
  if (style === 'embers' && look.fire) return pagePoint(el, p, look.fire.x, look.fire.y)
  if (style === 'lake' && look.mirror) return pagePoint(el, p, 0.5, look.mirror.y + (1 - look.mirror.y) * 0.4)
  if (style === 'petals' && look.bloom) return pagePoint(el, p, look.bloom.cx, look.bloom.cy)
  if (style === 'tumble' && parts.fruit && parts.fruit[0]) return pagePoint(el, p, parts.fruit[0].cx, parts.fruit[0].cy)
  if (style === 'garland') return frameAt(el, 0.5, 0.2)
  return frameAt(el, 0.5, 0.45)
}
/** Where each lead starts: at the top of the screen, from the side it suits. */
function start(style, side) {
  const vw = window.innerWidth, y = window.scrollY + window.innerHeight * 0.06
  const x = { stream: 0.5, golden: 0.62, lake: 0.18, tumble: 0.16, petals: 0.82, embers: 0.9, beam: 0.5, whirl: 0.3, garland: 0.5 }[style]
  if (style === 'wind') return { x: side > 0 ? -40 : vw + 40, y }
  if (style === 'embers') return { x: vw * 0.9, y: window.scrollY - 20 }
  return { x: vw * (x == null ? 0.5 : x), y }
}

/** A piece at a page point: translate to the screen, then turn; transforms only. */
function place(node, w, h, x, y, q = {}) {
  node.style.transform = `translate3d(${(x - w / 2).toFixed(1)}px, ${(y - window.scrollY - h / 2).toFixed(1)}px, 0) rotate(${(q.rot || 0).toFixed(1)}deg) rotateX(${(q.tilt || 0).toFixed(1)}deg) rotateY(${(q.yaw || 0).toFixed(1)}deg) scale(${(q.k == null ? 1 : q.k).toFixed(3)})`
}
const canvasOf = (layer, pc, s) => {
  const c = document.createElement('canvas'); c.width = pc.w; c.height = pc.h
  c.getContext('2d').putImageData(new ImageData(pc.rgba, pc.w, pc.h), 0, 0)
  c.className = 'hv-piece'; c.style.width = `${pc.w * s}px`; c.style.height = `${pc.h * s}px`; c.style.opacity = '0'
  layer.appendChild(c)
  return { el: c, w: pc.w * s, h: pc.h * s }
}

/**
 * Run a show's lead: { done } resolves when it lands (the show's own part starts then), and stop() ends it early. `ctx` is
 * { layer, el, p, look, parts: { sheets, fruit } , side }.
 */
export function runLead(style, ctx) {
  const { layer, el, p, look, parts } = ctx
  const vw = window.innerWidth, vh = window.innerHeight
  const S = start(style, ctx.side || 1)
  let E = landing(style, el, p, look, parts)
  const sec = leadSeconds(style, Math.abs(E.y - S.y), vh)
  const o = { vw, sec, side: ctx.side || 1 }
  const sheets = parts.sheets || [], own = sheets[0]
  const leaf = (bi, k = 1) => { const sh = own || sheets[0]; return makeLeaf(layer, sh, bi % sh.boxes.length, baseSize(sh) * k) }
  const nodes = [], extra = []
  let pieces = [] // { node: { el, w, h }, at: (t) => q, lead: bool }
  // ---- each show's pieces and motion ----
  if (style === 'stream' && own) pieces = [{ node: leaf(0, 1.8), at: (t) => rocking(t, S, E, o), lead: true }]
  else if (style === 'golden' && own) pieces = [{ node: leaf(1, 1.9), at: (t) => samara(t, S, E, o), lead: true }]
  else if (style === 'lake' && own) {
    pieces = [{ node: leaf(2, 1.7), at: (t) => ({ ...skipping(t, S, E, o), tilt: 22 }), lead: true }]
    const touches = skipTouches(S, E, o)
    extra.push({ touches, done: new Set() })
  } else if (style === 'tumble' && parts.fruit && parts.fruit.length) {
    const f = parts.fruit[0], s = (cropFor(p, el.clientWidth, el.clientHeight, p.focus).width / look.px480.width) * 1.3
    const node = canvasOf(layer, f.piece, s)
    const ledges = [...document.querySelectorAll('main .card')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 120).map((r) => ({ y: r.top + window.scrollY, x0: r.left, x1: r.right }))
    const path = bouncePath(S, E, ledges, o)
    pieces = [{ node, at: (t) => bouncing(t, path, { r: node.w / 2 }), lead: true }]
  } else if (style === 'petals' && look.bloom) {
    const pc = look.bloom.pieces[0], s = cropFor(p, el.clientWidth, el.clientHeight, p.focus).width / look.px480.width * 1.6
    pieces = [{ node: canvasOf(layer, pc, s), at: (t) => flutter(t, S, E, o), lead: true }]
  } else if (style === 'embers' && look.fire && look.bmp) {
    const d = 26, c = document.createElement('canvas'), bmp = look.bmp, fire = look.fire
    c.width = c.height = 32; const g = c.getContext('2d'), sz = Math.max(6, fire.r * bmp.width * 0.35)
    g.drawImage(bmp, fire.x * bmp.width - sz / 2, fire.y * bmp.height - sz / 2, sz, sz, 0, 0, 32, 32)
    g.globalCompositeOperation = 'destination-in'
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16); grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.6, 'rgba(0,0,0,.9)'); grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32)
    c.className = 'hv-piece'; c.style.width = c.style.height = `${d}px`; layer.appendChild(c)
    const halo = document.createElement('i'), [r, gg, b] = fire.colour
    halo.className = 'hv-glow'; halo.style.width = halo.style.height = '96px'
    halo.style.background = `radial-gradient(circle, rgba(${r},${gg},${b},.75) 0, rgba(${r},${gg},${b},.25) 40%, rgba(${r},${gg},${b},0) 70%)`
    layer.appendChild(halo)
    pieces = [{ node: { el: c, w: d, h: d }, at: (t) => comet(t, S, E, o), lead: true }, { node: { el: halo, w: 96, h: 96 }, at: (t) => ({ ...comet(t, S, E, o), k: 1 }) }]
    // The trail: copies of the same spark, left behind and fading
    const trail = Array.from({ length: 40 }, () => { const t2 = c.cloneNode(); t2.getContext('2d').drawImage(c, 0, 0); t2.style.width = t2.style.height = `${d * 0.55}px`; t2.style.opacity = '0'; layer.appendChild(t2); return { el: t2, born: -1, x: 0, y: 0, vx: 0, vy: 0 } })
    extra.push({ trail, next: 0 })
  } else if (style === 'wind' && own) {
    pieces = Array.from({ length: 9 }, (_, i) => ({ node: leaf(i, 0.9 + (i % 3) * 0.1), at: (t) => gust(t, S, E, { ...o, i }), lead: i === 0 }))
  } else if (style === 'beam') {
    const b = document.createElement('div'), bw = vw * 1.6, bh = Math.max(90, vh * 0.16)
    b.className = 'hv-beam'; b.style.width = `${bw}px`; b.style.height = `${bh}px`
    b.style.background = 'linear-gradient(180deg, rgba(255,230,170,0) 0%, rgba(255,233,180,.42) 50%, rgba(255,230,170,0) 100%)'
    layer.appendChild(b)
    pieces = [{ node: { el: b, w: bw, h: bh }, at: (t) => ({ ...beamDown(t, S, E), x: vw / 2, rot: -9, k: 1 }), lead: true, fade: true }]
    if (own) for (let i = 0; i < 14; i++) { const ph = Math.random() * 6.3, dx = (Math.random() - 0.5) * vw * 0.9, dy = (Math.random() - 0.5) * bh * 0.7; pieces.push({ node: leaf(i, 0.22 + Math.random() * 0.15), at: (t) => { const c = beamDown(t, S, E); return { x: vw / 2 + dx + Math.sin(t * 6 + ph) * 10, y: c.y + dy - dx * 0.16 + Math.cos(t * 5 + ph) * 6, rot: t * 300 + ph * 50, tilt: 50 * Math.sin(t * 9 + ph), k: 1, op: 0.5 + 0.5 * Math.sin(t * 11 + ph) } } }) }
  } else if (style === 'whirl' && own) {
    pieces = Array.from({ length: 7 }, (_, i) => ({ node: leaf(i, 0.85), at: (t) => devil(t, S, E, { ...o, i, n: 7 }), lead: i === 0 }))
  } else if (style === 'garland' && own) {
    pieces = Array.from({ length: 14 }, (_, i) => ({ node: leaf(i, 0.85), at: (t) => ribbon(t, S, E, { ...o, i }), lead: i === 0 }))
  }
  if (!pieces.length) return { done: Promise.resolve(), stop: () => {} }
  pieces.forEach((pc) => nodes.push(pc.node.el))
  extra.forEach((x) => { if (x.trail) x.trail.forEach((t) => nodes.push(t.el)) })
  // The lake's ripples on the page where the leaf touches: rings that stay on the page as it scrolls
  const ripple = (x, y) => { for (let k = 0; k < 3; k++) { const e = document.createElement('i'); e.className = 'hv-ring hv-ring-page'; e.style.opacity = '0'; layer.appendChild(e); nodes.push(e); ripples.push({ e, x, y, born: tNow + k * 0.22 }) } }
  const ripples = []
  const cam = camera()
  let tNow = 0, raf = 0, last = 0, finish, stopped = false
  const done = new Promise((ok) => { finish = ok })
  const clear = () => { nodes.forEach((n) => n.remove()); cam.stop() }
  const step = (stamp) => {
    raf = 0
    if (stopped) return
    const dt = last ? Math.min(0.05, (stamp - last) / 1000) : 0
    last = stamp
    if (document.visibilityState === 'visible') tNow += dt
    if (!el.isConnected) { stopped = true; clear(); finish(); return }
    E = landing(style, el, p, look, parts) // the painting's place, read again (a picture above it may have loaded)
    const t = clamp(tNow / sec), fadeOut = 1 - clamp((tNow - sec) / 0.45)
    for (const pc of pieces) {
      const q = pc.at(t)
      pc.node.el.style.opacity = ((q.op == null ? 1 : q.op) * (q.k === 0 ? 0 : 1) * Math.min(1, tNow * 4) * fadeOut * (pc.fade ? 1 - 0.6 * smoothEnd(t) : 1)).toFixed(3)
      place(pc.node.el, pc.node.w, pc.node.h, q.x, q.y, q)
      if (pc.lead && t < 1) cam.follow(dt, q.y)
    }
    for (const x of extra) {
      if (x.touches) for (const [j, tt] of x.touches.entries()) if (t >= tt.t && !x.done.has(j)) { x.done.add(j); ripple(tt.x, tt.y) }
      if (x.trail && t < 1) {
        const head = pieces[0].at(t)
        if (tNow >= x.next) { const s = x.trail.find((q) => q.born < 0 || tNow - q.born > 1); if (s) { s.born = tNow; s.x = head.x; s.y = head.y; s.vx = (Math.random() - 0.5) * 40; s.vy = -20 + Math.random() * 30 } x.next = tNow + 0.025 }
      }
      if (x.trail) for (const s of x.trail) {
        if (s.born < 0) continue
        const a = tNow - s.born
        if (a > 1) { s.el.style.opacity = '0'; continue }
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 30 * dt
        s.el.style.opacity = ((1 - a) * (0.6 + 0.4 * Math.sin(a * 30))).toFixed(3)
        place(s.el, 10, 10, s.x, s.y, { k: 1 - a * 0.6 })
      }
    }
    for (const g of ripples) {
      const f = (tNow - g.born) / 2.2
      if (f < 0) continue
      if (f > 1) { g.e.style.opacity = '0'; continue }
      const sx = 0.5 + 5 * ease(f)
      g.e.style.opacity = (0.7 * (1 - f)).toFixed(3)
      g.e.style.transform = `translate3d(${(g.x - 8).toFixed(1)}px, ${(g.y - window.scrollY - 8).toFixed(1)}px, 0) scale(${sx.toFixed(2)}, ${(sx * 0.34).toFixed(2)})`
    }
    if (tNow >= sec && finish) { const f = finish; finish = null; f() }
    if (tNow > sec + 2.4) { stopped = true; clear(); return }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return { done, stop: () => { stopped = true; cancelAnimationFrame(raf); clear(); if (finish) { const f = finish; finish = null; f() } } }
}
const smoothEnd = (t) => clamp((t - 0.85) / 0.15)
