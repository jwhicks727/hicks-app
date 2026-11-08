// ============================================
// paintingBatch.js -- many of Laurie's paintings at once: the crop, the year by her signature, the slugs
// ============================================
// Pure, so tests run it in Node. The screen is src/places/lifelist/AddPaintings.jsx.
// A batch waits in the family's storage (src/lib/inboxStore.js) until each painting
// is in her gallery; each is cropped and turned from its photo, never altered.
//
import { SEASONS, SEASON_ORDER } from './seasons.js'
import { cleanShape, shapeFromReading } from './shapes.js'
import { cleanLooks } from './gallery.js'

// A crop is { turn, angle, cx, cy, w, h }: the photo turned clockwise by `turn`
// (0, 90, 180 or 270), then a w x h box centred at cx,cy (in the turned photo's
// pixels) that leans `angle` degrees clockwise with the painting. Straightening
// turns the photo back by `angle` round the box, so the painting comes out level.

export const SIZES = { full: 2400, small: 720, kept: 3600, view: 1600, thumb: 240, look: 400, read: 1568, corner: 800 }
export const LEAN = 12 // the straightening slider's reach, either way, in degrees

const rad = (deg) => (deg * Math.PI) / 180
const norm = (turn) => ((Math.round(turn / 90) * 90) % 360 + 360) % 360

/** The photo's size once turned: [width, height]. */
export const turnedSize = (W, H, turn) => (norm(turn) % 180 ? [H, W] : [W, H])

/** The turn as a matrix and shift, from the photo's pixels to the turned photo's: [a11, a12, a21, a22, t1, t2]. */
function turnMatrix(W, H, turn) {
  switch (norm(turn)) {
    case 90: return [0, -1, 1, 0, H, 0]
    case 180: return [-1, 0, 0, -1, W, H]
    case 270: return [0, 1, -1, 0, 0, W]
    default: return [1, 0, 0, 1, 0, 0]
  }
}

/** The whole photo, turned, nothing cut away. */
export function wholeCrop(W, H, turn = 0) {
  const [w, h] = turnedSize(W, H, turn)
  return { turn: norm(turn), angle: 0, cx: w / 2, cy: h / 2, w, h }
}

/** The auto-crop's answer (src/lib/autocrop.js, in a small copy's pixels) as a crop of the photo itself. */
export function fromFound(found, W, H, smallW, smallH) {
  const kx = W / smallW, ky = H / smallH, k = (kx + ky) / 2
  return fitInside({ turn: 0, angle: found.angle, cx: found.cx * kx, cy: found.cy * ky, w: found.w * k, h: found.h * k }, W, H)
}

/** The crop after the photo is turned by `by` degrees more (90 is a quarter turn clockwise, -90 back). */
export function turnCrop(crop, W, H, by) {
  let c = { ...crop }
  for (let k = norm(by) / 90; k > 0; k--) {
    const [, h] = turnedSize(W, H, c.turn)
    c = { turn: norm(c.turn + 90), angle: c.angle, cx: h - c.cy, cy: c.cx, w: c.h, h: c.w }
  }
  return c
}

/** The box's corners in the turned photo: top left, top right, bottom right, bottom left. */
export function cropCorners({ angle, cx, cy, w, h }) {
  const cos = Math.cos(rad(angle)), sin = Math.sin(rad(angle))
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [cx + (sx * w * cos) / 2 - (sy * h * sin) / 2, cy + (sx * w * sin) / 2 + (sy * h * cos) / 2])
}

/** Is all of the box on the photo (to within `tol` pixels)? */
export function insideImage(crop, W, H, tol = 0.5) {
  const [tw, th] = turnedSize(W, H, crop.turn)
  return cropCorners(crop).every(([x, y]) => x >= -tol && y >= -tol && x <= tw + tol && y <= th + tol)
}

