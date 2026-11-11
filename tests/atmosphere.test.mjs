// The air of Anna's academy: the real sun, moon and weather over the campus and in the rooms, the light they
// make, and what stirs. The sky is home's own, never invented: with no forecast there is no weather.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import SunCalc from 'suncalc'
import { HOME_TOWN, phaseOf } from '../src/lib/sky.js'
import {
  atmosphereAt, weatherOf, pretendWeather, momentOf, TRY_TIMES, skyPoint, SKY_SPAN, shadowOf, hull, beamOf, lightOf, LIGHTS, smokes,
  groundSeason, sceneryFor, roofLights, airOf, ridge, mix, skyWords, washesOf, toneWith, WEATHERS,
} from '../src/academy/atmosphere.js'
import { gait, stepFrom, glowOf, GLOWS, risesFrom, idleOf, ASSET_WAYS, REACH } from '../src/academy/life.js'
import { ROOM_KINDS, ROOM_N } from '../src/academy/rooms.js'
import { ITEM } from '../src/academy/items.js'

// Home is eight hours behind UTC in November: these are 7am, noon, 3pm, 4:30pm and 7pm on the 11th
const at = (hour, date = '2026-11-11') => new Date(new Date(`${date}T08:00:00Z`).getTime() + hour * 36e5)
const forecast = (now, hours = [{ now: true, inches: 0 }]) => ({ now: { speed: 6, gusts: 9, dir: 270, temp: 64, ...now }, timeline: hours })
const brightness = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 }

test('the sun and moon are where they really are over home, and the hour follows them', () => {
  const noon = atmosphereAt({ now: at(12) })
  assert.equal(noon.phase, 'day'); assert.equal(noon.hour, 12); assert.equal(noon.date, '2026-11-11')
  assert.ok(noon.sun.alt > 36 && noon.sun.alt < 40, `the November noon sun stands about 38° up, not ${noon.sun.alt}`)
  assert.ok(Math.abs(noon.sun.az - 185) < 8, 'and due south, near enough')
  assert.equal(noon.dark, false); assert.equal(noon.daylight, 1)
  const night = atmosphereAt({ now: at(19) })
  assert.equal(night.phase, 'night'); assert.equal(night.dark, true); assert.equal(night.sun.up, false)
  assert.deepEqual(night.season, { ground: 'fall', key: 'fall' })
  // Midsummer's noon sun is nearly overhead (the clocks are an hour on, so this is 1pm); Christmas brings its own season
  assert.ok(atmosphereAt({ now: at(12, '2026-06-21') }).sun.alt > 75)
  assert.deepEqual(atmosphereAt({ now: at(12, '2026-12-25') }).season, { ground: 'winter', key: 'christmas' })
})

test('on the campus the sun rises on the left and sets on the right: we face south', () => {
  const box = { x0: -170, x1: 170, horizon: -14, zenith: -126 }
  const rise = skyPoint(112, 0, box), south = skyPoint(180, 38, box), set = skyPoint(248, 0, box)
  assert.ok(rise.x < south.x && south.x < set.x)
  assert.equal(rise.y, box.horizon); assert.ok(south.y < rise.y, 'higher in the sky is higher on the screen')
  assert.equal(skyPoint(180, 90, box).y, box.zenith)
  assert.equal(skyPoint(0, 10, box).x, box.x0); assert.equal(skyPoint(359, 10, box).x, box.x1) // never off the edge
  assert.ok(skyPoint(180, -5, box).y > box.horizon, 'below the horizon it sinks, for the hills to hide')
  // The span holds every sunrise and sunset of the year at home
  for (const date of ['2026-06-21', '2026-12-21', '2026-03-20']) {
    const t = SunCalc.getTimes(at(12, date), HOME_TOWN.lat, HOME_TOWN.lng)
    for (const when of [t.sunrise, t.sunset]) { const az = (SunCalc.getPosition(when, HOME_TOWN.lat, HOME_TOWN.lng).azimuth * 180) / Math.PI + 180; assert.ok(az > SKY_SPAN[0] && az < SKY_SPAN[1], `${date}: ${az}`) }
  }
})

