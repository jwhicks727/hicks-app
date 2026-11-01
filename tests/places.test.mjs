import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HOME_TOWN } from '../src/lib/sky.js'
import { PLACES, STOPS, STOP_ORDER, RANGES, LAKES, pinsAt, placeBySlug, fitCamera, toScreen, layoutLabels, spread, peakGlyphs, inside, subsolar, nightPath, milesBetween, distanceWords, minutesAhead, aheadWords, mapsLinks } from '../src/lib/places.js'
import { NEAR, WORLD } from '../src/lib/mapdata.js'
import { ridgePoints, snowCaps, rangePath } from '../src/lib/scenes.js'

test('every place once, with a scene, a stop, a time zone and a colour', () => {
  const slugs = PLACES.map((p) => p.slug)
  assert.equal(new Set(slugs).size, slugs.length)
  const scenes = readFileSync(new URL('../src/places/world/Scene.jsx', import.meta.url), 'utf8')
  for (const p of PLACES) {
    assert.ok(STOPS[p.stop], p.slug)
    assert.match(p.colour, /^#[0-9A-F]{6}$/i, p.slug)
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en-US', { timeZone: p.tz }), p.slug)
    assert.ok(scenes.includes(`${/^[a-z]+$/.test(p.scene) ? p.scene : `'${p.scene}'`}: (c) =>`), `scene ${p.scene} for ${p.slug}`)
  }
  assert.ok(placeBySlug('anaheim'))
  assert.equal(placeBySlug('nowhere'), null)
})

test('home is the town, never an address, and has no maps link (CLAUDE.md)', () => {
  const home = PLACES.find((p) => p.home)
  assert.deepEqual([home.lat, home.lng], [HOME_TOWN.lat, HOME_TOWN.lng])
  assert.equal(home.maps, undefined)
  assert.equal(mapsLinks(home, 'iPhone'), null)
  // A maps search names a town or a public building: no street numbers anywhere
  for (const p of PLACES) assert.doesNotMatch(p.maps || '', /\d/, p.slug)
})

test('each zoom shows its own places, and one pin for everything nearer home', () => {
  assert.deepEqual(pinsAt('home').map((p) => p.kind), Array(9).fill('place'))
  const socal = pinsAt('socal'), world = pinsAt('world')
  assert.deepEqual(socal.filter((p) => p.kind === 'place').map((p) => p.slug), ['anaheim', 'lancaster', 'joshua-tree', 'long-beach', 'san-diego'])
  assert.equal(socal.find((p) => p.kind === 'group').count, 9)
  assert.equal(world.find((p) => p.kind === 'group').count, 14)
  assert.equal(world.find((p) => p.kind === 'group').to, 'socal')
  assert.equal(STOP_ORDER.reduce((n, s) => n + PLACES.filter((p) => p.stop === s).length, 0), PLACES.length)
})

test('a stop’s camera fits its places inside the frame, clear of the label bands', () => {
  for (const [W, H] of [[358, 386], [942, 448], [812, 312]]) {
    for (const stop of STOP_ORDER) {
      const bands = 60, cam = fitCamera(stop, W, H, bands, 18, NEAR)
      for (const p of PLACES.filter((q) => q.stop === stop)) {
        const [x, y] = toScreen(STOPS[stop].layer, cam, W, H, NEAR, p.lat, p.lng)
        assert.ok(x >= 17 && x <= W - 17, `${p.slug} x ${x} at ${W}`)
        assert.ok(y >= bands - 1 && y <= H - bands + 1, `${p.slug} y ${y} at ${W}x${H}`)
      }
    }
  }
})

test('labels never overlap in a row and stay inside the frame when they fit', () => {
  const items = [['a', 20, 200, 125], ['b', 120, 190, 173], ['c', 200, 175, 125], ['d', 122, 188, 156], ['e', 340, 190, 137], ['f', 70, 195, 120]].map(([id, x, y, w]) => ({ id, x, y, w }))
  const W = 356, out = layoutLabels(items, { W, H: 382, rows: 2, rowH: 44 })
  assert.equal(Object.keys(out).length, items.length)
  const rows = {}
  for (const i of items) (rows[out[i.id].top] ||= []).push({ ...i, left: out[i.id].left })
  for (const row of Object.values(rows)) {
    row.sort((a, b) => a.left - b.left)
    row.forEach((i, k) => {
      assert.ok(i.left >= 8 && i.left + i.w <= W - 8 + 0.01, `${i.id} inside`)
      if (k) assert.ok(row[k - 1].left + row[k - 1].w <= i.left, `${row[k - 1].id} and ${i.id} overlap`)
    })
  }
  assert.deepEqual(spread([0, 0, 0], [10, 10, 10], 0, 100, 5), [0, 15, 30])
})

test('peaks fill a range and keep clear of pins', () => {
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]]
  assert.ok(inside([50, 50], square) && !inside([150, 50], square))
  const pts = peakGlyphs([square], [[50, 50, 20]], 400, 400)
  assert.ok(pts.length > 20)
  for (const [x, y] of pts) { assert.ok(inside([x, y], square)); assert.ok(Math.hypot(x - 50, y - 50) >= 20) }
  for (const r of RANGES) assert.ok(r.poly.length >= 4, r.name)
  for (const l of LAKES) assert.ok(l.rx > 0 && l.ry > 0, l.name)
})

