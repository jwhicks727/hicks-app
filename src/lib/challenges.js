// ============================================
// challenges.js -- the family's challenges: which, when, and how they went
// ============================================
// Once the lists are up and running (two of us have finished one on three
// days each), the family takes on a challenge every so often, together: some
// easy, some hard, in a pattern that starts with a welcome win. Each is timed
// to suit it: a weekend one starts on a Saturday, a week-long one on a Monday,
// the full moon's around the full moon, and "beat the sun" only in the months
// when sunrise comes late. Admin can switch any off, change its numbers, add
// the family's own, start one now or cancel the next (a row in
// `family_challenges` changes a built-in one by its key). Every device works
// out the same next challenge from the same rows, so two phones planning at
// once plan the same one, and the database keeps only the first. Everything
// here reads `routine_days` (how each day went, no words). Pure: tests run it.

import SunCalc from 'suncalc'
import { addDays, diffDays, dow } from './cal/dates.js'
import { moonPhases } from './cal/nature.js'
import { HOME_TOWN } from './sky.js'
import { minutesAtHome, clockWords, hash } from './routines.js'

export const KINDS = {
  everyone: 'Everyone finishes their lists',
  'by-time': 'Everyone finishes by a time',
  share: 'The family finishes most of everything',
  firsts: 'Everyone is first to finish one morning',
  sun: 'Everyone beats the sunrise',
  moon: 'Everyone’s evening list on a full-moon night',
}
export const LEVELS = ['easy', 'medium', 'hard']
export const LEVEL_WORDS = { easy: 'Easy', medium: 'A stretch', hard: 'Hard' }

// The built-in challenges. `timing`: 'monday' or 'saturday' (when it starts),
// 'full-moon' (the night before, of and after), 'late-sunrise' (only while
// the sun rises after 6:40), or none (as soon as it's due).
export const BUILT_IN = [
  { key: 'all-together', title: 'All Together Now', blurb: 'One day this week when every one of us finishes both lists.', kind: 'everyone', part: 'both', level: 'easy', days: 4, target: 1 },
  { key: 'morning-glory', title: 'Morning Glory', blurb: 'Every one of us finishes the morning list on two of the next three mornings.', kind: 'everyone', part: 'morning', level: 'easy', days: 3, target: 2 },
  { key: 'owl-nights', title: 'Three Owl Nights', blurb: 'Every one of us finishes the evening list on three of the next four nights.', kind: 'everyone', part: 'evening', level: 'easy', days: 4, target: 3 },
  { key: 'moonlit', title: 'Moonlit', blurb: 'Every one of us finishes the evening list on one of the full moon’s nights.', kind: 'moon', part: 'evening', level: 'easy', days: 3, target: 1, timing: 'full-moon' },
  { key: 'most-of-it', title: 'Four Out of Five', blurb: 'Together, we finish four out of every five things on our lists this week.', kind: 'share', part: 'both', level: 'easy', days: 7, target: 80, timing: 'monday' },
  { key: 'weekend-warriors', title: 'Weekend Warriors', blurb: 'Saturday and Sunday: every one of us finishes both lists, both days.', kind: 'everyone', part: 'both', level: 'medium', days: 2, target: 2, timing: 'saturday' },
  { key: 'out-the-door', title: 'Out the Door', blurb: 'Every one of us finishes the morning list by 7:30 on three weekday mornings.', kind: 'by-time', part: 'morning', level: 'medium', days: 5, target: 3, by_time: '07:30', timing: 'monday' },
  { key: 'lights-out', title: 'Lights Out by Nine', blurb: 'Every one of us finishes the evening list by 9 o’clock on three nights.', kind: 'by-time', part: 'evening', level: 'medium', days: 5, target: 3, by_time: '21:00' },
  { key: 'everyone-first', title: 'Everyone Gets a First', blurb: 'This week, each of us is the first to finish the morning list on at least one morning.', kind: 'firsts', part: 'morning', level: 'medium', days: 7, target: 1, timing: 'monday' },
  { key: 'beat-the-sun', title: 'Beat the Sun', blurb: 'One morning when every one of us finishes the morning list before the sun comes up.', kind: 'sun', part: 'morning', level: 'medium', days: 5, target: 1, timing: 'late-sunrise' },
  { key: 'three-day-sweep', title: 'The Three-Day Sweep', blurb: 'Every one of us finishes both lists three days in a row.', kind: 'everyone', part: 'both', level: 'medium', days: 5, target: 3, consecutive: true },
  { key: 'perfect-week', title: 'The Perfect Week', blurb: 'Monday to Sunday: every one of us, both lists, every day.', kind: 'everyone', part: 'both', level: 'hard', days: 7, target: 7, timing: 'monday' },
  { key: 'early-birds', title: 'Early Birds, All of Us', blurb: 'Every one of us finishes the morning list by 7:00, every weekday morning.', kind: 'by-time', part: 'morning', level: 'hard', days: 5, target: 5, by_time: '07:00', timing: 'monday' },
  { key: 'nearly-everything', title: 'Nearly Everything', blurb: 'Together, we finish nineteen out of every twenty things on our lists this week.', kind: 'share', part: 'both', level: 'hard', days: 7, target: 95, timing: 'monday' },
  { key: 'long-haul', title: 'The Long Haul', blurb: 'Ten days out of the next fourteen when every one of us finishes both lists.', kind: 'everyone', part: 'both', level: 'hard', days: 14, target: 10, timing: 'monday' },
]

