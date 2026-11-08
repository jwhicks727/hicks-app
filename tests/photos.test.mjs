import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { takenOn, photosFor, tagsByPhoto, suggestedIn, suggestionRows, handTag, photosAt, seenPlants, reelWords, photoPaths, MAX_PER_BATCH } from '../src/lib/photos.js'
import { TASKS, PHOTO_TAGS_SCHEMA, photoTagsAsk, cleanPhotoTags } from '../supabase/functions/_shared/claude.js'

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('a photo’s day is its file’s own date inside the stay, else the stay’s last day', () => {
  const at = (y, m, d, h = 14) => new Date(y, m - 1, d, h).getTime()
  assert.equal(takenOn(at(2026, 11, 7), '2026-11-07', '2026-11-09'), '2026-11-07')
  assert.equal(takenOn(at(2026, 11, 8), '2026-11-07', '2026-11-09'), '2026-11-08')
  assert.equal(takenOn(at(2026, 10, 1), '2026-11-07', '2026-11-09'), '2026-11-09', 'an old photo added later lands on the trip’s last day')
  assert.equal(takenOn(undefined, '2026-11-07', '2026-11-09'), '2026-11-09')
  assert.equal(takenOn(NaN, '2026-11-07', '2026-11-09'), '2026-11-09')
  assert.deepEqual(photoPaths('abc'), { path: 'photos/abc.jpg', thumb_path: 'photos/abc.thumb.jpg' })
  assert.ok(MAX_PER_BATCH >= 12 && MAX_PER_BATCH <= 40)
})

const photos = [
  { id: 'p1', town: 'Temecula', taken_on: '2026-11-07', created_at: '2026-11-07T20:00:00Z' },
  { id: 'p2', town: 'temecula', taken_on: '2026-11-07', created_at: '2026-11-07T22:00:00Z' },
  { id: 'p3', town: 'Temecula', taken_on: '2026-11-20', created_at: '2026-11-20T10:00:00Z' },
  { id: 'p4', town: 'Big Bear Lake', taken_on: '2026-11-07', created_at: '2026-11-07T10:00:00Z' },
]
const tag = (id, photo_id, kind, name, extra = {}) => ({ id, photo_id, kind, name, status: 'confirmed', ref_kind: null, ref_id: null, ...extra })

test('a stay’s reel is its town’s photos between its days, newest first', () => {
  assert.deepEqual(photosFor(photos, { town: 'Temecula', from: '2026-11-07', last: '2026-11-08' }).map((p) => p.id), ['p2', 'p1'])
  assert.deepEqual(photosFor(photos, { town: 'Big Bear Lake', from: '2026-11-07', last: '2026-11-07' }).map((p) => p.id), ['p4'])
  assert.deepEqual(photosFor(photos, { town: 'Sedona', from: '2026-11-07', last: '2026-11-08' }), [])
  assert.deepEqual(photosFor(null, { town: 'x', from: 'a', last: 'b' }), [])
})

test('Claude’s tags come back as suggestions, linked to a recipe or a place only when it matched exactly', () => {
  const answer = { caption: 'A plate of fish tacos', subjects: [
    { kind: 'dish', name: 'Fish tacos', scientific: '', confidence: 'high', match: 'Baja fish tacos' },
    { kind: 'plant', name: 'California poppy', scientific: 'Eschscholzia californica', confidence: 'medium', match: '' },
    { kind: 'place', name: 'Wilson Creek', scientific: '', confidence: 'high', match: 'Wilson Creek Winery' },
    { kind: 'dish', name: 'Mystery stew', scientific: '', confidence: 'low', match: '' },
  ] }
  const rows = suggestionRows('p1', answer, { recipes: [{ id: 'r1', title: 'Baja fish tacos' }], places: [{ id: 'bp1', name: 'Wilson Creek Winery' }] })
  assert.equal(rows.length, 4)
  assert.ok(rows.every((r) => r.status === 'suggested' && r.by_ai === true && r.photo_id === 'p1'))
  assert.deepEqual([rows[0].ref_kind, rows[0].ref_id], ['recipe', 'r1'])
  assert.deepEqual([rows[2].ref_kind, rows[2].ref_id], ['been_place', 'bp1'])
  assert.deepEqual([rows[1].ref_kind, rows[3].ref_kind], [null, null])
  assert.equal(rows[1].sci, 'Eschscholzia californica')
  assert.deepEqual(suggestionRows('p1', null), [])
  // a tag typed by hand counts at once; nonsense is refused
  assert.deepEqual(handTag('p1', { kind: 'bird', name: ' Acorn  Woodpecker ' }), { photo_id: 'p1', kind: 'bird', name: 'Acorn Woodpecker', sci: null, confidence: null, status: 'confirmed', ref_kind: null, ref_id: null, by_ai: false })
  assert.equal(handTag('p1', { kind: 'person', name: 'x' }), null)
  assert.equal(handTag('p1', { kind: 'plant', name: '  ' }), null)
})

