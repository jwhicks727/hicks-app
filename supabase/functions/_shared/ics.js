// ============================================
// ics.js -- reading an iCal / webcal feed into calendar days
// ============================================
// Plain JavaScript with no imports, so the read-sources Edge Function (Deno)
// and the tests (Node, tests/ics.test.mjs) run the same code. A feed is data,
// never instructions: nothing in it is followed, only read into fields.
//
// readFeed(text, { from, to, tz }) -> [{ external_id, title, starts_on,
//   ends_on, starts_at, ends_at, all_day, kind }]
// Repeating events are expanded between `from` and `to` (dates), each
// occurrence with its own id; cancelled ones and the dates a series skips
// are left out.

const WINDOWS_ZONES = {
  'Pacific Standard Time': 'America/Los_Angeles', 'Mountain Standard Time': 'America/Denver', 'US Mountain Standard Time': 'America/Phoenix',
  'Central Standard Time': 'America/Chicago', 'Eastern Standard Time': 'America/New_York', 'Hawaiian Standard Time': 'Pacific/Honolulu',
  'Alaskan Standard Time': 'America/Anchorage', 'UTC': 'UTC', 'GMT Standard Time': 'Europe/London',
}
const MAX_OCCURRENCES = 1000

/** Lines unfolded, as [name, params, value]. */
export function lines(text) {
  const raw = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const out = []
  for (const line of raw) {
    if (!line.trim()) continue
    let i = 0, quoted = false
    for (; i < line.length; i++) { const c = line[i]; if (c === '"') quoted = !quoted; else if (c === ':' && !quoted) break }
    if (i >= line.length) continue
    const head = line.slice(0, i), value = line.slice(i + 1)
    const [name, ...ps] = head.split(';')
    const params = {}
    for (const p of ps) { const eq = p.indexOf('='); if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '') }
    out.push([name.toUpperCase(), params, value])
  }
  return out
}

export const unescapeText = (v) => v.replace(/\\([\;,nN])/g, (m, c) => (c === 'n' || c === 'N' ? '\n' : c))

const dsOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10)
const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return dsOf(y, m, d + n) }

/** The offset of a zone from UTC at an instant, in ms. */
function zoneOffset(t, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(t)).filter((x) => x.type !== 'literal').map((x) => [x.type, Number(x.value)]))
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t
}
/** A wall-clock time in a zone, as an instant. */
export function zonedToUtc(y, m, d, h, mi, s, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi, s)
  let t = guess - zoneOffset(guess, tz)
  t = guess - zoneOffset(t, tz)
  return new Date(t)
}
const localDate = (t, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(t)
const zoneOf = (tzid, fallback) => {
  if (!tzid) return fallback
  const z = WINDOWS_ZONES[tzid] || tzid.replace(/^\/.*?\/(?=[A-Z])/, '')
  try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return z } catch { return fallback }
}

/** A DTSTART-like value: { date } for a whole day, or { wall: [y,m,d,h,mi,s], tz } for a time. */
function parseWhen(params, value, calTz) {
  const v = value.trim()
  const dm = v.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dm || params.VALUE === 'DATE') { const [, y, m, d] = dm || v.match(/^(\d{4})(\d{2})(\d{2})/); return { date: `${y}-${m}-${d}` } }
  const tm = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/)
  if (!tm) return null
  const wall = tm.slice(1, 7).map(Number)
  return { wall, tz: tm[7] ? 'UTC' : zoneOf(params.TZID, calTz) }
}
const instant = (w) => zonedToUtc(...w.wall, w.tz)

