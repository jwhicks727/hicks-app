import { useEffect, useRef, useState } from 'react'
import SunCalc from 'suncalc'
import { goBack, navigate } from '../lib/router.js'
import { usePrefs } from '../lib/prefs.js'
import { strikeBowl, sitLineFor } from '../lib/mindful.js'
import { todayAt } from '../lib/cal/dates.js'
import { HOME_TOWN, morningSky } from '../lib/sky.js'
import { useSession } from '../lib/auth.js'
import { useJournalGlance } from '../lib/useJournalGlance.js'

// /home/sit: a morning sit. One short line to clear the mind, a length
// (ten minutes unless changed; it remembers), the bowl to begin and end,
// and nothing else: no instructions, no guidance. The screen stays awake;
// tapping shows or hides the time left. Back leaves it. At the end: the
// morning's sky, a note from your past self if one is waiting, and on to the
// journal (Jason writes his after he sits).
const LENGTHS = [5, 10, 15, 20, 30]
const hm = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: '2-digit' })

export default function Sit() {
  const [prefs, update] = usePrefs()
  const [minutes, setMinutesState] = useState(prefs.sitMinutes || 10)
  const setMinutes = (m) => { const v = Math.min(90, Math.max(1, m)); setMinutesState(v); update({ sitMinutes: v }) }
  const [state, setState] = useState('ready') // ready | sitting | done
  const [left, setLeft] = useState(0), [showTime, setShowTime] = useState(false), [sat, setSat] = useState(0)
  const audio = useRef(null), started = useRef(0)
  const today = todayAt(HOME_TOWN.tz, new Date())
  const [text, who] = sitLineFor(today)
  const session = useSession()
  const glance = useJournalGlance(session, today, state === 'done')
  const bowl = () => { if (prefs.bell === false) return; try { audio.current = audio.current || new (window.AudioContext || window.webkitAudioContext)(); audio.current.resume?.(); strikeBowl(audio.current, 0.3) } catch { /* silent */ } }
  const finish = () => { setSat(Math.round((Date.now() - started.current) / 60000)); setState('done'); bowl() }

  useEffect(() => {
    if (state !== 'sitting') return undefined
    let lock = null
    const wake = () => navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    wake()
    const onVisible = () => { if (document.visibilityState === 'visible') wake() } // the lock lapses when the screen does
    document.addEventListener('visibilitychange', onVisible)
    const total = minutes * 60
    const tick = setInterval(() => {
      const s = (Date.now() - started.current) / 1000
      setLeft(Math.max(0, Math.ceil(total - s)))
      if (s >= total) { clearInterval(tick); finish() }
    }, 500)
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', onVisible); if (lock) lock.release().catch(() => {}) }
  }, [state, minutes]) // eslint-disable-line react-hooks/exhaustive-deps

  const done = Math.max(0, 1 - left / (minutes * 60)), R = 46, C = 2 * Math.PI * R
  return (
    <div className={'sit sit-' + state} onClick={state === 'sitting' ? () => setShowTime((v) => !v) : undefined}>
      <button type="button" className="icon-btn sit-x" onClick={(e) => { e.stopPropagation(); goBack('/') }} aria-label="Leave">✕</button>
      {state === 'ready' && (
        <div className="sit-t">
          <p className="sit-line">{text}</p>
          <p className="sit-who">{who}</p>
          <div className="sit-len" role="group" aria-label="How long">
            <button type="button" className="sit-step" onClick={() => setMinutes(minutes - 1)} aria-label="One minute less">−</button>
            <span className="sit-min"><b>{minutes}</b> min</span>
            <button type="button" className="sit-step" onClick={() => setMinutes(minutes + 1)} aria-label="One minute more">+</button>
          </div>
          <div className="choice-row sit-quick" role="group" aria-label="Lengths">
            {LENGTHS.map((m) => <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m}</button>)}
          </div>
          <button type="button" className="btn sit-begin" onClick={() => { bowl(); started.current = Date.now(); setLeft(minutes * 60); setState('sitting') }}>Begin</button>
        </div>
      )}
      {state === 'sitting' && (
        <>
          <svg className="sit-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={R} className="sit-ring-bg" />
            <circle cx="50" cy="50" r={R} className="sit-ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - done)} />
          </svg>
          <p className={'sit-left' + (showTime ? ' on' : '')} aria-live="off">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</p>
          <button type="button" className="sit-end" onClick={(e) => { e.stopPropagation(); finish() }}>End</button>
        </>
      )}
      {state === 'done' && (
        <div className="sit-t">
          <p className="sit-line">{sat >= minutes ? `${minutes} minutes.` : `${Math.max(1, sat)} minute${sat === 1 ? '' : 's'}.`}</p>
          <p className="sit-sky">{morningSky(new Date(), SunCalc, (d) => hm.format(d))}</p>
          {glance.notes > 0 && <p className="sit-note">{glance.notes === 1 ? 'A note from your past self is waiting.' : `${glance.notes} notes from your past self are waiting.`}</p>}
          {session && prefs.sitJournal !== false && !glance.written ? (
            <div className="sit-next">
              <button type="button" className="btn" onClick={() => navigate('/us/journal', { replace: true })}>On to your journal ›</button>
              <button type="button" className="btn ghost" onClick={() => goBack('/')}>Done</button>
            </div>
          ) : <button type="button" className="btn" onClick={() => goBack('/')}>Done</button>}
        </div>
      )}
    </div>
  )
}
