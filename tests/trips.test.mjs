import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { whereaboutsRow, shouldShare, othersAway, isInWords, parkNear, tripsToKeep, todayTrip, homeWatch, SHARE_FOR_MS } from '../src/lib/trips.js'
import { HOME_TOWN } from '../src/lib/sky.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const away = { tier: 'away', point: { lat: 34.24, lng: -116.91 }, tz: 'America/Los_Angeles', town: { town: 'Big Bear Lake', region: 'California', country: 'United States', cc: 'US' } }

test('the town shared while away is the town and a tenth of a degree, lapsing in twelve hours', () => {
  const now = Date.parse('2026-11-07T22:00:00Z')
  const row = whereaboutsRow(away, 'm1', now)
  assert.deepEqual(row, { member_id: 'm1', town: 'Big Bear Lake', region: 'California', cc: 'US', lat: 34.2, lng: -116.9, tz: 'America/Los_Angeles', updated_at: '2026-11-07T22:00:00.000Z', expires_at: new Date(now + SHARE_FOR_MS).toISOString() })
  assert.equal(SHARE_FOR_MS, 12 * 3600e3)
  assert.equal(whereaboutsRow({ ...away, tier: 'near' }, 'm1'), null, 'out and about is not away')
  assert.equal(whereaboutsRow({ ...away, tier: 'home' }, 'm1'), null)
  assert.equal(whereaboutsRow({ ...away, town: null, place: null }, 'm1'), null, 'no town, nothing shared')
  assert.equal(whereaboutsRow(away, null), null)
  assert.equal(whereaboutsRow({ ...away, town: null, place: { town: 'Big Bear Lake' } }, 'm1').town, 'Big Bear Lake')
})

test('a phone writes again only for a new town or area, or an hour on', () => {
  const a = whereaboutsRow(away, 'm1', Date.parse('2026-11-07T22:00:00Z'))
  assert.equal(shouldShare(a, null), true)
  assert.equal(shouldShare(whereaboutsRow(away, 'm1', Date.parse('2026-11-07T22:30:00Z')), a), false)
  assert.equal(shouldShare(whereaboutsRow(away, 'm1', Date.parse('2026-11-07T23:00:00Z')), a), true)
  assert.equal(shouldShare(whereaboutsRow({ ...away, point: { lat: 34.4, lng: -116.91 } }, 'm1', Date.parse('2026-11-07T22:10:00Z')), a), true)
  assert.equal(shouldShare(null, a), false)
})

test('Meanwhile shows the others, never me, never a lapsed town, one line a person', () => {
  const now = Date.parse('2026-11-07T22:00:00Z')
  const members = [{ id: 'j', name: 'Jason' }, { id: 'l', name: 'Laurie' }, { id: 'l2', name: 'Laurie' }, { id: 'a', name: 'Anna' }]
  const rows = [
    { member_id: 'j', town: 'Sacramento', region: 'California', cc: 'US', lat: '38.6', lng: '-121.5', updated_at: '2026-11-07T21:00:00Z', expires_at: '2026-11-08T09:00:00Z' },
    { member_id: 'l', town: 'Big Bear Lake', region: 'California', cc: 'US', lat: '34.2', lng: '-116.9', updated_at: '2026-11-07T20:00:00Z', expires_at: '2026-11-08T08:00:00Z' },
    { member_id: 'l2', town: 'Sedona', region: 'Arizona', cc: 'US', lat: '34.9', lng: '-111.8', updated_at: '2026-11-07T21:30:00Z', expires_at: '2026-11-08T09:30:00Z' },
    { member_id: 'a', town: 'Paris', region: 'Île-de-France', cc: 'FR', lat: '48.9', lng: '2.4', updated_at: '2026-11-06T08:00:00Z', expires_at: '2026-11-06T20:00:00Z' },
  ]
  const others = othersAway(rows, members, 'Jason', now)
  assert.deepEqual(others.map((o) => [o.name, o.town]), [['Laurie', 'Sedona']], 'mine and lapsed left out; the newest of a person’s rows wins')
  assert.equal(others[0].lat, 34.9)
  assert.equal(isInWords(others[0]), 'Laurie is in Sedona, Arizona')
  assert.equal(isInWords({ name: 'Anna', town: 'Paris', region: 'Île-de-France', cc: 'FR' }), 'Anna is in Paris')
})

test('a national park is recognised from the open map’s park boundaries, with whether it is checked off', () => {
  const map = { parks: [{ name: 'San Bernardino National Forest', km: 1 }, { name: 'Joshua Tree National Park', km: 4.2 }, { name: 'Mojave National Preserve', km: 9 }] }
  assert.equal(parkNear(map).park.slug, 'joshua-tree')
  assert.equal(parkNear(map).visited, null)
  assert.equal(parkNear(map, [{ slug: 'joshua-tree', visited_on: '2024-03-02' }]).visited, '2024-03-02')
  assert.equal(parkNear({ parks: [{ name: 'Death Valley National Park', km: 2 }] }).park.slug, 'death-valley')
  assert.equal(parkNear({ parks: [{ name: 'Some State Park', km: 1 }] }), null)
  assert.equal(parkNear(null), null)
})

