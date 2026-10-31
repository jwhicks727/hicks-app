import { test } from 'node:test'
import assert from 'node:assert/strict'
import { careToday, nectarDays, lastDone, plantingIn, newSpot, clampSpot, SPOT_KINDS, daysBetween } from '../src/lib/garden.js'

const spots = [{ id: 's1', name: 'the tomato box', kind: 'box' }, { id: 's2', name: 'the feeder', kind: 'feeder' }, { id: 's3', name: 'the fern', kind: 'pot', indoor: true }]
const plants = [{ id: 'p1', spot_id: 's1', name: 'tomatoes', water_days: 2, status: 'growing' }, { id: 'p2', spot_id: 's3', name: 'the fern', water_days: 7, status: 'growing' }, { id: 'p3', spot_id: 's1', name: 'old basil', water_days: 1, status: 'done' }]
const fc = (high, rain = 0, gusts = 10, low = 55) => ({ days: [{ high, low, rain, gusts }, { high, low, rain: 0, gusts: 10 }] })

test('water by each plant’s rhythm; sooner in heat; not with rain coming; never a finished plant', () => {
  const log = [{ kind: 'water', spot_id: 's1', on_date: '2026-11-01' }, { kind: 'water', spot_id: 's3', plant_id: 'p2', on_date: '2026-10-30' }]
  const c = careToday({ spots, plants, log, forecast: fc(80), today: '2026-11-03' })
  assert.ok(c.some((x) => x.what === 'Water tomatoes'))
  assert.ok(!c.some((x) => /fern|basil/.test(x.what)))
  assert.ok(careToday({ spots, plants, log, forecast: fc(97), today: '2026-11-02' }).some((x) => x.what === 'Water tomatoes'), 'a day early at 97°')
  const wet = careToday({ spots, plants, log, forecast: fc(70, 80), today: '2026-11-03' })
  assert.ok(wet.some((x) => x.what === 'Skip watering tomatoes'))
  assert.ok(!wet.some((x) => x.what === 'Water tomatoes'))
})

test('the feeder’s nectar spoils faster in heat; warnings for wind, heat and frost', () => {
  assert.deepEqual([nectarDays(95), nectarDays(85), nectarDays(72), nectarDays(60)], [2, 3, 4, 6])
  const log = [{ kind: 'refill', spot_id: 's2', on_date: '2026-11-01' }]
  assert.ok(careToday({ spots, plants: [], log, forecast: fc(92), today: '2026-11-03' }).some((x) => x.what === 'Fresh nectar for the feeder'))
  assert.ok(!careToday({ spots, plants: [], log, forecast: fc(65), today: '2026-11-03' }).some((x) => /nectar/.test(x.what)))
  const w = careToday({ spots: [], plants: [], log: [], forecast: fc(99, 0, 45, 31), today: '2026-11-03' })
  assert.deepEqual(w.map((x) => x.id), ['frost', 'wind', 'heat'], 'most pressing first')
})

test('the last time, the planting month, and new spots that stay inside their area', () => {
  assert.equal(lastDone([{ kind: 'water', spot_id: 's1', on_date: '2026-10-01' }, { kind: 'water', spot_id: 's1', on_date: '2026-10-05' }], 'water', 's1'), '2026-10-05')
  assert.equal(daysBetween('2026-10-30', '2026-11-03'), 4)
  assert.ok(plantingIn(11).plant.includes('garlic'))
  for (let m = 1; m <= 12; m++) assert.ok(plantingIn(m).sow.length && plantingIn(m).note, m)
  const s = newSpot('pot', 'a1', 2)
  assert.equal(s.kind, 'pot'); assert.equal(s.w, SPOT_KINDS.pot.w)
  assert.deepEqual(clampSpot({ x: 95, y: -4, w: 20, h: 10 }), { x: 80, y: 0, w: 20, h: 10 })
})

test('each job says what "Done" records', () => {
  const c = careToday({ spots, plants, log: [], forecast: fc(80), today: '2026-11-03' })
  assert.equal(c.find((x) => x.what === 'Water tomatoes').log, 'water')
  assert.equal(c.find((x) => /nectar/.test(x.what)).log, 'refill')
})

test('indoors, each pot has a type (chosen, or guessed from its name), a size and a pot; biggest first', async () => {
  const { formFor, sizeFor, lineup, PLANT_FORMS, POTS, PLANT_SIZES } = await import('../src/lib/garden.js')
  assert.equal(formFor({ name: 'Fiddle-leaf fig' }), 'tree')
  assert.equal(formFor({ name: 'Kitchen pot' }, 'Golden pothos'), 'trailing')
  assert.equal(formFor({ name: 'Snake plant' }), 'upright')
  assert.equal(formFor({ name: 'Something', form: 'orchid' }), 'orchid')
  assert.equal(formFor({ name: 'Mystery' }), 'bushy')
  assert.equal(sizeFor({ kind: 'pot' }), 'medium')
  const l = lineup([{ id: 'a', name: 'Basil', size: 'small' }, { id: 'b', name: 'Fig', size: 'tree' }, { id: 'c', name: 'Aloe', size: 'medium' }])
  assert.deepEqual(l.map((x) => x.spot.id), ['b', 'c', 'a'])
  // The migration allows exactly these
  const sql = (await import('node:fs')).readFileSync(new URL('../supabase/migrations/20261101060100_garden.sql', import.meta.url), 'utf8')
  for (const k of [...Object.keys(PLANT_FORMS), ...Object.keys(POTS), ...Object.keys(PLANT_SIZES)]) assert.match(sql, new RegExp(`'${k}'`), `${k} isn't allowed by the garden migration`)
})
