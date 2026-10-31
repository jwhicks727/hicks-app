import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '../shell/Link.jsx'
import { cropFor, boxIn, flightPoints, birdAt } from '../lib/paintings.js'
import { reducedMotion } from '../lib/motion.js'
import { todayAt } from '../lib/cal/dates.js'
import { HOME_TOWN } from '../lib/sky.js'
import './paintings.css'

// One of Laurie's paintings, cropped to `focus` and filling its frame. If the
// painting has a flyer (its crow), the bird can leave the painting, fly round
// the screen, loop, and come home to its place, small and far off at first
// and growing as it nears. With `auto` it does that once
// a day when the frame is first well in view; the small bird button sends it
// again, and so does a "hicks:fly" event naming its painting (the Home
// card's Play again, which also drops the season's leaves). At rest the painting is always her painting, whole and unaltered:
// while the bird is away, a patch of her own sky covers its place; when it
// lands, the patch fades and the cut-out lifts away, leaving the painting.

const FLIGHT_MS = 7000 // a touch slower than it was (5600)
const KEY = 'teamhicks.flights'
const playedToday = (slug, day) => { try { return (JSON.parse(localStorage.getItem(KEY)) || {})[slug] === day } catch { return false } }
const markPlayed = (slug, day) => { try { const m = JSON.parse(localStorage.getItem(KEY)) || {}; m[slug] = day; localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* fine */ } }

export default function PaintingFrame({ painting: p, focus, auto = false, linkTo, label, className = '', style }) {
  const frame = useRef(null)
  const [size, setSize] = useState(null)
  useLayoutEffect(() => {
    const el = frame.current
    const read = () => setSize((s) => (s && s.W === el.clientWidth && s.H === el.clientHeight ? s : { W: el.clientWidth, H: el.clientHeight }))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const flyer = p.flyer
  const day = todayAt(HOME_TOWN.tz, new Date())
  // waiting: today's flight hasn't happened yet (the bird is away, its sky patch on)
  const [waiting, setWaiting] = useState(() => Boolean(auto && flyer && !reducedMotion() && !playedToday(p.slug, day)))
  const [flying, setFlying] = useState(false)
  const [home, setHome] = useState(false) // landed: the patch fading out under the bird
  const [blink, setBlink] = useState(false) // under less motion: the bird fades away and back
  const away = waiting || (flying && !home) || blink

  // Fly once the frame is well in view, so its landing place is on screen
  useEffect(() => {
    if (!waiting || !frame.current) return
    const io = new IntersectionObserver(([e]) => { if (e.intersectionRatio >= 0.6) { io.disconnect(); setWaiting(false); setFlying(true) } }, { threshold: [0, 0.3, 0.6, 0.9, 1] })
    io.observe(frame.current)
    return () => io.disconnect()
  }, [waiting])

  const crop = size ? cropFor(p, size.W, size.H, focus) : null
  const target = () => {
    const r = frame.current.getBoundingClientRect(), c = cropFor(p, frame.current.clientWidth, frame.current.clientHeight, focus), b = boxIn(c, flyer.at)
    return { left: r.left + b.left, top: r.top + b.top, width: b.width, height: b.height }
  }
  const fly = () => {
    if (flying || waiting || blink) return
    if (reducedMotion()) { setBlink(true); setTimeout(() => setBlink(false), 1200); return }
    setHome(false); setFlying(true)
  }
  const flyRef = useRef(fly)
  flyRef.current = fly
  // Again, on request from outside the frame
  useEffect(() => {
    if (!flyer) return undefined
    const on = (e) => { if (!e.detail || e.detail.slug === p.slug) flyRef.current() }
    window.addEventListener('hicks:fly', on)
    return () => window.removeEventListener('hicks:fly', on)
  }, [flyer, p.slug])
  const landed = () => {
    markPlayed(p.slug, day)
    setHome(true)
    setTimeout(() => { setFlying(false); setHome(false) }, 320)
  }

  return (
    <div className={'pf ' + className} ref={frame} style={style}>
      {crop && <img className="pf-img" src={p.src} alt={label || `${p.title}, a painting by Laurie`} draggable="false" style={{ width: crop.width, height: crop.height, left: crop.left, top: crop.top }} />}
      {crop && flyer && <img className={'pf-sky' + (away ? ' on' : '')} src={flyer.sky} alt="" draggable="false" style={boxIn(crop, flyer.skyAt)} />}
      {linkTo && <Link className="pf-link" to={linkTo} aria-label={`${p.title}: open Laurie’s Gallery`} />}
      {flyer && (
        <button type="button" className="pf-fly" onClick={fly} aria-label={`Let ${flyer.name} fly`} disabled={flying || blink}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 14c3-1 5-3 6.5-6 1 2.5 2.2 3.8 4 4.2L19 8l-1.2 4.6L21 14l-4 .6c-1.6 2.6-4.5 3.9-8 3.4l-2.5 2 .6-3C5 16.4 3.7 15.4 3 14z" fill="currentColor" /></svg>
        </button>
      )}
      {flying && <Flight flyer={flyer} target={target} onLanded={landed} />}
    </div>
  )
}

/** The bird in flight, drawn over everything (a portal), moved by transforms only. */
function Flight({ flyer, target, onLanded }) {
  const el = useRef(null)
  useEffect(() => {
    const vw = window.innerWidth, vh = window.innerHeight
    const t0 = target(), to0 = { x: t0.left + t0.width / 2, y: t0.top + t0.height / 2 }
    const pts = flightPoints(vw, vh, to0)
    const ratio = t0.height / t0.width
    let raf = 0, start = 0, done = false
    const step = (now) => {
      if (!start) start = now
      const t = Math.min(1, (now - start) / FLIGHT_MS)
      const box = target(), to = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      const b = birdAt(pts, t, { ms: FLIGHT_MS, land: box.width, faces: flyer.faces })
      // If the page scrolls on the way, the path bends to where its place is now
      const x = b.x + (to.x - to0.x) * t * t, y = b.y + (to.y - to0.y) * t * t
      const w = t < 1 ? b.size : box.width, h = t < 1 ? w * ratio : box.height
      if (el.current) {
        el.current.style.width = `${w}px`
        el.current.style.height = `${h}px`
        el.current.style.transform = t < 1 ? `translate(${x - w / 2}px, ${y - h / 2}px) rotate(${b.tilt}deg) scale(${b.dir}, ${b.flap})` : `translate(${box.left}px, ${box.top}px)`
        el.current.style.opacity = '1'
      }
      if (t < 1) raf = requestAnimationFrame(step)
      else if (!done) { done = true; onLanded() }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(<img ref={el} className="pf-flight" src={flyer.sprite} alt="" draggable="false" />, document.body)
}
