// Half-done work is kept only while there is something in it, and clearing really clears
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { persistDraft } from '../src/lib/useDraft.js'

const fake = () => { const m = new Map(); return { m, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) } }

test('a draft is kept while it differs from the blank form, and a blank form keeps nothing', () => {
  const s = fake(), blank = { title: '', picked: [] }
  persistDraft(s, 'k', blank, blank)
  assert.equal(s.m.size, 0) // opened, never typed in
  persistDraft(s, 'k', { title: 'x', picked: [] }, blank)
  assert.equal(s.m.get('teamhicks.draft.k'), JSON.stringify({ title: 'x', picked: [] }))
  persistDraft(s, 'k', { title: '', picked: [] }, blank) // typed, then put back to blank
  assert.equal(s.m.size, 0)
  persistDraft(s, 'n', null, null)
  assert.equal(s.m.size, 0)
})

test('clear forgets the device’s copy and puts the form back to blank', () => {
  const src = readFileSync(new URL('../src/lib/useDraft.js', import.meta.url), 'utf8')
  assert.match(src, /const clear = \(\) => \{.*removeItem.*setValue\(initial\) \}/)
})
