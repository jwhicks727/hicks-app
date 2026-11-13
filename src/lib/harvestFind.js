// ============================================
// harvestFind.js -- what else a painting's own pixels can tell the Thanksgiving shows
// ============================================
// Beside a stream (waterway.js), a fire and gold (harvest.js): a round disc painted on a square (the mandala's
// wheel), a reflection (a lake's mirror line), fruit (pumpkins and gourds, each cut out whole) and a blossom (cut
// into its petals). Everything is read from the colours of a small copy of the painting, and what is cut is a copy of
// her pixels with a soft edge: nothing is drawn or generated, and her painting is never changed.
// Pure, so tests run it in Node (tests/harvest-find.test.mjs).
import { hsv } from './harvest.js'

const round = (x) => Math.round(x * 10000) / 10000

// ---- A disc painted on the canvas ---------------------------------------------------------------------

/**
 * A round disc painted on the canvas (a mandala on a square, a plate, a wreath): where its edge is, found by walking
 * out from the middle in many directions to where the colour changes most, then fitting a circle to those places. The
 * fit has to agree round most of the way, or there is no disc. { x, y, r } as fractions of the width.
 */
export function findDisc({ data, width: W, height: H }) {
  const m = Math.min(W, H), N = 96, r0 = Math.round(m * 0.3), r1 = Math.round(m * 0.62)
  const pts = []
  for (let k = 0; k < N; k++) {
    const th = (2 * Math.PI * k) / N, cos = Math.cos(th), sin = Math.sin(th)
    const cols = []
    for (let r = r0; r <= r1; r++) {
      const x = Math.round(W / 2 + r * cos), y = Math.round(H / 2 + r * sin)
      cols.push(x < 0 || y < 0 || x >= W || y >= H ? null : [data[(y * W + x) * 4], data[(y * W + x) * 4 + 1], data[(y * W + x) * 4 + 2]])
    }
    const mean = (a, b) => { const s = [0, 0, 0]; let n = 0; for (let i = a; i <= b; i++) if (cols[i]) { s[0] += cols[i][0]; s[1] += cols[i][1]; s[2] += cols[i][2]; n++ } return n >= 3 ? s.map((v) => v / n) : null }
    const scores = []
    for (let j = 6; j < cols.length - 3; j++) {
      const a = mean(j - 6, j - 1), b = mean(j + 1, Math.min(cols.length - 1, j + 6))
      scores.push(a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : 0)
    }
    const top = Math.max(...scores)
    if (top < 45) continue
    // the outermost place that is nearly as strong as the strongest: the disc's rim, not something inside it
    let j = scores.length - 1
    while (j > 0 && scores[j] < top * 0.6) j--
    const rad = r0 + 6 + j
    pts.push([W / 2 + rad * cos, H / 2 + rad * sin])
  }
  if (pts.length < N * 0.6) return null
  const fit = (use) => {
    // Kasa's circle fit: least squares on x² + y² + a x + b y + c = 0
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0
    for (const [x, y] of use) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z }
    const n = use.length, A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], B = [-sxz, -syz, -sz]
    const det = (M) => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    const D = det(A)
    if (Math.abs(D) < 1e-6) return null
    const col = (i) => A.map((row, r) => row.map((v, c) => (c === i ? B[r] : v)))
    const a = det(col(0)) / D, b = det(col(1)) / D, c = det(col(2)) / D
    const cx = -a / 2, cy = -b / 2, R = Math.sqrt(Math.max(0, cx * cx + cy * cy - c))
    return { cx, cy, R }
  }
  let f = fit(pts)
  if (!f) return null
  for (let pass = 0; pass < 2; pass++) {
    const inl = pts.filter(([x, y]) => Math.abs(Math.hypot(x - f.cx, y - f.cy) - f.R) < m * 0.035)
    if (inl.length < N * 0.55) return null
    const g = fit(inl)
    if (!g) return null
    f = g
  }
  const inliers = pts.filter(([x, y]) => Math.abs(Math.hypot(x - f.cx, y - f.cy) - f.R) < m * 0.035).length
  if (inliers < N * 0.6 || f.R < m * 0.3 || f.R > m * 0.56 || Math.hypot(f.cx - W / 2, f.cy - H / 2) > m * 0.15) return null
  return { x: round(f.cx / W), y: round(f.cy / H), r: round(f.R / W) }
}

