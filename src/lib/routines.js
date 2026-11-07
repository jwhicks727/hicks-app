// ============================================
// routines.js -- each of us has a morning list and an evening list
// ============================================
// Early Bird and Night Owl (or whichever names Admin chose, NAMES). What comes
// up on a day is worked out from each thing's own rule, never a list of dates:
// which weekdays, every week or every other, any day or only school days (or
// days off), taking turns through a rotation, for a while or for good. A day
// that's different has its own changes: something skipped, something added
// just for the day, or a day of rest that holds a streak without breaking it.
// Streaks, records and milestones are read from how each day went
// (`routine_days`, which holds no words). Pure, so tests run it in Node.

import { addDays, diffDays, dow, sundayOnOrBefore, todayAt } from './cal/dates.js'
import { SCHOOLS, noSchoolDays, schoolsWithCalendars } from './cal/schools.js'

export const PARTS = ['morning', 'evening']

// The names, chosen in Admin. Each is a pair: the morning's and the evening's.
export const NAMES = {
  birds: { morning: 'Early Bird', evening: 'Night Owl', both: 'Early Bird & Night Owl', line: 'A hummingbird for the morning, an owl for the night' },
  sun: { morning: 'Sunup', evening: 'Sundown', both: 'Sunup & Sundown', line: 'The sky at each end of the day' },
  shine: { morning: 'Rise & Shine', evening: 'Wind Down', both: 'Rise & Shine, Wind Down', line: 'Up and at it, then easy does it' },
  light: { morning: 'First Light', evening: 'Last Light', both: 'First Light & Last Light', line: 'From the first light to the last' },
  chorus: { morning: 'Dawn Chorus', evening: 'Evensong', both: 'Dawn Chorus & Evensong', line: 'The birds’ songs at dawn, and the evening’s' },
}
export const namesFor = (key) => NAMES[key] || NAMES.birds

// The day turns over at three in the morning: a Night Owl list finished at
// half past midnight still belongs to the evening before.
export const TURN_HOUR = 3

const hourAt = (now, tz) => +new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now)

/** The lists' day at home: the calendar date, except that the small hours (before 3) still belong to the day before. */
export function listDay(now = new Date(), tz = 'America/Los_Angeles') {
  const today = todayAt(tz, now)
  return hourAt(now, tz) < TURN_HOUR ? addDays(today, -1) : today
}

/** Which list the hour asks for first: the morning's from 3 until 2 in the afternoon, then the evening's. */
export const partForHour = (hour) => (hour >= TURN_HOUR && hour < 14 ? 'morning' : 'evening')

