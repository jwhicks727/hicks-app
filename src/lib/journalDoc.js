// ============================================
// journalDoc.js -- a journal kept in step with its writer's Google Doc
// ============================================
// Each person may link their journal to one Google Doc of their own. The sync
// runs only in their browser, with their own Google sign-in: no server and no
// Edge Function ever reads the Doc or the journal (CLAUDE.md, "A journal is
// its writer's alone"). Pure, so tests run it in Node, with made-up pages.
//
// The Doc is read as its paragraphs. Each dated heading starts a day, which
// runs to the next heading, or to the line the writer said their days stop
// at (a stash of prompts kept below the days, say). Nothing outside the days
// is ever changed. Each side keeps a fingerprint of a day as it was when the
// two last agreed (journal_entries.doc_hash and app_hash): a day changed on
// one side only goes across; a day changed on both is shown, both ways, for
// the writer to choose. Nothing is ever deleted on its own.

import { splitDays, readDay, cleanEntry, longDate, dateLine, isPromptLine, isGratHead } from './journal.js'
import { parts, MONTHS } from './cal/dates.js'

// ---- The Doc as paragraphs -------------------------------------------------------------------------

/**
 * A Google Docs document (documents.get) as its paragraphs, in order:
 * [{ text, line, start, end, named, plain, list, runs }]. `line` is the paragraph as a plain-text download
 * shows it (a numbered list item as "3. …"); `plain` is false for anything that isn't only text (a picture,
 * a chip, a table), which the sync never rewrites.
 */
export function docParagraphs(doc) {
  const lists = (doc && doc.lists) || {}
  const counts = new Map()
  const out = []
  for (const el of (doc && doc.body && doc.body.content) || []) {
    if (el.sectionBreak) continue
    if (!el.paragraph) { out.push({ text: '', line: '', start: el.startIndex, end: el.endIndex, named: null, plain: false, list: null, runs: [] }); continue }
    const p = el.paragraph
    let text = '', plain = true
    const runs = []
    for (const e of p.elements || []) {
      if (e.textRun) { text += e.textRun.content || ''; runs.push(e.textRun) } else plain = false
    }
    text = text.replace(/\n$/, '').replace(/\u000b/g, '\n')
    let list = null
    if (p.bullet) {
      const level = p.bullet.nestingLevel || 0
      const key = `${p.bullet.listId}:${level}`
      const n = (counts.get(key) || 0) + 1
      counts.set(key, n)
      const nest = (((lists[p.bullet.listId] || {}).listProperties || {}).nestingLevels || [])[level] || {}
      list = { id: p.bullet.listId, level, n, numbered: !nest.glyphSymbol }
    }
    out.push({ text, line: list ? (list.numbered ? `${list.n}. ${text}` : `• ${text}`) : text, start: el.startIndex, end: el.endIndex, named: (p.paragraphStyle && p.paragraphStyle.namedStyleType) || 'NORMAL_TEXT', plain, list, runs })
  }
  return out
}

// ---- Fingerprints --------------------------------------------------------------------------------

/**
 * Text as the sync compares it: list numbers and bullets made alike, curly quotes straight, and every run of
 * spaces and line breaks one space. A day whose words haven't changed reads the same however its
 * paragraphs are broken or its list is numbered.
 */
export function normal(text) {
  return String(text || '')
    .replace(/[​﻿]/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .split('\n').map((l) => l.trim().replace(/^\d{1,2}[.)]\s*/, '# ').replace(/^[●•*◦▪–-]\s+/, '* ')).filter(Boolean)
    .join(' ').replace(/\s+/g, ' ').trim()
}

/** An entry's words, as compared: its question, answer, anything else and gratitudes. */
export const entryText = (e) => normal([e.prompt_title, e.prompt, e.answer, e.reflection, ...(e.gratitudes || []).map((g) => `# ${g}`)].filter(Boolean).join('\n'))

/** Whether a day read from the Doc says what an entry here says (the answer and anything else may fall either side of each other). */
export const sameDay = (a, b) => entryText(a) === entryText(b)