const FIELDS = ['title', 'blurb', 'kind', 'part', 'level', 'days', 'target', 'by_time']

/**
 * The family's challenges: the built-in ones with Admin's changes over them,
 * then the family's own. Each has `enabled`. A custom row missing what it
 * needs is left out.
 */
export function catalogue(rows = []) {
  const byKey = new Map(rows.map((r) => [r.key, r]))
  const out = BUILT_IN.map((c) => {
    const r = byKey.get(c.key)
    const merged = { ...c, enabled: true, custom: false }
    if (r) { for (const f of FIELDS) if (r[f] != null && r[f] !== '') merged[f] = r[f]; merged.enabled = r.enabled !== false; merged.changed = true }
    return merged
  })
  for (const r of rows) {
    if (!r.custom || BUILT_IN.some((c) => c.key === r.key)) continue
    if (!r.title || !KINDS[r.kind] || !r.days || !r.target || !LEVELS.includes(r.level)) continue
    if (r.kind === 'by-time' && !r.by_time) continue
    out.push({ key: r.key, title: r.title, blurb: r.blurb || '', kind: r.kind, part: r.part || 'both', level: r.level, days: r.days, target: r.target, by_time: r.by_time || null, enabled: r.enabled !== false, custom: true })
  }
  return out
}

// ---- When the challenges begin ------------------------------------------------------

/** Which lists each person has kept in the last two weeks: { id: ['morning', 'evening'] }. */
export function keepsOf(rows, today) {
  const from = addDays(today, -14), out = {}
  for (const r of rows) if (r.on_date >= from && r.on_date <= today && r.total > 0) out[r.member_id] = [...new Set([...(out[r.member_id] || []), r.part])].sort().reverse()
  return out
}

/** The people taking part: anyone who has had something on a list in the last two weeks (`rows` are family routine_days). */
export function peopleIn(rows, today, part = 'both') {
  const from = addDays(today, -14)
  return [...new Set(rows.filter((r) => r.on_date >= from && r.on_date <= today && r.total > 0 && (part === 'both' || r.part === part)).map((r) => r.member_id))].sort()
}

/** Up and running: two of us have finished a list on three days each. { ready, people, days }. */
export function readiness(rows) {
  const days = new Map()
  for (const r of rows) if (r.status === 'done') (days.get(r.member_id) || days.set(r.member_id, new Set()).get(r.member_id)).add(r.on_date)
  const counts = [...days.values()].map((s) => s.size).sort((a, b) => b - a)
  const ready = counts.length >= 2 && counts[1] >= 3
  return { ready, people: counts.filter((n) => n >= 3).length, best: counts.slice(0, 2) }
}

