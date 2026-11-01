// ============================================
// watch.js -- the events coming up that are somewhere else, to watch their weather
// ============================================
// Pure: tests/watch.test.mjs. An event with a place (typed into the calendar,
// found on the map) is one to watch: Jason's concert across the county, Anna's
// campout in the mountains. The event page already knows its own forecast;
// this picks which events to show, what each looks like, and when to warn.

const KINDS = [
  ['music', /\b(concert|gig|show|festival|band|orchestra|symphony|recital|choir|opera|musical|jam|karaoke|tour)\b/i],
  ['tent', /\b(camp(ing|out|ground|site)?|backpack|overnight|retreat)\b/i],
  ['mountain', /\b(hike|hiking|trail|summit|peak|mount(ain)?|ski(ing)?|snow(board)?|wrightwood|big bear|baldy|arrowhead)\b/i],
  ['wave', /\b(beach|surf|swim|pool|lake|kayak|boat|whale|tide|harbou?r|pier|ocean|bay)\b/i],
  ['ball', /\b(game|match|tournament|soccer|baseball|basketball|football|volleyball|track|meet|practice|race|marathon|5k|10k|field day)\b/i],
  ['plane', /\b(flight|fly|airport|trip|vacation|travel|visit|cruise)\b/i],
  ['tree', /\b(park|garden|picnic|zoo|botanic|farm|orchard|nature|bird(ing)?)\b/i],
]
/** Which picture an event gets, from its words: music, tent, mountain, wave, ball, plane, tree, or star. */
export function eventIcon(title = '', place = '') {
  const text = `${title} ${place}`
  const hit = KINDS.find(([, re]) => re.test(text))
  return hit ? hit[0] : 'star'
}

const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const daysUntil = (date, today) => Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 864e5)

/**
 * Events worth watching: a place typed in, from today to `ahead` days on,
 * soonest first, a day off or a school day left out (those aren't trips).
 */
export function watchable(events, today, ahead = 16, limit = 6) {
  const end = addDays(today, ahead)
  return (events || [])
    .filter((e) => e && e.place && String(e.place).trim() && e.ends_on >= today && e.starts_on <= end && !['no_school', 'school'].includes(e.kind))
    .sort((a, b) => (a.starts_on < b.starts_on ? -1 : a.starts_on > b.starts_on ? 1 : String(a.starts_at || '').localeCompare(String(b.starts_at || ''))))
    .slice(0, limit)
}

/** When, in words: "Today", "Friday", "Sat–Sun", "In 9 days". */
export function whenWords(ev, today) {
  const n = daysUntil(ev.starts_on < today ? today : ev.starts_on, today)
  const name = (d) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(d + 'T12:00:00Z').getUTCDay()]
  const first = n <= 0 ? 'Today' : n === 1 ? 'Tomorrow' : n < 7 ? name(ev.starts_on) : `${name(ev.starts_on).slice(0, 3)} ${Number(ev.starts_on.slice(5, 7))}/${Number(ev.starts_on.slice(8, 10))}`
  return ev.ends_on > ev.starts_on ? `${first} to ${name(ev.ends_on).slice(0, 3)}` : first
}

/** A heads-up for a day's forecast there, or null: rain, wind, heat, cold, strong sun. */
export function watchFlag(day) {
  if (!day) return null
  const out = []
  if ((day.inches ?? 0) >= 0.1 || (day.rain ?? 0) >= 60) out.push('Rain likely: bring a coat')
  else if ((day.rain ?? 0) >= 35) out.push('A chance of rain')
  if ((day.gusts ?? 0) >= 35) out.push(`Windy, gusts to ${day.gusts}`)
  if (day.high >= 95) out.push('Hot: water and shade')
  if (day.low <= 36) out.push('Cold at night')
  if ((day.uv ?? 0) >= 8) out.push('Strong sun')
  return out.length ? out.join(' · ') : null
}

/** The day of a trip's forecast that matters most: the first day, or the wettest and windiest of them. */
export function worstDay(days) {
  if (!days || !days.length) return null
  return days.reduce((a, b) => ((b.rain ?? 0) + (b.gusts ?? 0) > (a.rain ?? 0) + (a.gusts ?? 0) ? b : a))
}
