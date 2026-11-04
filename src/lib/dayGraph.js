// ============================================
// dayGraph.js -- the shapes under the day-by-day strip, as a weather site draws
// them: each day's temperature line through its hours, its high and low marked,
// night shaded from sunset to sunrise, and the rain as a filled blue band.
// ============================================
// Pure geometry: each day's column draws its own 24 hours (and the next
// midnight, so the line runs on into the next column without a break), all on
// one scale, so the columns read as one line.

/** One temperature scale for every column: the lowest low and highest high, with a little room. */
export function graphScale(days) {
  const hi = Math.max(...days.map((d) => d.high).filter(Number.isFinite)), lo = Math.min(...days.map((d) => d.low).filter(Number.isFinite))
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return { lo: 40, hi: 80 }
  const pad = Math.max(2, (hi - lo) * 0.08)
  return { lo: lo - pad, hi: hi + pad }
}

/** The hours of the timeline by date: date -> [hour, …] in order. */
export function hoursByDate(timeline) {
  const out = {}
  for (const h of timeline || []) (out[h.date] ||= []).push(h)
  return out
}

/**
 * One day's line: { past, future, high, low, rain, maxRainIn } in a W × H box. `past` and `future` are the
 * point lists before and after now (they share the hour where they meet); high and low are the points to mark.
 * `next` is the next day's hours (its midnight closes the line). Temperatures sit between top and H - bottom.
 */
export function dayLine(hours, next, scale, { W, H, top = 10, bottom = 24 }) {
  const list = [...(hours || []), ...(next && next[0] && next[0].hour === 0 ? [next[0]] : [])].filter((h) => Number.isFinite(h.temp))
  if (!list.length) return null
  const x = (h, i) => (i === list.length - 1 && h.hour === 0 && i > 0 ? W : (h.hour / 24) * W)
  const y = (t) => top + (1 - (t - scale.lo) / (scale.hi - scale.lo || 1)) * (H - top - bottom)
  const pts = list.map((h, i) => ({ x: Math.round(x(h, i) * 10) / 10, y: Math.round(y(h.temp) * 10) / 10, past: Boolean(h.past), temp: h.temp, inches: h.inches || 0, hour: h.hour }))
  const own = pts.slice(0, hours.length)
  const high = own.reduce((a, p) => (p.temp > a.temp ? p : a), own[0]), low = own.reduce((a, p) => (p.temp < a.temp ? p : a), own[0])
  const cut = pts.findIndex((p) => !p.past)
  const past = cut === -1 ? pts : cut === 0 ? [] : pts.slice(0, cut + 1)
  const future = cut === -1 ? [] : pts.slice(cut)
  return { past, future, high, low, rain: pts.map((p) => ({ x: p.x, inches: p.inches })) }
}

/** A point list as an SVG path. */
export const linePath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')

/** The rain as a filled shape along the bottom: inches per hour, scaled so `fullIn` fills `band` pixels. Null when dry. */
export function rainPath(rain, { H, band = 16, fullIn = 0.15 }) {
  if (!rain.some((r) => r.inches > 0)) return null
  const y = (inches) => Math.round((H - Math.min(1, inches / fullIn) * band) * 10) / 10
  return `M${rain[0].x} ${H} ` + rain.map((r) => `L${r.x} ${y(r.inches)}`).join(' ') + ` L${rain[rain.length - 1].x} ${H} Z`
}

/** Night in a day's column, from its sunrise and sunset ("2026-11-04T06:12"): [[x0, x1], …]. */
export function nightBands(day, W) {
  const at = (s) => { const m = String(s || '').match(/T(\d\d):(\d\d)/); return m ? ((Number(m[1]) + Number(m[2]) / 60) / 24) * W : null }
  const up = at(day.sunrise), down = at(day.sunset)
  if (up == null || down == null) return []
  return [[0, Math.round(up)], [Math.round(down), W]]
}
