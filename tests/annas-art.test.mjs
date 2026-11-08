// Anna's Art catches up with Laurie's gallery: the same finding, sorting, featured walls, shapes, colours and second
// looks, worded for her. Every piece here is made up: no drawing of hers is ever in a test.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { artOf, drawingProposals } from '../src/lib/annasArt.js'
import { applyDrawingReading, DRAWING_SYNCED } from '../src/lib/drawingBatch.js'
import { cleanDrawing } from '../src/lib/drawings.js'
import { facetsOf, applyFilters, sortPaintings, sortsFor, localFeatures, appFeature, catalogOf, kindOf, mediumWord } from '../src/lib/gallery.js'
import { FAMILY_ORDER } from '../src/lib/artColour.js'
import { wholeCrop } from '../src/lib/paintingBatch.js'
import { TASKS, DRAWING_SCHEMA, LOOK_DRAWING_SCHEMA, drawingAsk, lookDrawingAsk, featureAsk, catalogLine } from '../supabase/functions/_shared/claude.js'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(root + p, 'utf8')
const pal = (k) => ({ fam: { ...Object.fromEntries(FAMILY_ORDER.map((f) => [f, 0])), [k]: 0.8 }, light: 0.6, vivid: 0.6, hue: { red: 0, blue: 220, green: 120, orange: 30 }[k], swatches: ['#aa3322'] })
const row = (id, o = {}) => ({ id, title: `Made-up piece ${id}`, made_on: null, words: 'never sent', topic: null, created_at: `2026-11-0${id.length % 9 + 1}T10:00:00Z`, width: 100, height: 80, ...o })

test('a row of hers becomes a gallery piece: its day gives its year and month, its words stay behind', () => {
  const a = artOf(row('u1', { made_on: '2025-03-14', medium: 'crayon on paper', topic: 'pets', shape: { kind: 'round' }, palette: pal('red'), looks: { subjects: ['cat'], moods: ['joyful'] }, print: 'a8'.repeat(44) }), 'https://x/thumb')
  assert.equal(a.slug, 'u1'); assert.equal(a.year, 2025); assert.equal(a.month, 3)
  assert.equal(a.kind, 'drawing'); assert.deepEqual(a.topics, ['pets']); assert.deepEqual(a.shape, { kind: 'round' })
  assert.equal(a.small, 'https://x/thumb'); assert.equal(a.print, 'a8'.repeat(44)); assert.equal(a.added, '2026-11-03')
  assert.ok(!('words' in a), 'her own words never become part of what the wall works with')
  const b = artOf(row('u2'))
  assert.equal(b.year, null); assert.equal(b.kind, ''); assert.equal(b.shape, null); assert.equal(b.print, null)
})

test('drawn or painted, by what it’s made with', () => {
  for (const [m, k] of [['Crayon on paper', 'drawing'], ['Marker on paper', 'drawing'], ['Colored pencil on paper', 'drawing'], ['Watercolor on paper', 'painting'], ['Acrylic on canvas', 'painting'], ['Tempera paint', 'painting'], ['', ''], ['Glitter glue', '']]) assert.equal(kindOf(m), k, m)
  assert.equal(mediumWord('Colored pencil on paper'), 'Colored pencil')
  assert.equal(mediumWord('felt-tip markers'), 'Marker')
})

const ART = [
  artOf(row('a', { made_on: '2025-03-01', medium: 'Crayon on paper', topic: 'pets', palette: pal('orange'), looks: { subjects: ['cat'], moods: ['joyful'] } })),
  artOf(row('bb', { made_on: '2025-06-01', medium: 'Watercolor on paper', palette: pal('blue'), looks: { subjects: ['rainbow'], moods: ['joyful'] } })),
  artOf(row('ccc', { made_on: '2024-12-24', medium: 'Marker on paper', topic: 'pets', palette: pal('red'), looks: { subjects: ['cat'], moods: ['whimsical'] } })),
  artOf(row('dddd', { medium: 'Acrylic on canvas', palette: pal('green'), shape: { kind: 'round' } })),
  artOf(row('eeeee', { made_on: '2025-03-20', medium: 'Crayon on paper', topic: 'pets', palette: pal('orange'), looks: { subjects: ['cat'], moods: ['joyful'] } })),
]

