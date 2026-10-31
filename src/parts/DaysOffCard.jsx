import { Card } from '../ui/Card.jsx'
import { useSession } from '../lib/auth.js'
import { useEvents, useFamily } from '../lib/useCalendar.js'
import { useSources } from '../lib/useSources.js'
import { noSchoolDays, annotateEvents } from '../lib/cal/schools.js'
import { tidyTitle } from '../lib/cal/tidy.js'
import { addDays } from '../lib/cal/dates.js'
import { nextDaysOff, daysOffWords } from '../lib/daysOff.js'

const fmt = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })

/** Home: how many school days until each of us has a day off, from the school calendars. Only when one is near. */
export default function DaysOffCard({ today }) {
  const session = useSession()
  const family = useFamily(session)
  const { rows: sources } = useSources(session)
  const { events } = useEvents(session, today, addDays(today, 28))
  if (!session || !sources || !family.members.length) return null
  const notes = annotateEvents(events, sources, family.members)
  const off = noSchoolDays(notes, sources, family.members)
  const titles = {}
  for (const e of notes) if (e.kind === 'no_school' && e.school) for (let d = e.starts_on; d <= e.ends_on; d = addDays(d, 1)) (titles[d] ||= {})[e.school.key] = tidyTitle(e.title)
  const next = nextDaysOff({ off, titles, today })
  if (!next.length) return null
  return (
    <Card tint="#4A7FD6" label="Days off coming" glyph="calendar" className="span-3">
      <ul className="daysoff">
        {next.map((x) => (
          <li key={x.school.key}>
            <i style={{ background: x.school.colour }} />
            <span className="do-t"><span><b>{x.person}</b> · {x.school.name}</span><span className="do-sub">{x.title}, {fmt(x.date)}</span></span>
            <em className="fig">{daysOffWords(x)}</em>
          </li>
        ))}
      </ul>
    </Card>
  )
}