// ---- A reflection ---------------------------------------------------------------------------------------

/**
 * A reflection, or null: a row of the painting below which the picture is the picture above, turned over (a lake, a
 * puddle, a polished table). Each side of a row is reduced to its colour (without its brightness: a reflection is
 * darker) in a column of the painting, and the two are compared column against column; at a mirror line they agree
 * far better than when one side is itself turned left to right, which is the control. Painted symmetry (a mandala)
 * agrees both ways, so is no reflection. { y, ratio } as a fraction of the height.
 */
export function findMirror({ data, width: W, height: H }, { limit = 0.58, min = 0.035, shore = 40 } = {}) {
  const C = 32, cw = W / C
  const chroma = (y0, y1) => Array.from({ length: C }, (_, c) => {
    let r = 0, g = 0, b = 0, n = 0
    for (let y = y0; y <= y1; y++) for (let x = Math.floor(c * cw); x < Math.floor((c + 1) * cw); x++) { const i = (y * W + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++ }
    const t = r + g + b + 1
    return [r / t, g / t]
  })
  let best = null
  for (let h = Math.floor(H * 0.3); h <= Math.floor(H * 0.7); h += 2) {
    const K = Math.min(h - 1, H - 2 - h, Math.floor(H * 0.3))
    if (K < H * 0.12) continue
    const top = chroma(h - K, h - 1), bot = chroma(h + 1, h + K)
    let da = 0, df = 0
    for (let c = 0; c < C; c++) {
      da += Math.abs(top[c][0] - bot[c][0]) + Math.abs(top[c][1] - bot[c][1])
      df += Math.abs(top[c][0] - bot[C - 1 - c][0]) + Math.abs(top[c][1] - bot[C - 1 - c][1])
    }
    da /= C; df /= C
    if (df < min) continue
    if (!best || da / df < best.ratio) best = { y: h / H, ratio: da / df }
  }
  if (!best || best.ratio >= limit) return null
  // And a shoreline there: the colour changes along the row itself, as water meets what stands in it
  const h = Math.round(best.y * H)
  let edge = 0
  for (let hh = h - 4; hh <= h + 4; hh++) {
    let e = 0
    for (let x = 0; x < W; x++) {
      const a = [0, 0, 0], b = [0, 0, 0]
      for (let k = 1; k <= 3; k++) for (let c = 0; c < 3; c++) { a[c] += data[((hh - k) * W + x) * 4 + c]; b[c] += data[((hh + k) * W + x) * 4 + c] }
      e += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 3
    }
    edge = Math.max(edge, e / W)
  }
  return edge >= shore ? { y: round(best.y), ratio: round(best.ratio) } : null
}

// ---- Fruit and blossoms: shapes of one colour, cut out whole ----------------------------------------------

/** The 4-connected clusters of true pixels in a mask: [{ n, x0, x1, y0, y1, cx, cy, idx }]. */
export function clusters(mask, W, H) {
  const seen = new Uint8Array(W * H), out = []
  for (let s0 = 0; s0 < W * H; s0++) {
    if (!mask[s0] || seen[s0]) continue
    const stack = [s0], idx = []
    seen[s0] = 1
    let x0 = W, x1 = 0, y0 = H, y1 = 0, sx = 0, sy = 0
    while (stack.length) {
      const i = stack.pop(), x = i % W, y = (i - x) / W
      idx.push(i); sx += x; sy += y
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1) }
      if (x < W - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1) }
      if (y > 0 && mask[i - W] && !seen[i - W]) { seen[i - W] = 1; stack.push(i - W) }
      if (y < H - 1 && mask[i + W] && !seen[i + W]) { seen[i + W] = 1; stack.push(i + W) }
    }
    out.push({ n: idx.length, x0, x1, y0, y1, cx: sx / idx.length, cy: sy / idx.length, idx })
  }
  return out
}

