// Laurie's gallery: shapes, colours and fingerprints, months by her signature, finding and sorting, the featured walls,
// leaves for autumn's wind, and what goes to Claude. Every picture and painting here is made up: no painting of hers is
// ever in a test.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { SHAPES, SHAPE_ORDER, READ_SHAPES, cleanShape, isShaped, shapePoints, clipPathOf, outlineOf, shapeFamily, shapeFromReading, shapeName } from '../src/lib/shapes.js'
import { paletteOf, familiesOf, toneOf, rainbowKey, fingerprintOf, printDistance, looksAlike, lookAlikes, validPrint, cleanPalette, FAMILY_ORDER } from '../src/lib/artColour.js'
import { monthFromReading, yearFromReading, cleanMonth, paintedWords, applyReading, lookProposals, paintingPoint, wholeCrop, turnCrop, viewOf, fitsStage, sameCrop, slugFor, SYNCED } from '../src/lib/paintingBatch.js'
import { MOODS, STYLES, WEATHERS, cleanLooks, mediumWord, facetsOf, applyFilters, filterCount, sortPaintings, featureWindow, localFeatures, appFeature, claudeFeature, catalogOf, seasonsOn, weatherLine, comingFor } from '../src/lib/gallery.js'
import { cutLeaves, warmMask, leavesRow } from '../src/lib/leafCut.js'
import { showFor, homePainting, originsOf } from '../src/lib/seasonShows.js'
import { cropFor, fromRow, PAINTINGS } from '../src/lib/paintings.js'
import { TASKS, LOOK_MOODS, LOOK_STYLES, LOOK_WEATHERS, LOOK_SHAPES, PAINTING_SCHEMA, LOOK_SCHEMA, FEATURE_SCHEMA, lookAsk, paintingAsk, featureAsk, cleanFeature, cleanFeatureContext, catalogLine } from '../supabase/functions/_shared/claude.js'
import { photo } from './helpers-photo.mjs'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(root + p, 'utf8')

/** A made-up picture of one flat colour, or of two halves. */
function flat(W, H, rgb, right = rgb) {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = x < W / 2 ? rgb : right, i = (y * W + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255 }
  return { data, width: W, height: H }
}
/** A made-up "painting": a few bands of colour with a shape across them, and a little grain. */
function art(W, H, seed = 1) {
  let s = seed
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const cols = Array.from({ length: 5 }, () => [r() * 255, r() * 255, r() * 255])
  const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4)
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inShape = Math.hypot(x - cx, y - cy) < Math.min(W, H) * 0.22
    const c = inShape ? cols[4] : cols[Math.floor((y / H) * 4)]
    const i = (y * W + x) * 4
    data[i] = c[0] + (r() - 0.5) * 12; data[i + 1] = c[1] + (r() - 0.5) * 12; data[i + 2] = c[2] + (r() - 0.5) * 12; data[i + 3] = 255
  }
  return { data, width: W, height: H }
}
/** The same picture shrunk by an integer factor (averaging), as a smaller copy of a photo would be. */
function smaller(px, k) {
  const W = Math.floor(px.width / k), H = Math.floor(px.height / k), data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) for (let c = 0; c < 4; c++) {
    let t = 0
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) t += px.data[((y * k + dy) * px.width + x * k + dx) * 4 + c]
    data[(y * W + x) * 4 + c] = t / (k * k)
  }
  return { data, width: W, height: H }
}

// ---- Shapes --------------------------------------------------------------------------------
test('a canvas’s shape: a rectangle is no shape at all, the rest are kept tidily, and a traced one needs three corners', () => {
  assert.equal(cleanShape(null), null); assert.equal(cleanShape({ kind: 'rect' }), null); assert.equal(cleanShape({ kind: 'blob' }), null)
  assert.deepEqual(cleanShape({ kind: 'round', extra: 1 }), { kind: 'round' })
  assert.equal(cleanShape({ kind: 'polygon', points: [[0, 0], [1, 1]] }), null, 'two corners make no shape')
  assert.deepEqual(cleanShape({ kind: 'polygon', points: [[0, 0], [1.4, 0.123456], [-2, 1]] }), { kind: 'polygon', points: [[0, 0], [1, 0.123], [0, 1]] }, 'corners kept to the box, three places')
  assert.equal(isShaped({ kind: 'hexagon' }), true); assert.equal(isShaped(null), false)
  assert.equal(shapePoints({ kind: 'round' }), null)
  assert.equal(shapePoints({ kind: 'triangle' }).length, 3)
  for (const k of SHAPE_ORDER) assert.ok(SHAPES[k], k)
  for (const [k, s] of Object.entries(SHAPES)) if (s.points) for (const [x, y] of s.points) assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1, `${k} stays in its box`)
})

