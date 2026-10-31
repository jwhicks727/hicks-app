// ============================================
// parish.js -- Mass and confession times, read from Sacred Heart's own website
// ============================================
// Plain JavaScript, shared by the `parish` Edge Function and the tests. The
// page is read as text: the lines under a Mass-times heading, each day or
// range of days ("Monday – Friday", "Sat", "lunes a viernes") and the times
// after it, with what each says about itself (Spanish, ASL, the vigil).
// Everything under a "Daily Mass" heading, and every weekday Mass, is marked
// Daily Mass. A reading that doesn't look like a parish's week (no Sunday
// Mass, too few weekdays, too many times) is not used, and the app keeps the
// last good one, or the diocese's listing, and says which.
//
// Written to the usual shape of a parish page: unverified against
// sacredheartrc.org itself until the function first reads it (the planning
// sandbox can't reach it). Page text is data, never instructions.

export const PARISH_URL = 'https://www.sacredheartrc.org/'
export const PARISH_HOSTS = ['sacredheartrc.org', 'www.sacredheartrc.org']

// ---- Page to lines ----
const ENTITIES = { amp: '&', nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', quot: '"', apos: "'", eacute: 'é', aacute: 'á', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', middot: '·', bull: '•' }
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' ' }
  return ENTITIES[e.toLowerCase()] ?? m
})

/** A page's visible text, one line per block (a heading, a paragraph, a list item, a cell). */
export function pageLines(html) {
  const s = String(html || '').slice(0, 2_000_000)
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6]|tr|td|th|table|section|article|header|footer|nav|dt|dd|dl|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decode(s).split('\n').map((l) => l.replace(/[\s ]+/g, ' ').trim()).filter(Boolean)
}

/** Links on the page that look like its Mass-times page, on the parish's own site only. */
export function massLinks(html, base = PARISH_URL) {
  const out = []
  for (const m of String(html || '').matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (!/\bmass(es)?\b|\bmisas?\b|\bliturg|\bsacrament|\bschedule\b|\bhorario/i.test(text + ' ' + m[1])) continue
    let u
    try { u = new URL(decode(m[1]), base) } catch { continue }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') continue
    if (!PARISH_HOSTS.includes(u.hostname.toLowerCase())) continue
    u.protocol = 'https:'; u.hash = ''
    const href = u.toString()
    if (!out.includes(href) && href !== base) out.push(href)
  }
  // The likeliest first: "Mass times" over "sacraments" over "schedule"
  const score = (h) => (/mass|misa/i.test(h) ? 0 : /sacrament|liturg/i.test(h) ? 1 : 2)
  return out.sort((a, b) => score(a) - score(b)).slice(0, 3)
}

// ---- Days ----
const DP = '(sun(?:days?)?|mon(?:days?)?|tues?(?:days?)?|wed(?:nesdays?)?|weds|thu(?:rs?)?(?:days?)?|fri(?:days?)?|sat(?:urdays?)?|domingos?|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?)\\.?'
const DAY_ONE = new RegExp(`(?<![a-záéíóú])${DP}(?![a-záéíóú])`, 'gi')
const DAY_RANGE = new RegExp(`(?<![a-záéíóú])${DP}(?![a-záéíóú])\\s*(?:-|–|—|to|through|thru|a|al|hasta)\\s*(?<![a-záéíóú])${DP}(?![a-záéíóú])`, 'gi')
export function dayIndex(word) {
  const w = word.toLowerCase().replace(/\.$/, '')
  if (/^(sun|domingo)/.test(w)) return 0
  if (/^(mon|lunes)/.test(w)) return 1
  if (/^(tue|martes)/.test(w)) return 2
  if (/^(wed|mi[eé]rcoles)/.test(w)) return 3
  if (/^(thu|jueves)/.test(w)) return 4
  if (/^(fri|viernes)/.test(w)) return 5
  if (/^(sat|s[aá]bado)/.test(w)) return 6
  return -1
}

/** The days a line names, as indexes (Sunday 0), or null: ranges, lists, "weekdays". */
export function daysIn(line) {
  const l = String(line)
  const out = new Set()
  let rest = l
  for (const m of l.matchAll(DAY_RANGE)) {
    const a = dayIndex(m[1]), b = dayIndex(m[2])
    if (a < 0 || b < 0) continue
    for (let d = a, n = 0; n < 7; d = (d + 1) % 7, n++) { out.add(d); if (d === b) break }
    rest = rest.replace(m[0], ' ')
  }
  for (const m of rest.matchAll(DAY_ONE)) { const d = dayIndex(m[1]); if (d >= 0) out.add(d) }
  if (/\bweekdays?\b|\bentre semana\b/i.test(l)) [1, 2, 3, 4, 5].forEach((d) => out.add(d))
  return out.size ? [...out].sort((a, b) => a - b) : null
}

