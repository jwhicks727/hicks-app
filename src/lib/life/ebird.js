// ============================================
// ebird.js -- Laurie's eBird data, read from the file eBird gives her
// ============================================
// Pure: tests/life-list.test.mjs. eBird › My eBird › Download my data sends a
// zip with MyEBirdData.csv: one row per species on each checklist. The app
// reads that file in the browser (no sign-in to eBird, no password, nothing
// fetched); only the fields the screens use are kept, the coordinates rounded
// to about a kilometre. Written to eBird's documented columns and unverified
// against her own file until she first uploads it. Merlin's Sound ID and photo
// finds reach her eBird through its checklists, so they come in with it; a
// column named Source that says Merlin marks those rows.

import { parseCsv } from './csv.js'

const MAX_ROWS = 150_000
const num = (v) => { const n = Number(v); return v !== '' && Number.isFinite(n) ? n : null }
const r2 = (v) => { const n = num(v); return n == null ? null : Math.round(n * 100) / 100 }
const clip = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n)

/** "07:30 AM" or "7:30" as "07:30", or null. */
export function timeOf(v) {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec(String(v || '').trim())
  if (!m) return null
  let h = Number(m[1]); const mm = m[2]
  if (m[3]) { const pm = /p/i.test(m[3]); h = (h % 12) + (pm ? 12 : 0) }
  return h > 23 ? null : `${String(h).padStart(2, '0')}:${mm}`
}
/** A date as eBird writes it (2026-10-31, or 10/31/2026) in ISO form, or null. */
export function dateOf(v) {
  const s = String(v || '').trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return s
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null
}

/**
 * The rows of an eBird download: { rows, skipped, total, error }. A row is a
 * sighting shaped for public.bird_sightings (without its owner). `error` says
 * why a file isn't eBird's, in words.
 */
export function parseEbird(text) {
  const table = parseCsv(text)
  if (table.length < 2) return { rows: [], skipped: 0, total: 0, error: 'That file has no sightings in it.' }
  const head = table[0].map((h) => h.trim().toLowerCase())
  const at = (name) => head.indexOf(name)
  const col = { sub: at('submission id'), common: at('common name'), sci: at('scientific name'), order: at('taxonomic order'), count: at('count'), state: at('state/province'), county: at('county'), locId: at('location id'), loc: at('location'), lat: at('latitude'), lng: at('longitude'), date: at('date'), time: at('time'), proto: at('protocol'), dur: at('duration (min)'), dist: at('distance traveled (km)'), obs: at('number of observers'), comments: at('checklist comments'), ml: at('ml catalog numbers'), src: at('source') }
  if (col.common < 0 || col.date < 0 || col.sub < 0) return { rows: [], skipped: 0, total: table.length - 1, error: 'That doesn’t look like eBird’s MyEBirdData.csv: it needs the Submission ID, Common Name and Date columns.' }
  if (table.length - 1 > MAX_ROWS) return { rows: [], skipped: 0, total: table.length - 1, error: `That file has more than ${MAX_ROWS.toLocaleString('en-US')} sightings, more than the app keeps.` }
  const get = (r, i) => (i >= 0 ? r[i] ?? '' : '')
  const rows = []; let skipped = 0
  for (const r of table.slice(1)) {
    const common = clip(get(r, col.common), 120), date = dateOf(get(r, col.date)), sub = clip(get(r, col.sub), 40)
    if (!common || !date || !sub) { skipped++; continue }
    const count = get(r, col.count).trim()
    rows.push({
      submission_id: sub, species: common, sci_name: clip(get(r, col.sci), 120), taxon_order: num(get(r, col.order)),
      count: /^\d+$/.test(count) ? Math.min(Number(count), 1_000_000) : null, // "X" (present, not counted) is no number
      observed_on: date, observed_time: timeOf(get(r, col.time)),
      state: clip(get(r, col.state), 20) || null, county: clip(get(r, col.county), 80) || null,
      location: clip(get(r, col.loc), 200), location_id: clip(get(r, col.locId), 20) || null, lat: r2(get(r, col.lat)), lng: r2(get(r, col.lng)),
      protocol: clip(get(r, col.proto), 80) || null, duration_min: num(get(r, col.dur)) == null ? null : Math.round(num(get(r, col.dur))), distance_km: num(get(r, col.dist)),
      observers: num(get(r, col.obs)) == null ? null : Math.round(num(get(r, col.obs))), has_media: clip(get(r, col.ml), 4) !== '',
      comments: clip(get(r, col.comments), 600) || null, source: /merlin/i.test(get(r, col.src)) ? 'merlin' : 'ebird',
    })
  }
  return { rows, skipped, total: table.length - 1, error: rows.length ? null : 'None of those rows had a bird and a date.' }
}