/** The box moved onto the photo and, if it must, shrunk round its centre until every corner is on it. */
export function fitInside(crop, W, H) {
  const [tw, th] = turnedSize(W, H, crop.turn)
  const c = { ...crop, cx: Math.min(tw, Math.max(0, crop.cx)), cy: Math.min(th, Math.max(0, crop.cy)), w: Math.max(1, crop.w), h: Math.max(1, crop.h) }
  const cos = Math.cos(rad(c.angle)), sin = Math.sin(rad(c.angle))
  let s = 1
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const dx = (sx * c.w * cos) / 2 - (sy * c.h * sin) / 2, dy = (sx * c.w * sin) / 2 + (sy * c.h * cos) / 2
    if (dx > 0) s = Math.min(s, (tw - c.cx) / dx); else if (dx < 0) s = Math.min(s, c.cx / -dx)
    if (dy > 0) s = Math.min(s, (th - c.cy) / dy); else if (dy < 0) s = Math.min(s, c.cy / -dy)
  }
  s = Math.max(0.01, s)
  return s < 1 ? { ...c, w: c.w * s, h: c.h * s } : c
}

/** The same crop with a new lean, kept on the photo. */
export const leanCrop = (crop, angle, W, H) => fitInside({ ...crop, angle: Math.max(-LEAN, Math.min(LEAN, Math.round(angle * 10) / 10)) }, W, H)

/**
 * How to draw the painting out of the photo on a canvas (ctx.setTransform(a, b, c, d, e, f), then
 * drawImage(photo, 0, 0)): { width, height, a, b, c, d, e, f }. `max` caps the long side; `region`
 * ([x, y, w, h] in the straightened painting's own pixels) draws only that part, a corner say.
 */
export function drawTransform(crop, W, H, { max = Infinity, region } = {}) {
  const [rx, ry, rw, rh] = region || [0, 0, crop.w, crop.h]
  const s = Math.min(1, max / Math.max(rw, rh))
  const [a11, a12, a21, a22, t1, t2] = turnMatrix(W, H, crop.turn)
  const cos = Math.cos(rad(crop.angle)), sin = Math.sin(rad(crop.angle))
  // out = s * (R(-angle) (A p + t - centre) + (w/2 - rx, h/2 - ry)), with R(-angle) = [cos sin; -sin cos]
  const m11 = s * (cos * a11 + sin * a21), m12 = s * (cos * a12 + sin * a22)
  const m21 = s * (-sin * a11 + cos * a21), m22 = s * (-sin * a12 + cos * a22)
  const qx = t1 - crop.cx, qy = t2 - crop.cy
  const e = s * (cos * qx + sin * qy + crop.w / 2 - rx), f = s * (-sin * qx + cos * qy + crop.h / 2 - ry)
  return { width: Math.max(1, Math.round(rw * s)), height: Math.max(1, Math.round(rh * s)), a: m11, b: m21, c: m12, d: m22, e, f }
}

/**
 * The other way from drawTransform: for a point of the upright painting (u and v from 0 to 1), the photo's pixel it
 * comes from, as [x, y]. `k` scales that to a smaller copy of the photo (its width over W), so a fingerprint can be
 * taken from the little copy the auto-crop measures.
 */
export function paintingPoint(crop, W, H, k = 1) {
  const t = drawTransform(crop, W, H)
  const det = t.a * t.d - t.b * t.c || 1e-9
  return (u, v) => {
    const ox = u * t.width - t.e, oy = v * t.height - t.f
    return [k * ((t.d * ox - t.c * oy) / det), k * ((-t.b * ox + t.a * oy) / det)]
  }
}

/**
 * The crop screen's view: the turned photo, straightened, fitted to a stage of sw x sh. `k` is the scale,
 * `matrix` the CSS transform for an <img> sized W x H with its origin at 0 0, and `box` where the crop's
 * box sits on the stage. Its box is level on screen: the photo leans under it.
 */
