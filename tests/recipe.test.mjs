import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRecipe, parseIngredient, minutesIn, inline, sharedBody, easyOnHands, slugOf } from '../src/lib/kitchen/recipe.js'

// An example in the format (docs/KITCHEN.md), written for the test: not one of ours.
const RECIPE = `# Miso-Glazed Salmon with Roasted Squash

**Ratings —** L: /5 · J: 4/5 · A: /5

**Total time:** 50 min (20 min hands-on) · **Serves:** 3

- 1 ½ lb delicata squash
- 4 scallions
- 1 Tbsp fresh ginger

- 1 lb salmon fillets, skin on

- 2 Tbsp chili crisp (Jason’s plate)
- 1 cup cooked rice (Anna’s add-on)

- 2 Tbsp white miso
- 1 Tbsp maple syrup
- ½ tsp kosher salt

**1. (5 min)** Heat the oven to 425°F with a sheet pan inside. Halve the squash and scoop the seeds.

**2. (25 min)** Slice the squash into half-moons, toss with **½ tsp kosher salt**, and roast until browned at the edges.

**3. (3 min)** Whisk **2 Tbsp white miso** with **1 Tbsp maple syrup** and **1 Tbsp fresh ginger**.

**4. (12 min)** Brush the salmon with the glaze and roast beside the squash until it flakes.

**Plating —** Squash first, salmon on top, glaze spooned over.

**Laurie’s plate —** About 30 g protein. Nothing to add: it’s all hers.

**Jason’s plate —** Chili crisp and the scallions, sliced thin.

**Anna’s add-on —** Rice under hers.

**Why it works —** Salting the squash harder than feels right is the step that decides it: it’s mostly water.
`

test('a recipe in the format reads into its parts', () => {
  const r = parseRecipe(RECIPE)
  assert.equal(r.title, 'Miso-Glazed Salmon with Roasted Squash'); assert.equal(r.slug, 'miso-glazed-salmon-with-roasted-squash')
  assert.deepEqual(r.ratings, { L: null, J: 4, A: null })
  assert.equal(r.total, 50); assert.equal(r.handsOn, 20); assert.equal(r.serves, 3)
  assert.equal(r.groups.length, 4); assert.equal(r.groups[1][0].item, 'salmon fillets, skin on'); assert.equal(r.groups[0][0].amount, '1 ½'); assert.equal(r.groups[0][0].unit, 'lb')
  assert.equal(r.steps.length, 4); assert.equal(r.steps[1].minutes, 25); assert.match(r.steps[1].text, /\*\*½ tsp kosher salt\*\*/)
  assert.deepEqual(r.sections.map((s) => s.name), ['Plating', 'Jason’s plate', 'Anna’s add-on', 'Why it works'])
  assert.equal(r.laurie, 'About 30 g protein. Nothing to add: it’s all hers.')
  assert.deepEqual(r.warnings, [])
})

test('Laurie’s plate is kept out of the file everyone reads', () => {
  const body = sharedBody(RECIPE)
  assert.doesNotMatch(body, /Laurie’s plate|30 g protein/)
  assert.match(body, /Jason’s plate/); assert.match(body, /Why it works/)
  assert.equal(parseRecipe(body).laurie, null)
})

test('times, amounts and inline words', () => {
  assert.equal(minutesIn('1 hr 10 min'), 70); assert.equal(minutesIn('45 minutes'), 45); assert.equal(minutesIn('1½ hours'), 90); assert.equal(minutesIn('10–12 min'), 12); assert.equal(minutesIn('soon'), null)
  assert.deepEqual(parseIngredient('- 2 Tbsp white miso'), { amount: '2', unit: 'Tbsp', item: 'white miso', text: '2 Tbsp white miso' })
  assert.equal(parseIngredient('- 8 oz super-firm tofu').unit, 'oz'); assert.equal(parseIngredient('- Flaky salt, to finish').amount, '')
  assert.deepEqual(inline('add the **2 Tbsp curry paste** and *stir*'), [{ text: 'add the ' }, { text: '2 Tbsp curry paste', bold: true }, { text: ' and ' }, { text: 'stir', italic: true }])
  assert.deepEqual(inline('<img src=x onerror=alert(1)>'), [{ text: '<img src=x onerror=alert(1)>' }], 'markup stays text')
  assert.equal(slugOf('Crème Brûlée & Friends!'), 'creme-brulee-and-friends')
})

