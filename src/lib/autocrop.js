// ============================================
// autocrop.js -- finding a painting in a photo of it: how far it leans, and the box round it
// ============================================
// Pure, so tests run it in Node on made-up pictures. It takes a small copy of
// the photo (RGBA, its long side about 400 px) and finds the painting against
// the wall it hangs on, or the table it lies on, the way ART-CAPTURE.md says to
// photograph one. It only measures: the painting itself is cropped and turned
// from the photo, never altered (CLAUDE.md, "Laurie's paintings are shown as she
// painted them").
//
// How: the wall is learned from the photo's edges (a smooth colour that may
// darken towards the corners); whatever differs from it, or is busy with brush
// strokes, is the painting. The outline is closed and filled, so a pale sky the
// colour of the wall still counts, and thin things touching it (a wire, an
// easel's leg) are cut away. Its long straight edges say how far it leans; the
// rows and columns it fills say where its edges are. When anything looks off
// (it runs off the photo, it isn't a rectangle, it is tiny), `sure` is false
// and the screen asks for a look.

const LEAN = 12 // degrees either way it searches; a photo leaning further is turned by hand
const STEP = 0.1

/**
 * The painting in a photo: { cx, cy, w, h, angle, sure, kind } in the small
 * copy's pixels, its top-left corner at 0,0 and its bottom-right at width,height.
 * `angle` is how far the painting leans clockwise, in degrees; the box is
 * w x h, centred at cx,cy and leaning with it. `kind` is 'found', 'whole'
 * (the photo is the painting already: a scan, or one cropped before) or 'none'
 * (nothing found; the whole photo, to crop by hand).
 */
