import { test } from 'node:test'
import assert from 'node:assert/strict'
import { docParagraphs, docDays, docFormat, renderDay, planSync, buildRequests, normal, entryText, sameDay, sha256, docHash, appHash, guessStop, stopChoices, tooLong, rowOf } from '../src/lib/journalDoc.js'

// Every page here is made up (CLAUDE.md: nothing anyone wrote in a journal goes into a test).

/**
 * A small stand-in for a Google Doc: characters, with each paragraph's style and bullet kept on its newline the
 * way Docs keeps them. It applies the requests the sync sends and refuses the ones Docs would refuse.
 */
class FakeDoc {
  constructor(paras) {
    this.chars = []
    for (const p of paras) {
      for (const c of p.text) this.chars.push({ c })
      this.chars.push({ c: '\n', bullet: Boolean(p.bullet), named: p.named || 'NORMAL_TEXT', other: Boolean(p.other) })
    }
    this.revision = 'r1'
  }
  get end() { return this.chars.length + 1 } // the body starts at index 1
  range({ startIndex: s, endIndex: e }) {
    assert.ok(Number.isInteger(s) && Number.isInteger(e) && s >= 1 && e > s && e <= this.end, `range ${s}–${e} in a body ending at ${this.end}`)
    return [s - 1, e - 1]
  }
  paragraphsIn(s, e) { // the newlines of every paragraph the range touches
    const out = []
    let start = 0
    this.chars.forEach((ch, i) => { if (ch.c === '\n') { if (i >= s && start < e) out.push(ch); start = i + 1 } })
    return out
  }
  apply(requests) {
    for (const r of requests) {
      if (r.insertText) {
        const i = r.insertText.location.index - 1
        assert.ok(i >= 0 && i <= this.chars.length - 1, `insert at ${i + 1}: inside the body, never after its last newline`)
        const host = this.chars.slice(i).find((ch) => ch.c === '\n')
        const add = [...r.insertText.text].map((c) => (c === '\n' ? { c, bullet: host.bullet, named: host.named } : { c }))
        this.chars.splice(i, 0, ...add)
      } else if (r.deleteContentRange) {
        const [s, e] = this.range(r.deleteContentRange.range)
        assert.ok(e <= this.chars.length - 1, 'never the body’s last newline')
        this.chars.splice(s, e - s)
      } else if (r.createParagraphBullets || r.deleteParagraphBullets) {
        const on = Boolean(r.createParagraphBullets)
        const [s, e] = this.range((r.createParagraphBullets || r.deleteParagraphBullets).range)
        for (const nl of this.paragraphsIn(s, e)) nl.bullet = on
      } else if (r.updateParagraphStyle) {
        const [s, e] = this.range(r.updateParagraphStyle.range)
        for (const nl of this.paragraphsIn(s, e)) nl.named = r.updateParagraphStyle.paragraphStyle.namedStyleType
      } else if (r.updateTextStyle) {
        this.range(r.updateTextStyle.range)
      } else assert.fail(`unexpected request ${Object.keys(r)[0]}`)
    }
    this.revision += '+'
  }
  /** As documents.get returns it. */
  json() {
    const content = [{ startIndex: 0, endIndex: 1, sectionBreak: {} }]
    let start = 1, text = ''
    this.chars.forEach((ch, i) => {
      text += ch.c
      if (ch.c !== '\n') return
      const el = { startIndex: start, endIndex: i + 2, paragraph: { elements: ch.other ? [{ inlineObjectElement: {} }, { textRun: { content: text } }] : [{ textRun: { content: text } }], paragraphStyle: { namedStyleType: ch.named } } }
      if (ch.bullet) el.paragraph.bullet = { listId: 'L', nestingLevel: 0 }
      content.push(el)
      start = i + 2; text = ''
    })
    return { documentId: 'doc', title: 'A made-up journal', revisionId: this.revision, body: { content }, lists: { L: { listProperties: { nestingLevels: [{ glyphType: 'DECIMAL' }] } } } }
  }
}

