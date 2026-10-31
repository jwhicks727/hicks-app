// ============================================
// journal.js -- a private journal: the day's question, three gratitudes
// ============================================
// Pure, so tests run it in Node. The journal is each person's own: the
// database lets only its writer read it (not even a parent), and it never
// goes to Claude. Nothing anyone writes in it belongs in this repository:
// the tests use made-up entries.
//
// The shape is Jason's own, from his journal: a date, the day's question
// and its answer, anything else on his mind, then Gratitudes, numbered.
// Each weekday has its question; there's a set for the school year and a
// lighter one for summer.

import { ds, parts, dow, addDays, diffDays, MONTHS, WEEKDAYS } from './cal/dates.js'

export const PROMPT_SETS = {
  school: {
    name: 'School year',
    days: [ // Sunday first
      ['Zoom out.', 'Stepping back, what matters most right now, and what does that set up for the week ahead?'],
      ['Set the target.', 'What’s the one thing this week that moves the needle most, and what’s my first move on it?'],
      ['Reach out.', 'Who do I need to connect with this week, and what’s the message?'],
      ['Clear the friction.', 'What am I avoiding, and what’s the smallest step that breaks it?'],
      ['Bank the evidence.', 'What did I do well this week, and what capability does it prove?'],
      ['Close the loop.', 'What did I learn or get sharper at this week?'],
      ['Claim the day.', 'What’s something today that’s just for me?'],
    ],
  },
  summer: {
    name: 'Summer',
    days: [
      ['Zoom out.', 'Stepping back, what matters most to me right now?'],
      ['Line up the fun.', 'What’s one thing purely for fun I can look forward to this week?'],
      ['Reach out.', 'Who’s been on my mind lately, and is it worth telling them?'],
      ['Catch the small stuff.', 'What ordinary thing today would I miss if it were gone?'],
      ['Credit yourself.', 'What have I done well lately — and not just at work?'],
      ['Highlight reel.', 'What was the most fun I had this week?'],
      ['Claim the day.', 'What’s something today that’s just for me?'],
    ],
  },
}
export const SET_CHOICES = { season: 'Follow the season', school: 'School year', summer: 'Summer', none: 'No question, just gratitudes' }

/** Summer runs mid-June to mid-August, roughly the school break. */
export function seasonSet(date) {
  const [, m, d] = parts(date)
  return (m === 6 && d >= 15) || m === 7 || (m === 8 && d < 10) ? 'summer' : 'school'
}

/** The day's question: { title, prompt } or null when the person writes gratitudes only. */
export function promptFor(date, choice = 'season', custom = null) {
  if (choice === 'none') return null
  const key = choice === 'season' ? seasonSet(date) : choice
  const days = (choice === 'custom' && Array.isArray(custom) && custom.length === 7 ? custom : (PROMPT_SETS[key] || PROMPT_SETS.school).days)
  const [title, prompt] = days[dow(date)] || []
  return title || prompt ? { title: title || '', prompt: prompt || '' } : null
}

/** "Saturday, October 31, 2026" */
export function longDate(date) {
  const [y, m, d] = parts(date)
  return `${WEEKDAYS[dow(date)]}, ${MONTHS[m - 1]} ${d}, ${y}`
}

export const blankEntry = (date, q) => ({ on_date: date, prompt_title: q ? q.title : null, prompt: q ? q.prompt : null, answer: '', reflection: '', gratitudes: ['', '', ''] })

/** An entry with something in it, trimmed for saving; null when there's nothing to keep. */
export function cleanEntry(e) {
  const t = (s, n) => (typeof s === 'string' ? s.trim().slice(0, n) : '')
  const gratitudes = (e.gratitudes || []).map((g) => t(g, 2000)).filter(Boolean).slice(0, 12)
  const out = { on_date: e.on_date, prompt_title: t(e.prompt_title, 80) || null, prompt: t(e.prompt, 300) || null, answer: t(e.answer, 20000) || null, reflection: t(e.reflection, 40000) || null, gratitudes }
  return out.answer || out.reflection || gratitudes.length ? out : null
}

// ---- Reading a journal kept elsewhere: a Google Doc's plain-text download, or a PDF's text ----