test('the weather is the forecast’s, and with no forecast there is none', () => {
  assert.deepEqual(weatherOf(null), { known: false, kind: 'clear', cover: 0, fall: 0, wet: false, puddles: false, words: '', temp: null })
  const none = atmosphereAt({ now: at(12) })
  assert.equal(none.weather.known, false); assert.equal(none.wind.known, false); assert.equal(none.wind.level, 'calm'); assert.equal(none.pretend, false)
  const rain = weatherOf(forecast({ pic: 'rain', words: 'Heavy rain' }, [{ now: true, inches: 0.2, clouds: { low: 100, mid: 90, high: 20 } }]))
  assert.deepEqual([rain.known, rain.kind, rain.fall, rain.wet, rain.puddles, rain.cover], [true, 'rain', 1, true, true, 1])
  assert.equal(weatherOf(forecast({ pic: 'drizzle', words: 'Light drizzle' })).fall, 0.35)
  assert.equal(weatherOf(forecast({ pic: 'night-partly', words: 'Partly cloudy' })).kind, 'partly')
  assert.equal(weatherOf(forecast({ pic: 'night', words: 'Clear' })).kind, 'clear')
  // The forecast's own cloud layers are used, kept inside what the kind of sky allows
  assert.equal(weatherOf(forecast({ pic: 'clear', words: 'Clear' }, [{ now: true, clouds: { low: 80, mid: 0, high: 0 } }])).cover, 0.15)
  assert.equal(weatherOf(forecast({ pic: 'partly', words: 'Partly cloudy' }, [{ now: true, clouds: { low: 40, mid: 10, high: 0 } }])).cover, 0.4)
  // Puddles stay for six hours after the rain, and not after a trace
  const hours = (inches) => [{ past: true, inches: 0 }, { past: true, inches }, { past: true, inches: 0 }, { now: true, inches: 0 }]
  const after = weatherOf(forecast({ pic: 'clear', words: 'Clear' }, hours(0.12)))
  assert.deepEqual([after.wet, after.puddles, after.fall], [false, true, 0])
  assert.equal(weatherOf(forecast({ pic: 'clear', words: 'Clear' }, hours(0.005))).puddles, false)
  assert.equal(weatherOf(forecast({ pic: 'clear', words: 'Clear' }, [...Array(8).fill({ past: true, inches: 0 }).map((h, k) => (k ? h : { past: true, inches: 0.5 })), { now: true, inches: 0 }])).puddles, false, 'rain eight hours ago has dried')
})

test('the wind is home’s: it blows the flag toward the west side of the screen when it comes from the east', () => {
  assert.equal(airOf({ speed: 10, gusts: 14, dir: 90 }).to, 1) // from the east, toward the west: the right, facing south
  assert.equal(airOf({ speed: 10, gusts: 14, dir: 270 }).to, -1)
  assert.equal(airOf(null).level, 'calm')
  const calm = airOf({ speed: 1, gusts: 2, dir: 0 }), gale = airOf({ speed: 30, gusts: 45, dir: 45 })
  assert.ok(calm.drift > gale.drift && calm.flag > gale.flag && calm.sway < gale.sway, 'a gale hurries the clouds and the flag and bends the trees')
})

test('trying a sky on is marked pretend, and each time of day lands in its own phase', () => {
  for (const date of ['2026-01-15', '2026-03-20', '2026-06-21', '2026-09-22', '2026-11-11', '2026-12-21']) {
    for (const [phase] of TRY_TIMES) {
      const when = momentOf(phase, date)
      assert.equal(phaseOf(when, SunCalc.getTimes(when, HOME_TOWN.lat, HOME_TOWN.lng)), phase, `${date} ${phase}`)
    }
  }
  const a = atmosphereAt({ now: at(12), tryOn: { time: 'night', weather: 'thunder', wind: 'gale' } })
  assert.deepEqual([a.pretend, a.phase, a.weather.kind, a.weather.pretend, a.wind.level, a.dark], [true, 'night', 'thunder', true, 'gale', true])
  assert.equal(a.date, '2026-11-11', 'the pretend night is tonight’s')
  assert.equal(skyWords(a), 'A pretend sky, just for now.')
  assert.equal(atmosphereAt({ now: at(12), tryOn: {} }).pretend, false)
  assert.equal(atmosphereAt({ now: at(12), tryOn: { weather: 'frogs' } }).weather.known, false, 'an unknown weather is no weather')
  for (const k of WEATHERS) assert.equal(pretendWeather(k).kind, k)
  assert.match(skyWords(atmosphereAt({ now: at(12) })), /couldn’t be reached/)
  assert.match(skyWords(atmosphereAt({ now: at(12), waiting: true })), /Looking at the weather/, 'still on its way is not unreachable')
  assert.equal(skyWords(atmosphereAt({ now: at(12), forecast: forecast({ pic: 'partly', words: 'Partly cloudy', speed: 14, gusts: 20 }) })), 'Home’s sky, right now: partly cloudy, 64°, windy.')
})

