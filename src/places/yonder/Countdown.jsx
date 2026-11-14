import { Card } from '../../ui/Card.jsx'
import { Link } from '../../shell/Link.jsx'
import { useTripEvents } from '../../lib/useCalendar.js'
import { useTravelSettings } from '../../lib/useAround.js'
import { dedupeEvents } from '../../lib/cal/tidy.js'
import { HOME_TOWN } from '../../lib/sky.js'
import { datesWords } from '../../lib/life/trips.js'
import { homeCountdowns, milestoneTrip, stampKind, waitWords } from '../../lib/yonder.js'
import Stamp from './Stamp.jsx'
import './yonder.css'

// The countdowns to the trips we've planned (Laurie's idea: Anna loves a good
// countdown). Every trip on the calendar with a place on the map, however far
// off, lives in the travel app; from two months out it has a card on Home too.
// A trip's own words stay where the calendar shows them; never on the wall.

const whoseOf = (members, id) => (id && (members || []).find((m) => m.id === id)) || null

/** One trip counting down: the sleeps big, then what and when, and its stamp. A milestone day gets the rainbow gleam. */
export function CountdownRow({ trip, today, members, gleam = false }) {
  const who = whoseOf(members, trip.for_whom)
  const wait = waitWords(today, trip.starts_on)
  const town = trip.town && !trip.title.toLowerCase().includes(trip.town.toLowerCase()) ? trip.town : ''
  return (
    <Link className={'yo-count' + (gleam ? ' yo-gleaming' : '')} to={`/calendar/event/${trip.id}`}>
      <span className={'yo-count-fig' + (trip.sleeps >= 1000 ? ' long' : '')}><b>{trip.sleeps.toLocaleString('en-US')}</b><small>{trip.sleeps === 1 ? 'sleep' : 'sleeps'}</small></span>
      <span className="yo-count-what">
        <b>{trip.title}</b>
        <small>{[datesWords(trip, today), town, who ? `${who.name}’s trip` : null].filter(Boolean).join(' · ')}</small>
        {wait && <small className="yo-count-wait">{wait} to go</small>}
      </span>
      <Stamp kind={stampKind(trip)} name={trip.town} date={trip.starts_on} size={46} tilt={-5} />
      {gleam && <i className="yo-gleam" aria-hidden="true" />}
    </Link>
  )
}

/**
 * A list of countdowns; the first trip on a milestone day (100 sleeps, 10 sleeps…)
 * gleams. A screen with another countdown passes `shining` so only one gleams.
 */
export function CountdownList({ trips, today, members, shining = milestoneTrip(trips) }) {
  return (
    <ul className="yo-counts">
      {trips.map((t) => <li key={t.id}><CountdownRow trip={t} today={today} members={members} gleam={shining === t} /></li>)}
    </ul>
  )
}

/**
 * Home: the trips starting within two months, counting their sleeps. In a trip's
 * last three days the Coming up card (its forecast and packing) takes over.
 */
export function CountdownCard({ session, today, members }) {
  const { events } = useTripEvents(session, today)
  const { appName } = useTravelSettings()
  const trips = homeCountdowns(dedupeEvents(events), today, HOME_TOWN)
  if (!trips.length) return null
  const shown = trips.slice(0, 3)
  return (
    <Card tint="#2F7D7A" label="Counting down" glyph="calendar" className="span-3 yo-countdown">
      <CountdownList trips={shown} today={today} members={members} />
      <Link className="btn ghost" to="/yonder">{trips.length > shown.length ? `${trips.length - shown.length} more, and every trip ahead, in ${appName} ›` : `Every trip ahead in ${appName} ›`}</Link>
    </Card>
  )
}