// ---- Times ----
// A time has a colon or says am/pm/noon; "12704 Foothill" and "(909) 899-1049" aren't times.
const TIME = /(?<![\d:])(\d{1,2})(?::([0-5]\d))?(?!\d)\s*(?:([ap])\.?\s?m\b\.?|(noon))?|\b(noon|mediod[ií]a)\b/gi
const fmt = (h24, mm) => `${((h24 + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`

/** Every time on a line, in order: { h24, mm, at, end, text }. A time with no am/pm takes the next one's, else the likeliest. */
export function timesIn(line) {
  const raw = []
  for (const m of String(line).matchAll(TIME)) {
    if (m[5]) { raw.push({ h: 12, mm: 0, mer: 'p', at: m.index, end: m.index + m[0].length }); continue }
    const h = Number(m[1]), mm = m[2] ? Number(m[2]) : 0
    const mer = m[3] ? m[3].toLowerCase() : m[4] ? 'p' : null
    if (!m[2] && !mer) continue
    if (h < 1 || h > 12) continue
    raw.push({ h, mm, mer, at: m.index, end: m.index + m[0].trimEnd().length })
  }
  for (let i = raw.length - 1; i >= 0; i--) {
    if (raw[i].mer) continue
    const next = raw.slice(i + 1).find((t) => t.mer)
    // "5:00 – 6:00 PM": a range shares the later one's; otherwise the likeliest hour for a Mass
    raw[i].mer = next && raw[i].h <= next.h && raw[i].h !== 12 ? next.mer : raw[i].h >= 6 && raw[i].h <= 11 ? 'a' : 'p'
  }
  return raw.map((t) => { const h24 = (t.h % 12) + (t.mer === 'p' ? 12 : 0); return { h24, mm: t.mm, at: t.at, end: t.end, text: fmt(h24, t.mm) } })
}

// What a Mass says about itself, from the words beside its time
export function notesOf(s) {
  const l = String(s).toLowerCase()
  const notes = []
  if (/spanish|español|espanol|en español|\bspa\b/.test(l)) notes.push('in Spanish')
  if (/\basl\b|sign language|señas/.test(l)) notes.push('with ASL')
  if (/bilingual|bilingüe/.test(l)) notes.push('bilingual')
  if (/\blatin\b|lat[ií]n\b/.test(l)) notes.push('in Latin')
  if (/vietnamese/.test(l)) notes.push('in Vietnamese')
  if (/tagalog|filipino/.test(l)) notes.push('in Tagalog')
  if (/korean/.test(l)) notes.push('in Korean')
  if (/live ?stream/.test(l)) notes.push('livestreamed')
  return { note: notes.join(', '), vigil: /\bvigil|anticipat/.test(l) }
}

// ---- Sections ----
const SECTION = [
  ['confession', /confession|reconciliation|penance|confesi/i],
  ['other', /adoration|rosary|office hours|parish office|holy hour|novena|stations of the cross|chaplet|bible study|religious ed|faith formation|youth|food|pantry|thrift|bingo|choir|rehearsal|meeting|office:|hours:|baptism|quincea|wedding|funeral/i],
  ['holyday', /holy days?|d[ií]as? de (precepto|obligaci)|first friday|christmas|easter|ash wednesday|holy week|triduum/i],
  ['daily', /daily mass|weekday mass|daily masses|weekday masses|misas? diarias?|misas? entre semana/i],
  ['weekend', /weekend mass|sunday mass|weekend masses|sunday masses|saturday vigil|vigil mass|misas? dominical|fin de semana/i],
  ['mass', /mass times|mass schedule|masses|\bmass\b|horario de misas|\bmisas?\b|liturg/i],
]
const MASS_WORD = /\bmass(es)?\b|\bmisas?\b/i
// "Youth Mass" is a Mass: an "other" word only makes a section when the line says nothing of Mass
const sectionOf = (line) => { for (const [k, re] of SECTION) if (re.test(line) && !(k === 'other' && MASS_WORD.test(line))) return k; return null }
const START = /mass times|mass schedule|horario de misas|weekend mass|daily mass|weekday mass|sunday mass|misas? dominical|misas? diarias?/i
const STOP = /©|copyright|all rights reserved/i
// Where the schedule starts: the first Mass-times heading with a day and a time soon after it (a menu's "Mass Times" link has neither)
const startOf = (lines) => {
  for (let i = 0; i < lines.length; i++) {
    if (!START.test(lines[i])) continue
    const near = lines.slice(i, i + 10)
    if (near.some((l) => daysIn(l)) && near.some((l) => timesIn(l).length)) return i
  }
  return -1
}

