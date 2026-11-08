// ============================================
// stay.js -- the recap of a stay away, and saves that haven't gone through yet
// ============================================
// Pure, so tests/stay.test.mjs runs it in Node. Jason's ask after a day in
// Temecula: what we record on a trip shouldn't vanish because we're tired or
// back home. So (1) a stay away leaves a recap card on Home, named for the town,
// for a week or until it's dismissed, with room to add more; and (2) a place
// that couldn't be saved (no signal, a hiccup) waits on the phone and is sent
// again, instead of being lost.
//
// What the phone remembers for the recap is only the town and the first and last
// day of a stay away (never a point, never a path), on this device, for a week
// after the last day, and it goes on sign-out and when "Notice where I am" is
// switched off. Nothing reaches the database until someone adds something.

import { norm } from './been.js'
import { addDays } from './cal/dates.js'

export const RECAP_DAYS = 7 // a recap stays this long after the last day away
export const KEEP_STAYS = 3 // and the phone remembers at most this many
export const GAP_DAYS = 2 // two days without being there starts a new stay

export const stayId = (s) => `${norm(s.town)}|${s.from}`

/**
 * The stays this phone remembers, after a reading: while away in a town, today joins
 * its stay (or starts one); stays past their week are forgotten. Returns the new
 * list, newest first.
 */
export function updateStays(stays, here, today) {
  let list = (stays || []).filter((s) => s && s.town && s.last >= addDays(today, -RECAP_DAYS))
  const t = here && here.tier === 'away' ? ((here.town && here.town.town) || (here.place && here.place.town) || '') : ''
  if (!t) return list.slice(0, KEEP_STAYS)
  const region = here.town && here.town.region ? String(here.town.region).slice(0, 60) : null
  const cc = here.town && /^[A-Z]{2}$/.test(here.town.cc || '') ? here.town.cc : null
  const i = list.findIndex((s) => norm(s.town) === norm(t) && norm(s.region || '') === norm(region || '') && s.last >= addDays(today, -GAP_DAYS))
  if (i >= 0) {
    const s = { ...list[i], last: today > list[i].last ? today : list[i].last }
    list = [s, ...list.filter((_, k) => k !== i)]
  } else {
    list = [{ town: String(t).slice(0, 120), region, cc, from: today, last: today, dismissed: false }, ...list]
  }
  return list.slice(0, KEEP_STAYS)
}

/** The stays to show a recap for: not dismissed, within their week, and not the town we're standing in. */
export function recaps(stays, today, hereTown = null) {
  return (stays || []).filter((s) => s && !s.dismissed && s.last >= addDays(today, -RECAP_DAYS) && !(hereTown && norm(hereTown.town) === norm(s.town)))
}
/** Dismiss a stay, or bring it back (the Undo). */
export const setDismissed = (stays, id, dismissed) => (stays || []).map((s) => (stayId(s) === id ? { ...s, dismissed } : s))

/** "Nov 7" or "Nov 7 to 8" */
export function stayWords(s) {
  const f = (d, long) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: long ? 'short' : undefined, day: 'numeric', timeZone: 'UTC' })
  if (s.from === s.last) return f(s.from, true)
  return s.from.slice(0, 7) === s.last.slice(0, 7) ? `${f(s.from, true)} to ${f(s.last)}` : `${f(s.from, true)} to ${f(s.last, true)}`
}

// ---- Saves waiting on the phone --------------------------------------------------

/** What counts as worth keeping and trying again: a failure of the network or database, never a bad entry. */
export const retryable = (error) => Boolean(error) && !/^A name, please/.test(String(error))

/** Add an entry to the queue: a place for a town on a day, once (the same place and day isn't queued twice). */
export function enqueue(queue, item) {
  const key = (x) => `${norm(x.town.town)}|${norm(x.town.region || '')}|${norm(x.place.name)}|${x.day}`
  if ((queue || []).some((q) => key(q) === key(item))) return queue
  return [...(queue || []), { ...item, id: item.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}` }].slice(-60)
}
export const dequeue = (queue, id) => (queue || []).filter((q) => q.id !== id)
/** The queue's entries for a town (a stay's recap shows its own). */
export const queuedFor = (queue, town) => (queue || []).filter((q) => norm(q.town.town) === norm(town.town) && norm(q.town.region || '') === norm(town.region || ''))

/** Lines pasted or typed, one place a line: bullets, numbers and stray marks stripped, repeats and blanks dropped. */
export function parseLines(text, max = 30) {
  const seen = new Set(), out = []
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•·–—]|\d{1,2}[.)])\s*/, '').replace(/\s+/g, ' ').trim().slice(0, 100)
    if (!line || seen.has(norm(line))) continue
    seen.add(norm(line)); out.push(line)
    if (out.length >= max) break
  }
  return out
}
