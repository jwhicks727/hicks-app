// ============================================
// garden.js -- what's on the garden's maps, and what it needs today
// ============================================
// Pure, so tests run it in Node. Care is worked out from what's been logged
// and the week's forecast at home: water by each plant's own rhythm (sooner
// in a heat wave, not at all with rain coming), the hummingbird feeder's
// nectar changed sooner the hotter it is, the bird bath kept fresh, and
// warnings for wind, heat and the rare frost.

export const SPOT_KINDS = {
  bed: { name: 'Bed', shape: 'rect', w: 30, h: 14, colour: '#7A4E2D' },
  box: { name: 'Raised box', shape: 'rect', w: 18, h: 12, colour: '#7A4E2D' },
  pot: { name: 'Pot', shape: 'round', w: 7, h: 7, colour: '#C8643B' },
  tree: { name: 'Tree', shape: 'round', w: 16, h: 16, colour: '#4E8A3E' },
  plant: { name: 'Plant', shape: 'round', w: 8, h: 8, colour: '#5FA35A' },
  feeder: { name: 'Bird feeder', shape: 'round', w: 5, h: 5, colour: '#D9463A' },
  bath: { name: 'Bird bath', shape: 'round', w: 8, h: 8, colour: '#7CC4D8' },
  compost: { name: 'Compost', shape: 'rect', w: 9, h: 9, colour: '#4A3626' },
  path: { name: 'Path', shape: 'rect', w: 40, h: 5, colour: '#D9CBB2' },
  other: { name: 'Something else', shape: 'rect', w: 10, h: 10, colour: '#9C8F80' },
}
export const ROOM_LIGHT = { bright: 'Bright window', medium: 'Medium light', low: 'Low light' }
export const SUN = { full: 'Full sun', part: 'Part sun', shade: 'Shade' }

const day = (s) => Date.parse(s + 'T12:00:00Z') / 864e5
export const daysBetween = (a, b) => Math.round(day(b) - day(a))

/** The last time something was done for a spot (or one plant in it): a date, or null. */
export function lastDone(log, kind, spotId, plantId) {
  let best = null
  for (const l of log) if (l.kind === kind && l.spot_id === spotId && (!plantId || !l.plant_id || l.plant_id === plantId) && (!best || l.on_date > best)) best = l.on_date
  return best
}

/** How often the hummingbird feeder's nectar wants changing at today's high (°F): it spoils fast in heat. */
export const nectarDays = (high) => (high >= 90 ? 2 : high >= 80 ? 3 : high >= 70 ? 4 : 6)

/**
 * What the garden needs today: [{ id, spot, what, why, level: 'now' | 'soon' | 'heads-up',
 * log (what "Done" records, if anything), plant }],
 * most pressing first. `forecast.days[0]` is today.
 */
export function careToday({ spots = [], plants = [], log = [], forecast = null, today }) {
  const out = []
  const days = (forecast && forecast.days) || []
  const t = days[0] || null, t1 = days[1] || null
  const high = t ? t.high : null
  const rainSoon = days.slice(0, 2).some((d) => (d.rain ?? 0) >= 60)
  const hot = high != null && high >= 95
  // Water: each growing plant with a rhythm, outdoors unless it's a room
  for (const p of plants) {
    if (p.status === 'done' || !p.water_days) continue
    const spot = spots.find((s) => s.id === p.spot_id)
    if (!spot) continue
    const last = lastDone(log, 'water', spot.id, p.id)
    const since = last ? daysBetween(last, today) : Infinity
    const due = p.water_days - (hot && !spot.indoor ? 1 : 0)
    if (since < due) continue
    if (rainSoon && !spot.indoor) { out.push({ id: `rain-${p.id}`, spot, what: `Skip watering ${p.name}`, why: 'Rain is likely in the next day or so.', level: 'heads-up' }); continue }
    out.push({ id: `water-${p.id}`, spot, log: 'water', plant: p.id, what: `Water ${p.name}`, why: last ? `Last watered ${since === 1 ? 'yesterday' : `${since} days ago`}${hot && !spot.indoor ? `, and it’s ${Math.round(high)}° today` : ''}.` : 'No watering logged yet.', level: since >= due + 2 ? 'now' : 'soon' })
  }
  // The feeder and the bath
  for (const s of spots) {
    if (s.kind === 'feeder') {
      const last = lastDone(log, 'refill', s.id), every = nectarDays(high ?? 75)
      const since = last ? daysBetween(last, today) : Infinity
      if (since >= every) out.push({ id: `nectar-${s.id}`, spot: s, log: 'refill', what: `Fresh nectar for ${s.name}`, why: `${last ? `Changed ${since} days ago` : 'Not changed yet'}; at ${high != null ? `${Math.round(high)}°` : 'this time of year'} it wants changing every ${every} days. One part sugar to four parts water, no dye.`, level: since >= every + 2 ? 'now' : 'soon' })
    }
    if (s.kind === 'bath') {
      const last = lastDone(log, 'refill', s.id), every = high != null && high >= 90 ? 2 : 3
      const since = last ? daysBetween(last, today) : Infinity
      if (since >= every) out.push({ id: `bath-${s.id}`, spot: s, log: 'refill', what: `Fresh water in ${s.name}`, why: last ? `Refreshed ${since} days ago.` : 'Not refreshed yet.', level: 'soon' })
    }
  }
  // The weather's own warnings, once each
  if (t && t.gusts >= 35) out.push({ id: 'wind', spot: null, what: 'Wind today', why: `Gusts to ${Math.round(t.gusts)} mph: bring light pots in, and water ahead of it; a dry wind pulls water out fast.`, level: 'heads-up' })
  if (hot) out.push({ id: 'heat', spot: null, what: 'Heat today', why: `${Math.round(high)}°: water early in the morning, and give pots some afternoon shade.`, level: 'heads-up' })
  const cold = [t, t1].filter(Boolean).find((d) => d.low <= 34)
  if (cold) out.push({ id: 'frost', spot: null, what: 'Frost possible', why: `Down to ${Math.round(cold.low)}°: cover tender plants overnight, and water the day before (wet soil holds warmth).`, level: 'now' })
  const rank = { now: 0, soon: 1, 'heads-up': 2 }
  return out.sort((a, b) => rank[a.level] - rank[b.level])
}

