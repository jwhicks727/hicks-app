// ============================================
// stations -- right now at home and at each school, from our chosen stations
// ============================================
// Only a family member's sign-in gets an answer. The stations are the rows of
// public.weather_stations (the schools' as chosen, home's set in Admin). The
// readings come from Synoptic's free Open Access tier with SYNOPTIC_TOKEN,
// asked at most every quarter hour however often the app opens (the last
// answer is kept in public.outside_cache), and a failed ask waits five
// minutes. A station that has gone quiet hands over to its fallback, and the
// answer says so. Home's readings are returned without its station's name or
// place. Deployed with --no-verify-jwt because it checks the caller itself.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { stationsUrl, shapeStations, choose, KEEP_MS } from '../_shared/stations.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TOKEN = Deno.env.get('SYNOPTIC_TOKEN') ?? ''
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
let lastFail = 0

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return reply(403, { error: 'Sign in first' })
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: family } = await asUser.rpc('is_family')
  if (family !== true) return reply(403, { error: 'For the family only' })
  if (!TOKEN || !SERVICE_KEY) return reply(503, { error: 'The stations aren’t set up yet' })

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: kept } = await db.from('outside_cache').select('data, fetched_at').eq('key', 'stations').maybeSingle()
  const { data: rows, error: rowsErr } = await db.from('weather_stations').select('place, stid, fallback, updated_at')
  if (rowsErr || !rows) return reply(500, { error: 'The stations couldn’t be read' })
  // A change in Admin since the last answer asks again at once
  const changed = kept && rows.some((r) => Date.parse(r.updated_at) > Date.parse(kept.fetched_at))
  if (kept && !changed && Date.now() - Date.parse(kept.fetched_at) < KEEP_MS) return reply(200, kept.data)
  if (Date.now() - lastFail < 5 * 60e3) return reply(200, kept ? { ...kept.data, stale: true } : { error: 'Synoptic couldn’t be reached just now' })

  const stids = rows.flatMap((r) => [r.stid, r.fallback]).filter(Boolean)
  if (!stids.length) return reply(200, { at: Date.now(), places: {} })
  try {
    const res = await fetch(stationsUrl(stids, TOKEN), { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } })
    const json = await res.json().catch(() => null)
    const code = json && json.SUMMARY ? Number(json.SUMMARY.RESPONSE_CODE) : 0
    if (!res.ok || !json || (code !== 1 && code !== 2)) {
      lastFail = Date.now()
      const why = json && json.SUMMARY && /token|auth/i.test(String(json.SUMMARY.RESPONSE_MESSAGE || '')) ? 'Synoptic didn’t accept the token' : 'Synoptic couldn’t be reached just now'
      return reply(200, kept ? { ...kept.data, stale: true, error: why } : { error: why })
    }
    const data = { at: Date.now(), places: choose(rows, shapeStations(json, Date.now())) }
    await db.from('outside_cache').upsert({ key: 'stations', data, fetched_at: new Date().toISOString() })
    return reply(200, data)
  } catch {
    lastFail = Date.now()
    return reply(200, kept ? { ...kept.data, stale: true } : { error: 'Synoptic couldn’t be reached just now' })
  }
})