function parseDuration(v) {
  const m = v.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!m) return 0
  const [, sign, w, d, h, mi, s] = m
  return (sign === '-' ? -1 : 1) * ((((Number(w || 0) * 7 + Number(d || 0)) * 24 + Number(h || 0)) * 60 + Number(mi || 0)) * 60 + Number(s || 0)) * 1000
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
function parseRule(v) {
  const r = Object.fromEntries(v.split(';').map((p) => p.split('=')).filter((p) => p.length === 2).map(([k, x]) => [k.toUpperCase(), x]))
  return {
    freq: r.FREQ, interval: Math.max(1, Number(r.INTERVAL) || 1), count: r.COUNT ? Number(r.COUNT) : null,
    until: r.UNTIL ? r.UNTIL.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : null,
    byday: r.BYDAY ? r.BYDAY.split(',').map((x) => { const m = x.match(/^([+-]?\d+)?([A-Z]{2})$/); return m ? { n: m[1] ? Number(m[1]) : null, wd: DAYS.indexOf(m[2]) } : null }).filter(Boolean) : null,
    bymonthday: r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : null,
    bymonth: r.BYMONTH ? r.BYMONTH.split(',').map(Number) : null,
  }
}
const dow = (s) => new Date(s + 'T12:00:00Z').getUTCDay()
const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
function nthWeekdayOf(y, m, wd, n) {
  const days = []
  for (let d = 1; d <= daysIn(y, m); d++) if (dow(dsOf(y, m, d)) === wd) days.push(dsOf(y, m, d))
  return n > 0 ? days[n - 1] : days[days.length + n]
}

/** The start dates of a series (local dates), in order, up to `to`. */
export function expandDates(start, rule, to) {
  const out = []
  const [sy, sm, sd] = start.split('-').map(Number)
  const push = (d) => { if (d >= start && (!rule.until || d <= rule.until) && d <= to) out.push(d) }
  const done = () => (rule.count && out.length >= rule.count) || out.length >= MAX_OCCURRENCES
  for (let i = 0; i < 5000 && !done(); i++) {
    let batch = []
    if (rule.freq === 'DAILY') batch = [addDays(start, i * rule.interval)]
    else if (rule.freq === 'WEEKLY') {
      const weekStart = addDays(start, i * 7 * rule.interval - dow(start))
      batch = (rule.byday ? rule.byday.map((b) => b.wd) : [dow(start)]).sort().map((wd) => addDays(weekStart, wd))
    } else if (rule.freq === 'MONTHLY') {
      const mi = sm - 1 + i * rule.interval, y = sy + Math.floor(mi / 12), m = (mi % 12) + 1
      if (rule.byday) batch = rule.byday.flatMap((b) => (b.n ? [nthWeekdayOf(y, m, b.wd, b.n)] : Array.from({ length: daysIn(y, m) }, (_, k) => dsOf(y, m, k + 1)).filter((x) => dow(x) === b.wd)))
      else batch = (rule.bymonthday || [sd]).map((d) => (d > 0 ? (d <= daysIn(y, m) ? dsOf(y, m, d) : null) : dsOf(y, m, daysIn(y, m) + d + 1)))
    } else if (rule.freq === 'YEARLY') {
      const y = sy + i * rule.interval
      batch = (rule.bymonth || [sm]).flatMap((m) => (rule.byday ? rule.byday.map((b) => nthWeekdayOf(y, m, b.wd, b.n || 1)) : [sd <= daysIn(y, m) ? dsOf(y, m, sd) : null]))
    } else { push(start); break }
    batch = batch.filter(Boolean).sort()
    if (batch.length && batch[0] > to) break
    if (rule.until && batch.length && batch[0] > rule.until) break
    for (const d of batch) { if (done()) break; push(d) }
  }
  return rule.count ? out.slice(0, rule.count) : out
}

/** What kind of day an event is, from its words: a day off, a school day, or something else. */
export function inferKind(title) {
  const t = title.toLowerCase()
  if (/\b(staff|teacher|professional|in-service|inservice|work ?day|pupil[- ]free|non-student|student[- ]free)\b/.test(t)) return 'school'
  if (/\b(no school|no classes|holiday|break|recess|vacation|schools? closed|day off|observed)\b/.test(t)) return 'no_school'
  if (/\b(minimum day|early (dismissal|release)|first day of school|last day of school|back to school|open house|conferences?)\b/.test(t)) return 'school'
  return 'event'
}

