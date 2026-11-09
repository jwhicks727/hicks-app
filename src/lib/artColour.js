// ============================================
// artColour.js -- what colours a painting is, and a fingerprint to spot the same one twice
// ============================================
// Pure: it works on RGBA pixels ({ data, width, height }, as a canvas gives them), so
// tests run it in Node (tests/art-colour.test.mjs). Everything here is measured from the
// picture's own pixels, never guessed, and nothing is changed. Used by Laurie's gallery
// (its colour filter, the rainbow sort, the featured walls) and by both batch screens,
// which warn when a photo looks like a painting or drawing already in.

/** The colour families the gallery filters by, each with a chip colour of its own (an illustration: it keeps its colour in both themes). */
export const FAMILIES = {
  red: { label: 'Reds', chip: '#C2412F' },
  orange: { label: 'Oranges', chip: '#E07B2A' },
  yellow: { label: 'Yellows', chip: '#E2BC32' },
  green: { label: 'Greens', chip: '#5E9A48' },
  teal: { label: 'Teals', chip: '#2E9C95' },
  blue: { label: 'Blues', chip: '#3B6FC2' },
  purple: { label: 'Purples', chip: '#7D52B0' },
  pink: { label: 'Pinks', chip: '#D86A9E' },
  earth: { label: 'Earth tones', chip: '#8A5A33' },
  neutral: { label: 'Black, white and grey', chip: '#77716B' },
}
export const FAMILY_ORDER = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink', 'earth', 'neutral']

