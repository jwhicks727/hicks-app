import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { Toast } from '../ui/Toast.jsx'
import { usePrefs } from '../lib/prefs.js'
import { sitLineFor } from '../lib/mindful.js'
import { readSitDay, sitStateFor, markSitDay, clearSitDay, reminderOn, sitHeading } from '../lib/sitReminder.js'
import './sit-reminder.css'

/**
 * The day's sit, first on Home until it's done or skipped (src/lib/sitReminder.js). "Sit now" opens the sit;
 * finishing it there marks the day. "Done already" is for one sat elsewhere, "Skip today" for a day without,
 * and the small line at the foot stops the reminder on this device. Each goes at once, with an Undo.
 */
export default function SitReminder({ me, today, hour }) {
  const [prefs, update] = usePrefs()
  const [stored, setStored] = useState(() => readSitDay(localStorage))
  const [undo, setUndo] = useState(null)
  const on = reminderOn(prefs, me)
  const due = on && sitStateFor(stored, today) === 'due'
  const minutes = prefs.sitMinutes || 10
  const [line, who] = sitLineFor(today)
  const close = (kind) => {
    if (kind === 'off') { update({ sitReminder: false }); setUndo({ kind, text: 'No more sit reminders on this device. Settings can bring them back.' }); return }
    markSitDay(localStorage, today, kind)
    setStored(readSitDay(localStorage))
    setUndo({ kind, text: kind === 'sat' ? 'Today’s sit is done.' : 'Skipped for today.' })
  }
  const undoIt = () => {
    if (undo.kind === 'off') update({ sitReminder: true })
    else { clearSitDay(localStorage, today); setStored(readSitDay(localStorage)) }
    setUndo(null)
  }
  return (
    <>
      {due && (
        <Card tint="#7C6BB3" label="The day’s sit" glyph="sunmoon" className="span-6 sr-card">
          <h2 className="sr-head">{sitHeading(hour, minutes)}</h2>
          <p className="sr-line">“{line}”{who && <small> {who}</small>}</p>
          <div className="sr-acts">
            <Link className="btn sr-go" to="/home/sit">Sit now · {minutes} min</Link>
            <button type="button" className="btn ghost" onClick={() => close('sat')}>Done already</button>
            <button type="button" className="btn ghost" onClick={() => close('skipped')}>Skip today</button>
          </div>
          <button type="button" className="sr-off" onClick={() => close('off')}>Don’t remind me on this device</button>
        </Card>
      )}
      {undo && <Toast key={undo.kind} action="Undo" onAction={undoIt} onClose={() => setUndo(null)}>{undo.text}</Toast>}
    </>
  )
}
