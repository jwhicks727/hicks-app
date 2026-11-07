import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import SunCalc from 'suncalc'
import {
  APP_NAMES, appNameOf, currentTrip, nextTrip, sleepsWords, visitsWords, packingSuggestions, stampKind, hikeTotals, longestYet, tripLifers,
  onThisDayTrips, travelQuestion, boilingF, altitudeWords, coreTonight, dayPlan, inOrder, moveStop, fxUrl, shapeFx, showsUrl, shapeShows, zoneShiftWords, offsetMin,
} from '../src/lib/yonder.js'
import { EAT_TOOL, cleanPlaces, eatAsk, cellOf } from '../supabase/functions/_shared/around.js'
import { TASKS } from '../supabase/functions/_shared/claude.js'
import { HOME_TOWN } from '../src/lib/sky.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const bear = { id: 'e1', title: 'Big Bear weekend', place: 'Big Bear Lake, California', lat: 34.24, lng: -116.91, starts_on: '2026-11-13', ends_on: '2026-11-15' }

test('the trip we’re on: a calendar trip, a kept outing, or today away; nothing at home', () => {
  assert.equal(currentTrip({ events: [bear], outings: [], today: '2026-11-14', home: HOME_TOWN }).town, 'Big Bear Lake')
  assert.equal(currentTrip({ events: [bear], outings: [{ id: 'o1', event_id: 'e1' }], today: '2026-11-14', home: HOME_TOWN }).outing_id, 'o1')
  assert.equal(currentTrip({ events: [], outings: [{ id: 'o2', kind: 'trip', title: 'Sedona', place: 'Sedona, Arizona', starts_on: '2026-11-14', ends_on: '2026-11-16' }], today: '2026-11-15', home: HOME_TOWN }).outing_id, 'o2')
  const away = { tier: 'away', town: { town: 'Temecula', region: 'California', cc: 'US' } }
  assert.deepEqual(currentTrip({ here: away, today: '2026-11-14', home: HOME_TOWN }), { title: 'Temecula', place: 'Temecula', town: 'Temecula', starts_on: '2026-11-14', ends_on: '2026-11-14', event_id: null, outing_id: null })
  assert.equal(currentTrip({ here: { tier: 'home' }, events: [{ ...bear, lat: 34.1, lng: -117.43 }], today: '2026-11-14', home: HOME_TOWN }), null, 'a calendar event at home is not a trip')
})

test('the next trip counts its sleeps; visits come from kept trips only', () => {
  const n = nextTrip([bear], '2026-11-09', HOME_TOWN)
  assert.equal(n.sleeps, 4)
  assert.equal(sleepsWords(n), '4 sleeps until Big Bear Lake')
  assert.equal(sleepsWords({ ...n, sleeps: 1 }), '1 sleep until Big Bear Lake')
  assert.equal(nextTrip([bear], '2026-08-01', HOME_TOWN), null, 'more than two months off')
  const kept = [{ id: 'a', title: 'Big Bear', place: 'Big Bear Lake', starts_on: '2026-02-06', ends_on: '2026-02-08' }, { id: 'b', title: 'Snow trip', place: 'Big Bear Lake, California', starts_on: '2025-01-10', ends_on: '2025-01-11' }]
  assert.equal(visitsWords(kept, 'Big Bear Lake', '2026-11-14'), 'Your third time in Big Bear Lake. Last time: February 2026.')
  assert.equal(visitsWords([], 'Sedona', '2026-11-14'), 'Your first time in Sedona.')
})

test('packing comes from the forecast, the plan and who’s coming; stamps from what the trip was', () => {
  const p = packingSuggestions({ days: [{ low: 24, high: 41, rain: 70, inches: 0.4, uv: 3, code: 73 }], hikes: true, words: 'Big Bear with Appa' })
  for (const x of ['Snow boots', 'Warm coats, hats and gloves', 'Rain jackets', 'Hiking shoes and a daypack', 'Appa’s lead, bowl and food']) assert.ok(p.includes(x), x)
  assert.ok(!packingSuggestions({ days: [{ low: 60, high: 75, rain: 0, uv: 3, code: 0 }], forWhom: 'someone' }).includes('Rain jackets'))
  assert.equal(stampKind({ park: 'joshua-tree', title: 'Joshua Tree' }), 'park')
  assert.equal(stampKind({ kind: 'disneyland', title: 'Disneyland' }), 'castle')
  assert.equal(stampKind({ title: 'Big Bear weekend' }), 'mountain')
  assert.equal(stampKind({ title: 'Kona', place: 'Kailua-Kona, HI' }), 'coast')
  assert.equal(stampKind({ title: 'Lake Arrowhead day' }), 'lake')
  assert.equal(stampKind({ title: 'Temecula' }), 'town')
})