export function findPainting({ data, width: W, height: H }) {
  const n = W * H
  const whole = (sure, kind) => ({ cx: W / 2, cy: H / 2, w: W, h: H, angle: 0, sure, kind })
  if (W < 16 || H < 16) return whole(false, 'none')

  // 1. Smoothed colour, and how busy each pixel is (its strongest change across a channel)
  const ch = [0, 1, 2].map((c) => blur(channel(data, n, c), W, H))
  const busy = new Float32Array(n)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      let g = 0
      for (const a of ch) g = Math.max(g, Math.abs(a[i + 1] - a[i - 1]) + Math.abs(a[i + W] - a[i - W]))
      busy[i] = g
    }
  }

  // 2. The wall, from the photo's edges. A side busy all along is painting, not wall.
  // A band along each side, `band` pixels deep, starting a pixel in (the outermost has no measure of busyness)
  const band = Math.max(2, Math.round(Math.min(W, H) * 0.025))
  const sides = {
    top: { len: W, at: (p, k) => (1 + k) * W + clampI(p, 1, W - 2) },
    bottom: { len: W, at: (p, k) => (H - 2 - k) * W + clampI(p, 1, W - 2) },
    left: { len: H, at: (p, k) => clampI(p, 1, H - 2) * W + 1 + k },
    right: { len: H, at: (p, k) => clampI(p, 1, H - 2) * W + W - 2 - k },
  }
  // Each side's busyness (three-quarters of it must be smooth to count as wall) and its colour along its length:
  // the band's average, with small clutter (a switch, a nail) smoothed away
  for (const s of Object.values(sides)) {
    s.g = []
    for (let p = 0; p < s.len; p++) for (let k = 0; k < band; k++) s.g.push(busy[s.at(p, k)])
    s.busy = quantile(s.g, 0.75)
    s.profile = [0, 1, 2].map((c) => {
      const line = new Float32Array(s.len)
      for (let p = 0; p < s.len; p++) { let t = 0; for (let k = 0; k < band; k++) t += ch[c][s.at(p, k)]; line[p] = t / band }
      return medianFilter(line, Math.max(3, Math.round(s.len * 0.08)) | 1)
    })
  }
  // Wall is smooth, about as smooth as the calmest side, and the same colour as the rest of the wall
  const calmest = Math.min(...Object.values(sides).map((s) => s.busy))
  for (const s of Object.values(sides)) s.calm = s.busy < Math.min(10, Math.max(4, 2.5 * calmest + 2))
  const wallOf = () => {
    const cs = [[], [], []]
    for (const s of Object.values(sides)) if (s.calm) for (let p = 0; p < s.len; p += 3) for (let c = 0; c < 3; c++) cs[c].push(s.profile[c][p])
    return cs.map(median)
  }
  if (!Object.values(sides).some((s) => s.calm)) return whole(true, 'whole') // busy on every side: the photo is all painting
  let wall = wallOf()
  const off = (s) => { let k = 0; for (let p = 0; p < s.len; p++) if (Math.hypot(...[0, 1, 2].map((c) => s.profile[c][p] - wall[c])) > 40) k++; return k / s.len }
  const calmSides = Object.values(sides).filter((s) => s.calm).sort((a, b) => off(a) - off(b))
  for (const s of calmSides.slice(1)) if (off(s) > 0.15) s.calm = false // a smooth stretch of painting, not wall
  wall = wallOf()
  const calmBusy = Object.values(sides).filter((s) => s.calm).flatMap((s) => s.g)
  // A side that is painting, not wall: its wall is drawn between the ends of the two sides beside it, where those are
  // wall, so light falling off across the photo still reads as wall; else the wall across from it; else the wall's colour
  const between = (a, b, len) => [0, 1, 2].map((c) => Float32Array.from({ length: len }, (_, p) => a[c] + (b[c] - a[c]) * (p / (len - 1))))
  const at = (side, end) => [0, 1, 2].map((c) => side.profile[c][end === 0 ? 0 : side.len - 1])
  const { top, bottom, left, right } = sides
  const was = { top: top.calm, bottom: bottom.calm, left: left.calm, right: right.calm }
  const across = { left: right, right: left, top: bottom, bottom: top }
  const borrow = (k) => (was[{ left: 'right', right: 'left', top: 'bottom', bottom: 'top' }[k]] ? across[k].profile.map((a) => Float32Array.from(a)) : null)
  if (!was.left) left.profile = was.top && was.bottom ? between(at(top, 0), at(bottom, 0), H) : borrow('left')
  if (!was.right) right.profile = was.top && was.bottom ? between(at(top, 1), at(bottom, 1), H) : borrow('right')
  if (!was.top) top.profile = was.left && was.right ? between(at(left, 0), at(right, 0), W) : borrow('top')
  if (!was.bottom) bottom.profile = was.left && was.right ? between(at(left, 1), at(right, 1), W) : borrow('bottom')
  for (const s of Object.values(sides)) if (!s.profile) s.profile = wall.map((v) => new Float32Array(s.len).fill(v))

  // 3. What isn't wall: a colour away from the wall's there, or brushwork
  const mask = new Uint8Array(n), dist = new Float32Array(n)
  // The wall behind each pixel is a Coons patch: the four sides blended across, so light falling off
  // towards the corners is still wall
  const T = sides.top.profile, B = sides.bottom.profile, L = sides.left.profile, R = sides.right.profile
  const corner = [0, 1, 2].map((c) => [(T[c][0] + L[c][0]) / 2, (T[c][W - 1] + R[c][0]) / 2, (B[c][0] + L[c][H - 1]) / 2, (B[c][W - 1] + R[c][H - 1]) / 2])
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1)
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1), i = y * W + x
      let d = 0
      for (let c = 0; c < 3; c++) {
        const [c00, c10, c01, c11] = corner[c]
        const bg = (1 - v) * T[c][x] + v * B[c][x] + (1 - u) * L[c][y] + u * R[c][y] -
          ((1 - u) * (1 - v) * c00 + u * (1 - v) * c10 + (1 - u) * v * c01 + u * v * c11)
        d += (ch[c][i] - bg) ** 2
      }
      dist[i] = Math.sqrt(d)
    }
  }
  const wallDist = []
  for (const s of Object.values(sides)) if (s.calm) for (let p = 0; p < s.len; p += 2) for (let k = 0; k < band; k++) wallDist.push(dist[s.at(p, k)])
  const tColour = clamp(6 * median(wallDist) + 10, 14, 48)
  const tBusy = clamp(4 * median(calmBusy) + 8, 10, 40)
  for (let i = 0; i < n; i++) mask[i] = dist[i] > tColour || busy[i] > tBusy ? 1 : 0

  // 4. Close the outline, fill it, cut away thin things touching it, keep the piece in the middle
  const short = Math.min(W, H)
  const rc = Math.max(1, Math.round(short * 0.012)), ro = Math.max(1, Math.round(short * 0.008))
  let m = erode(dilate(mask, W, H, rc), W, H, rc)
  m = fillHoles(m, W, H)
  m = dilate(erode(m, W, H, ro), W, H, ro)
  const piece = middlePiece(m, W, H)
  if (!piece || piece.area < n * 0.03) return whole(false, 'none')
  const { inside, area } = piece

  // Which of the photo's edges it runs off
  const along = (count, len) => count > len * 0.05
  let t = 0, b = 0, l = 0, r = 0
  for (let x = 0; x < W; x++) { t += inside[x]; b += inside[(H - 1) * W + x] }
  for (let y = 0; y < H; y++) { l += inside[y * W]; r += inside[y * W + W - 1] }
  const touches = [along(t, W), along(b, W), along(l, H), along(r, H)].filter(Boolean).length
  if (touches >= 3) return whole(false, 'whole')

  // 5. How far it leans: the angle at which its outline's points line up best into rows and columns
  const edge = []
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!inside[i]) continue
      // A point of its outline against the wall (the photo's own edge is no edge of the painting)
      if ((x > 0 && !inside[i - 1]) || (x < W - 1 && !inside[i + 1]) || (y > 0 && !inside[i - W]) || (y < H - 1 && !inside[i + W])) edge.push(x + 0.5 - W / 2, y + 0.5 - H / 2)
    }
  }
  const diag = Math.ceil(Math.hypot(W, H)) + 4
  const hu = new Float32Array(diag), hv = new Float32Array(diag)
  const score = (deg) => {
    const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a)
    hu.fill(0); hv.fill(0)
    for (let k = 0; k < edge.length; k += 2) {
      const x = edge[k], y = edge[k + 1]
      soft(hu, x * cos + y * sin + diag / 2); soft(hv, -x * sin + y * cos + diag / 2)
    }
    let s = 0
    for (let k = 0; k < diag; k++) s += hu[k] * hu[k] + hv[k] * hv[k]
    return s
  }
  const steps = Math.round(LEAN / STEP), scores = []
  let best = 0
  for (let k = -steps; k <= steps; k++) { scores.push(score(k * STEP)); if (scores.at(-1) > scores[best]) best = scores.length - 1 }
  let angle = (best - steps) * STEP
  if (best > 0 && best < scores.length - 1) {
    const [s0, s1, s2] = [scores[best - 1], scores[best], scores[best + 1]], den = s0 - 2 * s1 + s2
    if (den < 0) angle += (STEP * 0.5 * (s0 - s2)) / den
  }
  angle = Math.round(angle * 100) / 100

  // 6. Its edges: the rows and columns it fills, leaning with it; a wire or a shadow fills too little to count
  const a = (angle * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a)
  const rows = new Float32Array(diag), cols = new Float32Array(diag)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside[y * W + x]) continue
      const dx = x + 0.5 - W / 2, dy = y + 0.5 - H / 2
      cols[clampI(Math.floor(dx * cos + dy * sin + diag / 2), 0, diag - 1)]++
      rows[clampI(Math.floor(-dx * sin + dy * cos + diag / 2), 0, diag - 1)]++
    }
  }
  const [u0, u1] = span(cols), [v0, v1] = span(rows)
  const inset = (len) => 1 + len * 0.003 // a pixel for the blur's spread, and a hair more so no wall shows
  const w = Math.max(4, u1 - u0 - 2 * inset(u1 - u0)), h = Math.max(4, v1 - v0 - 2 * inset(v1 - v0))
  const uc = (u0 + u1) / 2 - diag / 2, vc = (v0 + v1) / 2 - diag / 2
  const cx = W / 2 + uc * cos - vc * sin, cy = H / 2 + uc * sin + vc * cos

  // 7. Sure? A rectangle, all of it in the photo, of a sensible size, leaning no more than a tripod would
  let inBox = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside[y * W + x]) continue
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy
      if (Math.abs(dx * cos + dy * sin) <= w / 2 + 1 && Math.abs(-dx * sin + dy * cos) <= h / 2 + 1) inBox++
    }
  }
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [cx + (sx * w * cos) / 2 - (sy * h * sin) / 2, cy + (sx * w * sin) / 2 + (sy * h * cos) / 2])
  const margin = Math.min(...corners.flatMap(([x, y]) => [x, y, W - x, H - y]))
  const fill = inBox / (w * h), stray = 1 - inBox / area, share = (w * h) / n
  const sure = touches === 0 && margin >= Math.max(1.5, short * 0.01) && fill >= 0.9 && stray <= 0.1 && share >= 0.06 && share <= 0.97 && Math.abs(angle) <= 10
  return { cx, cy, w, h, angle, sure, kind: 'found' }
}