test('a photo turns up where its confirmed tags say, and not before they are confirmed', () => {
  const tags = [
    tag('t1', 'p1', 'dish', 'Fish tacos', { ref_kind: 'recipe', ref_id: 'r1' }),
    tag('t2', 'p2', 'dish', 'Fish tacos', { ref_kind: 'recipe', ref_id: 'r1', status: 'suggested' }),
    tag('t3', 'p1', 'bird', 'Acorn Woodpecker'),
    tag('t4', 'p4', 'bird', 'Steller’s Jay', { status: 'suggested' }),
    tag('t5', 'p3', 'place', 'Wilson Creek', { ref_kind: 'been_place', ref_id: 'bp1' }),
  ]
  assert.deepEqual(photosAt(photos, tags, { refKind: 'recipe', refId: 'r1' }).map((p) => p.id), ['p1'], 'a suggestion doesn’t count yet')
  assert.deepEqual(photosAt(photos, tags, { refKind: 'been_place', refId: 'bp1' }).map((p) => p.id), ['p3'])
  assert.deepEqual(photosAt(photos, tags, { kind: 'bird', names: ['acorn woodpecker', 'Melanerpes formicivorus'] }).map((p) => p.id), ['p1'])
  assert.deepEqual(photosAt(photos, tags, { kind: 'bird', names: ['Steller’s Jay'] }), [])
  assert.deepEqual(photosAt(photos, [], { refKind: 'recipe', refId: 'r1' }), [])
  const m = tagsByPhoto(tags)
  assert.equal(suggestedIn(m.get('p2')).length, 1)
  assert.equal(reelWords([photos[0], photos[1]], m), '2 photos · 1 tag to check')
  assert.equal(reelWords([], m), '')
})

test('the Garden’s plants we’ve seen: confirmed plants by name, the most photographed first', () => {
  const tags = [
    tag('a', 'p1', 'plant', 'California poppy', { sci: 'Eschscholzia californica' }),
    tag('b', 'p2', 'plant', 'california poppy'),
    tag('c', 'p4', 'plant', 'Manzanita'),
    tag('d', 'p3', 'plant', 'Sagebrush', { status: 'suggested' }),
    tag('e', 'p1', 'bird', 'Acorn Woodpecker'),
  ]
  const seen = seenPlants(photos, tags)
  assert.deepEqual(seen.map((x) => [x.name, x.photos.length]), [['California poppy', 2], ['Manzanita', 1]])
  assert.equal(seen[0].sci, 'Eschscholzia californica')
  assert.deepEqual(seen[1].towns, ['Big Bear Lake'])
})