/** Grow (or shrink) a mask by one pixel, three by three. */
export function morph(m, W, H, grow) {
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = grow ? 0 : 1
    for (let dy = -1; dy <= 1 && (grow ? !v : v); dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy, t = xx >= 0 && yy >= 0 && xx < W && yy < H ? m[yy * W + xx] : grow ? 0 : 1
      if (grow ? t : !t) { v = grow ? 1 : 0; break }
    }
    out[y * W + x] = v
  }
  return out
}

/** Fill the holes in a mask (a pumpkin's painted lines and highlights), by flooding the outside. */
export function fillHoles(m, W, H) {
  const out = new Uint8Array(W * H).fill(1), stack = []
  const push = (i) => { if (!m[i] && out[i]) { out[i] = 0; stack.push(i) } }
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x) }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1) }
  while (stack.length) {
    const i = stack.pop(), x = i % W
    if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (i >= W) push(i - W); if (i < W * (H - 1)) push(i + W)
  }
  return out
}

const maskBy = ({ data, width: W, height: H }, test) => {
  const m = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) { const [h, s, v] = hsv(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]); m[i] = test(h, s, v) ? 1 : 0 }
  return m
}
const FRUIT = (h, s, v) => h >= 6 && h <= 38 && s > 0.55 && v > 0.55
const BLOOM = (h, s, v) => h >= 38 && h <= 54 && s > 0.6 && v > 0.65

/** Whole-looking shapes in a mask: not too small, not the whole picture, filling their box, about as tall as wide. */
function wholeShapes(px, test, { minA, maxA, fill = 0.55, aspect = [0.5, 2] }) {
  const { width: W, height: H } = px
  let m = maskBy(px, test)
  m = morph(morph(m, W, H, true), W, H, false) // close small gaps: a brush's streaks
  return clusters(m, W, H).filter((c) => {
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1, a = c.n / (W * H)
    return a >= minA && a <= maxA && c.n / (bw * bh) >= fill && bw / bh >= aspect[0] && bw / bh <= aspect[1]
  })
}

/** The pumpkins, gourds and other round orange fruit in a painting: [{ cx, cy, w, h }] as fractions of it. */
export function findFruit(px) {
  const { width: W, height: H } = px
  return wholeShapes(px, FRUIT, { minA: 0.004, maxA: 0.3 }).map((c) => ({ cx: round(c.cx / W), cy: round(c.cy / H), w: round((c.x1 - c.x0 + 1) / W), h: round((c.y1 - c.y0 + 1) / H) }))
}

/** A copy of her pixels under a soft mask: { w, h, rgba, x, y } (its top-left in the picture), the mask made whole and a little grown. */
function piece(px, idx, grow = 1) {
  const { data, width: W, height: H } = px
  let x0 = W, x1 = 0, y0 = H, y1 = 0
  for (const i of idx) { const x = i % W, y = (i - x) / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  const pad = grow + 3, bw = x1 - x0 + 1 + pad * 2, bh = y1 - y0 + 1 + pad * 2
  let m = new Uint8Array(bw * bh)
  for (const i of idx) { const x = i % W, y = (i - x) / W; m[(y - y0 + pad) * bw + (x - x0 + pad)] = 1 }
  m = fillHoles(m, bw, bh)
  for (let g = 0; g < grow; g++) m = morph(m, bw, bh, true) // takes in the painted outline
  // A soft edge: the mask averaged over three by three
  const rgba = new Uint8ClampedArray(bw * bh * 4)
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    let a = 0, n = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < bw && yy < bh) { a += m[yy * bw + xx]; n++ } }
    const sx = Math.min(W - 1, Math.max(0, x0 - pad + x)), sy = Math.min(H - 1, Math.max(0, y0 - pad + y)), si = (sy * W + sx) * 4, o = (y * bw + x) * 4
    rgba[o] = data[si]; rgba[o + 1] = data[si + 1]; rgba[o + 2] = data[si + 2]; rgba[o + 3] = Math.round((a / n) * 255 * (m[y * bw + x] || a / n > 0.5 ? 1 : 0.7))
  }
  return { w: bw, h: bh, x: x0 - pad, y: y0 - pad, rgba }
}

