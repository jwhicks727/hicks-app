// ============================================
// food.js -- each ingredient's picture and colour (the Food Icon Pack, CC BY
// 4.0, in public/food/), and how long fresh things keep (the cook check).
// ============================================

// Every icon in public/food/, by file name.
export const ICONS = new Set('achiote_paste acorn_squash active_dry_yeast adobo_sauce adzuki_beans agar agave ajvar allspice almond_flour almonds amaranth amchur anchovy annatto_seeds apple apple_cider_vinegar applesauce apricot arborio_rice artichoke arugula asafoetida asiago asparagus avocado avocado_oil baby_corn bacon baking_powder baking_soda balsamic_vinegar bamboo_shoots banana banana_blossom barley basil basmati_rice bay_leaf bbq_sauce beef beef_broth beef_ribs beer beet bell_pepper berries black_beans black_eyed_peas black_pepper black_vinegar blackberry blue_cheese blueberry bluefish bok_choy bonito brazil_nuts bread_flour brie broccoli brown_rice brown_sugar brussels_sprouts buckwheat bulgur burrata butter buttermilk butternut_squash cabbage cake_flour calamansi camembert cannellini_beans canola_oil cantaloupe capers caraway cardamom carp carrot cashews cassava catfish cauliflower cayenne celeriac celery cheddar cherry cherry_tomato chia_seeds chicken chicken_broth chickpeas chili_pepper chili_powder chimichurri chives chocolate_chips chorizo cilantro cinnamon clams cloves_spice cocoa_powder coconut coconut_cream coconut_flour coconut_milk coconut_oil cod coffee collard_greens comte coriander_seed corn corn_syrup cornichons cornmeal cornstarch cotija cottage_cheese couscous crab cranberry cranberry_sauce crawfish cream cream_cheese creme_fraiche cucumber cumin_seed currant curry_leaf curry_paste_massaman curry_powder daikon dashi_powder date dijon_mustard dill doubanjiang dragon_fruit duck durian dutch_oven edam edamame eel egg_white egg_yolk eggplant eggs elderberry emmental endive enoki espresso farro fava_beans fennel fenugreek_seed feta fig fish_sauce fish_stock flax_seeds flounder flour fontina frisee furikake galangal garam_masala garlic gelatin ghee ginger goat_cheese goat_meat gochugaru gochujang goose gooseberry gorgonzola gouda grape grapefruit grapeseed_oil great_northern_beans greek_yogurt green_beans green_jackfruit ground_beef ground_lamb ground_pork gruyere guava habanero haddock halibut halloumi ham harissa havarti hazelnuts hearts_of_palm heavy_cream hemp_seeds herbes_de_provence herring hoisin hominy honey honeydew horseradish horseradish_sauce hot_sauce hummus instant_yeast jackfruit jalapeno jasmine_rice jicama kaffir_lime_leaf kale kefir ketchup kidney_beans kimchi kiwi kohlrabi kombu labneh lamb lard lasagna_sheet leek lemon lemongrass lentils lettuce lime lobster lychee macadamia mackerel malanga manchego mango mango_chutney mangosteen maple_syrup margarine marjoram mascarpone mayonnaise milk millet mint mirin miso molasses monkfish monterey_jack morel mozzarella muenster mung_beans mushroom mussels mustard napa_cabbage nigella_seed nopales nori nutmeg oaxaca_cheese octopus okra olive_oil onion onion_powder orange oregano oyster_mushroom oyster_sauce oysters pancetta paneer_indian panko papaya paprika parmesan parsley parsnip passion_fruit pasta pastry_flour peach peanut_oil peanuts pear pecans pecorino persimmon pesto pickles pickling_spice pike pine_nuts pineapple pinto_beans pistachios plantain plantain_flour plum poblano polenta pollock pomegranate poppy_seed pork pork_ribs potato powdered_sugar prawns prosciutto provolone pumpkin pumpkin_seeds quinoa rabbit raclette radicchio radish rambutan ramen_noodles raspberry red_cabbage red_onion red_wine_vinegar rice rice_noodles rice_wine_vinegar ricotta rockfish roquefort rose_water rosemary saffron sage sake salami salmon salt sambal_oelek sardine sauerkraut sausage scallion scallops schmaltz sea_bass seaweed_salad_veg sesame_oil sesame_seeds sheet_pan sherry_vinegar shiitake shiso shrimp skillet slow_cooker smelt smoked_salt snap_peas snow_peas soba sour_cream soy_milk soy_sauce spinach squid sriracha star_anise star_fruit steak_beef stevia stilton strawberry sugar sumac sunflower_oil sweet_chili_sauce sweet_potato swiss_cheese swordfish tahini taleggio tamari tamarind_paste tapenade tapioca tarragon tea teff tempeh teriyaki thyme tilapia tofu tomatillo tomato tomato_chutney tomato_juice trout truffle truffle_oil tuna turkey turmeric turmeric_root turnip udon vanilla_bean vanilla_extract veal vegetable_oil vegetable_stock venison vermouth wakame walnut_oil walnuts wasabi water water_chestnuts watermelon white_pepper white_wine_vinegar whitefish whole_wheat_flour wild_rice wine_red wine_white wok worcestershire yellow_squash yellowtail yogurt yuca yuzu zucchini '.trim().split(' '))

