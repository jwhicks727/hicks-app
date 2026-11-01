// ============================================
// sync-ebird.mjs -- bring Laurie's new eBird checklists into the Life List, nightly
// ============================================
// Run by .github/workflows/sync-ebird.yml (environment `ebird`, main only). eBird
// has no API for a person's own checklists, so this signs in as Laurie with a
// browser to find her checklists, then reads each new one's contents from
// eBird's API 2.0. Rules (CLAUDE.md, "Jobs that read the outside world"):
//  - only with a yes recorded in sync_consents, by Laurie or by a parent;
//  - the sign-in page is checked against eBird's and Cornell's own domains, in the
//    steps file and again against the live page, right before the password is typed;
//  - the attempt is written to bird_sync_runs BEFORE signing in, and a rejected
//    sign-in (or a run that never finished) holds every later run for 24 hours:
//    no retry loop, or her account gets locked; only a person's "retry the login"
//    overrides it;
//  - it prints counts and hosts, never page text; no screenshots or traces unless
//    a person turns on `debug`, and then none starts before sign-in finishes.
// Written to eBird's pages as remembered and UNVERIFIED against the live site:
// run it once with DISCOVER=1 and adjust scripts/ebird-steps.json from what it says.

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { validateSteps, hostOk, SIGN_IN_HOSTS, SITE_HOSTS, signInGate, consentOk, parseChecklistIndex, nextPageHref, viewUrl, taxonomyUrl, indexTaxonomy, shapeChecklist, safeUrl, outlineOf, MAX_NEW_PER_RUN, MAX_PAGES } from './lib/ebird-core.mjs'

const env = (k) => process.env[k] || ''
const DISCOVER = env('DISCOVER') === '1', RETRY = env('RETRY_LOGIN') === '1', DEBUG = env('DEBUG') === '1'
const say = (s) => console.log(s)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const steps = JSON.parse(fs.readFileSync(new URL('./ebird-steps.json', import.meta.url), 'utf8'))