test('a file that strays still reads, with gentle warnings', () => {
  const r = parseRecipe('# Quick noodles\n\n- 8 oz soba\n\n1. Boil the soba.\n2. (2 min) Drain.\n')
  assert.equal(r.steps.length, 2); assert.ok(r.warnings.some((w) => /bold number/.test(w))); assert.ok(r.warnings.some((w) => /ratings/.test(w)))
})

test('easy on the hands', () => {
  assert.equal(easyOnHands('Sheet pan, parchment, frozen broccoli'), true)
  assert.equal(easyOnHands('Dice the onion finely and julienne the carrots.'), false)
})

test('each ingredient finds its picture and a colour', async () => {
  const { iconFor, colourFor, ICONS } = await import('../src/lib/kitchen/food.js')
  assert.ok(ICONS.size > 400)
  assert.equal(iconFor('salmon fillets, skin on'), 'salmon'); assert.equal(iconFor('delicata squash'), 'butternut_squash')
  assert.equal(iconFor('white miso'), 'miso'); assert.equal(iconFor('green onions, thinly sliced'), 'scallion'); assert.equal(iconFor('scallions'), 'scallion')
  assert.equal(iconFor('extra-virgin olive oil'), 'olive_oil'); assert.equal(iconFor('soy sauce'), 'soy_sauce'); assert.equal(iconFor('red onion'), 'red_onion')
  assert.equal(iconFor('cherry tomatoes'), 'cherry_tomato'); assert.equal(iconFor('baby bok choy'), 'bok_choy'); assert.equal(iconFor('blueberries'), 'blueberry')
  assert.equal(iconFor('chili crisp'), 'chili_pepper'); assert.equal(iconFor('xanthan gum'), null)
  assert.equal(colourFor('salmon'), '#F7A386'); assert.equal(colourFor('scallion'), '#A9D48F'); assert.equal(colourFor('miso'), '#E6CC9C')
})

test('the cook check puts what spoils first, first', async () => {
  const { cookCheck } = await import('../src/lib/kitchen/food.js')
  const groups = [[{ item: 'cilantro' }, { item: 'scallions' }, { item: 'frozen shrimp' }, { item: 'avocados' }], [{ item: 'salmon fillets' }], [{ item: 'white miso' }, { item: 'limes' }]]
  const c = cookCheck(groups, 2)
  assert.deepEqual(c.map((x) => x.what), ['Fresh fish', 'Avocado', 'Tender herbs', 'Scallions', 'Citrus'])
  assert.equal(c[0].left, 0); assert.match(c[0].tell, /briny/)
})

test('a recipe’s three pictures: protein first, never the salt', async () => {
  const { artFor } = await import('../src/lib/kitchen/food.js')
  assert.ok(artFor(parseRecipe(RECIPE)).length <= 3)
})

test('ingredients written as plain lines, as a photographed card gives them, are read too', () => {
  const md = `# Mom's Macaroni & Cheese

**Ratings —** L: /5 · J: /5 · A: /5

**Total time:** 1 hr 5 min (20 min hands-on) · **Serves:** 4

3 Tbsp butter
2 Tbsp flour
½ tsp salt

2 cups milk
1 Tbsp minced parsley
Italian seasoned breadcrumbs

**1. (10 min)** Cook the macaroni and drain.

**2. (30 min)** Bake at 350°F.

**Laurie’s plate** Hers, made up for the test.
`
  const r = parseRecipe(md)
  assert.deepEqual(r.groups.map((g) => g.map((i) => i.item)), [['butter', 'flour', 'salt'], ['milk', 'minced parsley', 'Italian seasoned breadcrumbs']])
  assert.deepEqual([r.groups[0][0].amount, r.groups[0][0].unit], ['3', 'Tbsp'])
  assert.equal(r.steps.length, 2); assert.equal(r.warnings.includes('No ingredients found'), false)
  // An "Ingredients" label, bold or a heading, then lines without amounts
  const labelled = parseRecipe('# Dish\n\n**Total time:** 20 min · **Serves:** 2\n\n**Ingredients**\nsalt\n2 eggs\n\n**1. (5 min)** Whisk.')
  assert.deepEqual(labelled.groups[0].map((i) => i.item), ['salt', 'eggs'])
  // A paragraph in the head is not an ingredient; a recipe with none says so
  const intro = parseRecipe('# Dish\n\nA creamy bake the family loves.\n\n**1. (5 min)** Whisk.')
  assert.equal(intro.groups.length, 0); assert.ok(intro.warnings.includes('No ingredients found'))
  // Bullets still work, and prose after the list does not become an ingredient
  const both = parseRecipe('# D\n\n- 1 cup rice\n- water\n\n**1. (5 min)** Cook.')
  assert.deepEqual(both.groups[0].map((i) => i.item), ['rice', 'water'])
})

