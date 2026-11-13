import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cropFor, paintingBySlug } from '../lib/paintings.js'
import { originInFrame, paintedWidth } from '../lib/wind.js'
import { garlandSlots, flightOf, arcAt, ease, closesAt, wholeness, GARLAND_LEAVES, REST_SECONDS, FADE_SECONDS } from '../lib/garland.js'
import { findWaterway, along, rideOf, progressAt, WATER_WORK } from '../lib/waterway.js'

// Thanksgiving's show, played from the painting on Home. Her leaves lift out of her autumn paintings from the
// places she painted them (copies of her pixels: the painting stays whole) and sail over in arcs. Where the
// painting has a stream in it (src/lib/waterway.js finds it from the painting's own colours), they land on the
// far end of her stream and float down it toward you, growing as they come, and slip out of the frame; where it
// has none, they settle along the frame's edge one by one until it wears a garland (src/lib/garland.js), which
// rests, each leaf breathing, then fades. Only where a painting hangs in view; elsewhere nothing stands in.
// "Play it" and the Art card's button play it again ("hicks:show"). Transforms and opacity only, and it never
// takes a tap; SeasonShow never starts it under less motion.
const FIRST_S = 2.5 // seconds after the page opens until the first leaf sets off
const STREAM_LEAVES = 14
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const clamp = (x) => Math.min(1, Math.max(0, x))

// The stream in a painting, found once from a small copy of it (null where it has none)
const ways = new Map()
function wayOf(p) {
  const url = p.small || p.src
  if (!url) return Promise.resolve(null)
  const key = `${p.slug}:${url}`
  if (!ways.has(key)) {
    ways.set(key, (async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        const bmp = await createImageBitmap(await res.blob())
        const s = WATER_WORK / Math.max(bmp.width, bmp.height), w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s))
        const c = document.createElement('canvas'); c.width = w; c.height = h
        const g = c.getContext('2d'); g.drawImage(bmp, 0, 0, w, h)
        const px = g.getImageData(0, 0, w, h)
        if (bmp.close) bmp.close()
        c.width = 0; c.height = 0
        return findWaterway(px)
      } catch { return null }
    })())
  }
  return ways.get(key)
}

