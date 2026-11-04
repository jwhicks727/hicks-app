// ============================================
// recipe.js -- reading Jason's recipe files (docs/KITCHEN.md, "The recipe
// format"): an H1 title, the ratings line, total time with hands-on time,
// serves; one ingredient list in groups split by blank lines; steps as
// literal bold numbers with their minutes; then the closing sections.
// ============================================
// A pasted recipe is data: it is read into fields and shown as text, never
// as HTML. "Laurie's plate" is split out (`laurie`) so it can be kept where
// only Jason and Laurie read it.

export const SECTION_NAMES = ['Plating', 'Laurie’s plate', 'Jason’s plate', 'Anna’s add-on', 'Daddy/daughter add-on', 'Heat', 'Herbs', 'Texture', 'Trader Joe’s shortcuts', 'Notes', 'Why it works']
const norm = (s) => s.toLowerCase().replace(/['’]/g, '’').replace(/\s+/g, ' ').trim()
const SECTION_KEYS = new Map(SECTION_NAMES.map((n) => [norm(n), n]))
const sectionName = (raw) => {
  const k = norm(raw.replace(/[:—–-]+\s*$/, ''))
  if (SECTION_KEYS.has(k)) return SECTION_KEYS.get(k)
  if (/^trader joe/.test(k)) return 'Trader Joe’s shortcuts'
  if (/^(anna|daddy)/.test(k)) return 'Anna’s add-on'
  return null
}

/** "1 hr 10 min", "70 min", "1h", "45 minutes", "1½ hours" -> minutes. */
export function minutesIn(s) {
  if (!s) return null
  const t = s.replace(/½/g, '.5').replace(/¼/g, '.25').replace(/¾/g, '.75').toLowerCase()
  let m = 0, any = false
  const h = t.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hr|hrs|hour|hours)/); if (h) { m += Number(h[1]) * 60; any = true }
  const mm = t.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*(?:m\b|min|mins|minute|minutes)/); if (mm) { m += Number(mm[2] || mm[1]); any = true }
  return any ? Math.round(m) : null
}

export const slugOf = (title) => title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

const UNITS = '(?:oz|ounces?|lbs?|pounds?|cups?|c\\.|tbsp|tablespoons?|tsp|teaspoons?|g|grams?|kg|ml|l|liters?|cloves?|bunch(?:es)?|heads?|stalks?|sprigs?|pinch(?:es)?|cans?|inch(?:es)?|"|large|medium|small|whole|fillets?|pieces?|slices?|sheets?|pouch(?:es)?)'
const AMOUNT = '(?:\\d+(?:[.,/]\\d+)?(?:\\s+\\d+/\\d+|\\s*[½¼¾⅓⅔⅛])?|[½¼¾⅓⅔⅛])(?:\\s*(?:[–-]|to)\\s*(?:\\d+(?:[./]\\d+)?|[½¼¾⅓⅔]))?'
const ING = new RegExp(`^(${AMOUNT})\\s*(${UNITS}\\b\\.?)?\\s*(.*)$`, 'i')
const STARTS_WITH_AMOUNT = new RegExp(`^(?:[-*•]\\s*)?${AMOUNT}`)

/** "1 ½ lb salmon fillets, skin on" -> { amount: '1 ½', unit: 'lb', item: 'salmon fillets, skin on' } */
export function parseIngredient(raw) {
  const text = raw.replace(/^\s*[-*•]\s*(\[[ xX]\]\s*)?/, '').replace(/\*\*/g, '').trim()
  const m = text.match(ING)
  if (!m) return { amount: '', unit: '', item: text, text }
  return { amount: m[1].trim(), unit: (m[2] || '').trim(), item: m[3].trim(), text }
}

/** Inline text with **bold** and *italic*, as [{ text, bold, italic }]: never HTML. */
export function inline(s) {
  const out = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g
  let at = 0, m
  while ((m = re.exec(s))) {
    if (m.index > at) out.push({ text: s.slice(at, m.index) })
    if (m[1] != null) out.push({ text: m[1], bold: true }); else out.push({ text: m[2] ?? m[3], italic: true })
    at = m.index + m[0].length
  }
  if (at < s.length) out.push({ text: s.slice(at) })
  return out
}

const STEP = /^\*\*\s*(\d+)\.\s*(?:\(([^)]*)\))?\s*\*\*\s*(.*)$/
const STEP_LOOSE = /^(\d+)\.\s+(?:\(([^)]*)\)\s*)?(.*)$/

/**
 * Read a recipe file. Returns { title, slug, ratings, total, handsOn, serves,
 * groups, steps, sections, laurie, warnings }. `warnings` says where the file
 * strays from the format, gently: it still reads.
 */
