// Calendar dates as 'YYYY-MM-DD' strings, done in UTC arithmetic so a date
// never slides a day at home (new Date('2026-11-01') is the evening before
// in Pacific time). Pure: tests run it in Node.

export function ds(y, m, d) {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.toISOString().slice(0, 10)
}
export function parts(s) { return s.split('-').map(Number) }
export function addDays(s, n) { const [y, m, d] = parts(s); return ds(y, m, d + n) }
export function dow(s) { const [y, m, d] = parts(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
export function diffDays(a, b) { const [y1, m1, d1] = parts(a), [y2, m2, d2] = parts(b); return (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5 }
export function sundayOnOrBefore(s) { return addDays(s, -dow(s)) }
export function sundayOnOrAfter(s) { return addDays(s, (7 - dow(s)) % 7) }
/** The nth weekday (0 = Sunday) of a month; n = -1 is the last one. */
export function nthWeekday(y, m, weekday, n) {
  if (n > 0) { const first = ds(y, m, 1); return addDays(first, ((weekday - dow(first) + 7) % 7) + (n - 1) * 7) }
  const last = ds(y, m + 1, 0); return addDays(last, -((dow(last) - weekday + 7) % 7))
}
export function daysInMonth(y, m) { return parts(ds(y, m + 1, 0))[2] }
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
const WORDS = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth']
export function ordinalWord(n) { return WORDS[n] || ordinal(n) }
/** Today at home, as a calendar date. */
export function todayAt(tz = 'America/Los_Angeles', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now)
}

/** A wall-clock time at home ('YYYY-MM-DD', 'HH:MM') as an ISO instant, daylight time included. */
export function homeInstant(d, hm, tz = 'America/Los_Angeles') {
  const [y, m, dd] = parts(d), [h, mi] = hm.split(':').map(Number)
  const offset = (t) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t)).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]))
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - t
  }
  const guess = Date.UTC(y, m - 1, dd, h, mi)
  return new Date(guess - offset(guess - offset(guess))).toISOString()
}
