// ============================================
// readings -- the Mass readings for a date, read from USCCB's page for the
// signed-in family to read in the app (docs/DATABASE.md, "The readings")
// ============================================
// Only a family member's sign-in gets an answer: this is not an open proxy.
// Nothing is stored; an answer is kept in this instance's memory for six
// hours so a busy morning asks USCCB once. Deployed with --no-verify-jwt
// because it checks the caller itself.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { readingsPageUrl, parseReadings } from '../_shared/readings.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const kept = new Map<string, { at: number, data: unknown }>()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return reply(403, { error: 'Sign in first' })
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: family } = await asUser.rpc('is_family')
  if (family !== true) return reply(403, { error: 'For the family only' })

  let body: { date?: string, variant?: string } = {}
  try { body = await req.json() } catch { return reply(400, { error: 'Say which date' }) }
  const url = readingsPageUrl(body.date ?? '', body.variant ?? '')
  if (!url) return reply(400, { error: 'Say which date' })
  const years = Math.abs(Date.parse(body.date + 'T12:00:00Z') - Date.now()) / (365 * 864e5)
  if (!(years <= 3)) return reply(400, { error: 'Within three years of today' })

  const hit = kept.get(url)
  if (hit && Date.now() - hit.at < 6 * 3600e3) return reply(200, hit.data)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'TeamHicksFamilyApp/1.0', Accept: 'text/html' } })
    if (!res.ok) return reply(502, { error: `USCCB answered ${res.status}`, url })
    const html = await res.text()
    const data = { ...parseReadings(html.slice(0, 2_000_000), body.date), url }
    if (kept.size > 200) kept.clear()
    kept.set(url, { at: Date.now(), data })
    return reply(200, data)
  } catch {
    return reply(502, { error: 'USCCB couldn’t be reached just now', url })
  }
})
