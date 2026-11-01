// ============================================
// recess.js -- which hours of a school day are good to be outside
// ============================================
// Pure: tests/recess.test.mjs. The flag itself is recessFlag() in weather.js;
// this lines it up across the school day, and finds the school day to show.

import { recessFlag } from './weather.js'

const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dow = (date) => new Date(date + 'T12:00:00Z').getUTCDay()

/** The school day to show: today until mid-afternoon on a weekday, else the next weekday. */
export function schoolDay(today, hour, endHour = 15) {
  let d = today
  if (hour >= endHour || dow(d) === 0 || dow(d) === 6) d = addDays(d, 1)
  while (dow(d) === 0 || dow(d) === 6) d = addDays(d, 1)
  return d
}

/**
 * The flag for each hour from `from` to `to` (inclusive) of a day: each a
 * recessFlag plus its hour. `timeline` is a place's hourly weather, `airHours`
 * [{ time: 'YYYY-MM-DDTHH:00', aqi }] (may be empty: the air is then left out).
 */
export function recessHours(timeline, airHours, date, from = 8, to = 15) {
  const aqiAt = new Map((airHours || []).map((a) => [a.time.slice(0, 13), a.aqi]))
  return (timeline || []).filter((h) => h.date === date && h.hour >= from && h.hour <= to)
    .map((h) => ({ hour: h, flag: recessFlag(h, aqiAt.has(h.time.slice(0, 13)) ? aqiAt.get(h.time.slice(0, 13)) : null) }))
}

/** The worst flag across the hours, with the reasons that made it, for one headline. */
export function worstFlag(hours) {
  const rank = { go: 0, care: 1, inside: 2 }
  if (!hours.length) return null
  const w = hours.reduce((a, b) => (rank[b.flag.level] > rank[a.flag.level] ? b : a))
  const reasons = [...new Set(hours.filter((h) => rank[h.flag.level] === rank[w.flag.level]).flatMap((h) => h.flag.reasons))]
  return { level: w.flag.level, reasons, at: w.hour.hour }
}