test('what Claude is asked about a photo: never a person; and its answer is checked before it comes back', () => {
  const ask = photoTagsAsk({ town: 'Temecula', date: '2026-11-07', recipes: ['Baja fish tacos'], places: ['Wilson Creek Winery'] })
  assert.match(ask, /Do not identify, name or describe any person/)
  assert.match(ask, /Baja fish tacos/)
  assert.match(ask, /Wilson Creek Winery/)
  assert.match(ask, /ONLY when a sign or writing in the photo names it/)
  const known = { recipes: ['Baja fish tacos'], places: ['Wilson Creek Winery'] }
  const clean = cleanPhotoTags({ caption: 'A family at a table', subjects: [
    { kind: 'dish', name: 'Fish tacos', scientific: '', confidence: 'high', match: 'Baja fish tacos' },
    { kind: 'dish', name: 'Pasta', scientific: '', confidence: 'high', match: 'A recipe it made up' },
    { kind: 'plant', name: 'Poppy <b>', scientific: 'Eschscholzia', confidence: 'certain', match: 'Baja fish tacos' },
    { kind: 'plant', name: 'poppy b', scientific: '', confidence: 'low', match: '' },
    { kind: 'other', name: 'A woman smiling', scientific: '', confidence: 'high', match: '' },
    { kind: 'person', name: 'Jason', scientific: '', confidence: 'high', match: '' },
    { kind: 'other', name: 'A child’s face', scientific: '', confidence: 'high', match: '' },
    { kind: 'bird', name: 'Acorn Woodpecker', scientific: 'Melanerpes formicivorus', confidence: 'high', match: '' },
  ] }, known)
  assert.equal(clean.caption, '', 'a caption about people is dropped')
  assert.deepEqual(clean.subjects.map((s) => s.name), ['Fish tacos', 'Pasta', 'Poppy b', 'Acorn Woodpecker'], 'people, faces and unknown kinds are dropped, repeats too')
  assert.equal(clean.subjects[0].match, 'Baja fish tacos')
  assert.equal(clean.subjects[1].match, '', 'a match must be exactly one of the titles sent')
  assert.equal(clean.subjects[2].match, '', 'only a dish or a place may match')
  assert.equal(clean.subjects[2].confidence, 'low', 'an unknown confidence is low')
  const many = cleanPhotoTags({ subjects: Array.from({ length: 20 }, (_, i) => ({ kind: 'plant', name: `Plant ${i}`, scientific: '', confidence: 'low', match: '' })) }, {})
  assert.equal(many.subjects.length, 8)
  assert.deepEqual(cleanPhotoTags(null), { caption: '', subjects: [] })
})

test('the photo-tags task is the family’s, closed all the way down, and the function checks the answer', () => {
  assert.equal(TASKS['photo-tags'].who, 'family')
  assert.equal(TASKS['photo-tags'].upload, true)
  assert.match(TASKS['photo-tags'].says, /photo/)
  const walk = (s, path = 'root') => {
    if (!s || typeof s !== 'object') return
    if (s.type === 'object') { assert.equal(s.additionalProperties, false, path); assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), path) }
    for (const [k, v] of Object.entries(s.properties || {})) walk(v, `${path}.${k}`)
    if (s.items) walk(s.items, `${path}[]`)
  }
  walk(PHOTO_TAGS_SCHEMA)
  assert.ok(!PHOTO_TAGS_SCHEMA.properties.subjects.items.properties.kind.enum.includes('person'))
  const fn = src('supabase/functions/claude/index.ts')
  assert.match(fn, /if \(body\.task === 'photo-tags'\)/)
  assert.match(fn, /\.\.\.cleanPhotoTags\(jsonOf\(msg\), known\)/)
})

test('photos are private and the family’s; tags are suggestions until confirmed; nothing is made from where a phone has been', () => {
  const m = src('supabase/migrations/20261108130000_trip_photos.sql')
  assert.match(m, /values \('trips', 'trips', false,/, 'a private bucket')
  assert.match(m, /allowed_mime_types\)\s*values \('trips', 'trips', false, 6291456, array\['image\/jpeg'\]\)/)
  for (const p of ['trips_files_read', 'trips_files_add', 'trips_files_remove']) assert.match(m, new RegExp(`${p}[^;]*is_family`), p)
  assert.match(m, /trip_photos_remove[^;]*added_by = \(select public\.my_member_id\(\)\) or \(select public\.is_parent\(\)\)/)
  assert.match(m, /status text not null default 'suggested' check \(status in \('suggested', 'confirmed'\)\)/)
  assert.ok(!/\blat\b|\blng\b/.test(m), 'a town and a day, never a point')
  assert.ok(!/'person'|'people'/.test(m), 'no kind for a person')
  const store = src('src/lib/photoStore.js')
  assert.match(store, /from\('trips'\)\.upload/)
  assert.ok(!/public\//.test(store), 'never in the app’s own files')
  assert.match(store, /status: 'suggested'|suggestionRows/)
  assert.match(src('src/lib/auth.js'), /resetPhotos\(\)/)
  const reel = src('src/parts/PhotoReel.jsx')
  assert.match(reel, /It never names or describes a person\. Nothing it suggests counts until you confirm it\./, 'the screen says what is sent')
  assert.match(reel, /Have Claude look at each photo/)
})