// The pattern of levels, so a run of hard ones never comes in a row and the first is a welcome win.
export const LEVEL_PATTERN = ['easy', 'medium', 'easy', 'hard', 'medium', 'easy', 'medium', 'hard']
// Days between one challenge ending and the next starting.
export const GAPS = { relaxed: 6, regular: 3, lively: 1 }

const { lat, lng, tz } = HOME_TOWN
const noonAt = (date) => new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), 20))
/** A day's sunrise at home, as a Date. */
export const sunriseAt = (date) => SunCalc.getTimes(noonAt(date), lat, lng).sunrise
/** The full moons (home dates, with their names) from a date, over about two months. */
export function fullMoonsFrom(date) {
  const y = +date.slice(0, 4)
  return [...moonPhases(y), ...moonPhases(y + 1)].filter((p) => p.key === 'full' && p.date >= date).slice(0, 3)
}

/** When a challenge could start, on or after `from` (within `horizon` days), or null. */
export function startFor(c, from, horizon = 12) {
  const last = addDays(from, horizon)
  let start = from
  if (c.timing === 'monday') start = addDays(from, (8 - dow(from)) % 7)
  else if (c.timing === 'saturday') start = addDays(from, (6 - dow(from) + 7) % 7)
  else if (c.timing === 'full-moon') {
    const fm = fullMoonsFrom(addDays(from, 1)).find((p) => addDays(p.date, -1) >= from)
    if (!fm) return null
    start = addDays(fm.date, -1)
  } else if (c.timing === 'late-sunrise') {
    if (minutesAtHome(sunriseAt(from).toISOString(), tz) < 400) return null
  }
  return start <= last ? start : null
}

/**
 * The next challenge to plan, or null: { key, starts_on, ends_on, spec }.
 * Nothing while one is planned or under way, before the lists are up and
 * running, or while the challenges are switched off. After one ends, a few
 * days' gap (Admin's pace). The level follows LEVEL_PATTERN; a challenge timed
 * to the moon or the sun is taken when its moment comes round; the last few
 * aren't repeated.
 */
export function planNext({ list, runs = [], rows = [], today, pace = 'regular', on = true }) {
  if (!on) return null
  if (runs.some((r) => r.status === 'planned' && r.ends_on >= today)) return null
  if (!readiness(rows).ready) return null
  const people = peopleIn(rows, today)
  if (people.length < 2) return null
  const past = runs.filter((r) => r.status !== 'cancelled').sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1))
  const lastEnd = past.reduce((m, r) => { const end = r.decided_at && r.status !== 'planned' ? r.decided_at.slice(0, 10) : r.ends_on; return end > m ? end : m }, '')
  const earliest = lastEnd ? [today, addDays(lastEnd, (GAPS[pace] ?? 3) + 1)].sort()[1] : today
  const want = LEVEL_PATTERN[past.length % LEVEL_PATTERN.length]
  const recent = new Set(past.slice(-4).map((r) => r.challenge_key))
  const enabled = list.filter((c) => c.enabled !== false && (c.part === 'both' ? people.length >= 2 : peopleIn(rows, today, c.part).length >= 2))
  const fresh = enabled.filter((c) => !recent.has(c.key))
  const pool = (fresh.length ? fresh : enabled)
  if (!pool.length) return null
  const timed = pool.map((c) => ({ c, start: startFor(c, earliest) })).filter((x) => x.start)
  // The full moon's comes first when its night is near (never as the very first): that's what makes it feel timed
  const special = timed.filter((x) => x.c.timing === 'full-moon' && diffDays(earliest, x.start) <= 4)
  const level = timed.filter((x) => x.c.level === want)
  const choices = past.length && special.length ? special : level.length ? level : timed
  if (!choices.length) return null
  const soonest = choices.reduce((m, x) => (x.start < m ? x.start : m), choices[0].start)
  const same = choices.filter((x) => x.start === soonest).sort((a, b) => (a.c.key < b.c.key ? -1 : 1))
  const pickd = same[Math.abs(hash(`${past.length}|${soonest}`)) % same.length]
  return runFor(pickd.c, pickd.start, rows, today)
}

