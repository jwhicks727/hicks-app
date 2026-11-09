import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeIngredient, weekLists, standing, makeItAgain, ratingsOwed } from '../src/lib/kitchen/week.js'

test('each ingredient lands on the list it belongs to', () => {
  const at = (x) => { const p = placeIngredient(x); return `${p.list}/${p.shelf}` }
  assert.equal(at('scallions'), 'buy/Produce and herbs'); assert.equal(at('salmon fillets, skin on'), 'buy/Protein'); assert.equal(at('super-firm tofu'), 'buy/Protein')
  assert.equal(at('heavy cream'), 'buy/Dairy, bread and the rest'); assert.equal(at('corn tortillas'), 'buy/Dairy, bread and the rest')
  assert.equal(at('white miso'), 'check/In the fridge'); assert.equal(at('Parmesan, grated'), 'check/In the fridge'); assert.equal(at('unsalted butter'), 'check/In the fridge')
  assert.equal(at('chili crisp (Jason’s plate)'), 'check/In the fridge'); assert.equal(at('frozen broccoli'), 'check/In the freezer')
  assert.equal(at('kosher salt'), 'check/In the pantry'); assert.equal(at('garlic powder'), 'check/In the pantry'); assert.equal(at('vegetable broth'), 'check/In the pantry'); assert.equal(at('fish sauce'), 'check/In the fridge')
})

test('the week’s two lists merge what several dishes need', () => {
  const recipes = [
    { title: 'Miso salmon', groups: [[{ item: 'scallions', amount: '4', unit: '' }, { item: 'fresh ginger', amount: '1', unit: 'Tbsp' }], [{ item: 'salmon fillets', amount: '1', unit: 'lb' }], [{ item: 'white miso', amount: '2', unit: 'Tbsp' }, { item: 'kosher salt', amount: '½', unit: 'tsp' }]] },
    { title: 'Soba bowls', groups: [[{ item: 'green onions, sliced', amount: '1', unit: 'bunch' }], [{ item: 'super-firm tofu', amount: '14', unit: 'oz' }], [{ item: 'miso', amount: '1', unit: 'Tbsp' }]] },
  ]
  const w = weekLists(recipes)
  assert.deepEqual(w.buy.map((s) => s.shelf), ['Produce and herbs', 'Protein'])
  const scallions = w.buy[0].items.find((i) => /scallion/.test(i.name))
  assert.deepEqual(scallions.uses, [{ recipe: 'Miso salmon', amount: '4' }, { recipe: 'Soba bowls', amount: '1 bunch' }])
  assert.deepEqual(w.check.map((s) => s.shelf), ['In the fridge', 'In the pantry'])
  assert.equal(w.check[0].items.length, 1, 'white miso and miso are one thing to check')
})

test('keepers, unicorns, and what comes back', () => {
  const members = [{ id: 'j' }, { id: 'l' }, { id: 'a' }]
  assert.deepEqual(standing([{ member_id: 'j', stars: 5 }, { member_id: 'l', stars: 4 }], members).keeper, true)
  assert.equal(standing([{ member_id: 'j', stars: 5 }, { member_id: 'l', stars: 3 }], members).keeper, false)
  assert.equal(standing([{ member_id: 'j', stars: 5 }], members).keeper, false, 'one rating isn’t enough')
  assert.equal(standing([{ member_id: 'j', stars: 5 }, { member_id: 'l', stars: 5 }, { member_id: 'a', stars: 5 }], members).unicorn, true)
  assert.equal(standing([{ member_id: 'j', stars: 5 }, { member_id: 'l', stars: 5 }, { member_id: 'a', stars: 4 }], members).unicorn, false)
  const recipes = [{ id: 1, title: 'Unicorn' }, { id: 2, title: 'Keeper' }, { id: 3, title: 'Recent keeper' }, { id: 4, title: 'So-so' }]
  const ratings = [[1, 'j', 5], [1, 'l', 5], [1, 'a', 5], [2, 'j', 4], [2, 'l', 5], [3, 'j', 5], [3, 'l', 5], [4, 'j', 5], [4, 'l', 2]].map(([recipe_id, member_id, stars]) => ({ recipe_id, member_id, stars }))
  const again = makeItAgain(recipes, ratings, members, { 3: '2026-10-28', 2: '2026-09-01' }, '2026-10-31')
  assert.deepEqual(again.map((x) => x.r.title), ['Unicorn', 'Keeper']); assert.equal(again[0].unicorn, true)
})

