// ============================================
// tidy.js -- events from many shared calendars, shown once, with titles a
// person would write. Display only: what the feed said stays stored, so
// these rules can improve without reading anything again.
// Pure: tests/tidy.test.mjs.
// ============================================

const ACRONYMS = new Set(['RUSD', 'FUSD', 'SOAR', 'PTA', 'PTO', 'PTSA', 'ELAC', 'SSC', 'IEP', 'STEM', 'STEAM', 'CAASPP', 'ELPAC', 'PE', 'AM', 'PM', 'TK', 'CA', 'USA', 'US', 'K', 'ASB', 'AVID', 'GATE', 'DJ', 'TV', 'SAT', 'ACT', 'AP', 'UC', 'CSU', 'MLK', 'ASL', 'RSVP', 'CCD', 'RCIA', 'OCIA', 'YMCA', 'LA', 'OC', 'IE', 'NBA', 'NFL', 'MLB'])
const SMALL = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'vs', 'de', 'la', 'el', 'y'])
const PREFIX = /^\s*(fw|fwd|re|invitation|updated invitation|new event|canceled event|cancelled event|accepted|declined|tentative|reminder|event)\s*(\([^)]*\))?\s*[:\-–—]\s*/i

function unshout(t) {
  const letters = t.replace(/[^A-Za-z]/g, '')
  if (letters.length < 5 || letters.replace(/[^A-Z]/g, '').length / letters.length < 0.7) return t
  let first = true
  return t.replace(/[A-Za-z][A-Za-z'’]*/g, (w) => {
    const up = w.toUpperCase(), lower = w.toLowerCase()
    let out
    if (ACRONYMS.has(up.replace(/['’]S$/, ''))) out = up.replace(/['’]S$/, (s) => s.toLowerCase())
    else if (w.length <= 4 && !/[AEIOUaeiou]/.test(w)) out = up // MPR, PD, CPR: no vowels, an acronym
    else if (!first && SMALL.has(lower)) out = lower
    else out = lower[0].toUpperCase() + lower.slice(1)
    first = false
    return out
  })
}

/** A feed's title as a person would write it. */
export function tidyTitle(raw) {
  let t = String(raw || '').replace(/\s+/g, ' ').trim()
  for (let i = 0; i < 3 && PREFIX.test(t); i++) t = t.replace(PREFIX, '')
  t = t.replace(/\s*@\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s+[a-z]{3,9}\.?\s+\d{1,2}.*$/i, '') // Google's "@ Fri Nov 6, 2026 6pm - 7pm (PST) (someone@…)"
  t = t.replace(/\s*\(?[\w.+-]+@[\w-]+\.[\w.]+\)?/g, '') // addresses
  t = t.replace(/^\s*\[[^\]]{1,30}\]\s*/, '') // a leading [district] tag
  t = t.replace(/\s*[-–—(]\s*copy\)?\s*$/i, '')
  t = unshout(t)
  t = t.replace(/\s*[:\-–—,;]+\s*$/, '').replace(/^\s*[:\-–—,;]+\s*/, '').replace(/\s+/g, ' ').trim()
  return t || String(raw || '').trim() || 'Untitled'
}

const norm = (t) => tidyTitle(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')
const minute = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : 'all-day')
const uidOf = (e) => (e.external_id ? String(e.external_id).split('#')[0] : null)

/**
 * The same event read from several calendars, shown once. Two are the same
 * when they share the feed's id on the same day, or when their tidied
 * titles and times match. The one kept prefers our own (no feed), then one
 * with a place; it remembers everyone whose calendar it came from
 * (`also_for`), so filtering to one of us still finds it.
 */
export function dedupeEvents(events) {
  const out = [], byKey = new Map()
  const rank = (e) => (e.source_id ? 0 : 2) + (e.place ? 1 : 0)
  for (const e of events) {
    const uid = uidOf(e)
    const school = e.school ? e.school.key : '' // two schools' days off are two events, whatever they're called
    const keys = [`t:${school}|${norm(e.title)}|${e.starts_on}|${e.ends_on}|${minute(e.starts_at)}`]
    if (uid) keys.unshift(`u:${school}|${uid}|${e.starts_on}`)
    const hit = keys.map((k) => byKey.get(k)).find(Boolean)
    if (!hit) {
      const kept = { ...e, title: tidyTitle(e.title), raw_title: e.title, also_for: e.for_whom ? [e.for_whom] : [], copies: 1 }
      out.push(kept); keys.forEach((k) => byKey.set(k, kept)); continue
    }
    hit.copies++
    if (e.for_whom && !hit.also_for.includes(e.for_whom)) hit.also_for.push(e.for_whom)
    if (rank(e) > rank(hit)) Object.assign(hit, { ...e, title: tidyTitle(e.title), raw_title: e.title, also_for: hit.also_for, copies: hit.copies })
    keys.forEach((k) => byKey.set(k, hit))
  }
  for (const e of out) if (e.also_for.length > 1) e.for_whom = e.also_for[0]
  return out
}
