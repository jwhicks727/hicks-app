import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LEAD_SECONDS, leadSeconds, cameraTo, samara, skipping, skipTouches, SKIPS, alongLine, fusePath, plinkoPath, plinkoAt, hopStops, hopAt, murmur, rosette, swag, buntingAnchors, LINGER, lingerGap } from '../src/lib/leads.js'
import { STYLES } from '../src/lib/harvest.js'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
const S = { x: 195, y: 40 }, E = { x: 220, y: 1500 }, o = { vw: 390, sec: 7 }
const near = (a, b, d = 2) => Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d

test('every show has a lead down to its painting and a subtle part that stays', () => {
  for (const s of STYLES) { assert.ok(LEAD_SECONDS[s] > 4, `${s} has a lead`); assert.ok(LINGER[s], `${s} has something that stays`) }
  assert.ok(leadSeconds('stream', 3000, 800) <= LEAD_SECONDS.stream * 1.5 && leadSeconds('stream', 100, 800) === LEAD_SECONDS.stream, 'a longer page takes a little longer, never too long')
  for (const s of Object.keys(LINGER).filter((k) => LINGER[k].gap[1])) { const g = lingerGap(s, () => 0.5); assert.ok(g >= LINGER[s].gap[0] && g <= LINGER[s].gap[1]) }
})

test('each lead starts at the top of the page and lands exactly on its place in the painting', () => {
  for (const [name, f] of [['samara', samara], ['skipping', skipping]]) {
    assert.ok(near(f(0, S, E, o), S, 3), `${name} starts at the top`)
    assert.ok(near(f(1, S, E, o), E, 3), `${name} lands on the painting`)
    for (let t = 0; t <= 1; t += 0.05) assert.ok(f(t, S, E, o).y > S.y - 140, `${name} stays on its way down`)
  }
  const m = murmur(1, S, E, { ...o, vh: 800, i: 3, n: 20 }); assert.ok(Math.abs(m.x - E.x) < 30 && Math.abs(m.y - E.y) < 30, 'the murmuration pours into the painting')
  assert.ok(murmur(0.2, S, E, { ...o, vh: 800, i: 0 }).y < S.y + 300, 'after looping at the top first')
  const to = { x: 300, y: 1450 }, ro = rosette(1, S, E, { i: 2, n: 12, R: 120, to }); assert.ok(near(ro, to, 1), 'each kaleidoscope piece opens to its place round the frame')
  assert.ok(Math.hypot(rosette(0.4, S, E, { i: 2, n: 12, R: 120 }).x - rosette(0.4, S, E, { i: 8, n: 12, R: 120 }).x, 1) > 10, 'and turns as a rosette on the way')
})

test('the fire’s fuse runs down the outside of the cards, one side then the other, into the fire', () => {
  const cards = [{ x0: 16, x1: 374, y0: 300, y1: 520 }, { x0: 16, x1: 374, y0: 540, y1: 760 }]
  const path = fusePath(S, E, cards)
  assert.deepEqual(path[0], S); assert.deepEqual(path.at(-1), E)
  assert.ok(path[1].x < 16 && path[3].x > 374, 'left of the first card, right of the next: never across what is written on them')
  const a = alongLine(path, 0), b = alongLine(path, 1), m = alongLine(path, 0.5)
  assert.ok(near(a, S, 0.01) && near(b, E, 0.01) && m.length > 1000)
})

test('the pumpkin rolls along each card and drops off its end onto the next', () => {
  const cards = [{ x0: 16, x1: 374, y0: 300, y1: 520 }, { x0: 16, x1: 374, y0: 540, y1: 760 }]
  const segs = plinkoPath(S, E, cards, { vw: 390, r: 20 })
  assert.deepEqual(segs.map((s) => s.kind), ['drop', 'roll', 'drop', 'roll', 'drop'])
  assert.equal(segs[1].a.y, 280, 'rolling on the first card’s top edge'); assert.ok(segs[1].b.x < 16 || segs[1].b.x > 374, 'to its end and off')
  assert.ok(near(plinkoAt(segs, 0, { r: 20 }), S, 0.5) && near(plinkoAt(segs, 1, { r: 20 }), E, 0.5))
  assert.ok(Math.abs(plinkoAt(segs, 0.99, { r: 20 }).rot) > 90, 'turning as it rolls')
})

