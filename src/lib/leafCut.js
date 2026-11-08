// ============================================
// leafCut.js -- leaves for autumn's wind, cut from her own painted foliage
// ============================================
// Pure, so tests run it in Node (tests/leaf-cut.test.mjs). It does on the phone or
// computer what `scripts/lift-art.py autumn` and `scripts/leaf-origins.py` did on a
// computer with Python: it finds her warm, brushy foliage (reds, oranges, yellows),
// cuts leaf-shaped pieces of it out at full size with a soft edge, and notes exactly
// where each came from, so the wind can lift it off from that very place. The pieces
// are copies of her pixels, untouched; the painting itself stays whole (CLAUDE.md,
// "Every season's show starts in the art on Home"). Nothing is drawn or generated.
// A painting's page has the button (src/places/lifelist/AutumnLeaves.jsx), for a
// parent; the sheet goes to `<slug>/leaves.png` and the boxes and origins to its row.
import { seeded } from './scenes.js'

/** The working size: her painting is looked at with its long side at most this, like the photos the script was run on. */
export const LEAF_WORK = 1800

/** A square 3 x 3 grow (or shrink) of a mask, as a row pass then a column pass. */
function morph(m, W, H, grow) {
  const pass = (src, dx, dy) => {
    const out = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        const a = src[i], b = x - dx >= 0 && y - dy >= 0 ? src[i - dx - dy * W] : (grow ? 0 : 1), c = x + dx < W && y + dy < H ? src[i + dx + dy * W] : (grow ? 0 : 1)
        out[i] = grow ? (a | b | c) : (a & b & c)
      }
    }
    return out
  }
  return pass(pass(m, 1, 0), 0, 1)
}

/** Her warm, painted foliage: red well over blue, a strong colour, and not dark; closed up, then trimmed a little, as the script did. */
export function warmMask({ data, width: W, height: H }) {
  let m = new Uint8Array(W * H)
  for (let i = 0, j = 0; i < W * H; i++, j += 4) {
    const r = data[j], g = data[j + 1], b = data[j + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    m[i] = r - b > 24 && mx - mn > 50 && mx > 100 ? 1 : 0
  }
  m = morph(morph(m, W, H, true), W, H, true)
  m = morph(morph(morph(m, W, H, false), W, H, false), W, H, false)
  return m
}

const blur1 = (m, n, sigma = 1.1) => {
  const r = 3, k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)))
  const sum = k.reduce((a, b) => a + b, 0)
  const pass = (src, horiz) => {
    const out = new Float32Array(n * n)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let t = 0
      for (let d = -r; d <= r; d++) {
        const xx = horiz ? x + d : x, yy = horiz ? y : y + d
        if (xx >= 0 && yy >= 0 && xx < n && yy < n) t += src[yy * n + xx] * k[d + r]
      }
      out[y * n + x] = t / sum
    }
    return out
  }
  return pass(pass(m, true), false)
}

const hueDeg = (r, g, b) => {
  const mx = Math.max(r, g, b), c = mx - Math.min(r, g, b)
  if (!c) return 0
  const h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4
  return (h * 60 + 360) % 360
}

/**
 * Leaves cut from a painting's pixels ({ data, width, height }, RGBA): { sheet, boxes, origins, kinds }. `sheet` is
 * the pieces packed on one RGBA picture (2048 wide at most, a few pixels apart); `boxes` are where each sits on it
 * ([x, y, w, h]); `origins` where each piece's middle was in the painting, as fractions of it; `kinds` how many
 * red, orange and yellow. Only pieces wholly of warm, brushy foliage are taken: no sky, no trunk, no flat paint.
 * Fewer than `count` come back when there isn't that much foliage; none at all from a painting without any.
 */