// Said our way, before any name match: "green onions" are scallions, not onions.
const FIRST = [
  [/\bgreen onions?\b|\bspring onions?\b/, 'scallion'], [/\bshallots?\b/, 'onion'], [/\bchili crisp\b|\bred pepper flakes\b|\bchile\b|\bchiles\b|\bchilies\b/, 'chili_pepper'],
  [/\b(kosher|flaky|sea) salt\b/, 'salt'], [/\bextra[- ]virgin\b|\bevoo\b/, 'olive_oil'], [/\bmicrowave rice|rice pouch/, 'rice'],
  // A nut butter is its nut, never butter; butter beans are beans
  [/\bpeanut butter\b/, 'peanuts'], [/\balmond butter\b/, 'almonds'], [/\bcashew butter\b/, 'cashews'], [/\bbutter beans?\b/, 'great_northern_beans'],
  [/\bgrape tomato(es)?\b/, 'cherry_tomato'], [/\bpepper jack\b/, 'monterey_jack'], [/\bparm(igiano)?\b/, 'parmesan'], [/\b(coconut|liquid) aminos\b/, 'tamari'],
  [/\bmahi\b/, 'halibut'], [/\bsalsa\b/, 'tomato'], [/\bsparkling water\b|\bseltzer\b|\bclub soda\b/, 'water'],
]
// When nothing else matched.
const SYNONYMS = [
  [/\b(vegetable|veggie) (stock|broth)\b|\bstock\b/, 'vegetable_stock'],
  [/\bspaghetti|linguine|penne|rigatoni|orzo|fusilli|bucatini|orecchiette\b/, 'pasta'], [/\bnoodles?\b/, 'rice_noodles'],
  [/\bslaw\b|\bcoleslaw\b/, 'cabbage'], [/\bgreens\b/, 'spinach'], [/\bchard\b/, 'collard_greens'], [/\bherbs?\b/, 'parsley'], [/\bcheese\b/, 'cheddar'],
  [/\bpeppers?\b(?! flakes)/, 'bell_pepper'], [/\bsquash\b/, 'butternut_squash'], [/\bbeans\b/, 'black_beans'], [/\bfish\b/, 'cod'], [/\bchicken nuggets?\b/, 'chicken'],
]

/** The icon for an ingredient line's item, or null: the longest name it contains, plurals too. */
export function iconFor(item) {
  // Accents go first, so "Gruyère" is gruyere and "jalapeño" is jalapeno, not "gruy re" and "jalape o"
  const t = ' ' + String(item).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, ' ').replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ') + ' '
  for (const [re, name] of FIRST) if (re.test(t)) return name
  let best = null
  for (const name of ICONS) {
    const words = name.replace(/_/g, ' ')
    if (words.length <= (best ? best.replace(/_/g, ' ').length : 0)) continue
    if (new RegExp(` ${words}(s|es)? `).test(t) || (words.endsWith('y') && t.includes(' ' + words.slice(0, -1) + 'ies '))) best = name
  }
  if (best) return best
  for (const [re, name] of SYNONYMS) if (re.test(t) && ICONS.has(name)) return name
  return null
}