export async function sha256(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
/** A day's fingerprint in the Doc, and an entry's here. */
export const docHash = (day) => sha256(normal(day.text))
export const appHash = (entry) => sha256(entryText(entry))

// ---- The days ------------------------------------------------------------------------------------

/** An entry read from the Doc, as the database keeps it (null when the day is only a heading). */
export const rowOf = (e) => cleanEntry({ on_date: e.date, prompt_title: e.prompt_title, prompt: e.prompt, answer: e.answer, reflection: e.reflection, gratitudes: e.gratitudes })

/** A day longer than the app keeps would lose words coming across, so it stays as it is on both sides. */
export function tooLong(e) {
  return (e.prompt_title || '').length > 80 || (e.prompt || '').length > 300 || (e.answer || '').length > 20000 || (e.reflection || '').length > 40000 ||
    (e.gratitudes || []).length > 12 || (e.gratitudes || []).some((g) => g.length > 2000)
}

/**
 * The days in the Doc: [{ date, from, last, to, start, end, text, plain, blanks, entry }]. `from` is the index
 * of the day's heading among the paragraphs, `last` its last line with words, `to` where the next day (or the
 * stop line) begins; `start`/`end` are the Doc's own indexes of the day's words. With a `stop` line set and not
 * found, nothing is a day: the sync must not guess where the days end.
 */
export function docDays(paras, stop = null) {
  const all = splitDays(paras.map((p) => p.line))
  const firstAt = all.length ? all[0].at : -1
  let stopAt = paras.length
  if (stop) {
    const want = normal(stop)
    const k = paras.findIndex((p, i) => i > firstAt && !p.list && normal(p.text) === want)
    if (k < 0) return { days: [], stopAt: null, missing: true }
    stopAt = k
  }
  const found = all.filter((d) => d.at < stopAt)
  const days = found.map((d, i) => {
    const to = i + 1 < found.length ? found[i + 1].at : stopAt
    let last = to - 1
    while (last > d.at && paras[last].plain && !paras[last].list && !paras[last].text.trim()) last--
    const own = paras.slice(d.at, last + 1)
    return {
      date: d.date, from: d.at, last, to, start: paras[d.at].start, end: paras[last].end,
      text: own.map((p) => p.line).join('\n'), plain: own.every((p) => p.plain), blanks: to - 1 - last,
      entry: readDay(d.date, paras.slice(d.at + 1, last + 1).map((p) => p.line)),
    }
  })
  return { days, stopAt: stop ? stopAt : null, missing: false }
}

const dayLine = (t) => isGratHead(t) || isPromptLine(t) || Boolean(dateLine(t))

/**
 * Lines that could be where the days stop, for the writer to pick from: [{ i, text, heading }]. Every heading
 * after the first day that isn't one of a day's own (a stash can hold dates, so "after the newest day" isn't
 * enough), and every short line after the newest day's heading.
 */
export function stopChoices(paras) {
  const all = splitDays(paras.map((p) => p.line))
  if (!all.length) return []
  const firstAt = all[0].at, lastAt = all[all.length - 1].at
  return paras.map((p, i) => ({ i, text: p.text.trim(), heading: /^(HEADING_|TITLE|SUBTITLE)/.test(p.named || ''), ok: !p.list && p.plain }))
    .filter((c) => c.ok && c.text && c.text.length <= 300 && !dayLine(c.text) && ((c.i > firstAt && c.heading) || c.i > lastAt))
    .map(({ i, text, heading }) => ({ i, text, heading }))
}

/** A first guess at the stop line: the first heading after the first day that isn't one of a day's own. */
export function guessStop(paras) {
  const c = stopChoices(paras).find((x) => x.heading && !dayLine(x.text))
  return c ? c.text : null
}

// ---- How the Doc writes a day --------------------------------------------------------------------

const KEEP = ['bold', 'italic', 'underline', 'fontSize', 'weightedFontFamily', 'foregroundColor']
const look = (run) => {
  if (!run || !run.textStyle) return null
  const t = {}
  for (const k of KEEP) if (run.textStyle[k] != null) t[k] = run.textStyle[k]
  return Object.keys(t).length ? t : null
}

/** How this Doc writes a day, from its newest plain day: the date's form, the quotes, the Gratitudes heading, the styles, the gap. */
export function docFormat(paras, days) {
  const f = { weekday: true, open: '“', close: '”', gratHead: 'Gratitudes', listed: true, gap: 1, styles: { date: null, prompt: null, gratHead: null, body: 'NORMAL_TEXT' } }
  const plain = days.filter((d) => d.plain)
  const recent = plain[plain.length - 1]
  if (!recent) return f
  const own = paras.slice(recent.from, recent.last + 1)
  const dp = own[0]
  const dl = dateLine(dp.text)
  f.weekday = Boolean(dl && dl.weekday != null)
  f.styles.date = { named: dp.named, text: look(dp.runs[0]) }
  const pp = own.find((p) => isPromptLine(p.text))
  if (pp) {
    if (!pp.text.includes('“')) { f.open = '"'; f.close = '"' }
    f.styles.prompt = { named: pp.named, title: look(pp.runs[0]), rest: look(pp.runs[pp.runs.length - 1]) }
  }
  const gh = own.find((p) => isGratHead(p.text))
  if (gh) {
    f.gratHead = gh.text.trim()
    f.styles.gratHead = { named: gh.named, text: look(gh.runs[0]) }
    const next = own[own.indexOf(gh) + 1]
    f.listed = Boolean(next && next.list)
  }
  const bp = own.find((p, i) => i > 0 && p !== pp && p !== gh && !p.list && p.text.trim())
  if (bp) f.styles.body = bp.named
  const between = plain.length > 1 ? plain[plain.length - 2] : recent
  f.gap = Math.max(0, Math.min(3, between.blanks))
  return f
}

/** An entry as the Doc's paragraphs: [{ kind, text, split? }], in the Doc's own way of writing a day. */
export function renderDay(entry, f) {
  const [y, m, d] = parts(entry.on_date)
  const rows = [{ kind: 'date', text: f.weekday ? longDate(entry.on_date) : `${MONTHS[m - 1]} ${d}, ${y}` }]
  const paras = (s) => String(s || '').split(/\n+/).map((x) => x.trim()).filter(Boolean)
  if (entry.prompt) {
    const title = (entry.prompt_title || '').trim()
    rows.push({ kind: 'prompt', text: `${title ? `${title} ` : ''}${f.open}${entry.prompt}${f.close}`, split: title.length })
  }
  for (const t of paras(entry.answer)) rows.push({ kind: 'body', text: t })
  for (const t of paras(entry.reflection)) rows.push({ kind: 'body', text: t })
  const g = (entry.gratitudes || []).filter(Boolean)
  if (g.length) {
    rows.push({ kind: 'gratHead', text: f.gratHead })
    g.forEach((t, i) => rows.push({ kind: 'grat', text: f.listed ? t : `${i + 1}. ${t}` }))
  }
  return rows
}

// ---- What to do ----------------------------------------------------------------------------------

const hasWords = (e) => Boolean(e.answer || e.reflection || (e.gratitudes || []).length)

/**
 * Compare the Doc's days with the entries here. `days` carry `hash` (docHash); `entries` carry `now` (appHash
 * today) and the stored `doc_hash`/`app_hash` from when the two last agreed. `removed` are days deleted here
 * since. Returns what goes which way, and what waits for the writer:
 * - pull: the Doc's day comes here (new, or changed only in the Doc)
 * - push: this day goes to the Doc, replacing its day there (changed only here)
 * - add: a day only here goes into the Doc
 * - mark: the two already agree; only the fingerprints are kept
 * - conflicts: different on both sides (or never compared and different): shown, both ways
 * - goneFromDoc: a day that was in step but is no longer in the Doc: remove here, or put back?
 * - removedHere: a day deleted here that the Doc still has: remove there too, or bring back?
 * - stuck: a day too long to bring across, left as it is
 */
export function planSync({ days, entries, removed = [] }) {
  const plan = { pull: [], push: [], add: [], mark: [], conflicts: [], goneFromDoc: [], removedHere: [], stuck: [], same: 0 }
  const here = new Map(entries.map((e) => [e.on_date, e]))
  const gone = new Set(removed)
  const inDoc = new Set()
  for (const day of days) {
    inDoc.add(day.date)
    const e = here.get(day.date)
    const long = tooLong(day.entry)
    if (!e) {
      if (gone.has(day.date)) plan.removedHere.push({ day })
      else if (!hasWords(day.entry)) continue
      else if (long) plan.stuck.push({ day })
      else plan.pull.push({ day, entry: null })
      continue
    }
    if (!e.doc_hash || !e.app_hash) {
      if (sameDay(day.entry, e)) plan.mark.push({ day, entry: e })
      else plan.conflicts.push({ day, entry: e, unsafe: !day.plain, long })
      continue
    }
    const docChanged = e.doc_hash !== day.hash, appChanged = e.app_hash !== e.now
    if (!docChanged && !appChanged) plan.same++
    else if (docChanged && !appChanged) (long ? plan.stuck.push({ day, entry: e }) : plan.pull.push({ day, entry: e }))
    else if (!docChanged && appChanged) (day.plain ? plan.push.push({ day, entry: e }) : plan.conflicts.push({ day, entry: e, unsafe: true, long }))
    else if (sameDay(day.entry, e)) plan.mark.push({ day, entry: e })
    else plan.conflicts.push({ day, entry: e, unsafe: !day.plain, long })
  }
  for (const e of entries) {
    if (inDoc.has(e.on_date)) continue
    if (e.doc_hash) plan.goneFromDoc.push({ entry: e })
    else plan.add.push({ entry: e })
  }
  return plan
}

// ---- Writing to the Doc --------------------------------------------------------------------------

const CLEAR = 'bold,italic,underline,strikethrough,fontSize,weightedFontFamily,foregroundColor,backgroundColor,link'

/** Style the new paragraphs that begin at `at`: plain first, then the Doc's own look for the date, question and Gratitudes. */
function styleRows(at, rows, f) {
  const req = []
  const end = at + rows.reduce((n, r) => n + r.text.length + 1, 0)
  const range = (s, e) => ({ startIndex: s, endIndex: e })
  const text = (s, e, t) => { if (t && e > s) req.push({ updateTextStyle: { range: range(s, e), textStyle: t, fields: Object.keys(t).join(',') } }) }
  req.push({ deleteParagraphBullets: { range: range(at, end) } })
  req.push({ updateParagraphStyle: { range: range(at, end), paragraphStyle: { namedStyleType: f.styles.body }, fields: 'namedStyleType' } })
  if (end - 1 > at) req.push({ updateTextStyle: { range: range(at, end - 1), textStyle: {}, fields: CLEAR } })
  let i = at
  let first = null, lastG = null
  for (const r of rows) {
    const s = i, e = i + r.text.length + 1
    const st = f.styles[r.kind] || null
    if (st && st.named && st.named !== f.styles.body) req.push({ updateParagraphStyle: { range: range(s, e), paragraphStyle: { namedStyleType: st.named }, fields: 'namedStyleType' } })
    if (r.kind === 'prompt' && st) { if (r.split) text(s, s + r.split, st.title); text(s + (r.split ? r.split + 1 : 0), e - 1, st.rest) } else if (st) text(s, e - 1, st.text)
    if (r.kind === 'grat' && f.listed) { if (first == null) first = s; lastG = e }
    i = e
  }
  if (first != null) req.push({ createParagraphBullets: { range: range(first, lastG), bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN' } })
  return req
}

/**
 * The Docs requests for a set of writes, from the end of the Doc backwards so every index still holds when
 * its turn comes. writes: [{ type: 'replace', day, entry } | { type: 'add', entry } | { type: 'delete', day }].
 * `days` and `stopAt` come from docDays on the same `paras`.
 */
export function buildRequests({ paras, days, stopAt, f, writes }) {
  const bodyEnd = paras.length ? paras[paras.length - 1].end : 1
  const blanks = (n) => Array.from({ length: n }, () => ({ kind: 'blank', text: '' }))
  const startOf = (k) => (k != null && k < paras.length ? paras[k].start : null)
  const ops = writes.map((w) => {
    if (w.type === 'replace') return { at: w.day.start, order: 0, w }
    if (w.type === 'delete') return { at: w.day.start, order: 0, w }
    const later = days.find((d) => d.date > w.entry.on_date)
    const at = later ? later.start : startOf(stopAt)
    return { at: at == null ? bodyEnd : at, order: 1, w, end: at == null }
  }).sort((a, b) => b.at - a.at || a.order - b.order || (b.w.entry && a.w.entry ? (a.w.entry.on_date < b.w.entry.on_date ? 1 : -1) : 0))
  const req = []
  for (const op of ops) {
    const { w } = op
    if (w.type === 'delete') {
      const next = startOf(w.day.to)
      const e = next == null ? bodyEnd - 1 : next
      if (e > w.day.start) req.push({ deleteContentRange: { range: { startIndex: w.day.start, endIndex: e } } })
      continue
    }
    const rows = renderDay(w.entry, f)
    const text = rows.map((r) => r.text).join('\n')
    if (w.type === 'replace') {
      const atEnd = w.day.end >= bodyEnd
      req.push({ deleteContentRange: { range: { startIndex: w.day.start, endIndex: atEnd ? w.day.end - 1 : w.day.end } } })
      req.push({ insertText: { location: { index: w.day.start }, text: atEnd ? text : `${text}\n` } })
      req.push(...styleRows(w.day.start, rows, f))
      continue
    }
    if (op.end) {
      const all = [...blanks(f.gap), ...rows]
      req.push({ insertText: { location: { index: bodyEnd - 1 }, text: `\n${all.map((r) => r.text).join('\n')}` } })
      req.push(...styleRows(bodyEnd, all, f))
    } else {
      const all = [...rows, ...blanks(f.gap)]
      req.push({ insertText: { location: { index: op.at }, text: `${all.map((r) => r.text).join('\n')}\n` } })
      req.push(...styleRows(op.at, all, f))
    }
  }
  return req
}
