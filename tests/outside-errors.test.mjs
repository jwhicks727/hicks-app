// Why the stations or the birds aren't showing, said as it is
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { outsideProblem, outsideWords } from '../src/lib/outsideErrors.js'

const http = (status) => ({ context: { status } })
const fetchFail = { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } // no response: no status

test('a function that isn’t deployed, or lacks its key, is "not set up yet", not "couldn’t be reached"', () => {
  assert.deepEqual(outsideProblem({ error: fetchFail }), { error: 'setup' }) // Supabase's 404 has no CORS headers
  assert.deepEqual(outsideProblem({ error: http(404) }), { error: 'setup' })
  assert.deepEqual(outsideProblem({ error: http(503) }), { error: 'setup' })
  assert.match(outsideWords('birds', { error: 'setup' }), /needs its function deployed and the eBird key set \(docs\/MORNING\.md, step 10\)/)
  assert.match(outsideWords('stations', { error: 'setup' }), /Synoptic token/)
})

test('offline, and any other failure', () => {
  assert.deepEqual(outsideProblem({ error: fetchFail, online: false }), { error: 'offline' })
  assert.deepEqual(outsideProblem({ error: http(500) }), { error: 'unreachable' })
  assert.equal(outsideWords('birds', { error: 'unreachable' }), 'Birds around us couldn’t be reached just now.')
  assert.match(outsideWords('birds', { error: 'offline' }), /back online/)
})

test('what the function itself says is kept (a refused key), unless it came with an answer', () => {
  assert.deepEqual(outsideProblem({ data: { error: 'eBird didn’t accept the key' } }), { error: 'said', say: 'eBird didn’t accept the key' })
  assert.equal(outsideWords('birds', { error: 'said', say: 'eBird didn’t accept the key' }), 'eBird didn’t accept the key')
  assert.equal(outsideProblem({ data: { at: 1, species: [], stale: true, error: 'eBird couldn’t be reached just now' } }), null) // an older answer is still shown
  assert.equal(outsideProblem({ data: { at: 1, species: [] } }), null)
  assert.equal(outsideWords('birds', null), '')
})
