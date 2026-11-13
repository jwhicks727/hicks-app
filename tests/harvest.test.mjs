import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BLOCK_DAYS, STYLES, WHAT, dayNumber, blockOf, candidates, pickPainting, styleFor, hsv, goldShare, findFire } from '../src/lib/harvest.js'
import { showFor, homePainting } from '../src/lib/seasonShows.js'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
const P = (slug, seasons = ['thanksgiving']) => ({ slug, seasons, w: 100, h: 100, focus: [0, 0, 1, 1] })
const px = (W, H, fn) => { const data = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) data.set([...fn(x, y), 255], (y * W + x) * 4); return { data, width: W, height: H } }

test('Home hangs the next Thanksgiving painting every two days, the same everywhere, in a fixed order', () => {
  const list = [P('pumpkins'), P('barn'), P('maple'), P('summer-day', ['summer']), P('kabocha')]
  assert.deepEqual(candidates(list).map((p) => p.slug), ['barn', 'kabocha', 'maple', 'pumpkins'], 'only Thanksgiving paintings, by slug')
  assert.equal(BLOCK_DAYS, 2)
  assert.equal(blockOf('2026-11-24'), blockOf('2026-11-25') - (dayNumber('2026-11-25') % 2 === 0 ? 1 : 0))
  const seen = new Set(['2026-11-22', '2026-11-24', '2026-11-26', '2026-11-28'].map((d) => pickPainting(list, d).slug))
  assert.equal(seen.size, 4, 'four blocks in the week show four different paintings')
  assert.equal(pickPainting(list, '2026-11-24').slug, pickPainting(list, '2026-11-24').slug)
  assert.equal(pickPainting([P('x', ['summer'])], '2026-11-24'), null)
  // Adding a painting later never reorders the ones already there
  assert.deepEqual(candidates([...list, P('aspens')]).map((p) => p.slug).slice(1), ['barn', 'kabocha', 'maple', 'pumpkins'])
})

test('Thanksgiving’s show hangs the painting of the day, and its painting is the one the show plays from', () => {
  const list = [P('barn'), P('maple'), P('kabocha')]
  for (const d of ['2026-11-22', '2026-11-24', '2026-11-26']) {
    const s = showFor('thanksgiving', list, d)
    assert.equal(s.kind, 'harvest'); assert.equal(s.painting.slug, pickPainting(list, d).slug)
    assert.equal(homePainting('thanksgiving', list, d).slug, s.painting.slug)
  }
  assert.equal(showFor('thanksgiving', [P('barn', ['summer'])], '2026-11-24'), null, 'none of hers for it, no show')
})

test('what a painting gets is read from it: a fire embers, a wheel assembles, a stream carries, a lake ripples, a blossom flies, fruit tumbles, gold rains', () => {
  assert.equal(styleFor({ fire: { x: 0.5 }, disc: {}, way: {}, gold: 0.5 }, 'a', '2026-11-24'), 'embers')
  assert.equal(styleFor({ disc: {}, way: {}, mirror: {}, gold: 0.5 }, 'a', '2026-11-24'), 'wheel')
  assert.equal(styleFor({ way: {}, mirror: {}, gold: 0.5 }, 'a', '2026-11-24'), 'stream')
  assert.equal(styleFor({ mirror: {}, bloom: {}, fruit: 5 }, 'a', '2026-11-24'), 'lake')
  assert.equal(styleFor({ bloom: {}, fruit: 5 }, 'a', '2026-11-24'), 'petals')
  assert.equal(styleFor({ fruit: 3, gold: 0.5 }, 'a', '2026-11-24'), 'tumble')
  assert.equal(styleFor({ fruit: 2, gold: 0.3 }, 'a', '2026-11-24'), 'golden')
  for (const slug of ['a', 'bb', 'ccc']) for (const d of ['2026-11-22', '2026-11-24', '2026-11-26']) {
    assert.ok(['wind', 'beam', 'whirl', 'garland'].includes(styleFor({ gold: 0.02 }, slug, d)))
    assert.ok(['golden', 'wind', 'beam', 'whirl', 'garland'].includes(styleFor({ gold: 0.15 }, slug, d)))
  }
  assert.equal(styleFor({ gold: 0.02 }, 'a', '2026-11-24'), styleFor({ gold: 0.02 }, 'a', '2026-11-24'), 'the same on every phone')
  assert.deepEqual(Object.keys(WHAT).sort(), [...STYLES].sort(), 'every show says what it is')
})

