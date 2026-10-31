// ============================================
// week.js -- the week's picks: what must be bought, what to check is in the
// pantry; and which recipes are keepers and unicorns. Pure: tests/week.test.mjs.
// ============================================
// Not a grocery list: Jason writes that by hand. These are the reminders
// beside it: the fresh things the week's dishes can't do without, and the
// staples worth a look before he goes.

import { iconFor } from './food.js'

const PROTEIN = /\b(salmon|cod|halibut|trout|tilapia|tuna|swordfish|snapper|sea bass|fish|shrimp|prawns?|scallops?|lobster|crab|clams|mussels|squid|tofu|tempeh|seitan|chicken|turkey|beef|steak|pork|bacon|sausage|chorizo|ham|lamb|duck|eggs? whites?|edamame)\b/
const FRESH_DAIRY = /\b(heavy cream|cream(?! cheese)|half[- ]and[- ]half|milk|buttermilk|sour cream|cr[eè]me fra[iî]che|yogurt|fresh mozzarella|burrata|ricotta|feta|goat cheese|cotija|queso fresco|mascarpone|cream cheese|tortillas?|naan|pita|bread|buns?|baguette)\b/
const FRIDGE_STAPLES = /\b(miso|parmesan|parmigiano|pecorino|butter|eggs?|mayo(nnaise)?|mustard|dijon|gochujang|doubanjiang|kimchi|capers|olives|pickles?|tahini|harissa|chili crisp|sriracha|hot sauce|fish sauce|oyster sauce|hoisin|curry paste|ginger paste|garlic paste|lemon juice|lime juice|maple syrup|jam|horseradish|shallot oil|garlic confit|relish|cheddar|gruy[eè]re)\b/
const PRODUCE = /\b(scallions?|green onions?|onions?|shallots?|garlic|ginger|lemons?|limes?|oranges?|herbs?|cilantro|parsley|basil|dill|mint|chives|thyme|rosemary|sage|tarragon|lettuce|spinach|kale|arugula|chard|greens|cabbage|bok choy|broccoli|broccolini|cauliflower|carrots?|celery|fennel|cucumbers?|zucchini|squash|pumpkin|sweet potato(es)?|potato(es)?|yams?|tomato(es)?|peppers?|chiles?|jalape[nñ]os?|poblanos?|mushrooms?|asparagus|green beans|snap peas|snow peas|peas|corn|avocados?|eggplant|radish(es)?|beets?|leeks?|apples?|pears?|berries|grapes|mango(es)?|pineapple|bean sprouts|sprouts)\b/

const isFrozenOrShelf = (t) => /\b(frozen|canned|dried|jarred|powder(ed)?|ground (cumin|coriander|ginger|cinnamon|turmeric)|paste|flakes|bouillon|stock|broth)\b/.test(t)

/**
 * Where one ingredient belongs: { list: 'buy' | 'check', shelf }.
 * The recipe format's groups help (0 produce, 1 protein, last pantry), but
 * the words decide, so a file with fewer groups still sorts right.
 */
export function placeIngredient(item) {
  const t = String(item).toLowerCase()
  if (FRIDGE_STAPLES.test(t) && !/\bfresh\b/.test(t)) return { list: 'check', shelf: 'In the fridge' }
  if (FRESH_DAIRY.test(t)) return { list: 'buy', shelf: 'Dairy, bread and the rest' }
  if (PROTEIN.test(t) && !/\b(sauce|stock|broth|bouillon|paste)\b/.test(t)) return { list: 'buy', shelf: 'Protein' }
  if (PRODUCE.test(t) && !isFrozenOrShelf(t) && !/\b(onion|garlic) powder\b/.test(t)) return { list: 'buy', shelf: 'Produce and herbs' }
  if (/\bfrozen\b/.test(t)) return { list: 'check', shelf: 'In the freezer' }
  return { list: 'check', shelf: 'In the pantry' }
}

const SHELVES = { buy: ['Produce and herbs', 'Protein', 'Dairy, bread and the rest'], check: ['In the fridge', 'In the freezer', 'In the pantry'] }
const keyOf = (item) => iconFor(item) || String(item).toLowerCase().replace(/\(.*?\)/g, '').replace(/,.*$/, '').replace(/\b(fresh|large|small|medium|chopped|sliced|minced|thinly|finely|diced|peeled|cooked|raw|organic|boneless|skinless|skin on)\b/g, '').replace(/s\b/g, '').replace(/\s+/g, ' ').trim()

/**
 * The week's two lists from its picked recipes ([{ title, groups }]):
 * { buy: [{ shelf, items: [{ name, uses: [{ recipe, amount }] }] }], check: [...] }
 */
export function weekLists(recipes) {
  const lists = { buy: new Map(), check: new Map() }
  for (const r of recipes) {
    for (const g of r.groups) for (const ing of g) {
      const { list, shelf } = placeIngredient(ing.item)
      const k = keyOf(ing.item)
      const shelfMap = lists[list]
      if (!shelfMap.has(shelf)) shelfMap.set(shelf, new Map())
      const items = shelfMap.get(shelf)
      if (!items.has(k)) items.set(k, { name: ing.item.replace(/\s*\((jason|anna|laurie)[^)]*\)/i, '').replace(/,.*$/, '').trim(), uses: [] })
      items.get(k).uses.push({ recipe: r.title, amount: [ing.amount, ing.unit].filter(Boolean).join(' ') })
    }
  }
  const out = {}
  for (const list of ['buy', 'check']) out[list] = SHELVES[list].filter((s) => lists[list].has(s)).map((shelf) => ({ shelf, items: [...lists[list].get(shelf).values()] }))
  return out
}

/**
 * A recipe's standing from its ratings ([{ member_id, stars }]) and the
 * family ([{ id, name }]): a keeper when everyone who rated it gave 4 or 5
 * (two of us at least); a unicorn when all three of us gave it 5.
 */
export function standing(ratings, members) {
  const stars = ratings.map((r) => r.stars)
  const everyone = members.length >= 3 ? members : null
  const unicorn = Boolean(everyone) && everyone.every((m) => ratings.some((r) => r.member_id === m.id && r.stars === 5))
  const keeper = unicorn || (stars.length >= 2 && stars.every((s) => s >= 4))
  return { keeper, unicorn, average: stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : null }
}

/** Keepers and unicorns not cooked in the last three weeks, unicorns first, then the best loved. */
export function makeItAgain(recipes, ratings, members, lastCooked, today, weeks = 3) {
  const cutoff = new Date(Date.parse(today + 'T12:00:00Z') - weeks * 7 * 864e5).toISOString().slice(0, 10)
  return recipes
    .map((r) => ({ r, ...standing(ratings.filter((x) => x.recipe_id === r.id), members), last: lastCooked[r.id] || null }))
    .filter((x) => x.keeper && (!x.last || x.last < cutoff))
    .sort((a, b) => Number(b.unicorn) - Number(a.unicorn) || b.average - a.average || (a.last || '').localeCompare(b.last || ''))
}

/** Who still owes a rating: recipes cooked in the last few days that `me` hasn't rated. */
export function ratingsOwed(cooked, ratings, me, today, days = 4) {
  if (!me) return []
  const from = new Date(Date.parse(today + 'T12:00:00Z') - days * 864e5).toISOString().slice(0, 10)
  return cooked.filter((c) => c.done_on && c.done_on >= from && c.done_on <= today && !ratings.some((r) => r.recipe_id === c.recipe_id && r.member_id === me.id))
}