/** A run of a challenge from a start date, with what it asks written down as it stands. */
export function runFor(c, starts_on, rows, today) {
  const people = c.part === 'both' ? peopleIn(rows, today) : peopleIn(rows, today, c.part)
  const moon = c.kind === 'moon' ? fullMoonsFrom(starts_on).find((p) => p.date >= starts_on) : null
  return {
    key: c.key, starts_on, ends_on: addDays(starts_on, Math.max(1, c.days) - 1),
    spec: { title: c.title, blurb: c.blurb, kind: c.kind, part: c.part, level: c.level, days: c.days, target: c.target, by_time: c.by_time || null, consecutive: Boolean(c.consecutive), people, keeps: Object.fromEntries(Object.entries(keepsOf(rows, today)).filter(([p]) => people.includes(p))), moon: moon ? moon.moonName || 'full moon' : null },
  }
}

// ---- How a challenge is going --------------------------------------------------------

const partsOf = (part) => (part === 'both' ? ['morning', 'evening'] : [part])
// The lists a person is asked for: the challenge's, of the ones they keep (Anna may have no evening list)
const partsFor = (s, p) => { const all = partsOf(s.part), keeps = s.keeps && s.keeps[p]; const mine = keeps ? all.filter((x) => keeps.includes(x)) : all; return mine.length ? mine : all }

/**
 * How a run stands: { state, have, need, words, days: [{ date, mark }], people: { id: n }, final }.
 * state: 'coming' | 'on' | 'won' | 'missed'. A day's mark: 'yes', 'no' (past,
 * not made), 'open' (today or ahead). `final` is true once nothing more can
 * change it: a win reached, a win no longer possible, or the last day over.
 */
