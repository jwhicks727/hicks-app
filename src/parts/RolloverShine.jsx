import { useSession } from '../lib/auth.js'
import { useSources, todayAtHome } from '../lib/useSources.js'
import { staleness } from '../lib/sources.js'
import { Link } from '../shell/Link.jsx'

/** A job waiting gets the shine: calendars to roll over, the count on its face. Only while there is one. */
export default function RolloverShine() {
  const session = useSession()
  const { rows } = useSources(session)
  if (!rows) return null
  const today = todayAtHome()
  const due = rows.filter((s) => ['stale', 'soon'].includes(staleness(s, today).state))
  if (!due.length) return null
  return (
    <Link to="/setup" className="shine span-6">
      <span>{due.length === 1 ? `${due[0].title} needs next year’s` : 'Calendars need rolling over'}</span>
      <span className="n">{due.length}</span>
    </Link>
  )
}
