import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePath } from '../src/lib/router.js'

test('every screen has an address', () => {
  assert.deepEqual(parsePath('/'), { place: 'home', rest: [] })
  assert.deepEqual(parsePath('/world/school/soar'), { place: 'world', rest: ['school', 'soar'] })
  assert.deepEqual(parsePath('/lifelist'), { place: 'lifelist', rest: [] })
  assert.deepEqual(parsePath('/jams'), { place: 'jams', rest: [] })
  assert.deepEqual(parsePath('/setup'), { place: 'setup', rest: [] })
})

test('an address that names nothing opens Home', () => {
  assert.deepEqual(parsePath('/nowhere/at/all'), { place: 'home', rest: [] })
})