const DAY = (date, q, answer, grats, extra = []) => [
  { text: date, named: 'HEADING_2' },
  ...(q ? [{ text: q }] : []),
  ...(answer ? [{ text: answer }] : []),
  ...extra,
  { text: 'Gratitudes', named: 'HEADING_3' },
  ...grats.map((g) => ({ text: g, bullet: true })),
  { text: '' },
]
const STASH = [{ text: 'Prompts to try someday', named: 'HEADING_1' }, { text: 'What would the kid me think of this week?' }, { text: 'Tuesday, December 1, 2026' }]
const sample = () => new FakeDoc([
  { text: 'Made-up journal', named: 'TITLE' },
  { text: '' },
  ...DAY('Monday, November 2, 2026', 'Set the target. “What’s the one move that matters?”', 'Tidy the garage before the rain.', ['Hot coffee', 'A quiet bus ride']),
  ...DAY('Tuesday, November 3, 2026', 'Reach out. “Who should hear from me?”', 'Call the neighbour about the fence.', ['A long walk', 'Soup']),
  ...STASH,
])
const read = (fake, stop = 'Prompts to try someday') => { const paras = docParagraphs(fake.json()); return { paras, ...docDays(paras, stop) } }

test('the Doc’s paragraphs read as a plain-text download does, numbered list and all', () => {
  const paras = docParagraphs(sample().json())
  assert.equal(paras[0].text, 'Made-up journal')
  const grats = paras.filter((p) => p.list)
  assert.deepEqual(grats.map((p) => p.line), ['1. Hot coffee', '2. A quiet bus ride', '3. A long walk', '4. Soup'], 'one list running on, as Docs numbers it')
  assert.ok(paras.every((p, i) => i === 0 || p.start === paras[i - 1].end), 'indexes follow on')
})

test('days run from heading to heading and stop at the stash, which is never a day', () => {
  const { days, paras } = read(sample())
  assert.deepEqual(days.map((d) => d.date), ['2026-11-02', '2026-11-03'])
  const last = days[1]
  assert.equal(last.entry.prompt_title, 'Reach out.')
  assert.equal(last.entry.answer, 'Call the neighbour about the fence.')
  assert.deepEqual(last.entry.gratitudes, ['A long walk', 'Soup'])
  assert.equal(last.blanks, 1)
  assert.equal(paras[last.to].text, 'Prompts to try someday')
  const loose = docDays(paras, null)
  assert.equal(loose.days.length, 3, 'with no stop line, a date in the stash looks like a day: which is why the writer picks one')
  assert.equal(guessStop(paras), 'Prompts to try someday', 'the first heading after the newest day')
  const choices = stopChoices(paras).map((c) => c.text)
  assert.ok(choices.includes('Prompts to try someday'), 'the stash’s heading is offered')
  assert.ok(!choices.includes('Gratitudes') && !choices.some((t) => /November \d, 2026/.test(t)), 'a day’s own lines are not')
  const lost = docDays(paras, 'A heading that isn’t there')
  assert.equal(lost.missing, true)
  assert.equal(lost.days.length, 0, 'never guesses where the days end')
})

test('a new day is written the Doc’s own way', () => {
  const { paras, days } = read(sample())
  const f = docFormat(paras, days)
  assert.equal(f.weekday, true)
  assert.equal(f.open, '“')
  assert.equal(f.gratHead, 'Gratitudes')
  assert.equal(f.listed, true)
  assert.equal(f.gap, 1)
  assert.equal(f.styles.date.named, 'HEADING_2')
  const rows = renderDay({ on_date: '2026-11-04', prompt_title: 'Clear the friction.', prompt: 'What am I avoiding?', answer: 'The tax folder.\n\nIt can wait a day.', reflection: 'Rain tonight.', gratitudes: ['Warm socks'] }, f)
  assert.deepEqual(rows.map((r) => [r.kind, r.text]), [
    ['date', 'Wednesday, November 4, 2026'], ['prompt', 'Clear the friction. “What am I avoiding?”'], ['body', 'The tax folder.'], ['body', 'It can wait a day.'], ['body', 'Rain tonight.'], ['gratHead', 'Gratitudes'], ['grat', 'Warm socks'],
  ])
})

