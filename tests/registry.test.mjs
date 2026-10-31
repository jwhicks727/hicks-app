import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REGISTRY } from '../src/registry.js'
import { PLACES } from '../src/lib/router.js'

test('every place in the tab bar is in the registry, and nothing else is', () => {
  assert.deepEqual(REGISTRY.map((p) => p.key), PLACES)
})

test('every setup section and report has a key and a title, unique within its place', () => {
  for (const p of REGISTRY) {
    for (const list of [p.setup, p.reports]) {
      const keys = list.map((x) => x.key)
      assert.equal(new Set(keys).size, keys.length, `${p.key}: duplicate keys`)
      for (const x of list) assert.ok(x.key && x.title, `${p.key}: an entry needs a key and a title`)
    }
  }
})