test('the light of the hour: noon changes nothing, night darkens the grounds, and a room dims less than outdoors', () => {
  const clear = weatherOf(null), moon = { alt: -10, fraction: 0.5 }
  assert.deepEqual(washesOf('day', clear, moon), [])
  assert.equal(atmosphereAt({ now: at(12) }).tone('#7DB85A'), '#7DB85A')
  const out = toneWith(washesOf('night', clear, moon))('#7DB85A'), room = toneWith(washesOf('night', clear, moon, true))('#7DB85A')
  assert.ok(brightness(out) < brightness(room) && brightness(room) < brightness('#7DB85A'))
  // A full moon in a clear sky lifts the night a little; rain greys the day
  assert.ok(washesOf('night', clear, { alt: 40, fraction: 1 })[0][1] < washesOf('night', clear, moon)[0][1])
  assert.ok(brightness(toneWith(washesOf('day', pretendWeather('rain'), moon))('#7DB85A')) < brightness('#7DB85A'))
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080'); assert.equal(mix('#123456', null, 0.5), '#123456')
})

test('shadows fall away from the sun: toward us at noon, long toward the west in the morning, none under cloud', () => {
  const clear = weatherOf(null), noMoon = { alt: -20, az: 0, fraction: 0.5 }
  const noon = shadowOf({ alt: 38, az: 180 }, noMoon, clear)
  assert.ok(noon.dy > 0 && Math.abs(noon.dx) < 0.01, 'at noon a shadow points north, toward the front of the campus')
  const morning = shadowOf({ alt: 15, az: 120 }, noMoon, clear), evening = shadowOf({ alt: 15, az: 240 }, noMoon, clear)
  assert.ok(morning.dx > 0 && evening.dx < 0, 'east is on the left, so a morning shadow reaches right')
  assert.ok(Math.hypot(morning.dx, morning.dy) > Math.hypot(noon.dx, noon.dy), 'and a low sun’s is longer')
  assert.equal(shadowOf({ alt: 38, az: 180 }, noMoon, pretendWeather('cloudy')), null)
  assert.equal(shadowOf({ alt: -10, az: 300 }, noMoon, clear), null)
  const moonlit = shadowOf({ alt: -30, az: 300 }, { alt: 50, az: 180, fraction: 1 }, clear)
  assert.ok(moonlit && moonlit.opacity < noon.opacity, 'a full moon casts a faint one')
  // The outline round a building's foot and its shadow's far end holds them all
  const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }, { x: 2, y: 2 }, { x: 6, y: 5 }]
  assert.deepEqual(hull(pts).map((p) => `${p.x},${p.y}`).sort(), ['0,0', '0,4', '4,0', '6,5'])
})

