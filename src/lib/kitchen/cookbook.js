// ============================================
// cookbook.js -- shelves, sorts, search and picks for the Cookbook tab
// ============================================
// Pure: the recipes come from useCookbook (no bodies) and, when they've
// loaded, each recipe's shared file (`texts`: id -> lower-case title and
// ingredient lines). Nothing here reads Laurie's plate.

const has = (re) => (t) => re.test(t)
const SHELVES = [
  // What it is
  ['soups', 'Soups & stews', has(/\b(soup|stew|chowder|bisque|pozole|ramen|pho|gumbo|congee|chili)\b(?! crisp)/)],
  ['pasta', 'Pasta & noodles', has(/\b(pasta|macaroni|spaghetti|noodles?|orzo|lasagna|penne|rigatoni|gnocchi|udon|soba|linguine|fusilli)\b/)],
  ['bowls', 'Salads & bowls', has(/\b(salad|bowls?|slaw)\b/)],
  ['handheld', 'Tacos & wraps', has(/\b(tacos?|burritos?|wraps?|quesadillas?|enchiladas?|lettuce cups|tostadas?|sandwich(es)?)\b/)],
  ['curry', 'Curries', has(/\b(curry|dal|dhal|masala|korma|tikka)\b/)],
  // What it's built on
  ['fish', 'Fish & seafood', has(/\b(salmon|cod|halibut|trout|tilapia|shrimp|prawns?|scallops?|tuna|fish|crab|mahi|sea bass|snapper|mussels|clams)\b/)],
  ['tempeh', 'Tempeh & tofu', has(/\b(tempeh|tofu|seitan)\b/)],
  ['beans', 'Beans & lentils', has(/\b(beans?|lentils?|chickpeas?)\b/)],
  // How it's cooked
  ['sheetpan', 'Sheet pan', has(/\bsheet[- ]pan\b/)],
  ['pot', 'Instant Pot & slow cooker', has(/\b(instant pot|pressure cook\w*|slow cooker|crock ?pot)\b/)],
  ['onepot', 'One pot or pan', has(/\b(one[- ]pot|one[- ]pan|skillet)\b/)],
]
const OVEN = /\b(oven|bake[ds]?|baking|roast(ed|ing)?|broil\w*|preheat)\b/

/** Each recipe's searchable text: its name and its ingredient lines, lower case. */
export function recipeText(r, parsed) {
  const lines = parsed ? parsed.groups.flat().map((x) => x.text || x.item || '') : []
  return { title: r.title.toLowerCase(), all: [r.title, ...lines].join(' \n ').toLowerCase(), steps: parsed ? parsed.steps.map((s) => s.text || '').join(' ').toLowerCase() : '' }
}

/** How often each recipe was cooked in the months kept, and when last: id -> { count, last }. */
export function cookedStats(cooked) {
  const out = {}
  for (const c of cooked || []) { const e = out[c.recipe_id] || { count: 0, last: '' }; e.count++; if (c.done_on > e.last) e.last = c.done_on; out[c.recipe_id] = e }
  return out
}

/** The average of a recipe's stars, or null. */
export function averageStars(ratings, id) {
  const s = (ratings || []).filter((x) => x.recipe_id === id && x.stars).map((x) => x.stars)
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null
}

const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5)

/**
 * The shelves this cookbook has, each with its recipes: [{ key, name, ids }], only shelves with something on
 * them. `ctx` = { texts, stats, ratings, members, today, laurieWritten (Set or null: parents only) }.
 */
