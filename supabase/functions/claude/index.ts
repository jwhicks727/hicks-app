// ============================================
// claude -- the one door to Claude for the whole app (docs/DATABASE.md, "Claude")
// ============================================
// Only a family member's sign-in gets an answer, and the parents' tasks only
// a parent's. Every call uses the latest Sonnet (asked of the Models API, not
// written here), keeps under the family's daily and monthly spend, and is
// recorded in ai_usage. What each task sends is in _shared/claude.js; the
// screen that asks says so first. Laurie's food rules go only with a parent's
// request. Deployed with --no-verify-jwt because it checks the caller
// itself; ANTHROPIC_API_KEY lives only in this function's secrets.

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import {
  FALLBACK_SONNET, pickLatest, costCents, overCap, CAPS, checkUpload, uploadBlock, checkHistory,
  TASKS, KITCHEN_BRIEF, kitchenNow, kitchenTools, findRecipe, planAsk, writeAsk, RECIPE_FROM_IMAGE_ASK, calendarAsk, gardenAsk,
} from '../_shared/claude.js'
import { cellOf, validCellId, clean as cleanText, GUIDE_TOOL, GUIDE_BRIEF, guideAsk, cleanGuide, searchedUrls, searchesIn, SEARCH_CENTS, matchPlace, publicSite, EAT_TOOL, eatAsk, cleanPlaces, GUIDE_KEEP_MS, BUILDING_STALE_MS, GUIDES_A_DAY, UA } from '../_shared/around.js'
import { previewImage, isPicture } from '../_shared/wildpics.js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const caps = { dayCents: Number(Deno.env.get('AI_DAILY_CAP_CENTS') ?? CAPS.dayCents), monthCents: Number(Deno.env.get('AI_MONTHLY_CAP_CENTS') ?? CAPS.monthCents) }
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const client = new Anthropic() // reads ANTHROPIC_API_KEY

// The latest Sonnet, looked up at most twice a day per instance
let model = { id: '', at: 0 }
async function latestSonnet(): Promise<string> {
  if (model.id && Date.now() - model.at < 12 * 3600e3) return model.id
  try {
    const all = []
    for await (const m of client.models.list()) all.push(m)
    model = { id: pickLatest(all) || FALLBACK_SONNET, at: Date.now() }
  } catch {
    model = { id: model.id || FALLBACK_SONNET, at: Date.now() - 11 * 3600e3 } // try the list again within the hour
  }
  return model.id
}