const MONTH_RE = MONTHS.join('|')
const DATE_LINE = new RegExp(`^\\s*(?:(${WEEKDAYS.join('|')}),?\\s+)?(${MONTH_RE})\\s+(\\d{1,2}),?\\s+(\\d{4})\\s*$`)
const PROMPT_LINE = /^([A-Z][^.?!"“”]{2,40}\.)\s*["“](.*)$/
const GRAT_HEAD = /^gratitudes?\s*[.:]?\s*$/i
const NUMBERED = /^(\d{1,2})[.)]\s*[​ ]*\s*(.*)$/
const BULLET = /^[●•*\-–◦▪]\s*[​ ]*\s*(.+)$/
const clean = (s) => s.replace(/[​﻿]/g, '').replace(/\s+/g, ' ').trim()

/** Lines into paragraphs: a PDF wraps long lines; a Google Doc's download keeps each paragraph on one. */
function paragraphs(lines) {
  const out = []
  let cur = ''
  for (const raw of lines) {
    const line = clean(raw)
    if (!line) { if (cur) { out.push(cur); cur = '' } continue }
    cur = cur ? `${cur} ${line}` : line
    // A short line that ends a sentence ends its paragraph; a long one wrapped
    if (line.length < 72 && /[.!?:)"”'’]$/.test(line)) { out.push(cur); cur = '' }
    else if (line.length > 120) { out.push(cur); cur = '' }
  }
  if (cur) out.push(cur)
  return out
}

/**
 * The text of a journal into entries: [{ date, prompt_title, prompt, answer, reflection, gratitudes }],
 * plus any "Outlets" list found in it ([{ title, items }]). Dates written with a slip (a weekday
 * that doesn't match, a year typed wrong in a run of entries) are put right from their neighbours.
 */
export function parseJournalText(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n')
  const raw = []
  let cur = null
  for (const line of lines) {
    const m = clean(line).match(DATE_LINE)
    if (m) {
      cur = { weekday: m[1] ? WEEKDAYS.indexOf(m[1]) : null, y: +m[4], m: MONTHS.indexOf(m[2]) + 1, d: +m[3], lines: [] }
      raw.push(cur)
    } else if (cur) cur.lines.push(line)
  }
  const dated = fixDates(raw)
  const outlets = []
  const entries = dated.map(({ date, lines: body }) => {
    const e = { date, prompt_title: null, prompt: null, answer: '', reflection: '', gratitudes: [] }
    let mode = 'reflection', before = [], after = [], grat = null
    for (let i = 0; i < body.length; i++) {
      const line = clean(body[i])
      if (!line) { (mode === 'answer' ? after : before).push(''); continue }
      if (GRAT_HEAD.test(line)) { mode = 'gratitudes'; continue }
      if (mode === 'gratitudes') {
        const n = line.match(NUMBERED)
        if (n) { grat = clean(n[2]); e.gratitudes.push(grat); continue }
        if (grat != null && e.gratitudes.length) { e.gratitudes[e.gratitudes.length - 1] = clean(`${e.gratitudes[e.gratitudes.length - 1]} ${line}`); continue }
        mode = e.prompt ? 'answer' : 'reflection'
      }
      const p = !e.prompt && line.match(PROMPT_LINE)
      if (p) {
        let q = p[2]
        while (!/["”]\s*$/.test(q) && i + 1 < body.length && clean(body[i + 1]) && !GRAT_HEAD.test(clean(body[i + 1]))) q = `${q} ${clean(body[++i])}`
        e.prompt_title = p[1]; e.prompt = clean(q.replace(/["”]\s*$/, '')); mode = 'answer'
        continue
      }
      if (/^outlets\s*:?$/i.test(line)) { i = readOutlets(body, i + 1, outlets) - 1; continue }
      ;(mode === 'answer' ? after : before).push(body[i])
    }
    e.reflection = keepLists(before)
    e.answer = keepLists(after)
    return e
  })
  return { entries: entries.filter((e) => e.answer || e.reflection || e.gratitudes.length), outlets }
}

/** Paragraphs, with numbered and bulleted lines kept as their own lines. */
function keepLists(lines) {
  const out = [], buf = []
  const flush = () => { if (buf.length) { out.push(...paragraphs(buf)); buf.length = 0 } }
  for (const l of lines) {
    const c = clean(l)
    const n = c.match(NUMBERED), b = c.match(BULLET)
    if (n || b) { flush(); out.push(n ? `${n[1]}. ${clean(n[2])}` : `• ${clean(b[1])}`) }
    else if (out.length && /^(\d+\.|•) /.test(out[out.length - 1]) && c && !buf.length && /^[a-z]/.test(c)) out[out.length - 1] += ` ${c}`
    else buf.push(l)
  }
  flush()
  return out.join('\n\n').trim()
}

/** A run of headings, each with bullets under it, from `start`; returns where it stopped. */
function readOutlets(body, start, out) {
  let i = start, group = null
  for (; i < body.length; i++) {
    const c = clean(body[i])
    if (!c) continue
    const b = c.match(BULLET)
    if (b) { if (group) group.items.push(clean(b[1]).slice(0, 200)); continue }
    if (group && group.items.length && /^[a-z(]/.test(c)) { group.items[group.items.length - 1] = `${group.items[group.items.length - 1]} ${c}`.slice(0, 200); continue }
    if (c.length <= 40 && !/[.!?]$/.test(c)) { group = { title: c.replace(/:$/, '').slice(0, 60), items: [] }; out.push(group); continue }
    break
  }
  return i
}

function fixDates(raw) {
  const out = []
  const used = new Set()
  raw.forEach((r, k) => {
    let date = ds(r.y, r.m, r.d)
    const prev = out.length ? out[out.length - 1].date : null
    const nextRaw = raw[k + 1] ? ds(raw[k + 1].y, raw[k + 1].m, raw[k + 1].d) : null
    // A year typed wrong: out of step with both neighbours, but right with the previous entry's year
    if (prev && (diffDays(prev, date) > 120 || diffDays(prev, date) < -3)) {
      const [py] = parts(prev)
      const tries = [py, py + 1].map((y) => ds(y, r.m, r.d)).filter((d) => diffDays(prev, d) >= -3 && diffDays(prev, d) <= 120 && (!nextRaw || diffDays(d, nextRaw) >= -3))
      if (tries.length) date = tries[0]
    }
    // A weekday that doesn't match its date: the nearest date that does
    if (r.weekday != null && dow(date) !== r.weekday) {
      for (const shift of [1, -1, 2, -2, 3, -3]) { const d = addDays(date, shift); if (dow(d) === r.weekday && !used.has(d)) { date = d; break } }
    }
    // Two entries on one date: the second is the next free day
    while (used.has(date)) date = addDays(date, 1)
    used.add(date)
    out.push({ date, lines: r.lines })
  })
  return out
}

/** A file to bring in: { version, entries, outlets }, each field checked; throws with a sentence when it isn't one. */
export function readImport(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json
  if (!data || data.kind !== 'teamhicks-journal' || !Array.isArray(data.entries)) throw new Error('That file isn’t a journal from this app.')
  const t = (s, n) => (typeof s === 'string' ? s.slice(0, n) : null)
  const entries = data.entries.filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date)).map((e) => cleanEntry({
    on_date: e.date, prompt_title: t(e.prompt_title, 80), prompt: t(e.prompt, 300), answer: t(e.answer, 20000), reflection: t(e.reflection, 40000),
    gratitudes: Array.isArray(e.gratitudes) ? e.gratitudes.map((g) => t(g, 2000)).filter(Boolean) : [],
  })).filter(Boolean)
  const outlets = Array.isArray(data.outlets) ? data.outlets.filter((g) => g && typeof g.title === 'string').slice(0, 20).map((g) => ({ title: g.title.slice(0, 60), items: (Array.isArray(g.items) ? g.items : []).filter((x) => typeof x === 'string').slice(0, 40).map((x) => x.slice(0, 200)) })) : []
  return { entries, outlets }
}

// ---- Looking back ----

/** Entries on this calendar day in earlier years, newest first: [{ years, entry }]. */
export function onThisDay(entries, today) {
  const [ty, tm, td] = parts(today)
  return entries.filter((e) => { const [y, m, d] = parts(e.on_date); return m === tm && d === td && y < ty }).map((e) => ({ years: ty - parts(e.on_date)[0], entry: e })).sort((a, b) => a.years - b.years)
}

/** When today is the journal's birthday: the number of years since its first entry, else 0. */
export function journalBirthday(entries, today) {
  if (!entries.length) return 0
  const first = entries.reduce((a, e) => (e.on_date < a ? e.on_date : a), entries[0].on_date)
  const [fy, fm, fd] = parts(first), [ty, tm, td] = parts(today)
  return fm === tm && fd === td && ty > fy ? ty - fy : 0
}

const STOP = new Set('i im i’m am is are was be been to of for the a an and or but my our his her its it this that these those so very really all with in on at by from as just still even every each me we us you your they them their there here have has had get got getting do did doing can could will would being one some more most much many lot lots such what who how when which also too again today yesterday tomorrow day days time thing things grateful gratitude thankful thanks thank like make made way back well good great new little big make keep going go able up out about into over than then them well'.split(' '))
const FOLD = { kitties: 'kitty', cats: 'cat', sunrises: 'sunrise', sunsets: 'sunset', hands: 'hands', friends: 'friend', routines: 'routine', notes: 'note', records: 'record', books: 'book', flowers: 'flower', clothes: 'clothes' }

/** The words that come up most across gratitudes: [{ word, n }], most first. */
export function gratitudeWords(entries, top = 30) {
  const counts = new Map(), named = new Map()
  for (const e of entries) {
    const seen = new Set()
    for (const g of e.gratitudes || []) {
      const s = g.replace(/^(i am|i’m|i'm|im)\s+(so\s+|very\s+|truly\s+)?(grateful|thankful)\s+(for|to|that)\s+/i, '')
      for (const raw of s.split(/[^A-Za-z’'-]+/)) {
        let w = raw.toLowerCase().replace(/^['’-]+|['’-]+$/g, '').replace(/['’]s$/, '')
        if (w.length < 3 || STOP.has(w)) continue
        w = FOLD[w] || w
        // A name keeps its capital: counted as written mid-sentence
        if (/^[A-Z][a-z]/.test(raw) && s.indexOf(raw) > 0) named.set(w, (named.get(w) || 0) + 1)
        if (seen.has(w)) continue
        seen.add(w)
        counts.set(w, (counts.get(w) || 0) + 1)
      }
    }
  }
  const show = (w, n) => ((named.get(w) || 0) * 2 >= n ? w[0].toUpperCase() + w.slice(1) : w)
  return [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, top).map(([word, n]) => ({ word, n, shown: show(word, n) }))
}

/** Entries whose gratitudes mention a word (as gratitudeWords counted it), newest first. */
export function entriesWithWord(entries, word) {
  const re = new RegExp(`\\b${word.replace(/[^a-z’'-]/g, '')}`, 'i')
  const alt = Object.entries(FOLD).filter(([, v]) => v === word).map(([k]) => new RegExp(`\\b${k}\\b`, 'i'))
  return entries.filter((e) => (e.gratitudes || []).some((g) => re.test(g) || alt.some((a) => a.test(g)))).sort((a, b) => (a.on_date < b.on_date ? 1 : -1))
}

// ---- Notes to your future self ----

export const LATER = [
  ['week', 'In a week', 7], ['month', 'In a month', 30], ['season', 'In three months', 91], ['year', 'In a year', 365], ['surprise', 'Some morning, a surprise', null],
]
/** When a note opens: a set length on, or a surprise between three and eight weeks away. */
export function openDate(today, choice, rand = Math.random) {
  const c = LATER.find((l) => l[0] === choice)
  if (c && c[2]) return addDays(today, c[2])
  return addDays(today, 21 + Math.floor(rand() * 36))
}
/** Notes ready to read today, oldest first. */
export const notesDue = (notes, today) => notes.filter((n) => n.open_on <= today && !n.opened_at).sort((a, b) => (a.written_on < b.written_on ? -1 : 1))

/** "a year ago", "3 weeks ago" for the day a note was written. */
export function agoWords(from, today) {
  const n = diffDays(from, today)
  if (n <= 1) return n === 1 ? 'yesterday' : 'today'
  if (n < 14) return `${n} days ago`
  if (n < 60) return `${Math.round(n / 7)} weeks ago`
  if (n < 345) return `${Math.round(n / 30.4)} months ago`
  const y = Math.round(n / 365.25)
  return y === 1 ? 'a year ago' : `${y} years ago`
}
