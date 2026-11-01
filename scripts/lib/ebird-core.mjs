// ============================================
// ebird-core.mjs -- the decisions of the nightly eBird sync, in plain JavaScript
// ============================================
// Tested in tests/ebird-sync.test.mjs; the browser and the database are in
// scripts/sync-ebird.mjs. Everything read from a page is data, never an
// instruction. Written to eBird's pages and API as documented or remembered,
// and UNVERIFIED against the live site (the planning sandbox can't reach it):
// the first "discover" run says what to adjust in scripts/ebird-steps.json.

export const SIGN_IN_HOSTS = ['secure.birds.cornell.edu', 'ebird.org'] // where the sign-in page may be, and where it lands
export const SITE_HOSTS = ['ebird.org']                               // every later page
export const API = 'https://api.ebird.org/v2'
export const MAX_NEW_PER_RUN = 150 // checklists brought in a night; a long history fills in over a few weeks
export const MAX_PAGES = 40        // pages of "My Checklists" looked through

/** Is `url` https on one of `hosts` (or a subdomain of one)? */
export function hostOk(url, hosts) {
  try { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password && hosts.some((h) => u.hostname === h || u.hostname.endsWith('.' + h)) } catch { return false }
}

/** What's wrong with a steps file (an empty list when nothing is): the sign-in page must be eBird's or Cornell's, later pages eBird's. */
export function validateSteps(steps) {
  const bad = []
  const sel = (v) => Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === 'string' && s.length < 200)
  if (!steps || !steps.signIn || !hostOk(steps.signIn.url, SIGN_IN_HOSTS)) bad.push('The sign-in page must be on eBird’s own sites.')
  else for (const k of ['user', 'password', 'submit']) if (!sel(steps.signIn[k])) bad.push(`signIn.${k} needs a list of selectors.`)
  if (!steps || !steps.checklists || !hostOk(steps.checklists.url, SITE_HOSTS)) bad.push('The checklists page must be on ebird.org.')
  return bad
}

const HOUR = 3600e3
/**
 * May the job sign in now? From the log of earlier runs (newest first or not):
 * never within 24 hours of a rejected sign-in, nor of an unfinished run (a crash
 * after the password was typed), unless a person who has fixed the password
 * ticked "retry". Returns { ok, why }.
 */
export function signInGate(runs, now = Date.now(), { retry = false } = {}) {
  if (retry) return { ok: true, why: 'A person asked for a retry.' }
  for (const r of runs || []) {
    const age = now - Date.parse(r.at)
    if (r.status === 'login_rejected' && age < 24 * HOUR) return { ok: false, why: 'eBird rejected the sign-in less than 24 hours ago. Fix the password, then run it by hand with “retry the login”.' }
    if (r.status === 'started' && age < 24 * HOUR) return { ok: false, why: 'The last run never finished after it started, so the sign-in is held for a day. If the password is right, run it by hand with “retry the login”.' }
  }
  return { ok: true, why: null }
}

/** Is a recorded yes Laurie's own? `consent` is the sync_consents row, `laurie` her family member. */
export const consentOk = (consent, laurie) => Boolean(consent && laurie && consent.said_yes_by === laurie.id)

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
/** A date as a page or the API writes it, as { date, time }: "07 Nov 2023 07:30", "Nov 7, 2023", "2023-11-07 7:30 AM". */
export function parseWhen(s) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  let m = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(t) || null
  let date = m ? iso(m[1], m[2], m[3]) : null, hh = m && m[4] ? Number(m[4]) : null, mm = m && m[5] ? m[5] : null
  if (!date) { m = /(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/.exec(t); if (m && MONTHS[m[2].toLowerCase()]) date = iso(m[3], MONTHS[m[2].toLowerCase()], Number(m[1])) }
  if (!date) { m = /([A-Za-z]{3})[a-z]* (\d{1,2}),? (\d{4})/.exec(t); if (m && MONTHS[m[1].toLowerCase()]) date = iso(m[3], MONTHS[m[1].toLowerCase()], Number(m[2])) }
  if (!date) return { date: null, time: null }
  if (hh == null) { const tm = /(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(t.replace(/\d{4}-\d{2}-\d{2}/, '')); if (tm) { hh = Number(tm[1]); mm = tm[2]; if (tm[3]) hh = (hh % 12) + (/p/i.test(tm[3]) ? 12 : 0) } }
  else if (/PM/i.test(t) && hh < 12) hh += 12
  return { date, time: hh != null && hh < 24 && mm ? `${String(hh).padStart(2, '0')}:${mm}` : null }
}

const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * The checklists on a "My Checklists" page, in the order they appear:
 * [{ sub, date, locId, location }]. Each is a link to /checklist/S…, with the
 * date and the place read from the text just after it when they are there.
 */
export function parseChecklistIndex(html) {
  const s = String(html || '').slice(0, 3_000_000), out = [], seen = new Set()
  const re = /href="(?:https:\/\/ebird\.org)?\/checklist\/(S\d{3,})[^"]*"/g
  let m
  while ((m = re.exec(s))) {
    if (seen.has(m[1])) continue
    seen.add(m[1])
    // Read forward from the link, up to the next checklist's link, so one row's date never lands on another
    let after = s.slice(m.index, m.index + 900); const nxt = after.slice(m[0].length).search(/\/checklist\/S\d{3,}/); if (nxt >= 0) after = after.slice(0, nxt + m[0].length)
    const loc = /href="[^"]*\/(?:hotspot|mylocation|location)\/(L\d+)[^"]*"[^>]*>([^<]{1,200})</.exec(after)
    const around = decode(after)
    out.push({ sub: m[1], date: parseWhen(around).date, locId: loc ? loc[1] : null, location: loc ? decode(loc[2]).slice(0, 200) : '' })
  }
  return out
}