export function standing(run, rows, today) {
  const s = run.spec || {}
  const people = s.people || []
  const dates = []
  for (let d = run.starts_on; d <= run.ends_on; d = addDays(d, 1)) dates.push(d)
  if (today < run.starts_on) return { state: 'coming', have: 0, need: s.target, words: comingWords(run, today), days: dates.map((date) => ({ date, mark: 'open' })), people: {}, final: false }
  const at = new Map(rows.map((r) => [`${r.member_id}|${r.on_date}|${r.part}`, r]))
  const row = (p, d, part) => at.get(`${p}|${d}|${part}`)
  const okFor = (p, d, part, test = () => true) => { const r = row(p, d, part); return r && (r.status === 'rest' || (r.status === 'done' && test(r)) || (r.status === 'open' && r.total === 0)) }
  const anyDone = (d) => people.some((p) => partsFor(s, p).some((part) => row(p, d, part)?.status === 'done'))
  let marks
  if (s.kind === 'share') {
    let done = 0, total = 0
    const lastTotal = {}
    for (const d of dates.filter((x) => x <= today)) {
      for (const p of people) for (const part of partsFor(s, p)) {
        const r = row(p, d, part)
        if (r && r.status === 'rest') continue
        if (r) { lastTotal[p + part] = r.total; done += r.done; total += r.total } else if (d < today) total += lastTotal[p + part] || 0
      }
    }
    const pct = total ? Math.round((done / total) * 100) : 0
    const lastDone = today >= run.ends_on && people.every((p) => partsFor(s, p).every((part) => okFor(p, run.ends_on, part)))
    const over = today > run.ends_on || lastDone
    const won = over && total > 0 && pct >= s.target
    return { state: over ? (won ? 'won' : 'missed') : 'on', have: pct, need: s.target, words: `${pct}% so far · aiming for ${s.target}%`, days: dates.map((date) => ({ date, mark: date < today ? 'yes' : 'open' })), people: {}, final: over, percent: pct }
  }
  if (s.kind === 'firsts') {
    const firsts = {}
    const days = dates.map((d) => {
      if (d > today) return { date: d, mark: 'open' }
      const done = people.map((p) => row(p, d, 'morning')).filter((r) => r && r.status === 'done' && r.done_at).sort((a, b) => (a.done_at < b.done_at ? -1 : 1))
      if (done[0]) firsts[done[0].member_id] = (firsts[done[0].member_id] || 0) + 1
      return { date: d, mark: done[0] ? 'yes' : d < today ? 'no' : 'open' }
    })
    const have = people.filter((p) => firsts[p]).length
    const left = dates.filter((d) => d > today || (d === today && days.find((x) => x.date === d).mark === 'open')).length
    const won = have >= people.length
    const lost = !won && have + left < people.length
    return { state: won ? 'won' : lost || today > run.ends_on ? 'missed' : 'on', have, need: people.length, words: `${have} of ${people.length} have had a first`, days, people: firsts, final: won || lost || today > run.ends_on }
  }
  const test = s.kind === 'by-time' && s.by_time ? (r) => minutesAtHome(r.done_at) <= toMin(s.by_time) && minutesAtHome(r.done_at) >= 180
    : s.kind === 'sun' ? (r) => Date.parse(r.done_at) < sunriseAt(r.on_date).getTime()
      : () => true
  marks = dates.map((d) => {
    if (d > today) return { date: d, mark: 'open' }
    const ok = people.length > 0 && anyDone(d) && people.every((p) => partsFor(s, p).every((part) => okFor(p, d, part, test)))
    return { date: d, mark: ok ? 'yes' : d < today ? 'no' : 'open' }
  })
  let have
  if (s.consecutive) { let run2 = 0; have = 0; for (const m of marks) { run2 = m.mark === 'yes' ? run2 + 1 : 0; have = Math.max(have, run2) } } else have = marks.filter((m) => m.mark === 'yes').length
  const won = have >= s.target
  let possible
  if (s.consecutive) { let run2 = 0; possible = false; for (const m of marks) { run2 = m.mark === 'no' ? 0 : run2 + 1; if (run2 >= s.target) possible = true } } else possible = have + marks.filter((m) => m.mark === 'open').length >= s.target
  const lost = !won && (!possible || today > run.ends_on)
  return { state: won ? 'won' : lost ? 'missed' : 'on', have, need: s.target, words: onWords(s, have), days: marks, people: {}, final: won || lost }
}
const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m }

function onWords(s, have) {
  const unit = s.part === 'evening' || s.kind === 'moon' ? 'night' : s.part === 'morning' ? 'morning' : 'day'
  return `${have} of ${s.target} ${unit}${s.target === 1 ? '' : 's'}`
}

const dayName = (d) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow(d)]
function comingWords(run, today) {
  const n = diffDays(today, run.starts_on)
  return n === 1 ? 'Starts tomorrow' : n < 7 ? `Starts ${dayName(run.starts_on)}` : `Starts in ${n} days`
}

/** A line for a challenge's rule, with its time: "by 7:30 AM". */
export function ruleLine(spec) {
  if (spec.kind === 'by-time' && spec.by_time) return `${spec.blurb || ''}`.trim() || `Everyone by ${clockWords(toMin(spec.by_time))}`
  return spec.blurb || KINDS[spec.kind] || ''
}

/** The words when a challenge ends. */
export function endWords(run, st) {
  const t = (run.spec && run.spec.title) || 'The challenge'
  if (st.state === 'won') return { title: `${t}: done!`, line: pickLine(['Team Hicks did it.', 'All of us, together. That’s the whole point.', 'A trophy for the family shelf.'], run.id || run.starts_on) }
  return { title: `${t} got away this time`, line: `${st.words}. So close, and the next one is only a few days off.` }
}
const pickLine = (list, seed) => list[Math.abs(hash(String(seed))) % list.length]