/** Minutes after midnight at home of an instant (for "done by 7:12"). */
export function minutesAtHome(iso, tz = 'America/Los_Angeles') {
  if (!iso) return null
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(iso)).filter((x) => x.type !== 'literal').map((x) => [x.type, +x.value]))
  return p.hour * 60 + p.minute
}
/** 7:05 AM, from minutes after midnight. */
export function clockWords(min) {
  if (min == null) return ''
  const h = Math.floor(min / 60) % 24, m = min % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// ---- What comes up on a day ---------------------------------------------------------

/** How many times an item came up (by its weekdays and weeks) from its first day to the day before `date`. */
export function timesBefore(item, date) {
  const start = item.starts_on
  if (!start || date <= start) return 0
  const set = [...new Set(item.weekdays && item.weekdays.length ? item.weekdays : [0, 1, 2, 3, 4, 5, 6])]
  const every = item.every_weeks || 1
  const weeks = diffDays(sundayOnOrBefore(start), sundayOnOrBefore(date)) / 7
  let n = Math.ceil(weeks / every) * set.length // the weeks it was on before this one
  n -= set.filter((w) => w < dow(start)).length // its first week began on its first day
  if (weeks % every === 0) n += set.filter((w) => w < dow(date)).length // this week, so far
  return Math.max(0, n)
}

/**
 * Whether an item comes up on a date, and as what: null, or { title, turn, maybe }.
 * `schoolDay(date)` says true, false or null (not known); an item for school
 * days (or days off) on a day nobody knows comes back with `maybe: true`.
 * A rotation's turn moves on each time the item comes up by its weekdays.
 */
export function itemOn(item, date, schoolDay = () => null) {
  if (!item) return null
  if (item.starts_on && date < item.starts_on) return null
  if (item.ends_on && date > item.ends_on) return null
  if (item.archived_on && date >= item.archived_on) return null
  const days = item.weekdays && item.weekdays.length ? item.weekdays : [0, 1, 2, 3, 4, 5, 6]
  if (!days.includes(dow(date))) return null
  const every = item.every_weeks || 1
  if (every > 1 && item.starts_on && (diffDays(sundayOnOrBefore(item.starts_on), sundayOnOrBefore(date)) / 7) % every !== 0) return null
  let maybe = false
  if (item.school === 'school' || item.school === 'off') {
    const s = schoolDay(date)
    if (s == null) maybe = true
    else if (s !== (item.school === 'school')) return null
  }
  const turns = (item.turns || []).filter(Boolean)
  if (!turns.length) return { title: item.title, turn: null, maybe }
  const k = timesBefore(item, date) % turns.length
  return { title: turns[k], turn: { k, of: turns.length, of_what: item.title }, maybe }
}

/** The one stable key of a list's entry: an item's, or something added for the day. */
export const entryKey = (e) => (e.kind === 'extra' ? 'c:' + e.id : 'i:' + e.id)

/**
 * A person's list for one day and part: { rest, restNote, entries }.
 * Entries are the items that come up (less any skipped that day) in their
 * order, then anything added just for the day. A rest day has no entries.
 */
export function dayList({ items = [], changes = [], date, part, schoolDay }) {
  const mine = changes.filter((c) => c.on_date === date && c.part === part)
  const rest = mine.find((c) => c.kind === 'rest')
  const skipped = new Set(mine.filter((c) => c.kind === 'skip').map((c) => c.item_id))
  const out = []
  const sorted = items.filter((i) => i.part === part).sort((a, b) => (a.sort || 0) - (b.sort || 0) || String(a.created_at || '').localeCompare(String(b.created_at || '')))
  for (const it of sorted) {
    const on = itemOn(it, date, schoolDay)
    if (!on) continue
    out.push({ kind: 'item', id: it.id, title: on.title, turn: on.turn, maybe: on.maybe, icon: it.icon || null, item: it, skipped: skipped.has(it.id) })
  }
  for (const c of mine.filter((x) => x.kind === 'add')) out.push({ kind: 'extra', id: c.id, title: c.title, turn: null, maybe: false, icon: null, change: c, skipped: false })
  return { rest: Boolean(rest), restNote: rest ? rest.note || null : null, entries: rest ? [] : out.filter((e) => !e.skipped), skippedEntries: rest ? [] : out.filter((e) => e.skipped) }
}

/** Is an entry ticked, among the day's ticks? */
export const tickFor = (entry, ticks) => ticks.find((t) => (entry.kind === 'extra' ? t.change_id === entry.id : t.item_id === entry.id)) || null

/** How a day went, to keep in `routine_days`: { status, total, done, first_at, done_at }. */
export function daySummary(list, ticks) {
  if (list.rest) return { status: 'rest', total: 0, done: 0, first_at: null, done_at: null }
  const done = list.entries.map((e) => tickFor(e, ticks)).filter(Boolean)
  const times = done.map((t) => t.done_at).filter(Boolean).sort()
  const total = list.entries.length
  const finished = total > 0 && done.length >= total
  return { status: finished ? 'done' : 'open', total, done: done.length, first_at: times[0] || null, done_at: finished ? times[times.length - 1] : null }
}

// ---- Streaks and records ------------------------------------------------------------

/**
 * Each day's mark for one person's list, from its first day to `today`:
 * Map date -> 'done' | 'miss' | 'skip' | 'pending'. A day of rest, or a day
 * with nothing on the list, is skipped: it neither counts nor breaks a streak.
 * A day nobody wrote down is a miss only if something certainly came up
 * (an item kept to school days, on a day the calendar can't say, doesn't
 * count against anyone). Today is pending until it's done.
 */
export function dayMarks({ rows = [], items = [], part, today }) {
  const mine = rows.filter((r) => r.part === part)
  const byDay = new Map(mine.map((r) => [r.on_date, r]))
  const mineItems = items.filter((i) => i.part === part)
  const firsts = [...mine.map((r) => r.on_date), ...mineItems.map((i) => i.starts_on).filter(Boolean)].sort()
  const out = new Map()
  if (!firsts.length) return out
  for (let d = firsts[0]; d <= today; d = addDays(d, 1)) {
    const r = byDay.get(d)
    if (r && r.status === 'done') out.set(d, 'done')
    else if (r && r.status === 'rest') out.set(d, 'skip')
    else if (d === today) out.set(d, 'pending')
    else if (r) out.set(d, r.total > 0 ? 'miss' : 'skip')
    else out.set(d, mineItems.some((i) => { const on = itemOn(i, d); return on && !on.maybe }) ? 'miss' : 'skip')
  }
  return out
}

/**
 * { current, best, bestEnd, ended, doneToday } from dayMarks. `current` counts
 * through today if it's done, else through yesterday; `ended` is the streak a
 * miss broke ({ length, on: the missed day }) when no new one has begun.
 */
export function streakFrom(marks) {
  let run = 0, best = 0, bestEnd = null, ended = null
  for (const [d, m] of marks) {
    if (m === 'done') { run++; if (run > best) { best = run; bestEnd = d }; ended = null }
    else if (m === 'miss') { if (run > 0) ended = { length: run, on: d }; run = 0 }
  }
  const last = [...marks.values()].pop()
  return { current: run, best, bestEnd, ended: run === 0 ? ended : null, doneToday: last === 'done' }
}

/** The best streaks before this one's, longest first (for "your second-longest"). */
export function runsFrom(marks) {
  const runs = []
  let run = 0
  for (const m of marks.values()) {
    if (m === 'done') run++
    else if (m === 'miss') { if (run) runs.push(run); run = 0 }
  }
  if (run) runs.push(run)
  return runs.sort((a, b) => b - a)
}

/**
 * A person's records for one list: how many finished, the earliest finish,
 * the quickest (first tick to last, three or more on the list), golden
 * feathers found, and (mornings) how often the sun was beaten. `sunriseAt(date)`
 * gives that day's sunrise as a Date.
 */
export function recordsFrom(rows, part, { tz = 'America/Los_Angeles', sunriseAt = null } = {}) {
  const done = rows.filter((r) => r.part === part && r.status === 'done' && r.done_at)
  let earliest = null, quickest = null, sun = 0
  for (const r of done) {
    const m = minutesAtHome(r.done_at, tz)
    // Before the day turns over (3 AM) counts as late, not early
    const key = m < TURN_HOUR * 60 ? m + 1440 : m
    if (!earliest || key < earliest.key) earliest = { key, minutes: m, date: r.on_date }
    if (r.first_at && r.total >= 3) {
      const mins = Math.round((Date.parse(r.done_at) - Date.parse(r.first_at)) / 60000)
      if (mins >= 1 && (!quickest || mins < quickest.minutes)) quickest = { minutes: mins, date: r.on_date }
    }
    if (part === 'morning' && sunriseAt) { const s = sunriseAt(r.on_date); if (s && Date.parse(r.done_at) < s.getTime()) sun++ }
  }
  return { finished: done.length, earliest, quickest, golden: rows.filter((r) => r.part === part && r.golden).length, beatSun: sun }
}

/** Weeks (Monday to Sunday, all in the past) when both lists were done every day they were on. */
export function perfectWeeks(morning, evening, today) {
  const days = [...new Set([...morning.keys(), ...evening.keys()])].sort()
  if (!days.length) return 0
  let n = 0
  let mon = addDays(days[0], (8 - dow(days[0])) % 7) // the first whole week
  for (; addDays(mon, 6) < today; mon = addDays(mon, 7)) {
    let ok = true, any = false
    for (let i = 0; i < 7 && ok; i++) {
      const d = addDays(mon, i)
      for (const marks of [morning, evening]) {
        const m = marks.get(d) || 'skip'
        if (m === 'miss') ok = false
        if (m === 'done') any = true
      }
    }
    if (ok && any) n++
  }
  return n
}

// ---- Milestones, perks and the words around them -------------------------------------

export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 730, 1000]
const NOUN = { morning: ['morning', 'mornings'], evening: ['evening', 'evenings'] }
export const noun = (part, n) => NOUN[part][n === 1 ? 0 : 1]