// ---- Helpers ----------------------------------------------------------------------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const clampI = (v, lo, hi) => Math.min(hi, Math.max(lo, v | 0))

function channel(data, n, c) {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = data[i * 4 + c]
  return out
}

/** A 3 x 3 box blur, so the camera's grain isn't mistaken for brushwork. */
function blur(a, W, H) {
  const tmp = new Float32Array(a.length), out = new Float32Array(a.length)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; tmp[i] = (a[i - (x > 0 ? 1 : 0)] + a[i] + a[i + (x < W - 1 ? 1 : 0)]) / 3 }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; out[i] = (tmp[i - (y > 0 ? W : 0)] + tmp[i] + tmp[i + (y < H - 1 ? W : 0)]) / 3 }
  return out
}

function quantile(list, q) {
  if (!list.length) return 0
  const s = Float32Array.from(list).sort()
  return s[Math.min(s.length - 1, Math.floor(s.length * q))]
}
const median = (list) => quantile(list, 0.5)

function medianFilter(line, win) {
  const out = new Float32Array(line.length), half = win >> 1
  for (let p = 0; p < line.length; p++) out[p] = median(Array.from(line.subarray(Math.max(0, p - half), Math.min(line.length, p + half + 1))))
  return out
}

/** Spread a point between the two bins either side of it, so a straight edge scores the same at every angle near its own. */
function soft(hist, f) {
  const i = Math.floor(f), k = f - i
  if (i >= 0 && i < hist.length) hist[i] += 1 - k
  if (i + 1 >= 0 && i + 1 < hist.length) hist[i + 1] += k
}

