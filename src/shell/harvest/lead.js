// The first part of every season's show, the witch's shape (src/lib/leads.js): from the top of Home, something made of the
// painting carries you down to it, the page following as it follows her crow (a scroll, a touch or a key ends the following),
// and lands where the painting's own show begins. Each show has its own, and several play with Home itself: the fire's fuse
// runs down the outside of the cards, the pumpkin rolls along their top edges and drops from one to the next, the butterflies
// rest on them, the whirl picks up a leaf from each. Every piece is a copy of her pixels; transforms and opacity only.
import { cropFor } from '../../lib/paintings.js'
import { along } from '../../lib/waterway.js'
import { leadSeconds, cameraTo, smooth, samara, skipping, skipTouches, alongLine, fusePath, plinkoPath, plinkoAt, hopStops, hopAt, murmur, swag, buntingAnchors } from '../../lib/leads.js'
import { makeLeaf, baseSize, clamp, ease } from './kit.js'

const TAU = Math.PI * 2

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

/** The cards between the top of the page and the painting, in page coordinates (not the one the painting hangs in). */
function cardsOnTheWay(el, top, bottom) {
  return [...document.querySelectorAll('main .card')].filter((c) => !c.contains(el)).map((c) => { const r = c.getBoundingClientRect(); return { x0: r.left, x1: r.right, y0: r.top + window.scrollY, y1: r.bottom + window.scrollY } })
    .filter((c) => c.x1 - c.x0 > 120 && c.y0 > top + 30 && c.y1 < bottom - 30).sort((a, b) => a.y0 - b.y0)
}

/** A piece at a page point: translate to the screen, then turn; transforms only. */
function place(node, x, y, q = {}) {
  node.el.style.transform = `translate3d(${(x - node.w / 2).toFixed(1)}px, ${(y - window.scrollY - node.h / 2).toFixed(1)}px, 0) rotate(${(q.rot || 0).toFixed(1)}deg) rotateX(${(q.tilt || 0).toFixed(1)}deg) rotateY(${(q.yaw || 0).toFixed(1)}deg) scale(${(q.k == null ? 1 : q.k).toFixed(3)})`
}
const show = (node, op) => { node.el.style.opacity = clamp(op).toFixed(3) }