// One request to Claude; a policy decline is retried on Anthropic's recommended fallback model
async function ask(params: Record<string, unknown>, stream = false) {
  const body = { ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
  try {
    // deno-lint-ignore no-explicit-any
    return stream ? await client.beta.messages.stream(body as any).finalMessage() : await client.beta.messages.create(body as any)
  } catch (e) {
    // A newer model may not take fallbacks yet: once more without them
    if (e instanceof Anthropic.BadRequestError && /fallback/i.test(String(e.message))) {
      const { betas: _b, fallbacks: _f, ...plain } = body
      // deno-lint-ignore no-explicit-any
      return stream ? await client.messages.stream(plain as any).finalMessage() : await client.messages.create(plain as any)
    }
    throw e
  }
}

const textOf = (msg: { content: Array<{ type: string, text?: string }> }) => msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
const jsonOf = (msg: { content: Array<{ type: string, text?: string }> }) => { try { return JSON.parse(textOf(msg)) } catch { return null } }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405, { error: 'POST only' })
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return reply(403, { error: 'Sign in first' })
  const db = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const [{ data: family }, { data: parent }] = await Promise.all([db.rpc('is_family'), db.rpc('is_parent')])
  if (family !== true) return reply(403, { error: 'For the family only' })

  // deno-lint-ignore no-explicit-any
  let body: any = {}
  try { body = await req.json() } catch { return reply(400, { error: 'Nothing to ask' }) }
  // deno-lint-ignore no-explicit-any
  const task = (TASKS as Record<string, any>)[String(body.task)]
  if (!task) return reply(400, { error: 'Unknown task' })
  if (task.who === 'parent' && parent !== true) return reply(403, { error: 'Jason or Laurie can do this one' })
  if (task.upload) { const why = checkUpload(body.file, { pdf: Boolean(task.pdf) }); if (why) return reply(400, { error: why }) }

  // Within the family's budget?
  const { data: spend } = await db.rpc('ai_spend')
  const capped = overCap(Array.isArray(spend) ? spend[0] : spend, caps)
  if (capped) return reply(429, { error: capped })

  const id = await latestSonnet()
  const base = { model: id, max_tokens: task.maxTokens, output_config: { effort: task.effort } as Record<string, unknown> }
  if (task.schema) base.output_config.format = { type: 'json_schema', schema: task.schema }
  const record = async (msg: { model?: string, usage?: unknown }) => {
    // deno-lint-ignore no-explicit-any
    const u = (msg.usage ?? {}) as any
    await db.rpc('ai_record', { p_task: body.task, p_model: msg.model ?? id, p_in: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), p_out: u.output_tokens ?? 0, p_cents: costCents(u) })
  }
  const refused = (msg: { stop_reason?: string | null }) => msg.stop_reason === 'refusal'

  try {
    // ---- What's around here: a guide to the place, written in the background ----------
    if (body.task === 'around-here') return await aroundHere(db, body, base, parent === true)
    if (body.task === 'eat-well') return await eatWell(db, body, base)

    // ---- The Kitchen's conversation, with tools that only propose -------------------
    if (body.task === 'kitchen-chat') {
      const why = checkHistory(body.messages)
      if (why) return reply(400, { error: why })
      const ctx = await kitchenContext(db, parent === true, body.page)
      const system = [
        { type: 'text', text: KITCHEN_BRIEF, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: kitchenNow({ today: today(), ...ctx }) },
      ]
      const tools = kitchenTools({ canRules: parent === true })
      const messages = [...body.messages]
      const turns: unknown[] = [], proposals: unknown[] = []
      for (let round = 0; round < 6; round++) {
        const msg = await ask({ ...base, system, tools, messages })
        await record(msg)
        if (refused(msg)) return reply(200, { turns: [...turns, { role: 'assistant', content: [{ type: 'text', text: 'I can’t help with that one.' }] }], proposals })
        const content = msg.content.filter((b: { type: string }) => b.type !== 'fallback')
        turns.push({ role: 'assistant', content }); messages.push({ role: 'assistant', content })
        const uses = content.filter((b: { type: string }) => b.type === 'tool_use')
        if (msg.stop_reason !== 'tool_use' || !uses.length) break
        const results = await Promise.all(uses.map(async (u: { id: string, name: string, input: { title?: string } }) => {
          // Reading is answered here, as the caller (row-level security decides); everything else only proposes
          if (u.name === 'read_recipe') return { type: 'tool_result', tool_use_id: u.id, content: await readRecipe(db, ctx.list, String(u.input?.title ?? ''), parent === true) }
          proposals.push({ tool: u.name, input: u.input })
          return { type: 'tool_result', tool_use_id: u.id, content: 'Shown to the family to confirm. Not saved yet.' }
        }))
        turns.push({ role: 'user', content: results }); messages.push({ role: 'user', content: results })
      }
      return reply(200, { turns, proposals, model: id })
    }

    // ---- The week's ideas -------------------------------------------------------------
    if (body.task === 'plan-week') {
      const ctx = await kitchenContext(db, true)
      const msg = await ask({ ...base, system: [{ type: 'text', text: KITCHEN_BRIEF, cache_control: { type: 'ephemeral' } }, { type: 'text', text: kitchenNow({ today: today(), ...ctx }) }], messages: [{ role: 'user', content: planAsk({ count: body.count, asked: body.asked, skip: body.skip, avoid: ctx.recipes.map((r: { title: string }) => r.title) }) }] })
      await record(msg)
      return refused(msg) ? reply(200, { ideas: [] }) : reply(200, { ...(jsonOf(msg) ?? { ideas: [] }), model: id })
    }

    // ---- Full recipes for the picked ideas -----------------------------------------------
    if (body.task === 'write-recipes') {
      const ideas = Array.isArray(body.ideas) ? body.ideas.slice(0, 8) : []
      if (!ideas.length) return reply(400, { error: 'Pick at least one idea' })
      const ctx = await kitchenContext(db, true)
      const msg = await ask({ ...base, system: [{ type: 'text', text: KITCHEN_BRIEF, cache_control: { type: 'ephemeral' } }, { type: 'text', text: kitchenNow({ today: today(), ...ctx }) }], messages: [{ role: 'user', content: writeAsk({ ideas }) }] }, true)
      await record(msg)
      return refused(msg) ? reply(200, { recipes: [] }) : reply(200, { ...(jsonOf(msg) ?? { recipes: [] }), model: id })
    }

    // ---- A recipe from a photo or screenshot -----------------------------------------------
    if (body.task === 'recipe-from-image') {
      // With the kitchen's context, Laurie's rules included (a parent's task), so her plate is checked against them
      const ctx = await kitchenContext(db, true)
      const msg = await ask({ ...base, system: [{ type: 'text', text: KITCHEN_BRIEF, cache_control: { type: 'ephemeral' } }, { type: 'text', text: kitchenNow({ today: today(), ...ctx }) }], messages: [{ role: 'user', content: [uploadBlock(body.file), { type: 'text', text: RECIPE_FROM_IMAGE_ASK }] }] })
      await record(msg)
      return refused(msg) ? reply(200, { recipes: [] }) : reply(200, { ...(jsonOf(msg) ?? { recipes: [] }), model: id })
    }

    // ---- A calendar from a screenshot, photo or PDF ---------------------------------------
    if (body.task === 'calendar-from-image') {
      const msg = await ask({ ...base, messages: [{ role: 'user', content: [uploadBlock(body.file), { type: 'text', text: calendarAsk({ hint: body.hint, year: Number(today().slice(0, 4)) }) }] }] })
      await record(msg)
      return refused(msg) ? reply(200, { events: [] }) : reply(200, { ...(jsonOf(msg) ?? { events: [] }), model: id })
    }

    // ---- A look at a garden photo --------------------------------------------------------
    if (body.task === 'garden-photo') {
      const month = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'long' }).format(new Date())
      const msg = await ask({ ...base, messages: [{ role: 'user', content: [uploadBlock(body.file), { type: 'text', text: gardenAsk({ spot: String(body.spot ?? '').slice(0, 200), plants: Array.isArray(body.plants) ? body.plants.map(String) : [], indoor: Boolean(body.indoor), question: body.question, month }) }] }] })
      await record(msg)
      return refused(msg) ? reply(200, { analysis: null }) : reply(200, { analysis: jsonOf(msg), model: id })
    }
    return reply(400, { error: 'Unknown task' })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return reply(429, { error: 'Claude is busy just now; try again in a minute' })
    if (e instanceof Anthropic.AuthenticationError) return reply(500, { error: 'Claude’s key needs setting up (docs/SECRETS.md)' })
    if (e instanceof Anthropic.APIError) return reply(502, { error: 'Claude couldn’t answer just now' })
    return reply(500, { error: 'Something went wrong asking Claude' })
  }
})

