// ============================================
// wild -- a picture for each wild season on World, from the site that has the news
// ============================================
// Only a family member's sign-in gets an answer. Each season's own site
// (_shared/wildpics.js) is read once a week at most, however often the app
// opens: its preview picture's address, its page and the site's name are kept
// in public.outside_cache (key 'wild'); the browser loads the picture from the
// site itself. A page that can't be read, or names no picture of its own, is
// left out and the card keeps its drawing. Deployed with --no-verify-jwt
// because it checks the caller itself.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { WILD_SOURCES, previewImage, isPicture, entryFor, cleanPictures, sameSite } from '../_shared/wildpics.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const WEEK_MS = 7 * 24 * 3600e3, RETRY_MS = 6 * 3600e3
let lastTry = 0 // a read that found nothing waits six hours in this instance
const UA = { 'User-Agent': 'TeamHicksFamilyApp/1.0 (a family’s own app; reads each page’s preview picture)', Accept: 'text/html,image/*' }

async function readOne(id: string): Promise<{ url: string, page: string, credit: string } | null> {
  const [page] = WILD_SOURCES[id as keyof typeof WILD_SOURCES]
  try {
    const res = await fetch(page, { signal: AbortSignal.timeout(10000), headers: UA })
    if (!res.ok || !sameSite(new URL(res.url).hostname, page)) return null // a redirect may only land on the site itself
    const img = previewImage((await res.text()).slice(0, 1_500_000), res.url)
    if (!img) return null
    const head = await fetch(img, { method: 'HEAD', signal: AbortSignal.timeout(8000), headers: UA, redirect: 'follow' })
    if (!head.ok || !isPicture(head.headers.get('content-type'), head.headers.get('content-length'))) return null
    if (new URL(head.url).protocol !== 'https:') return null
    return entryFor(id, img)
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

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: kept } = await db.from('outside_cache').select('data, fetched_at').eq('key', 'wild').maybeSingle()
  const age = kept ? Date.now() - Date.parse(kept.fetched_at) : Infinity
  const keptAnswer = (extra: Record<string, unknown> = {}) => ({ at: Date.parse(kept!.fetched_at), pictures: cleanPictures(kept!.data && kept!.data.pictures), ...extra })
  if (kept && age < WEEK_MS) return reply(200, keptAnswer())
  if (Date.now() - lastTry < RETRY_MS) return reply(200, kept ? keptAnswer({ stale: true }) : { at: Date.now(), pictures: {} })
  lastTry = Date.now()

  const ids = Object.keys(WILD_SOURCES)
  const read = await Promise.all(ids.map((id) => readOne(id)))
  const pictures = cleanPictures(Object.fromEntries(ids.map((id, i) => [id, read[i]]).filter(([, v]) => v)))
  if (!Object.keys(pictures).length) return reply(200, kept ? keptAnswer({ stale: true }) : { at: Date.now(), pictures: {} })
  const at = new Date().toISOString()
  await db.from('outside_cache').upsert({ key: 'wild', data: { pictures }, fetched_at: at }, { onConflict: 'key' })
  return reply(200, { at: Date.parse(at), pictures })
})