test('the patch of sun in a room is where the sun throws it through the south-west window', () => {
  const win = { from: 1.5, to: 3.5, sill: 42, top: 112 }, H = 150
  const inFloor = (b) => b.floor.every((p) => p.i >= 0 && p.i <= ROOM_N && p.j >= 0 && p.j <= ROOM_N)
  const inWall = (b) => b.wall.every((p) => p.j >= 0 && p.j <= ROOM_N && p.z >= 0 && p.z <= H)
  const noon = beamOf({ alt: 38, az: 188 }, win, ROOM_N, H)
  assert.equal(noon.floor.length, 4); assert.equal(noon.wall.length, 0); assert.ok(inFloor(noon))
  // A higher sun keeps its patch nearer the wall
  const far = (b) => Math.max(...b.floor.map((p) => p.j))
  assert.ok(far(beamOf({ alt: 70, az: 200 }, win, ROOM_N, H)) < far(noon))
  // In the morning the sun is round the other side of the building: nothing comes in
  assert.equal(beamOf({ alt: 20, az: 120 }, win, ROOM_N, H), null)
  assert.equal(beamOf({ alt: 1, az: 225 }, win, ROOM_N, H), null)
  assert.equal(beamOf(null, win, ROOM_N, H), null)
  // Low in the west it crosses the floor and climbs the left-hand wall
  const low = beamOf({ alt: 3, az: 247 }, win, ROOM_N, H)
  assert.ok(low.wall.length >= 3 && inWall(low) && inFloor(low))
  const mid = beamOf({ alt: 12, az: 262 }, win, ROOM_N, H)
  assert.ok(mid.floor.length >= 3 && mid.wall.length >= 3 && inFloor(mid) && inWall(mid), 'part on the floor, part on the wall')
  // Every hour of a clear day gives a patch inside the room, or none
  for (let h = 5; h <= 20; h += 0.5) for (const date of ['2026-06-21', '2026-12-21', '2026-11-11']) {
    const a = atmosphereAt({ now: at(h, date) }), b = a.beam && beamOf(a.beam, win, ROOM_N, H)
    if (b) assert.ok(inFloor(b) && inWall(b), `${date} ${h}`)
  }
  assert.equal(atmosphereAt({ now: at(12) }).beam.of, 'sun')
  assert.equal(atmosphereAt({ now: at(12), tryOn: { weather: 'thunder' } }).beam, null, 'no sunbeam under a storm')
})

test('windows are lit after dark while that kind of room is in use', () => {
  for (const kind of Object.keys(ROOM_KINDS)) if (kind !== 'courtyard') assert.ok(LIGHTS[kind], `${kind} has no lights`)
  for (const kind of Object.keys(LIGHTS)) { assert.ok(ROOM_KINDS[kind], kind); assert.equal(lightOf(kind, 12, false), null, 'nothing is lit by day') }
  assert.ok(lightOf('bakery', 5, true), 'the bakers start before dawn')
  assert.equal(lightOf('classroom', 5, true), null)
  assert.equal(lightOf('dorm', 23, true), null, 'the dorm sleeps')
  assert.equal(lightOf('observatory', 23, true).colour, '#FF6B5E')
  assert.equal(lightOf('chapel', 2, true).flicker, true)
  assert.equal(lightOf('courtyard', 20, true), null)
  assert.equal(smokes('bakery', 6), true); assert.equal(smokes('bakery', 14), false); assert.equal(smokes('cafe', 12), true); assert.equal(smokes('library', 12), false)
})

test('the year on the ground: every picture a season brings is one in the catalog', () => {
  assert.deepEqual(['2026-01-15', '2026-04-01', '2026-07-04', '2026-10-31'].map(groundSeason), ['winter', 'spring', 'summer', 'fall'])
  const keys = ['christmas', 'advent', 'easter', 'lent', 'muertos', 'halloween', 'thanksgiving', 'valentine', 'july4', 'back-to-school', 'summer', 'spring', 'fall', 'winter']
  for (const key of keys) for (const ground of ['winter', 'spring', 'summer', 'fall']) {
    const list = sceneryFor({ key, ground })
    assert.equal(list.length, 4)
    for (const k of list) assert.ok(ITEM[k], `${key}/${ground}: no picture called ${k}`)
  }
  assert.ok(roofLights({ key: 'christmas' }) && roofLights({ key: 'advent' }))
  assert.equal(roofLights({ key: 'fall' }), null)
})

test('what stirs: animals walk, wings hover, fish swim only in water, furniture stays', () => {
  assert.equal(gait('cat'), 'walk'); assert.equal(gait('rabbit'), 'walk'); assert.equal(gait('butterfly'), 'hover'); assert.equal(gait('chair'), null)
  assert.equal(gait('dolphin', null, 'water'), 'swim'); assert.equal(gait('dolphin', null, 'wood'), null); assert.equal(gait('duck', null, 'grass'), 'walk')
  assert.equal(gait('teddy-bear'), null); assert.equal(gait('nothing-called-this'), null)
  // The family's own pictures join in by how they were filed
  assert.equal(gait('a:1', { cat: 'Animals' }), 'walk'); assert.equal(gait('a:1', { cat: 'Ours' }), null)
  assert.deepEqual(glowOf('a:1', { cat: 'Lights' }), { colour: '#FFD79A', reach: 1.8, flicker: false }); assert.equal(glowOf('a:1', { cat: 'Animals' }), null)
  assert.deepEqual(ASSET_WAYS.map(([k]) => k), ['Ours', 'Animals', 'Lights'])
  for (const [, , about] of ASSET_WAYS) assert.ok(about.length > 10)
  assert.equal(glowOf('candle').flicker, true); assert.equal(glowOf('chair'), null)
  assert.equal(risesFrom('teapot'), 'steam'); assert.equal(risesFrom('guitar'), 'notes'); assert.equal(risesFrom('chair'), null)
  assert.equal(idleOf('basketball'), 'ac-bounce'); assert.equal(idleOf('chair'), null)
  for (const k of Object.keys(GLOWS)) assert.ok(ITEM[k], `a glow for ${k}, which isn't in the catalog`)
})