// What the Kitchen tells Claude: read as the caller, so row-level security decides what's included
// deno-lint-ignore no-explicit-any
async function kitchenContext(db: any, isParent: boolean, page?: { slug?: string }) {
  const since = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10)
  const [prefs, recipes, ratings, fridge, plan, picked] = await Promise.all([
    db.from('kitchen_preferences').select('body').order('created_at', { ascending: false }).limit(1),
    db.from('recipes').select('id, slug, title').order('updated_at', { ascending: false }).limit(120),
    db.from('recipe_ratings').select('recipe_id, stars').limit(1000),
    db.from('fridge').select('recipe_id, status, added_on, done_on').order('added_on', { ascending: false }).limit(200),
    db.from('week_plans').select('ideas').order('created_at', { ascending: false }).limit(1),
    db.from('garden_log').select('on_date, note, spot:garden_spots(name)').eq('kind', 'harvest').gte('on_date', since).order('on_date', { ascending: false }).limit(12),
  ])
  const stars = new Map<string, number[]>()
  for (const r of ratings.data ?? []) stars.set(r.recipe_id, [...(stars.get(r.recipe_id) ?? []), r.stars])
  const last = new Map<string, string>()
  for (const f of fridge.data ?? []) if (f.status === 'cooked' && f.done_on && !last.has(f.recipe_id)) last.set(f.recipe_id, f.done_on)
  const byId = new Map((recipes.data ?? []).map((r: { id: string, title: string }) => [r.id, r.title]))
  // Laurie's rules: only for a parent asking (Jason or Laurie), never for anyone else's request.
  // (Her separate sign-off was dropped on Jason's decision, 2026-11-01: docs/DECISIONS-LOG.md.)
  let rules = ''
  if (isParent) {
    const { data: latest } = await db.from('food_rules').select('body').order('created_at', { ascending: false }).limit(1)
    if (latest && latest[0]) rules = latest[0].body
  }
  const list = (recipes.data ?? []).map((r: { id: string, slug: string, title: string }) => ({ id: r.id, slug: r.slug, title: r.title }))
  let recipe = ''
  if (page && typeof page.slug === 'string' && /^[a-z0-9-]{1,80}$/.test(page.slug)) {
    const { data } = await db.from('recipes').select('id, body').eq('slug', page.slug).limit(1)
    if (data && data[0]) recipe = await withPrivate(db, data[0], isParent)
  }
  return {
    preferences: prefs.data && prefs.data[0] ? prefs.data[0].body : '',
    rules,
    recipes: (recipes.data ?? []).map((r: { id: string, title: string }) => {
      const s = stars.get(r.id) ?? []
      return { title: r.title, stars: s.length ? (s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) : '', last: last.get(r.id) ?? '' }
    }),
    fridge: (fridge.data ?? []).filter((f: { status: string }) => f.status === 'waiting').map((f: { recipe_id: string }) => byId.get(f.recipe_id)).filter(Boolean),
    plan: plan.data && plan.data[0] ? plan.data[0] : null,
    // deno-lint-ignore no-explicit-any
    garden: (picked.data ?? []).map((h: any) => `${h.note || 'a pick'} from ${h.spot ? h.spot.name : 'the garden'} (${h.on_date})`),
    page: recipe ? { recipe, slug: page?.slug } : undefined,
    list,
  }
}

