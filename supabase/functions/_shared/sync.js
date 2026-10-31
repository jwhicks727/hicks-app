// ============================================
// sync.js -- what one reading of a feed changes, worked out before anything
// is written (tests/ics.test.mjs). Plain JavaScript for Deno and Node.
// ============================================
// The rules (CLAUDE.md, "Jobs that read the outside world"):
// - an event is matched by its feed id, so a re-read updates rather than
//   duplicates;
// - an event a person hid stays hidden;
// - an upcoming event that leaves the feed is hidden with a dated note, never
//   deleted, and comes back if the feed brings it back;
// - nothing in the past is touched: many feeds drop old dates, and our
//   history keeps them.

export const LIMITS = {
  sourcesPerRun: 20,        // feeds read in one run
  eventsPerSource: 3000,    // events kept from one feed
  bytesPerFeed: 3_000_000,  // a feed bigger than this is refused
  fetchMs: 15000,           // how long to wait for a feed
  minMinutesBetween: 2,     // "Read now" pressed again straight away reads nothing
  daysBack: 365, daysAhead: 730,
}

const LEFT = 'Left the feed on '
const isFeedHidden = (row) => row.status === 'hidden' && typeof row.notes === 'string' && row.notes.startsWith(LEFT)
const SAME = ['title', 'starts_on', 'ends_on', 'starts_at', 'ends_at', 'kind']
const sameTime = (a, b) => (a ? Date.parse(a) : null) === (b ? Date.parse(b) : null)

/**
 * existing: the source's events now ({ id, external_id, status, notes, title, starts_on, ... })
 * incoming: readFeed() rows. Returns { upserts, hide, counts }.
 */
export function planSync(existing, incoming, { sourceId, versionId, today, to }) {
  const byExt = new Map(existing.map((e) => [e.external_id, e]))
  const seen = new Set()
  const upserts = []
  const counts = { new: 0, changed: 0, same: 0, back: 0, left: 0 }
  for (const r of incoming) {
    seen.add(r.external_id)
    const prev = byExt.get(r.external_id)
    let status = 'approved', notes = null
    if (prev) {
      if (isFeedHidden(prev)) counts.back++
      else { status = prev.status; notes = prev.notes ?? null }
      const changed = SAME.some((k) => (k === 'starts_at' || k === 'ends_at' ? !sameTime(prev[k], r[k]) : (prev[k] ?? null) !== (r[k] ?? null)))
      if (changed) counts.changed++; else if (!isFeedHidden(prev)) counts.same++
    } else counts.new++
    upserts.push({ source_id: sourceId, external_id: r.external_id, title: r.title, starts_on: r.starts_on, ends_on: r.ends_on, starts_at: r.starts_at, ends_at: r.ends_at, kind: r.kind, version_id: versionId, status, notes })
  }
  const hide = existing.filter((e) => !seen.has(e.external_id) && e.status === 'approved' && e.starts_on >= today && (!to || e.starts_on <= to)).map((e) => e.id)
  counts.left = hide.length
  return { upserts, hide, counts, note: `${LEFT}${today}` }
}

/** "Read 132 events: 5 new, 2 changed, 1 left the feed" */
export function summary(found, c) {
  const bits = [c.new && `${c.new} new`, c.changed && `${c.changed} changed`, c.back && `${c.back} back in the feed`, c.left && `${c.left} left the feed`].filter(Boolean)
  return `Read ${found} ${found === 1 ? 'event' : 'events'}${bits.length ? ': ' + bits.join(', ') : ', nothing new'}`
}

/** The address to fetch, or null: web addresses only (webcal is https), never this machine or a private network. */
export function safeFeedUrl(raw) {
  let u
  try { u = new URL(String(raw).trim().replace(/^webcals?:\/\//i, 'https://')) } catch { return null }
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) return null
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.') && !h.includes(':')) return null
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224) return null
  }
  if (h.includes(':') && (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80') || h.startsWith('::ffff:'))) return null
  return u.toString()
}