export function parseRecipe(md) {
  const text = String(md || '').replace(/\r\n?/g, '\n').slice(0, 60000)
  const lines = text.split('\n')
  const warnings = []
  let title = '', ratings = null, total = null, handsOn = null, serves = null
  const groups = [], steps = [], sections = []
  let group = null, mode = 'head', current = null
  const flushGroup = () => { if (group && group.length) groups.push(group); group = null }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], t = line.trim()
    if (!title && /^#\s+/.test(t)) { title = t.replace(/^#\s+/, '').trim(); continue }
    if (/^\*\*\s*ratings/i.test(t) || /^ratings\s*[—:-]/i.test(t)) {
      ratings = {}
      for (const [, who, n] of t.matchAll(/\b([LJA])\s*:\s*(\d)?\s*\/\s*5/g)) ratings[who] = n ? Number(n) : null
      continue
    }
    if (/total time/i.test(t) && mode !== 'steps' && mode !== 'sections') {
      const plain = t.replace(/\*\*/g, '')
      const paren = plain.match(/\(([^)]*)\)/)
      total = minutesIn(plain.replace(/\(.*?\)/g, '').replace(/total time/i, ''))
      if (paren && /hands/i.test(paren[1])) handsOn = minutesIn(paren[1])
      const hm = plain.match(/hands[- ]on[^0-9]*([^·|)]*)/i)
      if (handsOn == null && hm) handsOn = minutesIn(hm[1])
      const sv = plain.match(/serves\D*(\d+)/i); if (sv) serves = Number(sv[1])
      continue
    }
    if (/^\**\s*serves/i.test(t) && mode !== 'steps' && mode !== 'sections') { const sv = t.match(/(\d+)/); if (sv) serves = Number(sv[1]); continue }
    if (/^#{2,4}\s+/.test(t)) {
      const h = t.replace(/^#+\s+/, '')
      const name = sectionName(h)
      if (name) { flushGroup(); mode = 'sections'; current = { name, body: [] }; sections.push(current); continue }
      if (/^ingredients/i.test(h)) { mode = 'ingredients'; continue }
      if (/^(steps|method|instructions|directions)/i.test(h)) { flushGroup(); mode = 'steps'; continue }
      continue
    }
    if (/^\**\s*ingredients\s*:?\s*\**\s*:?$/i.test(t) && mode !== 'steps' && mode !== 'sections') { mode = 'ingredients'; continue }
    const sm = t.match(STEP) || (mode !== 'sections' && !/^[-*]/.test(t) ? t.match(STEP_LOOSE) : null)
    if (sm && mode !== 'sections') {
      flushGroup(); mode = 'steps'
      if (!STEP.test(t)) warnings.push(`Step ${sm[1]} isn’t a bold number, “**${sm[1]}. (x min)**”`)
      steps.push({ n: Number(sm[1]), minutes: minutesIn(sm[2] || ''), time: (sm[2] || '').trim(), text: sm[3].trim() })
      continue
    }
    const sec = t.match(/^\*\*([^*]+?)\*\*\s*[—:–-]?\s*(.*)$/)
    if (sec && sectionName(sec[1]) && (mode === 'steps' || mode === 'sections' || steps.length)) {
      flushGroup(); mode = 'sections'
      current = { name: sectionName(sec[1]), body: sec[2] ? [sec[2].replace(/^[—:–-]\s*/, '')] : [] }
      sections.push(current); continue
    }
    if (mode === 'sections' && current) { current.body.push(line); continue }
    if (/^\s*[-*•]\s+/.test(line) && mode !== 'steps') {
      if (mode === 'head') mode = 'ingredients'
      if (!group) group = []
      group.push(parseIngredient(line)); continue
    }
    // Plain lines, as the format describes it ("2 Tbsp flour"), not only bullets: from the first line that begins with an amount, any short line is an ingredient until the steps start
    if ((mode === 'head' || mode === 'ingredients') && t && !/^[#>|]/.test(t) && (mode === 'ingredients' ? t.length <= 120 && !/[.!?]$/.test(t) : STARTS_WITH_AMOUNT.test(t))) {
      mode = 'ingredients'; if (!group) group = []; group.push(parseIngredient(line)); continue
    }
    if (!t) { if (mode === 'ingredients') flushGroup(); continue }
    if (mode === 'steps' && steps.length && t) { steps[steps.length - 1].text += ' ' + t; continue }
  }
  flushGroup()
  for (const s of sections) s.body = s.body.join('\n').trim()
  const laurieSection = sections.find((s) => s.name === 'Laurie’s plate')
  const shared = sections.filter((s) => s !== laurieSection && s.body)

  if (!title) warnings.push('No title: the first line should be “# The dish”')
  if (!ratings) warnings.push('No ratings line, “**Ratings —** L: /5 · J: /5 · A: /5”')
  if (total == null) warnings.push('No total time')
  if (!groups.length) warnings.push('No ingredients found')
  if (!steps.length) warnings.push('No steps found')
  if (steps.some((s) => s.minutes == null)) warnings.push('A step has no time')
  return { title: title || 'Untitled recipe', slug: slugOf(title || 'untitled-recipe'), ratings, total, handsOn, serves, groups, steps, sections: shared, laurie: laurieSection ? laurieSection.body : null, warnings }
}

