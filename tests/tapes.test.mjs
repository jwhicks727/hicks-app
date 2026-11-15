import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { TAPES, GROUPS, TWINKLE, tapeById, tapeFor, tapesIn, validTapeId, surpriseTape } from '../src/lib/tapes.js'
import { tapeOf, withTapes } from '../src/lib/drawings.js'
import { artTapeTint, drawingKey, paintingKey } from '../src/academy/ownArt.js'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(join(root, p), 'utf8')

test('Anna has plenty of tapes to choose from, each with its own id and name, in a group the picker shows', () => {
  assert.ok(TAPES.length >= 50, `${TAPES.length} tapes`)
  assert.equal(new Set(TAPES.map((t) => t.id)).size, TAPES.length, 'no id twice')
  assert.equal(new Set(TAPES.map((t) => t.name.toLowerCase())).size, TAPES.length, 'no name twice')
  const groups = new Set(GROUPS.map(([g]) => g))
  for (const t of TAPES) {
    assert.ok(groups.has(t.group), `${t.id}: its group is one the picker shows`)
    assert.ok(validTapeId(t.id), `${t.id}: the database keeps ids like it`)
    assert.match(t.tint, /^#[0-9A-F]{6}$/i, `${t.id}: a tint for the academy's tabs`)
    assert.equal(typeof t.bg, 'string')
    assert.doesNotMatch(t.bg, /undefined|NaN|\[object/, `${t.id}: its pattern is whole`)
    assert.ok(!t.line || t.line.length <= 60, `${t.id}: its line is short`)
  }
  for (const [g] of GROUPS) assert.ok(tapesIn(g).length >= 4, `${g} has a few to choose from`)
  assert.equal(TAPES.filter((t) => t.group === 'rainbow' && /pride/i.test(t.name)).length >= 3, true, 'Pride tapes, as asked')
  assert.ok(TAPES.filter((t) => t.glitter).length >= 6, 'glittery ones, as asked')
})

test('every pattern is drawn in code: gradients and SVG tiles, nothing fetched from anywhere', () => {
  for (const t of [...TAPES, { id: 'twinkle', bg: TWINKLE }]) {
    for (const [, u] of t.bg.matchAll(/url\("([^"]*)"\)/g)) assert.ok(u.startsWith('data:image/svg+xml,'), `${t.id}: only drawn SVG, never a file or a link`)
    assert.doesNotMatch(t.bg, /https?:|<image|href/i, `${t.id}: nothing loaded from elsewhere`)
  }
})

test('the tributes to her favourites are nods, never their names', () => {
  // Colours and plain shapes only (src/lib/tapes.js): the shows', music's and games' names and marks stay theirs
  const never = /aphmau|katseye|kats\s*eye|odd\s*squad|minecraft|hello\s*kitty|sanrio|kuromi|my\s*melody|pok[eé]mon|pikachu|disney|barbie|hybe|geffen|pbs/i
  for (const t of TAPES) for (const w of [t.id, t.name, t.line || '']) assert.doesNotMatch(w, never, `${t.id}: "${w}"`)
  for (const t of TAPES) for (const [, u] of t.bg.matchAll(/url\("data:image\/svg\+xml,([^"]*)"\)/g)) assert.doesNotMatch(decodeURIComponent(u), never, `${t.id}: nothing named inside the pattern`)
  assert.ok(tapesIn('faves').length >= 6)
})

test('a drawing nobody has chosen for keeps the tape it always had; a chosen one shows; an unknown id falls back', () => {
  const ids = Array.from({ length: 40 }, (_, i) => `drawing-${i}`)
  for (const id of ids) assert.equal(tapeFor({ id }).id, TAPES[tapeOf(id)].id, 'the first four are the old pink, yellow, mint and lilac, in tapeOf’s order')
  assert.deepEqual(TAPES.slice(0, 4).map((t) => t.tint), ['#F29CB7', '#F6D94D', '#8FD3B6', '#B9A4E6'])
  assert.equal(tapeFor({ id: 'x', tape: 'galaxy' }).id, 'galaxy')
  assert.equal(tapeFor({ id: 'x', tape: 'gone-tape' }).id, TAPES[tapeOf('x')].id, 'a tape taken out of the catalogue falls back, never a blank strip')
  assert.equal(tapeById('nope'), null)
  assert.ok(!validTapeId('Galaxy') && !validTapeId('drop table') && !validTapeId('') && !validTapeId('made-up'))
})

test('Surprise me never picks the tape it already has', () => {
  for (const r of [0, 0.3, 0.5, 0.999999]) for (const t of TAPES.slice(0, 10)) assert.notEqual(surpriseTape(t.id, r).id, t.id)
  assert.ok(surpriseTape('pride', 0.999999))
})

test('drawings carry their chosen tape, and the academy’s little tabs take its colour', () => {
  const rows = [{ id: 'a' }, { id: 'b' }]
  const out = withTapes(rows, { a: 'pride' })
  assert.deepEqual(out.map((r) => r.tape), ['pride', null])
  assert.equal(rows[0].tape, undefined, 'the rows it was given are left alone')
  const src = { drawings: out }
  assert.equal(artTapeTint(drawingKey('a'), src), tapeById('pride').tint)
  assert.equal(artTapeTint(drawingKey('b'), src), null, 'nobody chose: the tabs stay as they were')
  assert.equal(artTapeTint(paintingKey('x'), src), null, 'a painting hangs in a frame, not on tape')
})

test('the database keeps a choice per drawing for the family only, under the chooser’s own name', () => {
  const f = readdirSync(join(root, 'supabase/migrations')).find((x) => /_drawing_tapes\.sql$/.test(x))
  assert.ok(f, 'the migration is there')
  const s = read('supabase/migrations/' + f)
  assert.match(s, /drawing_id uuid primary key references public\.annas_drawings \(id\) on delete cascade/, 'one a drawing, gone with it')
  assert.match(s, /check \(tape ~ '\^\[a-z0-9-\]\{1,40\}\$'\)/, 'the same ids validTapeId allows')
  assert.match(s, /enable row level security/)
  assert.match(s, /for select to authenticated using \(\(select public\.is_family\(\)\)\)/)
  assert.match(s, /for insert[^;]+set_by = \(select public\.my_member_id\(\)\)/)
  assert.match(s, /for update[^;]+with check[^;]+set_by = \(select public\.my_member_id\(\)\)/)
  assert.match(s, /revoke all on public\.drawing_tapes from anon/)
})

test('her wall, a drawing’s page and Home’s art card all hang the chosen tape; a glitter tape is still under less motion', () => {
  for (const p of ['src/places/Drawings.jsx', 'src/parts/PaintingsCard.jsx']) {
    const s = read(p)
    assert.match(s, /<Tape tape=\{tapeFor\(/, `${p} shows the chosen tape`)
    assert.doesNotMatch(s, /tapeOf\(/, `${p} never picks the tape by id alone`)
  }
  const css = read('src/ui/tape.css')
  assert.match(css, /html\[data-motion="less"\] \.tape-glitter::after \{ animation: none/)
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.tape-glitter::after \{ animation: none/)
  assert.doesNotMatch(css, /@keyframes[^{]+\{[^}]*(transform|filter|left|top|width)/, 'the twinkle is opacity only')
})

test('fruit is one group: the twenty new ones with watermelon, lemon slices and cherries; flowers, butterflies, sprinkles and space are Misc', () => {
  const fruit = tapesIn('fruit').map((t) => t.id)
  for (const id of ['watermelon', 'lemons', 'cherries', 'apples', 'dragon-fruit']) assert.ok(fruit.includes(id), `${id} is fruit`)
  assert.equal(fruit.length, 23, 'twenty new, and the three that were in the old fun group')
  assert.deepEqual(tapesIn('misc').map((t) => t.id).sort(), ['butterflies', 'daisies', 'space', 'sprinkles'])
  assert.ok(!GROUPS.some(([g]) => g === 'fun'), 'the old fun group is gone')
  assert.deepEqual(GROUPS.map(([g]) => g).slice(-3), ['fruit', 'misc', 'faves'], 'fruit and misc sit before her favourites')
})