test('the sun overhead: on the June solstice at noon UTC, the Tropic of Cancer near Greenwich', () => {
  const s = subsolar(new Date(Date.UTC(2026, 5, 21, 12)))
  assert.ok(Math.abs(s.lat - 23.44) < 0.1, String(s.lat))
  assert.ok(Math.abs(s.lng) < 1, String(s.lng))
  const e = subsolar(new Date(Date.UTC(2026, 2, 20, 18)))
  assert.ok(Math.abs(e.lat) < 0.5 && Math.abs(e.lng + 90) < 2, JSON.stringify(e))
  assert.match(nightPath(new Date(Date.UTC(2026, 9, 31, 3))), /^M[\d.]+ [\d.]+L.*Z$/)
})

test('distance and time from home', () => {
  const sd = milesBetween(HOME_TOWN, placeBySlug('san-diego'))
  assert.ok(sd > 85 && sd < 105, String(sd))
  assert.equal(distanceWords(placeBySlug('kordyak')), 'Here in Fontana')
  assert.equal(distanceWords(placeBySlug('paris')), 'About 5,620 miles from home')
  // US clocks go back on Nov 1, 2026; Europe's went back on Oct 25
  assert.equal(minutesAhead('Europe/Paris', new Date(Date.UTC(2026, 9, 31, 19))), 480)
  assert.equal(minutesAhead('Europe/Paris', new Date(Date.UTC(2026, 10, 2, 19))), 540)
  assert.equal(aheadWords('Asia/Shanghai', new Date(Date.UTC(2026, 10, 2, 19))), '16 hours ahead of home')
  assert.equal(aheadWords('Pacific/Honolulu', new Date(Date.UTC(2026, 9, 31, 19))), '3 hours behind home')
  assert.equal(aheadWords('America/Los_Angeles', new Date()), 'Same time as home')
})

test('maps links open the phone’s own maps app', () => {
  const p = placeBySlug('big-bear')
  assert.match(mapsLinks(p, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)').open, /^https:\/\/maps\.apple\.com\/\?q=Big%20Bear%20Lake%2C%20CA&ll=34\.2439,-116\.9114$/)
  assert.match(mapsLinks(p, 'Mozilla/5.0 (Linux; Android 15)').open, /^geo:34\.2439,-116\.9114\?q=Big%20Bear%20Lake/)
  const desk = mapsLinks(p, 'Mozilla/5.0 (Windows NT 10.0)')
  assert.match(desk.open, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/)
  assert.match(desk.directions, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/)
  assert.equal(mapsLinks(placeBySlug('redlands'), '').open, 'https://www.google.com/maps/search/?api=1&query=Redlands%2C%20CA')
})

test('the outlines are there, and a scene’s shapes are the same every time', () => {
  assert.ok(WORLD.land.length > 10000 && NEAR.land.length > 1000)
  assert.deepEqual(ridgePoints({ seed: 4 }), ridgePoints({ seed: 4 }))
  const pts = ridgePoints({ seed: 4, base: 100, amp: 50 })
  assert.match(rangePath(pts), /^M-160 150L.*Z$/)
  assert.match(snowCaps(pts, 70), /^M.*Z$/)
  assert.equal(snowCaps(pts, 0), '')
})

test('labels sit beside their own pins, inside the frame, never on each other', async () => {
  const { calloutLabels } = await import('../src/lib/places.js')
  const items = [
    { id: 'a', x: 100, y: 100, w: 90, h: 40 }, { id: 'b', x: 112, y: 104, w: 110, h: 40 }, { id: 'c', x: 340, y: 20, w: 100, h: 40 },
    { id: 'd', x: 5, y: 300, w: 80, h: 40 }, { id: 'e', x: 200, y: 200, w: 90, h: 40 },
  ]
  const W = 360, H = 360, out = calloutLabels(items, { W, H })
  const box = (id) => { const i = items.find((x) => x.id === id), o = out[id]; return [o.left, o.top, o.left + i.w, o.top + i.h] }
  for (const i of items) {
    const [l, t, r, b] = box(i.id)
    assert.ok(l >= 6 && t >= 6 && r <= W - 6 && b <= H - 6, `${i.id} inside the frame`)
    // close to its pin: within 100px of it, not at an edge band
    const dx = Math.max(l - i.x, 0, i.x - r), dy = Math.max(t - i.y, 0, i.y - b)
    assert.ok(Math.hypot(dx, dy) < 100, `${i.id} near its pin`)
  }
  for (const p of items) for (const q of items) {
    if (p.id >= q.id) continue
    const [a, b, c, d] = box(p.id), [e, f, g, h] = box(q.id)
    assert.ok(!(a < g && e < c && b < h && f < d), `${p.id} and ${q.id} overlap`)
  }
  assert.equal(out.e.far, false) // a pin alone gets its label right beside it
})
