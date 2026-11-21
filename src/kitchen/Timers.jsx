import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTimers, startTimer, stopTimer, stopTimers, putBack, addTime, useAlarm, useAwake } from '../lib/kitchen/timers.js'
import { stepTimers, timerKey, timerTime, clock } from '../lib/kitchen/stepTimers.js'
import { usePath } from '../lib/router.js'
import { Link } from '../shell/Link.jsx'
import { Toast } from '../ui/Toast.jsx'
import './timers.css'

const mins = (m) => `${Math.round(m)} min`

/**
 * The kitchen's timers, wherever in the app the cook is (it sits in the
 * shell): the ones counting down docked above the tab bar, big; an ended one
 * takes the whole screen and rings until someone stops it or adds time.
 */
export default function Timers() {
  const { running, ringing, quiet } = useTimers()
  const [undo, setUndo] = useState(null)
  const done = [...ringing, ...quiet]
  useAwake(running.length > 0 || ringing.length > 0)
  useAlarm(ringing.length > 0, ringing.length ? `${ringing[0].label}: time’s up` : '')
  return (
    <>
      {running.length > 0 && <Dock running={running} onStop={(t) => { stopTimer(t.id); setUndo(t) }} />}
      {done.length > 0 && <Alarm done={done} ringing={ringing.length > 0} />}
      {undo && <Toast action="Undo" onAction={() => { putBack(undo); setUndo(null) }} onClose={() => setUndo(null)}>Stopped “{undo.label}”.</Toast>}
    </>
  )
}

function Dock({ running, onStop }) {
  const path = usePath()
  const ref = useRef(null)
  // the page keeps room for the dock under its last card, however many rows it takes
  useEffect(() => {
    const el = ref.current, root = document.documentElement
    if (!el) return undefined
    const size = () => root.style.setProperty('--kt-dock', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    size()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(size) : null
    if (ro) ro.observe(el)
    root.classList.add('kt-docked')
    return () => { if (ro) ro.disconnect(); root.classList.remove('kt-docked'); root.style.removeProperty('--kt-dock') }
  }, [])
  return createPortal(
    <section className="kt-dock" ref={ref} aria-label="Kitchen timers">
      {running.map((t) => {
        const total = Math.max(1, (t.ends - (t.started || t.ends - t.minutes * 60000)) / 1000)
        const soon = t.left <= 60
        const there = t.recipe && path.startsWith(`/kitchen/recipe/${t.recipe}`)
        const what = <><span className="kt-label">{t.label}{t.perSide ? (t.side === 2 ? ', second side' : ', first side') : ''}</span>{t.title && <span className="kt-dish">{t.title}</span>}</>
        return (
          <div key={t.id} className={'kt-timer' + (soon ? ' soon' : '')}>
            {t.recipe && !there ? <Link className="kt-what" to={`/kitchen/recipe/${t.recipe}`} aria-label={`${t.label}: open ${t.title || 'the recipe'}`}>{what}</Link> : <span className="kt-what">{what}</span>}
            <b className="kt-left" role="timer" aria-label={`${t.label}: ${clock(t.left)} left`}>{clock(t.left)}</b>
            <button type="button" className="kt-add" onClick={() => addTime(t.id, 1)} aria-label={`One more minute on ${t.label}`}>+1</button>
            <button type="button" className="kt-x" onClick={() => onStop(t)} aria-label={`Stop the ${t.label} timer`}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
            </button>
            <span className="kt-bar" aria-hidden="true"><i style={{ transform: `scaleX(${Math.min(1, t.left / total)})` }} /></span>
          </div>
        )
      })}
    </section>,
    document.body,
  )
}

/** Time's up: the whole screen, ringing, until each is stopped or given more time. */
function Alarm({ done, ringing }) {
  const stop = useRef(null)
  useEffect(() => { stop.current?.focus() }, [done.length])
  useEffect(() => {
    // Escape stops them, before anything underneath (a sheet) hears it
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); stopTimers(done.map((t) => t.id)) } }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [done])
  const one = done.length === 1
  return createPortal(
    <div className={'kt-alarm' + (ringing ? ' ringing' : '')} role="alertdialog" aria-modal="true" aria-labelledby="kt-alarm-h">
      <span className="kt-rings" aria-hidden="true"><i /><i /><i /></span>
      <div className="kt-alarm-in">
        <p className="kt-alarm-k" id="kt-alarm-h">{one ? 'Time’s up' : `${done.length} timers are up`}</p>
        {done.map((t, k) => {
          const rest = t.upTo && t.upTo > t.minutes ? Math.round(t.upTo - t.minutes) : 0
          return (
            <section key={t.id} className={'kt-up' + (one ? ' one' : '')}>
              <h2>{t.label}{t.perSide ? (t.side === 2 ? ': the second side' : ': the first side') : ''}</h2>
              {t.title && <p className="kt-dish">{t.title}</p>}
              <p className="kt-over">{t.over < 5 ? 'Just now' : `Ended ${clock(t.over)} ago`}</p>
              {rest > 0 && <p className="kt-hint">The recipe says {timerTime(t)}: check it now.</p>}
              <div className="kt-acts">
                <button type="button" className="kt-stop" ref={k === 0 ? stop : undefined} onClick={() => stopTimer(t.id)}>Stop</button>
                {t.perSide && t.side !== 2 && <button type="button" onClick={() => addTime(t.id, t.minutes, { side: 2 })}>Other side, {mins(t.minutes)}</button>}
                {rest > 1 && <button type="button" onClick={() => addTime(t.id, rest)}>+{rest} min</button>}
                <button type="button" onClick={() => addTime(t.id, 1)}>+1 min</button>
                {!rest && !t.perSide && <button type="button" onClick={() => addTime(t.id, 5)}>+5 min</button>}
              </div>
            </section>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}

/**
 * A step's own timers, one for each wait its words name (stepTimers): a tap
 * starts one, and while it runs the button counts it down.
 */
export function StepTimers({ step, recipe, title, big = false }) {
  const timers = stepTimers(step)
  const { running, ringing, quiet } = useTimers()
  if (!timers.length) return null
  return (
    <div className={'kt-step' + (big ? ' big' : '')}>
      {timers.map((t) => {
        const key = timerKey(recipe, step.n, t.i)
        const live = running.find((x) => x.key === key)
        const up = !live && [...ringing, ...quiet].find((x) => x.key === key)
        const length = `${timerTime(t)}${t.perSide ? ' a side' : ''}`
        if (live) {
          return (
            <button type="button" key={key} className="kt-start on" aria-disabled="true" aria-label={`${t.label}: ${clock(live.left)} left`}>
              <span className="kt-dot" aria-hidden="true" /><span>{t.label}</span><b>{clock(live.left)}</b>
            </button>
          )
        }
        return (
          <button type="button" key={key} className={'kt-start' + (up ? ' up' : '')}
            onClick={() => startTimer({ key, label: t.label, title, minutes: t.minutes, upTo: t.upTo, perSide: t.perSide, recipe })}
            aria-label={`Start a ${length} timer: ${t.label}`}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M12 9v4l2.5 2M10 2.5h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            <span>{t.label}</span><b>{length}</b>
          </button>
        )
      })}
    </div>
  )
}
