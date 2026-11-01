import { test } from 'node:test'
import assert from 'node:assert/strict'
import { schoolDay, recessHours, worstFlag } from '../src/lib/recess.js'

test('the school day shown: today before mid-afternoon on a weekday, else the next weekday', () => {
  assert.equal(schoolDay('2026-11-02', 9), '2026-11-02') // a Monday morning
  assert.equal(schoolDay('2026-11-02', 16), '2026-11-03')
  assert.equal(schoolDay('2026-11-06', 16), '2026-11-09') // Friday afternoon: Monday
  assert.equal(schoolDay('2026-11-07', 10), '2026-11-09') // Saturday
  assert.equal(schoolDay('2026-11-08', 10), '2026-11-09') // Sunday
})

test('each hour of the school day gets its flag, with the air when it is known', () => {
  const hr = (hour, o = {}) => ({ time: `2026-11-03T${String(hour).padStart(2, '0')}:00`, date: '2026-11-03', hour, temp: 70, feels: 70, rain: 0, gusts: 8, uv: 3, ...o })
  const timeline = [hr(7), hr(8), hr(12, { feels: 100 }), hr(15), hr(16)]
  const air = [{ time: '2026-11-03T15:00', aqi: 160 }]
  const hours = recessHours(timeline, air, '2026-11-03')
  assert.deepEqual(hours.map((h) => [h.hour.hour, h.flag.level]), [[8, 'go'], [12, 'care'], [15, 'inside']])
  const w = worstFlag(hours)
  assert.equal(w.level, 'inside'); assert.equal(w.at, 15); assert.match(w.reasons[0], /Air is unhealthy/)
  assert.equal(worstFlag([]), null)
  assert.equal(recessHours(null, null, '2026-11-03').length, 0)
})