// Each drawing's colour, chosen for it by name and checked by eye against the drawing (scripts/food-fills.py
// makes the shapes it fills). A colour is decided here once per drawing, never by a word inside its name: that
// made peanuts green ("pea"), egg whites yellow ("egg") and mascarpone a fish ("carp").
export const PALETTE = {
  leaf: '#A9D48F', pale: '#D6E7A6', olive: '#BDBF72', lime: '#C3D96B',
  orange: '#F6BC57', yolk: '#F7B33B', yellow: '#F8D25A', butter: '#F5D98B', gold: '#EBC066',
  red: '#F08A7A', hot: '#E2553F', brick: '#C9684A', pink: '#F5B1A6', coral: '#F7A386', magenta: '#E57FAF', wine: '#B65A78',
  purple: '#B9A3D9', blue: '#93A9DE',
  white: '#FBF7EE', cream: '#F4E9CF', wheat: '#E6CC9C', nut: '#D5A56E', amber: '#C9802F', brown: '#A6744B', cocoa: '#7C5136',
  meat: '#E8A890', fish: '#C9DCEB', slate: '#8A96AA', dark: '#666D76', grey: '#C9C3BA', water: '#BFDDF0',
}
const COLOURS = {
  leaf: 'artichoke arugula asparagus avocado basil bay_leaf bok_choy broccoli brussels_sprouts cabbage celery chimichurri chives cilantro collard_greens cucumber curry_leaf dill edamame fava_beans green_beans green_jackfruit jalapeno kaffir_lime_leaf kale lettuce lime marjoram mint nopales okra oregano parsley pesto poblano rosemary sage scallion seaweed_salad_veg shiso snap_peas snow_peas spinach tarragon thyme wakame zucchini gooseberry',
  pale: 'endive fennel frisee honeydew kohlrabi lemongrass napa_cabbage sauerkraut leek',
  olive: 'avocado_oil capers cardamom cornichons durian herbes_de_provence jackfruit mung_beans olive_oil pickles pistachios furikake agave',
  lime: 'pear tomatillo wasabi calamansi kiwi guava',
  orange: 'acorn_squash apricot butternut_squash cantaloupe carrot habanero mango mango_chutney orange papaya persimmon pumpkin sweet_potato turmeric turmeric_root',
  yolk: 'egg_yolk',
  yellow: 'baby_corn banana corn cornmeal dijon_mustard lemon mustard pineapple plantain polenta star_fruit yellow_squash yuzu',
  butter: 'asiago butter cheddar comte edam emmental fontina gouda gruyere havarti manchego margarine monterey_jack muenster parmesan pecorino provolone raclette swiss_cheese taleggio wine_white',
  gold: 'apple_cider_vinegar beer canola_oil chicken_broth curry_powder fish_stock ghee grapeseed_oil honey mirin peanut_oil schmaltz sunflower_oil truffle_oil vegetable_oil vegetable_stock walnut_oil vermouth',
  red: 'berries achiote_paste ajvar annatto_seeds apple bell_pepper cherry cherry_tomato chili_pepper cranberry cranberry_sauce currant kimchi lychee pomegranate radish rambutan raspberry salami strawberry sweet_chili_sauce tomato tomato_chutney tomato_juice watermelon',
  hot: 'cayenne gochugaru hot_sauce ketchup sambal_oelek sriracha',
  brick: 'chorizo adobo_sauce bbq_sauce chili_powder curry_paste_massaman doubanjiang gochujang harissa paprika saffron',
  pink: 'ground_pork ham octopus pancetta pork prosciutto rabbit rose_water veal scallops',
  coral: 'crab crawfish grapefruit lobster peach prawns salmon shrimp trout',
  magenta: 'dragon_fruit',
  wine: 'adzuki_beans banana_blossom beet kidney_beans radicchio red_onion red_wine_vinegar sumac wine_red',
  purple: 'blackberry eggplant elderberry fig grape mangosteen passion_fruit plum red_cabbage',
  blue: 'blueberry',
  white: 'agar arborio_rice baking_powder baking_soda basmati_rice bread_flour burrata cake_flour coconut_cream coconut_flour coconut_milk coconut_oil cornstarch cotija cottage_cheese cream cream_cheese creme_fraiche egg_white enoki feta flour garlic gelatin goat_cheese greek_yogurt heavy_cream hominy jasmine_rice kefir labneh lard mascarpone milk mozzarella oaxaca_cheese paneer_indian pastry_flour powdered_sugar rice rice_noodles ricotta salt sour_cream sugar tapioca tofu udon yogurt daikon cauliflower',
  cream: 'blue_cheese brie buttermilk camembert cannellini_beans corn_syrup eggs gorgonzola great_northern_beans halloumi hearts_of_palm horseradish_sauce mayonnaise rice_wine_vinegar roquefort sake soy_milk squid stilton water_chestnuts white_wine_vinegar coconut turnip',
  wheat: 'active_dry_yeast almond_flour amaranth amchur applesauce asafoetida bamboo_shoots barley black_eyed_peas brown_rice buckwheat bulgur cashews celeriac chickpeas couscous dashi_powder farro fenugreek_seed galangal ginger hemp_seeds horseradish hummus instant_yeast jicama lasagna_sheet macadamia millet miso onion onion_powder oyster_mushroom panko parsnip pasta pine_nuts plantain_flour potato quinoa ramen_noodles sesame_seeds tahini teff tempeh white_pepper whole_wheat_flour pumpkin_seeds',
  nut: 'almonds brazil_nuts brown_sugar cassava coriander_seed cumin_seed hazelnuts lentils malanga morel mushroom peanuts pecans pickling_spice pinto_beans soba walnuts yuca bonito',
  amber: 'fish_sauce maple_syrup sesame_oil sherry_vinegar tea',
  brown: 'allspice balsamic_vinegar beef_broth caraway cinnamon date flax_seeds garam_masala hoisin nutmeg oyster_sauce shiitake star_anise tamarind_paste teriyaki vanilla_extract worcestershire',
  cocoa: 'chocolate_chips cloves_spice cocoa_powder coffee espresso molasses soy_sauce tamari truffle vanilla_bean wild_rice',
  meat: 'bacon beef beef_ribs chicken duck goat_meat goose ground_beef ground_lamb lamb pork_ribs sausage steak_beef turkey venison',
  fish: 'anchovy bluefish carp catfish clams cod eel flounder haddock halibut herring mackerel monkfish pike pollock rockfish sardine sea_bass smelt swordfish tilapia tuna whitefish yellowtail',
  slate: 'mussels poppy_seed',
  dark: 'black_beans black_pepper black_vinegar chia_seeds kombu nigella_seed nori tapenade',
  grey: 'dutch_oven oysters sheet_pan skillet slow_cooker smoked_salt wok stevia',
  water: 'water',
  // (each name is in exactly one list: tests/food-icons.test.mjs)
}
const COLOUR_OF = new Map(Object.entries(COLOURS).flatMap(([c, names]) => names.split(' ').map((n) => [n, c])))
/** The colour that fills an ingredient's drawing. */
export function colourFor(name) {
  if (!name) return PALETTE.wheat
  return PALETTE[COLOUR_OF.get(name)] || PALETTE.wheat
}
// Drawings with stems, leaves or a husk of another colour: their `#fill2` (the points that pick those regions
// are in scripts/food-fills.json), and the colour it takes.
export const SECOND = {
  ...Object.fromEntries([
    'acorn_squash apple apricot beet bell_pepper berries blackberry blueberry carrot cayenne celeriac',
    'cherry cherry_tomato chili_pepper corn cranberry currant daikon eggplant elderberry grape',
    'grapefruit habanero kohlrabi leek mango mangosteen orange parsnip peach pear persimmon pineapple',
    'plum pumpkin radish raspberry strawberry tomato turnip watermelon',
  ].join(' ').split(' ').map((n) => [n, 'leaf'])),
  avocado: 'nut', guava: 'pink', // a pit, and the inside of a slice
}
/** The colour of a drawing's stems or leaves, or null when it has one colour. */
export const secondFor = (name) => (SECOND[name] ? PALETTE[SECOND[name]] : null)
/** Which palette colour a drawing is filled with, by name (for the tests). */
export const colourNameFor = (name) => COLOUR_OF.get(name) || null