export function shelvesFor(recipes, ctx) {
  const { texts = {}, stats = {}, ratings = [], members = [], today, laurieWritten = null } = ctx || {}
  const t = (r) => (texts[r.id] ? texts[r.id].all : r.title.toLowerCase())
  const anna = members.find((m) => m.name === 'Anna')
  const out = []
  const add = (key, name, test) => { const ids = recipes.filter(test).map((r) => r.id); if (ids.length) out.push({ key, name, ids }) }
  add('quick', 'Under 30 minutes', (r) => r.total_minutes != null && r.total_minutes <= 30)
  add('easy', 'Easy on the hands', (r) => (r.tags || []).includes('easy-on-hands'))
  for (const [key, name, test] of SHELVES) add(key, name, (r) => test(t(r)))
  add('nooven', 'No oven', (r) => Boolean(texts[r.id]) && !OVEN.test(texts[r.id].all + ' ' + texts[r.id].steps))
  add('loved', 'Everyone loved', (r) => { const s = ratings.filter((x) => x.recipe_id === r.id && x.stars); return s.length >= 2 && s.every((x) => x.stars >= 4) })
  if (anna) add('anna', 'Anna’s favourites', (r) => ratings.some((x) => x.recipe_id === r.id && x.member_id === anna.id && x.stars >= 4))
  add('never', 'Not cooked yet', (r) => !stats[r.id])
  if (today) add('lately', 'Not in a while', (r) => stats[r.id] && daysBetween(stats[r.id].last, today) >= 30)
  if (laurieWritten) add('laurie', 'Needs Laurie’s plate', (r) => !laurieWritten.has(r.id))
  return out
}

/** Sort a list of recipes: 'az', 'newest', 'rated', 'quick', 'cooked', 'lately' (longest since cooked first). */
export function sortRecipes(list, how, { ratings = [], stats = {} } = {}) {
  const by = {
    az: (a, b) => a.title.localeCompare(b.title),
    newest: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')),
    rated: (a, b) => (averageStars(ratings, b.id) ?? -1) - (averageStars(ratings, a.id) ?? -1),
    quick: (a, b) => (a.total_minutes ?? 1e9) - (b.total_minutes ?? 1e9),
    cooked: (a, b) => ((stats[b.id] || {}).count || 0) - ((stats[a.id] || {}).count || 0),
    lately: (a, b) => String((stats[a.id] || {}).last || '').localeCompare(String((stats[b.id] || {}).last || '')),
  }[how] || ((a, b) => a.title.localeCompare(b.title))
  return list.slice().sort((a, b) => by(a, b) || a.title.localeCompare(b.title))
}

/** Search names and ingredients: every word must be found; a name that matches comes first. */
export function searchRecipes(list, q, texts = {}) {
  const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return list
  const scored = []
  for (const r of list) {
    const tx = texts[r.id] || recipeText(r, null)
    if (!words.every((w) => tx.all.includes(w))) continue
    scored.push({ r, title: words.filter((w) => tx.title.includes(w)).length })
  }
  return scored.sort((a, b) => b.title - a.title).map((x) => x.r)
}

/** "What can I make with tempeh, spinach": recipes using the most of them first: [{ r, hits, of }]. */
export function makeWith(list, haves, texts = {}) {
  const want = String(haves || '').toLowerCase().split(/[,;\n]+/).map((s) => s.trim().replace(/s$/, '')).filter((s) => s.length >= 2)
  if (!want.length) return []
  return list.map((r) => ({ r, hits: want.filter((w) => (texts[r.id] ? texts[r.id].all : r.title.toLowerCase()).includes(w)).length, of: want.length }))
    .filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits || a.r.title.localeCompare(b.r.title))
}

/** A shelf for tonight's weather, or null: a hot day wants no oven; a cool or wet one, a soup. */
export function weatherPick(forecast) {
  const today = forecast && forecast.today
  if (!today || today.high == null) return null
  if (today.high >= 85) return { shelf: 'nooven', why: `It’s ${today.high}° today: nothing that heats the kitchen` }
  if ((today.rain ?? 0) >= 50 || today.high <= 62) return { shelf: 'soups', why: today.high <= 62 ? `A cool day, ${today.high}°: something warm in a bowl` : 'Rain on the way: something warm in a bowl' }
  return null
}

/** One recipe at random from a list (`rand` for tests). */
export const surprise = (list, rand = Math.random) => (list.length ? list[Math.floor(rand() * list.length)] : null)
