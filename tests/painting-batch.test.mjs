import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { findPainting } from '../src/lib/autocrop.js'
import {
  turnedSize, wholeCrop, fromFound, turnCrop, cropCorners, insideImage, fitInside, leanCrop, drawTransform, viewOf, edgesOf, fromEdges,
  dragCrop, nearestCorner, signatureCorners, yearFromReading, cleanYear, cleanTitle, cleanMedium, cleanSeasons, slugFor, readTurn,
  applyReading, tally, nextToCheck, takenSlugs, LEAN,
} from '../src/lib/paintingBatch.js'
import { SEASON_ORDER } from '../src/lib/seasons.js'
import { TASKS, PAINTING_SCHEMA, PAINTING_SEASONS, PAINTING_PARTS, checkUploads, paintingAsk, paintingContent } from '../supabase/functions/_shared/claude.js'
import { photo } from './helpers-photo.mjs'

// Every picture here is made up (tests/helpers-photo.mjs): no painting of hers is ever in a test.
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} is not within ${tol} of ${b}`)

test('the auto-crop finds a painting on the wall: how far it leans and where its edges are', () => {
  for (const [o, what] of [
    [{}, 'level and centred'],
    [{ angle: 3 }, 'leaning 3° clockwise'],
    [{ angle: -1.5, cx: 220, cy: 190 }, 'leaning back, off centre'],
    [{ W: 360, H: 480, cx: 180, cy: 240, pw: 220, ph: 330, angle: -2.2 }, 'a tall one'],
    [{ angle: 2, sky: true }, 'a pale sky the colour of the wall'],
    [{ angle: 0.7, wire: true }, 'its hanging wire showing'],
  ]) {
    const want = { cx: 240, cy: 180, pw: 300, ph: 200, angle: 0, ...o }
    const f = findPainting(photo(o))
    assert.equal(f.kind, 'found', what); assert.equal(f.sure, true, what)
    near(f.angle, want.angle, 0.2, `${what}: lean`)
    near(f.cx, want.cx, 1.5, `${what}: across`); near(f.cy, want.cy, 1.5, `${what}: down`)
    // A hair inside its edges, so no wall shows
    assert.ok(f.w <= want.pw + 1 && f.w >= want.pw - 6, `${what}: width ${f.w}`)
    assert.ok(f.h <= want.ph + 1 && f.h >= want.ph - 6, `${what}: height ${f.h}`)
  }
})

test('the auto-crop says when it isn’t sure, and takes a photo that is all painting as it is', () => {
  const whole = findPainting(photo({ pw: 600, ph: 500 }))
  assert.equal(whole.kind, 'whole'); assert.equal(whole.sure, true)
  assert.deepEqual([whole.cx, whole.cy, whole.w, whole.h, whole.angle], [240, 180, 480, 360, 0])
  const nothing = findPainting(photo({ none: true }))
  assert.equal(nothing.kind, 'none'); assert.equal(nothing.sure, false)
  // Running off the photo: not sure, but the box still hugs what's there, with none of the wall beside it
  for (const [o, [x0, x1, y0, y1]] of [[{ cx: 400 }, [250, 480, 80, 280]], [{ cx: 100, cy: 100 }, [0, 250, 0, 200]], [{ W: 300, H: 400, cx: 250, cy: 200, pw: 190, ph: 275, seed: 9 }, [155, 300, 62.5, 337.5]]]) {
    const f = findPainting(photo(o))
    assert.equal(f.sure, false, JSON.stringify(o))
    near(f.cx - f.w / 2, x0, 4, `${JSON.stringify(o)}: left`); near(f.cx + f.w / 2, x1, 4, `${JSON.stringify(o)}: right`)
    near(f.cy - f.h / 2, y0, 4, `${JSON.stringify(o)}: top`); near(f.cy + f.h / 2, y1, 4, `${JSON.stringify(o)}: bottom`)
  }
  assert.equal(findPainting(photo({ pw: 90, ph: 70 })).sure, false, 'too small to be the photo’s subject')
  assert.equal(findPainting({ data: new Uint8ClampedArray(8 * 8 * 4), width: 8, height: 8 }).kind, 'none')
})

test('a crop turns with the photo, a quarter at a time, and comes back the same', () => {
  const W = 4000, H = 3000, c = { turn: 0, angle: 2.5, cx: 1800, cy: 1400, w: 2600, h: 1900 }
  assert.deepEqual(turnedSize(W, H, 90), [3000, 4000]); assert.deepEqual(turnedSize(W, H, 180), [4000, 3000]); assert.deepEqual(turnedSize(W, H, -90), [3000, 4000])
  let t = c
  for (let k = 0; k < 4; k++) t = turnCrop(t, W, H, 90)
  for (const key of Object.keys(c)) near(t[key], c[key], 1e-9, key)
  const right = turnCrop(c, W, H, 90)
  assert.deepEqual([right.turn, right.w, right.h, right.cx, right.cy], [90, 1900, 2600, 3000 - 1400, 1800])
  const back = turnCrop(right, W, H, -90)
  for (const key of Object.keys(c)) near(back[key], c[key], 1e-9, key)
  assert.equal(readTurn(-90), 270); assert.equal(readTurn('180'), 180); assert.equal(readTurn('sideways'), 0); assert.equal(readTurn(45), 90)
})

test('the painting drawn out of the photo: the box’s corners land on the picture’s corners, whatever the turn and lean', () => {
  const W = 3600, H = 2700
  for (const turn of [0, 90, 180, 270]) {
    for (const angle of [0, 3.2, -7]) {
      const [tw, th] = turnedSize(W, H, turn)
      const crop = fitInside({ turn, angle, cx: tw * 0.47, cy: th * 0.52, w: tw * 0.6, h: th * 0.55 }, W, H)
      const t = drawTransform(crop, W, H, { max: 2400 })
      assert.ok(Math.max(t.width, t.height) <= 2400)
      // A corner of the box in the turned photo, back to the photo's own pixels
      const toPhoto = ([x, y]) => turn === 0 ? [x, y] : turn === 90 ? [y, H - x] : turn === 180 ? [W - x, H - y] : [W - y, x]
      const out = cropCorners(crop).map(toPhoto).map(([x, y]) => [t.a * x + t.c * y + t.e, t.b * x + t.d * y + t.f])
      const want = [[0, 0], [t.width, 0], [t.width, t.height], [0, t.height]]
      out.forEach(([x, y], i) => { near(x, want[i][0], 1, `turn ${turn}, lean ${angle}: corner ${i} x`); near(y, want[i][1], 1, `turn ${turn}, lean ${angle}: corner ${i} y`) })
    }
  }
  // A corner region for reading her signature: the region's own corner is the picture's
  const crop = { turn: 0, angle: 0, cx: 1800, cy: 1350, w: 3000, h: 2000 }
  const [, , , br] = signatureCorners(crop.w, crop.h)
  assert.deepEqual(br.map((v) => Math.round(v)), [1980, 1480, 1020, 520])
  const t = drawTransform(crop, W, H, { max: 800, region: br })
  near(t.a * (300 + br[0]) + t.e, 0, 1e-6, 'region left'); assert.equal(t.width, 800)
})

test('the crop screen’s box sits where the crop is, level, and its edges go back and forth unchanged', () => {
  const W = 3600, H = 2700, crop = fitInside({ turn: 90, angle: -4, cx: 1300, cy: 1900, w: 2000, h: 2600 }, W, H)
  const v = viewOf(crop, W, H, 360, 420)
  const e = edgesOf(crop, W, H)
  near(v.box.width, (e.right - e.left) * v.k, 1e-9, 'box width'); near(v.box.left, 180 + e.left * v.k, 1e-9, 'box left')
  // The photo fits the stage, leaning
  assert.ok(v.k > 0 && v.k * Math.max(...turnedSize(W, H, 90)) <= 420 + 1e-6)
  const back = fromEdges(e, crop, W, H)
  for (const key of ['cx', 'cy', 'w', 'h']) near(back[key], crop[key], 1e-9, key)
  // The CSS matrix puts the box's centre on screen where the box is drawn
  const [a, b, c, d, ex, fy] = v.matrix, [px, py] = [crop.cy, H - crop.cx] // the turned centre back in the photo (turn 90)
  near(a * px + c * py + ex, v.box.left + v.box.width / 2, 1e-6, 'centre across'); near(b * px + d * py + fy, v.box.top + v.box.height / 2, 1e-6, 'centre down')
})

test('a crop stays on the photo: fitted, leaned and dragged', () => {
  const W = 4000, H = 3000
  const off = fitInside({ turn: 0, angle: 8, cx: 3900, cy: 200, w: 3000, h: 2000 }, W, H)
  assert.ok(insideImage(off, W, H))
  const whole = wholeCrop(W, H)
  assert.ok(insideImage(whole, W, H))
  const leaned = leanCrop(whole, 5, W, H)
  assert.ok(insideImage(leaned, W, H) && leaned.w < W && leaned.angle === 5)
  assert.equal(leanCrop(whole, 40, W, H).angle, LEAN)
  // Dragging a corner far out stops at the photo's edge; a box can't be dragged inside out
  const c = { turn: 0, angle: 0, cx: 2000, cy: 1500, w: 2000, h: 1500 }
  const out = dragCrop(c, 'se', 5000, 5000, W, H)
  assert.ok(insideImage(out, W, H)); near(out.cx + out.w / 2, W, 1, 'right edge at the photo’s'); near(out.cy + out.h / 2, H, 1, 'bottom at the photo’s')
  const tiny = dragCrop(c, 'nw', 9000, 9000, W, H)
  assert.ok(tiny.w >= 3000 * 0.04 - 1e-9 && tiny.h >= 3000 * 0.04 - 1e-9, 'never smaller than a twenty-fifth')
  // Moving against one edge still slides along it
  const slid = dragCrop(c, 'move', 5000, 300, W, H)
  near(slid.cx + slid.w / 2, W, 1, 'against the right edge'); near(slid.cy, 1800, 1, 'and down as far as asked')
  assert.ok(insideImage(dragCrop(fitInside({ ...c, angle: 6 }, W, H), 'move', -5000, -5000, W, H), W, H), 'leaning too')
  assert.equal(nearestCorner({ left: -10, top: -10, right: 10, bottom: 10 }, 7, -3), 'ne')
  assert.equal(nearestCorner({ left: -10, top: -10, right: 10, bottom: 10 }, -9, 9), 'sw')
  // The auto-crop's answer, from the little copy to the photo
  const big = fromFound({ cx: 200, cy: 150, w: 300, h: 200, angle: 1.5 }, 4000, 3000, 400, 300)
  assert.deepEqual([big.cx, big.cy, big.w, big.h, big.angle, big.turn], [2000, 1500, 3000, 2000, 1.5, 0])
})

test('the year by her signature: what she wrote, trusted over the sum, never before 1950 or in the future', () => {
  const y = (written, year = 0, legible = 'clear') => yearFromReading({ written, year, legible }, 2026)
  assert.deepEqual(y('2019', 2019), { year: 2019, from: 'signature' })
  assert.deepEqual(y('’19', 2019), { year: 2019, from: 'signature' })
  assert.deepEqual(y("'98", 1998), { year: 1998, from: 'signature' })
  assert.deepEqual(y('6/21', 2021), { year: 2021, from: 'signature' })
  assert.deepEqual(y('L.H. 2003'), { year: 2003, from: 'signature' }, 'four digits are enough on their own')
  assert.deepEqual(y('2019', 2018), { year: 2019, from: 'unsure' }, 'when Claude’s sum disagrees, what’s written wins and it says check')
  assert.deepEqual(y('2019', 2019, 'unsure'), { year: 2019, from: 'unsure' })
  assert.deepEqual(y('', 0, 'none'), { year: null, from: null })
  assert.deepEqual(y('2031', 2031), { year: null, from: null }, 'not in the future')
  assert.deepEqual(y("'40", 1940), { year: null, from: null }, 'nothing before the gallery’s earliest')
  assert.deepEqual(y('LH', 2015, 'unsure'), { year: 2015, from: 'unsure' }, 'Claude’s year when nothing written parses')
  assert.deepEqual(yearFromReading(null, 2026), { year: null, from: null })
  assert.deepEqual(cleanYear('', 2026), { year: null })
  assert.deepEqual(cleanYear(' 2019 ', 2026), { year: 2019 })
  assert.match(cleanYear('19', 2026).error, /four digits/)
  assert.match(cleanYear('2027', 2026).error, /1950 to 2026/)
})

test('titles, media, seasons and slugs come out tidy, and a slug is never taken twice (nor by /add)', () => {
  assert.equal(cleanTitle('  “Autumn   pond.”  '), 'Autumn pond')
  assert.equal(cleanTitle('x'.repeat(300)).length, 200)
  assert.equal(cleanMedium(' watercolor on paper. '), 'Watercolor on paper')
  assert.equal(cleanMedium('y'.repeat(100)).length, 80)
  assert.equal(cleanMedium(''), '')
  assert.deepEqual(cleanSeasons(['thanksgiving', 'fall', 'fall', 'monsoon']), ['thanksgiving', 'fall'], 'known ones, once each, in the app’s order')
  assert.deepEqual(cleanSeasons('fall'), [])
  assert.equal(slugFor('Autumn pond'), 'autumn-pond')
  assert.equal(slugFor('Autumn pond', ['autumn-pond', 'autumn-pond-2']), 'autumn-pond-3')
  assert.equal(slugFor('Add'), 'add-2')
  assert.equal(slugFor('Día de los Muertos'), 'dia-de-los-muertos')
  assert.equal(slugFor('!!!'), 'painting')
  assert.match(slugFor('a'.repeat(100)), /^[a-z0-9-]{1,80}$/)
  const items = [{ id: 'a', slug: 'barn' }, { id: 'b', slug: 'pond' }, { id: 'c' }]
  assert.deepEqual(takenSlugs([{ slug: 'witch' }], [{ slug: 'autumn-stream' }], items, 'b'), ['witch', 'autumn-stream', 'barn'])
})

test('Claude’s reading fills in only what nobody has set, and turns a sideways photo upright', () => {
  const item = { id: 'p1', status: 'ready', W: 4000, H: 3000, crop: { turn: 0, angle: 1, cx: 2000, cy: 1500, w: 3000, h: 2000 }, title: '', named: false, year: '', medium: '', seasons: [], touched: {} }
  const reading = { signature: 'L. Hicks ’19', written: '’19', year: 2019, legible: 'clear', title: '“Barn in snow”', medium: 'watercolor on paper', seasons: ['winter', 'christmas', 'nope'], turn: 90 }
  const r = applyReading(item, reading, 2026)
  assert.equal(r.read, 'done'); assert.equal(r.title, 'Barn in snow'); assert.equal(r.named, false, 'still a working title')
  assert.equal(r.year, '2019'); assert.equal(r.yearFrom, 'signature'); assert.equal(r.reading.written, '’19')
  assert.equal(r.medium, 'Watercolor on paper'); assert.equal(r.mediumFrom, 'claude')
  assert.deepEqual(r.seasons, ['christmas', 'winter'])
  assert.equal(r.crop.turn, 90); assert.ok(insideImage(r.crop, 4000, 3000))
  // What a person typed or changed stays theirs
  const mine = applyReading({ ...item, title: 'The red barn', year: '2018', medium: 'Oil', seasons: ['fall'], touched: { title: true, year: true, medium: true, seasons: true, crop: true } }, reading, 2026)
  assert.deepEqual([mine.title, mine.year, mine.medium, mine.seasons, mine.crop.turn], ['The red barn', '2018', 'Oil', ['fall'], 0])
  // No year by her signature: the box is left empty, and says so
  const none = applyReading(item, { ...reading, written: '', year: 0, legible: 'none', turn: 0 }, 2026)
  assert.equal(none.year, ''); assert.equal(none.yearFrom, null); assert.equal(none.crop.turn, 0)
})

test('the batch knows where each photo stands, and the next to check goes round', () => {
  const items = [
    { id: 'a', status: 'added' }, { id: 'b', status: 'ready', sure: false, read: 'reading' }, { id: 'c', status: 'saving' },
    { id: 'd', status: 'ready', sure: true, read: 'done' }, { id: 'e', status: 'new', read: 'waiting' }, { id: 'f', status: 'skipped' },
  ]
  const t = tally(items)
  assert.deepEqual([t.total, t.ready, t.unsure, t.saving, t.new, t.reading, t.toCheck, t.finished], [6, 2, 1, 1, 1, 2, 3, false])
  assert.equal(nextToCheck(items, 'b'), 'd')
  assert.equal(nextToCheck(items, 'd'), 'b', 'round to the start')
  assert.equal(nextToCheck([{ id: 'x', status: 'added' }, { id: 'y', status: 'new' }], 'x'), 'y', 'one still getting ready, when none is ready')
  assert.equal(nextToCheck([{ id: 'x', status: 'added' }], 'x'), null)
  assert.equal(tally([{ status: 'added' }, { status: 'skipped' }]).finished, true)
  assert.equal(tally([]).finished, false)
})

test('Claude reads a painting for a parent only: five pictures at most, labelled, the seasons the app’s own', () => {
  assert.equal(TASKS['read-painting'].who, 'parent'); assert.equal(TASKS['read-painting'].uploads, 5)
  assert.match(TASKS['read-painting'].says, /corners/)
  assert.deepEqual(Object.keys(PAINTING_SEASONS).sort(), [...SEASON_ORDER].sort(), 'the function’s seasons are src/lib/seasons.js’s')
  assert.deepEqual(PAINTING_SCHEMA.properties.seasons.items.enum.sort(), [...SEASON_ORDER].sort())
  const walk = (s) => {
    if (s.type === 'object') { assert.equal(s.additionalProperties, false); assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort()); Object.values(s.properties).forEach(walk) }
    if (s.type === 'array') walk(s.items)
  }
  walk(PAINTING_SCHEMA)
  assert.ok(!('size' in PAINTING_SCHEMA.properties), 'no size: nobody measures them all')
  const pic = { data: 'QUJD', media_type: 'image/jpeg' }
  assert.equal(checkUploads([pic, pic]), null)
  assert.match(checkUploads([]), /One to 5/); assert.match(checkUploads(Array(6).fill(pic)), /One to 5/)
  assert.match(checkUploads('nope'), /One to 5/)
  assert.match(checkUploads([pic, { data: 'x!', media_type: 'image/png' }]), /whole/)
  assert.match(checkUploads([pic, { data: 'QUJD', media_type: 'application/pdf' }]), /picture/)
  assert.match(checkUploads(Array(5).fill({ data: 'A'.repeat(3.5 * 1024 * 1024), media_type: 'image/jpeg' })), /too big together/)
  const content = paintingContent(Array(7).fill(pic), 'Ask')
  assert.equal(content.length, PAINTING_PARTS.length * 2 + 1, 'at most five pictures, each after its label')
  assert.equal(content[0].text, 'The whole painting:'); assert.equal(content[1].type, 'image'); assert.equal(content[9].type, 'image'); assert.equal(content.at(-1).text, 'Ask')
  const ask = paintingAsk({ titles: ['Autumn  pond', '', 'x'.repeat(200)], year: 2026 })
  assert.match(ask, /never estimate a date from the style/); assert.match(ask, /it is 2026 now/)
  assert.match(ask, /so far: Autumn pond; x{80}\./)
  assert.match(ask, /halloween \(Halloween\)/)
  assert.doesNotMatch(paintingAsk({ year: 2026 }), /so far/)
})

test('the batch screen says what goes to Claude, keeps the photos only until saved, and forgets them on sign-out', () => {
  const screen = readFileSync(new URL('../src/places/lifelist/AddPaintings.jsx', import.meta.url), 'utf8')
  assert.match(screen, /go to Claude \(Anthropic\)/)
  assert.match(screen, /Jason or Laurie add her paintings/)
  assert.doesNotMatch(screen, /Size<input|size:/, 'no size box')
  assert.match(readFileSync(new URL('../src/lib/auth.js', import.meta.url), 'utf8'), /export function signOut\(\) \{[^}]*\bforgetPhotos\(\)/)
  const hook = readFileSync(new URL('../src/places/lifelist/usePaintingBatch.js', import.meta.url), 'utf8')
  assert.match(hook, /from\('paintings'\)\.upload/); assert.doesNotMatch(hook, /from\('drawings'\)|public\//)
  assert.match(readFileSync(new URL('../src/places/LifeList.jsx', import.meta.url), 'utf8'), /rest\[1\] === 'add' \? <AddPaintings \/>/)
})

test('a painting added for a season never takes Home’s frame from the one the season’s show plays from', async () => {
  const { homePainting, showFor } = await import('../src/lib/seasonShows.js')
  const { PAINTINGS } = await import('../src/lib/paintings.js')
  const fresh = (slug, seasons) => ({ slug, title: slug, named: false, year: null, medium: null, size: null, src: 'x', small: 'x', w: 10, h: 10, seasons, added: '2026-11-07', focus: [0, 0, 1, 1] })
  const list = [fresh('barn-in-fall', ['fall', 'thanksgiving']), fresh('black-cat', ['halloween']), fresh('snowy-barn', ['christmas', 'winter']), ...PAINTINGS]
  assert.equal(homePainting('fall', list).slug, showFor('fall', list).painting.slug, 'fall’s show starts in Home’s painting')
  assert.equal(homePainting('halloween', list).slug, 'witch-and-crow', 'the crow still flies from the witch')
  assert.equal(homePainting('christmas', list).slug, 'snowy-barn', 'a season with no show hangs her newest of it')
  assert.equal(homePainting('lent', list).slug, 'barn-in-fall', 'and a season with none of hers, her newest')
})

test('zoomed in, the box fills the stage (with room for its handles) and sits in its middle, leaning or not', () => {
  const W = 4000, H = 3000
  for (const crop of [fitInside({ turn: 0, angle: 0, cx: 2000, cy: 1500, w: 1200, h: 900 }, W, H), fitInside({ turn: 90, angle: -3, cx: 1500, cy: 1200, w: 900, h: 1300 }, W, H)]) {
    const z = viewOf(crop, W, H, 340, 400, { zoom: true }), whole = viewOf(crop, W, H, 340, 400)
    assert.equal(z.zoom, true); assert.equal(whole.zoom, false)
    near(z.box.left + z.box.width / 2, 170, 1e-6, 'box centred across'); near(z.box.top + z.box.height / 2, 200, 1e-6, 'box centred down')
    // Its handles fit: the box is at most 86% of the stage in its tighter direction, and it fills that much
    assert.ok(z.box.width <= 340 * 0.87 && z.box.height <= 400 * 0.87, 'room for the handles')
    assert.ok(Math.max(z.box.width / 340, z.box.height / 400) >= 0.85, 'and it fills the stage in one direction')
    // Zoomed in is closer than the whole photo
    assert.ok(z.k > whole.k, 'more pixels per screen pixel than the whole photo')
  }
})
