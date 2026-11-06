import { useMemo } from 'react'
import { useSession } from '../lib/auth.js'
import { useFamily, useEvents, useEvent } from '../lib/useCalendar.js'
import { usePrefs } from '../lib/prefs.js'
import { useNow } from '../lib/useNow.js'
import { todayAt, parts, MONTHS, WEEKDAYS, addDays } from '../lib/cal/dates.js'
import { parseCalPath, viewRange } from '../lib/cal/paths.js'
import { annotateEvents } from '../lib/cal/schools.js'
import { dedupeEvents } from '../lib/cal/tidy.js'
import { CalHead, SeasonStrip, WhoFilter } from '../calendar/CalHead.jsx'
import MonthView from '../calendar/MonthView.jsx'
import WeekView from '../calendar/WeekView.jsx'
import DayView from '../calendar/DayView.jsx'
import YearView from '../calendar/YearView.jsx'
import Coming from '../parts/Coming.jsx'
import EventForm from '../calendar/EventForm.jsx'
import EventPage from '../calendar/EventPage.jsx'
import Readings from '../calendar/Readings.jsx'
import { Link } from '../shell/Link.jsx'
import '../calendar/calendar.css'

const VIEW = { day: DayView, week: WeekView, month: MonthView, year: YearView }

function titleFor(view, date, today) {
  const [y, m, d] = parts(date), thisYear = y === parts(today)[0]
  if (view === 'year') return String(y)
  if (view === 'month') return thisYear ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`
  if (view === 'week') {
    const [ey, em, ed] = parts(addDays(date, 6))
    const end = em === m ? ed : `${MONTHS[em - 1].slice(0, 3)} ${ed}`
    return `${MONTHS[m - 1].slice(0, 3)} ${d} – ${end}${ey !== parts(today)[0] ? `, ${ey}` : ''}`
  }
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return date === today ? `Today, ${MONTHS[m - 1]} ${d}` : `${wd}, ${MONTHS[m - 1]} ${d}${thisYear ? '' : `, ${y}`}`
}

// Besides the views (paths.js): /calendar/new/<date>, /calendar/event/<id>, /calendar/event/<id>/edit
export default function Calendar({ rest }) {
  const now = useNow()
  const today = todayAt('America/Los_Angeles', now)
  const session = useSession()
  const family = useFamily(session)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const one = useEvent(rest[0] === 'event' ? session : null, rest[0] === 'event' ? rest[1] : null)
  if (rest[0] === 'day' && rest[2] === 'readings' && /^\d{4}-\d\d-\d\d$/.test(rest[1])) return <Readings date={rest[1]} variant={/^[A-Za-z0-9]{1,20}$/.test(rest[3] || '') ? rest[3] : ''} session={session} />
  if (rest[0] === 'new') return <EventForm date={/^\d{4}-\d\d-\d\d$/.test(rest[1] || '') ? rest[1] : today} members={family.people} />
  if (rest[0] === 'event' && rest[2] === 'edit') return one.loaded ? <EventForm event={one.event && { ...one.event, for_whom: family.canon(one.event.for_whom) }} date={one.event ? one.event.starts_on : today} members={family.people} /> : null
  if (rest[0] === 'event') return <EventPage state={one} members={family.people} parent={Boolean(me && me.role === 'parent')} today={today} me={me} />
  return <Views rest={rest} today={today} session={session} family={family} />
}

function Views({ rest, today, session, family }) {
  const { view, date } = parseCalPath(rest, today)
  const [from, to] = viewRange(view, date)
  const { events: raw } = useEvents(session, from, to)
  const events = useMemo(() => dedupeEvents(annotateEvents(raw.map((e) => ({ ...e, for_whom: family.canon(e.for_whom) })), family.sources, family.people)), [raw, family.sources, family.people, family.canon])
  const [prefs, update] = usePrefs()
  const who = family.people.some((m) => m.id === prefs.calendarWho) ? prefs.calendarWho : null
  const data = useMemo(() => ({ familyDays: family.days, events, groups: prefs.calendarGroups || null, who }), [family.days, events, prefs.calendarGroups, who])
  const View = VIEW[view]
  return (
    <>
      <CalHead view={view} date={date} today={today} title={titleFor(view, date, today)}>
        {(view === 'month' || view === 'year') && <SeasonStrip date={date} today={today} />}
      </CalHead>
      {session && <Link className="btn new-event span-6" to={`/calendar/new/${view === 'day' ? date : today}`}>+ Something new</Link>}
      <WhoFilter members={family.people} who={who} onChange={(id) => update({ calendarWho: id })} />
      <View date={date} today={today} data={data} signedIn={Boolean(session)} family={family} />
      {view === 'month' && (
        <Coming tint="#3E7A4C" glyph="calendar" className="span-6" title="Still coming to the calendar" items={[
          'Our Google calendars, synced both ways',
          'The school calendars read from Admin: Kordyak, Wayne Ruble and SOAR side by side in the year view',
          'Laurie’s lectoring from her monthly email, and Anna’s altar serving and ministry',
          'Catholic and saint line art for the feasts, and art for the seasons and holidays',
        ]} />
      )}
    </>
  )
}
