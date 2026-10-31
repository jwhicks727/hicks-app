import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { PAINTINGS, paintingBySlug, paintingFor, cropFor, boxIn, flightPoints, birdAt, along, progress, toRow, fromRow, storedPaths } from '../src/lib/paintings.js'
import { SEASONS, seasonByKey } from '../src/lib/seasons.js'
import { SHOWS, showFor, leafPerches, dropOf, dropGap, PERCHES, MAX_DROPS } from '../src/lib/seasonShows.js'

const pub = (f) => new URL('../public' + f, import.meta.url)

test('every painting is here with its files, and nothing about it is guessed', () => {
  const slugs = PAINTINGS.map((p) => p.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  for (const p of PAINTINGS) {
    for (const f of [p.src, p.small, p.flyer && p.flyer.sprite, p.flyer && p.flyer.sky].filter(Boolean)) {
      assert.ok(existsSync(pub(f)), f)
      assert.ok(statSync(pub(f)).size < 700_000, `${f} is small enough for a phone`)
    }
    assert.ok(p.title && typeof p.named === 'boolean', p.slug)
    for (const s of p.seasons) assert.ok(SEASONS[s], `${p.slug}: ${s}`)
    const [l, t, r, b] = p.focus
    assert.ok(l >= 0 && t >= 0 && r <= 1 && b <= 1 && l < r && t < b, p.slug)
    if (p.flyer) for (const box of [p.flyer.at, p.flyer.skyAt]) assert.ok(box[0] >= 0 && box[1] >= 0 && box[0] + box[2] <= 1 && box[1] + box[3] <= 1, p.slug)
    // The patch of sky covers the whole bird
    if (p.flyer) {
      const [bx, by, bw, bh] = p.flyer.at, [sx, sy, sw, sh] = p.flyer.skyAt
      assert.ok(sx <= bx && sy <= by && sx + sw >= bx + bw && sy + sh >= by + bh, `${p.slug}: the sky patch hides the bird`)
    }
  }
  assert.equal(paintingBySlug('nope'), null)
})

test('her painting hangs in its season, and a season without one falls back to her newest', () => {
  // Her leaves fall in fall; a season with none of her paintings has no show
  assert.equal(showFor('fall').painting.slug, 'witch-and-crow')
  assert.equal(showFor('christmas'), null)
  // The leaves rest along the top edge and let go one at a time, slowly
  const show = showFor('halloween'), perches = leafPerches(show, 7)
  assert.equal(perches.length, PERCHES)
  assert.deepEqual(perches, leafPerches(show, 7), 'the same leaves for the same day')
  for (const p of perches) assert.ok(p.leaf.length === 4 && p.x >= 5 && p.x <= 93 && Math.abs(p.tilt) <= 45)
  const xs = perches.map((p) => p.x)
  assert.deepEqual(xs, xs.slice().sort((a, b) => a - b), 'spread across the top, left to right')
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] > 3, 'never bunched')
  for (const r of [() => 0, () => 0.5, () => 0.999]) {
    const d = dropOf(show, perches[0], r)
    assert.ok(d.dur >= 20 && d.dur <= 28, 'a slow fall: twenty to twenty-eight seconds')
    assert.ok(dropOf(showFor('muertos'), perches[0], r).dur >= 26, 'slower still for the Day of the Dead')
    assert.ok(dropGap(show, r) >= 9 && dropGap(show, r) <= 17, 'one every nine to seventeen seconds')
  }
  assert.ok(MAX_DROPS >= 12 && MAX_DROPS <= 60)
  assert.ok(existsSync(pub(paintingBySlug('witch-and-crow').leaves.sheet)))
  assert.equal(seasonByKey('halloween').key, 'halloween')
  assert.equal(seasonByKey('nope'), null)
  assert.equal(paintingFor('halloween').slug, 'witch-and-crow')
  assert.equal(paintingFor('lent'), PAINTINGS[0])
})

test('a crop fills its frame and keeps the focus in view', () => {
  const p = paintingBySlug('witch-and-crow')
  for (const [W, H] of [[358, 286], [460, 345], [300, 400]]) {
    const c = cropFor(p, W, H, p.focus)
    assert.ok(c.left <= 0 && c.top <= 0 && c.left + c.width >= W - 0.01 && c.top + c.height >= H - 0.01, `${W}x${H} covered`)
    const crow = boxIn(c, p.flyer.at)
    assert.ok(crow.left >= -1 && crow.top >= -1 && crow.left + crow.width <= W + 1 && crow.top + crow.height <= H + 1, `${W}x${H}: the crow's place is in the frame`)
  }
  // A wide frame stays centred on the focus: the witch is in it as well as the crow
  const wide = cropFor(p, 460, 343, p.focus)
  assert.ok(wide.left < -40 && wide.left + 0.8 * wide.width <= 460, JSON.stringify(wide))
  const whole = cropFor(p, 300, 400)
  assert.deepEqual([whole.left, whole.top, whole.width, whole.height], [0, 0, 300, 400])
})

