import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { TOPICS, drawingFiles, sortDrawings, petsDrawing, petsPaperWidth, drawnWords, validMadeOn, cleanDrawing, tilt, tapeOf, migrationMissing } from '../src/lib/drawings.js'
import { parsePath, PLACES, APP_PLACES } from '../src/lib/router.js'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(join(root, p), 'utf8')

test('newest first: the day she drew it where known, else the day it was added, then the order added', () => {
  const rows = [
    { id: 'a', made_on: null, created_at: '2026-11-03T10:00:00Z' },
    { id: 'b', made_on: '2026-10-30', created_at: '2026-11-04T10:00:00Z' },
    { id: 'c', made_on: null, created_at: '2026-11-05T10:00:00Z' },
    { id: 'd', made_on: null, created_at: '2026-11-05T12:00:00Z' },
  ]
  assert.deepEqual(sortDrawings(rows).map((r) => r.id), ['d', 'c', 'a', 'b'])
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'c', 'd'], 'the list it was given is left alone')
})

test('the Pets launch always hangs the first drawing marked as being about the pets, and nothing otherwise', () => {
  const rows = [
    { id: 'new', topic: 'pets', made_on: null, created_at: '2026-11-05T00:00:00Z' },
    { id: 'first', topic: 'pets', made_on: '2026-10-01', created_at: '2026-10-02T00:00:00Z' },
    { id: 'other', topic: null, made_on: null, created_at: '2026-11-06T00:00:00Z' },
    { id: 'drawn-earlier', topic: 'pets', made_on: '2020-01-01', created_at: '2026-11-08T00:00:00Z' },
  ]
  assert.equal(petsDrawing(rows).id, 'first', 'the scene was made round the first one: a newer drawing of the pets never covers it')
  assert.equal(petsDrawing([rows[2]]), null, 'a drawing about nothing in particular is never hung there')
  assert.equal(petsDrawing([]), null)
  assert.deepEqual(Object.keys(TOPICS), ['pets'])
})

test('a tall drawing hangs narrower in the Pets launch, so it never comes down over the cats', () => {
  assert.equal(petsPaperWidth(1500, 1000), 62, 'a wide drawing hangs at its usual width')
  assert.equal(petsPaperWidth(0, 0), 62)
  const tall = petsPaperWidth(1000, 1400)
  assert.ok(tall < 40, `a tall one is narrower (${tall}%)`)
  assert.ok(((tall - 3.4) * 1.4) <= 47.2, 'and its picture is no taller than the room above the wall')
})

test('a drawing’s files go under its own id', () => {
  assert.deepEqual(drawingFiles('abc'), { path: 'abc.jpg', thumb: 'abc.thumb.jpg', original: 'abc.original.jpg' })
  assert.deepEqual(drawingFiles('abc', 'k2'), { path: 'abc.k2.jpg', thumb: 'abc.k2.thumb.jpg', original: 'abc.original.jpg' }, 'a crop made again has names of its own')
})

test('the day is built from its parts, not parsed as UTC (the evening before, at home)', () => {
  assert.equal(drawnWords('2026-11-04'), 'Drawn November 4, 2026')
  assert.equal(drawnWords('2026-10-30'), 'Drawn October 30, 2026')
  assert.equal(drawnWords(null), ''); assert.equal(drawnWords('soon'), '')
})

test('a date must be a real day, and not after today', () => {
  assert.ok(validMadeOn('2026-11-05', '2026-11-05')); assert.ok(validMadeOn('2024-02-29', '2026-11-05'))
  assert.ok(!validMadeOn('2026-11-06', '2026-11-05'), 'not tomorrow')
  assert.ok(!validMadeOn('2026-02-30', '2026-11-05')); assert.ok(!validMadeOn('2025-02-29', '2026-11-05'))
  assert.ok(!validMadeOn('11/05/2026', '2026-11-05')); assert.ok(!validMadeOn('', '2026-11-05'))
})

test('the form becomes a row’s fields, or a sentence saying what is wrong', () => {
  const today = '2026-11-05'
  assert.deepEqual(cleanDrawing({ title: '  My   Cats ', madeOn: '', words: '   ', topic: 'pets' }, today), { title: 'My Cats', made_on: null, words: null, topic: 'pets' })
  assert.deepEqual(cleanDrawing({ title: 'Kona', madeOn: '2026-11-01', words: ' It is a cat. ', topic: 'whales' }, today), { title: 'Kona', made_on: '2026-11-01', words: 'It is a cat.', topic: null }, 'a topic that is not one of ours is none')
  assert.match(cleanDrawing({ title: '   ' }, today).error, /title/)
  assert.match(cleanDrawing({ title: 'x'.repeat(121) }, today).error, /120/)
  assert.match(cleanDrawing({ title: 'ok', madeOn: '2027-01-01' }, today).error, /date/)
  assert.match(cleanDrawing({ title: 'ok', words: 'w'.repeat(1001) }, today).error, /1000/)
})

test('a paper’s lean and tape are steady for an id, small, and four kinds', () => {
  for (const id of ['11111111-1111-4111-8111-111111111111', 'x', 'a-much-longer-id-than-the-rest']) {
    assert.equal(tilt(id), tilt(id)); assert.ok(Math.abs(tilt(id)) <= 1.6)
    assert.equal(tapeOf(id), tapeOf(id)); assert.ok([0, 1, 2, 3].includes(tapeOf(id)))
  }
  const kinds = new Set(Array.from({ length: 60 }, (_, i) => tapeOf('id-' + i)))
  assert.equal(kinds.size, 4, 'every colour of tape gets used')
})

