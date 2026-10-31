import { useEffect, useRef, useState } from 'react'
import { goBack } from '../lib/router.js'
import { usePrefs } from '../lib/prefs.js'
import { reducedMotion } from '../lib/motion.js'
import { strikeBowl } from '../lib/mindful.js'

const IN = 4, OUT = 6 // seconds: a long, easy out-breath
const LINES = ['Breathing in, I calm my body.', 'Breathing out, I smile.']

/** A breathing pause: the circle grows as you breathe in, shrinks as you breathe out. Back leaves it. */
export default function Breathe() {
  const [prefs, update] = usePrefs()
  const [minutes, setMinutes] = useState(prefs.breatheMinutes || 3)
  const [state, setState] = useState('ready') // ready | breathing | done
  const [left, setLeft] = useState(0)
  const [phase, setPhase] = useState(0)
  const audio = useRef(null)
  const calm = reducedMotion()
  const bowl = () => { if (prefs.bell === false) return; try { audio.current = audio.current || new (window.AudioContext || window.webkitAudioContext)(); strikeBowl(audio.current) } catch { /* silent */ } }
  useEffect(() => {
    if (state !== 'breathing') return undefined
    let lock = null
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    const started = Date.now(), total = minutes * 60
    const tick = setInterval(() => {
      const s = (Date.now() - started) / 1000
      setLeft(Math.max(0, Math.ceil(total - s)))
      setPhase(s % (IN + OUT) < IN ? 0 : 1)
      if (s >= total) { clearInterval(tick); setState('done'); bowl() }
    }, 250)
    return () => { clearInterval(tick); if (lock) lock.release().catch(() => {}) }
  }, [state, minutes]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="breathe">
      <button type="button" className="icon-btn breathe-x" onClick={() => goBack('/')} aria-label="Leave">✕</button>
      <div className={`breathe-circle ${state === 'breathing' ? (phase === 0 ? 'in' : 'out') : ''}${calm ? ' calm' : ''}`} aria-hidden="true" />
      {state === 'ready' && (
        <div className="breathe-t">
          <p className="breathe-line">Sit comfortably. Follow the circle.</p>
          <div className="choice-row" role="group" aria-label="How long">
            {[1, 3, 5].map((m) => <button key={m} type="button" aria-pressed={minutes === m} onClick={() => { setMinutes(m); update({ breatheMinutes: m }) }}>{m} min</button>)}
          </div>
          <button type="button" className="btn" onClick={() => { bowl(); setState('breathing') }}>Begin</button>
        </div>
      )}
      {state === 'breathing' && (
        <div className="breathe-t" aria-live="polite">
          <p className="breathe-line">{LINES[phase]}</p>
          <p className="breathe-left">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
        </div>
      )}
      {state === 'done' && (
        <div className="breathe-t">
          <p className="breathe-line">I have arrived. I am home.</p>
          <p className="muted small">Thich Nhat Hanh</p>
          <button type="button" className="btn" onClick={() => goBack('/')}>Done</button>
        </div>
      )}
    </div>
  )
}