test('fingerprints ignore how paragraphs are broken, how a list is numbered and which quotes are used', async () => {
  assert.equal(normal('First thought\nsecond line\n\n3. Soup'), normal('First thought second line\n1) Soup'))
  assert.equal(normal('“Quoted” and it’s'), normal('"Quoted" and it\'s'))
  const a = { prompt_title: 'Zoom out.', prompt: 'What matters?', answer: 'One.', reflection: 'Two.', gratitudes: ['Tea'] }
  const b = { prompt_title: 'Zoom out.', prompt: 'What matters?', answer: 'One. Two.', reflection: '', gratitudes: ['Tea'] }
  assert.ok(sameDay(a, b), 'the answer and anything else may fall either side of each other')
  assert.equal(await appHash(a), await appHash(b))
  assert.match(await sha256('x'), /^[0-9a-f]{64}$/)
  assert.ok(!sameDay(a, { ...a, gratitudes: ['Coffee'] }))
  assert.equal(entryText({ gratitudes: [] }), '')
})

test('what goes which way', async () => {
  const { days } = read(sample())
  for (const d of days) d.hash = await docHash(d)
  const [mon, tue] = days
  const agreed = async (day, extra = {}) => { const e = { ...rowOf(day.entry), ...extra }; return { ...e, doc_hash: day.hash, app_hash: await appHash(rowOf(day.entry)), now: await appHash(e) } }
  // Nothing linked yet: matching days are marked, a day only here goes in, a day only in the Doc comes here
  const fresh = planSync({ days, entries: [{ ...rowOf(mon.entry), now: 'x' }, { on_date: '2026-11-04', answer: 'Only here.', gratitudes: [], now: 'y' }] })
  assert.deepEqual([fresh.mark.length, fresh.add.length, fresh.pull.length, fresh.conflicts.length], [1, 1, 1, 0])
  assert.equal(fresh.pull[0].day.date, '2026-11-03')
  // Never compared, and different: shown, both ways
  const differ = planSync({ days, entries: [{ ...rowOf(mon.entry), answer: 'Something else.', now: 'x' }] })
  assert.equal(differ.conflicts.length, 1)
  // In step, then changed here only: it goes to the Doc
  const here = planSync({ days: [mon], entries: [await agreed(mon, { answer: 'Tidy the garage tomorrow.' })] })
  assert.equal(here.push.length, 1)
  // In step, then changed in the Doc only: it comes here
  const there = planSync({ days: [{ ...mon, hash: 'changed' }], entries: [await agreed(mon)] })
  assert.equal(there.pull.length, 1)
  // Changed on both sides: shown
  const both = planSync({ days: [{ ...mon, hash: 'changed' }], entries: [await agreed(mon, { answer: 'Different words.' })] })
  assert.equal(both.conflicts.length, 1)
  // Unchanged: nothing to do
  assert.equal(planSync({ days: [mon], entries: [await agreed(mon)] }).same, 1)
  // Gone from the Doc after being in step: asked, never removed on its own
  const gone = planSync({ days: [], entries: [await agreed(mon)] })
  assert.equal(gone.goneFromDoc.length, 1)
  assert.equal(gone.pull.length + gone.add.length, 0)
  // Deleted here, still in the Doc: asked
  const removed = planSync({ days: [mon], entries: [], removed: ['2026-11-02'] })
  assert.equal(removed.removedHere.length, 1)
  assert.equal(removed.pull.length, 0)
  // A day with a picture in it is never rewritten: a change here waits for the writer
  const picture = planSync({ days: [{ ...mon, plain: false }], entries: [await agreed(mon, { answer: 'New words.' })] })
  assert.equal(picture.push.length, 0)
  assert.equal(picture.conflicts[0].unsafe, true)
})

test('a day too long to keep is left alone on both sides', async () => {
  assert.ok(tooLong({ answer: 'x'.repeat(20001), gratitudes: [] }))
  assert.ok(tooLong({ gratitudes: Array(13).fill('a') }))
  assert.ok(!tooLong({ answer: 'fine', gratitudes: ['a'] }))
})

