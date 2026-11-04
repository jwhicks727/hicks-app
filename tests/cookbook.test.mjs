import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shelvesFor, sortRecipes, searchRecipes, makeWith, weatherPick, cookedStats, averageStars, surprise, recipeText } from '../src/lib/kitchen/cookbook.js'
import { scaleAmount, amountWords, plainRecipe, parseRecipe } from '../src/lib/kitchen/recipe.js'

const R = (id, title, o = {}) => ({ id, title, slug: id, total_minutes: 40, tags: [], created_at: '2026-10-0' + id.length, ...o })
const recipes = [
  R('a', 'Tempeh and Corn Chowder with Thyme', { total_minutes: 70, tags: ['easy-on-hands'] }),
  R('b', 'Sheet-pan Halibut with Carrots', { total_minutes: 30 }),
  R('c', 'Mom’s Macaroni & Cheese', { total_minutes: 65 }),
]
const texts = {
  a: recipeText(recipes[0], { groups: [[{ text: '8 oz tempeh' }, { text: '2 cups corn' }]], steps: [{ text: 'Simmer on the stove.' }] }),
  b: recipeText(recipes[1], { groups: [[{ text: '1 lb halibut' }, { text: '4 carrots' }]], steps: [{ text: 'Roast in the oven at 425.' }] }),
  c: recipeText(recipes[2], { groups: [[{ text: '1 1/2 cups elbow macaroni' }, { text: '8 oz cheddar' }]], steps: [{ text: 'Bake 30 minutes.' }] }),
}

test('shelves come from what each recipe is, and only shelves with something on them show', () => {
  const stats = cookedStats([{ recipe_id: 'a', done_on: '2026-09-01' }, { recipe_id: 'a', done_on: '2026-09-20' }, { recipe_id: 'b', done_on: '2026-11-01' }])
  const members = [{ id: 'm3', name: 'Anna' }]
  const ratings = [{ recipe_id: 'b', member_id: 'm1', stars: 5 }, { recipe_id: 'b', member_id: 'm3', stars: 4 }]
  const s = Object.fromEntries(shelvesFor(recipes, { texts, stats, ratings, members, today: '2026-11-04', laurieWritten: new Set(['a']) }).map((x) => [x.key, x.ids]))
  assert.deepEqual(s.quick, ['b']); assert.deepEqual(s.easy, ['a']); assert.deepEqual(s.soups, ['a']); assert.deepEqual(s.pasta, ['c'])
  assert.deepEqual(s.fish, ['b']); assert.deepEqual(s.tempeh, ['a']); assert.deepEqual(s.sheetpan, ['b'])
  assert.deepEqual(s.nooven, ['a'], 'the chowder never turns the oven on; roasting and baking do')
  assert.deepEqual(s.loved, ['b']); assert.deepEqual(s.anna, ['b'])
  assert.deepEqual(s.never, ['c']); assert.deepEqual(s.lately, ['a'])
  assert.deepEqual(s.laurie, ['b', 'c'], 'parents see which recipes still need Laurie’s plate')
  assert.equal(s.curry, undefined, 'an empty shelf is left out')
  assert.ok(!shelvesFor(recipes, { texts }).some((x) => x.key === 'laurie'), 'no Laurie shelf without the parents’ list')
})

test('sorting, searching names and ingredients, and what can I make with', () => {
  const stats = cookedStats([{ recipe_id: 'c', done_on: '2026-10-01' }, { recipe_id: 'c', done_on: '2026-10-20' }, { recipe_id: 'b', done_on: '2026-10-30' }])
  const ratings = [{ recipe_id: 'c', stars: 5 }, { recipe_id: 'a', stars: 3 }]
  assert.deepEqual(sortRecipes(recipes, 'quick').map((r) => r.id), ['b', 'c', 'a'])
  assert.deepEqual(sortRecipes(recipes, 'rated', { ratings }).map((r) => r.id), ['c', 'a', 'b'])
  assert.deepEqual(sortRecipes(recipes, 'cooked', { stats }).map((r) => r.id), ['c', 'b', 'a'])
  assert.deepEqual(sortRecipes(recipes, 'lately', { stats }).map((r) => r.id)[0], 'a', 'never cooked comes first, then the longest ago')
  assert.equal(averageStars(ratings, 'c'), 5); assert.equal(averageStars(ratings, 'b'), null)
  assert.deepEqual(searchRecipes(recipes, 'cheddar', texts).map((r) => r.id), ['c'], 'an ingredient finds the dish')
  assert.deepEqual(searchRecipes(recipes, 'corn', texts).map((r) => r.id), ['a'])
  assert.deepEqual(makeWith(recipes, 'tempeh, corn, carrots', texts).map((x) => [x.r.id, x.hits]), [['a', 2], ['b', 1]])
  assert.deepEqual(makeWith(recipes, '', texts), [])
  assert.equal(surprise(recipes, () => 0.99).id, 'c'); assert.equal(surprise([]), null)
})

test('tonight’s weather picks a shelf, and an ordinary day picks none', () => {
  assert.equal(weatherPick({ today: { high: 91, rain: 0 } }).shelf, 'nooven')
  assert.equal(weatherPick({ today: { high: 58, rain: 10 } }).shelf, 'soups')
  assert.equal(weatherPick({ today: { high: 72, rain: 70 } }).shelf, 'soups')
  assert.equal(weatherPick({ today: { high: 74, rain: 0 } }), null); assert.equal(weatherPick(null), null)
})

test('servings scale the amounts, as a cook writes them; sharing leaves Laurie’s plate out', () => {
  assert.equal(scaleAmount('1 1/2', 2), '3'); assert.equal(scaleAmount('3/4', 2), '1 ½'); assert.equal(scaleAmount('1–2', 2), '2–4')
  assert.equal(scaleAmount('3', 0.5), '1 ½'); assert.equal(scaleAmount('a pinch', 2), 'a pinch'); assert.equal(scaleAmount('2', 1), '2')
  assert.equal(amountWords(0.33), '⅓'); assert.equal(amountWords(2.5), '2 ½'); assert.equal(amountWords(1.4), '1.4')
  const md = '# Fish Night\n\n**Total time:** 30 min · **Serves:** 4\n\n## Ingredients\n- 1 lb cod\n\n## Steps\n**1. (10 min)** Cook it.\n\n**Laurie’s plate**\nSECRET RULE TEXT\n'
  const text = plainRecipe(parseRecipe(md))
  assert.match(text, /Fish Night/); assert.match(text, /- 1 lb cod/); assert.match(text, /1\. Cook it\./)
  assert.doesNotMatch(text, /SECRET/, 'Laurie’s plate never leaves the app this way')
})