/** The address of the next page of a listing, or null (a rel="next" link, or one that says Next). */
export function nextPageHref(html) {
  const s = String(html || '').slice(0, 3_000_000)
  const tags = [...s.matchAll(/<a\b[^>]*>/gi)].map((x) => x[0])
  const pick = tags.find((t) => /rel="next"/i.test(t)) || (() => { const m = /<a\b[^>]*href="([^"]+)"[^>]*>\s*(?:Next|Older)[^<]*<\/a>/i.exec(s); return m ? `<a href="${m[1]}">` : null })()
  const h = pick && /href="([^"]+)"/.exec(pick)
  return h ? decode(h[1]) : null
}

// ---- The contents of a checklist, from eBird's API 2.0 (product/checklist/view) ----
export const viewUrl = (sub) => `${API}/product/checklist/view/${encodeURIComponent(sub)}`
export const taxonomyUrl = () => `${API}/ref/taxonomy/ebird?fmt=json&locale=en&cat=species`
/** species code -> { common, sci, order } from the taxonomy list. */
export function indexTaxonomy(list) {
  const map = new Map()
  for (const t of Array.isArray(list) ? list : []) if (t && t.speciesCode && t.comName) map.set(t.speciesCode, { common: String(t.comName).slice(0, 120), sci: String(t.sciName || '').slice(0, 120), order: Number.isFinite(Number(t.taxonOrder)) ? Number(t.taxonOrder) : null })
  return map
}
const PROTOCOLS = { P20: 'eBird - Casual Observation', P21: 'eBird - Stationary Count', P22: 'eBird - Traveling Count', P23: 'eBird - Exhaustive Area Count' }

/**
 * A checklist (the API's `view` answer) as sighting rows for bird_sightings,
 * without their owner. `where` = { location, locId } from the listing. Birds
 * the taxonomy list doesn't know (spuhs, slashes) are left out: they aren't
 * species. Counts of "X" stay null (present, not counted).
 */
export function shapeChecklist(view, tax, where = {}) {
  if (!view || !view.subId || !Array.isArray(view.obs)) return []
  const when = parseWhen(view.obsDt)
  const rows = []
  for (const o of view.obs) {
    const t = tax.get(o.speciesCode)
    if (!t || !when.date) continue
    const n = String(o.howManyStr ?? '').trim()
    rows.push({
      submission_id: String(view.subId).slice(0, 40), species: t.common, sci_name: t.sci, taxon_order: t.order,
      count: /^\d+$/.test(n) ? Math.min(Number(n), 1_000_000) : null, observed_on: when.date, observed_time: when.time,
      state: view.subnational1Code ? String(view.subnational1Code).slice(0, 20) : null, county: null,
      location: String(where.location || view.locName || '').slice(0, 200), location_id: String(view.locId || where.locId || '').slice(0, 20) || null, lat: null, lng: null,
      protocol: PROTOCOLS[view.protocolId] || null, duration_min: Number.isFinite(Number(view.durationHrs)) && view.durationHrs != null ? Math.round(Number(view.durationHrs) * 60) : null,
      distance_km: Number.isFinite(Number(view.effortDistanceKm)) && view.effortDistanceKm != null ? Number(view.effortDistanceKm) : null,
      observers: Number.isFinite(Number(view.numObservers)) && view.numObservers != null ? Math.round(Number(view.numObservers)) : null,
      has_media: Boolean(o.hasRichMedia), comments: null, source: 'ebird',
    })
  }
  return rows
}

// ---- What the job may print: counts and hosts, never page text ----
/** An address safe to print: no query, no hash, and only plain-word path segments ("…" for the rest). */
export function safeUrl(u) {
  try {
    const x = new URL(u)
    return x.hostname + '/' + x.pathname.split('/').filter(Boolean).map((p) => (/^[A-Za-z._-]{1,30}$/.test(p) ? p : '…')).join('/')
  } catch { return '(an address)' }
}
/** What a discover run says about a page: counts only. */
export function outlineOf(html) {
  const s = String(html || '')
  const count = (re) => (s.match(re) || []).length
  return { bytes: s.length, checklistLinks: count(/\/checklist\/S\d{3,}/g), tables: count(/<table\b/gi), listItems: count(/<li\b/gi), forms: count(/<form\b/gi), passwordFields: count(/type="password"/gi), hasNext: Boolean(nextPageHref(s)), headings: count(/<h[1-3]\b/gi) }
}
