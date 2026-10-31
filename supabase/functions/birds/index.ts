// ============================================
// birds -- the birds seen around us this week, from eBird
// ============================================
// Only a family member's sign-in gets an answer. eBird is asked (with
// EBIRD_API_KEY) at most once an hour, about the town's centre, never our
// house; the last answer is kept in public.outside_cache. Photos are looked
// up on iNaturalist for the first dozen species and kept only with a
// Creative Commons licence and their credit. Deployed with --no-verify-jwt
// because it checks the caller itself.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { recentUrl, notableUrl, inatUrl, inatTaxonUrl, shapeBirds, photoOf, taxonIdOf, photoFromTaxon, KEEP_MS } from '../_shared/birds.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const KEY = Deno.env.get('EBIRD_API_KEY') ?? ''
const TOWN = { lat: 34.0922, lng: -117.435 } // Fontana's centre, as src/lib/sky.js's HOME_TOWN
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
let lastFail = 0
let memory: { data: Record<string, unknown>, at: number } | null = null // if the table can't be read or written, this instance still remembers
const photos = new Map<string, unknown>() // kept in this instance: a species' photo rarely changes

const get = async (url: string, headers: Record<string, string> = {}) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json', 'User-Agent': 'TeamHicksFamilyApp/1.0', ...headers } })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

/** An openly licensed photo of a bird: its default one, else the first of its others that is. */
async function photoFor(sci: string) {
  const found = await get(inatUrl(sci))
  const first = photoOf(found)
  if (first) return first
  const id = taxonIdOf(found)
  return id ? photoFromTaxon(await get(inatTaxonUrl(id))) : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return reply(403, { error: 'Sign in first' })
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: family } = await asUser.rpc('is_family')
  if (family !== true) return reply(403, { error: 'For the family only' })
  if (!KEY || !SERVICE_KEY) return reply(503, { error: 'The birds aren’t set up yet' })

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: row, error: readErr } = await db.from('outside_cache').select('data, fetched_at').eq('key', 'birds').maybeSingle()
  if (readErr) console.error('outside_cache read:', readErr.message) // the newest migration hasn't been run
  const kept = row ? { data: row.data as Record<string, unknown>, at: Date.parse(row.fetched_at) } : memory
  if (kept && Date.now() - kept.at < KEEP_MS) return reply(200, kept.data)
  if (Date.now() - lastFail < 10 * 60e3) return reply(200, kept ? { ...kept.data, stale: true } : { error: 'eBird couldn’t be reached just now' })

  try {
    const head = { 'X-eBirdApiToken': KEY }
    const [recent, notable] = await Promise.all([get(recentUrl(TOWN), head), get(notableUrl(TOWN), head).catch(() => [])])
    const species = shapeBirds(recent, notable).slice(0, 40)
    for (const b of species.slice(0, 12)) {
      if (!photos.has(b.sci)) photos.set(b.sci, await photoFor(b.sci).catch(() => null))
      ;(b as Record<string, unknown>).photo = photos.get(b.sci)
    }
    const data = { at: Date.now(), species }
    memory = { data, at: Date.now() }
    const { error: writeErr } = await db.from('outside_cache').upsert({ key: 'birds', data, fetched_at: new Date().toISOString() })
    if (writeErr) console.error('outside_cache write:', writeErr.message)
    return reply(200, data)
  } catch (e) {
    lastFail = Date.now()
    const why = String(e && (e as Error).message) === '403' ? 'eBird didn’t accept the key' : 'eBird couldn’t be reached just now'
    return reply(200, kept ? { ...kept.data, stale: true, error: why } : { error: why })
  }
})