export function viewOf(crop, W, H, sw, sh, { zoom = false, frame = crop } = {}) {
  // Fitted to `frame` (the crop the view was last framed on: it holds still while a box is dragged, so the photo never
  // slides about under a finger), with the box drawn where `crop` is now. The two share their turn and lean.
  const [tw, th] = turnedSize(W, H, frame.turn)
  const cos = Math.cos(rad(frame.angle)), sin = Math.sin(rad(frame.angle))
  const fe = edgesOf(frame, W, H), ed = edgesOf(crop, W, H)
  // Whole photo: fit the photo's own bounds. Zoomed: fit the box (with a margin for its handles) and centre it.
  const bw = tw * Math.abs(cos) + th * Math.abs(sin), bh = tw * Math.abs(sin) + th * Math.abs(cos)
  const k = zoom ? Math.min(sw / (fe.right - fe.left), sh / (fe.bottom - fe.top)) * 0.86 : Math.min(sw / bw, sh / bh)
  // Where the frame's centre sits, in the level frame, from the photo's centre: zoomed, it's moved to the stage's centre
  const bx = zoom ? (fe.left + fe.right) / 2 : 0, by = zoom ? (fe.top + fe.bottom) / 2 : 0
  const [a11, a12, a21, a22, t1, t2] = turnMatrix(W, H, frame.turn)
  const m11 = k * (cos * a11 + sin * a21), m12 = k * (cos * a12 + sin * a22)
  const m21 = k * (-sin * a11 + cos * a21), m22 = k * (-sin * a12 + cos * a22)
  const qx = t1 - tw / 2, qy = t2 - th / 2
  const e = k * (cos * qx + sin * qy) + sw / 2 - k * bx, f = k * (-sin * qx + cos * qy) + sh / 2 - k * by
  return { k, zoom, matrix: [m11, m21, m12, m22, e, f], box: { left: sw / 2 + (ed.left - bx) * k, top: sh / 2 + (ed.top - by) * k, width: (ed.right - ed.left) * k, height: (ed.bottom - ed.top) * k } }
}

/** Does the box sit comfortably on the stage as it's framed: wholly on it, and not lost in the middle of a zoomed view? */
export function fitsStage(box, sw, sh, { zoom = false } = {}) {
  const on = box.left >= -1 && box.top >= -1 && box.left + box.width <= sw + 1 && box.top + box.height <= sh + 1
  return on && (!zoom || Math.max(box.width / sw, box.height / sh) > 0.3)
}

/** Two crops the same, to half a pixel (a copy brought back from the family's storage is the same crop). */
export const sameCrop = (a, b) => Boolean(a && b) && ['turn', 'angle', 'cx', 'cy', 'w', 'h'].every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) < 0.5)

/** The box as level edges round the turned photo's centre, as the crop screen sees it: { left, top, right, bottom }. */
export function edgesOf(crop, W, H) {
  const [tw, th] = turnedSize(W, H, crop.turn)
  const cos = Math.cos(rad(crop.angle)), sin = Math.sin(rad(crop.angle))
  const dx = crop.cx - tw / 2, dy = crop.cy - th / 2
  const x = cos * dx + sin * dy, y = -sin * dx + cos * dy
  return { left: x - crop.w / 2, right: x + crop.w / 2, top: y - crop.h / 2, bottom: y + crop.h / 2 }
}

/** Level edges back into a crop with the same turn and lean. */
export function fromEdges({ left, top, right, bottom }, crop, W, H) {
  const [tw, th] = turnedSize(W, H, crop.turn)
  const cos = Math.cos(rad(crop.angle)), sin = Math.sin(rad(crop.angle))
  const x = (left + right) / 2, y = (top + bottom) / 2
  return { ...crop, cx: tw / 2 + cos * x - sin * y, cy: th / 2 + sin * x + cos * y, w: right - left, h: bottom - top }
}