export default function GarlandShow({ show, list, path }) {
  const layer = useRef(null)
  const listRef = useRef(list)
  listRef.current = list

  useEffect(() => {
    const L = layer.current
    if (!L) return undefined
    const sheets = show.sheets
    const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')) % 9973
    let raf = 0, last = 0, t = 0, start = FIRST_S, started = false, stopped = false, gone = false
    let leaves = [], frame = null, end = 0, mode = 'garland'

    const clear = () => { for (const lf of leaves) lf.el.remove(); leaves = []; frame = null }

    // The painting to play from: one whose leaves are on the sheets and which is in view, else any painting in view
    const findFrame = () => {
      const vh = window.innerHeight
      const frames = [...document.querySelectorAll('.pf[data-art-slug]')].map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((f) => f.r.width > 120 && f.r.height > 120 && f.r.bottom > 80 && f.r.top < vh - 80)
      return frames.find((f) => sheets.some((s) => s.slug === f.el.dataset.artSlug)) || frames[0] || null
    }

    // A leaf, cut from her sheet at a size
    const makeLeaf = (si, bi, kk) => {
      const sh = sheets[si], box = sh.boxes[bi]
      const el = document.createElement('i')
      el.className = 'gs-leaf'
      el.style.width = `${box[2] * kk}px`; el.style.height = `${box[3] * kk}px`
      el.style.backgroundImage = `url(${sh.sheet})`
      el.style.backgroundSize = `${sh.size[0] * kk}px ${sh.size[1] * kk}px`
      el.style.backgroundPosition = `${-box[0] * kk}px ${-box[1] * kk}px`
      el.style.opacity = '0'
      L.appendChild(el)
      return { el, w: box[2] * kk, h: box[3] * kk, box }
    }
    const baseSize = (sh) => (sh.scale[0] + (sh.scale[1] - sh.scale[0]) * 0.1) / sh.px * 0.85

    // Where leaves set off from: their own places in a painting hanging in view, shuffled
    const spotsFor = () => {
      const spots = []
      for (const [si, sh] of sheets.entries()) {
        const p = paintingBySlug(sh.slug, listRef.current), fr = document.querySelector(`.pf[data-art-slug="${sh.slug}"]`)
        if (!sh.origins || !p || !fr) continue
        const fw = fr.clientWidth, fh = fr.clientHeight, fb = fr.getBoundingClientRect(), crop = cropFor(p, fw, fh, p.focus)
        shuffle(sh.origins.origins.map((og, bi) => ({ bi, si, at: originInFrame(crop, og, fw, fh), fb, crop, p, o: sh.origins })).filter((c) => c.at && c.bi < sh.boxes.length)).forEach((c) => spots.push(c))
      }
      return spots
    }

    const begin = async () => {
      clear()
      const found = findFrame()
      if (!found) return false
      const el = found.el, painting = paintingBySlug(el.dataset.artSlug, listRef.current)
      const way = painting ? await wayOf(painting) : null
      if (gone || !el.isConnected) return false
      frame = el
      const W = frame.clientWidth, H = frame.clientHeight, r = frame.getBoundingClientRect()
      const crop = painting ? cropFor(painting, W, H, painting.focus) : null
      const covers = [...document.querySelectorAll('[data-art-cover]')].map((e) => e.getBoundingClientRect())
      const under = (at) => covers.some((c) => r.left + at.x > c.left - 14 && r.left + at.x < c.right + 14 && r.top + at.y > c.top - 14 && r.top + at.y < c.bottom + 14)
      const spots = spotsFor(), used = new Set()
      // Not under Anna's paper taped over the frame
      const slots = way && crop ? Array.from({ length: STREAM_LEAVES }, (_, i) => ({ order: i })) : garlandSlots(W, H, GARLAND_LEAVES, seed).filter((s) => !under(s))
      mode = way && crop ? 'stream' : 'garland'
      const toFrame = (q) => ({ x: crop.left + q.x * crop.width, y: crop.top + q.y * crop.height, half: q.half * crop.width })
      const nearHalf = way && crop ? toFrame(along(way, 1)).half : 1
      const flights = []
      slots.forEach((slot, i) => {
        const spot = spots.find((c) => !used.has(c.si + ':' + c.bi))
        let si, bi, from, k0 = 0.5
        if (spot) {
          used.add(spot.si + ':' + spot.bi)
          si = spot.si; bi = spot.bi
          from = { x: spot.fb.left + spot.at.x - r.left, y: spot.fb.top + spot.at.y - r.top }
        } else {
          si = Math.floor(Math.random() * sheets.length); bi = Math.floor(Math.random() * sheets[si].boxes.length)
          from = { x: i % 2 ? W + 60 : -60, y: -120 - Math.random() * 60 }
        }
        const sh = sheets[si], kk = baseSize(sh) * (mode === 'garland' ? slot.scale : 0.9 + Math.random() * 0.25)
        const lf = makeLeaf(si, bi, kk)
        if (spot) k0 = Math.min(1, paintedWidth(lf.box, spot.o.scale, spot.crop, spot.p.w) / lf.w)
        const phase = Math.random() * 6.3, rot0 = Math.random() * 360 - 180
        if (mode === 'garland') {
          const fly = flightOf(i, slots.length)
          flights.push(fly)
          lf.pos = (own) => {
            const f = (own - fly.delay) / fly.dur, e = ease(f)
            if (f <= 0) return null
            if (f < 1) {
              const p = arcAt(from, slot, e, fly.lift)
              return { ...p, rot: rot0 + (slot.rot - rot0) * e + fly.turns * 360 * (1 - e) * e * 2, tilt: Math.sin(f * Math.PI * 3 + phase) * 70 * (1 - e), k: k0 + (1 - k0) * e, op: Math.min(1, f * 6) }
            }
            return { x: slot.x, y: slot.y, rot: slot.rot + Math.sin(own * 0.9 + phase) * 2.5, tilt: 12 + Math.sin(own * 0.7 + phase) * 6, k: 1, op: 1 }
          }
        } else {
          // Sail to the far end of her stream, then float down it
          const ride = rideOf(), delay = 0.9 * i + Math.random() * 0.3, flight = 2 + Math.random() * 0.8
          const far = toFrame(along(way, 0))
          const landing = { x: far.x + ride.lane * far.half * 0.7, y: far.y + 3 }
          const persp = (half) => 0.3 + 0.7 * Math.pow(Math.min(1, half / nearHalf), 0.9)
          const kLand = persp(far.half), landRot = rot0 * 0.2
          flights.push({ delay, dur: flight + ride.dur })
          lf.pos = (own) => {
            const s = own - delay
            if (s <= 0) return null
            if (s < flight) {
              const f = s / flight, e = ease(f), p = arcAt(from, landing, e, 50 + ride.wobble * 14)
              return { ...p, rot: rot0 + (landRot - rot0) * e, tilt: Math.sin(f * Math.PI * 3 + phase) * 70 * (1 - e) + 66 * e, k: k0 + (kLand - k0) * e, op: Math.min(1, f * 6) }
            }
            const rs = s - flight, f = progressAt(rs, ride.dur), q = toFrame(along(way, f)), sc = persp(q.half)
            const across = ride.lane * q.half * 0.7 + Math.sin(rs * 1.1 + phase) * ride.wobble * sc
            return { x: q.x + across, y: q.y + Math.sin(rs * ride.bob * 3 + phase) * 1.3 * sc, rot: landRot + ride.turn * (rs / ride.dur) + Math.sin(rs * 0.8 + phase) * 7, tilt: 66 + Math.sin(rs * 1.7 + phase) * 5, k: sc, op: 0.96 * (1 - clamp((f - 0.93) / 0.07)) }
          }
        }
        leaves.push(lf)
      })
      end = mode === 'garland' ? closesAt(flights) + REST_SECONDS + FADE_SECONDS : Math.max(0, ...flights.map((f) => f.delay + f.dur)) + 0.5
      start = t
      return leaves.length > 0
    }

    const step = (stamp) => {
      raf = 0
      const dt = last ? Math.min(0.05, (stamp - last) / 1000) : 0
      last = stamp
      if (document.visibilityState === 'visible') t += dt
      if (t >= start && !started) { started = true; begin().then((ok) => { if (!ok) stopped = true }).catch(() => { stopped = true }) }
      if (stopped) { clear(); return }
      if (!leaves.length) { raf = requestAnimationFrame(step); return }
      const own = t - start
      const g = mode === 'garland' ? wholeness(own, end - REST_SECONDS - FADE_SECONDS) : 1
      // Read the frame once, then write every leaf's transform
      const r = frame && frame.isConnected ? frame.getBoundingClientRect() : null
      if (!r || own > end || g <= 0) { clear(); stopped = true; return }
      for (const lf of leaves) {
        const p = lf.pos(own)
        if (!p) { lf.el.style.opacity = '0'; continue }
        lf.el.style.opacity = String(Math.max(0, p.op * g).toFixed(3))
        lf.el.style.transform = `translate3d(${(r.left + p.x - lf.w / 2).toFixed(1)}px, ${(r.top + p.y - lf.h / 2).toFixed(1)}px, 0) rotate(${p.rot.toFixed(1)}deg) rotateX(${p.tilt.toFixed(1)}deg) scale(${p.k.toFixed(3)})`
      }
      raf = requestAnimationFrame(step)
    }
    const wake = () => { if (!raf) { last = 0; raf = requestAnimationFrame(step) } }
    // "Play it" or the Art card's button: play it again now
    const onShow = () => { clear(); started = false; stopped = false; t = 0; start = 0.2; wake() }
    window.addEventListener('hicks:show', onShow)
    wake()
    return () => {
      gone = true
      cancelAnimationFrame(raf)
      window.removeEventListener('hicks:show', onShow)
      clear()
    }
  }, [show, path])

  return createPortal(<div className="garland-show" ref={layer} aria-hidden="true" />, document.body)
}
