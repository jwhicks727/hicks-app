import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { liturgicalDay, COLOUR_NAMES } from '../lib/cal/liturgy.js'
import { invitation, PRAYERS } from '../lib/cal/prayers.js'
import { observancesOn } from '../lib/cal/observances.js'
import { parishDay } from '../lib/cal/sacredHeart.js'
import { moonOn } from '../lib/cal/day.js'
import { addDays } from '../lib/cal/dates.js'
import { usePrefs } from '../lib/prefs.js'

/** Today in the Church and on the calendar, with a warm word to pray. */
export default function TodayCard({ today, hour }) {
  const [prefs] = usePrefs()
  const lit = liturgicalDay(today), inv = invitation(today, lit, hour)
  const also = observancesOn(today, prefs.calendarGroups || null).filter((o) => !o.ongoing)
  const moon = moonOn(today)
  const parish = parishDay(today, lit, liturgicalDay(addDays(today, 1)))
  const later = parish.mass.filter((t) => { const m = t.match(/^(\d{1,2}):(\d\d) ([AP])M/); if (!m) return false; const h = (Number(m[1]) % 12) + (m[3] === 'P' ? 12 : 0); return h > hour })
  return (
    <Card tint={lit.colourHex} label="Today" glyph="calendar" tag={COLOUR_NAMES[lit.colour]} className="span-3 today-card">
      <h2>{lit.name}</h2>
      {lit.optional && !inv.own && <p className="muted">Or keep {lit.optional}.</p>}
      <div className="today-pray">
        <p>{inv.words}</p>
        {inv.invocation && <p className="prayer">“{inv.invocation}”</p>}
        {inv.prayer && <details className="prayer-text"><summary>Pray {PRAYERS[inv.prayer].name.replace(/^The /, 'the ').replace(/^An /, 'an ')}</summary><p className="prayer">{PRAYERS[inv.prayer].text}</p></details>}
      </div>
      {(also.length > 0 || moon) && (
        <p className="today-also">{[...also.map((o) => o.name), moon && (moon.key === 'full' ? `${moon.moonName}, full tonight` : moon.name)].filter(Boolean).join(' · ')}</p>
      )}
      {parish.note ? <p className="nudge">{parish.note}</p> : later.length > 0 && <p className="muted">Mass at Sacred Heart later today: {later.join(' · ')}</p>}
      <Link className="btn ghost" to={`/calendar/day/${today}`}>The whole day ›</Link>
    </Card>
  )
}