/** The milestone a streak just reached, or null: { n, title }. */
export function milestoneAt(n, part) {
  if (!MILESTONES.includes(n)) return null
  const p = noun(part, n)
  const T = {
    3: 'Three in a row: that’s a streak', 7: `A whole week of ${p}!`, 14: 'Two weeks strong', 21: `Twenty-one ${p}: that’s a habit now`,
    30: `Thirty ${p} running`, 50: `Fifty ${p}!`, 75: 'Seventy-five. Unstoppable.', 100: `One hundred ${p}. Wow.`, 365: `A whole year of ${p}`,
  }
  return { n, title: T[n] || `${n} ${p} in a row` }
}

// What each person's bird has earned, by the longest streak they've ever had:
// never taken back when a streak ends.
export const PERKS = [
  { at: 7, key: 'scarf', name: 'a scarf' },
  { at: 14, key: 'flower', name: 'a flower' },
  { at: 30, key: 'crown', name: 'a crown' },
  { at: 60, key: 'stars', name: 'a ring of stars' },
  { at: 100, key: 'rainbow', name: 'a rainbow tail' },
]
export const perksFor = (best) => PERKS.filter((p) => best >= p.at)
/** The perk a streak earns on the day it reaches it, or null. */
export const perkAt = (n) => PERKS.find((p) => p.at === n) || null

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const num = (n) => NUM[n] || String(n)
const pick = (list, seed) => list[Math.abs(hash(seed)) % list.length]