test('a wander is one step onto a free square, never off the floor or far from home', () => {
  const home = { i: 2, j: 2 }
  let pos = { ...home }, seed = 7
  const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const blocked = new Set(['2,3', '0,0'])
  for (let n = 0; n < 400; n++) {
    const next = stepFrom(pos, home, blocked, ROOM_N, r)
    assert.ok(next, 'there is always somewhere to go here')
    assert.equal(Math.abs(next.i - pos.i) + Math.abs(next.j - pos.j), 1)
    assert.ok(next.i >= 0 && next.j >= 0 && next.i < ROOM_N && next.j < ROOM_N && !blocked.has(`${next.i},${next.j}`))
    assert.ok(Math.abs(next.i - home.i) <= REACH && Math.abs(next.j - home.j) <= REACH)
    pos = next
  }
  assert.equal(stepFrom({ i: 0, j: 0 }, { i: 0, j: 0 }, new Set(['1,0', '0,1']), ROOM_N), null, 'boxed in, it stays')
})

test('the far hills are the same every time', () => {
  const d = ridge('far-hills', -180, 180, -8, 10, 56)
  assert.equal(d, ridge('far-hills', -180, 180, -8, 10, 56))
  assert.notEqual(d, ridge('near-hills', -180, 180, -8, 10, 56))
  assert.match(d, /^M-180 56 L-180 -?[\d.]+ Q/); assert.match(d, /L180 56 Z$/)
  for (const [, y] of d.matchAll(/ (-?[\d.]+)(?= Q| L180)/g)) assert.ok(Number(y) <= -8, 'a ridge never dips below its foot')
})

test('everything in the academy that moves is still under less motion', () => {
  const css = fs.readFileSync(new URL('../src/academy/academy.css', import.meta.url), 'utf8')
  const less = css.split('\n').filter((l) => l.includes('html[data-motion="less"]')).join('\n')
  const device = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {'))
  const moving = new Set()
  for (const [, selectors, body] of css.matchAll(/^\s*([^@{}\n][^{}\n]*)\{([^}]*)\}/gm)) {
    if (!/animation(-name)?:\s*(?!none)/.test(body) || /prefers-reduced-motion|data-motion/.test(selectors)) continue
    for (const [name] of selectors.matchAll(/\.ac-[\w-]+/g)) moving.add(name)
  }
  assert.ok(moving.size > 25, `only ${moving.size} moving classes were found`)
  // What plays once (a celebration's confetti, a pop) isn't a loop, and those that fade in are handled with the app's own
  const once = new Set(['.ac-joy', '.ac-joy-card', '.ac-hero'])
  for (const name of moving) {
    if (once.has(name)) continue
    assert.ok(new RegExp(`\\${name}(?![\\w-])`).test(less), `${name} moves, and isn't stilled by Settings › Less motion`)
    assert.ok(new RegExp(`\\${name}(?![\\w-])`).test(device), `${name} moves, and isn't stilled by the device's Reduce Motion`)
  }
  // And only by transform and opacity: nothing animates a filter, a size or a colour
  for (const [, name, frames] of css.matchAll(/@keyframes\s+(ac-[\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)) {
    for (const [, decl] of frames.matchAll(/\{([^{}]*)\}/g)) for (const prop of decl.split(';').map((x) => x.split(':')[0].trim()).filter(Boolean)) {
      assert.ok(['transform', 'opacity', 'background-position'].includes(prop), `@keyframes ${name} animates ${prop}`)
    }
  }
})
