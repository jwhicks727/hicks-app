import { test } from 'node:test'
import assert from 'node:assert/strict'
import { weekOf, mergeIdeas, lite } from '../src/lib/kitchen/plan.js'

test('a week is filed under its Sunday', () => {
  assert.equal(weekOf('2026-11-01'), '2026-11-01')
  assert.equal(weekOf('2026-11-04'), '2026-11-01')
  assert.equal(weekOf('2026-11-07'), '2026-11-01')
  assert.equal(weekOf('2027-01-01'), '2026-12-27')
})

test('more ideas never repeat a title, and stay a list someone can read', () => {
  const a = mergeIdeas([], [{ title: 'Miso salmon', line: 'x', meal: 'dinner' }, { title: ' miso salmon ', line: 'y' }, { title: '' }])
  assert.deepEqual(a.map((i) => i.title), ['Miso salmon'])
  assert.equal(mergeIdeas(a, Array.from({ length: 60 }, (_, i) => ({ title: `Idea ${i}` }))).length, 40)
})

test('the chat’s Markdown: paragraphs, lists, headings and bold, nothing else', () => {
  const b = lite('# Tonight\n\nTry **miso** butter.\nIt works.\n\n- one\n- **two**\n1. three\n\nDone.')
  assert.deepEqual(b.map((x) => x.type), ['h', 'p', 'ul', 'p'])
  assert.deepEqual(b[1].runs, [{ b: false, t: 'Try ' }, { b: true, t: 'miso' }, { b: false, t: ' butter. It works.' }])
  assert.equal(b[2].items.length, 3)
  assert.deepEqual(lite(''), [])
  assert.doesNotMatch(JSON.stringify(lite('<script>alert(1)</script>')), /type":"script/)
})
