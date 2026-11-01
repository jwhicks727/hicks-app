import { test } from 'node:test'
import assert from 'node:assert/strict'
import { weekOf, mergeIdeas, removeIdea, restoreIdea, refreshIdeas, notPicked, lite } from '../src/lib/kitchen/plan.js'

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

test('an idea taken off the list moves the later picks up, and undo puts it back as it was', () => {
  const ideas = ['A', 'B', 'C', 'D'].map((title) => ({ title }))
  const r = removeIdea(ideas, [0, 1, 3], 1)
  assert.deepEqual(r.ideas.map((i) => i.title), ['A', 'C', 'D'])
  assert.deepEqual(r.picked, [0, 2])
  assert.deepEqual(r.removed, { idea: ideas[1], at: 1, wasPicked: true })
  assert.deepEqual(restoreIdea(r.ideas, r.picked, r.removed), { ideas, picked: [0, 1, 3] })
  // Picks changed after the removal survive the undo
  const back = restoreIdea(r.ideas, [1], r.removed)
  assert.deepEqual(back.picked, [1, 2])
  // Not picked before, not picked after; and never twice on the list
  const u = removeIdea(ideas, [], 3)
  assert.deepEqual(restoreIdea(u.ideas, [], u.removed).picked, [])
  assert.equal(restoreIdea(ideas, [], u.removed).ideas.length, 4)
  assert.equal(removeIdea(ideas, [0], 9).removed, null)
})

test('refresh keeps the picked in their places and swaps the rest for new ones', () => {
  const ideas = ['A', 'B', 'C', 'D'].map((title) => ({ title }))
  const r = refreshIdeas(ideas, [1, 3], [{ title: 'b' }, { title: 'E' }, { title: 'F' }])
  assert.deepEqual(r.ideas.map((i) => i.title), ['E', 'B', 'F', 'D'])
  assert.deepEqual(r.picked, [1, 3])
  assert.equal(r.swapped, 2)
  // Too few came back: the spare places close up, and the picks follow
  const short = refreshIdeas(ideas, [2], [{ title: 'E' }])
  assert.deepEqual(short.ideas.map((i) => i.title), ['E', 'C'])
  assert.deepEqual(short.picked, [1])
  assert.equal(notPicked(ideas, [1, 3]), 2)
  assert.equal(notPicked(ideas, [0, 1, 2, 3]), 0)
})

test('the open plan is the newest one nobody has put away, whatever week it was made', async () => {
  const { openPlan, planAge } = await import('../src/lib/kitchen/plan.js')
  const rows = [
    { id: 'old', week_of: '2026-10-25', created_at: '2026-10-26T10:00:00Z', dismissed_at: null },
    { id: 'gone', week_of: '2026-11-01', created_at: '2026-11-02T10:00:00Z', dismissed_at: '2026-11-02T12:00:00Z' },
    { id: 'older', week_of: '2026-10-18', created_at: '2026-10-19T10:00:00Z', dismissed_at: null },
  ]
  assert.equal(openPlan(rows).id, 'old') // last week's, still waiting
  assert.equal(openPlan(rows.slice(1, 2)), null); assert.equal(openPlan([]), null); assert.equal(openPlan(null), null)
  assert.equal(openPlan([{ id: 'x', created_at: '2026-11-03T00:00:00Z' }]).id, 'x', 'a database before the migration has no dismissed_at at all')
  assert.equal(planAge(rows[0], '2026-11-01'), 'the week of 10/25'); assert.equal(planAge({ week_of: '2026-11-01' }, '2026-11-01'), null); assert.equal(planAge(null, '2026-11-01'), null)
})