/** Every event in a feed between two dates. */
export function readFeed(text, { from, to, tz = 'America/Los_Angeles' } = {}) {
  const ls = lines(text)
  const calTz = zoneOf((ls.find(([n]) => n === 'X-WR-TIMEZONE') || [])[2], tz)
  const vevents = []
  let cur = null, depth = 0
  for (const [name, params, value] of ls) {
    if (name === 'BEGIN' && value.toUpperCase() === 'VEVENT') { cur = { props: {}, exdates: [] }; depth = 0; continue }
    if (!cur) continue
    if (name === 'BEGIN') { depth++; continue } // a VALARM inside the event
    if (name === 'END' && depth > 0) { depth--; continue }
    if (name === 'END' && value.toUpperCase() === 'VEVENT') { vevents.push(cur); cur = null; continue }
    if (depth > 0) continue
    if (name === 'EXDATE') cur.exdates.push(...value.split(',').map((v) => parseWhen(params, v, calTz)).filter(Boolean))
    else cur.props[name] = [params, value]
  }

  const overrides = new Map()
  for (const ev of vevents) if (ev.props['RECURRENCE-ID']) { const w = parseWhen(...ev.props['RECURRENCE-ID'], calTz); if (w) overrides.set(ev.props.UID?.[1] + '#' + (w.date || localDate(instant(w), tz)), ev) }

  const out = []
  const shape = (ev, startWhen, uid, occurrence) => {
    const [, summary = ''] = ev.props.SUMMARY || []
    const title = unescapeText(summary).trim().slice(0, 300) || 'Untitled'
    const endP = ev.props.DTEND, durP = ev.props.DURATION
    if (startWhen.date) {
      let end = endP ? parseWhen(...endP, calTz)?.date : null
      if (!end && durP) end = addDays(startWhen.date, Math.max(1, Math.round(parseDuration(durP[1]) / 864e5)))
      const span = end ? Math.max(0, Math.round((Date.parse(end) - Date.parse(startWhen.date)) / 864e5) - 1) : 0
      return { external_id: occurrence ? `${uid}#${startWhen.date}` : uid, title, starts_on: startWhen.date, ends_on: addDays(startWhen.date, span), starts_at: null, ends_at: null, all_day: true, kind: inferKind(title) }
    }
    const s = instant(startWhen)
    let e = endP ? parseWhen(...endP, calTz) : null
    let endT = e && !e.date ? instant(e) : null
    if (!endT && durP) endT = new Date(s.getTime() + parseDuration(durP[1]))
    if (endT && endT < s) endT = null
    const startsOn = localDate(s, tz)
    let endsOn = endT ? localDate(new Date(endT.getTime() - 1), tz) : startsOn
    if (endsOn < startsOn) endsOn = startsOn
    return { external_id: occurrence ? `${uid}#${startsOn}` : uid, title, starts_on: startsOn, ends_on: endsOn, starts_at: s.toISOString(), ends_at: endT ? endT.toISOString() : null, all_day: false, kind: inferKind(title) }
  }

  for (const ev of vevents) {
    if (ev.props['RECURRENCE-ID']) continue
    const uid = (ev.props.UID?.[1] || '').trim().slice(0, 400) // a feed's id, capped: it's outside input
    const st = ev.props.DTSTART && parseWhen(...ev.props.DTSTART, calTz)
    if (!uid || !st) continue
    const cancelled = (ev.props.STATUS?.[1] || '').toUpperCase() === 'CANCELLED'
    if (!ev.props.RRULE) {
      if (cancelled) continue
      const row = shape(ev, st, uid, false)
      if (row.ends_on >= from && row.starts_on <= to) out.push(row)
      continue
    }
    const rule = parseRule(ev.props.RRULE[1])
    const startDate = st.date || localDate(instant(st), tz)
    const skip = new Set(ev.exdates.map((w) => w.date || localDate(instant(w), tz)))
    for (const d of expandDates(startDate, rule, to)) {
      if (skip.has(d)) continue
      const over = overrides.get(uid + '#' + d)
      if (over) {
        if ((over.props.STATUS?.[1] || '').toUpperCase() === 'CANCELLED') continue
        const ost = parseWhen(...over.props.DTSTART, calTz)
        const row = ost && shape(over, ost, uid, true)
        if (row) { row.external_id = `${uid}#${d}`; if (row.ends_on >= from && row.starts_on <= to) out.push(row) }
        continue
      }
      if (cancelled) continue
      const [y, m, dd] = d.split('-').map(Number)
      const when = st.date ? { date: d } : { wall: [y, m, dd, ...st.wall.slice(3)], tz: st.tz }
      const row = shape(ev, when, uid, true)
      if (row.ends_on >= from && row.starts_on <= to) out.push(row)
    }
  }
  const seen = new Set()
  return out.filter((r) => (seen.has(r.external_id) ? false : seen.add(r.external_id))).sort((a, b) => (a.starts_on < b.starts_on ? -1 : a.starts_on > b.starts_on ? 1 : 0))
}