/**
 * The crop after a drag on the crop screen: `handle` is 'move' or the edges it holds ('n', 'se', ...),
 * dx and dy how far it went in the turned photo's pixels (the screen's own directions: the box is level
 * there). It stops at the photo's edge, and never gets smaller than a twenty-fifth of the photo.
 */
export function dragCrop(crop, handle, dx, dy, W, H) {
  const [tw, th] = turnedSize(W, H, crop.turn), min = Math.min(tw, th) * 0.04
  const moved = (base, t, ux, uy) => {
    const e = { ...base }
    if (handle === 'move') { e.left += ux * t; e.right += ux * t; e.top += uy * t; e.bottom += uy * t }
    if (handle.includes('w')) e.left = Math.min(base.left + ux * t, base.right - min)
    if (handle.includes('e')) e.right = Math.max(base.right + ux * t, base.left + min)
    if (handle.includes('n')) e.top = Math.min(base.top + uy * t, base.bottom - min)
    if (handle.includes('s')) e.bottom = Math.max(base.bottom + uy * t, base.top + min)
    return e
  }
  // As far along the drag as stays on the photo
  const furthest = (base, ux, uy) => {
    if (insideImage(fromEdges(moved(base, 1, ux, uy), crop, W, H), W, H)) return moved(base, 1, ux, uy)
    let lo = 0, hi = 1
    for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (insideImage(fromEdges(moved(base, mid, ux, uy), crop, W, H), W, H)) lo = mid; else hi = mid }
    return moved(base, lo, ux, uy)
  }
  const start = edgesOf(crop, W, H)
  // Across, then up and down, so a box against one edge still slides along it
  return fromEdges(furthest(furthest(start, dx, 0), 0, dy), crop, W, H)
}

/** The corner nearest a point (level edges round the turned photo's centre), as a handle: 'nw', 'ne', 'se' or 'sw'. */
export function nearestCorner({ left, top, right, bottom }, x, y) {
  return (y - top < bottom - y ? 'n' : 's') + (x - left < right - x ? 'w' : 'e')
}

/** Where artists sign: each corner of the straightened painting, a third across and a quarter up, as [x, y, w, h]. */
export function signatureCorners(w, h) {
  const cw = w * 0.34, ch = h * 0.26
  return [[0, 0, cw, ch], [w - cw, 0, cw, ch], [0, h - ch, cw, ch], [w - cw, h - ch, cw, ch]]
}

// ---- The year by her signature, and the working title ------------------------------

/**
 * The year a reading of her signature gives, { year, from }: `from` is 'signature' when every digit
 * read clearly, 'unsure' when some were hard to make out, null with no year. What she wrote is
 * trusted over Claude's own sum, and nothing before 1950 (the gallery's earliest) or in the future
 * is a year. A two-digit year ('19) is the one not in the future.
 */
