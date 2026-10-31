import { useTimers, stopTimer, clock } from '../lib/kitchen/timers.js'

/** The running kitchen timers, docked above the tab bar. A finished one glows until tapped. */
export default function Timers() {
  const timers = useTimers()
  if (!timers.length) return null
  return (
    <div className="timers" role="status" aria-live="polite">
      {timers.map((t) => (
        <button key={t.id} type="button" className={'timer' + (t.left === 0 ? ' done' : '')} onClick={() => stopTimer(t.id)} aria-label={`${t.label}: ${t.left === 0 ? 'done' : clock(t.left) + ' left'}. Tap to clear.`}>
          <b>{t.left === 0 ? 'Done' : clock(t.left)}</b><span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
