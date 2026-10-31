import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { showFor, leafFalls, showLength } from '../lib/seasonShows.js'
import { seasonFor } from '../lib/seasons.js'
import { usePrefs, useSeasonTry } from '../lib/prefs.js'
import { reducedMotion } from '../lib/motion.js'
import { todayAt } from '../lib/cal/dates.js'
import { HOME_TOWN } from '../lib/sky.js'
import { usePath } from '../lib/router.js'
import './season-show.css'

// The season's show: once a day, a moment after the app opens, something
// from one of Laurie's paintings moves across the screen (her leaves fall).
// Drawn over everything, never taking a tap; transforms and opacity only;
// nothing under less motion, and never over a sit or cook mode, where the
// screen is meant to be still. Settings can play it again ("hicks:show").
const QUIET = /^\/home\/(sit|breathe)|\/cook$/
const KEY = 'teamhicks.shows'
const played = (k, day) => { try { return (JSON.parse(localStorage.getItem(KEY)) || {})[k] === day } catch { return true } }
const mark = (k, day) => { try { const m = JSON.parse(localStorage.getItem(KEY)) || {}; m[k] = day; localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* fine */ } }

export default function SeasonShow() {
  const [prefs] = usePrefs()
  const [tryKey] = useSeasonTry()
  const day = todayAt(HOME_TOWN.tz, new Date())
  const key = tryKey || seasonFor(day).key
  const [run, setRun] = useState(null) // { falls, id }
  const quiet = QUIET.test(usePath())

  const start = (k) => {
    const show = showFor(k)
    if (!show || reducedMotion()) return
    const falls = leafFalls(show, Number(day.replace(/-/g, '')) % 9973)
    setRun({ show, falls, id: Date.now() })
  }
  // Once a day, a moment after opening
  useEffect(() => {
    if (quiet || prefs.seasonal === false || !showFor(key) || played(key, day)) return
    const t = setTimeout(() => { mark(key, day); start(key) }, 1400)
    return () => clearTimeout(t)
  }, [key, day, prefs.seasonal, quiet]) // eslint-disable-line react-hooks/exhaustive-deps
  // Again, on request
  useEffect(() => {
    const on = (e) => start((e.detail && e.detail.key) || key)
    window.addEventListener('hicks:show', on)
    return () => window.removeEventListener('hicks:show', on)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  // Gone when the last leaf has fallen
  useEffect(() => {
    if (!run) return
    const t = setTimeout(() => setRun(null), showLength(run.falls))
    return () => clearTimeout(t)
  }, [run])

  if (!run || quiet) return null
  const { show, falls } = run
  const [sw, sh] = show.painting.leaves.size
  return createPortal(
    <div className="season-show" aria-hidden="true" key={run.id}>
      {falls.map((f, i) => (
        <span key={i} className="ss-fall" style={{ '--x0': `${f.x0}vw`, '--x1': `${f.x1}vw`, '--dur': `${f.dur}s`, '--delay': `${f.delay}s` }}>
          <span className="ss-sway" style={{ '--sway': `${f.sway}px`, '--swaydur': `${f.swayDur}s`, '--spin': `${f.spin}deg` }}>
            <i style={{ width: f.leaf[2] * f.scale * 0.8, height: f.leaf[3] * f.scale * 0.8, backgroundImage: `url(${show.painting.leaves.sheet})`, backgroundSize: `${sw * f.scale * 0.8}px ${sh * f.scale * 0.8}px`, backgroundPosition: `${-f.leaf[0] * f.scale * 0.8}px ${-f.leaf[1] * f.scale * 0.8}px` }} />
          </span>
        </span>
      ))}
    </div>,
    document.body,
  )
}