async function main() {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'EBIRD_USERNAME', 'EBIRD_PASSWORD', 'EBIRD_API_KEY'].filter((k) => !env(k))
  if (missing.length) { say(`Not set up: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} missing (docs/SECRETS.md). Nothing was done.`); return 0 }
  const problems = validateSteps(steps)
  if (problems.length) { say(`The steps file is wrong: ${problems.join(' ')}`); return 1 }
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

  // Her yes, and where her birds go
  const [{ data: laurie }, { data: consent }, { data: parents }] = await Promise.all([db.from('family_members').select('id, name').eq('name', 'Laurie').maybeSingle(), db.from('sync_consents').select('source, said_yes_by').eq('source', 'ebird').maybeSingle(), db.from('family_members').select('id').eq('role', 'parent')])
  if (!consentOk(consent, laurie, parents || [])) { say('Nobody has switched this on in the app (Life List › Birds). Nothing was done.'); return 0 }

  // The log: may we sign in at all?
  const { data: runs, error: runsErr } = await db.from('bird_sync_runs').select('at, status').order('at', { ascending: false }).limit(10)
  if (runsErr) { say('The run log can’t be read, so it won’t sign in: ' + runsErr.message.slice(0, 120)); return 1 }
  const gate = signInGate(runs, Date.now(), { retry: RETRY })
  if (!gate.ok) { say(gate.why); return 1 }

  // Written BEFORE signing in: a crash after the password is typed still leaves this behind
  const { data: run, error: startErr } = await db.from('bird_sync_runs').insert({ kind: DISCOVER ? 'discover' : env('GITHUB_EVENT_NAME') === 'workflow_dispatch' ? 'manual' : 'scheduled', status: 'started' }).select('id').single()
  if (startErr) { say('The run can’t be logged, so it won’t sign in: ' + startErr.message.slice(0, 120)); return 1 }
  const finish = (status, extra = {}) => db.from('bird_sync_runs').update({ status, finished_at: new Date().toISOString(), ...extra }).eq('id', run.id)

  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    const first = async (sels) => { for (const s of sels) { const el = page.locator(s).first(); if (await el.count()) return el } return null }

    // ---- Sign in, on eBird's own domains only ----
    await page.goto(steps.signIn.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    if (!hostOk(page.url(), SIGN_IN_HOSTS)) { await finish('failed', { note: `The sign-in page was not on eBird’s sites (${safeUrl(page.url())}); nothing was typed.` }); say('The sign-in page is not on eBird’s own sites. Nothing was typed.'); return 1 }
    const user = await first(steps.signIn.user), pass = await first(steps.signIn.password), go = await first(steps.signIn.submit)
    if (!user || !pass || !go) { await finish('failed', { note: 'The sign-in form wasn’t found; steps.signIn needs new selectors.' }); say('The sign-in form was not found. Nothing was typed. ' + JSON.stringify(outlineOf(await page.content()))); return 1 }
    // Checked once more, the field's own frame included, right before the password goes in
    for (const f of page.frames()) if (f.url() !== 'about:blank' && !hostOk(f.url(), SIGN_IN_HOSTS)) { await finish('failed', { note: 'A frame on the sign-in page is not eBird’s.' }); say('A frame on the sign-in page is not eBird’s. Nothing was typed.'); return 1 }
    await user.fill(env('EBIRD_USERNAME')); await pass.fill(env('EBIRD_PASSWORD')); await go.click()
    await page.waitForLoadState('domcontentloaded', { timeout: 45000 }).catch(() => {})
    await sleep(2500)
    const landed = hostOk(page.url(), SITE_HOSTS) && !(await first(steps.signIn.password))
    if (!landed) {
      const why = (await first(steps.signIn.failed)) ? 'eBird showed a sign-in error' : 'it never left the sign-in page'
      await finish('login_rejected', { note: `The sign-in did not go through (${why}). Held for 24 hours.` })
      say(`The sign-in did not go through (${why}). It will not try again for 24 hours; fix the password, then run it by hand with “retry the login”.`)
      return 1
    }
    say('Signed in.')
    if (DEBUG) say('(debug is on: no trace is kept; screenshots would hold her checklists, so none are taken here)')

    // ---- Which checklists are new? Newest first, until enough, or the end ----
    const known = new Set()
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('bird_sightings').select('submission_id').eq('member_id', laurie.id).range(from, from + 999)
      if (error) { await finish('failed', { note: 'Her saved checklists couldn’t be read.' }); return 1 }
      data.forEach((r) => known.add(r.submission_id)); if (data.length < 1000) break
    }
    const fresh = new Map() // sub -> where
    let url = steps.checklists.url, pages = 0
    while (url && pages < MAX_PAGES && fresh.size < MAX_NEW_PER_RUN) {
      await page.goto(new URL(url, 'https://ebird.org').toString(), { waitUntil: 'domcontentloaded', timeout: 45000 })
      if (!hostOk(page.url(), SITE_HOSTS)) break
      const html = await page.content(); pages++
      if (DISCOVER && pages === 1) say('The checklists page, in counts: ' + JSON.stringify(outlineOf(html)) + ' at ' + safeUrl(page.url()))
      for (const c of parseChecklistIndex(html)) if (!known.has(c.sub) && fresh.size < MAX_NEW_PER_RUN) fresh.set(c.sub, c)
      url = nextPageHref(html); await sleep(1500)
    }
    say(`Looked through ${pages} ${pages === 1 ? 'page' : 'pages'} and found ${fresh.size} checklists to bring in.`)
    if (DISCOVER) { await finish('ok', { note: 'Discover run: nothing was saved.' }); return 0 }
    if (!fresh.size) { await finish('ok', { note: pages ? 'Nothing new.' : 'No checklists were found on the page (the steps may need adjusting).' }); say('Nothing new.'); return 0 }

    // ---- Their contents, from eBird's API 2.0 ----
    const headers = { 'X-eBirdApiToken': env('EBIRD_API_KEY') }
    const taxRes = await fetch(taxonomyUrl(), { headers, signal: AbortSignal.timeout(60000) })
    if (!taxRes.ok) { await finish('failed', { note: `eBird’s taxonomy answered ${taxRes.status}.` }); say(`eBird’s taxonomy answered ${taxRes.status}.`); return 1 }
    const tax = indexTaxonomy(await taxRes.json())
    let rows = [], lists = 0, skipped = 0
    for (const c of fresh.values()) {
      const r = await fetch(viewUrl(c.sub), { headers, signal: AbortSignal.timeout(30000) }).catch(() => null)
      if (!r || !r.ok) { skipped++; if (r && r.status === 403) break; await sleep(400); continue }
      const shaped = shapeChecklist(await r.json(), tax, { location: c.location, locId: c.locId })
      if (shaped.length) { rows = rows.concat(shaped); lists++ } else skipped++
      await sleep(300)
    }
    let saved = 0
    for (let i = 0; i < rows.length; i += 400) {
      const chunk = rows.slice(i, i + 400).map((x) => ({ ...x, member_id: laurie.id }))
      const { error } = await db.from('bird_sightings').upsert(chunk, { onConflict: 'member_id,submission_id,sci_name,species' })
      if (error) { await finish('failed', { checklists: lists, sightings: saved, note: 'Saving stopped: ' + error.message.slice(0, 120) }); say('Saving stopped: ' + error.message.slice(0, 120)); return 1 }
      saved += chunk.length
    }
    await finish('ok', { checklists: lists, sightings: saved, note: skipped ? `${skipped} checklists couldn’t be read and will be tried again.` : null })
    say(`Brought in ${lists} checklists, ${saved} sightings.${skipped ? ` ${skipped} couldn’t be read; they’ll be tried again tomorrow.` : ''}`)
    return 0
  } catch (e) {
    await finish('failed', { note: String(e && e.message ? e.message : e).replace(/\s+/g, ' ').slice(0, 200) }).catch(() => {})
    say('Stopped: ' + String(e && e.message ? e.message : e).slice(0, 200))
    return 1
  } finally { await browser.close() }
}
main().then((c) => process.exit(c), (e) => { console.error('Stopped:', String(e && e.message ? e.message : e).slice(0, 200)); process.exit(1) })