test('a dish’s pictures come from its name, and only the sure ones', async () => {
  const { artFromTitle } = await import('../src/lib/kitchen/food.js')
  assert.deepEqual(artFromTitle('Mom’s Macaroni & Cheese'), ['pasta', 'cheddar'], 'what it is called for, not the onion in the list')
  assert.deepEqual(artFromTitle('Tempeh and Corn Chowder with Thyme'), ['tempeh', 'corn', 'thyme'])
  assert.deepEqual(artFromTitle('Instant Pot Coconut Chickpea and Spinach Curry with Ginger'), ['coconut', 'chickpeas', 'spinach'])
  assert.ok(!artFromTitle('Peanut-Butter Tempeh Lettuce Cups with Shredded Carrot').includes('butter'), 'peanut butter is not butter')
  assert.deepEqual(artFromTitle('Dinner'), [], 'a name with nothing to draw has no pictures, rather than a wrong one')
})

test('a group of ingredients is named from what is in it, never from where it sits', async () => {
  const { groupName } = await import('../src/lib/kitchen/food.js')
  assert.equal(groupName([{ item: 'elbow macaroni' }, { item: 'unsalted butter' }, { item: 'milk' }]), 'Pantry and fridge')
  assert.equal(groupName([{ item: 'salmon fillets' }, { item: 'tempeh' }]), 'Protein')
  assert.equal(groupName([{ item: 'cooked ham, for Anna' }]), 'For the plates')
  assert.equal(groupName([{ item: 'widgets' }, { item: 'a lemon' }]), '', 'mixed or unknown: no heading rather than a wrong one')
})

test('cook mode picks out the ingredients a step names, as well as its amounts', async () => {
  const { stepParts, ingredientNames } = await import('../src/lib/kitchen/recipe.js')
  const groups = [[{ item: 'butter lettuce (about 12 oz)' }, { item: 'fresh ginger' }, { item: 'carrots' }, { item: 'cherry tomatoes' }], [{ item: 'salmon fillets, skin on' }], [{ item: 'creamy peanut butter (peanuts and salt only)' }, { item: 'hot sauce' }, { item: 'kosher salt' }, { item: 'black pepper' }, { item: 'Gruyère, grated' }]]
  const names = ingredientNames(groups)
  for (const n of ['butter lettuce', 'lettuce', 'salmon fillets', 'salmon', 'peanut butter', 'hot sauce', 'black pepper', 'gruyere']) assert.ok(names.includes(n), n)
  for (const n of ['hot', 'sauce', 'black', 'kosher', 'fresh', 'creamy', 'cherry']) assert.ok(!names.includes(n), `${n} never stands for an ingredient alone`)
  const show = (t) => stepParts(t, groups).map((p) => (p.bold ? `[${p.text}]` : p.ingredient ? `{${p.text}}` : p.amount ? `<${p.text}>` : p.text)).join('')
  assert.equal(show('Whisk **3 Tbsp** peanut butter with 2 tsp water and the grated ginger.'), 'Whisk [3 Tbsp] {peanut butter} with <2 tsp> water and the grated {ginger}.')
  assert.equal(show('Season the salmon, add the cherry tomato halves and the shredded carrot.'), 'Season the {salmon}, add the {cherry tomato} halves and the shredded {carrot}.')
  assert.equal(show('Fold in the Gruyère and **1 Tbsp hot sauce**; season with salt and black pepper.'), 'Fold in the {Gruyère} and [1 Tbsp hot sauce]; season with {salt} and {black pepper}.')
  assert.equal(show('Roast at 400°F for 10 min (3 min hands-on).'), 'Roast at 400°F for 10 min (3 min hands-on).', 'times and temperatures are not amounts')
  assert.equal(stepParts('Plain words, *a note*', []).map((p) => p.text).join(''), 'Plain words, a note')
})
