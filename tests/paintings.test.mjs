import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { PAINTINGS, paintingBySlug, paintingFor, cropFor, boxIn, flightPoints, birdAt, along, progress } from '../src/lib/paintings.js'
import { SEASON_ART, SEASONS, seasonByKey, seasonFor } from '../src/lib/seasons.js'
import { SHOWS, showFor, leafFalls, showLength } from '../src/lib/seasonShows.js'

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
  assert.equal(SEASON_ART.halloween, paintingBySlug('witch-and-crow').src)
  assert.equal(seasonFor('2026-10-20').art, SEASON_ART.halloween)
  // Her leaves fall in fall; a season with none of her paintings has no show
  assert.equal(showFor('fall').painting.slug, 'witch-and-crow')
  assert.equal(showFor('christmas'), null)
  const falls = leafFalls(showFor('halloween'), 7)
  assert.equal(falls.length, SHOWS.halloween.count)
  assert.deepEqual(falls, leafFalls(showFor('halloween'), 7), 'the same leaves for the same day')
  for (const f of falls) assert.ok(f.leaf.length === 4 && f.dur > 0 && f.x0 >= 0 && f.x0 <= 100)
  assert.ok(showLength(falls) < 20000)
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
