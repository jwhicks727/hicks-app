// The Kitchen's food pictures: which drawing an ingredient gets, the colour it is filled with, and the
// shapes scripts/food-fills.py makes for the colour (public/food/).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ICONS, iconFor, colourFor, colourNameFor, PALETTE, SECOND, secondFor } from '../src/lib/kitchen/food.js'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'food')
const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'kitchen', 'food.js'), 'utf8')

test('every drawing has its colour, chosen once, by name', () => {
  const block = src.slice(src.indexOf('const COLOURS = {'), src.indexOf('const COLOUR_OF'))
  const lists = [...block.matchAll(/^\s+(\w+): '([^']+)'/gm)]
  const named = lists.flatMap(([, , names]) => names.split(' '))
  for (const [, colour] of lists) assert.ok(PALETTE[colour], `${colour} is not in the palette`)
  const twice = named.filter((n, i) => named.indexOf(n) !== i)
  assert.deepEqual(twice, [], 'a drawing is in two colour lists')
  for (const n of named) assert.ok(ICONS.has(n), `${n} is not a drawing`)
  for (const n of ICONS) assert.ok(colourNameFor(n), `${n} has no colour`)
})

test('colours that a word inside a name used to get wrong', () => {
  const is = (n, c) => assert.equal(colourNameFor(n), c, n)
  is('lime', 'leaf'); is('cilantro', 'leaf'); is('dill', 'leaf'); is('lettuce', 'leaf')
  is('peanuts', 'nut'); is('egg_white', 'white'); is('hot_sauce', 'hot'); is('maple_syrup', 'amber'); is('gruyere', 'butter')
  is('eggplant', 'purple'); is('peach', 'coral'); is('sausage', 'meat'); is('pineapple', 'yellow'); is('mascarpone', 'white')
  is('chickpeas', 'wheat'); is('red_cabbage', 'purple'); is('gooseberry', 'leaf'); is('soy_sauce', 'cocoa')
  assert.equal(colourFor('egg_white'), PALETTE.white)
  assert.equal(colourFor(null), PALETTE.wheat)
})

test('which drawing an ingredient gets', () => {
  assert.equal(iconFor('Gruyère'), 'gruyere', 'accents are read, not dropped')
  assert.equal(iconFor('jalapeño, sliced'), 'jalapeno')
  assert.equal(iconFor('crème fraîche'), 'creme_fraiche')
  assert.equal(iconFor('creamy peanut butter (peanuts and salt only)'), 'peanuts', 'a nut butter is its nut')
  assert.equal(iconFor('almond butter'), 'almonds')
  assert.equal(iconFor('unsalted butter'), 'butter')
  assert.equal(iconFor('carton liquid egg whites (1½ cups)'), 'egg_white')
  assert.equal(iconFor('butter lettuce (about 12 oz)'), 'lettuce')
  assert.equal(iconFor('hot sauce'), 'hot_sauce')
  assert.equal(iconFor('grape tomatoes'), 'cherry_tomato')
  assert.equal(iconFor('aged gouda'), 'gouda')
  assert.equal(iconFor('mimolette cheese'), 'cheddar', 'a cheese with no drawing of its own is a cheese')
})

test('every drawing has its ink and the shapes it is coloured with; the ink is the pack’s', () => {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'))
  assert.equal(files.length, ICONS.size)
  for (const f of files) {
    const name = f.slice(0, -4)
    assert.ok(ICONS.has(name), `${name} is not in ICONS`)
    const svg = fs.readFileSync(path.join(dir, f), 'utf8')
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg">/, name)
    assert.doesNotMatch(svg, /<script|on\w+=|href=|<image|<foreignObject/i, `${name}: drawing commands only`)
    const sym = (id) => svg.match(new RegExp(`<symbol id="${id}" viewBox="([^"]+)">([\\s\\S]*?)</symbol>`))
    const ink = sym('ink'), fill = sym('fill'), fill2 = sym('fill2')
    assert.ok(ink, `${name} has no ink`)
    assert.ok(fill, `${name} has nothing to colour`)
    for (const s of [fill, fill2].filter(Boolean)) {
      assert.equal(s[1], ink[1], `${name}: a fill is drawn in the ink's own square`)
      for (const [, d] of s[2].matchAll(/ d="([^"]+)"/g)) assert.match(d, /^[MLZ0-9\s-]+$/, `${name}: a fill is plain lines`)
    }
    for (const [, d] of ink[2].matchAll(/ d="([^"]+)"/g)) assert.match(d, /^[MCLz0-9.\s-]+$/, `${name}: the ink is plain drawing commands`)
    assert.equal(Boolean(fill2), Boolean(SECOND[name]), `${name}: a second colour in the file and in SECOND go together`)
    if (SECOND[name]) assert.ok(secondFor(name), name)
  }
})