test('her wall can be narrowed by drawn or painted, what it’s about, colour, mood, what it shows, year and shape', () => {
  const f = facetsOf(ART)
  assert.deepEqual(f.kind.map((x) => [x.key, x.n]).sort(), [['drawing', 3], ['painting', 2]])
  assert.deepEqual(f.topic.map((x) => [x.key, x.label, x.n]), [['pets', 'Our pets', 3]])
  assert.ok(!f.season, 'her pieces have no seasons, so there is no season filter')
  assert.deepEqual(f.year.map((x) => x.key), ['2025', '2024'])
  assert.deepEqual(applyFilters(ART, { kind: 'painting' }).map((p) => p.slug), ['bb', 'dddd'])
  assert.deepEqual(applyFilters(ART, { topic: 'pets', mood: 'joyful' }).map((p) => p.slug), ['a', 'eeeee'])
  assert.deepEqual(applyFilters(ART, { q: 'our pets 2024' }).map((p) => p.slug), ['ccc'], 'what it’s about can be typed')
  assert.deepEqual(sortPaintings(ART, 'painted').map((p) => p.slug), ['bb', 'eeeee', 'a', 'ccc', 'dddd'], 'newest made first, by month; no day last')
  assert.equal(sortsFor('made').painted, 'Newest made'); assert.equal(sortsFor().painted, 'Newest painted')
})

test('the app’s own walls for her are worded for her', () => {
  const all = localFeatures(ART, '2026-11-08', { who: 'Anna', verb: 'made' })
  const cats = all.find((x) => x.key === 'subject:cat')
  assert.equal(cats, undefined, 'three cats are too few for a wall of their own (four at least)')
  const more = [...ART, artOf(row('ffffff', { made_on: '2025-03-02', medium: 'Crayon on paper', topic: 'pets', palette: pal('orange'), looks: { subjects: ['cat'], moods: ['joyful'] } }))]
  const walls = localFeatures(more, '2026-11-08', { who: 'Anna', verb: 'made' })
  assert.equal(walls.find((x) => x.key === 'subject:cat').title, 'Cats, by Anna')
  assert.equal(walls.find((x) => x.key === 'year:2025').title, 'All made in 2025')
  assert.equal(walls.find((x) => x.key === 'topic:pets').title, 'Our pets, by Anna')
  assert.ok(walls.every((x) => !/Laurie|painted in/.test(x.title)))
  const w = appFeature(more, '2026-11-08', { who: 'Anna', verb: 'made' })
  assert.ok(w && w.slugs.length >= 4)
  assert.equal(localFeatures(ART, '2026-11-08').find((x) => x.key === 'topic:pets'), undefined)
})

test('a drawing’s reading fills in what it’s made with, its shape and Claude’s words, only where nobody set their own', () => {
  const it = { id: 'x', title: '', topic: '', madeOn: '', medium: '', touched: {}, crop: wholeCrop(100, 80), W: 100, H: 80 }
  const r = { title: 'Three cats', topic: 'pets', written_date: '', turn: 0, medium: 'crayon on paper', shape: 'round', subjects: ['Cat'], moods: ['joyful'], style: 'none', weather: 'none' }
  const n = applyDrawingReading(it, r, '2026-11-08')
  assert.equal(n.medium, 'Crayon on paper'); assert.equal(n.mediumFrom, 'claude')
  assert.deepEqual(n.shape, { kind: 'round' }); assert.deepEqual(n.looks, { subjects: ['cat'], moods: ['joyful'], style: '', weather: '' })
  const mine = applyDrawingReading({ ...it, medium: 'Paint', touched: { medium: true, shape: true, looks: true } }, r, '2026-11-08')
  assert.equal(mine.medium, 'Paint'); assert.equal(mine.shape, undefined); assert.equal(mine.looks, undefined)
  for (const k of ['medium', 'shape', 'looks', 'replace', 'print']) assert.ok(DRAWING_SYNCED.includes(k), `${k} travels with a waiting photo`)
  assert.equal(cleanDrawing({ title: 'A', medium: ' marker  on paper. ' }).medium, 'Marker on paper')
  assert.equal('medium' in cleanDrawing({ title: 'A' }), false, 'a form without the box leaves it alone')
  assert.equal(cleanDrawing({ title: 'A', medium: '' }).medium, null)
})

