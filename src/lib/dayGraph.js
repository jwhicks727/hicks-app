// ============================================
// dayGraph.js -- the shapes under the day-by-day strip, as a weather site draws
// them: each day's temperature line through its hours, its high and low marked,
// night shaded from sunset to sunrise, and the chance of rain as a filled blue shape.
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
 * How steep a smooth line should be at each point (Steffen's monotone method,
 * the one charting libraries use): the curve passes through every point, never
 * swings past its neighbours (no false peaks, no rain below zero), and depends
 * only on the points either side, so two columns that share a midnight and its
 * neighbours bend the same way there and meet without a corner.
 */
export function slopes(pts) {
  const n = pts.length, m = new Array(n).fill(0)
  if (n < 2) return m
  const sec = (i) => { const h = pts[i + 1].x - pts[i].x; return h ? (pts[i + 1].y - pts[i].y) / h : 0 }
  for (let i = 1; i < n - 1; i++) {
    const h0 = pts[i].x - pts[i - 1].x, h1 = pts[i + 1].x - pts[i].x, s0 = sec(i - 1), s1 = sec(i)
    const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1)
    m[i] = ((s0 < 0 ? -1 : 1) + (s1 < 0 ? -1 : 1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
  }
  m[0] = n > 2 ? (3 * sec(0) - m[1]) / 2 : sec(0)
  m[n - 1] = n > 2 ? (3 * sec(n - 2) - m[n - 2]) / 2 : sec(n - 2)
  return m
}

const r1 = (v) => Math.round(v * 10) / 10

/**
 * One day's line: { past, future, high, low, rain } in a W × H box. `past` and `future` are the point lists
 * before and after now (they share the hour where they meet); high and low are the points to mark. `next` is
 * the next day's hours (its midnight closes the line) and `prev` the day before's: their hours either side
 * of the column set how the line bends at its edges, so it runs on into the next column without a corner.
 * Each point carries its slope (`m`) for `linePath`. Temperatures sit between top and H - bottom, at the
 * forecast's tenth of a degree (`fine`) where there is one, not the whole degrees shown as figures.
 */
export function dayLine(hours, next, scale, { W, H, top = 10, bottom = 24, prev = null }) {
  const own = (hours || []).filter((h) => Number.isFinite(h.temp))
  const close = next && next[0] && next[0].hour === 0 && Number.isFinite(next[0].temp) ? next[0] : null
  if (!own.length) return null
  const t = (h) => (Number.isFinite(h.fine) ? h.fine : h.temp)
  const y = (v) => top + (1 - (v - scale.lo) / (scale.hi - scale.lo || 1)) * (H - top - bottom)
  const at = (h, x) => ({ x, y: y(t(h)), past: Boolean(h.past), temp: h.temp, chance: chanceOf(h), hour: h.hour })
  // the column's own hours, the next midnight at the right edge, and an hour beyond each edge for the bend
  const before = prev && prev.length && prev[prev.length - 1].hour === 23 && own[0].hour === 0 && Number.isFinite(prev[prev.length - 1].temp) ? at(prev[prev.length - 1], -W / 24) : null
  const after = close && next[1] && next[1].hour === 1 && Number.isFinite(next[1].temp) ? at(next[1], W + W / 24) : null
  const body = [...own.map((h) => at(h, (h.hour / 24) * W)), ...(close ? [at(close, W)] : [])]
  const all = [...(before ? [before] : []), ...body, ...(after ? [after] : [])]
  const m = slopes(all), off = before ? 1 : 0
  const pts = body.map((p, i) => ({ ...p, x: r1(p.x), y: r1(p.y), m: Math.round(m[i + off] * 1000) / 1000 }))
  const mine = pts.slice(0, own.length)
  const high = mine.reduce((a, p) => (p.temp > a.temp ? p : a), mine[0]), low = mine.reduce((a, p) => (p.temp < a.temp ? p : a), mine[0])
  const cut = pts.findIndex((p) => !p.past)
  const past = cut === -1 ? pts : cut === 0 ? [] : pts.slice(0, cut + 1)
  const future = cut === -1 ? [] : pts.slice(cut)
  // the rain keeps the hours beyond the edges (marked `beyond`) so its curve bends across midnight too
  const rain = all.map((p) => ({ x: r1(p.x), chance: p.chance, ...(p === before || p === after ? { beyond: true } : {}) }))
  return { past, future, high, low, rain }
}

/** A point list as an SVG path: a smooth curve where the points carry their slopes (`m`), straight lines where they don't. */
export function linePath(pts) {
  return pts.map((p, i) => {
    if (!i) return `M${p.x} ${p.y}`
    const a = pts[i - 1], d = (p.x - a.x) / 3
    if (!Number.isFinite(a.m) || !Number.isFinite(p.m)) return `L${p.x} ${p.y}`
    return `C${r1(a.x + d)} ${r1(a.y + a.m * d)} ${r1(p.x - d)} ${r1(p.y - p.m * d)} ${p.x} ${p.y}`
  }).join(' ')
}

/**
 * An hour's chance of rain, 0-100, as the forecast gives it. Where it gives none (an hour long past, say),
 * the rain that fell answers: it rained (100) or it didn't (0).
 */
export function chanceOf(h) {
  if (Number.isFinite(h.rain)) return Math.max(0, Math.min(100, h.rain))
  return h.inches > 0 ? 100 : 0
}

/**
 * The chance of rain as a filled shape rising from the bottom, as a weather site draws it: 100% fills
 * `band` pixels (the whole graph, by default), so a 15% afternoon is a low bump and a sure thing a wall. Its
 * top edge curves like the temperature line; points marked `beyond` (an hour past each edge) only bend the
 * curve. Null when every hour in the column is 0%.
 */
export function rainPath(rain, { H, band = H }) {
  const inside = rain.filter((r) => !r.beyond)
  if (!inside.some((r) => r.chance > 0)) return null
  const pts = rain.map((r) => ({ x: r.x, y: H - (Math.min(100, Math.max(0, r.chance || 0)) / 100) * band, beyond: r.beyond }))
  const m = slopes(pts)
  const edge = pts.map((p, i) => ({ x: p.x, y: r1(p.y), m: Math.round(m[i] * 1000) / 1000, beyond: p.beyond })).filter((p) => !p.beyond)
  return `M${edge[0].x} ${H} ${linePath(edge).replace(/^M/, 'L')} L${edge[edge.length - 1].x} ${H} Z`
}

/** Night in a day's column, from its sunrise and sunset ("2026-11-04T06:12"): [[x0, x1], …]. */
export function nightBands(day, W) {
  const at = (s) => { const m = String(s || '').match(/T(\d\d):(\d\d)/); return m ? ((Number(m[1]) + Number(m[2]) / 60) / 24) * W : null }
  const up = at(day.sunrise), down = at(day.sunset)
  if (up == null || down == null) return []
  return [[0, Math.round(up)], [Math.round(down), W]]
}
