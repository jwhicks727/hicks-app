// ============================================
// around -- what the open map knows around where one of us is
// ============================================
// Only a family member's sign-in gets an answer. The app sends a
// tenth-of-a-degree cell (about ten kilometres), never a closer point, and the
// town's name it already shows. This reads OpenStreetMap (through Overpass) for
// roasters, breweries, book and record shops, trailheads, viewpoints, Catholic
// churches, museums and galleries, and Wikipedia's articles near the cell with
// their Wikimedia Commons photos (open licences only, credited). It keeps the
// answer in public.area_guides (kind 'map') and reads again at most once a week
// per cell, ten or so new cells a day. Everything read is data, never
// instructions. Deployed with --no-verify-jwt because it checks the caller itself.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { cellOf, validCellId, clean, overpassQuery, OVERPASS, shapeMap, geoSearchUrl, shapeGeo, pagesUrl, shapePages, townPageUrl, imageInfoUrl, shapeImages, sightsFrom, MAP_KEEP_MS, MAP_CELLS_A_DAY, UA } from '../_shared/around.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const getJson = async (url: string, init: RequestInit = {}, ms = 15000) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms), headers: { Accept: 'application/json', 'User-Agent': UA, ...(init.headers || {}) } })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

async function readMap(cell: { lat: number, lng: number, id: string }, town: string, region: string) {
  const [osm, geo] = await Promise.all([
    getJson(OVERPASS, { method: 'POST', body: new URLSearchParams({ data: overpassQuery(cell) }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 30000).catch((e) => { console.error('overpass:', String(e)); return null }),
    getJson(geoSearchUrl(cell)).catch(() => null),
  ])
  const nearby = shapeGeo(geo)
  const [pagesJson, townJson] = await Promise.all([
    nearby.length ? getJson(pagesUrl(nearby.map((g) => g.id))).catch(() => null) : null,
    town ? getJson(townPageUrl(region ? `${town}, ${region}` : town)).then((j) => (shapePages(j)[0] ? j : getJson(townPageUrl(town)))).catch(() => null) : null,
  ])
  const pages = shapePages(pagesJson)
  const townPage = shapePages(townJson)[0] || null
  const files = [...new Set([...pages.map((p) => p.image), townPage && townPage.image].filter(Boolean) as string[])]
  const images = files.length ? shapeImages(await getJson(imageInfoUrl(files)).catch(() => null)) : {}
  const photoOf = (f: string | null) => (f ? images[f.replace(/_/g, ' ')] || images[f] || null : null)
  return {
    at: Date.now(), cell: { lat: cell.lat, lng: cell.lng }, town,
    hero: townPage ? { title: townPage.title, extract: townPage.extract, url: townPage.url, photo: photoOf(townPage.image) } : null,
    sights: sightsFrom(nearby, pages, images),
    map: osm ? shapeMap(osm, cell) : null,
    mapError: osm ? null : 'OpenStreetMap couldn’t be reached just now',
  }
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

  let body: { cell?: unknown, town?: unknown, region?: unknown } = {}
  try { body = await req.json() } catch { return reply(400, { error: 'Which area?' }) }
  if (!validCellId(body.cell)) return reply(400, { error: 'Not an area' })
  const [la, ln] = String(body.cell).split(',').map(Number)
  const cell = cellOf(la, ln)
  if (!cell) return reply(400, { error: 'Not an area' })
  const town = clean(body.town, 80), region = clean(body.region, 60)

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: rows } = await db.from('area_guides').select('id, data, fetched_at').eq('cell', cell.id).eq('kind', 'map').eq('status', 'ready').order('fetched_at', { ascending: false }).limit(1)
  const kept = rows && rows[0] ? { id: rows[0].id, data: rows[0].data as Record<string, unknown>, at: Date.parse(rows[0].fetched_at) } : null
  if (kept && Date.now() - kept.at < MAP_KEEP_MS && kept.data.map) return reply(200, { id: kept.id, ...kept.data })
  if (!kept) {
    const since = new Date(Date.now() - 864e5).toISOString()
    const { count } = await db.from('area_guides').select('id', { count: 'exact', head: true }).eq('kind', 'map').gte('fetched_at', since)
    if ((count ?? 0) >= MAP_CELLS_A_DAY) return reply(200, { error: 'The map has been read for enough new places today: try again tomorrow' })
  }
  try {
    const data = await readMap(cell, town, region)
    if (!data.map && !data.sights.length) return reply(200, kept ? { id: kept.id, ...kept.data, stale: true } : { error: 'The open map couldn’t be reached just now' })
    const { data: ins, error } = await db.from('area_guides').insert({ cell: cell.id, kind: 'map', status: 'ready', town: town || null, data }).select('id').single()
    if (error) console.error('area_guides write:', error.message) // the migration hasn't been run
    return reply(200, { id: ins ? ins.id : null, ...data })
  } catch (e) {
    console.error('around:', String(e && (e as Error).message))
    return reply(200, kept ? { id: kept.id, ...kept.data, stale: true } : { error: 'The open map couldn’t be reached just now' })
  }
})