// A recipe as the caller may read it: the shared file, and for Jason or Laurie, Laurie's plate (kept apart)
// deno-lint-ignore no-explicit-any
async function withPrivate(db: any, row: { id: string, body: string }, isParent: boolean) {
  if (!isParent) return row.body
  const { data } = await db.from('recipe_private').select('laurie_plate').eq('recipe_id', row.id).maybeSingle()
  return data && data.laurie_plate ? `${row.body.trim()}\n\n**Laurie’s plate** (kept privately; it belongs after Plating)\n${data.laurie_plate}` : row.body
}

// read_recipe: the one recipe the title means, or a list to choose from
// deno-lint-ignore no-explicit-any
async function readRecipe(db: any, list: Array<{ id: string, slug: string, title: string }>, title: string, isParent: boolean) {
  const hit = findRecipe(list, title)
  if (!hit) return `No single recipe matches “${title.slice(0, 120)}”. The cookbook has: ${list.slice(0, 120).map((r) => r.title).join('; ')}`
  const { data } = await db.from('recipes').select('id, body').eq('id', hit.id).maybeSingle()
  if (!data) return 'That recipe couldn’t be read.'
  return `slug: ${hit.slug}\n\n${(await withPrivate(db, data, isParent)).slice(0, 30000)}`
}

