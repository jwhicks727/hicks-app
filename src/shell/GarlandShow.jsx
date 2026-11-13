import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cropFor, paintingBySlug } from '../lib/paintings.js'
import { originInFrame, paintedWidth } from '../lib/wind.js'
import { garlandSlots, flightOf, arcAt, ease, closesAt, wholeness, GARLAND_LEAVES } from '../lib/garland.js'

// Thanksgiving's show: her leaves gather into a garland round the painting on Home (src/lib/garland.js says how).
// Leaves lift out of her autumn paintings from the places she painted them (copies of her pixels: the painting
// stays whole), sail over in arcs, and settle along the edge of the painting's frame one by one until it wears a
// wreath of her brushwork. It rests, each leaf breathing a little, then fades. Only where a painting hangs in view;
// elsewhere there is no garland and nothing stands in for one. "Play it" and the Art card's button gather it again
// ("hicks:show"). Transforms and opacity only, and it never takes a tap; SeasonShow never starts it under less motion.
const FIRST_S = 2.5 // seconds after the page opens until the first leaf sets off
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

export default function GarlandShow({ show, list, path }) {
  const layer = useRef(null)
  const listRef = useRef(list)
  listRef.current = list

  useEffect(() => {
    const L = layer.current
    if (!L) return undefined
    const sheets = show.sheets
    const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, '')) % 9973
    let raf = 0, last = 0, t = 0, start = FIRST_S, started = false
    let leaves = [], frame = null, closes = 0

    const clear = () => { for (const lf of leaves) lf.el.remove(); leaves = []; frame = null }

    // The painting to wear it: one whose leaves are on the sheets and which is in view, else any painting in view
    const findFrame = () => {
      const vh = window.innerHeight
      const frames = [...document.querySelectorAll('.pf[data-art-slug]')].map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((f) => f.r.width > 120 && f.r.height > 120 && f.r.bottom > 80 && f.r.top < vh - 80)
      return frames.find((f) => sheets.some((s) => s.slug === f.el.dataset.artSlug)) || frames[0] || null
    }

    const gather = () => {
      clear()
      const found = findFrame()
      if (!found) return false
      frame = found.el
      const W = frame.clientWidth, H = frame.clientHeight, r = frame.getBoundingClientRect()
      const covers = [...document.querySelectorAll('[data-art-cover]')].map((e) => e.getBoundingClientRect())
      const under = (at) => covers.some((c) => r.left + at.x > c.left - 14 && r.left + at.x < c.right + 14 && r.top + at.y > c.top - 14 && r.top + at.y < c.bottom + 14)
      // Not under Anna's paper taped over the frame
      const slots = garlandSlots(W, H, GARLAND_LEAVES, seed).filter((s) => !under(s))
      // Where each leaf sets off from: its own place in a painting that is hanging in view, else from beyond the top corners
      const spots = []
      for (const sh of sheets) {
        const p = paintingBySlug(sh.slug, listRef.current), fr = document.querySelector(`.pf[data-art-slug="${sh.slug}"]`)
        if (!sh.origins || !p || !fr) continue
        const fw = fr.clientWidth, fh = fr.clientHeight, fb = fr.getBoundingClientRect(), crop = cropFor(p, fw, fh, p.focus)
        shuffle(sh.origins.origins.map((og, bi) => ({ bi, si: sheets.indexOf(sh), at: originInFrame(crop, og, fw, fh), fb, crop, p, sh, o: sh.origins })).filter((c) => c.at && c.bi < sh.boxes.length)).forEach((c) => spots.push(c))
      }
      const used = new Set()
      const flights = []
      slots.forEach((slot, i) => {
        const fly = flightOf(i, slots.length)
        const spot = spots.find((c) => !used.has(c.si + ':' + c.bi))
        let si, bi, k0 = 0.5, from
        if (spot) {
          used.add(spot.si + ':' + spot.bi)
          si = spot.si; bi = spot.bi
          from = { x: spot.fb.left + spot.at.x - r.left, y: spot.fb.top + spot.at.y - r.top }
        } else {
          si = Math.floor(Math.random() * sheets.length); bi = Math.floor(Math.random() * sheets[si].boxes.length)
          from = { x: i % 2 ? W + 60 : -60, y: -120 - Math.random() * 60 }
        }
        const sh = sheets[si], box = sh.boxes[bi]
        const kk = (sh.scale[0] + (sh.scale[1] - sh.scale[0]) * 0.1) / sh.px * slot.scale * 0.85
        const el = document.createElement('i')
        el.className = 'gs-leaf'
        el.style.width = `${box[2] * kk}px`; el.style.height = `${box[3] * kk}px`
        el.style.backgroundImage = `url(${sh.sheet})`
        el.style.backgroundSize = `${sh.size[0] * kk}px ${sh.size[1] * kk}px`
        el.style.backgroundPosition = `${-box[0] * kk}px ${-box[1] * kk}px`
        el.style.opacity = '0'
        L.appendChild(el)
        if (spot) k0 = Math.min(1, paintedWidth(box, spot.o.scale, spot.crop, spot.p.w) / (box[2] * kk))
        leaves.push({ el, w: box[2] * kk, h: box[3] * kk, slot, fly, from, k0, rot0: Math.random() * 360 - 180, phase: Math.random() * 6.3 })
        flights.push(fly)
      })
      closes = closesAt(flights)
      return leaves.length > 0
    }

    const step = (stamp) => {
      raf = 0
      const dt = last ? Math.min(0.05, (stamp - last) / 1000) : 0
      last = stamp
      if (document.visibilityState === 'visible') t += dt
      if (t >= start && !leaves.length && !started) { started = true; if (!gather()) { raf = 0; return } start = t }
      if (!leaves.length) { raf = requestAnimationFrame(step); return }
      const own = t - start
      const whole = wholeness(own, closes)
      // Read the frame once, then write every leaf's transform
      const r = frame.isConnected ? frame.getBoundingClientRect() : null
      if (!r || whole <= 0) { clear(); return }
      for (const lf of leaves) {
        const f = (own - lf.fly.delay) / lf.fly.dur, e = ease(f)
        if (f <= 0) { lf.el.style.opacity = '0'; continue }
        let x, y, rot, tilt, k
        if (f < 1) {
          const p = arcAt(lf.from, lf.slot, e, lf.fly.lift)
          x = p.x; y = p.y
          rot = lf.rot0 + (lf.slot.rot - lf.rot0) * e + lf.fly.turns * 360 * (1 - e) * e * 2
          tilt = Math.sin(f * Math.PI * 3 + lf.phase) * 70 * (1 - e)
          k = lf.k0 + (1 - lf.k0) * e
        } else {
          x = lf.slot.x; y = lf.slot.y
          rot = lf.slot.rot + Math.sin(own * 0.9 + lf.phase) * 2.5
          tilt = 12 + Math.sin(own * 0.7 + lf.phase) * 6
          k = 1
        }
        lf.el.style.opacity = String(Math.min(1, f * 6) * whole)
        lf.el.style.transform = `translate3d(${(r.left + x - lf.w / 2).toFixed(1)}px, ${(r.top + y - lf.h / 2).toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) rotateX(${tilt.toFixed(1)}deg) scale(${k.toFixed(3)})`
      }
      raf = requestAnimationFrame(step)
    }
    const wake = () => { if (!raf) { last = 0; raf = requestAnimationFrame(step) } }
    // "Play it" or the Art card's button: gather it again now
    const onShow = () => { clear(); started = false; t = 0; start = 0.2; wake() }
    window.addEventListener('hicks:show', onShow)
    wake()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('hicks:show', onShow)
      clear()
    }
  }, [show, path])

  return createPortal(<div className="garland-show" ref={layer} aria-hidden="true" />, document.body)
}