/** One pixel's family: grey when there is little colour in it, earth for dark or dull warm ones, else by its hue. */
export function familyOf(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), chroma = mx - mn, light = (mx + mn) / 510
  if (chroma < 28 || (chroma < 40 && (light < 0.15 || light > 0.9))) return 'neutral'
  const h = hueOf(r, g, b, mx, chroma)
  if (h < 50 && (light < 0.36 || (chroma < 75 && light < 0.62))) return 'earth'
  if (h >= 345 || h < 12) return 'red'
  if (h < 40) return 'orange'
  if (h < 68) return 'yellow'
  if (h < 165) return 'green'
  if (h < 195) return 'teal'
  if (h < 255) return 'blue'
  if (h < 290) return 'purple'
  return 'pink'
}
function hueOf(r, g, b, mx = Math.max(r, g, b), chroma = mx - Math.min(r, g, b)) {
  if (!chroma) return 0
  let h
  if (mx === r) h = ((g - b) / chroma) % 6
  else if (mx === g) h = (b - r) / chroma + 2
  else h = (r - g) / chroma + 4
  return (h * 60 + 360) % 360
}
const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
const hexOf = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`

/** About `want` pixels spread evenly over the picture, as [r, g, b] (fully transparent ones left out). */
function sample({ data, width, height }, want = 6000) {
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / want)))
  const out = []
  for (let y = Math.floor(step / 2); y < height; y += step) {
    for (let x = Math.floor(step / 2); x < width; x += step) {
      const i = (y * width + x) * 4
      if (data[i + 3] !== undefined && data[i + 3] < 8) continue
      out.push([data[i], data[i + 1], data[i + 2]])
    }
  }
  return out
}

/**
 * The colours of a picture: `fam`, the share of it in each family (0 to 1); `light`, how light it is
 * overall; `vivid`, how strong its colours are where it has colour; `hue`, the average hue of its
 * colours (degrees, null when it is nearly all grey); and `swatches`, its five main colours, the
 * commonest first.
 */
export function paletteOf(pixels) {
  const px = sample(pixels)
  const fam = Object.fromEntries(FAMILY_ORDER.map((k) => [k, 0]))
  if (!px.length) return { fam, light: 0.5, vivid: 0, hue: null, swatches: [] }
  let light = 0, vivid = 0, nColour = 0, hx = 0, hy = 0
  for (const [r, g, b] of px) {
    const k = familyOf(r, g, b)
    fam[k]++
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    light += (mx + mn) / 510
    if (k !== 'neutral') {
      const s = (mx - mn) / 255, h = (hueOf(r, g, b) * Math.PI) / 180
      vivid += s; nColour++
      hx += Math.cos(h) * s; hy += Math.sin(h) * s
    }
  }
  for (const k of FAMILY_ORDER) fam[k] = Math.round((fam[k] / px.length) * 1000) / 1000
  const hue = nColour / px.length > 0.08 && Math.hypot(hx, hy) > 1e-6 ? Math.round(((Math.atan2(hy, hx) * 180) / Math.PI + 360) % 360) : null
  return { fam, light: Math.round((light / px.length) * 1000) / 1000, vivid: nColour ? Math.round((vivid / nColour) * 1000) / 1000 : 0, hue, swatches: swatchesOf(px) }
}

/** Five main colours by a few rounds of k-means, seeded across the picture's lightness so it settles the same way every time. */
function swatchesOf(px, k = 5) {
  const pts = px.length > 2400 ? px.filter((_, i) => i % Math.ceil(px.length / 2400) === 0) : px
  const byLight = [...pts].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
  let centres = Array.from({ length: Math.min(k, byLight.length) }, (_, i) => [...byLight[Math.floor(((i + 0.5) / k) * byLight.length)]])
  let counts = []
  for (let round = 0; round < 8; round++) {
    const sum = centres.map(() => [0, 0, 0]); counts = centres.map(() => 0)
    for (const p of pts) {
      let best = 0, bd = Infinity
      centres.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = j } })
      sum[best][0] += p[0]; sum[best][1] += p[1]; sum[best][2] += p[2]; counts[best]++
    }
    centres = centres.map((c, j) => (counts[j] ? sum[j].map((v) => v / counts[j]) : c))
  }
  return centres.map((c, j) => [c, counts[j]]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([c]) => hexOf(c))
}

/** A palette as kept with a painting: its numbers rounded, nothing else. */
export function cleanPalette(p) {
  if (!p || typeof p !== 'object' || !p.fam) return null
  const fam = Object.fromEntries(FAMILY_ORDER.map((k) => [k, Math.round(Math.max(0, Math.min(1, Number(p.fam[k]) || 0)) * 1000) / 1000]))
  const sw = (Array.isArray(p.swatches) ? p.swatches : []).filter((s) => /^#[0-9a-f]{6}$/i.test(s)).slice(0, 5)
  const n = (v) => Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 1000) / 1000
  return { fam, light: n(p.light), vivid: n(p.vivid), hue: Number.isFinite(Number(p.hue)) && p.hue !== null ? Math.round(Number(p.hue)) % 360 : null, swatches: sw }
}

/** The families a painting shows strongly enough to be found under: the main ones, and grey only when it is mostly grey. */
export function familiesOf(palette) {
  if (!palette || !palette.fam) return []
  const f = palette.fam
  const colour = FAMILY_ORDER.filter((k) => k !== 'neutral')
  const strong = colour.filter((k) => f[k] >= 0.16)
  if (!strong.length) { const top = colour.reduce((a, b) => (f[b] > f[a] ? b : a)); if (f[top] >= 0.08) strong.push(top) }
  if (f.neutral >= 0.6) strong.push('neutral')
  return strong
}

/** Words for how it looks overall, from the numbers: colourful (many strong colours), soft (pale and gentle), dark, bright. */
export function toneOf(palette) {
  if (!palette || !palette.fam) return []
  const many = FAMILY_ORDER.filter((k) => k !== 'neutral' && palette.fam[k] >= 0.07).length
  const out = []
  if (many >= 4 && palette.vivid >= 0.42) out.push('colourful')
  if (palette.vivid < 0.32 && palette.light > 0.55) out.push('soft')
  if (palette.light < 0.33) out.push('dark')
  if (palette.light > 0.64) out.push('bright')
  return out
}
export const TONES = { colourful: 'Bursting with colour', soft: 'Soft and pale', dark: 'Dark and moody', bright: 'Light and bright' }

/** Where a painting sits in a rainbow: by its hue, red first, with the mostly grey ones at the end from light to dark. */
export function rainbowKey(palette) {
  if (!palette || !palette.fam) return 2000
  if (palette.hue === null || palette.fam.neutral > 0.75) return 1000 + Math.round((1 - (palette.light || 0)) * 100)
  return (palette.hue + 20) % 360
}

// ---- A fingerprint, to spot the same painting twice ---------------------------------------
// Its light and dark on an 8 x 8 grid, each cell's lightness against the picture's own (so a darker photo of the same
// painting still matches), as 64 hex digits, then the average colour of each quarter (24 more). Two photos of the same
// painting come out nearly the same however big they are; two different paintings rarely do. Compared by how closely
// the two grids rise and fall together (a correlation, which flat sky and noise don't upset) and how near the colours are.

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b
export const PRINT_LENGTH = 88

/** A picture's colour at a point (bilinear), as [r, g, b]. */
function at({ data, width, height }, x, y) {
  const fx = Math.min(width - 1, Math.max(0, x - 0.5)), fy = Math.min(height - 1, Math.max(0, y - 0.5))
  const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1)
  const tx = fx - x0, ty = fy - y0, out = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    const a = data[(y0 * width + x0) * 4 + c], b = data[(y0 * width + x1) * 4 + c], d = data[(y1 * width + x0) * 4 + c], e = data[(y1 * width + x1) * 4 + c]
    out[c] = (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty
  }
  return out
}

/**
 * The fingerprint of a picture, or of the painting in it: `map(u, v)` gives the picture's pixel for a point of the
 * upright painting (u and v from 0 to 1), so a photo can be fingerprinted by its crop before it is cut; with no map,
 * the whole picture. 88 hex digits.
 */
export function fingerprintOf(pixels, map = (u, v) => [u * pixels.width, v * pixels.height]) {
  const S = 5 // samples a cell, each way
  const cells = []
  for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) {
    let t = 0
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const [x, y] = map((gx + (sx + 0.5) / S) / 8, (gy + (sy + 0.5) / S) / 8)
      t += lum(...at(pixels, x, y))
    }
    cells.push(t / (S * S))
  }
  const mean = cells.reduce((a, b) => a + b, 0) / 64
  const sd = Math.sqrt(cells.reduce((a, b) => a + (b - mean) ** 2, 0) / 64)
  const grid = cells.map((v) => (sd < 2 ? 8 : Math.max(0, Math.min(15, Math.round(((v - mean) / sd + 2) * 3.75))))).map((q) => q.toString(16)).join('')
  let quarters = ''
  for (const [qu, qv] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) {
    const sum = [0, 0, 0], N = 6
    for (let sy = 0; sy < N; sy++) for (let sx = 0; sx < N; sx++) {
      const c = at(pixels, ...map(qu + ((sx + 0.5) / N) * 0.5, qv + ((sy + 0.5) / N) * 0.5))
      sum[0] += c[0]; sum[1] += c[1]; sum[2] += c[2]
    }
    quarters += sum.map((v) => hex2(v / (N * N))).join('')
  }
  return grid + quarters
}

export const validPrint = (p) => typeof p === 'string' && p.length === PRINT_LENGTH && /^[0-9a-f]+$/.test(p)

/** How alike two fingerprints are: `corr`, how closely their light and dark go together (-1 to 1), and `colour`, the quarters' average distance (0 to about 441). */
export function printDistance(a, b) {
  if (!validPrint(a) || !validPrint(b)) return null
  const ga = [...a.slice(0, 64)].map((h) => parseInt(h, 16)), gb = [...b.slice(0, 64)].map((h) => parseInt(h, 16))
  const ma = ga.reduce((x, y) => x + y, 0) / 64, mb = gb.reduce((x, y) => x + y, 0) / 64
  let num = 0, da = 0, db = 0
  for (let i = 0; i < 64; i++) { num += (ga[i] - ma) * (gb[i] - mb); da += (ga[i] - ma) ** 2; db += (gb[i] - mb) ** 2 }
  // A picture with no light and dark at all (one flat colour) is only ever like another that's flat too
  const corr = da < 1e-9 || db < 1e-9 ? (da < 1e-9 && db < 1e-9 ? 1 : 0) : num / Math.sqrt(da * db)
  let colour = 0
  for (let q = 0; q < 4; q++) {
    const o = 64 + q * 6
    colour += Math.hypot(...[0, 2, 4].map((k) => parseInt(a.slice(o + k, o + k + 2), 16) - parseInt(b.slice(o + k, o + k + 2), 16)))
  }
  return { corr: Math.round(corr * 1000) / 1000, colour: Math.round((colour / 4) * 10) / 10 }
}

/** Do two fingerprints look like the same picture? Their light and dark go together closely, and their colours are near. */
export function looksAlike(a, b) {
  const d = printDistance(a, b)
  return Boolean(d && ((d.corr >= 0.88 && d.colour <= 55) || (d.corr >= 0.95 && d.colour <= 90)))
}

/**
 * The pictures among `others` ({ id, print, title, ... }) that look like `print`, the closest first,
 * each with its distance. Ones without a fingerprint are never a match.
 */
export function lookAlikes(print, others = []) {
  return others.filter((o) => o && o.print && looksAlike(print, o.print)).map((o) => ({ ...o, distance: printDistance(print, o.print) }))
    .sort((a, b) => b.distance.corr - a.distance.corr || a.distance.colour - b.distance.colour)
}
