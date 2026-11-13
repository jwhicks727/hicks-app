import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWeather } from '../lib/useWeather.js'
import { cropFor, paintingBySlug } from '../lib/paintings.js'
import { windOf, pushOf, gustPlan, windAt, delayAt, originInFrame, paintedWidth, stirOf, GUSTS, MAX_AIR, MAX_RESTING, SHOW_SECONDS } from '../lib/wind.js'

// Autumn's show: the wind at home, blowing Laurie's leaves (src/lib/wind.js says how the wind is read).
// When a gust reaches her painting on Home, leaves lift off from the very places she painted them (copies of
// her pixels: the painting underneath stays whole), tumble across the screen on the gust, and come to rest on
// the tops of the cards below. The next strong gust lifts them again, and so does a quick scroll. Away from
// Home, or with the painting out of view, the gust brings leaves in from the side the wind comes from. Each
// gust also tells the Art card ("hicks:gust"), so Anna's drawing taped to it can flutter; the card's "A gust"
// button asks for one ("hicks:wind-gust"). Transforms only, a handful of leaves, and it sleeps whenever
// nothing is in the air; it never takes a tap, and SeasonShow never starts it under less motion.
const WAIT_MS = 4000 // how long to wait for the weather before blowing a calm wind (an honest "not known")
const REST_SINK = 0.18 // how far a resting leaf sits down over a card's top edge, as a share of its height

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

