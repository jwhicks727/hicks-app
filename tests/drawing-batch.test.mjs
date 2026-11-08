import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyDrawingReading, drawingInboxData, DRAWING_SYNCED, DRAWING_KEPT, DRAWING_SAVED } from '../src/lib/drawingBatch.js'
import { mergeInbox, tally } from '../src/lib/paintingBatch.js'
import { drawingFiles, TOPICS } from '../src/lib/drawings.js'
import { TASKS, DRAWING_SCHEMA, drawingAsk } from '../supabase/functions/_shared/claude.js'

// Every picture here is made up: none of Anna's drawings is ever in a test.
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const crop = { turn: 0, angle: 0, cx: 500, cy: 400, w: 800, h: 600 }
const item = (more = {}) => ({ id: 'a', title: '', titleFrom: null, madeOn: '', topic: '', words: '', touched: {}, W: 1000, H: 800, crop, ...more })

test('Claude’s look at a drawing fills in a working title, the topic and a day written on it, and says it did', () => {
  const r = applyDrawingReading(item(), { title: '“Three cats on the couch.”', topic: 'pets', written_date: '2026-11-03', turn: 0 }, '2026-11-08')
  assert.equal(r.read, 'done'); assert.equal(r.title, 'Three cats on the couch'); assert.equal(r.titleFrom, 'claude')
  assert.equal(r.topic, 'pets'); assert.equal(r.topicFrom, 'claude')
  assert.equal(r.madeOn, '2026-11-03'); assert.equal(r.madeOnFrom, 'claude'); assert.equal(r.reading.written, '2026-11-03')
})

test('her words are never filled in, whatever Claude sends', () => {
  const r = applyDrawingReading(item({ words: '' }), { title: 'x', topic: 'pets', written_date: '', turn: 0, words: 'I love my cats', quote: 'hi' }, '2026-11-08')
  assert.equal(r.words, '')
  const typed = applyDrawingReading(item({ words: 'What she said' }), { title: 'x', topic: 'none', written_date: '', turn: 0, words: 'other' }, '2026-11-08')
  assert.equal(typed.words, 'What she said')
  assert.ok(!('words' in (drawingAsk({ today: '2026-11-08' }).match(/In words/) || {})), 'sanity')
  assert.doesNotMatch(drawingAsk({ today: '2026-11-08' }), /\bwords\b.*(give|write|copy)/i, 'the ask never asks for her words')
})

test('a day that isn’t a real one, or is after today, or a topic that isn’t ours, is left blank', () => {
  const r = applyDrawingReading(item(), { title: 'x', topic: 'whales', written_date: '2027-01-01', turn: 0 }, '2026-11-08')
  assert.equal(r.madeOn, ''); assert.equal(r.madeOnFrom, null); assert.equal(r.topic, ''); assert.equal(r.topicFrom, null)
  assert.equal(applyDrawingReading(item(), { title: 'x', topic: 'none', written_date: '2026-02-30', turn: 0 }, '2026-11-08').madeOn, '')
  assert.deepEqual(Object.keys(TOPICS), ['pets'])
})

test('what a person typed or changed stays theirs, and a sideways drawing is turned upright unless its crop was touched', () => {
  const mine = applyDrawingReading(item({ title: 'Kona', madeOn: '2026-10-01', topic: '', touched: { title: true, madeOn: true, topic: true, crop: true } }), { title: 'Other', topic: 'pets', written_date: '2026-11-03', turn: 90 }, '2026-11-08')
  assert.deepEqual([mine.title, mine.madeOn, mine.topic, mine.crop.turn], ['Kona', '2026-10-01', '', 0])
  const turned = applyDrawingReading(item(), { title: 'x', topic: 'none', written_date: '', turn: 90 }, '2026-11-08')
  assert.equal(turned.crop.turn, 90)
  assert.equal(applyDrawingReading(item(), { title: '   ', topic: 'none', written_date: '', turn: 0 }, '2026-11-08').title, '', 'no title from nothing')
  assert.equal(applyDrawingReading(item(), { title: 'x'.repeat(300), topic: 'none', written_date: '', turn: 0 }, '2026-11-08').title.length, 120, 'a title is at most the table’s 120')
})

test('a row keeps who sent the photo, and only what travels; two devices merge like the paintings’ do', () => {
  const data = drawingInboxData({ id: 'a', seq: 1, addedBy: 'anna', status: 'ready', local: true, sending: true, editing: true, title: 'T', words: 'w', touched: {} })
  assert.deepEqual(Object.keys(data), ['id', 'seq', 'status', 'title', 'words', 'touched', 'addedBy'])
  assert.ok(DRAWING_SYNCED.includes('addedBy') && DRAWING_SYNCED.includes('crop') && !DRAWING_SYNCED.includes('local'))
  const merged = mergeInbox([{ id: 'a', seq: 1, title: 'here' }, { id: 'n', seq: 9, local: true }], [{ id: 'a', seq: 1, title: 'there', addedBy: 'anna' }], new Set())
  assert.deepEqual(merged.map((x) => [x.id, x.title]), [['a', 'there'], ['n', undefined]])
  assert.equal(tally([{ status: 'ready' }, { status: 'added' }]).added, 1)
})

