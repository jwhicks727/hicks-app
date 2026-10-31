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

/** New ideas added to a list without repeating a title already there. */
export function mergeIdeas(old = [], more = []) {
  const seen = new Set(old.map((i) => i.title.toLowerCase().trim()))
  const out = [...old]
  for (const i of more) {
    const t = String(i.title || '').trim()
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase())
    out.push({ title: t.slice(0, 160), line: String(i.line || '').slice(0, 400), meal: i.meal || 'dinner', again: Boolean(i.again) })
  }
  return out.slice(0, 40)
}

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
