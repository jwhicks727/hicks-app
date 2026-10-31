import { useMemo } from 'react'
import { useSession } from '../lib/auth.js'
import { useFamily, useEvents } from '../lib/useCalendar.js'
import { usePrefs } from '../lib/prefs.js'
import { useNow } from '../lib/useNow.js'
import { todayAt, parts, MONTHS, WEEKDAYS, addDays } from '../lib/cal/dates.js'
import { parseCalPath, viewRange } from '../lib/cal/paths.js'
import { CalHead, SeasonStrip, WhoFilter } from '../calendar/CalHead.jsx'
import MonthView from '../calendar/MonthView.jsx'
import WeekView from '../calendar/WeekView.jsx'
import DayView from '../calendar/DayView.jsx'
import YearView from '../calendar/YearView.jsx'
import Coming from '../parts/Coming.jsx'
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

export default function Calendar({ rest }) {
  const now = useNow()
  const today = todayAt('America/Los_Angeles', now)
  const { view, date } = parseCalPath(rest, today)
  const session = useSession()
  const family = useFamily(session)
  const [from, to] = viewRange(view, date)
  const { events } = useEvents(session, from, to)
  const [prefs, update] = usePrefs()
  const who = family.members.some((m) => m.id === prefs.calendarWho) ? prefs.calendarWho : null
  const data = useMemo(() => ({ familyDays: family.days, events, groups: prefs.calendarGroups || null, who }), [family.days, events, prefs.calendarGroups, who])
  const View = VIEW[view]
  return (
    <>
      <CalHead view={view} date={date} today={today} title={titleFor(view, date, today)}>
        {(view === 'month' || view === 'year') && <SeasonStrip date={date} today={today} />}
      </CalHead>
      <WhoFilter members={family.members} who={who} onChange={(id) => update({ calendarWho: id })} />
      <View date={date} today={today} data={data} signedIn={Boolean(session)} family={family} />
      {view === 'month' && (
        <Coming tint="#3E7A4C" glyph="calendar" className="span-6" title="Still coming to the calendar" items={[
          'Our Google calendars, synced both ways',
          'The school calendars read from Setup: Kordyak, Wayne Ruble and SOAR side by side in the year view',
          'Laurie’s lectoring from her monthly email, and Anna’s altar serving and ministry',
          'Catholic and saint line art for the feasts, and art for the seasons and holidays',
          'Concerts as special events, with their ticket and scrapbook',
        ]} />
      )}
    </>
  )
}