test('gold is measured, and a fire is a small hot patch ringed by dark, not a big orange fruit or a field of leaves', () => {
  const [h] = hsv(230, 170, 30); assert.ok(h > 38 && h < 50)
  assert.ok(goldShare(px(40, 40, () => [230, 175, 30])) > 0.99)
  assert.equal(goldShare(px(40, 40, () => [60, 90, 200])), 0)
  const night = (x, y) => (Math.hypot(x - 30, y - 34) < 4 ? [235, 90, 25] : [28, 24, 30])
  const fire = findFire(px(60, 60, night))
  assert.ok(fire && Math.abs(fire.x - 0.5) < 0.05 && Math.abs(fire.y - 34 / 60) < 0.05, 'found where it burns')
  assert.ok(fire.colour[0] > 200 && fire.colour[2] < 80, 'and what colour its core is')
  assert.equal(findFire(px(60, 60, (x, y) => (Math.hypot(x - 30, y - 38) < 16 ? [235, 90, 25] : [28, 24, 30]))), null, 'a big orange fruit is not a fire')
  assert.equal(findFire(px(60, 60, () => [235, 90, 25])), null, 'a field of leaves is not a fire')
  assert.equal(findFire(px(60, 60, (x, y) => (Math.hypot(x - 30, y - 34) < 4 ? [235, 90, 25] : [200, 220, 235]))), null, 'not ringed by dark, no fire')
  assert.equal(findFire(px(60, 60, (x, y) => (Math.hypot(x - 30, y - 10) < 4 ? [235, 90, 25] : [28, 24, 30]))), null, 'and only in the lower part')
})

test('the harvest shows move by transform and opacity, never take a tap, sleep with the app and still under less motion', () => {
  const css = read('src/shell/season-show.css'), kit = read('src/shell/harvest/kit.js'), harvest = read('src/shell/HarvestShow.jsx'), season = read('src/shell/SeasonShow.jsx')
  for (const f of ['golden', 'whirl', 'embers', 'wheel', 'lake', 'tumble', 'petals', 'beam']) {
    const src = read(`src/shell/harvest/${f}.js`)
    assert.doesNotMatch(src, /matchMedia/); assert.doesNotMatch(src, /style\.(left|top|width|height) = .*(\.x|\.y)/)
    assert.doesNotMatch(src, /style\.filter|filter:|blur\(/)
  }
  assert.match(kit, /document\.visibilityState === 'visible'/, 'it waits while the app is in the background')
  assert.match(css, /\.hv-layer \{[^}]*pointer-events: none/)
  assert.match(css, /html\[data-motion="less"\][^{]*\.hv-layer/)
  assert.doesNotMatch(css, /filter:\s*blur/)
  assert.match(season, /const still = reducedMotion\(\)/)
  assert.match(season, /show\.kind === 'harvest'\) return <HarvestShow/)
  assert.match(harvest, /hicks:show/)
  assert.match(kit, /cutLeaves/, 'leaves are cut from the painting’s own pixels')
})

test('every season rotates through its own paintings, two days each, and never borrows another season’s', () => {
  const list = [P('snow', ['christmas']), P('star', ['christmas']), P('crib', ['christmas']), P('sea', ['summer']), P('leaf', ['fall'])]
  const seen = new Set(['2026-12-20', '2026-12-22', '2026-12-24'].map((d) => showFor('christmas', list, d).painting.slug))
  assert.equal(seen.size, 3, 'three blocks, three different Christmas paintings')
  for (const d of ['2026-12-20', '2026-12-22', '2026-12-24']) assert.ok(['snow', 'star', 'crib'].includes(showFor('christmas', list, d).painting.slug))
  assert.equal(showFor('summer', list, '2026-07-01').painting.slug, 'sea')
  assert.equal(showFor('fall', list, '2026-10-01').painting.slug, 'leaf')
  assert.equal(showFor('lent', list, '2026-03-01'), null, 'no Lent painting, no show')
  assert.equal(showFor('easter', list, '2026-04-05'), null)
})