// How long fresh things keep in our fridge, and how to tell: [match, days, what, how to tell].
export const KEEPS = [
  [/scallops?\b/, 2, 'Scallops', 'Sweet-smelling, firm and glossy; no sour smell or milky liquid.'],
  [/\b(salmon|cod|halibut|trout|tilapia|sea bass|snapper|fish|tuna|swordfish|mahi)\b/, 2, 'Fresh fish', 'Smells clean and briny, never fishy; the flesh is firm and springs back.'],
  [/\b(shrimp|prawns|lobster|crab|clams|mussels)\b/, 2, 'Shellfish', 'Clean, sea-sweet smell; firm, not slimy. Frozen and still hard keeps for months.'],
  [/\bbean sprouts?\b/, 2, 'Bean sprouts', 'Crisp and white; no brown tips or sour smell.'],
  [/\b(cilantro|basil|parsley|dill|chives|tarragon|chervil)\b/, 5, 'Tender herbs', 'Leaves green and perky, with no slime or black spots.'],
  [/\b(spinach|arugula|lettuce|mixed greens|spring mix|watercress|bok choy|chard|microgreens)\b/, 4, 'Leafy greens', 'Leaves crisp; no slimy, yellow or see-through patches.'],
  [/\b(avocados?)\b/, 3, 'Avocado', 'Gives a little when pressed; not mushy, no sour smell.'],
  [/\b(berries|raspberr|strawberr|blackberr|blueberr)/, 4, 'Berries', 'Firm and dry; no mould where they touch.'],
  [/\b(mushrooms?|shiitake|oyster mushrooms?|enoki|cremini)\b/, 5, 'Mushrooms', 'Dry and firm; no slime or dark wet spots.'],
  [/\b(fresh mozzarella|burrata|ricotta)\b/, 5, 'Fresh cheese', 'Clean and milky; no sour smell.'],
  [/\b(corn on the cob|fresh corn|ears? of corn)\b/, 3, 'Fresh corn', 'Husks green and snug; kernels plump and milky when pressed.'],
  [/\b(zucchini|summer squash|yellow squash)\b/, 5, 'Summer squash', 'Firm and glossy; no soft or wrinkled ends.'],
  [/\b(asparagus|snap peas|snow peas|green beans)\b/, 4, 'Spring greens', 'Snap cleanly; tips tight, not slimy.'],
  [/\b(tomato(es)?|cherry tomatoes)\b/, 5, 'Tomatoes', 'Firm with a little give; no wrinkles or leaks.'],
  [/\b(scallions?|green onions?)\b/, 8, 'Scallions', 'Green tops firm, not slimy or yellow.'],
  [/\b(cucumbers?)\b/, 7, 'Cucumber', 'Firm all the way to the ends.'],
  [/\b(broccoli|cauliflower|brussels)\b/, 7, 'Brassicas', 'Tight and green or white; no yellowing or dark spots.'],
  [/\b(fennel)\b/, 7, 'Fennel', 'Bulb firm and white; fronds not slimy.'],
  [/\b(tempeh)\b/, 10, 'Tempeh', 'Inside its date; white or grey spots are fine, wet or pink ones aren’t.'],
  [/\b(tofu)\b/, 30, 'Tofu, unopened', 'Inside its date; the package isn’t puffed up.'],
  [/\b(ginger)\b/, 21, 'Ginger', 'Firm, not shrivelled or soft.'],
  [/\b(lemons?|limes?|oranges?)\b/, 21, 'Citrus', 'Firm and fragrant.'],
]