// What to sow and plant each month in inland Southern California (Fontana:
// USDA zone 9b–10a, Sunset 18–19). A general guide after the University of
// California's Master Gardener calendars for the Inland Empire; their own
// calendar is linked on the screen for the details.
export const PLANTING = {
  1: { sow: ['peas', 'lettuce', 'spinach', 'radishes', 'carrots', 'beets'], plant: ['bare-root roses and fruit trees', 'artichokes', 'strawberries'], note: 'Start tomato and pepper seeds indoors at the month’s end.' },
  2: { sow: ['potatoes', 'lettuce', 'carrots', 'radishes', 'peas'], plant: ['citrus', 'asparagus', 'strawberries'], note: 'Feed citrus as new growth starts.' },
  3: { sow: ['beans', 'squash', 'cucumbers', 'corn (late in the month)'], plant: ['tomatoes after the last cool night', 'peppers', 'herbs'], note: 'The best month for new perennials and natives.' },
  4: { sow: ['beans', 'squash', 'cucumbers', 'corn', 'melons', 'pumpkins for October'], plant: ['tomatoes', 'peppers', 'eggplant', 'basil'], note: 'Mulch before the heat comes.' },
  5: { sow: ['beans', 'okra', 'melons', 'sunflowers'], plant: ['sweet potatoes', 'peppers', 'basil'], note: 'Deep, less frequent watering trains roots down.' },
  6: { sow: ['beans', 'okra', 'more basil'], plant: ['heat-lovers only: peppers, eggplant, okra'], note: 'Water in the early morning; shade cloth for the tender things.' },
  7: { sow: ['pumpkins (early in the month)', 'beans'], plant: ['little: it’s too hot for most transplants'], note: 'Watch for heat stress and spider mites.' },
  8: { sow: ['broccoli and cabbage indoors, for September'], plant: ['nothing new outdoors until it cools'], note: 'Keep the feeder fresh: hummingbirds are busy.' },
  9: { sow: ['lettuce', 'kale', 'chard', 'peas', 'carrots', 'beets'], plant: ['broccoli', 'cabbage', 'cauliflower', 'natives (from late in the month)'], note: 'The second spring: the year’s best planting season begins.' },
  10: { sow: ['peas', 'lettuce', 'spinach', 'cilantro', 'radishes', 'carrots'], plant: ['garlic', 'onions', 'broccoli', 'kale', 'natives', 'wildflower seed before the rains'], note: 'Plant natives now so winter rain does the watering.' },
  11: { sow: ['peas', 'lettuce', 'spinach', 'cilantro', 'fava beans'], plant: ['garlic', 'onions', 'strawberries', 'natives', 'California poppies from seed'], note: 'Ease off the watering as it cools; the rains may start.' },
  12: { sow: ['peas', 'lettuce', 'spinach', 'radishes'], plant: ['bare-root fruit trees and roses (late in the month)'], note: 'Watch for frost on the coldest clear nights.' },
}
export const plantingIn = (month) => PLANTING[month] || PLANTING[1]

/** A new spot of a kind, placed near the middle of its area. */
export function newSpot(kind, areaId, n = 0) {
  const k = SPOT_KINDS[kind] || SPOT_KINDS.other
  return { area_id: areaId, kind, name: `${k.name}${n ? ` ${n + 1}` : ''}`, x: Math.max(0, 50 - k.w / 2 + (n % 4) * 3), y: Math.max(0, 50 - k.h / 2 + (n % 4) * 3), w: k.w, h: k.h }
}
/** A spot kept inside its area. */
export function clampSpot(s) {
  const w = Math.min(100, Math.max(1, s.w)), h = Math.min(100, Math.max(1, s.h))
  return { ...s, w, h, x: Math.min(100 - w, Math.max(0, s.x)), y: Math.min(100 - h, Math.max(0, s.y)) }
}
