import { test } from 'node:test'
import assert from 'node:assert/strict'
import { graphScale, hoursByDate, dayLine, linePath, rainPath, nightBands } from '../src/lib/dayGraph.js'

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
  assert.match(p, /L10 80/); assert.match(p, /L20 80/, 'a downpour fills the band and no more'); assert.match(p, /Z$/)
  assert.deepEqual(nightBands({ sunrise: '2026-11-04T06:00', sunset: '2026-11-04T18:00' }, 96), [[0, 24], [72, 96]])
  assert.deepEqual(nightBands({}, 96), [])
})