export function cutLeaves(px, { count = 20, seed = 5, tries = 40000, mask } = {}) {
  const { data, width: W, height: H } = px
  const warm = mask || warmMask(px)
  const s = Math.max(W, H) / 1800, lo = 52 * s, hi = 96 * s
  const r = seeded(seed)
  const per = Math.max(1, Math.floor(count / 3) + 2), kinds = { red: 0, orange: 0, yellow: 0 }
  const got = [], centres = []
  const isWarm = (x, y) => { const xi = Math.round(x), yi = Math.round(y); return xi >= 0 && yi >= 0 && xi < W && yi < H && warm[yi * W + xi] === 1 }
  for (let t = 0; t < tries && got.length < count; t++) {
    const a = lo + r() * (hi - lo), ang = r() * Math.PI
    const x0 = W * 0.02 + a + 8, x1 = W * 0.98 - a - 8, y0 = H * 0.02 + a + 8, y1 = H * 0.98 - a - 8
    if (x1 <= x0 || y1 <= y0) break
    const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0)
    const fat = 0.34 + r() * 0.16, skew = -0.18 + r() * 0.36, bend = -0.08 + r() * 0.16
    if (centres.some(([px2, py2]) => Math.hypot(cx - px2, cy - py2) < a * 0.9)) continue
    const cos = Math.cos(ang), sin = Math.sin(ang)
    const toImg = (u, v) => [cx + u * a * cos - v * a * sin, cy + u * a * sin + v * a * cos]
    // A quick look along its spine and either side first: most places fail here, before any mask is drawn. Its colour
    // from those few points says which of red, orange and yellow it would be, so one whose kind is full is passed over now.
    let quick = true
    const seen = [0, 0, 0]
    let nSeen = 0
    for (let k = -8; k <= 8 && quick; k++) {
      const u = k / 9.5, half = fat * Math.pow(Math.max(0, 1 - u * u), 0.85) * (1 + skew * u), v0 = bend * (1 - u * u)
      for (const v of [v0, v0 - half * 0.7, v0 + half * 0.7]) {
        const [x, y] = toImg(u, v)
        if (!isWarm(x, y)) { quick = false; break }
        const gi = (Math.round(y) * W + Math.round(x)) * 4
        seen[0] += data[gi]; seen[1] += data[gi + 1]; seen[2] += data[gi + 2]; nSeen++
      }
    }
    if (!quick) continue
    const guess = hueDeg(seen[0] / nSeen, seen[1] / nSeen, seen[2] / nSeen)
    if (kinds[guess < 12.6 || guess > 342 ? 'red' : guess < 34.2 ? 'orange' : 'yellow'] >= per) continue
    // The leaf itself: pointed at both ends, fuller toward the stem, a little bent
    const n = Math.floor(a * 2 + 12), c = n / 2
    const X0 = Math.floor(cx - n / 2), Y0 = Math.floor(cy - n / 2)
    if (X0 < 0 || Y0 < 0 || X0 + n > W || Y0 + n > H) continue
    const m = new Float32Array(n * n)
    let area = 0, warmIn = 0, cold = 0
    const sum = [0, 0, 0], sq = [0, 0, 0]
    // It may hold at most 3% that isn't foliage: stop as soon as it can't (its area is about 2.5 a² times its fullness)
    const coldMax = 0.03 * 2.5 * a * a * fat + 2
    for (let y = 0; y < n && cold <= coldMax; y++) for (let x = 0; x < n; x++) {
      const dx = x - c, dy = y - c, u = (dx * cos + dy * sin) / a, v = (-dx * sin + dy * cos) / a
      const half = fat * Math.pow(Math.max(0, 1 - u * u), 0.85) * (1 + skew * u)
      if (Math.abs(u) < 1 && Math.abs(v - bend * (1 - u * u)) < half) {
        m[y * n + x] = 1; area++
        const gi = (Y0 + y) * W + X0 + x
        if (warm[gi]) warmIn++; else cold++
        for (let ch = 0; ch < 3; ch++) { const val = data[gi * 4 + ch]; sum[ch] += val; sq[ch] += val * val }
      }
    }
    if (cold > coldMax || area < 200 * s * s || warmIn / area < 0.97) continue
    const mean = sum.map((v) => v / area)
    const std = sq.map((v, ch) => Math.sqrt(Math.max(0, v / area - mean[ch] ** 2))).reduce((x, y) => x + y, 0) / 3
    if (std < 10) continue // flat paint: her brushwork should show
    const h = hueDeg(...mean)
    const kind = h < 12.6 || h > 342 ? 'red' : h < 34.2 ? 'orange' : 'yellow'
    if (kinds[kind] >= per) continue
    kinds[kind]++
    // A soft edge; her pixels stay exactly as they are
    const g = blur1(m, n)
    let xmin = n, xmax = -1, ymin = n, ymax = -1
    const al = new Float32Array(n * n)
    for (let i = 0; i < n * n; i++) {
      al[i] = Math.min(1, Math.max(0, (g[i] - 0.1) / 0.8))
      if (al[i] > 0.02) { const x = i % n, y = Math.floor(i / n); if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y < ymin) ymin = y; if (y > ymax) ymax = y }
    }
    const pw = xmax - xmin + 1, ph = ymax - ymin + 1, piece = new Uint8ClampedArray(pw * ph * 4)
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const gi = ((Y0 + ymin + y) * W + X0 + xmin + x) * 4, o = (y * pw + x) * 4
      piece[o] = data[gi]; piece[o + 1] = data[gi + 1]; piece[o + 2] = data[gi + 2]; piece[o + 3] = Math.round(al[(ymin + y) * n + xmin + x] * 255)
    }
    got.push({ piece, w: pw, h: ph, ox: X0 + xmin + pw / 2, oy: Y0 + ymin + ph / 2 })
    centres.push([cx, cy])
  }
  // Packed onto a sheet no wider than 2048, a few pixels apart so none bleeds into the next
  const gap = 6, maxw = 2048
  let x = 0, y = 0, rowh = 0, sw = 0
  const boxes = []
  for (const p of got) {
    if (x + p.w > maxw) { x = 0; y += rowh + gap; rowh = 0 }
    boxes.push([x, y, p.w, p.h]); x += p.w + gap; rowh = Math.max(rowh, p.h); sw = Math.max(sw, x - gap)
  }
  const sh = got.length ? y + rowh : 0
  const sheet = { data: new Uint8ClampedArray(Math.max(1, sw * sh) * 4), width: sw, height: sh }
  got.forEach((p, k) => {
    const [bx, by] = boxes[k]
    for (let yy = 0; yy < p.h; yy++) sheet.data.set(p.piece.subarray(yy * p.w * 4, (yy + 1) * p.w * 4), ((by + yy) * sw + bx) * 4)
  })
  const r4 = (v) => Math.round(v * 10000) / 10000
  return { sheet, boxes, origins: got.map((p) => [r4(p.ox / W), r4(p.oy / H)]), kinds }
}

/**
 * What a painting's row keeps about its leaves, as the wind show reads it: the sheet's size and boxes, how sharp to
 * draw it (`px`, sheet pixels to a screen pixel at scale 1, as the script's were), the sizes they're drawn at, where
 * each came from, and the sheet's scale to the painting file (`originScale`: sheet pixels to painting pixels).
 */
export function leavesRow(cut, { workWidth, workHeight = workWidth, paintingWidth, today, seed }) {
  const s = Math.max(workWidth, workHeight) / 1800 // as long, on the screen, as the leaves the script cut
  return {
    size: [cut.sheet.width, cut.sheet.height], boxes: cut.boxes, px: Math.round(2 * s * 1000) / 1000, scale: [0.7, 1.15],
    origins: cut.origins, originScale: Math.round((paintingWidth / workWidth) * 10000) / 10000, cut: { on: today, seed },
  }
}