// ---- What's around here ---------------------------------------------------------------
// The guide is information about a place, not a change to the family's data, so it's
// kept like the outside services' answers: in area_guides, by area (never by person),
// every version a new row, written only here with the service role. One guide is
// written at a time for an area; a few new ones a day; inside the family's Claude caps,
// with each web search counted. The app polls area_guides for it while it's written.
// deno-lint-ignore no-explicit-any
async function aroundHere(db: any, body: any, base: any, isParent: boolean) {
  if (!SERVICE_KEY) return reply(503, { error: 'Not set up yet' })
  if (!validCellId(body.cell)) return reply(400, { error: 'Not an area' })
  const [la, ln] = String(body.cell).split(',').map(Number)
  const cell = cellOf(la, ln)
  if (!cell) return reply(400, { error: 'Not an area' })
  const town = cleanText(body.town, 80), region = cleanText(body.region, 60), cc = /^[A-Z]{2}$/.test(String(body.cc || '')) ? String(body.cc) : ''
  const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data: rows } = await svc.from('area_guides').select('id, status, fetched_at').eq('cell', cell.id).eq('kind', 'guide').order('fetched_at', { ascending: false }).limit(5)
  const ready = (rows ?? []).find((r: { status: string }) => r.status === 'ready')
  const building = (rows ?? []).find((r: { status: string }) => r.status === 'building')
  if (building && Date.now() - Date.parse(building.fetched_at) < BUILDING_STALE_MS) return reply(200, { status: 'building', id: building.id })
  if (building) await svc.from('area_guides').update({ status: 'failed', data: { error: 'took too long' } }).eq('id', building.id)
  if (ready && Date.now() - Date.parse(ready.fetched_at) < GUIDE_KEEP_MS && !(body.fresh && isParent)) return reply(200, { status: 'ready', id: ready.id })
  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await svc.from('area_guides').select('id', { count: 'exact', head: true }).eq('kind', 'guide').gte('fetched_at', since)
  if ((count ?? 0) >= GUIDES_A_DAY) return reply(200, { error: 'Enough new guides have been written today: try again tomorrow' })

  const [{ data: maps }, { data: settings }] = await Promise.all([
    svc.from('area_guides').select('data').eq('cell', cell.id).eq('kind', 'map').eq('status', 'ready').order('fetched_at', { ascending: false }).limit(1),
    db.from('travel_settings').select('interests').eq('id', 1).maybeSingle(),
  ])
  const mapData = maps && maps[0] ? maps[0].data : {}
  const interests = settings && settings.interests ? settings.interests : ''
  const { data: row, error: insErr } = await svc.from('area_guides').insert({ cell: cell.id, kind: 'guide', status: 'building', town: town || null, data: {} }).select('id').single()
  if (insErr || !row) return reply(200, { status: 'building' }) // another phone started it a moment ago
  const work = writeGuide(db, svc, row.id, { cell, town, region, cc, interests, mapData, base }).catch(async (e) => {
    console.error('around-here:', String(e && (e as Error).message))
    await svc.from('area_guides').update({ status: 'failed', data: { error: 'Claude couldn’t write it just now' } }).eq('id', row.id)
  })
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime
  if (rt && typeof rt.waitUntil === 'function') { rt.waitUntil(work); return reply(200, { status: 'building', id: row.id }) }
  await work
  return reply(200, { status: 'ready', id: row.id })
}

// deno-lint-ignore no-explicit-any
async function writeGuide(db: any, svc: any, rowId: number, o: any) {
  const date = today()
  const web = { type: 'web_search_20260209', name: 'web_search', max_uses: 12, ...(o.town && o.cc ? { user_location: { type: 'approximate', city: o.town, region: o.region || undefined, country: o.cc } } : {}) }
  const tools = [web, GUIDE_TOOL]
  const messages: unknown[] = [{ role: 'user', content: guideAsk({ town: o.town, region: o.region, cell: o.cell, date, interests: o.interests, map: o.mapData.map || {}, sights: o.mapData.sights || [] }) }]
  const searched: string[] = []
  let saved: unknown = null, model = ''
  for (let round = 0; round < 8 && !saved; round++) {
    const msg = await ask({ ...o.base, max_tokens: 16000, system: GUIDE_BRIEF, tools, messages }, true)
    model = msg.model || model
    // deno-lint-ignore no-explicit-any
    const u = (msg.usage ?? {}) as any
    await db.rpc('ai_record', { p_task: 'around-here', p_model: msg.model ?? o.base.model, p_in: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), p_out: u.output_tokens ?? 0, p_cents: costCents(u) + searchesIn(u) * SEARCH_CENTS })
    if (msg.stop_reason === 'refusal') break
    const content = msg.content.filter((b: { type: string }) => b.type !== 'fallback')
    searched.push(...searchedUrls(content))
    const use = content.find((b: { type: string, name?: string }) => b.type === 'tool_use' && b.name === 'save_guide')
    if (use) { saved = (use as { input: unknown }).input; break }
    messages.push({ role: 'assistant', content })
    if (msg.stop_reason !== 'pause_turn') messages.push({ role: 'user', content: 'Please call save_guide now with the finished guide.' })
  }
  if (!saved) { await svc.from('area_guides').update({ status: 'failed', data: { error: 'No guide came back' } }).eq('id', rowId); return }
  const guide = cleanGuide(saved, searched, o.mapData.map || {})
  await addPhotos(guide, o.mapData.sights || [])
  const data = { at: Date.now(), cell: { lat: o.cell.lat, lng: o.cell.lng }, town: o.town, region: o.region, date, ...guide, model, sent: 'the town, the area to about ten kilometres, and the family’s interests' }
  await svc.from('area_guides').update({ status: 'ready', data, fetched_at: new Date().toISOString() }).eq('id', rowId)
}

