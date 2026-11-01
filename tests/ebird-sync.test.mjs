import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { hostOk, validateSteps, signInGate, consentOk, parseWhen, parseChecklistIndex, nextPageHref, viewUrl, taxonomyUrl, indexTaxonomy, shapeChecklist, safeUrl, outlineOf, MAX_NEW_PER_RUN, SIGN_IN_HOSTS } from '../scripts/lib/ebird-core.mjs'

const steps = JSON.parse(fs.readFileSync(new URL('../scripts/ebird-steps.json', import.meta.url), 'utf8'))

test('the sign-in page must be eBird’s or Cornell’s own, and the file must be complete', () => {
  assert.deepEqual(validateSteps(steps), [])
  assert.equal(hostOk('https://secure.birds.cornell.edu/cassso/login', SIGN_IN_HOSTS), true)
  assert.equal(hostOk('https://evil.example/ebird.org', SIGN_IN_HOSTS), false); assert.equal(hostOk('https://ebird.org.evil.example/', SIGN_IN_HOSTS), false)
  assert.equal(hostOk('http://ebird.org/', SIGN_IN_HOSTS), false); assert.equal(hostOk('https://user:pw@ebird.org/', SIGN_IN_HOSTS), false)
  assert.match(validateSteps({ ...steps, signIn: { ...steps.signIn, url: 'https://phish.example/login' } })[0], /eBird’s own sites/)
  assert.match(validateSteps({ ...steps, checklists: { url: 'https://secure.birds.cornell.edu/x' } })[0], /ebird\.org/)
  assert.match(validateSteps({ ...steps, signIn: { ...steps.signIn, password: [] } })[0], /signIn\.password/)
  assert.ok(validateSteps(null).length > 0)
})

test('a rejected sign-in, or a run that never finished, holds the next one for a day', () => {
  const now = Date.parse('2026-11-03T10:00:00Z'), ago = (h, status) => ({ at: new Date(now - h * 3600e3).toISOString(), status })
  assert.equal(signInGate([], now).ok, true); assert.equal(signInGate([ago(30, 'ok'), ago(54, 'ok')], now).ok, true)
  assert.equal(signInGate([ago(2, 'login_rejected')], now).ok, false); assert.match(signInGate([ago(23, 'login_rejected')], now).why, /rejected/)
  assert.equal(signInGate([ago(25, 'login_rejected')], now).ok, true, 'a day later it may try')
  assert.equal(signInGate([ago(3, 'started')], now).ok, false); assert.match(signInGate([ago(3, 'started')], now).why, /never finished/)
  assert.equal(signInGate([ago(1, 'failed'), ago(30, 'ok')], now).ok, true, 'an ordinary failure doesn’t hold it')
  assert.equal(signInGate([ago(2, 'login_rejected')], now, { retry: true }).ok, true, 'a person who has fixed the password can say so')
})

test('only Laurie’s own yes lets it sign in as her', () => {
  const laurie = { id: 'L1', name: 'Laurie' }
  assert.equal(consentOk({ source: 'ebird', said_yes_by: 'L1' }, laurie), true)
  assert.equal(consentOk({ source: 'ebird', said_yes_by: 'J1' }, laurie), false, 'Jason can’t say it for her')
  assert.equal(consentOk(null, laurie), false); assert.equal(consentOk({ said_yes_by: 'L1' }, null), false)
})

test('dates as eBird writes them, in any of its forms', () => {
  assert.deepEqual(parseWhen('07 Nov 2023 07:30'), { date: '2023-11-07', time: '07:30' })
  assert.deepEqual(parseWhen('2023-11-07 7:30 PM'), { date: '2023-11-07', time: '19:30' })
  assert.deepEqual(parseWhen('Sat 4 Jan 2025'), { date: '2025-01-04', time: null })
  assert.deepEqual(parseWhen('Jan 4, 2025 4:05 PM'), { date: '2025-01-04', time: '16:05' })
  assert.deepEqual(parseWhen('nonsense'), { date: null, time: null })
})

