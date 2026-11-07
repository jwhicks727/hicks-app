import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { KINDS, KIND_ORDER, kindFromSection, townOf, findTown, cleanPlace, withVisits, byKind, summaryWords, timesWords, matchBeen, visitedBetween } from '../src/lib/been.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('a guide’s section suggests the kind, and every kind has a heading', () => {
  assert.equal(kindFromSection('hikes'), 'hike')
  assert.equal(kindFromSection('brewpubs'), 'drink')
  assert.equal(kindFromSection('coffee'), 'drink')
  assert.equal(kindFromSection('local-food'), 'eat')
  assert.equal(kindFromSection('books-records'), 'shop')
  assert.equal(kindFromSection('mass'), 'mass')
  assert.equal(kindFromSection('nonsense'), 'do')
  assert.deepEqual(KIND_ORDER.slice().sort(), Object.keys(KINDS).sort())
})

test('the town we’re in, matched to our list by name and state, any case', () => {
  const t = townOf({ town: { town: 'Temecula', region: 'California', cc: 'US' } })
  assert.deepEqual(t, { town: 'Temecula', region: 'California', cc: 'US' })
  assert.equal(townOf({ place: { town: 'Big Bear Lake' } }).town, 'Big Bear Lake')
  assert.equal(townOf({}), null)
  const towns = [{ id: 'a', town: 'temecula', region: 'california' }, { id: 'b', town: 'Temecula', region: 'Georgia' }]
  assert.equal(findTown(towns, t).id, 'a')
  assert.equal(findTown(towns, { town: 'Sedona', region: 'Arizona' }), null)
})

test('a place added is checked: a name, a known kind, a known rating, capped words, https only', () => {
  assert.deepEqual(cleanPlace({ name: '  Pechanga  <b>Grill</b> ', kind: 'eat', rating: 'loved', note: 'Get the fish tacos', website: 'https://grill.example/' }), { name: 'Pechanga b Grill /b', kind: 'eat', rating: 'loved', note: 'Get the fish tacos', website: 'https://grill.example/' })
  assert.equal(cleanPlace({ name: 'X', kind: 'nonsense' }).kind, 'do')
  assert.equal(cleanPlace({ name: 'X', rating: 'meh' }).rating, null)
  assert.equal(cleanPlace({ name: 'X', website: 'http://plain.example' }).website, null)
  assert.equal(cleanPlace({ name: 'X', note: 'y'.repeat(900) }).note.length, 500)
  assert.equal(cleanPlace({ name: '   ' }), null)
})

const places = [
  { id: 'p1', name: 'Wilson Creek', kind: 'drink', rating: 'loved' },
  { id: 'p2', name: 'Old Town Spice', kind: 'shop', rating: null },
  { id: 'p3', name: 'Bad Burger', kind: 'eat', rating: 'not-again' },
  { id: 'p4', name: 'Pechanga Grill', kind: 'eat', rating: 'loved', note: 'Fish tacos' },
  { id: 'p5', name: 'Santa Rosa Plateau', kind: 'hike', rating: 'good' },
]
const visits = [
  { place_id: 'p1', on_date: '2025-04-12' }, { place_id: 'p1', on_date: '2026-11-07' }, { place_id: 'p4', on_date: '2026-11-07' },
  { place_id: 'p3', on_date: '2025-04-12' }, { place_id: 'p5', on_date: '2025-04-12' }, { place_id: 'p2', on_date: '2026-11-07' },
]

test('the list: loved first, then good, then unrated, not again last; the most visited and most recent first', () => {
  const list = withVisits(places, visits)
  assert.deepEqual(list.map((p) => p.id), ['p1', 'p4', 'p5', 'p2', 'p3'])
  assert.deepEqual([list[0].times, list[0].first, list[0].last], [2, '2025-04-12', '2026-11-07'])
  assert.deepEqual(byKind(list).map((g) => [g.kind, g.places.map((p) => p.id)]), [['eat', ['p4', 'p3']], ['drink', ['p1']], ['hike', ['p5']], ['shop', ['p2']]])
  assert.equal(summaryWords(list), '5 places we’ve been · 2 loved')
  assert.equal(summaryWords([]), '')
  assert.equal(timesWords(list[0]), '2 times, last on Nov 7, 2026')
  assert.equal(timesWords(list[1]), 'Once, on Nov 7, 2026')
  assert.equal(timesWords({ times: 0 }), 'Not yet visited')
})

test('a guide’s place is recognised on our list; a trip’s visits are gathered by its dates', () => {
  const list = withVisits(places, visits)
  assert.equal(matchBeen('Wilson Creek Winery', list).id, 'p1')
  assert.equal(matchBeen('The Pechanga Grill', list).id, 'p4')
  assert.equal(matchBeen('Somewhere New', list), null)
  assert.equal(matchBeen('ab', list), null)
  assert.deepEqual(visitedBetween(list, visits, '2026-11-07', '2026-11-07').map((p) => p.id).sort(), ['p1', 'p2', 'p4'])
  assert.deepEqual(visitedBetween(list, visits, '2024-01-01', '2024-12-31'), [])
})

test('the database keeps towns, places and days we went; never a point; each change names its row', () => {
  const m = src('supabase/migrations/20261107234000_our_list_each_town.sql')
  assert.ok(!/\blat\b|\blng\b|\bcell\b/.test(m), 'only the town, never a point')
  assert.match(m, /create unique index been_towns_one on public\.been_towns \(lower\(town\), lower\(coalesce\(region, ''\)\)\)/)
  assert.match(m, /create unique index been_places_one on public\.been_places \(town_id, lower\(name\)\)/)
  assert.match(m, /unique \(place_id, on_date\)/)
  assert.match(m, /been_places_remove[^;]*added_by = \(select public\.my_member_id\(\)\) or \(select public\.is_parent\(\)\)/)
  for (const t of ['been_towns', 'been_places', 'been_visits']) assert.match(m, new RegExp(`${t}_read[^;]*is_family`), t)
  const h = src('src/lib/useBeen.js')
  for (const call of h.match(/\.(update|delete)\([^)]*\)[^\n]*/g)) assert.match(call, /\.eq\(/, call)
  assert.match(src('src/places/yonder/Yonder.jsx'), /if \(rest\[0\] === 'town'\) return <BeenTownPage id=\{rest\[1\]\} \/>/)
})