/** Fruit cut out whole: [{ cx, cy, piece }] — its middle as fractions of the painting and its pixels under a soft mask. */
export function cutFruit(px, { max = 12 } = {}) {
  const { width: W, height: H } = px
  return wholeShapes(px, FRUIT, { minA: 0.0025, maxA: 0.3, fill: 0.5, aspect: [0.4, 2.5] }).sort((a, b) => b.n - a.n).slice(0, max).map((c) => ({ cx: round(c.cx / W), cy: round(c.cy / H), piece: piece(px, c.idx, 2) }))
}

/**
 * A blossom, or null: one strong gold-yellow shape of its own (not a field of gold), cut into `petals` pieces round its
 * middle, each a copy of her pixels. { cx, cy, pieces: [{ x, y, w, h, rgba, ax, ay }] } with the middle as fractions of the
 * painting and each piece's own middle (ax, ay) in the piece's pixels, so it can turn about itself.
 */
export function findBlossom(px, { minA = 0.02, maxA = 0.16 } = {}) {
  let petals = 5
  const { width: W, height: H } = px
  const all = wholeShapes(px, BLOOM, { minA: 0.0015, maxA: 0.5, fill: 0.3, aspect: [0.55, 1.8] }).sort((a, b) => b.n - a.n)
  const top = all[0]
  if (!top || top.n / (W * H) < minA || top.n / (W * H) > maxA) return null
  if (all[1] && all[1].n > top.n * 0.4) return null // several of them: leaves, not one blossom
  // Its whole shape, as a star about its middle: out to the farthest paint in each direction, so a petal's own darker
  // shading and veins are in it too, and each petal is cut as one piece
  const bins = 72, reach = new Array(bins).fill(0)
  const binOf = (x, y) => Math.floor(((Math.atan2(y - top.cy, x - top.cx) + Math.PI) / (2 * Math.PI)) * bins) % bins
  for (const i of top.idx) { const x = i % W, y = (i - x) / W; reach[binOf(x, y)] = Math.max(reach[binOf(x, y)], Math.hypot(x - top.cx, y - top.cy)) }
  const wide = reach.map((_, b) => Math.max(reach[(b + bins - 1) % bins], reach[b], reach[(b + 1) % bins]))
  const whole = []
  for (let y = top.y0; y <= top.y1; y++) for (let x = top.x0; x <= top.x1; x++) if (Math.hypot(x - top.cx, y - top.cy) <= wide[binOf(x, y)]) whole.push(y * W + x)
  const sm = reach.map((_, b) => { let s = 0; for (let k = -2; k <= 2; k++) s += reach[(b + k + bins) % bins]; return s / 5 })
  const valleys = []
  for (let b = 0; b < bins; b++) if (sm[b] <= sm[(b + 1) % bins] && sm[b] < sm[(b + bins - 1) % bins] && sm[b] < Math.max(...sm) * 0.9) valleys.push(b)
  if (valleys.length < 4 || valleys.length > 6) return null // no star of petals: a patch of gold, not a blossom
  petals = valleys.length
  const cuts = valleys.sort((a, b) => a - b)
  const sliceOf = (b) => { let s = cuts.length - 1; for (let k = 0; k < cuts.length; k++) if (b >= cuts[k]) s = k; return s }
  const groups = Array.from({ length: petals }, () => [])
  for (const i of whole) { const x = i % W, y = (i - x) / W, th = Math.atan2(y - top.cy, x - top.cx), b = Math.floor(((th + Math.PI) / (2 * Math.PI)) * bins) % bins; groups[sliceOf(b)].push(i) }
  const pieces = groups.filter((g) => g.length > 12).map((g) => {
    const p = piece(px, g, 1)
    let sx = 0, sy = 0; for (const i of g) { sx += i % W; sy += Math.floor(i / W) }
    return { ...p, ax: sx / g.length - p.x, ay: sy / g.length - p.y }
  })
  return pieces.length >= 3 ? { cx: round(top.cx / W), cy: round(top.cy / H), pieces } : null
}