test('a made-up My Checklists page: the checklists, their places, the next page', () => {
  const html = `<html><body><ul>
    <li><a href="/checklist/S1001">Sat 04 Jan 2025</a> <a href="/hotspot/L111">Prado Regional Park</a> 23 species</li>
    <li><a href="https://ebird.org/checklist/S1000?x=1">Fri 03 Jan 2025</a> <a href="/mylocation/L222">Lytle Creek &amp; the Wash</a></li>
    <li><a href="/checklist/S1001">Sat 04 Jan 2025 again</a></li>
  </ul><a class="next" rel="next" href="/mychecklists?currentRow=51">Next</a></body></html>`
  const c = parseChecklistIndex(html)
  assert.deepEqual(c.map((x) => [x.sub, x.date, x.locId, x.location]), [['S1001', '2025-01-04', 'L111', 'Prado Regional Park'], ['S1000', '2025-01-03', 'L222', 'Lytle Creek & the Wash']])
  assert.equal(nextPageHref(html), '/mychecklists?currentRow=51')
  assert.equal(nextPageHref('<a href="/x?p=2">Next ›</a>'), '/x?p=2'); assert.equal(nextPageHref('<a href="/x">Home</a>'), null)
  assert.deepEqual(parseChecklistIndex('<p>none</p>'), [])
})

test('a checklist from the API becomes sightings; spuhs are left out and "X" is not a number', () => {
  const tax = indexTaxonomy([{ speciesCode: 'houfin', comName: 'House Finch', sciName: 'Haemorhous mexicanus', taxonOrder: 28000 }, { speciesCode: 'annhum', comName: 'Anna’s Hummingbird', sciName: 'Calypte anna', taxonOrder: 12000 }])
  assert.equal(tax.size, 2)
  const view = { subId: 'S1001', obsDt: '04 Jan 2025 07:30', locId: 'L111', protocolId: 'P22', durationHrs: 0.75, effortDistanceKm: 1.2, numObservers: 2, subnational1Code: 'US-CA', obs: [{ speciesCode: 'houfin', howManyStr: '12' }, { speciesCode: 'annhum', howManyStr: 'X', hasRichMedia: true }, { speciesCode: 'sparrow1', howManyStr: '2' }] }
  const rows = shapeChecklist(view, tax, { location: 'Prado Regional Park' })
  assert.equal(rows.length, 2)
  assert.deepEqual([rows[0].species, rows[0].count, rows[0].observed_on, rows[0].observed_time, rows[0].location, rows[0].location_id, rows[0].protocol, rows[0].duration_min, rows[0].state], ['House Finch', 12, '2025-01-04', '07:30', 'Prado Regional Park', 'L111', 'eBird - Traveling Count', 45, 'US-CA'])
  assert.deepEqual([rows[1].count, rows[1].has_media, rows[1].sci_name], [null, true, 'Calypte anna'])
  assert.deepEqual(shapeChecklist(null, tax), []); assert.deepEqual(shapeChecklist({ subId: 'S1', obs: [] }, tax), []); assert.equal(shapeChecklist({ ...view, obsDt: 'unknown' }, tax).length, 0)
  assert.equal(viewUrl('S1001'), 'https://api.ebird.org/v2/product/checklist/view/S1001'); assert.match(taxonomyUrl(), /taxonomy\/ebird/)
})

test('what a run may print: counts and hosts, never page text or a query', () => {
  assert.equal(safeUrl('https://ebird.org/checklist/S1001?token=abc#x'), 'ebird.org/checklist/…')
  assert.equal(safeUrl('https://secure.birds.cornell.edu/cassso/login?service=x'), 'secure.birds.cornell.edu/cassso/login')
  const o = outlineOf('<form><input type="password"></form><a href="/checklist/S1234">Jane Q. Birder</a><a rel="next" href="/p2">Next</a><table></table><h2>x</h2>')
  assert.deepEqual(o, { bytes: o.bytes, checklistLinks: 1, tables: 1, listItems: 0, forms: 1, passwordFields: 1, hasNext: true, headings: 1 })
  assert.ok(!JSON.stringify(o).includes('Jane')); assert.ok(MAX_NEW_PER_RUN <= 200)
})

test('the migration lets only the service role write a run, and only Laurie write her yes', () => {
  const sql = fs.readFileSync(new URL('../supabase/migrations/20261101233000_ebird_sync.sql', import.meta.url), 'utf8')
  assert.match(sql, /create policy consents_add[^;]*said_yes_by = \(select public\.my_member_id\(\)\)/)
  assert.doesNotMatch(sql, /create policy [a-z_]+ on public\.bird_sync_runs for (insert|update|delete)/)
  assert.match(sql, /grant select on public\.bird_sync_runs to authenticated/)
})