/** Max (dilate) or min (erode) over a square, done as two passes, the photo's edge treated as more of the same. */
function morph(m, W, H, r, grow) {
  const tmp = new Uint8Array(m.length), out = new Uint8Array(m.length)
  const pick = grow ? (s) => (s > 0 ? 1 : 0) : (s, len) => (s === len ? 1 : 0)
  for (let y = 0; y < H; y++) {
    const row = y * W
    let s = 0
    const lo = (x) => Math.max(0, x - r), hi = (x) => Math.min(W - 1, x + r)
    for (let x = 0; x <= hi(0); x++) s += m[row + x]
    for (let x = 0; x < W; x++) {
      tmp[row + x] = pick(s, hi(x) - lo(x) + 1)
      if (x + r + 1 < W) s += m[row + x + r + 1]
      if (x - r >= 0) s -= m[row + x - r]
    }
  }
  for (let x = 0; x < W; x++) {
    let s = 0
    const lo = (y) => Math.max(0, y - r), hi = (y) => Math.min(H - 1, y + r)
    for (let y = 0; y <= hi(0); y++) s += tmp[y * W + x]
    for (let y = 0; y < H; y++) {
      out[y * W + x] = pick(s, hi(y) - lo(y) + 1)
      if (y + r + 1 < H) s += tmp[(y + r + 1) * W + x]
      if (y - r >= 0) s -= tmp[(y - r) * W + x]
    }
  }
  return out
}
const dilate = (m, W, H, r) => morph(m, W, H, r, true)
const erode = (m, W, H, r) => morph(m, W, H, r, false)

/** Everything the wall at the photo's edges can't reach is part of the painting: a pale sky inside its outline included. */
function fillHoles(m, W, H) {
  const seen = new Uint8Array(m.length), stack = []
  const push = (i) => { if (!m[i] && !seen[i]) { seen[i] = 1; stack.push(i) } }
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x) }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1) }
  while (stack.length) {
    const i = stack.pop(), x = i % W
    if (x > 0) push(i - 1)
    if (x < W - 1) push(i + 1)
    if (i >= W) push(i - W)
    if (i < m.length - W) push(i + W)
  }
  const out = new Uint8Array(m.length)
  for (let i = 0; i < m.length; i++) out[i] = seen[i] ? 0 : 1
  return out
}

/** The connected piece the photo is of: the biggest one reaching into its middle, else the biggest. */
function middlePiece(m, W, H) {
  const label = new Int32Array(m.length), pieces = []
  const x0 = W * 0.35, x1 = W * 0.65, y0 = H * 0.35, y1 = H * 0.65
  for (let s = 0; s < m.length; s++) {
    if (!m[s] || label[s]) continue
    const id = pieces.length + 1, stack = [s]
    let area = 0, middle = false
    label[s] = id
    while (stack.length) {
      const i = stack.pop(), x = i % W, y = (i - x) / W
      area++
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) middle = true
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && m[j] && !label[j]) { label[j] = id; stack.push(j) }
    }
    pieces.push({ id, area, middle })
  }
  if (!pieces.length) return null
  const best = pieces.filter((p) => p.middle).sort((a, b) => b.area - a.area)[0] || pieces.sort((a, b) => b.area - a.area)[0]
  const inside = new Uint8Array(m.length)
  for (let i = 0; i < m.length; i++) inside[i] = label[i] === best.id ? 1 : 0
  return { inside, area: best.area }
}

/** Where a profile is full: the longest run at half or more of a typical full row, gaps of a pixel or two forgiven. */
function span(profile) {
  const full = Array.from(profile).filter((v) => v > 0).sort((a, b) => b - a)
  if (!full.length) return [0, 0]
  const typical = full[Math.floor(full.length / 4)] // the middle of the fuller half
  let best = [0, 0], start = -1, gap = 0
  for (let k = 0; k <= profile.length; k++) {
    const on = k < profile.length && profile[k] >= typical * 0.5
    if (on) { if (start < 0) start = k; gap = 0; continue }
    if (start < 0) continue
    if (++gap <= 2 && k < profile.length) continue
    const end = k - gap + 1
    if (end - start > best[1] - best[0]) best = [start, end]
    start = -1; gap = 0
  }
  return best
}
