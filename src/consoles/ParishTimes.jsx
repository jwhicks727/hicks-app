import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { useParish } from '../lib/useParish.js'
import { PARISH, massWords, massesOn } from '../lib/cal/sacredHeart.js'
import { HOME_TOWN } from '../lib/sky.js'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const when = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

/** Admin: Sacred Heart's Mass times as last read from its website, and a way to read them again. */
export default function ParishTimes() {
  const [read, readAgain] = useParish()
  const [busy, setBusy] = useState(false)
  const s = read && read.schedule
  const again = async () => { setBusy(true); await readAgain(); setBusy(false) }
  return (
    <Card tint="#B8322A" label="Mass times" glyph="calendar" tag={PARISH.name} className="span-6 parish-admin">
      {s ? (
        <>
          <p className="muted">Read from <a href={read.url || PARISH.site} target="_blank" rel="noreferrer">the parish’s website</a>: this week first seen {when(read.read_at)}, last checked {when(read.checked_at)}. The app checks once a day and keeps every week the parish has posted.</p>
          <dl className="parish-week">
            {DAYS.map((d, i) => { const list = massesOn(i, s); return (
              <div key={d}>
                <dt>{d}</dt>
                <dd>{list.length ? list.map((m) => <span key={m.time} className="nw">{m.time}{massWords({ ...m, daily: false }) && ` ${massWords({ ...m, daily: false })}`}</span>).reduce((a, x, k) => (k ? [...a, ' · ', x] : [x]), []) : '—'}
                  {list.some((m) => m.daily) && <em className="daily-tag">Daily Mass</em>}
                  {s.confession && s.confession[i] && <span className="conf"> Confession {s.confession[i].join(', ')}</span>}
                </dd>
              </div>
            ) })}
          </dl>
        </>
      ) : (
        <p className="muted">Not read yet: until the parish’s website is read, the app shows {PARISH.listing}, marked unchecked.</p>
      )}
      {read && read.error && <p className="nudge" role="status">{read.error}</p>}
      <button type="button" className="btn ghost" disabled={busy} onClick={again}>{busy ? 'Reading…' : 'Read it again'}</button>
    </Card>
  )
}