test('the heart is level, whole in its box and the same both sides', () => {
  const pts = SHAPES.heart.points, xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y)
  assert.ok(SHAPE_ORDER.includes('heart') && SHAPE_ORDER.indexOf('heart') < SHAPE_ORDER.indexOf('polygon'))
  assert.deepEqual([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], [0, 1, 0, 1], 'it touches all four sides, so a tight crop fits it')
  const has = new Set(pts.map((p) => p.join()))
  assert.ok(pts.every(([x, y]) => has.has([Math.round((1 - x) * 1000) / 1000, y].join())), 'the right half mirrors the left')
  assert.ok(pts.some(([x, y]) => x === 0.5 && y === 1), 'a tip at the bottom')
  assert.deepEqual(cleanShape({ kind: 'heart' }), { kind: 'heart' })
  assert.match(clipPathOf({ kind: 'heart' }), /^polygon\(/)
  assert.equal(shapeFamily({ kind: 'heart' }), 'heart'); assert.equal(shapeName({ kind: 'heart' }), 'Heart')
})

test('a shape is drawn as a clip for the frame and an outline for the crop screen', () => {
  assert.equal(clipPathOf(null), '')
  assert.equal(clipPathOf({ kind: 'round' }), 'ellipse(50% 50% at 50% 50%)')
  assert.equal(clipPathOf({ kind: 'triangle' }), 'polygon(50% 0%, 100% 100%, 0% 100%)')
  assert.match(outlineOf({ kind: 'diamond' }), /^M50 0L100 50L50 100L0 50Z$/)
  assert.match(outlineOf({ kind: 'round' }), /A50 50/)
  assert.equal(shapeFamily({ kind: 'hexagon-up' }), 'hexagon'); assert.equal(shapeFamily(null), 'rect')
  assert.deepEqual(shapeFromReading('oval'), { kind: 'round' }); assert.equal(shapeFromReading('rectangle'), null); assert.equal(shapeFromReading('other'), null, 'an odd shape is traced by a person')
  assert.deepEqual(READ_SHAPES, LOOK_SHAPES, 'the function asks for the same shapes the app understands')
})

test('a shaped painting is shown whole inside any frame, never cut to fill it', () => {
  const p = { w: 1000, h: 1000, shape: { kind: 'round' } }
  const c = cropFor(p, 500, 400)
  assert.deepEqual(c, { width: 400, height: 400, left: 50, top: 0 })
  const rect = cropFor({ w: 1000, h: 1000 }, 500, 400)
  assert.equal(rect.width, 500, 'a rectangle still fills its frame')
})

