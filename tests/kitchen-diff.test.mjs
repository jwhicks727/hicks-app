import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lineDiff, changesOnly, diffWords } from '../src/lib/kitchen/diff.js'
import { withLauriePlate, parseRecipe, sharedBody, tidyProposed } from '../src/lib/kitchen/recipe.js'

test('a change reads line by line: kept, added, taken out', () => {
  const d = lineDiff('a\nb\nc\nd', 'a\nB\nc\nd\ne')
  assert.deepEqual(d.map((x) => x.t + x.line), ['samea', 'delb', 'addB', 'samec', 'samed', 'adde'])
  assert.equal(diffWords(d), '2 lines added, 1 taken out')
  assert.equal(diffWords(lineDiff('same', 'same')), 'No changes')
})

test('long unchanged stretches fold away, leaving a line around each change', () => {
  const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
  const after = before.replace('line 10', 'line ten')
  const c = changesOnly(lineDiff(before, after))
  assert.deepEqual(c.map((x) => (x.t === 'gap' ? `gap${x.count}` : x.t + x.line)), ['gap9', 'sameline 9', 'delline 10', 'addline ten', 'sameline 11', 'gap8'])
})

test('Laurie’s plate goes back after Plating, so a whole recipe compares with a whole one', () => {
  const md = '# Dish\n\n**1. (5 min)** Cook.\n\n**Plating** In bowls.\n\n**Laurie’s plate** Hers, made up for the test.\n\n**Jason’s plate** Chili crisp.\n'
  const shared = sharedBody(md), laurie = parseRecipe(md).laurie
  assert.doesNotMatch(shared, /Laurie/)
  const whole = withLauriePlate(shared, laurie)
  assert.ok(whole.indexOf('Laurie’s plate') > whole.indexOf('Plating') && whole.indexOf('Laurie’s plate') < whole.indexOf('Jason’s plate'))
  assert.match(withLauriePlate('# Dish\n\nOnly steps.', 'Hers'), /Only steps\.\n\n\*\*Laurie’s plate\*\*\nHers\n$/)
  assert.equal(withLauriePlate('# Dish', null), '# Dish\n')
})

test('a proposed recipe loses the app’s own note on Laurie’s plate', () => {
  assert.equal(tidyProposed('**Laurie’s plate** (kept privately; it belongs after Plating)\nHers'), '**Laurie’s plate**\nHers')
  assert.equal(tidyProposed('**Laurie’s plate** Hers (kept warm)'), '**Laurie’s plate** Hers (kept warm)')
})