/** A small, stable number from a string (FNV-1a), for choosing words and golden feathers. */
export function hash(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h | 0
}

const CHEERS = [
  'Today can be day one of the next one.',
  'Every streak starts with one. Here’s one.',
  'Your bird’s still here, and it believes in you.',
  'Missing a day is part of keeping going. Keep going.',
  'The best streaks have a restart in them somewhere.',
  'Same you, fresh start. Let’s go.',
]

/** The words when a streak has ended: { title, line, cheer }. `runs` are all streaks, longest first. */
export function mournWords({ length, part, runs = [], on, today, seed = '' }) {
  const p = noun(part, length)
  const when = on === addDays(today, -1) ? 'yesterday' : on === today ? 'today' : 'the other day'
  const place = runs.indexOf(length)
  const line = place === 0 ? `It was your longest ever, and it still counts: ${num(length)} ${p} really happened.`
    : place === 1 ? `It was your second-longest. ${cap(num(length))} ${p} still happened.`
      : `${cap(num(length))} ${p} in a row is worth being proud of.`
  return { title: `Your ${length}-${NOUN[part][0]} streak ended ${when}.`, line, cheer: pick(CHEERS, seed + on) }
}
const cap = (s) => s[0].toUpperCase() + s.slice(1)

/** A line under the list as it goes. */
export function progressWords(done, total, seed = '') {
  if (!total) return ''
  const left = total - done
  if (left <= 0) return 'All done!'
  if (left === 1) return pick(['Last one!', 'One to go!', 'Just one more.'], seed)
  if (done === 0) return pick(['Here we go.', 'One tick at a time.', 'Ready when you are.'], seed)
  if (done * 2 >= total) return `${cap(num(left))} to go. More than halfway!`
  return `${cap(num(left))} to go.`
}

