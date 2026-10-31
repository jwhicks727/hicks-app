// ============================================
// read-sources -- reads the calendar feeds in Setup into calendar_events
// ============================================
// Who may run it: a signed-in parent (Setup's "Read now", for one source), or
// the nightly schedule, which sends the READ_SOURCES_KEY secret (every feed
// source). Anyone else gets a 403. Deployed with --no-verify-jwt because it
// checks the caller itself (docs/DATABASE.md, "Reading calendar feeds").
//
// Each reading is kept as a source_versions row; an unchanged feed writes
// nothing but the time it was checked. What a reading changes follows
// planSync() (../_shared/sync.js): nothing is ever deleted. A feed is data,
// never instructions. Nothing is sent anywhere but the feed's own address.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { readFeed } from '../_shared/ics.js'
import { planSync, summary, safeFeedUrl, LIMITS } from '../_shared/sync.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SCHEDULE_KEY = Deno.env.get('READ_SOURCES_KEY') ?? ''
const FEED_KINDS = ['ical', 'google_calendar']
const TZ = 'America/Los_Angeles'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const homeDate = (t = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(t)
const shift = (d: string, n: number) => new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10)

/** The schedule's key, compared without leaking its length or content through timing. */
function isSchedule(given: string | null) {
  if (!SCHEDULE_KEY || !given) return false
  const a = new TextEncoder().encode(given), b = new TextEncoder().encode(SCHEDULE_KEY)
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

async function isParent(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } })
  const { data, error } = await asUser.rpc('is_parent')
  return !error && data === true
}

/** The feed's text, refusing anything too big, too slow, or not a calendar. */
async function fetchFeed(url: string) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(LIMITS.fetchMs), headers: { 'User-Agent': 'TeamHicksCalendar/1.0', Accept: 'text/calendar, text/plain;q=0.8, */*;q=0.5' } })
  if (!safeFeedUrl(res.url)) throw new Error('The feed sent us somewhere it shouldn’t')
  if (!res.ok) throw new Error(`The feed answered ${res.status}`)
  const reader = res.body?.getReader()
  if (!reader) throw new Error('The feed was empty')
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > LIMITS.bytesPerFeed) { await reader.cancel(); throw new Error('The feed is too big to read') }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let at = 0
  for (const c of chunks) { bytes.set(c, at); at += c.length }
  const text = new TextDecoder().decode(bytes)
  if (!/BEGIN:VCALENDAR/i.test(text.slice(0, 4000))) throw new Error('That address didn’t send a calendar feed')
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map((b) => b.toString(16).padStart(2, '0')).join('')
  return { text, hash }
}

// deno-lint-ignore no-explicit-any
async function readOne(db: any, source: any) {
  const now = new Date().toISOString()
  const done = async (status: string) => { await db.from('sources').update({ last_checked_at: now, last_status: status.slice(0, 300) }).eq('id', source.id); return { id: source.id, status } }
  const url = safeFeedUrl(source.url)
  if (!url) return done('Not a feed address this reader can open')
  let feed
  try { feed = await fetchFeed(url) } catch (e) { return done(e instanceof Error ? e.message : 'The feed could not be read') }

  const { data: last } = await db.from('source_versions').select('content_hash').eq('source_id', source.id).order('fetched_at', { ascending: false }).limit(1)
  if (last && last[0] && last[0].content_hash === feed.hash) return done('No changes since the last reading')

  const today = homeDate(), from = shift(today, -LIMITS.daysBack), to = shift(today, LIMITS.daysAhead)
  let rows = readFeed(feed.text, { from, to, tz: TZ })
  const capped = rows.length > LIMITS.eventsPerSource
  if (capped) rows = rows.slice(0, LIMITS.eventsPerSource)

  const { data: version, error: vErr } = await db.from('source_versions')
    .insert({ source_id: source.id, url: source.url, content_hash: feed.hash, events_found: rows.length, note: capped ? `Only the first ${LIMITS.eventsPerSource} events were kept` : null })
    .select('id').single()
  if (vErr) return done('Could not record this reading')

  const existing = []
  for (let at = 0; ; at += 1000) {
    const { data, error } = await db.from('calendar_events').select('id, external_id, status, notes, title, starts_on, ends_on, starts_at, ends_at, kind')
      .eq('source_id', source.id).order('id').range(at, at + 999)
    if (error) return done('Could not read the events we already have')
    existing.push(...data)
    if (data.length < 1000) break
  }

  const plan = planSync(existing, rows, { sourceId: source.id, versionId: version.id, today, to })
  for (let i = 0; i < plan.upserts.length; i += 500) {
    const { error } = await db.from('calendar_events').upsert(plan.upserts.slice(i, i + 500), { onConflict: 'source_id,external_id' })
    if (error) return done('Could not save the events: ' + error.message)
  }
  for (let i = 0; i < plan.hide.length; i += 500) {
    await db.from('calendar_events').update({ status: 'hidden', notes: plan.note }).in('id', plan.hide.slice(i, i + 500)).eq('source_id', source.id)
  }
  return done(summary(rows.length, plan.counts) + (capped ? ` (only the first ${LIMITS.eventsPerSource} kept)` : ''))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })
  const scheduled = isSchedule(req.headers.get('x-read-sources-key'))
  if (!scheduled && !(await isParent(req.headers.get('Authorization')))) return reply(403, { error: 'Only a parent, or the nightly schedule, can read the sources' })

  let body: { source_id?: string } = {}
  try { body = await req.json() } catch { /* no body: every feed */ }
  if (!scheduled && !body.source_id) return reply(400, { error: 'Say which source to read' })

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  let q = db.from('sources').select('id, url, kind, last_checked_at').eq('purpose', 'calendar').in('kind', FEED_KINDS).not('url', 'is', null)
  if (body.source_id) q = q.eq('id', body.source_id)
  const { data: sources, error } = await q.order('last_checked_at', { ascending: true, nullsFirst: true }).limit(LIMITS.sourcesPerRun)
  if (error) return reply(500, { error: 'Could not read the sources' })
  if (body.source_id && !sources.length) return reply(404, { error: 'That source isn’t a calendar feed' })

  const results = []
  for (const s of sources) {
    const recent = s.last_checked_at && Date.now() - Date.parse(s.last_checked_at) < LIMITS.minMinutesBetween * 60000
    if (recent && !scheduled) { results.push({ id: s.id, status: 'Read a moment ago: try again in a minute or two' }); continue }
    results.push(await readOne(db, s))
  }
  return reply(200, { results })
})