test('the butterflies rest on each card on the way, wings slow, and fly between them', () => {
  const cards = [{ x0: 16, x1: 374, y0: 300, y1: 520 }, { x0: 16, x1: 374, y0: 540, y1: 760 }]
  const stops = hopStops(S, E, cards, { r: () => 0.5 })
  assert.equal(stops.length, 4); assert.equal(stops[1].y, 300); assert.equal(stops[2].y, 540)
  const resting = hopAt(stops, 1 / 3 + 0.05, { i: 0 }), flying = hopAt(stops, 1 / 3 + 0.25, { i: 0 })
  assert.equal(resting.resting, true); assert.ok(Math.abs(resting.y - 296) < 6, 'sitting on the card’s edge')
  assert.equal(flying.resting, false)
  assert.ok(near(hopAt(stops, 1, { i: 1 }), E, 4), 'and into the blossom')
})

test('the bunting drapes down the page in swags, side to side, to the frame', () => {
  const anchors = buntingAnchors(S, E, { vw: 390 })
  assert.ok(anchors.length >= 4); assert.deepEqual(anchors.at(-1), E)
  assert.ok(anchors[1].x > 300 && anchors[2].x < 90, 'side to side')
  const mid = swag(anchors[0], anchors[1], 0.5, 70); assert.ok(mid.y > (anchors[0].y + anchors[1].y) / 2 + 60, 'sagging in the middle')
})

test('the skipping leaf touches down five times, the last on the water', () => {
  const touches = skipTouches(S, E, o)
  assert.equal(touches.length, SKIPS)
  assert.ok(near(touches.at(-1), E, 3))
  for (let i = 1; i < touches.length; i++) assert.ok(touches[i].y > touches[i - 1].y && touches[i].t > touches[i - 1].t)
})

test('the page follows a piece down, a little above the middle, never past either end', () => {
  assert.equal(cameraTo(1000, 800, 5000), 1000 - 336)
  assert.equal(cameraTo(100, 800, 5000), 0)
  assert.equal(cameraTo(9000, 800, 2000), 2000)
  const lead = read('src/shell/harvest/lead.js')
  assert.match(lead, /\['wheel', 'touchstart', 'keydown', 'pointerdown'\]/, 'a scroll, a touch or a key lets the page go')
  assert.match(lead, /Math\.max\(start, cameraTo/, 'never above where it started')
})

test('the season’s show runs top to painting once a day, then its subtle part on every screen', () => {
  const h = read('src/shell/HarvestShow.jsx'), linger = read('src/shell/harvest/linger.js'), css = read('src/shell/season-show.css')
  assert.match(h, /teamhicks\.shows/, 'once a day on each device, cleared by Settings’ Play it again')
  assert.match(h, /path !== '\/'/, 'the lead only from Home')
  assert.match(h, /runLead\(/); assert.match(h, /runLinger\(/)
  assert.match(h, /await lead\.done/, 'the painting’s own show starts when the lead lands')
  assert.match(linger, /document\.visibilityState === 'visible'/, 'it waits while the app is in the background')
  assert.match(linger, /LINGER\[style\]/, 'with a most for a sitting')
  assert.match(css, /html\[data-motion="less"\][^{]*\.hv-layer/)
  for (const f of ['src/shell/harvest/lead.js', 'src/shell/harvest/linger.js', 'src/shell/harvest/wheel.js']) {
    const src = read(f)
    assert.doesNotMatch(src, /matchMedia/); assert.doesNotMatch(src, /style\.filter|filter:|blur\(/)
    assert.doesNotMatch(src, /style\.(left|top|width|height) = .*(q\.x|q\.y|\.x \+|\.y \+)/, 'moving pieces change only transform and opacity')
  }
})

test('the wheel hides her painting only for a moment and always gives it back', () => {
  const w = read('src/shell/harvest/wheel.js')
  assert.match(w, /tracePieces/, 'its pieces are traced from the painting')
  assert.match(w, /function finish\(\)[\s\S]*hide\(false\)/, 'her painting is shown again whatever happens')
  assert.match(w, /return \(\) => \{ stop\(\); finish\(\) \}/)
})
