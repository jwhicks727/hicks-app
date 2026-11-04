import { test } from 'node:test'
import assert from 'node:assert/strict'
import { graphScale, hoursByDate, dayLine, linePath, rainPath, nightBands, slopes } from '../src/lib/dayGraph.js'

const day = (date, temps, o = {}) => temps.map((t, hour) => ({ date, hour, temp: t, inches: 0, past: false, ...o }))

test('one scale for every column, and the hours grouped by day', () => {
  assert.deepEqual(graphScale([{ high: 80, low: 50 }, { high: 70, low: 48 }]), { lo: 48 - 2.56, hi: 80 + 2.56 })
  const h = hoursByDate([...day('2026-11-04', [50, 51]), ...day('2026-11-05', [52])])
  assert.equal(h['2026-11-04'].length, 2); assert.equal(h['2026-11-05'][0].temp, 52)
})

test('a day’s line runs into the next midnight, splits at now, and marks its high and low', () => {
  const temps = Array.from({ length: 24 }, (_, i) => 50 + Math.round(20 * Math.sin(((i - 9) / 24) * Math.PI * 2)))
  const hours = day('2026-11-04', temps).map((h) => ({ ...h, past: h.hour < 10 }))
  const next = day('2026-11-05', [55])
  const g = dayLine(hours, next, { lo: 30, hi: 80 }, { W: 104, H: 96 })
  assert.equal(g.future[g.future.length - 1].x, 104, 'the next midnight closes the column at its right edge')
  assert.equal(g.past[g.past.length - 1].x, g.future[0].x, 'past and future meet at now')
  assert.equal(g.past.length, 11); assert.equal(g.high.temp, Math.max(...temps)); assert.equal(g.low.temp, Math.min(...temps))
  assert.ok(g.high.y < g.low.y, 'warmer is higher')
  assert.match(linePath(g.past), /^M0 /)
  const allFuture = dayLine(day('2026-11-06', [60, 61]), null, { lo: 30, hi: 80 }, { W: 104, H: 96 })
  assert.equal(allFuture.past.length, 0); assert.equal(allFuture.future.length, 2)
})

test('rain is a filled band only when it rains, and night is shaded from sunset to sunrise', () => {
  assert.equal(rainPath([{ x: 0, inches: 0 }, { x: 10, inches: 0 }], { H: 96 }), null)
  const p = rainPath([{ x: 0, inches: 0 }, { x: 10, inches: 0.15 }, { x: 20, inches: 0.3 }], { H: 96 })
  assert.match(p, / 10 80 /); assert.match(p, / 20 80 L20 96 Z$/, 'a downpour fills the band and no more')
  const ys = [...p.matchAll(/-?\d+(?:\.\d+)? (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]))
  assert.ok(ys.every((y) => y >= 80 && y <= 96), 'the curved edge never rises above the band or dips under the line')
  assert.equal(rainPath([{ x: -4, inches: 0.2, beyond: true }, { x: 0, inches: 0 }, { x: 10, inches: 0 }], { H: 96 }), null, 'rain only beyond the edge is not this column’s')
  assert.deepEqual(nightBands({ sunrise: '2026-11-04T06:00', sunset: '2026-11-04T18:00' }, 96), [[0, 24], [72, 96]])
  assert.deepEqual(nightBands({}, 96), [])
})

test('the line is a smooth curve through every hour, never swinging past its neighbours', () => {
  const pts = [{ x: 0, y: 50 }, { x: 10, y: 45 }, { x: 20, y: 30 }, { x: 30, y: 28 }, { x: 40, y: 60 }]
  const m = slopes(pts)
  assert.equal(m[3], 0, 'flat at the top of a peak (y grows downward)')
  assert.ok(m[1] < 0 && m[2] < 0, 'steepness follows the climb')
  assert.equal(slopes([{ x: 0, y: 5 }, { x: 10, y: 5 }, { x: 20, y: 9 }])[1], 0, 'flat where the line levels off')
  assert.equal(slopes([{ x: 0, y: 1 }, { x: 10, y: 3 }])[0], 0.2)
  const path = linePath(pts.map((p, i) => ({ ...p, m: m[i] })))
  assert.match(path, /^M0 50 C/); assert.equal((path.match(/C/g) || []).length, 4)
  // a cubic between two points never leaves their range, so a peak in the data is the peak on screen
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], d = (b.x - a.x) / 3, c1 = a.y + m[i] * d, c2 = b.y - m[i + 1] * d
    for (let t = 0; t <= 1; t += 0.05) {
      const y = (1 - t) ** 3 * a.y + 3 * (1 - t) ** 2 * t * c1 + 3 * (1 - t) * t ** 2 * c2 + t ** 3 * b.y
      assert.ok(y >= Math.min(a.y, b.y) - 1e-9 && y <= Math.max(a.y, b.y) + 1e-9)
    }
  }
  assert.match(linePath([{ x: 0, y: 1 }, { x: 5, y: 2 }]), /^M0 1 L5 2$/, 'points without slopes stay straight')
})

test('two days meet at midnight without a corner, at the forecast’s tenth of a degree', () => {
  const temps = (base) => Array.from({ length: 24 }, (_, i) => base + 10 * Math.sin(((i - 9) / 24) * Math.PI * 2))
  const mk = (date, base) => temps(base).map((t, hour) => ({ date, hour, temp: Math.round(t), fine: Math.round(t * 10) / 10, inches: hour > 20 ? 0.05 : 0, past: false }))
  const d1 = mk('2026-11-04', 55), d2 = mk('2026-11-05', 50), d3 = mk('2026-11-06', 52)
  const scale = { lo: 30, hi: 80 }, box = { W: 104, H: 96 }
  const a = dayLine(d1, d2, scale, box), b = dayLine(d2, d3, scale, { ...box, prev: d1 })
  const end = a.future[a.future.length - 1], start = b.future[0]
  assert.equal(end.y, start.y, 'the same midnight'); assert.equal(end.m, start.m, 'bending the same way on both sides')
  assert.ok(Math.abs(a.future[1].y - (10 + (1 - (d1[1].fine - 30) / 50) * 62)) < 0.06, 'drawn at the tenth, not the whole degree')
  assert.equal(a.high.temp, Math.max(...d1.map((h) => h.temp)), 'the marked high is still the whole-degree figure')
  assert.ok(b.rain[0].beyond && b.rain[b.rain.length - 1].beyond, 'the rain keeps an hour past each edge to bend across midnight')
  assert.equal(b.rain.filter((r) => !r.beyond).length, 25)
})
