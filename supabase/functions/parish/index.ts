// ============================================
// parish -- Sacred Heart's Mass and confession times, read from its website
// ============================================
// Only a family member's sign-in gets an answer. The page is read at most
// once a day however often the app opens (a parent's "Read it again" at most
// every ten minutes), from the parish's own site only, and parsed by
// _shared/parish.js. A week that differs from the last is kept as a new row
// of public.parish_schedules; one that says the same only moves checked_at.
// A reading that doesn't look like a parish's week is never kept: the app
// goes on with the last good one. Deployed with --no-verify-jwt because it
// checks the caller itself.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { PARISH_URL, PARISH_HOSTS, pageLines, massLinks, parseSchedule, isSound, scheduleKey } from '../_shared/parish.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const DAY_MS = 24 * 3600e3, FORCE_MS = 10 * 60e3, RETRY_MS = 3600e3
let lastTry = 0 // a failed read waits an hour in this instance

async function readPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'TeamHicksFamilyApp/1.0 (a parishioner family’s app)', Accept: 'text/html' } })
    // A redirect may only land on the parish's own site
    if (!res.ok || !PARISH_HOSTS.includes(new URL(res.url).hostname.toLowerCase())) return null
    return (await res.text()).slice(0, 2_000_000)
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return reply(403, { error: 'Sign in first' })
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: family } = await asUser.rpc('is_family')
  if (family !== true) return reply(403, { error: 'For the family only' })
  if (!SERVICE_KEY) return reply(503, { error: 'Not set up yet' })
  let body: { force?: boolean } = {}
  try { body = await req.json() } catch { /* no body: an ordinary ask */ }
  let force = false
  if (body.force === true) { const { data: parent } = await asUser.rpc('is_parent'); force = parent === true }

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: latest } = await db.from('parish_schedules').select('id, url, schedule, read_at, checked_at').order('read_at', { ascending: false }).limit(1).maybeSingle()
  const age = latest ? Date.now() - Date.parse(latest.checked_at) : Infinity
  if (age < (force ? FORCE_MS : DAY_MS)) return reply(200, { ...latest, fresh: true })
  if (!force && Date.now() - lastTry < RETRY_MS) return reply(200, latest ? { ...latest, stale: true } : { error: 'Not read yet' })
  lastTry = Date.now()

  // The home page, then up to three of its own Mass-times pages, until one reads as a week
  let found: { url: string, schedule: ReturnType<typeof parseSchedule> } | null = null
  const home = await readPage(PARISH_URL)
  if (home) {
    const s = parseSchedule(pageLines(home))
    if (isSound(s)) found = { url: PARISH_URL, schedule: s }
    else for (const url of massLinks(home)) {
      const page = await readPage(url)
      const t = page && parseSchedule(pageLines(page))
      if (t && isSound(t)) { found = { url, schedule: t }; break }
    }
  }
  if (!found) return reply(200, { ...(latest || {}), stale: true, error: home ? 'The parish’s page didn’t read as a week of Masses' : 'The parish’s site couldn’t be reached just now' })

  if (latest && scheduleKey(latest.schedule) === scheduleKey(found.schedule)) {
    const now = new Date().toISOString()
    await db.from('parish_schedules').update({ checked_at: now, url: found.url }).eq('id', latest.id)
    return reply(200, { ...latest, url: found.url, checked_at: now })
  }
  const { data: row, error } = await db.from('parish_schedules').insert({ url: found.url, schedule: found.schedule }).select('id, url, schedule, read_at, checked_at').single()
  if (error) return reply(500, { error: 'The new times couldn’t be kept' })
  return reply(200, { ...row, changed: Boolean(latest) })
})