/** A soft round piece of the painting (its water, its flame), as a small canvas: her pixels under a round soft edge. */
export function dab(layer, bmp, fx, fy, size, d) {
  const c = document.createElement('canvas'), S = 40
  c.width = c.height = S
  const g = c.getContext('2d')
  g.drawImage(bmp, fx * bmp.width - size / 2, fy * bmp.height - size / 2, size, size, 0, 0, S, S)
  g.globalCompositeOperation = 'destination-in'
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr; g.fillRect(0, 0, S, S)
  c.className = 'hv-piece'; c.style.width = c.style.height = `${d}px`; c.style.opacity = '0'
  layer.appendChild(c)
  return { el: c, w: d, h: d }
}
/** A leaf of hers as a shadow: its shape filled with a soft dark (for the dappled light), drawn once its sheet has loaded. */
export function shadowLeaf(layer, sh, bi, k) {
  const box = sh.boxes[bi % sh.boxes.length], c = document.createElement('canvas')
  c.width = box[2]; c.height = box[3]
  const img = new Image()
  img.onload = () => { const g = c.getContext('2d'); g.drawImage(img, box[0], box[1], box[2], box[3], 0, 0, box[2], box[3]); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(52, 40, 28, .42)'; g.fillRect(0, 0, box[2], box[3]) }
  img.src = sh.sheet
  const w = box[2] * k, h = box[3] * k
  c.className = 'hv-piece'; c.style.width = `${w}px`; c.style.height = `${h}px`; c.style.opacity = '0'
  layer.appendChild(c)
  return { el: c, w, h }
}
export const canvasOf = (layer, pc, s) => {
  const c = document.createElement('canvas'); c.width = pc.w; c.height = pc.h
  c.getContext('2d').putImageData(new ImageData(pc.rgba, pc.w, pc.h), 0, 0)
  c.className = 'hv-piece'; c.style.width = `${pc.w * s}px`; c.style.height = `${pc.h * s}px`; c.style.opacity = '0'
  layer.appendChild(c)
  return { el: c, w: pc.w * s, h: pc.h * s }
}

// ---- Each show's lead: make(env) gives { update(t, dt, now, E), leadY(t, E) } and puts its pieces in env.nodes -----------
const LEADS = {
  // A river of her own painted water flows down the page in wide bends, her leaves riding it, and pours into her stream
  stream(env) {
    const { layer, look, vw, S, own, leaf } = env, N = 46
    const pathAt = (u, E) => { const x = vw / 2 + Math.sin(TAU * 1.5 * u) * vw * 0.3 * (1 - u * 0.4); return { x: x + (E.x - x) * smooth(clamp((u - 0.82) / 0.18)), y: S.y + (E.y - S.y) * u } }
    const dabs = Array.from({ length: N }, () => { const q = along(look.way, Math.random()), side = (Math.random() - 0.5) * q.half * 1.1; return dab(layer, look.bmp, q.x + side, q.y, Math.max(8, q.half * look.bmp.width * 0.9), 30 + Math.random() * 16) })
    const riders = own ? [0, 1, 2].map((i) => leaf(i, 1.2 - i * 0.15)) : []
    env.nodes.push(...dabs, ...riders)
    return {
      update(t, dt, now, E) {
        const head = smooth(t)
        dabs.forEach((d, j) => { const u = j / (N - 1), q = pathAt(u, E), vis = clamp((head - u) * 14); show(d, vis * 0.92); place(d, q.x + Math.sin(now * 2 + j) * 3, q.y, { k: 0.8 + 0.25 * vis }) })
        riders.forEach((r, i) => { const u = clamp(head - i * 0.03), q = pathAt(u, E), q2 = pathAt(clamp(u + 0.01), E); show(r, u > 0 ? 1 : 0); place(r, q.x, q.y, { rot: (Math.atan2(q2.y - q.y, q2.x - q.x) * 180) / Math.PI + Math.sin(now * 3 + i) * 12, tilt: 55 }) })
      },
      leadY: (t, E) => pathAt(smooth(t), E).y,
    }
  },
  // A lit fuse runs down the outside of the cards, one side then the other, sparking, and sets the fire going
  embers(env) {
    const { layer, look, S, cards } = env, fire = look.fire
    const head = dab(layer, look.bmp, fire.x, fire.y, Math.max(6, fire.r * look.bmp.width * 0.35), 22)
    const halo = document.createElement('i'), [r, g, b] = fire.colour
    halo.className = 'hv-glow'; halo.style.width = halo.style.height = '70px'
    halo.style.background = `radial-gradient(circle, rgba(${r},${g},${b},.8) 0, rgba(${r},${g},${b},.28) 38%, rgba(${r},${g},${b},0) 70%)`
    layer.appendChild(halo)
    const glow = { el: halo, w: 70, h: 70 }
    const sparks = Array.from({ length: 44 }, () => ({ ...dab(layer, look.bmp, fire.x + (Math.random() - 0.5) * fire.r * 0.6, fire.y, Math.max(5, fire.r * look.bmp.width * 0.25), 6 + Math.random() * 5), born: -9, x: 0, y: 0, vx: 0, vy: 0 }))
    const burnt = Array.from({ length: 60 }, () => ({ ...dab(layer, look.bmp, fire.x, fire.y, Math.max(5, fire.r * look.bmp.width * 0.2), 4), born: -9, x: 0, y: 0 }))
    env.nodes.push(head, glow, ...sparks, ...burnt)
    let next = 0, nb = 0
    return {
      update(t, dt, now, E) {
        const q = alongLine(fusePath(S, E, cards), t), flick = 0.8 + 0.2 * Math.sin(now * 40)
        show(head, flick); place(head, q.x, q.y, { k: 1 + 0.2 * Math.sin(now * 30) })
        const flare = t >= 1 ? clamp((now - env.sec) / 0.8) : 0
        show(glow, 0.9 * flick * (1 - flare)); place(glow, q.x, q.y, { k: 1 + 3 * flare })
        if (t < 1 && now > next) { next = now + 0.02; const s = sparks.find((sp) => now - sp.born > 0.7); if (s) { s.born = now; s.x = q.x; s.y = q.y; const a = Math.random() * TAU, v = 60 + Math.random() * 90; s.vx = Math.cos(a) * v; s.vy = Math.sin(a) * v - 40 } const c = burnt[nb++ % burnt.length]; c.born = now; c.x = q.x; c.y = q.y }
        for (const s of sparks) { const a = now - s.born; if (a > 0.7) { show(s, 0); continue } s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt; show(s, (1 - a / 0.7) * (0.6 + 0.4 * Math.sin(a * 50))); place(s, s.x, s.y) }
        for (const c of burnt) { const a = now - c.born; if (a > 1.6 || c.born < 0) { show(c, 0); continue } show(c, 0.7 * (1 - a / 1.6)); place(c, c.x, c.y) }
      },
      leadY: (t, E) => alongLine(fusePath(S, E, cards), t).y,
    }
  },
  // The lake's leaf skips down the page like a flat stone, a ripple on the page wherever it touches
  lake(env) {
    const { layer, S, vw, leaf, own } = env
    if (!own) return null
    const node = leaf(2, 1.7), ripples = [], done = new Set()
    env.nodes.push(node)
    return {
      update(t, dt, now, E) {
        const q = skipping(t, S, E, { vw }); show(node, 1); place(node, q.x, q.y, { ...q, tilt: 22 })
        skipTouches(S, E, { vw }).forEach((tt, j) => { if (t >= tt.t && !done.has(j)) { done.add(j); for (let k = 0; k < 3; k++) { const e = document.createElement('i'); e.className = 'hv-ring hv-ring-page'; e.style.opacity = '0'; layer.appendChild(e); env.nodes.push({ el: e }); ripples.push({ e, x: tt.x, y: tt.y, born: now + k * 0.22 }) } } })
        for (const g of ripples) { const f = (now - g.born) / 2.2; if (f < 0) continue; if (f > 1) { g.e.style.opacity = '0'; continue } const sx = 0.5 + 5 * ease(f); g.e.style.opacity = (0.7 * (1 - f)).toFixed(3); g.e.style.transform = `translate3d(${(g.x - 8).toFixed(1)}px, ${(g.y - window.scrollY - 8).toFixed(1)}px, 0) scale(${sx.toFixed(2)}, ${(sx * 0.34).toFixed(2)})` }
      },
      leadY: (t, E) => skipping(t, S, E, { vw }).y,
    }
  },
  // The pumpkin rolls along each card's top edge, drops off the end onto the next one, and falls into the painting
  tumble(env) {
    const { layer, look, p, el, S, cards, vw } = env, f = env.parts.fruit && env.parts.fruit[0]
    if (!f) return null
    const s = (cropFor(p, el.clientWidth, el.clientHeight, p.focus).width / look.px480.width) * 1.4, node = canvasOf(layer, f.piece, s), r = Math.max(node.w, node.h) / 2
    env.nodes.push(node)
    return {
      update(t, dt, now, E) { const q = plinkoAt(plinkoPath(S, E, cards, { vw, r }), t, { r }); show(node, 1); place(node, q.x, q.y, q) },
      leadY: (t, E) => plinkoAt(plinkoPath(S, E, cards, { vw, r }), t, { r }).y,
    }
  },
  // Her blossom's petals become butterflies: they hop from card to card, resting on each with wings slowly beating
  petals(env) {
    const { layer, look, p, el, S, cards, sec } = env
    const s = (cropFor(p, el.clientWidth, el.clientHeight, p.focus).width / look.px480.width) * 1.25
    const flies = look.bloom.pieces.slice(0, 3).map((pc) => canvasOf(layer, pc, s))
    env.nodes.push(...flies)
    const stops = hopStops(S, env.E(), cards)
    return {
      update(t, dt, now, E) { stops[stops.length - 1] = E; flies.forEach((n, i) => { const q = hopAt(stops, clamp(t - i * 0.03), { i, sec }); show(n, 1); place(n, q.x, q.y, q) }) },
      leadY: (t, E) => { stops[stops.length - 1] = E; return hopAt(stops, t, { sec }).y },
    }
  },
  // Two of her golden leaves spin down like maple seeds, crossing each other like dancers
  golden(env) {
    const { S, vw, sec, leaf, own } = env
    if (!own) return null
    const a = leaf(1, 1.9), b = leaf(4, 1.6)
    env.nodes.push(a, b)
    const A = { x: vw * 0.32, y: S.y }, B = { x: vw * 0.72, y: S.y - 40 }
    return {
      update(t, dt, now, E) {
        const q = samara(t, A, E, { vw, sec }); show(a, 1); place(a, q.x, q.y, q)
        const tb = clamp(t * 1.04 - 0.04), q2 = samara(tb, B, E, { vw, sec }), mid = A.x + (E.x - A.x) * smooth(tb)
        show(b, tb > 0 ? 1 : 0); place(b, 2 * mid - q2.x + (B.x - A.x) * (1 - smooth(tb)), q2.y + 18 * (1 - tb), { ...q2, rot: -q2.rot })
      },
      leadY: (t, E) => samara(t, A, E, { vw, sec }).y,
    }
  },
  // A murmuration: her leaves loop across the top of the page like starlings, then pour down to the painting
  wind(env) {
    const { S, vw, vh, leaf, own } = env
    if (!own) return null
    const n = 20, flock = Array.from({ length: n }, (_, i) => leaf(i, 0.7 + (i % 4) * 0.12))
    env.nodes.push(...flock)
    return {
      update(t, dt, now, E) { flock.forEach((nd, i) => { const q = murmur(t, S, E, { vw, vh, i, n }); show(nd, Math.min(1, now * 3)); place(nd, q.x, q.y, q) }) },
      leadY: (t, E) => murmur(t, S, E, { vw, vh, i: 0, n }).y,
    }
  },
  // Dappled sunlight: soft patches of light, with the shadows of her leaves drifting through them, move down the page
  beam(env) {
    const { layer, S, vw, own } = env
    const spots = Array.from({ length: 6 }, (_, i) => { const e = document.createElement('i'), d = 110 + i * 22; e.className = 'hv-glow'; e.style.width = `${d}px`; e.style.height = `${d * 0.72}px`; e.style.background = 'radial-gradient(ellipse, rgba(255,238,190,.55) 0, rgba(255,232,178,.18) 45%, rgba(255,232,178,0) 70%)'; layer.appendChild(e); return { el: e, w: d, h: d * 0.72, ph: i * 1.3 } })
    const shades = own ? Array.from({ length: 7 }, (_, i) => ({ ...shadowLeaf(layer, own, i * 2, baseSize(own) * 1.7), ph: Math.random() * TAU })) : []
    env.nodes.push(...spots, ...shades)
    const centre = (t, E) => { const e = smooth(t); return { x: S.x + (E.x - S.x) * e + Math.sin(t * 5) * vw * 0.1 * (1 - t), y: S.y + 60 + (E.y - S.y - 60) * e } }
    return {
      update(t, dt, now, E) {
        const c = centre(t, E)
        spots.forEach((s) => { show(s, Math.min(1, now * 2) * (0.75 + 0.25 * Math.sin(now * 1.3 + s.ph))); place(s, c.x + Math.cos(now * 0.6 + s.ph) * 70, c.y + Math.sin(now * 0.8 + s.ph) * 46) })
        shades.forEach((s, i) => { show(s, Math.min(1, now * 2)); place(s, c.x + Math.cos(now * 0.35 + s.ph) * 90 + (i - 3) * 22, c.y + Math.sin(now * 0.5 + s.ph) * 60, { rot: now * 25 + s.ph * 57 }) })
      },
      leadY: (t, E) => centre(t, E).y,
    }
  },
  // A whirl that grows as it goes: tiny at the top, it picks up two of her leaves from each card it passes
  whirl(env) {
    const { S, vw, cards, leaf, own } = env
    if (!own) return null
    const start = [0, 1, 2].map((i) => ({ node: leaf(i, 0.8), joined: 0, from: null }))
    const extra = cards.slice(0, 6).flatMap((c, j) => [0, 1].map((k) => ({ node: leaf(3 + j * 2 + k, 0.8), joined: -1, card: c, side: k })))
    const all = [...start, ...extra]
    env.nodes.push(...all.map((a) => a.node))
    const centre = (t, E) => { const e = smooth(t); return { x: S.x + (E.x - S.x) * e + Math.sin(t * 3 * Math.PI) * vw * 0.2 * (1 - t), y: S.y + (E.y - S.y) * e } }
    return {
      update(t, dt, now, E) {
        const c = centre(t, E)
        for (const a of all) if (a.joined < 0 && c.y >= a.card.y0) { a.joined = now; a.from = { x: a.side ? a.card.x1 - 14 : a.card.x0 + 14, y: a.card.y0 + 6 } }
        const members = all.filter((a) => a.joined >= 0), n = members.length
        all.forEach((a) => { if (a.joined < 0) show(a.node, 0) })
        members.forEach((a, i) => {
          const ang = (i / n) * TAU + now * 5.2, rad = 14 + n * 3.2 + (i % 3) * 6, orbit = { x: c.x + Math.cos(ang) * rad, y: c.y + Math.sin(ang) * rad * 0.38 - (i % 5) * 8 }
          const join = a.from ? smooth(clamp((now - a.joined) / 0.7)) : 1
          const x = a.from ? a.from.x + (orbit.x - a.from.x) * join : orbit.x, y = a.from ? a.from.y + (orbit.y - a.from.y) * join : orbit.y
          show(a.node, 1); place(a.node, x, y, { rot: ang * 57.3, tilt: 50 * Math.sin(ang), k: 0.85 + 0.2 * (Math.sin(ang) + 1) / 2 })
        })
      },
      leadY: (t, E) => centre(t, E).y,
    }
  },
  // Bunting of her leaves drapes down the page in swags, side to side, strung as it goes, to the top of the frame
  garland(env) {
    const { S, vw, leaf, own } = env
    if (!own) return null
    const anchors = buntingAnchors(S, env.E(), { vw })
    const per = 7, total = per * (anchors.length - 1), leaves = Array.from({ length: total }, (_, j) => leaf(j, 0.8))
    env.nodes.push(...leaves)
    const point = (h) => { const k = Math.min(anchors.length - 2, Math.floor(h)), u = h - k; return swag(anchors[k], anchors[k + 1], u, 70) }
    return {
      update(t, dt, now, E) {
        anchors[anchors.length - 1] = E
        const head = smooth(t) * (anchors.length - 1)
        leaves.forEach((nd, j) => { const h = (j + 0.5) / per, vis = clamp((head - h) * 4), q = point(h); show(nd, vis); place(nd, q.x, q.y + Math.sin(now * 2 + j) * 3, { rot: Math.sin(now * 1.5 + j) * 18 + (j % 2 ? 160 : 20), k: 0.6 + 0.4 * vis }) })
      },
      leadY: (t, E) => { anchors[anchors.length - 1] = E; return point(Math.min(anchors.length - 1.0001, smooth(t) * (anchors.length - 1))).y },
    }
  },
}

/** Where each lead starts: at the top of the screen. */
function startOf(style) {
  const vw = window.innerWidth, y = window.scrollY + window.innerHeight * 0.06
  const x = { stream: 0.5, golden: 0.5, lake: 0.18, tumble: 0.3, petals: 0.8, embers: 0.05, beam: 0.3, whirl: 0.25, garland: 0.06, wind: 0.5 }[style]
  return { x: vw * (x == null ? 0.5 : x), y: style === 'embers' ? window.scrollY + 8 : y }
}

/**
 * Run a show's lead: { done } resolves when it lands (the show's own part starts then), and stop() ends it early. `ctx` is
 * { layer, el, p, look, parts: { sheets, fruit } }.
 */
export function runLead(style, ctx) {
  const { layer, el, p, look, parts } = ctx
  const vw = window.innerWidth, vh = window.innerHeight
  const S = startOf(style), E = () => landing(style, el, p, look, parts)
  const sec = leadSeconds(style, Math.abs(E().y - S.y), vh)
  const sheets = parts.sheets || [], own = sheets[0]
  const env = { layer, el, p, look, parts, vw, vh, S, E, sec, own, nodes: [], cards: cardsOnTheWay(el, S.y, E().y), leaf: (bi, k = 1) => makeLeaf(layer, own, bi % own.boxes.length, baseSize(own) * k) }
  const ok = LEADS[style] && (style !== 'stream' || look.way) && (style !== 'embers' || look.fire) && (style !== 'petals' || look.bloom)
  const made = ok ? LEADS[style](env) : null
  if (!made) { env.nodes.forEach((n) => n.el.remove()); return { done: Promise.resolve(), stop: () => {} } }
  const cam = camera()
  let now = 0, raf = 0, last = 0, finish, stopped = false
  const done = new Promise((res) => { finish = res })
  const clear = () => { env.nodes.forEach((n) => n.el.remove()); cam.stop() }
  const step = (stamp) => {
    raf = 0
    if (stopped) return
    const dt = last ? Math.min(0.05, (stamp - last) / 1000) : 0
    last = stamp
    if (document.visibilityState === 'visible') now += dt
    if (!el.isConnected) { stopped = true; clear(); if (finish) finish(); return }
    const e = E(), t = clamp(now / sec)
    made.update(t, dt, now, e)
    if (t < 1) cam.follow(dt, made.leadY(t, e))
    if (now >= sec) {
      if (finish) { const f = finish; finish = null; f() }
      const fade = 1 - clamp((now - sec) / 1.2)
      env.nodes.forEach((n) => { const o = Number(n.el.style.opacity || 1); n.el.style.opacity = Math.min(o, fade).toFixed(3) })
    }
    if (now > sec + 1.3) { stopped = true; clear(); return }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return { done, stop: () => { stopped = true; cancelAnimationFrame(raf); clear(); if (finish) { const f = finish; finish = null; f() } } }
}
