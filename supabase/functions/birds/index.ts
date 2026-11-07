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
import { recentUrl, notableUrl, inatUrl, inatTaxonUrl, shapeBirds, photoOf, taxonIdOf, photoFromTaxon, inatObservationsUrl, photoFromObservations, KEEP_MS, KEEP_MORE_MS, KEEP_NEAREST_MS, hotspotsUrl, regionRecentUrl, statsUrl, nearestUrl, listsUrl, checklistUrl, nearbyChecklists, countSpecies, withFrequency, validCode, shapeHotspots, shapeCounty, shapePossible, shapeNearest, COUNTY, nearCell, regionOf, km, NEAR_CELLS_A_DAY, NEAR_SAMPLE_N } from '../_shared/birds.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const KEY = Deno.env.get('EBIRD_API_KEY') ?? ''
const TOWN = { lat: 34.0922, lng: -117.435 } // Fontana's centre, as src/lib/sky.js's HOME_TOWN
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
let lastFail = 0
let memory: { data: Record<string, unknown>, at: number } | null = null // if the table can't be read or written, this instance still remembers
const photos = new Map<string, { photo: unknown, at: number }>() // a species' photo rarely changes; "none" is kept six hours, a failed lookup is never kept
const NONE_MS = 6 * 3600e3
const nearest = new Map<string, { data: unknown, at: number }>() // one bird's nearest sightings, kept an hour in this instance
let moreMemory: { data: Record<string, unknown>, at: number } | null = null

const get = async (url: string, headers: Record<string, string> = {}) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json', 'User-Agent': 'TeamHicksFamilyApp/1.0', ...headers } })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

/** An openly licensed photo of a bird: its default one, else the first of its others that is, else one from a well-voted sighting. A failure throws (and is not remembered). */
async function photoFor(sci: string) {
  const found = await get(inatUrl(sci))
  const first = photoOf(found)
  if (first) return first
  const id = taxonIdOf(found)
  if (!id) return null
  const own = photoFromTaxon(await get(inatTaxonUrl(id)))
  if (own) return own
  return photoFromObservations(await get(inatObservationsUrl(id)))
}

/** Photos for these birds, four lookups at a time; a bird whose lookup failed is tried again next hour, not given up on. */
async function addPhotos(list: Record<string, unknown>[]) {
  const todo = list.filter((b) => { const h = photos.get(String(b.sci)); return !h || (h.photo === null && Date.now() - h.at > NONE_MS) })
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(todo.slice(i, i + 4).map(async (b) => {
      try { photos.set(String(b.sci), { photo: await photoFor(String(b.sci)), at: Date.now() }) } catch { /* try again next time */ }
    }))
  }
  for (const b of list) { const h = photos.get(String(b.sci)); b.photo = h ? h.photo : null }
}

/** Where one bird was last seen near us: asked of eBird at most hourly per bird, kept in this instance. */
async function nearestAnswer(code: string) {
  if (!validCode(code)) return reply(400, { error: 'Not a bird code' })
  const hit = nearest.get(code)
  if (hit && Date.now() - hit.at < KEEP_NEAREST_MS) return reply(200, hit.data)
  try {
    const obs = await get(nearestUrl(code, TOWN), { 'X-eBirdApiToken': KEY })
    const data = { at: Date.now(), code, sightings: shapeNearest(obs, TOWN) }
    if (nearest.size > 200) nearest.clear()
    nearest.set(code, { data, at: Date.now() })
    return reply(200, data)
  } catch (e) {
    return reply(200, hit ? { ...(hit.data as object), stale: true } : { error: String(e && (e as Error).message) === '403' ? 'eBird didn’t accept the key' : 'eBird couldn’t be reached just now' })
  }
}

/** Hotspots, the county's numbers and what is possible: asked at most every three hours; the last answer is kept in outside_cache. */
async function moreAnswer(db: ReturnType<typeof createClient>) {
  const { data: row } = await db.from('outside_cache').select('data, fetched_at').eq('key', 'birds-more').maybeSingle()
  const kept = row ? { data: row.data as Record<string, unknown>, at: Date.parse(row.fetched_at) } : moreMemory
  if (kept && Date.now() - kept.at < KEEP_MORE_MS) return reply(200, kept.data)
  if (Date.now() - lastFail < 10 * 60e3) return reply(200, kept ? { ...kept.data, stale: true } : { error: 'eBird couldn’t be reached just now' })
  try {
    const head = { 'X-eBirdApiToken': KEY }
    const day = (n: number) => new Date(Date.now() - n * 86400e3).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    const [hot, near, county, region] = await Promise.all([
      get(hotspotsUrl(TOWN), head).catch(() => []), get(recentUrl(TOWN), head).catch(() => []),
      get(statsUrl(day(1)), head).catch(() => null), get(regionRecentUrl(COUNTY, 30), head).catch(() => []),
    ])
    const nearCodes = (near as { speciesCode: string }[]).map((o) => o.speciesCode)
    const data = { at: Date.now(), hotspots: shapeHotspots(hot, near, TOWN), county: shapeCounty(county, day(1)), possible: shapePossible(region, nearCodes) }
    moreMemory = { data, at: Date.now() }
    await db.from('outside_cache').upsert({ key: 'birds-more', data, fetched_at: new Date().toISOString() })
    return reply(200, data)
  } catch (e) {
    lastFail = Date.now()
    return reply(200, kept ? { ...kept.data, stale: true } : { error: 'eBird couldn’t be reached just now' })
  }
}

