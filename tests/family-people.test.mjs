import { test } from 'node:test'
import assert from 'node:assert/strict'
import { onePerPerson, sameDaysOnce } from '../src/lib/cal/people.js'

test('two sign-in addresses for one person are one person to look at', () => {
  const members = [{ id: 'b2', name: 'Anna', role: 'child' }, { id: 'a1', name: 'Anna', role: 'child' }, { id: 'j1', name: 'Jason', role: 'parent' }]
  const { people, canon } = onePerPerson(members)
  assert.deepEqual(people.map((p) => p.name), ['Anna', 'Jason'])
  assert.equal(canon('b2'), 'a1'); assert.equal(canon('a1'), 'a1'); assert.equal(canon(null), null)
})
test('a family day entered twice shows once', () => {
  const d = { title: 'Angelversary', month: 10, day: 11, year: null, for_whom: 'j1' }
  assert.equal(sameDaysOnce([d, { ...d, id: 2 }, { ...d, month: 11 }]).length, 2)
})
