// ============================================
// daysOff.js -- how long until each school's next day off
// ============================================
// From the school calendars' approved no-school days (src/lib/cal/schools.js):
// for each of us with a school, the next day off within a few weeks, what
// it's called, and how many school days are left before it. Pure.

import { SCHOOLS } from './cal/schools.js'
import { addDays, dow } from './cal/dates.js'

/** [{ school, person, date, title, schoolDays }] soonest first; `off` is noSchoolDays()'s map, `titles` date -> school key -> title. */
export function nextDaysOff({ off, titles = {}, today, within = 28 }) {
  const out = []
  for (const s of SCHOOLS) {
    let date = null
    for (let i = 1; i <= within; i++) { const d = addDays(today, i); if (off[d] && off[d].has(s.key)) { date = d; break } }
    if (!date) continue
    let schoolDays = 0
    for (let d = addDays(today, 1); d < date; d = addDays(d, 1)) if (dow(d) !== 0 && dow(d) !== 6 && !(off[d] && off[d].has(s.key))) schoolDays++
    out.push({ school: s, person: s.person, date, title: (titles[date] && titles[date][s.key]) || 'No school', schoolDays })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}
/** "3 school days to go", "Tomorrow", "After the weekend". */
export function daysOffWords(x) {
  if (x.schoolDays === 0) return x.date && dow(x.date) === 1 ? 'After the weekend' : 'Next school day'
  return `${x.schoolDays} school ${x.schoolDays === 1 ? 'day' : 'days'} to go`
}