/**
 * The birds where one of us is, away from home: the same week's sightings, notable birds, a sample of
 * checklists and the hotspots, about the centre of a tenth-of-a-degree cell (never a closer point). Kept an
 * hour per cell in outside_cache; at most NEAR_CELLS_A_DAY new cells a day. Home's own cell gets home's answer.
 */
async function nearAnswer(db: ReturnType<typeof createClient>, lat: unknown, lng: unknown) {
  const cell = nearCell(lat as number, lng as number)
  if (!cell) return reply(400, { error: 'Not a place' })
  if (km(TOWN, cell) < 16) return reply(200, { home: true })
  const { data: row } = await db.from('outside_cache').select('data, fetched_at').eq('key', cell.key).maybeSingle()
  const kept = row ? { data: row.data as Record<string, unknown>, at: Date.parse(row.fetched_at) } : null
  if (kept && Date.now() - kept.at < KEEP_MS) return reply(200, kept.data)
  if (!kept) {
    const since = new Date(Date.now() - 864e5).toISOString()
    const { count } = await db.from('outside_cache').select('key', { count: 'exact', head: true }).like('key', 'birds-near:%').gte('fetched_at', since)
    if ((count ?? 0) >= NEAR_CELLS_A_DAY) return reply(200, { error: 'The birds have been looked up in enough new places for today: try again tomorrow' })
  }
  try {
    const head = { 'X-eBirdApiToken': KEY }
    const [recent, notable, hot] = await Promise.all([get(recentUrl(cell), head), get(notableUrl(cell), head).catch(() => []), get(hotspotsUrl(cell), head).catch(() => [])])
    let counts: Record<string, number> = {}, sample = 0
    const region = regionOf(hot as never[])
    if (region) {
      try {
        const subs = nearbyChecklists(await get(listsUrl(region), head), cell, NEAR_SAMPLE_N)
        const views: unknown[] = []
        for (let i = 0; i < subs.length; i += 5) views.push(...await Promise.all(subs.slice(i, i + 5).map((s) => get(checklistUrl(s), head).catch(() => null))))
        ;({ counts, sample } = countSpecies(views as never[]))
      } catch (e) { console.error('near sample:', String(e && (e as Error).message)) }
    }
    const species = withFrequency(shapeBirds(recent, notable), counts, sample)
    const shown = new Set([...[...species.filter((b) => !b.notable)].sort((a, b) => b.reports - a.reports).slice(0, 8), ...species.filter((b) => b.notable).slice(0, 6)])
    await addPhotos([...shown] as unknown as Record<string, unknown>[])
    const data = { at: Date.now(), cell: { lat: cell.lat, lng: cell.lng }, species, sample, hotspots: shapeHotspots(hot, recent, cell) }
    const { error } = await db.from('outside_cache').upsert({ key: cell.key, data, fetched_at: new Date().toISOString() })
    if (error) console.error('outside_cache near write:', error.message) // the birds-near migration hasn't been run
    return reply(200, data)
  } catch (e) {
    const why = String(e && (e as Error).message) === '403' ? 'eBird didn’t accept the key' : 'eBird couldn’t be reached just now'
    return reply(200, kept ? { ...kept.data, stale: true, error: why } : { error: why })
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
  if (!KEY || !SERVICE_KEY) return reply(503, { error: 'The birds aren’t set up yet' })

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  let body: { kind?: string, code?: string, lat?: unknown, lng?: unknown } = {}
  try { body = await req.json() } catch { /* no body: the week's birds */ }
  if (body.kind === 'nearest') return nearestAnswer(String(body.code || ''))
  if (body.kind === 'more') return moreAnswer(db)
  if (body.kind === 'near') return nearAnswer(db, body.lat, body.lng)
  const { data: row, error: readErr } = await db.from('outside_cache').select('data, fetched_at').eq('key', 'birds').maybeSingle()
  if (readErr) console.error('outside_cache read:', readErr.message) // the newest migration hasn't been run
  const kept = row ? { data: row.data as Record<string, unknown>, at: Date.parse(row.fetched_at) } : memory
  if (kept && Date.now() - kept.at < KEEP_MS) return reply(200, kept.data)
  if (Date.now() - lastFail < 10 * 60e3) return reply(200, kept ? { ...kept.data, stale: true } : { error: 'eBird couldn’t be reached just now' })

  try {
    const head = { 'X-eBirdApiToken': KEY }
    const [recent, notable] = await Promise.all([get(recentUrl(TOWN), head), get(notableUrl(TOWN), head).catch(() => [])])
    // How often each shows up: a sample of the latest checklists near town (the recent-sightings feed gives one line a species)
    let counts: Record<string, number> = {}, sample = 0
    try {
      const subs = nearbyChecklists(await get(listsUrl(), head), TOWN)
      const views: unknown[] = []
      for (let i = 0; i < subs.length; i += 5) views.push(...await Promise.all(subs.slice(i, i + 5).map((s) => get(checklistUrl(s), head).catch(() => null))))
      ;({ counts, sample } = countSpecies(views as never[]))
    } catch (e) { console.error('sample:', String(e && (e as Error).message)) }
    const species = withFrequency(shapeBirds(recent, notable), counts, sample)
    // The ones the screens show: the most reported and the notable ones
    const shown = new Set([...[...species.filter((b) => !b.notable)].sort((a, b) => b.reports - a.reports).slice(0, 8), ...species.filter((b) => b.notable).slice(0, 8)])
    await addPhotos([...shown] as unknown as Record<string, unknown>[])
    const data = { at: Date.now(), species, sample }
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