test('each of us is asked to rate for a few days after a dinner, until we do', () => {
  const cooked = [{ recipe_id: 1, done_on: '2026-10-30' }, { recipe_id: 2, done_on: '2026-10-20' }, { recipe_id: 3, done_on: '2026-10-31' }]
  const ratings = [{ recipe_id: 3, member_id: 'j', stars: 4 }]
  assert.deepEqual(ratingsOwed(cooked, ratings, { id: 'j' }, '2026-10-31').map((c) => c.recipe_id), [1])
  assert.deepEqual(ratingsOwed(cooked, ratings, { id: 'a' }, '2026-10-31').map((c) => c.recipe_id), [1, 3])
  assert.deepEqual(ratingsOwed(cooked, ratings, null, '2026-10-31'), [])
})

test('hunt & gather: the shopping list loses what is crossed off, and a dish waiting on nothing is done', async () => {
  const { shoppingList, crossOff, stillToShop, boughtOn } = await import('../src/lib/kitchen/week.js')
  const dishes = [
    { id: 'f1', title: 'Miso salmon', groups: [[{ item: 'scallions', amount: '4', unit: '' }, { item: 'fresh ginger', amount: '1', unit: 'Tbsp' }], [{ item: 'white miso', amount: '2', unit: 'Tbsp' }]] },
    { id: 'f2', title: 'Soba bowls', groups: [[{ item: 'green onions', amount: '1', unit: 'bunch' }], [{ item: 'frozen ginger paste', amount: '1', unit: 'tsp' }]] },
  ]
  let got = []
  let s = shoppingList(dishes, got)
  assert.deepEqual(s.left, { f1: 3, f2: 2 })
  assert.equal(s.empty, false)
  const scallions = s.buy[0].items.find((i) => /scallion/.test(i.name))
  // Fresh ginger is bought; the frozen paste is checked for: crossing one off never crosses off the other
  const ginger = s.buy[0].items.find((i) => /ginger/.test(i.name))
  assert.notEqual(ginger.key, s.check.flatMap((x) => x.items).find((i) => /ginger/.test(i.name)).key)

  got = [...got, ...crossOff(scallions, '2026-11-08')]
  assert.deepEqual(got.map((g) => g.fridge_id), ['f1', 'f2'], 'one thing crossed off for every dish that needs it')
  s = shoppingList(dishes, got)
  assert.ok(!s.buy.flatMap((x) => x.items).some((i) => /scallion/.test(i.name)), 'gone from the list')
  assert.deepEqual(s.left, { f1: 2, f2: 1 })

  got = [...got, ...crossOff(ginger, '2026-11-08')]
  const miso = shoppingList(dishes, got).check.flatMap((x) => x.items).find((i) => /miso/.test(i.name))
  got = [...got, ...crossOff(miso, '2026-11-08')]
  s = shoppingList(dishes, got)
  assert.deepEqual(s.done, ['f1'], 'everything for the salmon is got')
  assert.deepEqual(s.left, { f1: 0, f2: 1 })

  // A dish added later brings back only its own use of something already crossed off
  const more = [...dishes, { id: 'f3', title: 'Scallion pancakes', groups: [[{ item: 'scallions', amount: '6', unit: '' }]] }]
  const back = shoppingList(more, got).buy.flatMap((x) => x.items).find((i) => /scallion/.test(i.name))
  assert.deepEqual(back.uses.map((u) => u.recipe), ['Scallion pancakes'])

  const paste = s.check.flatMap((x) => x.items).find((i) => /ginger/.test(i.name))
  s = shoppingList(dishes, [...got, ...crossOff(paste, '2026-11-08')])
  assert.equal(s.empty, true); assert.deepEqual(s.done, ['f1', 'f2'])

  assert.equal(stillToShop({ status: 'waiting', bought_on: null }), true)
  assert.equal(stillToShop({ status: 'waiting', bought_on: '2026-11-08' }), false)
  assert.equal(stillToShop({ status: 'cooked', bought_on: null }), false)
  assert.equal(boughtOn({ added_on: '2026-11-01', bought_on: '2026-11-03' }), '2026-11-03')
})