test('keep this trip: a calendar trip just over and not kept, or today away with nothing planned', () => {
  const today = '2026-11-14'
  const events = [
    { id: 'e1', title: 'Big Bear weekend', starts_on: '2026-11-10', ends_on: '2026-11-12', lat: 34.24, lng: -116.91, place: 'Big Bear Lake, California' },
    { id: 'e2', title: 'Redlands lunch', starts_on: '2026-11-11', ends_on: '2026-11-11', lat: 34.06, lng: -117.18 },
    { id: 'e3', title: 'Long ago', starts_on: '2026-10-01', ends_on: '2026-10-02', lat: 34.24, lng: -116.91 },
    { id: 'e4', title: 'Next week', starts_on: '2026-11-20', ends_on: '2026-11-21', lat: 34.24, lng: -116.91 },
    { id: 'e5', title: 'Kept already', starts_on: '2026-11-08', ends_on: '2026-11-09', lat: 33.49, lng: -117.15 },
  ]
  assert.deepEqual(tripsToKeep(events, [{ event_id: 'e5' }], today, HOME_TOWN).map((e) => e.id), ['e1'])
  const temecula = { tier: 'away', point: { lat: 33.49, lng: -117.15 }, town: { town: 'Temecula', region: 'California', cc: 'US' } }
  assert.deepEqual(todayTrip(temecula, [], [], today), { title: 'Temecula', starts_on: today, ends_on: today, place: 'Temecula' })
  assert.equal(todayTrip(temecula, [{ lat: 33.5, lng: -117.1, starts_on: today, ends_on: today }], [], today), null, 'planned on the calendar already')
  assert.equal(todayTrip(temecula, [], [{ starts_on: today, ends_on: today, place: 'Temecula', title: 'Temecula' }], today), null, 'kept already')
  assert.equal(todayTrip({ ...temecula, tier: 'near' }, [], [], today), null)
})

test('while we’re away, the garden hears about heat, frost or wind at home, the worst first', () => {
  const today = '2026-11-07'
  assert.match(homeWatch([{ date: '2026-11-08', high: 70, low: 50 }, { date: '2026-11-09', high: 98, low: 60 }], today), /^Heat at home on Monday \(98°\)/)
  assert.match(homeWatch([{ date: '2026-11-08', high: 60, low: 31 }], today), /^Frost possible at home Sunday night \(31°\)/)
  assert.match(homeWatch([{ date: '2026-11-08', high: 70, low: 50, gusts: 44 }], today), /gusts to 44 mph/)
  assert.equal(homeWatch([{ date: '2026-11-08', high: 72, low: 52, gusts: 12 }], today), null)
  assert.equal(homeWatch([{ date: '2026-11-20', high: 101, low: 70 }], today), null, 'only the next few days')
})

test('the database keeps one row a person, a tenth of a degree, written and removed only by its owner', () => {
  const m = src('supabase/migrations/20261107232000_family_towns_trips.sql')
  assert.match(m, /member_id uuid primary key/, 'one row a person: never a log')
  assert.match(m, /lat numeric\(4, 1\)/)
  assert.match(m, /lng numeric\(4, 1\)/)
  for (const p of ['whereabouts_add', 'whereabouts_change', 'whereabouts_remove']) assert.match(m, new RegExp(`${p}[^;]*member_id = \\(select public\\.my_member_id\\(\\)\\)`), p)
  assert.match(m, /whereabouts_read[^;]*is_family/)
  assert.match(m, /create unique index outings_one_per_event on public\.outings \(event_id\)/)
  assert.ok(!/member_whereabouts|ShareHere|FamilyAway/.test(src('src/consoles/Reports.jsx')), 'never in Reports')
})

test('a town shared is taken away on sign-out, when switched off, and at home', () => {
  assert.match(src('src/lib/auth.js'), /forgetHere\(\)\n\s+clearStays\(\)\n\s+clearOutbox\(\)\n\s+await unshareHere\(\)/)
  assert.match(src('src/consoles/Settings.jsx'), /if \(prefs\.here === true\) unshareHere\(\)/)
  const s = src('src/lib/useWhereabouts.js')
  assert.match(s, /!row && last && \(tier === 'home' \|\| tier === 'near' \|\| here\.status === 'off'\)\) unshareHere\(\)/)
  assert.match(s, /\.delete\(\)\.not\('member_id', 'is', null\)/, 'a delete names its rows, and the policy keeps it to your own')
  assert.match(src('src/places/lists/DayTools.jsx'), /away \? \['Away', \.\.\.SKIP_REASONS\.filter/)
})