// ---- Colours and fingerprints ----------------------------------------------------------------
test('her colours are measured from the pixels: the families, how light, how vivid, and five swatches', () => {
  const blue = paletteOf(flat(60, 40, [40, 80, 200]))
  assert.ok(blue.fam.blue > 0.95, JSON.stringify(blue.fam)); assert.deepEqual(familiesOf(blue), ['blue'])
  assert.ok(blue.swatches.length >= 1 && /^#[0-9a-f]{6}$/.test(blue.swatches[0]))
  const half = paletteOf(flat(60, 40, [210, 50, 40], [240, 200, 50]))
  assert.deepEqual(familiesOf(half).sort(), ['red', 'yellow'])
  const grey = paletteOf(flat(40, 40, [128, 128, 128]))
  assert.deepEqual(familiesOf(grey), ['neutral']); assert.equal(grey.hue, null)
  assert.ok(rainbowKey(grey) >= 1000, 'the greys go at the end of a rainbow')
  assert.ok(rainbowKey(paletteOf(flat(10, 10, [220, 40, 40]))) < rainbowKey(paletteOf(flat(10, 10, [40, 80, 220]))), 'red before blue')
  assert.deepEqual(toneOf(paletteOf(flat(20, 20, [20, 20, 30]))), ['dark'])
  const brown = paletteOf(flat(20, 20, [110, 70, 40]))
  assert.deepEqual(familiesOf(brown), ['earth'])
  assert.equal(cleanPalette({ fam: { red: 2 }, swatches: ['#zzz', '#aabbcc'], light: -1 }).fam.red, 1)
  assert.deepEqual(cleanPalette({ fam: {}, swatches: ['#zzz', '#aabbcc'] }).swatches, ['#aabbcc'])
  assert.equal(Object.keys(cleanPalette({ fam: {} }).fam).join(), FAMILY_ORDER.join())
})

test('a fingerprint knows the same picture at another size, and tells two pictures apart', () => {
  const a = art(240, 180, 1), b = art(240, 180, 2)
  const pa = fingerprintOf(a), pa2 = fingerprintOf(smaller(a, 3)), pb = fingerprintOf(b)
  assert.ok(validPrint(pa)); assert.equal(pa.length, 88)
  assert.ok(looksAlike(pa, pa2), `the same at a third of the size: ${JSON.stringify(printDistance(pa, pa2))}`)
  assert.ok(!looksAlike(pa, pb), `two different ones: ${JSON.stringify(printDistance(pa, pb))}`)
  assert.equal(printDistance('x', pa), null)
  const hits = lookAlikes(pa2, [{ id: 'b', print: pb }, { id: 'a', print: pa }, { id: 'none' }])
  assert.deepEqual(hits.map((h) => h.id), ['a'])
})

test('a waiting photo is fingerprinted by its crop: the painting in it matches the painting once cut out, even turned', () => {
  // The painting alone, as her gallery keeps it, and a photo of it on a wall with room around it
  const paint = art(120, 90, 7), W = 200, H = 160, ox = 40, oy = 35
  const ph = flat(W, H, [214, 204, 188])
  for (let y = 0; y < 90; y++) for (let x = 0; x < 120; x++) for (let c = 0; c < 4; c++) ph.data[((oy + y) * W + ox + x) * 4 + c] = paint.data[(y * 120 + x) * 4 + c]
  const crop = { turn: 0, angle: 0, cx: ox + 60, cy: oy + 45, w: 120, h: 90 }
  const inPhoto = fingerprintOf(ph, paintingPoint(crop, W, H))
  assert.ok(looksAlike(inPhoto, fingerprintOf(paint)), JSON.stringify(printDistance(inPhoto, fingerprintOf(paint))))
  // From a copy of the photo half the size (the auto-crop's little copy)
  const half = smaller(ph, 2)
  assert.ok(looksAlike(fingerprintOf(half, paintingPoint(crop, W, H, half.width / W)), fingerprintOf(paint)))
  // The photo turned a quarter: the crop turns with it, and the painting still comes out upright
  const turned = turnCrop(crop, W, H, 90), back = turnCrop(turned, W, H, 270)
  assert.ok(sameCrop(back, crop))
  assert.ok(!looksAlike(fingerprintOf(ph, paintingPoint(turned, W, H)), fingerprintOf(paint)), 'turned, it is a different picture: the photo was upright')
})

// ---- The crop screen holds still ----------------------------------------------------------------
test('zoomed in, the view stays framed where it was while the box moves, until the box leaves the stage', () => {
  const W = 1600, H = 1200, crop = { turn: 0, angle: 0, cx: 800, cy: 600, w: 800, h: 600 }
  const framed = viewOf(crop, W, H, 400, 300, { zoom: true })
  const moved = { ...crop, w: 700, cx: 750 }
  const held = viewOf(moved, W, H, 400, 300, { zoom: true, frame: crop })
  assert.deepEqual(held.matrix, framed.matrix, 'the photo hasn’t moved under the finger')
  assert.equal(held.k, framed.k)
  assert.ok(held.box.width < framed.box.width, 'only the box changed')
  assert.ok(fitsStage(held.box, 400, 300, { zoom: true }))
  const out = viewOf({ ...crop, w: 1500, h: 1100 }, W, H, 400, 300, { zoom: true, frame: crop })
  assert.equal(fitsStage(out.box, 400, 300, { zoom: true }), false, 'a box grown off the stage is reframed')
  assert.equal(fitsStage({ left: 150, top: 120, width: 40, height: 30 }, 400, 300, { zoom: true }), false, 'and one lost in the middle')
  assert.ok(sameCrop(crop, { ...crop, cx: 800.2 })); assert.ok(!sameCrop(crop, moved))
})

test('the crop screen picks up on a first tap, can be undone, and has thirds to line up against', () => {
  const s = read('src/places/lifelist/Cropper.jsx')
  assert.match(s, /picking/, 'the first tap only picks it up')
  assert.match(s, /e\.ctrlKey \|\| e\.metaKey/, 'Ctrl or ⌘ Z undoes')
  assert.match(s, /onClick=\{undo\}/); assert.match(s, /onClick=\{redo\}/)
  assert.match(s, /ll-crop-grid/)
  assert.doesNotMatch(s, /const change = \(next\) => \{ setZoom\(true\)/, 'nothing zooms by itself')
  const css = read('src/places/lifelist/addpaintings.css')
  assert.match(css, /\.ll-crop-grid \{[^}]*33\.33%/)
})

// ---- Months by her signature ---------------------------------------------------------------------
test('a month is read from what she wrote by her signature, never from the season it shows', () => {
  const m = (written, extra = {}) => monthFromReading({ written, legible: 'clear', month: 0, ...extra })
  assert.deepEqual(m('6/21'), { month: 6, from: 'signature' })
  assert.deepEqual(m('June 2019'), { month: 6, from: 'signature' })
  assert.deepEqual(m("Mar '19"), { month: 3, from: 'signature' })
  assert.deepEqual(m('10.2018'), { month: 10, from: 'signature' })
  assert.deepEqual(m('6/12/21'), { month: 6, from: 'signature' }, 'month, day, year, the American way round')
  assert.deepEqual(m('2019/06'), { month: 6, from: 'signature' })
  assert.deepEqual(m('Sept 2019'), { month: 9, from: 'signature' })
  assert.deepEqual(m('2019'), { month: null, from: null }, 'a bare year has no month')
  assert.deepEqual(m("'19", { month: 10 }), { month: null, from: null }, 'nor does Claude get to add one to a bare year')
  assert.deepEqual(m('Decorated 2019'), { month: null, from: null })
  assert.deepEqual(m('6/21', { legible: 'unsure' }), { month: 6, from: 'unsure' })
  assert.deepEqual(m('6/21', { month: 7 }), { month: 6, from: 'unsure' }, 'what she wrote wins, and a disagreement is flagged')
  assert.deepEqual(monthFromReading({ written: '6/21', legible: 'none' }), { month: null, from: null })
  assert.deepEqual(yearFromReading({ written: '6/21', legible: 'clear', year: 2021 }, 2026), { year: 2021, from: 'signature' })
  assert.equal(cleanMonth('7'), 7); assert.equal(cleanMonth(13), null); assert.equal(cleanMonth(''), null)
  assert.equal(paintedWords(2019, 6), 'June 2019'); assert.equal(paintedWords(2019, null), '2019'); assert.equal(paintedWords(null, 6), '')
})

test('a reading fills in the month, the shape and Claude’s words only where nobody has set their own', () => {
  const item = { id: 'x', title: '', year: '', month: null, medium: '', seasons: [], touched: {}, crop: wholeCrop(400, 300), W: 400, H: 300 }
  const reading = { signature: 'LH', written: '6/21', year: 2021, month: 6, legible: 'clear', title: 'Autumn pond', medium: 'oil on canvas', seasons: ['fall'], turn: 0, shape: 'round', subjects: ['Pond', 'pond', 'tree'], moods: ['calm', 'nope'], style: 'folk', weather: 'none' }
  const next = applyReading(item, reading, 2026)
  assert.equal(next.month, 6); assert.equal(next.monthFrom, 'signature')
  assert.deepEqual(next.shape, { kind: 'round' }); assert.equal(next.shapeFrom, 'claude')
  assert.deepEqual(next.looks, { subjects: ['pond', 'tree'], moods: ['calm'], style: 'folk', weather: '' })
  const mine = applyReading({ ...item, month: 2, shape: { kind: 'hexagon' }, touched: { month: true, shape: true, looks: true } }, reading, 2026)
  assert.equal(mine.month, 2); assert.deepEqual(mine.shape, { kind: 'hexagon' }); assert.equal(mine.looks, undefined)
  for (const k of ['month', 'monthFrom', 'shape', 'looks', 'print', 'replace', 'dupOk']) assert.ok(SYNCED.includes(k), `${k} travels with a waiting photo`)
  assert.equal(slugFor('Look again', ['look-again']), 'look-again-2'); assert.equal(slugFor('look-again'), 'look-again-2', 'the look-again screen keeps its address')
})

test('looking her gallery over again suggests only what isn’t kept, and never takes away what is', () => {
  const r = { written: '6/19', year: 2019, month: 6, legible: 'clear', shape: 'hexagon', subjects: ['cat'], moods: ['cozy'], style: 'none', weather: 'rainy' }
  const s = lookProposals({ year: 2019, month: null, shape: null }, r, 2026)
  assert.deepEqual(s.month, { value: 6, sure: true, written: '6/19', was: null })
  assert.equal(s.year, undefined, 'a year already kept is never suggested again')
  assert.deepEqual(s.shape, { value: { kind: 'hexagon' }, sure: true })
  assert.deepEqual(s.looks.value, { subjects: ['cat'], moods: ['cozy'], style: '', weather: 'rainy' })
  assert.equal(lookProposals({ year: 2019, month: 6, shape: { kind: 'round' } }, r, 2026).month, undefined, 'the same month changes nothing')
  assert.equal(lookProposals({ year: 2019, month: null, shape: { kind: 'round' } }, r, 2026).shape, undefined, 'a shape a parent chose stays')
  const other = lookProposals({ year: 2017, month: null }, r, 2026)
  assert.equal(other.month, undefined, 'a month read with a different year than the one kept is left alone')
  const none = lookProposals({ year: null }, { ...r, written: '6/19' }, 2026)
  assert.equal(none.year.value, 2019); assert.equal(none.month.value, 6)
  assert.deepEqual(lookProposals({}, null, 2026), {})
})

// ---- Finding and sorting her paintings --------------------------------------------------------
const P = (slug, o = {}) => ({ slug, title: slug.replace(/-/g, ' '), named: false, seasons: [], added: '2026-11-01', w: 100, h: 100, ...o })
const pal = (k, light = 0.5) => ({ fam: { ...Object.fromEntries(FAMILY_ORDER.map((f) => [f, 0])), [k]: 0.9 }, light, vivid: 0.6, hue: { red: 0, orange: 30, yellow: 55, green: 120, blue: 220, purple: 270, pink: 320 }[k] ?? null, swatches: [] })
const LIST = [
  P('blue-cat', { year: 2022, month: 3, medium: 'Watercolor on paper', palette: pal('blue'), looks: { subjects: ['cat'], moods: ['cozy'], style: '', weather: 'rainy' }, seasons: ['winter'] }),
  P('red-barn', { year: 2022, medium: 'Acrylic on canvas', palette: pal('red'), looks: { subjects: ['barn'], moods: ['joyful'], style: '', weather: 'sunny' }, seasons: ['fall'] }),
  P('cat-nap', { year: 2019, medium: 'Oil on canvas', palette: pal('orange'), looks: { subjects: ['cat'], moods: ['cozy'], style: '', weather: '' }, shape: { kind: 'round' } }),
  P('blue-sea', { year: 2022, medium: 'watercolour', palette: pal('blue'), looks: { subjects: ['sea'], moods: ['calm'], style: '', weather: '' } }),
  P('mystery', { palette: pal('neutral', 0.2) }),
]

test('the gallery can be narrowed by colour, mood, what it shows, year, season, medium and shape', () => {
  const f = facetsOf(LIST)
  assert.deepEqual(f.colour.map((c) => c.key), ['red', 'orange', 'blue', 'neutral'], 'colours in the rainbow’s order')
  assert.deepEqual(f.subject.map((c) => c.key), ['cat'], 'a subject needs two paintings to be a choice')
  assert.deepEqual(f.year.map((c) => [c.key, c.n]), [['2022', 3], ['2019', 1]])
  assert.deepEqual(f.shape.map((c) => c.key), ['round'])
  assert.deepEqual(f.medium.map((c) => c.key).sort(), ['Acrylic', 'Oil', 'Watercolor'])
  assert.deepEqual(applyFilters(LIST, { colour: 'blue', subject: 'cat' }).map((p) => p.slug), ['blue-cat'])
  assert.deepEqual(applyFilters(LIST, { mood: 'cozy' }).map((p) => p.slug), ['blue-cat', 'cat-nap'])
  assert.deepEqual(applyFilters(LIST, { q: 'cat 2022' }).map((p) => p.slug), ['blue-cat'], 'every word typed must be found')
  assert.deepEqual(applyFilters(LIST, { q: 'blues' }).map((p) => p.slug), ['blue-cat', 'blue-sea'], 'colours can be typed')
  assert.equal(filterCount({ colour: 'blue', q: ' ' }), 1)
  assert.equal(mediumWord('Watercolour on paper'), 'Watercolor'); assert.equal(mediumWord('Mixed media and collage'), 'Mixed media'); assert.equal(mediumWord('Tempera'), 'Other'); assert.equal(mediumWord(''), '')
})

test('her paintings sort newest in, by when she painted them, as a rainbow, A to Z or shuffled', () => {
  assert.deepEqual(sortPaintings(LIST, 'painted').map((p) => p.slug), ['blue-cat', 'red-barn', 'blue-sea', 'cat-nap', 'mystery'], 'March 2022 before plain 2022; unknown years last')
  assert.deepEqual(sortPaintings(LIST, 'oldest').map((p) => p.slug).slice(0, 1), ['cat-nap'])
  assert.equal(sortPaintings(LIST, 'oldest').at(-1).slug, 'mystery', 'unknown years go last either way')
  assert.deepEqual(sortPaintings(LIST, 'rainbow').map((p) => p.slug), ['red-barn', 'cat-nap', 'blue-cat', 'blue-sea', 'mystery'])
  assert.deepEqual(sortPaintings(LIST, 'title').map((p) => p.slug)[0], 'blue-cat')
  assert.deepEqual(sortPaintings(LIST, 'shuffle', 3), sortPaintings(LIST, 'shuffle', 3), 'a shuffle holds still until shuffled again')
  assert.deepEqual(sortPaintings(LIST, 'added'), LIST)
})

test('Claude’s words are kept only from the list, at most six things, three moods, one style and one weather', () => {
  assert.deepEqual(cleanLooks({ subjects: ['Cat', 'cat', ' <b>dog</b> ', 'a', 'owl', 'yew', 'zinnia', 'wren', 'vole'], moods: ['cozy', 'evil', 'calm', 'bold', 'dreamy'], style: 'cubist', weather: 'none' }),
    { subjects: ['cat', 'b dog /b', 'owl', 'yew', 'zinnia', 'wren'], moods: ['cozy', 'calm', 'bold'], style: '', weather: '' })
  assert.equal(cleanLooks({ subjects: [], moods: [] }), null)
  assert.deepEqual(Object.keys(MOODS), LOOK_MOODS, 'the function asks for the moods the app understands')
  assert.deepEqual(Object.keys(STYLES), LOOK_STYLES)
  assert.deepEqual(Object.keys(WEATHERS), LOOK_WEATHERS)
})

// ---- The featured wall ---------------------------------------------------------------------------
test('the featured wall changes every three days, and the app makes its own from her paintings’ facts', () => {
  const w = featureWindow('2026-11-08')
  assert.ok(w.from <= '2026-11-08' && '2026-11-08' <= w.to)
  assert.equal(featureWindow(w.from).n, w.n); assert.equal(featureWindow(w.to).n, w.n)
  const many = Array.from({ length: 12 }, (_, i) => P(`p${i}`, { year: i < 6 ? 2022 : 2018 + (i % 3), palette: pal(i % 2 ? 'blue' : 'red'), seasons: i < 5 ? ['fall'] : [] }))
  const all = localFeatures(many, '2026-11-08')
  assert.ok(all.some((f) => f.key === 'year:2022' && f.title === 'All painted in 2022'))
  assert.ok(all.some((f) => f.key === 'colour:blue' && f.title === 'Feeling blue'))
  assert.ok(all.some((f) => f.key === 'season:fall'), 'the season we’re in')
  assert.ok(all.every((f) => f.slugs.length >= 3))
  const a = appFeature(many, '2026-11-08')
  assert.deepEqual(appFeature(many, w.to), a, 'the same all window long')
  assert.ok(a.slugs.length >= 4 && a.slugs.length <= 8); assert.equal(a.by, 'app'); assert.equal(a.until, w.to)
  assert.notEqual(appFeature(many, featureWindow('2026-11-08').to.replace(/\d\d$/, (d) => String(+d + 1).padStart(2, '0'))).key, a.key, 'the next window hangs a different wall')
  assert.equal(appFeature([P('one')], '2026-11-08'), null)
  assert.deepEqual(seasonsOn('2026-11-08'), ['fall'])
  assert.ok(seasonsOn('2026-11-25').includes('thanksgiving'))
})

test('Claude’s wall is up only between its days, with only paintings still in her gallery', () => {
  const rows = [
    { id: 'old', title: 'Old', slugs: ['blue-cat', 'red-barn', 'cat-nap'], made_on: '2026-11-01', until: '2026-11-03', created_at: '2026-11-01T10:00:00Z' },
    { id: 'now', title: 'For a rainy day', line: 'Hi', slugs: ['blue-cat', 'gone', 'blue-sea', 'mystery'], made_on: '2026-11-07', until: '2026-11-09', created_at: '2026-11-07T10:00:00Z' },
  ]
  const f = claudeFeature(rows, LIST, '2026-11-08')
  assert.equal(f.id, 'now'); assert.deepEqual(f.slugs, ['blue-cat', 'blue-sea', 'mystery']); assert.equal(f.by, 'claude')
  assert.equal(claudeFeature(rows, LIST, '2026-11-10'), null, 'none up after its last day')
  assert.equal(claudeFeature([{ ...rows[1], slugs: ['blue-cat', 'gone'] }], LIST, '2026-11-08'), null, 'too few left to be a wall')
})

test('Claude chooses a wall from facts, never pictures, and its answer is checked before it’s kept', () => {
  const t = TASKS['feature-paintings']
  assert.equal(t.who, 'family'); assert.ok(!t.upload && !t.uploads, 'no picture goes with it')
  assert.match(t.says, /weather/); assert.match(t.says, /concerts/)
  const cat = catalogOf(LIST)
  assert.deepEqual(Object.keys(cat[0]).sort(), ['colours', 'feel', 'medium', 'month', 'moods', 'seasons', 'shape', 'shows', 'slug', 'style', 'title', 'weather', 'year'].sort())
  const ask = featureAsk({ catalog: cat, context: { today: '2026-11-08', weather: 'Light rain, 58°F now', coming: ['a concert on 2026-11-12: Goose'], seasons: ['Fall'], recent: ['Feeling blue'] } })
  assert.match(ask, /blue-cat \| blue cat \| 3\/2022 \| Watercolor on paper/)
  assert.match(ask, /Weather at home now: Light rain, 58°F now/); assert.match(ask, /Goose/); assert.match(ask, /choose something different\): Feeling blue/)
  assert.match(ask, /never claim a painting shows something its line doesn't say/)
  assert.doesNotMatch(catalogLine({ slug: 'a<b>', title: 'x\u0000y' }), /[<>\u0000]/)
  assert.deepEqual(cleanFeatureContext({ today: 'nope', coming: ['x'.repeat(200)], weather: 5 }).today, '')
  assert.equal(cleanFeatureContext({ coming: ['x'.repeat(200)] }).coming[0].length, 90)
  assert.deepEqual(cleanFeature({ title: '"For a rainy day"', line: 'L', why: 'It’s raining', slugs: ['blue-cat', 'nope', 'blue-cat', 'blue-sea', 'mystery'], days: 9 }, cat.map((p) => p.slug)),
    { title: 'For a rainy day', line: 'L', why: 'It’s raining', slugs: ['blue-cat', 'blue-sea', 'mystery'], days: 4 })
  assert.equal(cleanFeature({ title: 'x', slugs: ['blue-cat', 'nope'] }, ['blue-cat']), null)
  assert.equal(cleanFeature({ title: '', slugs: ['a', 'b', 'c'] }, ['a', 'b', 'c']), null)
  assert.equal(weatherLine({ words: 'Rain', temp: 55 }, { rain: 80 }), 'Rain, 55°F now; 80% chance of rain today')
  assert.equal(weatherLine(null), '')
  assert.deepEqual(comingFor([{ kind: 'show', starts_on: '2026-11-12', title: 'Goose' }, { kind: 'family', starts_on: '2026-11-10', title: 'A birthday' }], '2026-11-08'), ['a concert on 2026-11-12: Goose'], 'concerts only: never a family day')
  for (const s of [FEATURE_SCHEMA, LOOK_SCHEMA, PAINTING_SCHEMA]) {
    assert.equal(s.additionalProperties, false); assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort())
  }
})

test('a painting read when it’s added, or looked at again, asks for the month, the shape and the words', () => {
  assert.ok(['month', 'shape', 'subjects', 'moods', 'style', 'weather'].every((k) => k in PAINTING_SCHEMA.properties))
  assert.equal(TASKS['look-painting'].who, 'parent'); assert.equal(TASKS['look-painting'].uploads, 5)
  assert.ok(!('title' in LOOK_SCHEMA.properties) && !('medium' in LOOK_SCHEMA.properties), 'a second look never retitles her painting')
  const again = lookAsk({ year: 2026 })
  assert.match(again, /never a month from the season it shows/); assert.match(again, /Never a person's name/); assert.match(again, /it is 2026 now/)
  assert.match(again, /^6\. In moods/m, 'its steps are numbered in order')
  assert.match(paintingAsk({ year: 2026 }), /^7\. In month/m)
})

test('the screens that send her paintings to Claude say so first', () => {
  assert.match(read('src/places/lifelist/LookAgain.jsx'), /go to Claude \(Anthropic\)/)
  assert.match(read('src/places/lifelist/Gallery.jsx'), /Claude is sent her paintings’ titles/)
  assert.match(read('src/places/lifelist/AddPaintings.jsx'), /the shape of its canvas/)
})

// ---- Autumn's wind, from any painting ------------------------------------------------------------
test('leaves are cut only from her warm, brushy foliage, and each knows where it came from', () => {
  // A made-up autumn scene: sky above, warm brushwork below
  const W = 600, H = 600, data = new Uint8ClampedArray(W * H * 4)
  let s = 3
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, base = y < 200 ? [90, 140, 210] : [[200, 60, 30], [225, 120, 30], [230, 190, 50]][Math.floor(x / 100) % 3]
    for (let c = 0; c < 3; c++) data[i + c] = base[c] + (y < 200 ? 0 : (r() - 0.5) * 60)
    data[i + 3] = 255
  }
  const px = { data, width: W, height: H }
  const out = cutLeaves(px, { count: 12 })
  assert.ok(out.boxes.length >= 8, `${out.boxes.length} leaves`)
  assert.equal(out.boxes.length, out.origins.length)
  assert.ok(out.origins.every(([, y]) => y > 200 / H), 'none from the sky')
  assert.ok(out.sheet.width <= 2048)
  assert.equal(out.sheet.data.length, out.sheet.width * out.sheet.height * 4)
  // Each leaf on the sheet is her own pixels: where it's opaque, it's exactly the painting at its origin
  const [bx, by, bw, bh] = out.boxes[0], [ox, oy] = out.origins[0]
  const cx = Math.round(bx + bw / 2), cy = Math.round(by + bh / 2), si = (cy * out.sheet.width + cx) * 4
  const px0 = Math.round(ox * W - bw / 2 + (cx - bx)), py0 = Math.round(oy * H - bh / 2 + (cy - by)), pi = (py0 * W + px0) * 4
  assert.equal(out.sheet.data[si + 3], 255, 'its middle is solid')
  assert.deepEqual([...out.sheet.data.slice(si, si + 3)], [...data.slice(pi, pi + 3)], 'and is her pixel, untouched')
  assert.equal(cutLeaves(flat(300, 300, [90, 140, 210])).boxes.length, 0, 'a painting with no autumn colour gives none')
  assert.equal(warmMask(flat(20, 20, [220, 90, 30])).every((v) => v === 1), true)
  const row = leavesRow(out, { workWidth: 600, workHeight: 600, paintingWidth: 1200, today: '2026-11-08', seed: 5 })
  assert.equal(row.originScale, 2); assert.deepEqual(row.scale, [0.7, 1.15]); assert.equal(row.origins.length, out.boxes.length)
})

test('the wind takes leaves from any autumn painting that has had them cut, so a new photo of one gets the show back', () => {
  const fresh = { slug: 'golden-creek', title: 'Golden creek', seasons: ['fall'], w: 2000, h: 2000, focus: [0, 0, 1, 1], leaves: { sheet: 'x.png', size: [100, 50], boxes: [[0, 0, 10, 10]], px: 2.2, scale: [0.7, 1.15], origins: [[0.5, 0.8]], originScale: 1.1 } }
  const witch = PAINTINGS.find((p) => p.slug === 'witch-and-crow')
  const s = showFor('fall', [fresh, witch])
  assert.equal(s.painting.slug, 'golden-creek', 'the old autumn paintings gone, the new photo’s leaves are used')
  assert.deepEqual(s.sheets[0].origins, { scale: 1.1, origins: [[0.5, 0.8]] })
  assert.equal(homePainting('fall', [witch, fresh]).slug, 'golden-creek', 'and it hangs on Home in autumn')
  assert.equal(showFor('fall', [{ ...fresh, seasons: ['summer'] }, witch]).painting.slug, 'witch-and-crow', 'only an autumn painting’s leaves')
  assert.deepEqual(originsOf(PAINTINGS.find((p) => p.slug === 'autumn-pond')).origins.length, 20, 'the first two keep the origins the script measured')
  const both = showFor('fall', PAINTINGS)
  assert.deepEqual(both.sheets.map((x) => x.slug), ['autumn-stream', 'autumn-pond'])
})

// ---- What's kept with a painting ------------------------------------------------------------------
test('a stored painting brings its month, shape, colours, fingerprint and kept words with it', () => {
  const p = fromRow({ slug: 'a', title: 'A', named: false, year: 2019, month: 6, w: 10, h: 10, shape: { kind: 'round' }, palette: { fam: { red: 0.5 }, swatches: [] }, print: 'a8'.repeat(44), looks: { subjects: ['cat'], moods: [] } }, {})
  assert.equal(p.month, 6); assert.deepEqual(p.shape, { kind: 'round' }); assert.equal(p.palette.fam.red, 0.5); assert.equal(p.print, 'a8'.repeat(44)); assert.deepEqual(p.looks.subjects, ['cat'])
  const q = fromRow({ slug: 'b', title: 'B', w: 1, h: 1, print: 'nope' }, {})
  assert.equal(q.print, null); assert.equal(q.shape, null); assert.equal(q.looks, null); assert.equal(q.month, null)
})

test('the migration adds the columns and the walls table the way the rules say', () => {
  const f = readdirSync(root + 'supabase/migrations').find((x) => x.includes('gallery_shapes_months_features'))
  const sql = read('supabase/migrations/' + f).replace(/--.*$/gm, '')
  for (const c of ['month', 'shape', 'palette', 'print', 'looks']) assert.match(sql, new RegExp(`alter table public\\.paintings add column if not exists ${c}\\b`))
  assert.match(sql, /alter table public\.annas_drawings add column if not exists print/)
  assert.match(sql, /create policy gallery_features_read[^;]+is_family/)
  assert.doesNotMatch(sql, /gallery_features for (insert|update)/, 'only the function writes a wall')
  assert.doesNotMatch(sql, /grant[^;]*(insert|update)[^;]*gallery_features/)
})