test('hikes add up, the longest yet is wonderful, lifers are her first sightings on the trip', () => {
  assert.deepEqual(hikeTotals([{ miles: 2.4, climb_ft: 700 }, { miles: '4.8', climb_ft: 1200 }]), { count: 2, miles: 7.2, climb: 1900 })
  assert.equal(longestYet([{ miles: 4.8 }], 8.2), true)
  assert.equal(longestYet([{ miles: 9 }], 8.2), false)
  assert.equal(longestYet([], null), false)
  const rows = [
    { species: 'Steller’s Jay', sci_name: 'Cyanocitta stelleri', observed_on: '2025-02-01', submission_id: 'S1' },
    { species: 'Steller’s Jay', sci_name: 'Cyanocitta stelleri', observed_on: '2026-11-14', submission_id: 'S2' },
    { species: 'Mountain Chickadee', sci_name: 'Poecile gambeli', observed_on: '2026-11-14', submission_id: 'S2' },
  ]
  assert.deepEqual(tripLifers(rows, '2026-11-13', '2026-11-15').map((b) => b.species), ['Mountain Chickadee'])
  assert.deepEqual(onThisDayTrips([{ id: 'x', starts_on: '2025-11-07' }, { id: 'y', starts_on: '2026-11-07' }], '2026-11-07').map((t) => [t.outing.id, t.years]), [['x', 1]])
  assert.equal(travelQuestion('2026-11-08').prompt, 'What surprised you today?')
})

test('at height the Kitchen says so; the Milky Way is worked out on the phone, in its season', () => {
  assert.equal(boilingF(6750), 199)
  assert.equal(boilingF(0), 212)
  assert.match(altitudeWords(6750), /^At 6,750 ft water boils at about 199°F/)
  assert.equal(altitudeWords(1200), '')
  const tonight = (d) => { const day = new Date(d + 'T20:00:00Z'); return coreTonight(34.24, -116.91, SunCalc.getTimes(day, 34.24, -116.91).night, SunCalc.getTimes(new Date(day.getTime() + 864e5), 34.24, -116.91).nightEnd) }
  const july = tonight('2026-07-15')
  assert.ok(july && july.alt >= 10, 'July: up after dark')
  assert.equal(tonight('2026-11-07'), null, 'November: out of season')
  const march = tonight('2026-03-20')
  assert.ok(march && new Date(march.at).getUTCHours() >= 9 && new Date(march.at).getUTCHours() <= 12, 'March: before dawn')
  assert.equal(coreTonight(34, -117, null, null), null)
})

const guide = { sections: [
  { key: 'coffee', items: [{ name: 'Pine Roasters', why: 'x', sources: [] }] },
  { key: 'hikes', items: [{ name: 'Short one', hike: { hours: 1 }, sources: [] }, { name: 'Medium one', hike: { hours: 3 }, sources: [] }] },
  { key: 'local-food', items: [{ name: 'The Grill', sources: [] }] },
  { key: 'village', items: [{ name: 'The Village', sources: [] }] },
  { key: 'books-records', items: [{ name: 'Lake Books', sources: [] }] },
  { key: 'brewpubs', items: [{ name: 'Lake Brewing', sources: [] }] },
  { key: 'mass', items: [{ name: 'St Joseph', sources: [] }] },
] }