test('the database saying the table is not there means the migration has not been run', () => {
  assert.ok(migrationMissing({ code: '42P01' })); assert.ok(migrationMissing({ code: 'PGRST205' }))
  assert.ok(migrationMissing({ message: 'relation "public.annas_drawings" does not exist' }))
  assert.ok(!migrationMissing({ code: '42501', message: 'permission denied' })); assert.ok(!migrationMissing(null))
})

test('both apps are places with addresses, in the Apps sheet and the rail', () => {
  assert.deepEqual(parsePath('/drawings'), { place: 'drawings', rest: [] })
  assert.deepEqual(parsePath('/drawings/abc'), { place: 'drawings', rest: ['abc'] })
  assert.deepEqual(parsePath('/pets'), { place: 'pets', rest: [] })
  const tiles = read('src/ui/apps.jsx')
  for (const k of ['drawings', 'pets']) { assert.ok(PLACES.includes(k)); assert.ok(APP_PLACES.includes(k)); assert.ok(tiles.includes(`key: '${k}', to: '/${k}'`), `${k} has an app tile`) }
})

// ---- Anna's drawings are private ----

test('the drawings bucket is private, JPEG only, and read only by the family', () => {
  const sql = read('supabase/migrations/20261105040000_annas_gallery.sql')
  assert.match(sql, /values \('drawings', 'drawings', false,/, 'a private bucket: public = false')
  assert.match(sql, /allowed_mime_types\)\s*values[\s\S]*array\['image\/jpeg'\]/)
  assert.match(sql, /create policy drawings_files_read on storage\.objects for select to authenticated using \(bucket_id = 'drawings' and \(select public\.is_family\(\)\)\)/)
  assert.match(sql, /drawings_files_remove on storage\.objects for delete[^;]*is_parent\(\)[^;]*owner_id/, 'a file comes down by its uploader or a parent, not by any family member')
  assert.doesNotMatch(sql, /to anon|using \(true\)/i)
  assert.match(sql, /revoke all on public\.annas_drawings from anon/)
})

test('no picture of Anna’s is in the app’s own files, where anyone with the address could open it', () => {
  const found = []
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      if (statSync(p).isDirectory()) { if (f !== 'node_modules') walk(p) } else if (/\.(jpe?g|png|webp|gif|heic)$/i.test(f) && /anna|drawing|my-?cats/i.test(relative(root, p))) found.push(relative(root, p))
    }
  }
  for (const d of ['public', 'src']) if (existsSync(join(root, d))) walk(join(root, d))
  assert.deepEqual(found, [], 'her drawings go in through the gallery, into the private bucket')
  assert.ok(!existsSync(join(root, 'public/drawings')))
})

// ---- The Pets launch is drawn in code and respects Reduce Motion ----

test('the Pets launch is drawn in code, never plays under Reduce Motion, and uses the app’s one motion check', () => {
  const jsx = read('src/places/pets/PetsLaunch.jsx'), css = read('src/places/pets/pets.css')
  assert.match(jsx, /import \{ reducedMotion \} from '\.\.\/\.\.\/lib\/motion\.js'/)
  assert.doesNotMatch(jsx, /matchMedia/, 'decide on motion with src/lib/motion.js, never a fresh matchMedia')
  assert.match(jsx, /!reducedMotion\(\)/, 'the launch never starts on its own under Reduce Motion')
  assert.doesNotMatch(jsx, /<image |<img [^>]*src="\/|\.(png|jpe?g|webp)'/i, 'no picture file in the scene: every shape is code')
  assert.match(css, /html\[data-motion="less"\] \.pt-stage \*/, 'switching Reduce Motion on mid-scene stops it')
  const names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1])
  assert.ok(names.length >= 10)
  for (const n of names) assert.match(n, /^pt-/, `${n}: this stylesheet is global, so every animation name starts pt-`)
  assert.doesNotMatch(css, /filter:\s*blur/)
})

test('the dog is Appa, and each cat is coloured as Jason describes her', () => {
  for (const f of ['src/places/pets/Pets.jsx', 'src/places/pets/PetsLaunch.jsx', 'src/places/pets/pets.css', 'src/ui/apps.jsx']) assert.doesNotMatch(read(f), /zappa/i, `${f}: his name is Appa`)
  const jsx = read('src/places/pets/PetsLaunch.jsx')
  assert.match(jsx, /kona: \{[^]*?eyes: 'blue'/, 'Kona has blue eyes')
  assert.match(jsx, /kona: \{[^]*?fill="#EA9340"[^]*?fill="#2B2330"[^]*?portia:/, 'Kona has one calico splotch (orange with black in it) on her head')
  assert.match(jsx, /portia: \{\s*fur: '#2B2330'/, 'Portia is black')
  assert.match(jsx, /portia: \{[^]*?fill="#FCFBF9"[^]*?goldie:/, 'Portia has a tuxedo’s white')
  assert.match(jsx, /<Cat look="kona" [^>]*\/><Cat look="portia" [^>]*\/><Cat look="goldie" /, 'Kona, Portia, Goldie, left to right as in Anna’s drawing')
})
