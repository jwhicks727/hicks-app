import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { windOf, pushOf, gustPlan, gustAt, delayAt, windAt, originInFrame, paintedWidth, stirOf, GUSTS, MAX_AIR, MAX_RESTING, SHOW_SECONDS } from '../src/lib/wind.js'
import { LEAF_ORIGINS } from '../src/lib/leafOrigins.js'
import { SHOWS, showFor } from '../src/lib/seasonShows.js'
import { paintingBySlug } from '../src/lib/paintings.js'

const root = new URL('..', import.meta.url).pathname
const read = (p) => readFileSync(join(root, p), 'utf8')
// A steady random source, so the plans are the same every run
const seeded = (s = 1) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }

test('the wind blows the way it really does: from the east carries a leaf left, from the west right', () => {
  assert.equal(windOf({ speed: 10, gusts: 18, dir: 90 }).side, -1)
  assert.equal(windOf({ speed: 10, gusts: 18, dir: 270 }).side, 1)
  assert.equal(windOf({ speed: 10, gusts: 18, dir: 250 }).side, 1)
  const north = windOf({ speed: 10, gusts: 18, dir: 0 })
  assert.equal(north.across, 0.3, 'a north wind still carries a leaf a little sideways on a flat screen')
  assert.equal(windOf({ speed: 10, gusts: 18, dir: 90 }).across, 1)
})

test('how strong it feels comes from its speed, and gusts are never slower than the wind', () => {
  assert.deepEqual([2, 8, 16, 30].map((s) => windOf({ speed: s, dir: 90 }).level), ['calm', 'breeze', 'windy', 'gale'])
  assert.equal(windOf({ speed: 14, gusts: 9, dir: 90 }).gusts, 14)
  const none = windOf(null)
  assert.equal(none.known, false, 'with no reading it says so, and blows a calm: nothing invented')
  assert.equal(none.level, 'calm')
})

test('the push is measured against the screen, so a gust takes seconds to cross a phone and doesn’t race a desktop', () => {
  const w = windOf({ speed: 16, gusts: 28, dir: 90 })
  const phone = pushOf(w, 390), desk = pushOf(w, 1280), tiny = pushOf(w, 200)
  assert.ok(phone.base < phone.peak)
  assert.equal(desk.base, pushOf(w, 900).base, 'wide screens are measured as 900 px')
  assert.equal(tiny.base, pushOf(w, 360).base, 'narrow ones as 360 px')
  assert.ok(390 / phone.peak > 1.2 && 390 / phone.peak < 4, 'a windy gust crosses a phone in a second or few')
  const breeze = pushOf(windOf({ speed: 8, gusts: 14, dir: 90 }), 390)
  assert.ok(390 / breeze.base > 4, 'a breeze takes its time')
  assert.ok(pushOf(windOf({ speed: 30, gusts: 45, dir: 90 }), 390).peak <= 0.9 * 390)
  assert.ok(pushOf(windOf({ speed: 16, gusts: 28, dir: 0 }), 390).base < phone.base, 'a north wind crosses more slowly')
})

test('a visit has a few gusts, more on a windier day, the first a moment after the page opens, and then it stops', () => {
  for (const [level, speed] of [['calm', 2], ['breeze', 8], ['windy', 16], ['gale', 30]]) {
    const plan = gustPlan(windOf({ speed, dir: 90 }), seeded(7))
    assert.equal(plan.length, GUSTS[level].count, level)
    assert.equal(plan[0].at, 2.5)
    for (const [i, g] of plan.entries()) {
      assert.ok(g.strength >= 0.6 && g.strength <= 1)
      if (i) assert.ok(g.at - plan[i - 1].at >= plan[i - 1].rise + plan[i - 1].hold + plan[i - 1].fall + GUSTS[level].gap[0] - 0.01, 'a lull between gusts')
      assert.ok(g.at < SHOW_SECONDS)
    }
  }
  assert.ok(GUSTS.gale.leaves > GUSTS.calm.leaves)
  assert.ok(MAX_AIR <= 30 && MAX_RESTING <= 12, 'a handful of leaves, never a flood')
})

