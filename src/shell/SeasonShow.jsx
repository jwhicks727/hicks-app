import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { showFor, leafPerches, dropOf, dropGap, MAX_DROPS } from '../lib/seasonShows.js'
import { seasonFor } from '../lib/seasons.js'
import { usePrefs, useSeasonTry } from '../lib/prefs.js'
import { reducedMotion } from '../lib/motion.js'
import { todayAt } from '../lib/cal/dates.js'
import { HOME_TOWN } from '../lib/sky.js'
import { usePath } from '../lib/router.js'
import { usePaintings } from '../parts/PaintingsProvider.jsx'
import WindShow from './WindShow.jsx'
import GarlandShow from './GarlandShow.jsx'
import './season-show.css'

// The season's show, from one of Laurie's paintings: her painted leaves rest
// along the top edge of the screen, just out of sight, and while you browse
// one lets go every so often and drifts slowly down (then another leaf takes
// its place). It is drawn over everything and never takes a tap; only
// transforms and opacity move; it waits while the app is in the background,
// stops after a while, and does nothing under less motion or on a sit or
// cook screen, where the screen is meant to be still. Settings (and the
// Paintings card's Play again) can let a few go at once ("hicks:show").
const QUIET = /^\/home\/(sit|breathe)|\/cook$/
const FIRST_S = 3 // seconds after the page opens until the first leaf lets go

// A leaf cut from her sheet, at a size: `px` sheet pixels to a screen pixel at scale 1, so the bigger sheets stay sharp
const leafStyle = (sh, box, scale) => {
  const k = scale / sh.px
  return { width: box[2] * k, height: box[3] * k, backgroundImage: `url(${sh.sheet})`, backgroundSize: `${sh.size[0] * k}px ${sh.size[1] * k}px`, backgroundPosition: `${-box[0] * k}px ${-box[1] * k}px` }
}

export default function SeasonShow() {
  const [prefs] = usePrefs()
  const [tryKey] = useSeasonTry()
  const day = todayAt(HOME_TOWN.tz, new Date())
  const key = tryKey || seasonFor(day).key
  const { list } = usePaintings()
  const path = usePath()
  const quiet = QUIET.test(path)
  const still = reducedMotion() || prefs.seasonal === false || quiet
  const show = useMemo(() => (still ? null : showFor(key, list)), [still, key, list])
  const seed = Number(day.replace(/-/g, '')) % 9973
  // Autumn and Halloween blow rather than fall (WindShow); Thanksgiving gathers (GarlandShow); only the Day of the Dead's leaves fall
  const perches = useMemo(() => (show && show.kind === 'leaves' ? leafPerches(show, seed) : []), [show, seed])
  const [drops, setDrops] = useState([]) // leaves falling now: { id, i, plan }
  const [away, setAway] = useState([]) // perches whose leaf has let go, and whose new one has not yet arrived
  const [arrivals, setArrivals] = useState({}) // how many leaves have arrived at each perch (a new one fades in)
  const seq = useRef(0), away_ = useRef(new Set())

  useEffect(() => {
    if (!show || !perches.length) return undefined
    let live = true, timer = 0, dropped = 0
    const timers = new Set()
    const later = (fn, s) => { const t = setTimeout(() => { timers.delete(t); if (live) fn() }, s * 1000); timers.add(t) }
    // Let one leaf go: it leaves its perch, falls, and a new one arrives at the perch about half way down
    const release = () => {
      const free = perches.map((_, i) => i).filter((i) => !away_.current.has(i))
      if (!free.length) return false
      const i = free[Math.floor(Math.random() * free.length)], plan = dropOf(show, perches[i]), id = ++seq.current
      away_.current.add(i); setAway([...away_.current])
      setDrops((d) => [...d, { id, i, plan }])
      later(() => { away_.current.delete(i); setAway([...away_.current]); setArrivals((a) => ({ ...a, [i]: (a[i] || 0) + 1 })) }, plan.dur * 0.55)
      later(() => setDrops((d) => d.filter((x) => x.id !== id)), plan.dur + 1)
      return true
    }
    const tick = () => {
      if (!live || dropped >= MAX_DROPS) return
      if (document.visibilityState === 'visible' && release()) dropped++
      timer = setTimeout(tick, dropGap(show) * 1000)
    }
    timer = setTimeout(tick, FIRST_S * 1000)
    // A few at once, a moment apart, on request
    const onShow = () => { for (let k = 0; k < 3; k++) later(() => { release() }, k * 1.8) }
    window.addEventListener('hicks:show', onShow)
    return () => { live = false; clearTimeout(timer); timers.forEach(clearTimeout); window.removeEventListener('hicks:show', onShow); away_.current = new Set(); setDrops([]); setAway([]) }
  }, [show, perches])

  if (show && show.kind === 'wind') return <WindShow show={show} list={list} path={path} />
  if (show && show.kind === 'garland') return <GarlandShow show={show} list={list} path={path} />
  if (!show || !perches.length) return null
  return createPortal(
    <div className="season-show" aria-hidden="true">
      {perches.map((p, i) => !away.includes(i) && (
        <span key={`${i}-${arrivals[i] || 0}`} className={'ss-perch' + (arrivals[i] ? ' arrives' : '')} style={{ left: `${p.x}vw`, '--tilt': `${p.tilt}deg`, '--h': `${p.leaf[3] * p.scale / show.sheets[p.si].px}px` }}>
          <i style={leafStyle(show.sheets[p.si], p.leaf, p.scale)} />
        </span>
      ))}
      {drops.map(({ id, plan: f }) => (
        <span key={id} className="ss-drop" style={{ '--x0': `${f.x}vw`, '--x1': `${f.x + f.drift}vw`, '--dur': `${f.dur}s`, '--h': `${f.leaf[3] * f.scale / show.sheets[f.si].px}px` }}>
          <span className="ss-sway" style={{ '--sway': `${f.sway}px`, '--swaydur': `${f.swayDur}s` }}>
            <i style={{ ...leafStyle(show.sheets[f.si], f.leaf, f.scale), '--tilt': `${f.tilt}deg`, '--spin': `${f.spin}deg`, '--dur': `${f.dur}s` }} />
          </span>
        </span>
      ))}
    </div>,
    document.body,
  )
}