export function yearFromReading(reading, thisYear) {
  if (!reading || reading.legible === 'none') return { year: null, from: null }
  const ok = (y) => Number.isInteger(y) && y >= 1950 && y <= thisYear
  const written = String(reading.written || '')
  let year = null
  const four = written.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/)
  const two = written.match(/(?:['’‘`]|\/|\.|-)\s?(\d{2})(?!\d)\s*$/) || written.match(/^\s*(\d{2})\s*$/)
  if (four) year = Number(four[1])
  else if (two) { const yy = Number(two[1]); year = yy <= thisYear % 100 ? 2000 + yy : 1900 + yy }
  if (!ok(year) && ok(Number(reading.year))) year = Number(reading.year)
  if (!ok(year)) return { year: null, from: null }
  const agrees = !reading.year || Number(reading.year) === year
  return { year, from: reading.legible === 'clear' && agrees ? 'signature' : 'unsure' }
}

/** A year typed in the box: { year } (null for none) or { error } in words. */
export function cleanYear(text, thisYear) {
  const t = String(text ?? '').trim()
  if (!t) return { year: null }
  if (!/^\d{4}$/.test(t)) return { error: 'A year is four digits, like 2019.' }
  const y = Number(t)
  if (y < 1950 || y > thisYear) return { error: `A year from 1950 to ${thisYear}.` }
  return { year: y }
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_WORDS = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:uary|ruary|ch|il|e|y|ust|t|tember|ober|ember)?\b\.?/i

/**
 * The month she wrote with the year, when she wrote one ("6/21", "June 2019", "Mar '19", "10.2018"): { month, from },
 * `from` as for the year. What she wrote is read first (a number before the year, the American way round, or a month's
 * name); Claude's own reading only when the writing gives none. Never a month from the style or the season it shows.
 */
export function monthFromReading(reading) {
  if (!reading || reading.legible === 'none') return { month: null, from: null }
  const w = String(reading.written || '').trim()
  let month = null
  const three = w.match(/(?:^|\D)(\d{1,2})\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{2,4}(?!\d)/) // 6/12/21: month, day, year
  const two = w.match(/(?:^|\D)(\d{1,2})\s*[/.-]\s*(?:\d{2}|\d{4})\s*$/) // 6/21, 10.2018: month, year
  const back = w.match(/(?:^|\D)(?:19|20)\d{2}\s*[/.-]\s*(\d{1,2})(?!\d)/) // 2019/06
  const name = w.match(MONTH_WORDS)
  if (name) month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(name[1].toLowerCase()) + 1
  else if (three) month = Number(three[1])
  else if (two) month = Number(two[1])
  else if (back) month = Number(back[1])
  const ok = (m) => Number.isInteger(m) && m >= 1 && m <= 12
  // Writing it couldn't make out a month from (and more than a bare year): Claude's own reading of it
  const bareYear = /^\s*(?:['’‘`]?\d{2}|\d{4})\s*$/.test(w)
  if (!ok(month)) month = w && !bareYear && ok(Number(reading.month)) ? Number(reading.month) : null
  if (!ok(month)) return { month: null, from: null }
  const agrees = !Number(reading.month) || Number(reading.month) === month
  return { month, from: reading.legible === 'clear' && agrees ? 'signature' : 'unsure' }
}

/** A month chosen in the box: 1 to 12, or null for none. */
export const cleanMonth = (v) => { const m = Number(v); return Number.isInteger(m) && m >= 1 && m <= 12 ? m : null }

/** "June 2019", "2019", or '' with neither. */
export const paintedWords = (year, month) => (year ? (cleanMonth(month) ? `${MONTHS[month - 1]} ${year}` : String(year)) : '')

/** A working title as Claude gave it or someone typed it: one line, no wrapping quotes, at most 200 letters. */
export function cleanTitle(t) {
  return String(t ?? '').replace(/\s+/g, ' ').trim().replace(/^["“”'‘’]+|["“”'‘’.]+$/g, '').trim().slice(0, 200)
}

/** A medium as Claude suggested it or someone typed it: one line, at most 80 letters (the table's limit), its first letter capital. */
export function cleanMedium(t) {
  const m = String(t ?? '').replace(/\s+/g, ' ').trim().replace(/[.]+$/, '').slice(0, 80).trim()
  return m ? m[0].toUpperCase() + m.slice(1) : ''
}

/** Seasons the app knows, each once, in the app's own order. */
export const cleanSeasons = (list) => SEASON_ORDER.filter((k) => (Array.isArray(list) ? list : []).includes(k) && SEASONS[k])

/** A slug for the painting's address and its folder in the bucket, not taken by another (nor by /add). */
export function slugFor(title, taken = []) {
  const base = String(title || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '') || 'painting'
  const used = new Set([...taken, 'add', 'inbox', 'look-again']) // /add and /look-again are screens; inbox/ is the folder photos wait in
  if (!used.has(base)) return base
  for (let k = 2; ; k++) if (!used.has(`${base}-${k}`)) return `${base}-${k}`
}

/** The turn a reading asks for, as a quarter-turn count clockwise: 0, 90, 180 or 270. */
export const readTurn = (turn) => (Number.isFinite(Number(turn)) ? norm(Number(turn)) : 0)

/**
 * A photo after Claude has read it: the title, year, medium and seasons filled in where nobody has
 * set their own, and turned upright if it lay sideways and nobody has touched its crop. What Claude
 * read is kept beside it, so the screen can say where each came from.
 */
export function applyReading(item, reading, thisYear) {
  const next = { ...item, read: 'done', reading: { signature: cleanTitle(reading.signature).slice(0, 120), written: String(reading.written || '').slice(0, 40), legible: reading.legible } }
  const touched = item.touched || {}
  if (!touched.title) { const t = cleanTitle(reading.title); if (t) next.title = t }
  if (!touched.year) { const y = yearFromReading(reading, thisYear); next.year = y.year ? String(y.year) : ''; next.yearFrom = y.from }
  if (!touched.medium) { next.medium = cleanMedium(reading.medium); next.mediumFrom = next.medium ? 'claude' : null }
  if (!touched.seasons) { next.seasons = cleanSeasons(reading.seasons); next.seasonsFrom = 'claude' }
  if (!touched.month && !touched.year) { const m = monthFromReading(reading); next.month = next.year && m.month ? m.month : null; next.monthFrom = next.month ? m.from : null }
  if (!touched.shape && reading.shape !== undefined) { const sh = cleanShape(shapeFromReading(reading.shape)); next.shape = sh; next.shapeFrom = sh ? 'claude' : null }
  if (!touched.looks && reading.subjects !== undefined) next.looks = cleanLooks(reading)
  const turn = readTurn(reading.turn)
  if (!touched.crop && turn && item.crop) next.crop = fitInside(turnCrop(item.crop, item.W, item.H, turn), item.W, item.H)
  return next
}

// ---- The batch -----------------------------------------------------------------------
/** Where each photo stands: new (getting ready), ready (to check), saving, added, skipped, failed. */
export const DONE = ['added', 'skipped']

/** How the batch stands: counts of each state, and how many the auto-crop wasn't sure of among those still to check. */
export function tally(items = []) {
  const t = { total: items.length, new: 0, ready: 0, saving: 0, added: 0, skipped: 0, failed: 0, unsure: 0, reading: 0 }
  for (const it of items) {
    t[it.status] = (t[it.status] || 0) + 1
    if (it.status === 'ready' && it.sure === false && !(it.touched && it.touched.crop)) t.unsure++
    if (it.read === 'waiting' || it.read === 'reading') t.reading++
  }
  t.toCheck = t.ready + t.failed + t.new
  t.finished = t.total > 0 && t.added + t.skipped === t.total
  return t
}

/** The next photo to check after `fromId`, going round: one ready to check, else one still getting ready. Null when none is left. */
export function nextToCheck(items, fromId) {
  const i = items.findIndex((x) => x.id === fromId), n = items.length
  for (const want of [['ready', 'failed'], ['new']]) {
    for (let k = 1; k <= n; k++) {
      const it = items[(Math.max(i, 0) + k) % n]
      if (want.includes(it.status) && (it.id !== fromId || k === n)) return it.id
    }
  }
  return null
}

/** The slugs a new painting mustn't take: the gallery's, the ones bundled with the code, and the others in this batch. */
export function takenSlugs(gallery = [], bundled = [], items = [], except) {
  return [...gallery.map((p) => p.slug), ...bundled.map((p) => p.slug), ...items.filter((x) => x.id !== except && x.slug).map((x) => x.slug)]
}

// ---- A batch that waits in the family's storage, to be picked up on any device -------------
/** The parts of a photo that travel to the family's storage; the rest (its File, `local`, `editing`) stays on the device. */
export const SYNCED = ['id', 'seq', 'name', 'status', 'read', 'readAt', 'readError', 'title', 'named', 'year', 'yearFrom', 'month', 'monthFrom', 'medium', 'mediumFrom', 'seasons', 'seasonsFrom', 'shape', 'shapeFrom', 'looks', 'touched', 'reading', 'W', 'H', 'crop', 'auto', 'sure', 'kind', 'print', 'printOf', 'dupOk', 'replace', 'slug', 'saveError', 'savingAt', 'error']
const DEVICE_ONLY = ['editing']
/** A photo as its row keeps it: only the synced parts, always in the same order, so two copies compare as text. */
export const inboxData = (item, keys = SYNCED) => Object.fromEntries(keys.filter((k) => item[k] !== undefined).map((k) => [k, item[k]]))
/** Where one of a waiting photo's pictures is in the private `paintings` bucket. */
export const inboxPath = (id, name) => `inbox/${id}/${name}.jpg`
/** A fresh id for a photo (a uuid: it is the row's key and its folder in the bucket). */
export function newId() {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null
  if (c && c.randomUUID) return c.randomUUID()
  const h = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `${h(8)}-${h(4)}-4${h(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`
}
/** How long a device's claim on a reading or a save holds before another device may take it over (it was closed mid-way). */
export const CLAIM_MS = 3 * 60 * 1000
export const claimStale = (at, now = Date.now(), ms = CLAIM_MS) => !at || now - at > ms

/**
 * This device's photos and the family's storage's, as one list. What's in storage wins, except
 * a photo this device has changed and not yet sent (`dirty`, a set of ids), and photos still being
 * got ready here (`local`). A photo that's gone from storage (put away on another device) goes.
 * Order is the order they were added (`seq`).
 */
export function mergeInbox(local, remote, dirty = new Set()) {
  const mine = new Map(local.map((x) => [x.id, x]))
  const remoteIds = new Set(remote.map((x) => x.id))
  // A photo taken from storage keeps what only this device knows about it (the form it has open)
  const keepDevice = (x, from) => ({ ...x, ...Object.fromEntries(DEVICE_ONLY.filter((k) => from && from[k] !== undefined).map((k) => [k, from[k]])) })
  const synced = remote.map((r) => {
    const l = mine.get(r.id)
    return l && !l.local && dirty.has(r.id) ? l : keepDevice(r, l)
  })
  // Changed here and not sent yet, and not in storage (yet): keep it, it's on its way
  const unsent = local.filter((x) => !x.local && !remoteIds.has(x.id) && dirty.has(x.id))
  const order = (a, b) => (a.seq || 0) - (b.seq || 0) || String(a.id).localeCompare(String(b.id))
  return [...[...synced, ...unsent].sort(order), ...local.filter((x) => x.local)]
}

// ---- Her gallery looked over again (src/places/lifelist/LookAgain.jsx) ------------------------
/**
 * What looking at a painting already in her gallery again suggests changing, for a parent to tick: a month by her
 * signature (where it has none, or a different one), a year (only where it has none), a canvas shape (only where it
 * has none), and Claude's words about it. Each says where it came from; `sure` is whether to tick it to begin with.
 * Nothing she or a parent already gave is ever suggested away.
 */
export function lookProposals(p, reading, thisYear) {
  const out = {}
  if (!reading) return out
  const y = yearFromReading(reading, thisYear)
  const m = monthFromReading(reading)
  const written = String(reading.written || '').slice(0, 40)
  if (!p.year && y.year) out.year = { value: y.year, sure: y.from === 'signature', written }
  const year = p.year || (out.year && out.year.value)
  // A month only with a year, and only if the year read agrees with the one kept
  if (m.month && year && (!y.year || y.year === year) && m.month !== p.month) out.month = { value: m.month, sure: m.from === 'signature' && !p.month, written, was: p.month || null }
  const sh = cleanShape(shapeFromReading(reading.shape))
  if (sh && !cleanShape(p.shape)) out.shape = { value: sh, sure: true }
  const looks = cleanLooks(reading)
  if (looks) out.looks = { value: looks }
  return out
}
