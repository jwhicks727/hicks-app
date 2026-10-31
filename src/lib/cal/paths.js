// ============================================
// paths.js -- the calendar's addresses
// ============================================
// /calendar                       this month
// /calendar/day/2026-11-01        a day
// /calendar/week/2026-11-01       the week (Sunday to Saturday) holding a day
// /calendar/month/2026-11         a month
// /calendar/year/2026             a year
// Anything else reads as this month. Switching view, or stepping to the
// next one, replaces the address; opening a day from a month adds a step.

import { ds, parts, addDays, sundayOnOrBefore, daysInMonth } from './dates.js'

export const VIEWS = ['day', 'week', 'month', 'year']
const DATE = /^\d{4}-\d\d-\d\d$/
const valid = (d) => DATE.test(d) && ds(...parts(d)) === d

/** { view, date } from the path after /calendar. `date` is always a full day. */
export function parseCalPath(rest, today) {
  const [view, arg] = rest
  if (view === 'day' && valid(arg)) return { view, date: arg }
  if (view === 'week' && valid(arg)) return { view, date: sundayOnOrBefore(arg) }
  if (view === 'month' && /^\d{4}-\d\d$/.test(arg) && valid(`${arg}-01`)) return { view, date: sameDayIn(today, `${arg}-01`) }
  if (view === 'year' && /^\d{4}$/.test(arg)) return { view, date: arg === today.slice(0, 4) ? today : `${arg}-01-01` }
  return { view: 'month', date: today }
}
// Inside another month, the day to hold: today if it's there, else the 1st.
function sameDayIn(today, first) { return today.slice(0, 7) === first.slice(0, 7) ? today : first }

export function calPath(view, date) {
  if (view === 'day') return `/calendar/day/${date}`
  if (view === 'week') return `/calendar/week/${sundayOnOrBefore(date)}`
  if (view === 'year') return `/calendar/year/${date.slice(0, 4)}`
  return `/calendar/month/${date.slice(0, 7)}`
}

/** The date `n` periods away, holding the day of the month where it can. */
export function stepDate(view, date, n) {
  const [y, m, d] = parts(date)
  if (view === 'day') return addDays(date, n)
  if (view === 'week') return addDays(date, 7 * n)
  if (view === 'year') return ds(y + n, 1, 1)
  const tm = m + n, ty = y + Math.floor((tm - 1) / 12), mm = ((tm - 1) % 12 + 12) % 12 + 1
  return ds(ty, mm, Math.min(d, daysInMonth(ty, mm)))
}

/** The days a month grid shows: whole weeks, Sunday first. */
export function monthGrid(date) {
  const [y, m] = parts(date)
  const first = ds(y, m, 1), last = ds(y, m, daysInMonth(y, m))
  const start = sundayOnOrBefore(first), out = []
  for (let d = start; d <= last || out.length % 7; d = addDays(d, 1)) out.push(d)
  return out
}

/** The first and last day a view shows, for loading events. */
export function viewRange(view, date) {
  if (view === 'day') return [date, date]
  if (view === 'week') { const s = sundayOnOrBefore(date); return [s, addDays(s, 6)] }
  if (view === 'year') return [`${date.slice(0, 4)}-01-01`, `${date.slice(0, 4)}-12-31`]
  const g = monthGrid(date); return [g[0], g[g.length - 1]]
}
