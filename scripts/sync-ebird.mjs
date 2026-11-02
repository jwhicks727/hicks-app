// ============================================
// sync-ebird.mjs -- bring Laurie's eBird checklists into the Life List, nightly
// ============================================
// Run by .github/workflows/sync-ebird.yml (environment `ebird`, main only).
// It never signs in to eBird: eBird puts a bot check in front of a person's own
// checklist page (decisions log, 2026-11-02), so this reads eBird's official API 2.0
// instead. For each day it asks the county's checklist feed, keeps the checklists
// submitted under her display name, and reads each new one's contents.
//  - only while a yes is recorded in sync_consents (Laurie's, or a parent's for her);
//  - each run is logged in bird_sync_runs; it prints counts only, never names;
//  - a night looks back DAYS days (default 7); a person can ask for more, once, to
//    fill in history (workflow input `since`), at most MAX_DAYS_PER_RUN days a run.
// UNVERIFIED against live eBird until the first discover run.

import { createClient } from '@supabase/supabase-js'
import { consentOk, feedUrl, hersOnly, daysBetween, viewUrl, taxonomyUrl, indexTaxonomy, shapeChecklist, MAX_NEW_PER_RUN } from './lib/ebird-core.mjs'

const env = (k) => process.env[k] || ''
const DISCOVER = env('DISCOVER') === '1'
const MAX_DAYS_PER_RUN = 400
const say = (s) => console.log(s)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

async function main() {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'EBIRD_API_KEY', 'EBIRD_DISPLAY_NAME'].filter((k) => !env(k))
  if (missing.length) { say(`Not set up: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing (docs/SECRETS.md). Nothing was done.`); return 0 }
  const region = env('EBIRD_REGION') || 'US-CA-071'
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const [{ data: lauries }, { data: consent }, { data: parents }] = await Promise.all([db.from('family_members').select('id, name').eq('name', 'Laurie'), db.from('sync_consents').select('source, said_yes_by').eq('source', 'ebird').maybeSingle(), db.from('family_members').select('id').eq('role', 'parent')])
  const laurie = (lauries || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1))[0] || null
  if (!consentOk(consent, laurie, parents || [])) { say('Nobody has switched this on in the app (Life List › Birds). Nothing was done.'); return 0 }

  const { data: run, error: startErr } = await db.from('bird_sync_runs').insert({ kind: DISCOVER ? 'discover' : env('GITHUB_EVENT_NAME') === 'workflow_dispatch' ? 'manual' : 'scheduled', status: 'started' }).select('id').single()
  if (startErr) { say('The run can’t be logged: ' + startErr.message.slice(0, 120)); return 1 }
  const finish = (status, extra = {}) => db.from('bird_sync_runs').update({ status, finished_at: new Date().toISOString(), ...extra }).eq('id', run.id)
  try {
    const headers = { 'X-eBirdApiToken': env('EBIRD_API_KEY') }
    const to = today()
    const since = /^\d{4}-\d\d-\d\d$/.test(env('SINCE')) ? env('SINCE') : daysBetween('2000-01-01', to, Number(env('DAYS')) || (DISCOVER ? 30 : 7)).at(-1)
    const days = daysBetween(since, to, MAX_DAYS_PER_RUN)
    say(`Looking at ${days.length} days (${since} to ${to}) in ${region}.`)

    // Which of hers do we already have?
    const known = new Set()
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('bird_sightings').select('submission_id').eq('member_id', laurie.id).range(from, from + 999)
      if (error) throw new Error('Reading what is kept: ' + error.message)
      data.forEach((r) => known.add(r.submission_id)); if (data.length < 1000) break
    }
    const fresh = new Map(); let seen = 0, busy = 0, hers = 0, errors = 0
    for (const day of days) {
      if (fresh.size >= MAX_NEW_PER_RUN) break
      const r = await fetch(feedUrl(region, day), { headers, signal: AbortSignal.timeout(30000) }).catch(() => null)
      if (!r || !r.ok) { errors++; if (r && (r.status === 401 || r.status === 403)) { await finish('failed', { note: `eBird refused the key (${r.status}).` }); say(`eBird refused the key (${r.status}).`); return 1 } await sleep(500); continue }
      const list = await r.json(); seen += list.length; if (list.length >= 200) busy++
      for (const c of hersOnly(list, env('EBIRD_DISPLAY_NAME'))) { hers++; if (!known.has(c.sub) && fresh.size < MAX_NEW_PER_RUN) fresh.set(c.sub, c) }
      await sleep(250)
    }
    say(`The feed held ${seen} checklists over those days; ${hers} are under her name, ${fresh.size} not yet kept.${busy ? ` ${busy} days had 200 checklists or more (the feed's cap), so some may be missed.` : ''}${errors ? ` ${errors} days couldn’t be read.` : ''}`)
    if (DISCOVER) { await finish('ok', { note: 'Discover run: nothing was saved.' }); return 0 }
    if (!fresh.size) { await finish('ok', { note: 'Nothing new.' }); say('Nothing new.'); return 0 }

    const taxRes = await fetch(taxonomyUrl(), { headers, signal: AbortSignal.timeout(60000) })
    if (!taxRes.ok) throw new Error(`eBird’s taxonomy answered ${taxRes.status}.`)
    const tax = indexTaxonomy(await taxRes.json())
    let rows = [], lists = 0, skipped = 0
    for (const c of fresh.values()) {
      const v = await fetch(viewUrl(c.sub), { headers, signal: AbortSignal.timeout(30000) }).catch(() => null)
      if (!v || !v.ok) { skipped++; if (v && v.status === 403) break; await sleep(400); continue }
      const shaped = shapeChecklist(await v.json(), tax, { location: c.location, locId: c.locId })
      if (shaped.length) { rows = rows.concat(shaped); lists++ } else skipped++
      await sleep(300)
    }
    let saved = 0
    for (let i = 0; i < rows.length; i += 400) {
      const chunk = rows.slice(i, i + 400).map((x) => ({ ...x, member_id: laurie.id }))
      const { error } = await db.from('bird_sightings').upsert(chunk, { onConflict: 'member_id,submission_id,sci_name,species' })
      if (error) throw new Error('Saving stopped: ' + error.message)
      saved += chunk.length
    }
    await finish('ok', { checklists: lists, sightings: saved, note: skipped ? `${skipped} checklists couldn’t be read and will be tried again.` : null })
    say(`Brought in ${lists} checklists, ${saved} sightings.${skipped ? ` ${skipped} couldn’t be read; they’ll be tried again.` : ''}`)
    return 0
  } catch (e) {
    const msg = String(e && e.message ? e.message : e).replace(/\s+/g, ' ').slice(0, 200)
    await finish('failed', { note: msg }).catch(() => {}); say('Stopped: ' + msg); return 1
  }
}
main().then((c) => process.exit(c), (e) => { console.error('Stopped:', String(e && e.message ? e.message : e).slice(0, 200)); process.exit(1) })