// A photo for each place: its Wikipedia article's Commons photo where the place is one, else the
// preview picture its own website names (checked to be a real picture on the site's own host).
// deno-lint-ignore no-explicit-any
async function addPhotos(guide: any, sights: any[]) {
  const byTitle = { map: sights.map((s) => ({ ...s, name: s.title })) }
  const todo: Array<() => Promise<void>> = []
  for (const sec of guide.sections) {
    for (const it of sec.items) {
      const sight = matchPlace(it.name, byTitle)
      if (sight && sight.photo) { it.photo = { ...sight.photo, from: 'Wikimedia Commons' }; continue }
      if (it.website && publicSite(it.website) && todo.length < 16) {
        todo.push(async () => {
          try {
            const res = await fetch(it.website, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': UA, Accept: 'text/html' } })
            if (!res.ok || !publicSite(res.url)) return
            const url = previewImage((await res.text()).slice(0, 1_500_000), res.url)
            if (!url) return
            const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000), headers: { 'User-Agent': UA } })
            if (!head.ok || !isPicture(head.headers.get('content-type'), head.headers.get('content-length'))) return
            it.photo = { url, credit: `From ${new URL(it.website).hostname.replace(/^www\./, '')}`, page: it.website, from: 'its own website' }
          } catch { /* no picture: the card draws one */ }
        })
      }
    }
  }
  for (let i = 0; i < todo.length; i += 4) await Promise.all(todo.slice(i, i + 4).map((f) => f()))
}

// Where Laurie can eat well: a parent's ask (TASKS says so; checked above), her rules read as
// the caller (row-level security keeps them the parents'), web search near the area, and only
// places with a source its own searches returned. Answered to the screen; never kept.
// deno-lint-ignore no-explicit-any
async function eatWell(db: any, body: any, base: any) {
  if (!validCellId(body.cell)) return reply(400, { error: 'Not an area' })
  const [la, ln] = String(body.cell).split(',').map(Number)
  const cell = cellOf(la, ln)
  if (!cell) return reply(400, { error: 'Not an area' })
  const { data: latest } = await db.from('food_rules').select('body').order('created_at', { ascending: false }).limit(1)
  const rules = latest && latest[0] ? latest[0].body : ''
  if (!rules) return reply(200, { error: 'Laurie’s food rules aren’t written yet (Kitchen › Rules)' })
  const { data: guides } = await db.from('area_guides').select('data').eq('cell', cell.id).eq('kind', 'guide').eq('status', 'ready').order('fetched_at', { ascending: false }).limit(1)
  // deno-lint-ignore no-explicit-any
  const known = guides && guides[0] ? ((guides[0].data.sections || []) as any[]).filter((s) => ['local-food', 'brewpubs', 'coffee', 'village'].includes(s.key)).flatMap((s) => s.items.map((i: { name: string }) => i.name)) : []
  const town = cleanText(body.town, 80), region = cleanText(body.region, 60), cc = /^[A-Z]{2}$/.test(String(body.cc || '')) ? String(body.cc) : ''
  const web = { type: 'web_search_20260209', name: 'web_search', max_uses: 8, ...(town && cc ? { user_location: { type: 'approximate', city: town, region: region || undefined, country: cc } } : {}) }
  const messages: unknown[] = [{ role: 'user', content: eatAsk({ town, region, cell, rules, known }) }]
  const searched: string[] = []
  for (let round = 0; round < 6; round++) {
    const msg = await ask({ ...base, max_tokens: 8000, system: GUIDE_BRIEF, tools: [web, EAT_TOOL], messages }, true)
    // deno-lint-ignore no-explicit-any
    const u = (msg.usage ?? {}) as any
    await db.rpc('ai_record', { p_task: 'eat-well', p_model: msg.model ?? base.model, p_in: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), p_out: u.output_tokens ?? 0, p_cents: costCents(u) + searchesIn(u) * SEARCH_CENTS })
    if (msg.stop_reason === 'refusal') return reply(200, { places: [] })
    const content = msg.content.filter((b: { type: string }) => b.type !== 'fallback')
    searched.push(...searchedUrls(content))
    const use = content.find((b: { type: string, name?: string }) => b.type === 'tool_use' && b.name === 'save_places')
    if (use) return reply(200, { places: cleanPlaces((use as { input: unknown }).input, searched) })
    messages.push({ role: 'assistant', content })
    if (msg.stop_reason !== 'pause_turn') messages.push({ role: 'user', content: 'Please call save_places now.' })
  }
  return reply(200, { places: [] })
}

