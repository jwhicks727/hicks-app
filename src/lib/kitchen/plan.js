// ============================================
// plan.js -- the week's ideas, and the little Markdown the chat writes
// ============================================
// Pure: tests/kitchen-plan.test.mjs.

/** The Sunday a date's week starts on: a week's plan is filed under it. */
export function weekOf(date) {
  const d = new Date(Date.parse(date + 'T12:00:00Z'))
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

const key = (i) => String(i.title || '').toLowerCase().trim()
/** One idea as the list keeps it: a title, its line, which meal, whether it's a keeper coming back. */
function tidy(i) {
  return { title: String(i.title || '').trim().slice(0, 160), line: String(i.line || '').slice(0, 400), meal: i.meal || 'dinner', again: Boolean(i.again) }
}
/** Ideas from Claude that aren't already in `seen` (lower-cased titles), each once. */
function freshOnly(more, seen) {
  const out = []
  for (const i of more || []) {
    const t = tidy(i)
    if (!t.title || seen.has(key(t))) continue
    seen.add(key(t)); out.push(t)
  }
  return out
}

/**
 * The plan that is open: the newest one nobody has put away, whatever week it
 * was made in. A list waiting on an answer stays until someone dismisses it.
 */
export function openPlan(rows = []) {
  return (rows || []).filter((r) => r && !r.dismissed_at).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null
}

/** How old an open plan is, in words for the screen, or null when it's this week's. */
export function planAge(plan, thisWeek) {
  if (!plan || plan.week_of >= thisWeek) return null
  const [y, m, d] = plan.week_of.split('-').map(Number)
  return `the week of ${m}/${d}`
}

/** New ideas added to a list without repeating a title already there. */
export function mergeIdeas(old = [], more = []) {
  return [...old, ...freshOnly(more, new Set(old.map(key)))].slice(0, 40)
}

/**
 * One idea taken off the list. The picks are places in the list, so every
 * pick after it moves up one. `removed` is what putting it back needs.
 */
export function removeIdea(ideas = [], picked = [], at) {
  if (at < 0 || at >= ideas.length) return { ideas, picked, removed: null }
  return {
    ideas: ideas.filter((_, i) => i !== at),
    picked: picked.filter((p) => p !== at).map((p) => (p > at ? p - 1 : p)),
    removed: { idea: ideas[at], at, wasPicked: picked.includes(at) },
  }
}

/** Undo: the idea back where it was, picked again if it had been, whatever changed since. */
export function restoreIdea(ideas = [], picked = [], removed) {
  if (!removed || ideas.some((i) => key(i) === key(removed.idea)) || ideas.length >= 40) return { ideas, picked }
  const at = Math.max(0, Math.min(removed.at, ideas.length))
  const moved = picked.map((p) => (p >= at ? p + 1 : p))
  return {
    ideas: [...ideas.slice(0, at), removed.idea, ...ideas.slice(at)],
    picked: (removed.wasPicked ? [...moved, at] : moved).sort((a, b) => a - b),
  }
}

/**
 * Refresh: the picked stay where they are; each of the others is swapped for
 * a new one, in its place. A new one never repeats anything on the list
 * before. If fewer came back than were asked for, the spare places close up.
 */
export function refreshIdeas(ideas = [], picked = [], more = []) {
  const keep = new Set(picked)
  const pool = freshOnly(more, new Set(ideas.map(key)))
  const out = [], kept = []
  let swapped = 0
  ideas.forEach((idea, i) => {
    if (keep.has(i)) { kept.push(out.length); out.push(idea) }
    else if (pool.length) { out.push(pool.shift()); swapped++ }
  })
  return { ideas: out, picked: kept, swapped }
}

/** How many a refresh would swap: every idea not picked. */
export const notPicked = (ideas = [], picked = []) => ideas.length - picked.filter((p) => p >= 0 && p < ideas.length).length

/**
 * The chat's Markdown, the little of it there is, as blocks to draw:
 * paragraphs, bullet lists, headings; runs of **bold** inside them.
 */
export function lite(text = '') {
  const blocks = [], lines = String(text).replace(/\r/g, '').split('\n')
  let para = [], list = null
  const flush = () => { if (para.length) { blocks.push({ type: 'p', runs: runs(para.join(' ')) }); para = [] } if (list) { blocks.push(list); list = null } }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    const h = line.match(/^#{1,4}\s+(.*)$/), b = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (h) { flush(); blocks.push({ type: 'h', runs: runs(h[1]) }); continue }
    if (b) { if (para.length) { blocks.push({ type: 'p', runs: runs(para.join(' ')) }); para = [] } list = list || { type: 'ul', items: [] }; list.items.push(runs(b[1])); continue }
    if (list) { blocks.push(list); list = null }
    para.push(line)
  }
  flush()
  return blocks
}
export function runs(s) {
  return String(s).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) => (/^\*\*[^*]+\*\*$/.test(part) ? { b: true, t: part.slice(2, -2) } : { b: false, t: part }))
}