test('our day: a plan from the guide, the weather and the sun, in the order someone chooses', () => {
  const now = new Date('2026-11-14T16:00:00Z'), sunset = new Date('2026-11-15T00:48:00Z'), golden = new Date('2026-11-15T00:05:00Z')
  const plan = dayPlan({ guide, now, sunset, golden, weekday: 6 })
  assert.deepEqual(plan.map((s) => s.key), ['coffee', 'hike', 'lunch', 'afternoon', 'golden', 'mass', 'dinner'])
  assert.equal(plan.find((s) => s.key === 'hike').item.name, 'Medium one')
  assert.equal(plan.find((s) => s.key === 'mass').time, null, 'Mass times are the parish’s to say')
  const wet = dayPlan({ guide, now, sunset, golden, rainy: true, weekday: 3 })
  assert.ok(!wet.some((s) => s.key === 'hike' || s.key === 'golden' || s.key === 'mass'))
  assert.equal(wet.find((s) => s.key === 'afternoon').item.name, 'Lake Books')
  assert.deepEqual(dayPlan({ guide: null, now }), [])
  assert.deepEqual(inOrder(plan, ['dinner', 'coffee']).map((s) => s.key).slice(0, 3), ['dinner', 'coffee', 'hike'])
  assert.deepEqual(moveStop(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c'])
  assert.deepEqual(moveStop(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c'])
})

test('abroad, the jam archive and the clocks: free sources, checked answers', () => {
  assert.equal(fxUrl('EUR'), 'https://api.frankfurter.app/latest?from=USD&to=EUR')
  assert.equal(fxUrl('CRC'), null, 'only what the ECB carries')
  assert.deepEqual(shapeFx({ date: '2026-11-06', rates: { EUR: 0.9213 } }, 'EUR'), { rate: 0.921, date: '2026-11-06' })
  assert.equal(shapeFx({ rates: {} }, 'EUR'), null)
  const u = new URL(showsUrl('Big Bear Lake', 'California'))
  assert.equal(u.hostname, 'archive.org')
  assert.match(u.searchParams.get('q'), /coverage:"Big Bear Lake, CA"/)
  assert.equal(showsUrl('Paris', 'Île-de-France'), null)
  assert.deepEqual(shapeShows({ response: { docs: [{ identifier: 'gd1978-01-01.sbd', title: 'Grateful Dead Live', creator: 'Grateful Dead', date: '1978-01-01T00:00:00Z' }, { identifier: '../bad', title: 'x' }] } }), [{ title: 'Grateful Dead Live', creator: 'Grateful Dead', year: '1978', url: 'https://archive.org/details/gd1978-01-01.sbd' }])
  assert.equal(zoneShiftWords(-480, -600), 'You just gained 2 hours.')
  assert.equal(zoneShiftWords(-480, -420), 'You just lost an hour: the clocks here are an hour ahead.')
  assert.equal(zoneShiftWords(-480, -480), '')
  assert.equal(offsetMin('America/Los_Angeles', new Date('2026-11-07T20:00:00Z')), -480)
  assert.equal(offsetMin('Europe/Paris', new Date('2026-11-07T20:00:00Z')), 60)
})

test('where Laurie can eat well is a parent’s ask, checked like the guide, never kept', () => {
  assert.equal(TASKS['eat-well'].who, 'parent')
  assert.match(TASKS['eat-well'].says, /food rules/)
  assert.equal(EAT_TOOL.strict, true)
  const places = cleanPlaces({ places: [{ name: 'The Grill', why: 'Grilled fish, no sauce.', sources: ['https://thegrill.example/menu'] }, { name: 'Unchecked', why: 'x', sources: ['https://elsewhere.example/'] }] }, ['https://thegrill.example/menu'])
  assert.deepEqual(places, [{ name: 'The Grill', why: 'Grilled fish, no sauce.', sources: ['https://thegrill.example/menu'] }])
  assert.match(eatAsk({ town: 'Big Bear Lake', cell: cellOf(34.24, -116.91), rules: 'No dairy.' }), /No dairy\./)
  const fn = src('supabase/functions/claude/index.ts')
  const eat = fn.slice(fn.indexOf('async function eatWell'))
  assert.ok(!/area_guides'\)\.(insert|update)|\.insert\(/.test(eat), 'her answer is never written anywhere')
})

test('the travel app’s tables keep only what someone chose, with towns and days, never points', () => {
  const m = src('supabase/migrations/20261107233000_travel_app.sql')
  const table = (name) => m.slice(m.indexOf(`create table public.${name}`), m.indexOf(');', m.indexOf(`create table public.${name}`)))
  for (const t of ['postcards', 'trip_hikes']) assert.ok(!/\blat\b|\blng\b/.test(table(t)), `${t} keeps a town, never a point`)
  assert.match(m, /trip_recipes_add[^;]*is_parent/)
  assert.match(m, /postcards_add[^;]*member_id = \(select public\.my_member_id\(\)\)/)
  assert.match(m, /trip_hikes_add[^;]*member_id = \(select public\.my_member_id\(\)\)/)
  assert.deepEqual(/app_name in \(([^)]+)\)/.exec(m)[1].split(',').map((x) => x.trim().replace(/'/g, '')), APP_NAMES)
  assert.equal(appNameOf({ app_name: 'Field Trip' }), 'Field Trip')
  assert.equal(appNameOf({ app_name: 'Nonsense' }), 'Yonder')
})

test('the travel app is a place like the others, and the journal’s travel question is picked on the phone', () => {
  assert.match(src('src/lib/router.js'), /'pets', 'yonder'\]/)
  assert.match(src('src/ui/apps.jsx'), /key: 'yonder', to: '\/yonder'/)
  const j = src('src/places/journal/Journal.jsx')
  assert.match(j, /away && base \? travelQuestion\(date\) : base/)
  assert.ok(!/functions\.invoke|askClaude/.test(j), 'the journal never reaches Claude')
  assert.match(src('src/kitchen/RecipeEditor.jsx'), /if \(!slug && trip && fromTrip && res\.id\) await tagToTrip\(trip, res\.id, null, 'found'\)/)
})