test('a drawing is kept and saved small enough for its bucket, with its own names, original and recrop names', () => {
  assert.ok(DRAWING_KEPT.kept <= 3000 && DRAWING_SAVED.full === 2000 && DRAWING_SAVED.small === 640)
  assert.deepEqual(drawingFiles('id1'), { path: 'id1.jpg', thumb: 'id1.thumb.jpg', original: 'id1.original.jpg' })
  assert.notEqual(drawingFiles('id1', 'k2').path, drawingFiles('id1').path, 'a crop made again never reuses a name')
  assert.equal(drawingFiles('id1', 'k2').original, drawingFiles('id1').original)
})

test('Claude may be asked about a drawing by anyone in the family, with one closed answer, and the ask is careful with names', () => {
  assert.equal(TASKS['read-drawing'].who, 'family'); assert.equal(TASKS['read-drawing'].upload, true)
  assert.match(TASKS['read-drawing'].says, /drawing/)
  const s = DRAWING_SCHEMA
  assert.equal(s.additionalProperties, false); assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort())
  assert.deepEqual(s.properties.topic.enum, ['pets', 'none']); assert.ok(!('words' in s.properties), 'no words in the answer')
  const ask = drawingAsk({ titles: ['Three  cats', '', 'x'.repeat(200)], today: '2026-11-08' })
  assert.match(ask, /never estimate a date/); assert.match(ask, /do not take the names of people or pets from any writing/)
  assert.match(ask, /today is 2026-11-08/); assert.match(ask, /so far: Three cats; x{80}\./)
  assert.doesNotMatch(drawingAsk({ today: '2026-11-08' }), /so far/)
  const fn = src('supabase/functions/claude/index.ts')
  assert.match(fn, /body\.task === 'read-drawing'/); assert.match(fn, /uploadBlock\(body\.file\)/)
})

test('the migration: a table whoever sent a photo and the parents can use, a parent may add a drawing for Anna, nothing for anyone else', () => {
  const m = src('supabase/migrations/20261108150000_drawing_inbox.sql').replace(/--.*$/gm, '')
  assert.match(m, /alter table public\.annas_drawings add column if not exists original boolean not null default false/)
  assert.match(m, /alter table public\.annas_drawings add column if not exists crop jsonb/)
  assert.match(m, /create table public\.drawing_inbox/); assert.match(m, /added_by uuid not null references public\.family_members/)
  const pol = [...m.matchAll(/create policy drawing_inbox_\w+ on public\.drawing_inbox[^;]+;/gi)].map((x) => x[0])
  assert.equal(pol.length, 4)
  for (const p of pol) assert.match(p, /added_by = \(select public\.my_member_id\(\)\)/)
  const read = pol.find((p) => /for select/.test(p)); assert.match(read, /or \(select public\.is_parent\(\)\)/); assert.doesNotMatch(read, /is_family/, 'not the whole family')
  const add = pol.find((p) => /for insert/.test(p)); assert.match(add, /is_family\(\)\) and added_by = \(select public\.my_member_id\(\)\)/, 'a person adds only under their own name')
  assert.match(m, /create policy drawings_add_for_a_parent on public\.annas_drawings for insert to authenticated with check \(\(select public\.is_parent\(\)\)\)/)
  assert.doesNotMatch(m, /to anon|using \(true\)|with check \(true\)/i)
})

test('the screens: anyone in the family adds, the batch waits in storage that can only add files, and the recrop touches only its own drawing', () => {
  const inbox = src('src/lib/drawingInbox.js')
  assert.match(inbox, /table: 'drawing_inbox'/); assert.match(inbox, /bucket: 'drawings'/); assert.match(inbox, /upsert: false/); assert.match(inbox, /added_by/)
  const store = src('src/lib/inboxStore.js')
  assert.match(store, /already exists\|duplicate/, 'a file already there counts as sent')
  const hook = src('src/places/useDrawingBatch.js')
  assert.match(hook, /askClaude\('read-drawing'/); assert.match(hook, /corners: false/, 'one picture of the whole drawing')
  assert.match(hook, /READ_AT_ONCE = 3/); assert.match(hook, /const from = Math\.max\(0, items\.findIndex/)
  assert.doesNotMatch(hook, /words:\s*reading|reading\.words/, 'her words never come from Claude')
  const slow = hook.slice(hook.indexOf('// 1. A new photo'), hook.indexOf('// 2. Claude looks'))
  assert.doesNotMatch(slow.slice(slow.indexOf('oneAtATime(async'), slow.indexOf('}).then(')), /putInboxFile|supabase/, 'sending is outside the canvas queue')
  const screen = src('src/places/AddDrawings.jsx')
  assert.match(screen, /goes to Claude \(Anthropic\)/); assert.match(screen, /Her own words are never guessed/)
  assert.doesNotMatch(screen, /parent &&|!parent/, 'not parents only')
  const wall = src('src/places/Drawings.jsx')
  assert.match(wall, /id === 'add'/); assert.match(wall, /to="\/drawings\/add"/)
  assert.doesNotMatch(src('src/lib/useDrawings.js'), /export async function addDrawing/, 'the one-at-a-time add is the batch now')
  assert.match(src('src/lib/useDrawings.js'), /drawingFiles\(d\.id\)\.original/, 'taking one down takes its original too')
  const re = src('src/places/RecropDrawing.jsx')
  assert.match(re, /\.eq\('id', d\.id\)/); assert.doesNotMatch(re, /\.delete\(|\.upsert\(/)
  assert.match(re, /upsert: false/, 'new names, so no one needs the right to write over a file')
})
