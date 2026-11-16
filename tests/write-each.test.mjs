import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { writeEach, failedWords } from '../src/lib/kitchen/writeEach.js'

const ideas = ['Soup', 'Tacos', 'Pie', 'Stew'].map((title) => ({ title }))

test('each idea is its own request, answered in the order picked', async () => {
  const seen = []
  const out = await writeEach(ideas, async (i) => { seen.push(i.title); await new Promise((r) => setTimeout(r, i.title === 'Soup' ? 20 : 1)); return { recipes: [{ body: `# ${i.title}` }] } })
  assert.deepEqual(seen.sort(), ['Pie', 'Soup', 'Stew', 'Tacos'])
  assert.deepEqual(out.bodies, ['# Soup', '# Tacos', '# Pie', '# Stew'])
  assert.deepEqual(out.failed, [])
})

test('a few run side by side, never all at once', async () => {
  let live = 0, most = 0
  await writeEach(ideas, async () => { live++; most = Math.max(most, live); await new Promise((r) => setTimeout(r, 5)); live--; return { recipes: [{ body: 'x' }] } }, { size: 2 })
  assert.equal(most, 2)
})

test('one that fails never loses the others, and is named', async () => {
  const out = await writeEach(ideas, async (i) => (i.title === 'Pie' ? { error: 'Claude took too long to answer' } : i.title === 'Stew' ? { recipes: [] } : { recipes: [{ body: i.title }] }))
  assert.deepEqual(out.bodies, ['Soup', 'Tacos'])
  assert.deepEqual(out.failed, ['Pie', 'Stew'])
  assert.equal(out.reason, 'Claude took too long to answer')
  assert.match(failedWords(out.failed, out.reason), /2 recipes didn’t come back \(“Pie”, “Stew”\): Claude took too long to answer\. Pick them and write again\./)
  assert.equal(failedWords([], ''), '')
})

test('a request that throws is a failure, not a crash', async () => {
  const out = await writeEach(ideas.slice(0, 1), async () => { throw new Error('x') })
  assert.deepEqual(out.failed, ['Soup'])
})

test('the planner asks for one recipe at a time, and a gateway timeout has words', () => {
  assert.match(fs.readFileSync('src/kitchen/PlanWeek.jsx', 'utf8'), /askClaude\('write-recipes', \{ ideas: \[idea\] \}\)/)
  assert.match(fs.readFileSync('src/lib/claude.js', 'utf8'), /took too long/)
})
