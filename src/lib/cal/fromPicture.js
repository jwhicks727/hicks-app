// ============================================
// fromPicture.js -- a calendar read from a screenshot, photo or PDF, into rows
// ============================================
// Claude reads the dates (the `claude` function's calendar-from-image task);
// a parent checks them on screen; only the ticked ones become events, under a
// source of their own so they can be rolled over like any calendar. Pure.

import { homeInstant } from './dates.js'

const DATE = /^\d{4}-\d{2}-\d{2}$/, TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** Claude's events, cleaned: real dates only, ends never before starts, sorted, no repeats. */
export function cleanReading(events = []) {
  const seen = new Set(), out = []
  for (const e of events) {
    if (!e || !DATE.test(e.starts_on || '') || Number.isNaN(Date.parse(e.starts_on + 'T12:00:00Z'))) continue
    const ends = DATE.test(e.ends_on || '') && e.ends_on >= e.starts_on ? e.ends_on : e.starts_on
    const title = String(e.title || '').replace(/\s+/g, ' ').trim().slice(0, 300)
    if (!title) continue
    const key = `${title.toLowerCase()}|${e.starts_on}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title, starts_on: e.starts_on, ends_on: ends, time: TIME.test(e.time || '') ? e.time : '', kind: ['no_school', 'school', 'event', 'other'].includes(e.kind) ? e.kind : 'event', note: String(e.note || '').slice(0, 500) })
  }
  return out.sort((a, b) => (a.starts_on < b.starts_on ? -1 : a.starts_on > b.starts_on ? 1 : a.title.localeCompare(b.title)))
}

/** The rows to insert for the ticked events, under `sourceId`, for `forWhom` (or the whole family). */
export function eventRows(events, { sourceId, forWhom = null }) {
  return events.map((e) => ({
    source_id: sourceId,
    external_id: `pic:${e.starts_on}:${e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`,
    title: e.title, starts_on: e.starts_on, ends_on: e.ends_on,
    starts_at: e.time ? homeInstant(e.starts_on, e.time) : null,
    kind: e.kind === 'other' ? 'event' : e.kind,
    for_whom: forWhom || null, status: 'approved', notes: e.note || null,
  }))
}