export default function WindShow({ show, list, path }) {
  const { forecast, stale } = useWeather()
  const layer = useRef(null)
  const now = forecast && !stale ? forecast.now : null // never an old wind
  const nowRef = useRef(now), listRef = useRef(list)
  nowRef.current = now
  listRef.current = list
  // Start once the wind is known, or after a moment without it
  const [ready, setReady] = useState(Boolean(now))
  useEffect(() => { if (now) setReady(true) }, [now])
  useEffect(() => { const t = setTimeout(() => setReady(true), WAIT_MS); return () => clearTimeout(t) }, [])

  useEffect(() => {
    const L = layer.current
    if (!ready || !L) return undefined
    const w = windOf(nowRef.current), rule = GUSTS[w.level]
    let push = pushOf(w, window.innerWidth)
    const plan = gustPlan(w)
    const sheets = show.sheets
    let leaves = [], raf = 0, last = 0, t = 0, began = 0, lastAsk = -10
    let prevY = window.scrollY, prevAt = performance.now()

    const makeLeaf = (si, bi) => {
      const sh = sheets[si], box = sh.boxes[bi]
      const k = (sh.scale[0] + Math.random() * (sh.scale[1] - sh.scale[0])) / sh.px
      const el = document.createElement('i')
      el.className = 'ws-leaf'
      el.style.width = `${box[2] * k}px`
      el.style.height = `${box[3] * k}px`
      el.style.backgroundImage = `url(${sh.sheet})`
      el.style.backgroundSize = `${sh.size[0] * k}px ${sh.size[1] * k}px`
      el.style.backgroundPosition = `${-box[0] * k}px ${-box[1] * k}px`
      L.appendChild(el)
      return { el, si, bi, w: box[2] * k, h: box[3] * k, x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, flip: 0, fr: 150 + Math.random() * 200, fall: 88 + Math.random() * 34, phase: Math.random() * 6.3, mode: 'fly', k: 1, age: 0, delay: 0, card: null, dx: 0 }
    }
    const airborne = () => leaves.filter((l) => l.mode !== 'rest').length

    // Leaves lifting out of the painting, each from its own place, when the gust reaches it
    const fromPainting = (n) => {
      const vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY
      let made = 0
      for (const [si, sh] of sheets.entries()) {
        const o = sh.origins, p = paintingBySlug(sh.slug, listRef.current)
        const frame = document.querySelector(`.pf[data-art-slug="${sh.slug}"]`)
        if (!o || !p || !frame || made >= n) continue
        const r = frame.getBoundingClientRect()
        if (r.bottom < 0 || r.top > vh) continue
        const W = frame.clientWidth, H = frame.clientHeight, crop = cropFor(p, W, H, p.focus)
        // Not from under Anna's paper taped over the frame: a leaf would appear on top of her drawing
        const covers = [...document.querySelectorAll('[data-art-cover]')].map((e) => e.getBoundingClientRect())
        const hidden = (at) => covers.some((c) => r.left + at.x > c.left - 6 && r.left + at.x < c.right + 6 && r.top + at.y > c.top - 6 && r.top + at.y < c.bottom + 6)
        const spots = shuffle(o.origins.map((og, bi) => ({ bi, at: originInFrame(crop, og, W, H) })).filter((c) => c.at && !hidden(c.at) && c.bi < sh.boxes.length && !leaves.some((l) => l.si === si && l.bi === c.bi)))
        for (const c of spots.slice(0, n - made)) {
          const lf = makeLeaf(si, c.bi)
          lf.k = Math.min(1, paintedWidth(sh.boxes[c.bi], o.scale, crop, p.w) / lf.w)
          lf.x = r.left + c.at.x
          lf.y = sy + r.top + c.at.y
          lf.mode = 'lift'
          lf.delay = delayAt(lf.x, vw, w.side) + made * 0.08 + Math.random() * 0.25
          leaves.push(lf)
          made++
        }
      }
      return made
    }
    // Leaves blown in from the side the wind comes from
    const fromEdge = (n) => {
      const vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY
      for (let i = 0; i < n; i++) {
        const si = Math.floor(Math.random() * sheets.length), bi = Math.floor(Math.random() * sheets[si].boxes.length)
        const lf = makeLeaf(si, bi)
        lf.x = w.side > 0 ? -lf.w : vw + lf.w
        lf.y = sy + vh * (0.05 + Math.random() * 0.5)
        lf.vx = w.side * push.base * 0.8
        lf.rot = Math.random() * 80 - 40
        lf.flip = Math.random() * 360
        lf.delay = i * 0.35
        lf.mode = 'lift'
        leaves.push(lf)
      }
    }
    const beginGust = (g) => {
      window.dispatchEvent(new CustomEvent('hicks:gust', { detail: { strength: g.strength, side: w.side } }))
      // From the painting where its leaves are in view (not under Anna's paper); the rest blow in from upwind
      const room = Math.max(0, MAX_AIR - airborne())
      const made = fromPainting(Math.min(room, rule.leaves))
      fromEdge(Math.max(0, Math.min(room - made, rule.leaves - made + (w.level === 'calm' ? 0 : 1))))
    }

    const step = (stamp) => {
      raf = 0
      const dt = last ? Math.min(0.05, (stamp - last) / 1000) : 0
      last = stamp
      if (document.visibilityState === 'visible') t += dt
      const vw = window.innerWidth, vh = window.innerHeight, sy = window.scrollY
      push = pushOf(w, vw)
      while (began < plan.length && t >= plan[began].at) beginGust(plan[began++])
      // Read everything first: the cards' top edges in view, and where each resting leaf's card is now
      const ledges = [...document.querySelectorAll('main .card')].map((el) => ({ el, r: el.getBoundingClientRect() })).filter((c) => c.r.bottom > -40 && c.r.top < vh + 40 && c.r.width > 80)
      for (const lf of leaves) if (lf.mode === 'rest') { lf.gone = !lf.card.isConnected; if (!lf.gone) lf.at = lf.card.getBoundingClientRect() }
      let resting = leaves.filter((l) => l.mode === 'rest').length
      for (const lf of leaves) {
        lf.age += dt
        const wind = windAt(w, push, plan, t, lf.x, vw)
        if (lf.mode === 'lift') {
          if (lf.age < lf.delay) continue
          lf.mode = 'fly'
          if (!lf.vx) { lf.vx = wind.x * 0.2; lf.vy = -25 - 45 * wind.gust }
        }
        if (lf.mode === 'rest') {
          if (lf.gone) { lf.dead = true; continue }
          lf.x = lf.at.left + lf.dx
          lf.y = sy + lf.at.top - lf.h * REST_SINK
          // A strong gust lifts it off again
          if (wind.gust > 0.55 && Math.abs(wind.x) > push.base + 0.5 * (push.peak - push.base) && Math.random() < dt * 2.5) {
            lf.mode = 'fly'; lf.card = null; lf.vy = -70 - 120 * wind.gust; lf.vx = wind.x * 0.4; resting--
            lf.el.classList.remove('ws-rest')
          }
          continue
        }
        // In the air: carried by the wind, falling slowly, lifted by a gust, fluttering and tumbling
        lf.vx += (wind.x - lf.vx) * 1.7 * dt
        lf.vy += (lf.fall - 85 * wind.gust * (0.6 + 0.4 * Math.sin(lf.phase + t * 1.3)) - lf.vy) * 2.2 * dt
        lf.phase += dt * (2 + Math.abs(lf.vx) / 120)
        const flutter = Math.sin(lf.phase) * (12 + Math.abs(lf.vx) * 0.06), was = lf.y
        lf.x += (lf.vx + flutter * 0.3) * dt
        lf.y += (lf.vy + flutter) * dt
        lf.vr += (lf.vx * 0.5 + Math.sin(lf.phase * 0.7) * 60 - lf.vr) * 1.5 * dt
        lf.rot += lf.vr * dt
        lf.flip += lf.fr * dt * (0.4 + Math.abs(lf.vx - wind.x) / 150 + wind.gust * 0.8)
        if (lf.k < 1) lf.k = Math.min(1, lf.k + dt * 1.3)
        // Coming down onto the top edge of a card, unless a gust is near its height
        if (lf.vy > 0 && resting < MAX_RESTING && Math.abs(wind.x) < push.base + 0.75 * (push.peak - push.base)) {
          for (const c of ledges) {
            const top = sy + c.r.top, foot = lf.h * REST_SINK
            if (was - foot <= top && lf.y - foot > top && lf.x > c.r.left + 10 && lf.x < c.r.right - 10 && Math.random() < 0.6) {
              lf.mode = 'rest'; lf.card = c.el; lf.dx = lf.x - c.r.left; lf.at = c.r; lf.rot = Math.random() * 70 - 35; lf.flip = 0; lf.k = 1; lf.vx = 0; lf.vy = 0; resting++
              lf.el.classList.add('ws-rest')
              break
            }
          }
        }
        const onScreen = lf.y - sy
        if (lf.x < -170 || lf.x > vw + 170 || onScreen > vh + 170 || onScreen < -vh) lf.dead = true
      }
      // Then write: transforms only
      for (const lf of leaves) {
        if (lf.dead) { lf.el.remove(); continue }
        const tilt = lf.mode === 'rest' ? 64 : lf.mode === 'lift' ? 0 : Math.sin((lf.flip * Math.PI) / 180) * 72
        lf.el.style.transform = `translate3d(${(lf.x - lf.w / 2).toFixed(1)}px, ${(lf.y - sy - lf.h / 2).toFixed(1)}px, 0) rotate(${lf.rot.toFixed(1)}deg) rotateX(${tilt.toFixed(1)}deg) scale(${lf.k.toFixed(3)})`
      }
      leaves = leaves.filter((l) => !l.dead)
      // Keep going while anything is in the air or a gust is still to come; otherwise sleep until a scroll or a gust
      if (airborne() || (began < plan.length && t < SHOW_SECONDS)) raf = requestAnimationFrame(step)
      else last = 0
    }
    const wake = () => { if (!raf) { last = 0; raf = requestAnimationFrame(step) } }

    // A quick scroll stirs the resting leaves in view; any scroll moves the resting ones with their cards
    const onScroll = () => {
      const y = window.scrollY, at = performance.now()
      const speed = ((y - prevY) / Math.max(1, at - prevAt)) * 1000
      prevY = y; prevAt = at
      const stir = stirOf(speed, w.side)
      if (stir) {
        for (const lf of leaves) {
          if (lf.mode !== 'rest' || lf.y - y < -40 || lf.y - y > window.innerHeight + 40) continue
          lf.mode = 'fly'; lf.card = null; lf.vy = -stir.up * (0.6 + Math.random() * 0.4); lf.vx = stir.across * (0.6 + Math.random() * 0.8)
          lf.el.classList.remove('ws-rest')
        }
      }
      if (leaves.length) wake()
    }
    // "A gust", from the Art card: one more, now (never more than one every three seconds)
    const onAsk = () => {
      if (t - lastAsk < 3) return
      lastAsk = t
      plan.splice(began, 0, { at: t + 0.05, rise: 0.6, hold: 1.2, fall: 1.8, strength: 1 })
      wake()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('hicks:wind-gust', onAsk)
    wake()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('hicks:wind-gust', onAsk)
      for (const lf of leaves) lf.el.remove()
      leaves = []
    }
  }, [ready, show, path])

  return createPortal(<div className="wind-show" ref={layer} aria-hidden="true" />, document.body)
}