// A dish's pictures come from its NAME: what it is called for is what it is. Ingredient lists hold flavourings
// (an onion, a red pepper, a lemon) that were picking the wrong pictures, so they are not read for this.
const TITLE_PHRASES = [[/\bpeanut butter\b/, 'peanuts'], [/\balmond butter\b/, 'almonds'], [/\bsour cream\b/, 'sour_cream'], [/\bcoconut milk\b/, 'coconut']]
const TITLE_WORDS = [
  [/\b(macaroni|spaghetti|linguine|penne|rigatoni|orzo|fusilli|bucatini|orecchiette|lasagna|ziti)\b/, 'pasta'],
  [/\bcheese\b/, 'cheddar'],
]
/** Up to three pictures for the words of a dish's name, in the order they are said; fewer (or none) rather than a wrong one. */
export function artFromTitle(title) {
  let t = ' ' + String(title || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ') + ' '
  const found = []
  const take = (name, start, end) => { if (ICONS.has(name)) found.push({ name, start, end }); t = t.slice(0, start) + ' '.repeat(end - start) + t.slice(end) }
  for (const [re, name] of TITLE_PHRASES) { const m = re.exec(t); if (m) take(name, m.index, m.index + m[0].length) } // "peanut butter" is not butter
  for (const [re, name] of TITLE_WORDS) { const m = re.exec(t); if (m) take(name, m.index, m.index + m[0].length) }
  for (const name of [...ICONS].sort((a, b) => b.length - a.length)) {
    const words = name.replace(/_/g, ' ')
    const base = words.endsWith('s') ? words.slice(0, -1) : words // "chickpea" is as good as "chickpeas"
    const re = new RegExp(`(?<= )${base}(?:s|es)?(?= )`, 'g'); let m
    while ((m = re.exec(t))) take(name, m.index, m.index + m[0].length)
  }
  const out = []
  for (const f of found.sort((a, b) => a.start - b.start)) if (!out.includes(f.name) && !/^(salt|black_pepper|olive_oil|water|vegetable_oil|canola_oil)$/.test(f.name)) out.push(f.name)
  return out.slice(0, 3)
}
const PRODUCE = /\b(onions?|shallots?|garlic|ginger|scallions?|leeks?|lemons?|limes?|oranges?|tomato(es)?|peppers?|chil(i|ies|es)|carrots?|celery|spinach|kale|lettuce|arugula|cabbage|broccoli|cauliflower|zucchini|squash|corn|potato(es)?|mushrooms?|cucumbers?|avocados?|fennel|herbs?|cilantro|parsley|basil|thyme|rosemary|sage|dill|mint|chives|apples?|berries|fruit|greens)\b/i
const PROTEIN = /\b(salmon|cod|halibut|trout|tilapia|fish|shrimp|prawns|crab|scallops|tuna|chicken|beef|pork|turkey|lamb|sausage|bacon|ham|tempeh|tofu|eggs?|seitan|steak)\b/i
const PANTRY = /\b(flour|oil|salt|sugar|butter|milk|cream|cheese|cheddar|pasta|macaroni|spaghetti|rice|noodles?|broth|stock|vinegar|sauce|paste|spices?|powder|bread|crumbs|beans|lentils|chickpeas|honey|syrup|mustard|mayo|yogurt|vanilla|baking|cumin|paprika|pepper flakes)\b/i
/**
 * A heading for one group of ingredients, from what is in it, or '' when it is mixed or unclear (no heading
 * rather than a wrong one). "For the plates" is a group of per-person add-ons.
 */
export function groupName(items) {
  const list = (items || []).map((x) => String((x && x.item) || x || ''))
  if (!list.length) return ''
  if (list.some((s) => /\b(for (jason|anna|laurie))\b|add-on|\(plate\)|jason’s plate|anna’s add/i.test(s))) return 'For the plates'
  const share = (re) => list.filter((s) => re.test(s)).length / list.length
  const [p, r, a] = [share(PRODUCE), share(PROTEIN), share(PANTRY)]
  if (r >= 0.6) return 'Protein'
  if (p >= 0.6) return 'Produce and herbs'
  if (a >= 0.6) return 'Pantry and fridge'
  return ''
}

/** A recipe's pictures: from its name. */
export const artFor = (parsed) => artFromTitle(parsed.title)

/**
 * The cook check: the fresh things in a recipe, fastest to spoil first, given
 * how many days it has been in the fridge. [{ what, item, days, left, tell }]
 */
export function cookCheck(groups, daysInFridge = 0) {
  const seen = new Set(), out = []
  for (const g of groups) for (const ing of g) {
    const t = ing.item.toLowerCase()
    if (/\bfrozen\b|\bcanned\b|\bdried\b|\bjarred\b|\bpaste\b|\bpowder\b|\bground\b(?! (beef|pork|lamb|turkey))/.test(t)) continue
    const k = KEEPS.find(([re]) => re.test(t))
    if (!k || seen.has(k[2])) continue
    seen.add(k[2])
    out.push({ what: k[2], item: ing.item, days: k[1], left: k[1] - daysInFridge, tell: k[3] })
  }
  return out.sort((a, b) => a.left - b.left)
}