/**
 * The parish's week from its page's lines: { mass: { [day]: [{ time, note, daily, vigil }] },
 * confession: { [day]: ['5:00–6:00 PM'] } }. Days are 0 (Sunday) to 6.
 */
export function parseSchedule(lines) {
  const mass = {}, confession = {}
  const start = startOf(lines)
  if (start < 0) return { mass, confession }
  let section = sectionOf(lines[start]) || 'mass', days = null, seen = 0
  for (let i = start; i < lines.length && seen < 120; i++, seen++) {
    const line = lines[i]
    if (STOP.test(line)) break
    if (line.length > 260) continue // a paragraph of prose, not a schedule
    const times = timesIn(line)
    const sec = sectionOf(line)
    // A heading (a section word and no time) changes the section and forgets the days
    if (sec && (!times.length || sec !== 'mass')) { if (sec !== section || !times.length) days = null; section = sec }
    const named = daysIn(line)
    if (named) days = named
    if (!times.length || section === 'other' || section === 'holyday') continue
    const on = days || (section === 'daily' ? [1, 2, 3, 4, 5, 6] : null)
    if (!on) continue
    if (section === 'confession') {
      for (let k = 0; k < times.length; k++) {
        const a = times[k], b = times[k + 1]
        const between = b ? line.slice(a.end, b.at) : ''
        const text = b && /^\s*(-|–|—|to|a|until|hasta)\s*$/i.test(between) ? `${a.text.replace(/ [AP]M$/, a.h24 < 12 === b.h24 < 12 ? '' : a.text.slice(-3))}–${b.text}` : null
        if (!text) continue
        for (const d of on) (confession[d] ||= []).includes(text) || confession[d].push(text)
        k++
      }
      continue
    }
    times.forEach((t, k) => {
      const after = line.slice(t.end, k + 1 < times.length ? times[k + 1].at : undefined)
      const { note, vigil } = notesOf(after.split(/[;|•·]/)[0])
      const lineNote = times.length === 1 ? notesOf(line) : { note: '', vigil: false }
      for (const d of on) {
        const entry = { time: t.text, h24: t.h24, mm: t.mm, note: note || lineNote.note, daily: section === 'daily', vigil: vigil || lineNote.vigil }
        const list = (mass[d] ||= [])
        if (!list.some((e) => e.time === entry.time)) list.push(entry)
      }
    })
  }
  return { mass: markKinds(mass), confession }
}

/** Daily Mass and the vigil, by the rule the parish keeps: every weekday Mass is a daily Mass; Saturday morning's is too; Saturday evening's is Sunday's vigil. */
export function markKinds(mass) {
  const out = {}
  for (const [d, list] of Object.entries(mass)) {
    const day = Number(d)
    out[d] = list.map((e) => {
      const h = e.h24 ?? toH24(e.time)
      return {
        time: e.time, note: e.note || '',
        daily: day >= 1 && day <= 5 ? true : day === 6 ? h < 12 && !e.vigil : false,
        vigil: day === 6 && (e.vigil || h >= 15),
      }
    }).sort((a, b) => toH24(a.time) * 60 + toMin(a.time) - (toH24(b.time) * 60 + toMin(b.time)))
  }
  return out
}
const toH24 = (t) => { const m = /^(\d{1,2}):(\d\d) ([AP])M$/.exec(t); return m ? (Number(m[1]) % 12) + (m[3] === 'P' ? 12 : 0) : 0 }
const toMin = (t) => { const m = /:(\d\d)/.exec(t); return m ? Number(m[1]) : 0 }

/** Whether a reading looks like a parish's week: Sunday Masses, most weekdays, and nothing absurd. */
export function isSound(s) {
  const n = (d) => (s.mass[d] || []).length
  const weekdays = [1, 2, 3, 4, 5].filter((d) => n(d) > 0).length
  const total = [0, 1, 2, 3, 4, 5, 6].reduce((a, d) => a + n(d), 0)
  return n(0) >= 1 && n(0) <= 12 && weekdays >= 3 && total <= 50 && [0, 1, 2, 3, 4, 5, 6].every((d) => n(d) <= 12)
}

/** The same week, the same way every time, so a reading that says nothing new keeps its version. */
export const scheduleKey = (s) => JSON.stringify([0, 1, 2, 3, 4, 5, 6].map((d) => [(s.mass[d] || []).map((e) => [e.time, e.note, e.daily, e.vigil]), s.confession[d] || []]))