test('the flight ends exactly at the bird’s place, facing as painted, wings still', () => {
  const to = { x: 120, y: 410 }, pts = flightPoints(390, 844, to)
  assert.ok(pts[0].x > 390, 'starts off the screen')
  assert.deepEqual(pts.at(-1), to)
  const end = birdAt(pts, 1, { land: 80, faces: 'right' })
  // Far off and small at first, growing as it comes
  const start = birdAt(pts, 0.05, { land: 80 }), mid = birdAt(pts, 0.5, { land: 80 })
  assert.ok(start.size < mid.size && mid.size < 80 && start.size < 30, `${start.size} ${mid.size}`)
  assert.ok(Math.abs(end.x - to.x) < 1e-6 && Math.abs(end.y - to.y) < 1e-6)
  assert.equal(end.size, 80); assert.equal(end.flap, 1); assert.equal(end.dir, 1); assert.ok(Math.abs(end.tilt) < 1e-6)
  assert.equal(progress(0), 0); assert.equal(progress(1), 1)
  // It goes round the screen on the way: somewhere left, right, high and low of the place
  const seen = Array.from({ length: 200 }, (_, i) => along(pts, i / 199))
  assert.ok(Math.min(...seen.map((s) => s.x)) < 80 && Math.max(...seen.map((s) => s.x)) > 300 && Math.min(...seen.map((s) => s.y)) < 120)
})

test('a painting stored behind sign-in comes back in the same shape, its files by signed link', () => {
  const p = paintingBySlug('witch-and-crow'), row = toRow(p)
  assert.equal(row.flyer.sprite, undefined, 'no public path is stored'); assert.equal(row.leaves.sheet, undefined)
  const paths = storedPaths(p.slug, row)
  assert.deepEqual(Object.values(paths).sort(), ['witch-and-crow/flyer.png', 'witch-and-crow/full.jpg', 'witch-and-crow/leaves.png', 'witch-and-crow/sky.png', 'witch-and-crow/small.jpg'])
  const urls = Object.fromEntries(Object.values(paths).map((x) => [x, 'https://signed/' + x]))
  const back = fromRow({ ...row, seasons: row.seasons }, urls)
  assert.equal(back.src, 'https://signed/witch-and-crow/full.jpg')
  assert.deepEqual(back.flyer.at, p.flyer.at); assert.equal(back.flyer.sprite, 'https://signed/witch-and-crow/flyer.png')
  assert.deepEqual(back.leaves.boxes, p.leaves.boxes)
  assert.equal(showFor('fall', [back]).painting.slug, 'witch-and-crow')
  assert.equal(showFor('fall', []), null, 'no paintings, no show')
  const plain = storedPaths('new-one', { flyer: null, leaves: null })
  assert.deepEqual(Object.keys(plain).sort(), ['small', 'src'])
})

test('the hosted app never ships her paintings: firebase.json leaves them out', async () => {
  const { readFileSync } = await import('node:fs')
  const fb = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'))
  assert.ok(fb.hosting.ignore.includes('paintings/**'))
})

test('leading down: the page follows the bird to a place below the fold, and leaves one in view alone', async () => {
  const { leadTo, followAt } = await import('../src/lib/paintings.js')
  assert.equal(leadTo(0, 400, 844, 2000), 0) // comfortably in view: no scroll
  assert.equal(leadTo(0, 1100, 844, 2000), Math.round(1100 - 844 * 0.48)) // below the fold: its place comes to about mid-screen
  assert.equal(leadTo(0, 1500, 844, 500), 500) // a short page: as far as it goes
  assert.equal(leadTo(300, -200, 844, 2000), 0) // above: back up, never past the top
  assert.equal(followAt(0), 0)
  assert.equal(followAt(0.28), 0) // nothing while the bird is still at the top
  assert.equal(followAt(0.78), 1) // arrived before the landing
  assert.equal(followAt(1), 1)
  let last = 0
  for (let t = 0; t <= 1; t += 0.05) { const f = followAt(t); assert.ok(f >= last - 1e-12); last = f }
})