/** The file to store as everyone's: the recipe without Laurie's plate. */
export function sharedBody(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let skipping = false
  for (const line of lines) {
    const t = line.trim()
    const h = t.match(/^#{2,4}\s+(.*)$/), b = t.match(/^\*\*([^*]+?)\*\*/)
    const name = (h && sectionName(h[1])) || (b && sectionName(b[1]))
    if (name) skipping = name === 'Laurie’s plate'
    if (!skipping) out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

const EASY = /\b(sheet[- ]pan|slow cooker|instant pot|pressure cooker|no[- ]cook|pre-?cut|pre-?sliced|frozen|kitchen scissors|scissors|parchment|one[- ]pot|rice cooker|air fryer)\b/i
/** Easy on the hands: a sheet pan, a slow cooker or the Instant Pot, frozen or pre-cut produce, scissors over knives. */
export const easyOnHands = (md) => (String(md).match(new RegExp(EASY, 'gi')) || []).length >= 2

/**
 * The whole recipe again: the shared file with Laurie's plate (kept apart,
 * for the parents) back in its place, after Plating and before the other
 * plates. For reading a change against the saved version.
 */
export function withLauriePlate(body, laurie) {
  const md = String(body || '').replace(/\r\n?/g, '\n').trim()
  if (!laurie || !String(laurie).trim()) return md + '\n'
  const section = `**Laurie’s plate**\n${String(laurie).trim()}`
  const lines = md.split('\n')
  const at = lines.findIndex((line) => {
    const t = line.trim(), h = t.match(/^#{2,4}\s+(.*)$/), b = t.match(/^\*\*([^*]+?)\*\*/)
    const name = (h && sectionName(h[1])) || (b && sectionName(b[1]))
    return name && name !== 'Plating' && name !== 'Laurie’s plate'
  })
  if (at < 0) return `${md}\n\n${section}\n`
  return [...lines.slice(0, at), section, '', ...lines.slice(at)].join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}

/** A recipe as Claude proposed it, minus the note the app adds when showing it Laurie's plate. */
export const tidyProposed = (md) => String(md || '').replace(/(\*\*Laurie’s plate\*\*)[ \t]*\(kept privately[^)\n]*\)/g, '$1')

const FRACS = [[1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']]
const VULGAR = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }
/** "1 1/2", "1 ½", "½", "1.5", "3/4" -> a number, or null. */
export function amountValue(s) {
  const t = String(s || '').trim()
  let m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/); if (m) return Number(m[1]) + Number(m[2]) / Number(m[3])
  m = t.match(/^(\d+)?\s*([½¼¾⅓⅔⅛])$/); if (m) return (m[1] ? Number(m[1]) : 0) + VULGAR[m[2]]
  m = t.match(/^(\d+)\/(\d+)$/); if (m) return Number(m[1]) / Number(m[2])
  m = t.match(/^\d+(?:[.,]\d+)?$/); if (m) return Number(t.replace(',', '.'))
  return null
}
/** A number as a cook writes it: whole, with a kitchen fraction (¼, ⅓, ½, ⅔, ¾, ⅛), or to one decimal place. */
export function amountWords(v) {
  if (v == null || !Number.isFinite(v)) return ''
  const whole = Math.floor(v + 1e-9), rest = v - whole
  if (rest < 0.06) return String(whole || (v > 0 ? '⅛' : 0))
  if (rest > 0.94) return String(whole + 1)
  const near = FRACS.find(([f]) => Math.abs(rest - f) < 0.045)
  if (near) return whole ? `${whole} ${near[1]}` : near[1]
  return String(Math.round(v * 10) / 10)
}
/** An amount scaled by `factor`: "1 1/2" x2 -> "3", "1–2" x2 -> "2–4"; text it can't read is left as it is. */
export function scaleAmount(amount, factor) {
  if (!amount || factor === 1) return amount
  const range = String(amount).split(/\s*(?:[–-]|to)\s*/)
  const vals = range.map(amountValue)
  if (vals.some((v) => v == null)) return amount
  return vals.map((v) => amountWords(v * factor)).join('–')
}
/** The recipe as plain text for sharing: name, time, ingredients and steps. Laurie's plate is never in it. */
export function plainRecipe(r) {
  const out = [r.title]
  const bits = [r.total != null ? `${r.total} min` : '', r.serves ? `serves ${r.serves}` : ''].filter(Boolean)
  if (bits.length) out.push(bits.join(' · '))
  out.push('', 'Ingredients')
  for (const g of r.groups) { for (const x of g) out.push(`- ${x.text || x.item}`); out.push('') }
  if (r.steps.length) { out.push('Steps'); r.steps.forEach((s, i) => out.push(`${i + 1}. ${String(s.text || '').replace(/\*\*/g, '')}`)) }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
