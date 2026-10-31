import { Card } from '../ui/Card.jsx'
import { observancesOn } from '../lib/cal/observances.js'
import { usePrefs } from '../lib/prefs.js'

/** What's in season out there: the eagles, the monarchs, the whales, with who watches them. */
export default function WildNow({ date, className = 'span-3', title = 'Wild right now' }) {
  const [prefs] = usePrefs()
  const wild = observancesOn(date, prefs.calendarGroups || null).filter((o) => o.group === 'wild')
  if (!wild.length) return null
  return (
    <Card tint="#5F8A4A" label={title} glyph="bird" className={className + ' wild-card'}>
      <ul className="wild">
        {wild.map((o) => (
          <li key={o.id}>
            <b>{o.name}</b>
            <span>{o.word}.</span>
            {o.links && <span className="wild-links">{o.links.map(([l, u]) => <a key={u} href={u} target="_blank" rel="noopener noreferrer">{l} ›</a>)}</span>}
          </li>
        ))}
      </ul>
    </Card>
  )
}