/** The line when a list is finished: with the streak, a record, or the sun. */
export function doneWords({ part, streak, best, previousBest, minutes, beatSunBy }) {
  const lines = []
  if (streak >= 2) lines.push(`${streak} ${noun(part, streak)} in a row`)
  if (streak > 1 && streak > previousBest) lines.push('your longest yet!')
  if (beatSunBy) lines.push(`you beat the sun by ${beatSunBy} ${beatSunBy === 1 ? 'minute' : 'minutes'}`)
  return { head: minutes != null ? `Done by ${clockWords(minutes)}` : 'All done', line: lines.join(' · ') }
}

/**
 * The day's golden feather: about one day in nine, one thing on a list of two
 * or more glints gold; ticking it finds the feather. Stable for the day.
 */
export function goldenKey(memberId, date, part, entries) {
  if (!entries || entries.length < 2) return null
  const h = Math.abs(hash(`${memberId}|${date}|${part}|gold`))
  if (h % 9 !== 0) return null
  return entryKey(entries[Math.floor(h / 9) % entries.length])
}

// ---- Words for an item's rule ---------------------------------------------------------

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** "Every day", "Weekdays", "Mon, Wed, Fri", "Every other week: Sat", "School days", with a rotation after. */
export function ruleWords(item) {
  const set = [...new Set(item.weekdays && item.weekdays.length ? item.weekdays : [0, 1, 2, 3, 4, 5, 6])].sort()
  const key = set.join('')
  let days = key === '0123456' ? 'Every day' : key === '12345' ? 'Weekdays' : key === '06' ? 'Weekends' : set.map((d) => SHORT[d]).join(', ')
  const every = item.every_weeks || 1
  if (every > 1) days = `${every === 2 ? 'Every other week' : `Every ${num(every)} weeks`}: ${days === 'Every day' ? 'every day' : days}`
  const bits = [days]
  if (item.school === 'school') bits.push('school days')
  if (item.school === 'off') bits.push('days off')
  const turns = (item.turns || []).filter(Boolean)
  if (turns.length) bits.push(`takes turns: ${turns.join(', ')}`)
  if (item.ends_on) bits.push(`until ${shortDate(item.ends_on)}`)
  return bits.join(' · ')
}
const shortDate = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })

// ---- School days -------------------------------------------------------------------

/**
 * A person's school day: true on a weekday their school is open, false on a
 * weekend or a day off from their school's calendar (src/lib/cal/schools.js's
 * noSchoolDays map), null for a date the map doesn't cover. Someone with no
 * school calendar has school on weekdays.
 */
export function schoolDayFor(schoolKey, off, known) {
  return (date) => {
    if (known && !known(date)) return null
    const w = dow(date)
    if (w === 0 || w === 6) return false
    return !(schoolKey && off[date] && off[date].has(schoolKey))
  }
}

/**
 * A person's school day from the calendar's events (school calendars in Admin,
 * src/lib/cal/schools.js), for dates from `from` to `to` (outside them: null).
 * A person whose school has no calendar in Admin has school every weekday.
 */
export function schoolDayFrom({ name, events = [], sources = [], members = [], from, to }) {
  const school = SCHOOLS.find((s) => s.person.toLowerCase() === String(name || '').toLowerCase())
  const has = school && schoolsWithCalendars(sources, members).some((s) => s.key === school.key)
  const off = noSchoolDays(events, sources, members)
  return schoolDayFor(has ? school.key : null, off, (d) => d >= from && d <= to)
}

/**
 * Someone else's streak, from their own device's note of it on each day's row
 * (`streak`, through that day): today's, or yesterday's if it was done or a
 * day off (it carries on until today is over), else nothing running.
 */
export function streakShown(rows, part, today) {
  const latest = rows.filter((r) => r.part === part && r.on_date <= today).sort((a, b) => (a.on_date < b.on_date ? 1 : -1))[0]
  if (!latest) return 0
  if (latest.on_date === today) return latest.streak || 0
  if (latest.on_date === addDays(today, -1) && (latest.status === 'done' || latest.status === 'rest')) return latest.streak || 0
  return 0
}
