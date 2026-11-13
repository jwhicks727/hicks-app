import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { LEAD_SECONDS, leadSeconds, cameraTo, rocking, samara, skipping, skipTouches, SKIPS, bouncePath, bouncing, flutter, comet, gust, beamDown, devil, ribbon, swarm, LINGER, lingerGap } from '../src/lib/leads.js'
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
  for (const [name, f] of [['rocking', rocking], ['samara', samara], ['skipping', skipping], ['flutter', flutter], ['comet', comet], ['beamDown', beamDown]]) {
    assert.ok(near(f(0, S, E, o), S, 3), `${name} starts at the top`)
    assert.ok(near(f(1, S, E, o), E, 3), `${name} lands on the painting`)
    // and travels downward on the whole: never far above where it started
    for (let t = 0; t <= 1; t += 0.05) assert.ok(f(t, S, E, o).y > S.y - 140, `${name} stays on its way down`)
  }
  for (const [name, f] of [['gust', gust], ['ribbon', ribbon]]) { assert.ok(near(f(1, S, E, { ...o, i: 0 }), E, 3), `${name}'s lead lands`); assert.equal(f(0.02, S, E, { ...o, i: 5 }).k, 0, `${name}: the later ones follow on`) }
  const d = devil(1, S, E, { ...o, i: 0 }); assert.ok(Math.abs(d.x - E.x) < 40 && Math.abs(d.y - E.y) < 40, 'the whirl arrives round its place')
  const sw = swarm(1, S, E, { ...o, i: 3 }); assert.ok(near(sw, E, 3), 'each wheel piece reaches its place round the frame')
})

test('the skipping leaf touches down five times, the last on the water', () => {
  const touches = skipTouches(S, E, o)
  assert.equal(touches.length, SKIPS)
  assert.ok(near(touches.at(-1), E, 3))
  for (let i = 1; i < touches.length; i++) assert.ok(touches[i].y > touches[i - 1].y && touches[i].t > touches[i - 1].t)
})

test('the pumpkin bounces on the cards between the top and the painting, and rolls as it goes', () => {
  const ledges = [{ y: 300, x0: 16, x1: 374 }, { y: 600, x0: 16, x1: 374 }, { y: 900, x0: 16, x1: 374 }, { y: 1700, x0: 16, x1: 374 }]
  const path = bouncePath(S, E, ledges, o)
  assert.deepEqual(path[0], S); assert.deepEqual(path.at(-1), E)
  assert.deepEqual(path.slice(1, -1).map((p) => p.y), [300, 600, 900], 'only the cards above the painting')
  for (const p of path.slice(1, -1)) assert.ok(p.x >= 36 && p.x <= 354, 'landing on the card, not beside it')
  assert.ok(near(bouncing(0, path, { r: 20 }), S, 1) && near(bouncing(1, path, { r: 20 }), E, 1))
  assert.ok(Math.abs(bouncing(0.9, path, { r: 20 }).rot) > 90, 'rolling')
  assert.equal(bouncePath(S, E, [], o).length, 5, 'with no cards in the way it still bounces down')
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