test('a gust rises, holds and dies away, and reaches the far side of the screen later', () => {
  const plan = [{ at: 1, rise: 1, hold: 1, fall: 1, strength: 0.8 }]
  assert.equal(gustAt(plan, 0.5), 0)
  assert.ok(gustAt(plan, 1.5) > 0 && gustAt(plan, 1.5) < 0.8)
  assert.equal(gustAt(plan, 2.5), 0.8)
  assert.ok(gustAt(plan, 3.5) < 0.8 && gustAt(plan, 3.5) > 0)
  assert.equal(gustAt(plan, 4.1), 0)
  assert.equal(delayAt(0, 390, 1), 0, 'blowing right, it starts at the left edge')
  assert.equal(delayAt(390, 390, -1), 0, 'blowing left, at the right edge')
  assert.ok(delayAt(390, 390, 1) > 0.5)
  const w = windOf({ speed: 10, gusts: 20, dir: 90 }), push = pushOf(w, 390)
  assert.ok(windAt(w, push, plan, 2.5, 380, 390).x < -push.base, 'from the east, the push is leftward, strongest in the gust')
})

test('each autumn leaf lifts off from where she painted it: every one is measured, and in her painting', () => {
  for (const slug of ['autumn-pond', 'autumn-stream']) {
    const o = LEAF_ORIGINS[slug], p = paintingBySlug(slug)
    assert.ok(o, slug)
    assert.equal(o.origins.length, p.leaves.boxes.length, `${slug}: one origin for every leaf on its sheet`)
    assert.ok(o.scale > 0.8 && o.scale < 0.95, 'the flattened photos were a little larger than the painting files')
    for (const [x, y] of o.origins) assert.ok(x > 0 && x < 1 && y > 0 && y < 1)
  }
  assert.ok(LEAF_ORIGINS['autumn-pond'].origins.every(([, y]) => y < 0.5), 'the pond’s leaves come from its trees, above the water')
})

test('a leaf starts in the frame where the crop shows it, at the size it was painted', () => {
  const crop = { left: -50, top: -20, width: 400, height: 400 }
  assert.deepEqual(originInFrame(crop, [0.5, 0.5], 300, 240), { x: 150, y: 180 })
  assert.equal(originInFrame(crop, [0.05, 0.5], 300, 240), null, 'cropped out of view, so it blows in from the edge instead')
  assert.equal(paintedWidth([0, 0, 100, 50], 0.9, crop, 1600), 22.5)
})

test('a quick scroll stirs the resting leaves, a slow one leaves them be', () => {
  assert.equal(stirOf(400, 1), null)
  const s = stirOf(-2000, -1)
  assert.ok(s.up > 0 && s.up <= 260 && s.across < 0)
  assert.ok(stirOf(99999, 1).across <= 220)
})

test('autumn and Halloween are the wind, Thanksgiving gathers a garland, only the Day of the Dead’s leaves fall', () => {
  assert.equal(SHOWS.fall.kind, 'wind'); assert.equal(SHOWS.halloween.kind, 'wind')
  assert.equal(SHOWS.thanksgiving.kind, 'garland'); assert.equal(SHOWS.muertos.kind, 'leaves')
  assert.equal(showFor('fall').kind, 'wind')
  // Halloween's flurries are her witch's leaves alone, never an autumn painting's
  const h = showFor('halloween')
  assert.deepEqual(h.sheets.map((x) => x.slug), ['witch-and-crow'])
  assert.equal(showFor('thanksgiving').kind, 'garland')
})

test('the wind is transforms only, never takes a tap, and never plays under less motion', () => {
  const show = read('src/shell/WindShow.jsx'), season = read('src/shell/SeasonShow.jsx'), css = read('src/shell/season-show.css')
  assert.match(season, /const still = reducedMotion\(\)/, 'SeasonShow decides, through src/lib/motion.js')
  assert.match(season, /show\.kind === 'wind'\) return <WindShow/)
  assert.doesNotMatch(show, /matchMedia/)
  assert.doesNotMatch(show, /style\.(left|top|width|height|opacity) = .*(lf\.x|lf\.y)/, 'moving leaves change only their transform')
  assert.match(css, /\.wind-show \{[^}]*pointer-events: none/)
  assert.match(css, /html\[data-motion="less"\][^{]*\.wind-show \{ display: none; \}/)
  assert.doesNotMatch(css, /filter:\s*blur/)
})

test('the Art card hangs Anna’s drawing over a corner, keeps both galleries a tap away, and asks for a gust in autumn', () => {
  const card = read('src/parts/PaintingsCard.jsx')
  assert.match(card, /label="Art"/)
  assert.match(card, /data-art-cover/, 'the wind lifts no leaf from under her paper')
  assert.match(card, /to="\/lifelist\/paintings"/); assert.match(card, /to="\/drawings"/)
  assert.match(card, /hicks:wind-gust/); assert.match(card, /hicks:gust/)
  assert.match(read('src/parts/paintings.css'), /html\[data-motion="less"\] \.art-flap\.go \{ animation: none; \}/)
})