test('looking her art over again suggests only what isn’t kept, and never her title or words', () => {
  const r = { written_date: '2025-02-30', medium: 'marker on paper', shape: 'hexagon', subjects: ['house'], moods: ['calm'], style: 'none', weather: 'sunny' }
  const s = drawingProposals({ made_on: null, medium: '', shape: null }, r, '2026-11-08')
  assert.deepEqual(s.medium, { value: 'Marker on paper', sure: true })
  assert.deepEqual(s.shape, { value: { kind: 'hexagon' }, sure: true })
  assert.equal(s.madeOn, undefined, 'a day that isn’t a real day is never suggested')
  assert.deepEqual(drawingProposals({}, { ...r, written_date: '2025-02-14' }, '2026-11-08').madeOn, { value: '2025-02-14', sure: false })
  assert.equal(drawingProposals({}, { ...r, written_date: '2027-01-01' }, '2026-11-08').madeOn, undefined, 'nor one in the future')
  const kept = drawingProposals({ made_on: '2024-01-01', medium: 'Crayon', shape: { kind: 'round' } }, r, '2026-11-08')
  assert.equal(kept.medium, undefined); assert.equal(kept.shape, undefined); assert.equal(kept.madeOn, undefined)
  assert.ok(kept.looks); assert.deepEqual(drawingProposals({}, null), {})
})

test('Claude reads her art for its medium, shape and words, never a name, and chooses her walls from facts', () => {
  assert.ok(['medium', 'shape', 'subjects', 'moods', 'style', 'weather'].every((k) => k in DRAWING_SCHEMA.properties))
  assert.ok(!('title' in LOOK_DRAWING_SCHEMA.properties) && !('topic' in LOOK_DRAWING_SCHEMA.properties), 'a second look never retitles her art')
  assert.match(drawingAsk({ today: '2026-11-08' }), /Never a person's or a pet's name, even one written on it/)
  assert.match(lookDrawingAsk({ today: '2026-11-08' }), /^2\. In medium/m)
  assert.equal(TASKS['look-drawing'].who, 'parent'); assert.equal(TASKS['look-drawing'].upload, true)
  const t = TASKS['feature-drawings']
  assert.equal(t.who, 'family'); assert.ok(!t.upload && !t.uploads, 'no picture goes with it'); assert.match(t.says, /never the pictures or her own words/)
  const cat = catalogOf(ART)
  assert.ok(cat.every((p) => !('words' in p)))
  assert.match(catalogLine(cat[0]), /^a \| Made-up piece a \| 3\/2025 \| Crayon on paper \| drawing \| about: pets/)
  const ask = featureAsk({ catalog: cat, context: { today: '2026-11-08' }, collection: 'drawings' })
  assert.match(ask, /Anna's Art/); assert.match(ask, /Never judge or rank her work/); assert.match(ask, /Her pieces, one a line/)
  assert.doesNotMatch(ask, /Laurie/)
  assert.match(featureAsk({ catalog: cat, context: {} }), /Laurie's gallery/, 'Laurie’s wall is asked as before')
})

test('the screens for her art say what goes to Claude, and the migration adds her columns and whose wall is whose', () => {
  assert.match(read('src/places/AddDrawings.jsx'), /what it’s made with, the shape of its paper/)
  assert.match(read('src/places/LookOverArt.jsx'), /The picture goes to Claude \(Anthropic\)/)
  assert.match(read('src/parts/ArtFinder.jsx'), /never the pictures, and never her own words/)
  const f = readdirSync(root + 'supabase/migrations').find((x) => x.includes('annas_art_gallery'))
  const sql = read('supabase/migrations/' + f).replace(/--.*$/gm, '')
  for (const c of ['medium', 'shape', 'palette', 'looks']) assert.match(sql, new RegExp(`alter table public\\.annas_drawings add column if not exists ${c}\\b`))
  assert.match(sql, /gallery_features add column if not exists collection text not null default 'paintings' check \(collection in \('paintings', 'drawings'\)\)/)
  assert.doesNotMatch(sql, /create policy|grant/i, 'who reads and changes them is as before')
})
