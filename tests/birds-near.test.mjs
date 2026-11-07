import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { nearCell, regionOf, NEAR_KEY, NEAR_CELLS_A_DAY } from '../supabase/functions/_shared/birds.js'
import { possibleLifers } from '../src/lib/life/lifers.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('the birds function is told only a tenth of a degree, and keeps each cell under its own key', () => {
  assert.deepEqual(nearCell(34.2439, -116.9114), { lat: 34.2, lng: -116.9, key: 'birds-near:34.2,-116.9' })
  assert.deepEqual(nearCell(33.49, -117.15), { lat: 33.5, lng: -117.1, key: 'birds-near:33.5,-117.1' })
  assert.equal(nearCell(48.8566, 2.3522).key, 'birds-near:48.9,2.4')
  assert.equal(nearCell(19.64, -155.9969).key, 'birds-near:19.6,-156.0')
  for (const bad of [[NaN, 1], [91, 0], [0, 181], ['34', '-117'], [null, null]]) assert.equal(nearCell(...bad), null, String(bad))
  for (const k of ['birds-near:34.2,-116.9', 'birds-near:-33.9,151.2', 'birds-near:0.0,0.0']) assert.match(k, NEAR_KEY)
  assert.doesNotMatch('birds-near:34.24,-116.91', NEAR_KEY, 'never a closer point')
  assert.ok(NEAR_CELLS_A_DAY > 0 && NEAR_CELLS_A_DAY <= 12)
})

test('the app works out the same cell, and the database accepts exactly that key', () => {
  const s = src('src/lib/useOutside.js')
  const fn = new Function(`return ${/export const nearCellName = (\(point\) => [^\n]+)/.exec(s)[1]}`)()
  for (const [lat, lng] of [[34.2439, -116.9114], [33.49, -117.15], [48.8566, 2.3522], [19.64, -155.9969]]) assert.equal(fn({ lat, lng }), nearCell(lat, lng).key)
  assert.equal(fn(null), null)
  const m = /key ~ '([^']+)'/.exec(src('supabase/migrations/20261107230000_birds_near_cache.sql'))
  const re = new RegExp(m[1])
  assert.ok(re.test('birds-near:34.2,-116.9') && re.test('birds-near:-33.9,151.2'))
  assert.ok(!re.test('birds-near:34.24,-116.91') && !re.test('birds-near:home'))
})

test('the function caps new places a day, keeps each for an hour, and gives home’s own cell home’s answer', () => {
  const s = src('supabase/functions/birds/index.ts')
  assert.match(s, /if \(body\.kind === 'near'\) return nearAnswer\(db, body\.lat, body\.lng\)/)
  assert.match(s, /const cell = nearCell\(/)
  assert.match(s, /NEAR_CELLS_A_DAY\) return reply/)
  assert.match(s, /km\(TOWN, cell\) < 16\) return reply\(200, \{ home: true \}\)/)
  assert.match(s, /Date\.now\(\) - kept\.at < KEEP_MS/)
})

test('a cell’s checklist feed comes from the county its hotspots are filed under', () => {
  assert.equal(regionOf([{ subnational2Code: 'US-CA-071', subnational1Code: 'US-CA' }]), 'US-CA-071')
  assert.equal(regionOf([{ subnational1Code: 'US-HI' }]), 'US-HI')
  assert.equal(regionOf([{ subnational2Code: 'not a code' }, { subnational2Code: 'FR-75' }]), 'FR-75')
  assert.equal(regionOf([]), null)
  assert.equal(regionOf(null), null)
})

test('could be a lifer: only birds she has never recorded, matched by scientific name or common name', () => {
  const rows = [
    { species: 'Steller’s Jay', sci_name: 'Cyanocitta stelleri' },
    { species: 'Dark-eyed Junco (Oregon)', sci_name: 'Junco hyemalis [oreganus Group]' },
    { species: 'Acorn Woodpecker', sci_name: '' },
    { species: 'sparrow sp.', sci_name: 'Passerellidae sp.' },
  ]
  const species = [
    { code: 'stejay', name: 'Steller’s Jay', sci: 'Cyanocitta stelleri', reports: 12 },
    { code: 'daejun', name: 'Dark-eyed Junco', sci: 'Junco hyemalis', reports: 15 },
    { code: 'acowoo', name: 'Acorn Woodpecker', sci: 'Melanerpes formicivorus', reports: 3 },
    { code: 'moucha', name: 'Mountain Chickadee', sci: 'Poecile gambeli', reports: 9 },
    { code: 'whhwoo', name: 'White-headed Woodpecker', sci: 'Dryobates albolarvatus', reports: 2, notable: true },
    { code: 'spar1', name: 'sparrow sp.', sci: 'Passerellidae sp.', reports: 20 },
  ]
  assert.deepEqual(possibleLifers(species, rows).map((b) => b.code), ['whhwoo', 'moucha'])
  assert.deepEqual(possibleLifers(species, []), [], 'with no list of hers, it claims nothing')
  assert.deepEqual(possibleLifers([], rows), [])
  assert.equal(possibleLifers(species, rows, 1).length, 1)
})

test('her sightings stay on the phone: only parents load them, and nothing about them is sent', () => {
  const card = src('src/parts/BirdsCard.jsx')
  assert.match(card, /useSightings\(session, parent && list\.length > 0\)/)
  assert.ok(!/functions\.invoke/.test(src('src/lib/life/lifers.js')))
})