test('writing: a new day goes above the stash, a changed day is rewritten in place, and nothing else moves', () => {
  const fake = sample()
  const before = read(fake)
  const f = docFormat(before.paras, before.days)
  const writes = [
    { type: 'add', entry: { on_date: '2026-11-04', prompt_title: 'Clear the friction.', prompt: 'What am I avoiding?', answer: 'The tax folder.', reflection: '', gratitudes: ['Warm socks', 'Rain'] } },
    { type: 'add', entry: { on_date: '2026-11-05', prompt_title: null, prompt: null, answer: '', reflection: 'Just a short note.', gratitudes: ['Pie'] } },
    { type: 'add', entry: { on_date: '2026-11-01', prompt_title: null, prompt: null, answer: '', reflection: 'An older day.', gratitudes: [] } },
    { type: 'replace', day: before.days[0], entry: { ...rowOf(before.days[0].entry), answer: 'Tidy the garage, then the shed.', gratitudes: ['Hot coffee', 'A quiet bus ride', 'Dry socks'] } },
  ]
  fake.apply(buildRequests({ paras: before.paras, days: before.days, stopAt: before.stopAt, f, writes }))
  const after = read(fake)
  assert.deepEqual(after.days.map((d) => d.date), ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'])
  assert.equal(after.days[1].entry.answer, 'Tidy the garage, then the shed.')
  assert.deepEqual(after.days[1].entry.gratitudes, ['Hot coffee', 'A quiet bus ride', 'Dry socks'])
  assert.deepEqual(after.days[3].entry.gratitudes, ['Warm socks', 'Rain'])
  assert.equal(after.days[4].entry.reflection, 'Just a short note.')
  assert.equal(after.days[0].entry.reflection, 'An older day.')
  for (const w of writes) {
    const d = after.days.find((x) => x.date === w.entry.on_date)
    assert.ok(sameDay(d.entry, w.entry), `${w.entry.on_date} reads back as written`)
  }
  assert.equal(after.paras[0].text, 'Made-up journal', 'the title is untouched')
  assert.deepEqual(after.paras.slice(after.stopAt).map((p) => p.text), STASH.map((p) => p.text), 'the stash is untouched')
  assert.ok(sameDay(after.days[2].entry, before.days[1].entry), 'the day nobody changed reads the same')
  const heads = after.paras.filter((p) => /^\w+day, November \d, 2026$/.test(p.text))
  assert.ok(heads.every((p) => p.named === 'HEADING_2'), 'new date headings take the Doc’s own style')
  assert.ok(after.paras.filter((p) => p.text === 'Gratitudes').every((p) => p.named === 'HEADING_3'))
})

test('writing at the very end of a Doc with no stash, and removing a day', () => {
  const fake = new FakeDoc([...DAY('Monday, November 2, 2026', null, 'A day.', ['One']).slice(0, -1)]) // no blank line at the end
  let r = read(fake, null)
  let f = docFormat(r.paras, r.days)
  fake.apply(buildRequests({ paras: r.paras, days: r.days, stopAt: r.stopAt, f, writes: [
    { type: 'add', entry: { on_date: '2026-11-03', reflection: 'At the end.', answer: '', gratitudes: ['Two'] } },
    { type: 'replace', day: r.days[0], entry: { ...rowOf(r.days[0].entry), reflection: 'A day, rewritten.' } },
  ] }))
  r = read(fake, null)
  assert.deepEqual(r.days.map((d) => d.date), ['2026-11-02', '2026-11-03'])
  assert.equal(r.days[0].entry.reflection, 'A day, rewritten.')
  assert.deepEqual(r.days[1].entry.gratitudes, ['Two'])
  // Replacing the last day, which runs to the end of the body
  f = docFormat(r.paras, r.days)
  fake.apply(buildRequests({ paras: r.paras, days: r.days, stopAt: r.stopAt, f, writes: [{ type: 'replace', day: r.days[1], entry: { ...rowOf(r.days[1].entry), gratitudes: ['Two', 'Three'] } }] }))
  r = read(fake, null)
  assert.deepEqual(r.days[1].entry.gratitudes, ['Two', 'Three'])
  // Removing the first day leaves the other whole
  fake.apply(buildRequests({ paras: r.paras, days: r.days, stopAt: r.stopAt, f, writes: [{ type: 'delete', day: r.days[0] }] }))
  r = read(fake, null)
  assert.deepEqual(r.days.map((d) => d.date), ['2026-11-03'])
  assert.deepEqual(r.days[0].entry.gratitudes, ['Two', 'Three'])
})

test('a fresh Doc with nothing in it takes its first day', () => {
  const fake = new FakeDoc([{ text: '' }])
  let r = read(fake, null)
  const f = docFormat(r.paras, r.days)
  fake.apply(buildRequests({ paras: r.paras, days: r.days, stopAt: r.stopAt, f, writes: [{ type: 'add', entry: { on_date: '2026-11-05', reflection: 'First page.', answer: '', gratitudes: ['Everything'] } }] }))
  r = read(fake, null)
  assert.equal(r.days.length, 1)
  assert.equal(r.days[0].entry.reflection, 'First page.')
})

// ---- Signing in with Google, and the page it comes back to ----

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import { authUrl, readReturn, safeBack, SCOPE, allowedHere } from '../src/lib/google.js'

const root = new URL('..', import.meta.url).pathname
const file = (p) => readFileSync(join(root, p), 'utf8')

test('the app asks Google for one permission: the files the person picks, for an hour', () => {
  const u = new URL(authUrl({ clientId: 'id.apps.googleusercontent.com', redirectUri: 'https://hicks.web.app/google-return.html', state: 'abc' }))
  assert.equal(u.origin, 'https://accounts.google.com')
  assert.equal(u.searchParams.get('scope'), 'https://www.googleapis.com/auth/drive.file')
  assert.equal(SCOPE, 'https://www.googleapis.com/auth/drive.file')
  assert.equal(u.searchParams.get('response_type'), 'token')
  assert.equal(u.searchParams.get('redirect_uri'), 'https://hicks.web.app/google-return.html')
  assert.ok(allowedHere('hicks.web.app') && allowedHere('localhost') && !allowedHere('hicks--pr-12-abc.web.app'))
})

test('a key is kept only if it answers the sign-in this device started, with the right permission', () => {
  const ok = `#state=s1&access_token=t&expires_in=3599&scope=${encodeURIComponent(SCOPE)}`
  assert.deepEqual(readReturn(ok, { state: 's1' }, 1000), { token: 't', expires: 1000 + 3599000 })
  assert.equal(readReturn(ok, { state: 'other' }), null, 'a different sign-in')
  assert.equal(readReturn(ok, null), null, 'none started here')
  assert.equal(readReturn('#state=s1&access_token=t&scope=email', { state: 's1' }), null, 'without drive.file')
  assert.equal(readReturn(`#state=s1&access_token=t&expires_in=999999&scope=${encodeURIComponent(SCOPE)}`, { state: 's1' }, 0).expires, 3600000, 'never more than an hour')
  assert.equal(safeBack('/journal/doc'), '/journal/doc')
  assert.equal(safeBack('//evil.example'), '/journal')
  assert.equal(safeBack('https://evil.example'), '/journal')
})

/** Run the return page's own script with a pretend browser. */
function returnPage(hash, pending) {
  const html = file('public/google-return.html')
  const script = html.match(/<script>([^]*?)<\/script>/)[1]
  const store = new Map(pending ? [['teamhicks.google.pending', JSON.stringify(pending)]] : [])
  const location = { hash, replaced: null, replace(p) { this.replaced = p } }
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
  vm.runInNewContext(script, { location, localStorage, URLSearchParams, JSON, Date, parseInt, Math })
  return { store, went: location.replaced }
}

test('the return page keeps a matching key, refuses anything else, and only ever goes back into the app', () => {
  const ok = `#state=s1&access_token=tok&expires_in=3599&scope=${encodeURIComponent(SCOPE)}`
  const a = returnPage(ok, { state: 's1', back: '/journal/doc' })
  assert.equal(JSON.parse(a.store.get('teamhicks.google')).token, 'tok')
  assert.equal(a.went, '/journal/doc')
  assert.ok(!a.store.has('teamhicks.google.pending'), 'the sign-in is used up')
  const b = returnPage(ok, { state: 'other', back: '/journal' })
  assert.ok(!b.store.has('teamhicks.google'), 'a forged answer keeps nothing')
  assert.equal(b.store.get('teamhicks.google.error'), 'no_match')
  const c = returnPage(ok.replace(encodeURIComponent(SCOPE), 'email'), { state: 's1', back: '/journal' })
  assert.ok(!c.store.has('teamhicks.google'))
  assert.equal(returnPage(ok, { state: 's1', back: '//evil.example' }).went, '/journal')
  assert.equal(returnPage('#error=access_denied', null).store.get('teamhicks.google.error'), 'access_denied')
})

test('the return page shows nothing and reads no database', () => {
  const html = file('public/google-return.html')
  const body = html.split('<body>')[1].replace(/<!--[^]*?-->/g, '').replace(/<script>[^]*?<\/script>/g, '').replace(/<\/?(body|html)>/g, '').trim()
  assert.equal(body, '', 'no words on the page')
  assert.doesNotMatch(html, /supabase|journal_|fetch\(/i)
})

test('no server reads a journal or its Doc: no Edge Function names the journal tables or Google Docs', () => {
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
  for (const f of walk(join(root, 'supabase/functions'))) {
    const t = readFileSync(f, 'utf8')
    assert.doesNotMatch(t, /journal_|docs\.googleapis|drive\.file/, `${f} must not reach a journal`)
  }
  for (const f of ['src/lib/docSync.js', 'src/lib/google.js', 'src/places/journal/DocSync.jsx']) assert.doesNotMatch(file(f), /functions\.invoke|\/functions\/v1/, `${f} talks to Google from the browser only`)
})

// ---- A Doc shaped like one that begins tomorrow's page ahead, with a week of questions kept below ----
// (Made-up words in that shape: plain date lines, straight quotes, two blank lines between days, tomorrow's
// date with an empty Gratitudes list already waiting, a long gap, then each weekday's question under its name.)

import { aheadDue, beginsAhead, hasWords } from '../src/lib/journalDoc.js'

const PLAIN_DAY = (date, q, answer, grats) => [
  { text: date }, ...(q ? [{ text: q }] : []), ...(answer ? [{ text: answer }] : []),
  { text: 'Gratitudes' }, ...grats.map((g) => ({ text: g, bullet: true })), { text: '' }, { text: '' },
]
const AHEAD = (date) => [{ text: date }, { text: 'Gratitudes' }, { text: '', bullet: true }]
const WEEK = [{ text: 'Monday' }, { text: 'Aim small. "What is one thing to finish?"' }, { text: '' }, { text: 'Tuesday' }, { text: 'Say hello. "Who should I check on?"' }]
const ahead = () => new FakeDoc([
  ...PLAIN_DAY('Monday, November 2, 2026', 'Aim small. "What is one thing to finish?"', 'The shelf in the hall.', ['Toast', 'A dry morning']),
  ...PLAIN_DAY('Tuesday, November 3, 2026', null, null, ['A good book']),
  ...AHEAD('Wednesday, November 4, 2026'),
  { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' }, { text: '' },
  ...WEEK,
])

test('the week of questions below is found by its first weekday, and tomorrow’s page begun ahead is not a day to bring in', async () => {
  const paras = docParagraphs(ahead().json())
  assert.equal(guessStop(paras), 'Monday')
  const { days } = docDays(paras, 'Monday')
  assert.deepEqual(days.map((d) => d.date), ['2026-11-02', '2026-11-03', '2026-11-04'])
  assert.equal(hasWords(days[2].entry), false, 'a date, Gratitudes and an empty line have no words')
  assert.ok(beginsAhead(days))
  const f = docFormat(paras, days)
  assert.equal(f.open, '"', 'straight quotes, as the Doc writes them')
  assert.equal(f.gap, 2)
  assert.equal(f.styles.date.named, 'NORMAL_TEXT')
  for (const d of days) d.hash = await docHash(d)
  const nothing = planSync({ days, entries: [] })
  assert.equal(nothing.pull.length, 2, 'only the days with words come in')
  // Written here on the day it was begun: the words fill the Doc's day, no question asked
  const filled = planSync({ days, entries: [{ on_date: '2026-11-04', answer: '', reflection: 'Rain at last.', gratitudes: ['Rain'], now: 'x' }] })
  assert.equal(filled.push.length, 1)
  assert.equal(filled.conflicts.length, 0)
})

test('writing a day begun ahead fills it, begins the next, and the gap above the questions stays where it was', () => {
  const fake = ahead()
  let paras = docParagraphs(fake.json())
  let r = { paras, ...docDays(paras, 'Monday') }
  const f = docFormat(r.paras, r.days)
  const today = '2026-11-04'
  const entry = { on_date: today, prompt_title: null, prompt: null, answer: '', reflection: 'Rain at last.', gratitudes: ['Rain', 'Soup'] }
  const next = aheadDue({ days: r.days, entries: [entry], today })
  assert.equal(next, '2026-11-05')
  fake.apply(buildRequests({ paras: r.paras, days: r.days, stopAt: r.stopAt, f, writes: [
    { type: 'replace', day: r.days[2], entry },
    { type: 'add', entry: { on_date: next, skeleton: true } },
  ] }))
  paras = docParagraphs(fake.json())
  r = { paras, ...docDays(paras, 'Monday') }
  assert.deepEqual(r.days.map((d) => d.date), ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'])
  assert.deepEqual(r.days[2].entry.gratitudes, ['Rain', 'Soup'])
  assert.equal(r.days[2].entry.reflection, 'Rain at last.')
  assert.equal(hasWords(r.days[3].entry), false, 'tomorrow is begun, empty, ready')
  assert.equal(r.days[3].text.split('\n')[1], 'Gratitudes')
  assert.equal(r.days[2].blanks, 2, 'two blank lines between today and tomorrow, as between the other days')
  assert.equal(r.days[3].blanks, 6, 'the long gap still sits above the questions')
  assert.deepEqual(r.paras.slice(r.stopAt).map((p) => p.text), WEEK.map((p) => p.text), 'the questions are untouched')
  assert.equal(aheadDue({ days: r.days, entries: [entry], today }), null, 'begun once, not again')
})

test('beginning ahead never piles up: only once today has words, and never past a day already begun', () => {
  const days = [{ date: '2026-11-03', entry: { date: '2026-11-03', answer: 'x', reflection: '', gratitudes: [] } }]
  assert.equal(aheadDue({ days, entries: [], today: '2026-11-04' }), null, 'nothing written today yet')
  assert.equal(aheadDue({ days, entries: [{ on_date: '2026-11-04' }], today: '2026-11-04' }), '2026-11-05')
  assert.equal(aheadDue({ days: [...days, { date: '2026-11-05', entry: { gratitudes: [''] } }], entries: [{ on_date: '2026-11-04' }], today: '2026-11-04' }), null)
})

test('a day removed takes the blank lines above it, so the gap above the questions stays', () => {
  const fake = ahead()
  let paras = docParagraphs(fake.json())
  let r = { paras, ...docDays(paras, 'Monday') }
  const f = docFormat(r.paras, r.days)
  fake.apply(buildRequests({ paras: r.paras, days: r.days, stopAt: r.stopAt, f, writes: [{ type: 'delete', day: r.days[1] }, { type: 'delete', day: r.days[2] }] }))
  paras = docParagraphs(fake.json())
  r = { paras, ...docDays(paras, 'Monday') }
  assert.deepEqual(r.days.map((d) => d.date), ['2026-11-02'])
  assert.deepEqual(r.days[0].entry.gratitudes, ['Toast', 'A dry morning'])
  assert.equal(r.days[0].blanks, 6, 'the gap before the questions is as it was')
  assert.deepEqual(r.paras.slice(r.stopAt).map((p) => p.text), WEEK.map((p) => p.text))
})
