// ============================================
// scenes.js -- the shapes each place's skyline is drawn from
// ============================================
// Pure: each returns an SVG path string on a 400 x 150 view whose ground is
// y = 150, drawn wide (x from -160 to 560) so a wider card shows more of the
// view rather than stretching it. Silhouettes only, drawn here: generic
// shapes, no one's artwork or logo (README credits).

const f = (n) => (Math.round(n * 10) / 10).toString()
const line = (pts) => 'M' + pts.map(([x, y]) => f(x) + ' ' + f(y)).join('L')

/** The same "random" every time for a seed, so a scene never jumps. */
export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A mountain range's ridge as points: rolling, with a little jag. */
export function ridgePoints({ seed = 1, x0 = -160, x1 = 560, base = 110, amp = 40, step = 6, jag = 2.5, waves = [0.018, 0.041, 0.09] }) {
  const r = seeded(seed), ph = waves.map(() => r() * 6.283)
  const pts = []
  for (let x = x0; x <= x1; x += step) {
    const s = 0.55 * Math.sin(x * waves[0] + ph[0]) + 0.3 * Math.sin(x * waves[1] + ph[1]) + 0.15 * Math.sin(x * waves[2] + ph[2])
    pts.push([x, base - amp * (0.5 + 0.5 * s) + (r() - 0.5) * jag])
  }
  return pts
}
/** A filled range from its ridge to the ground. */
export const rangePath = (pts) => line([[pts[0][0], 150], ...pts, [pts[pts.length - 1][0], 150]]) + 'Z'

/** Snow on every part of a ridge higher than `snowline`, with a ragged lower edge. */
export function snowCaps(pts, snowline) {
  const caps = []
  let cur = null
  const cross = (a, b) => { const t = (snowline - a[1]) / (b[1] - a[1] || 1); return [a[0] + (b[0] - a[0]) * t, snowline] }
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], up = p[1] < snowline
    if (up && !cur) cur = [i ? cross(pts[i - 1], p) : [p[0], snowline], p]
    else if (up) cur.push(p)
    else if (cur) { cur.push(cross(pts[i - 1], p)); caps.push(cur); cur = null }
  }
  if (cur) { cur.push([cur[cur.length - 1][0], snowline]); caps.push(cur) }
  return caps.map((c) => {
    const a = c[0][0], b = c[c.length - 1][0], n = Math.max(2, Math.round((b - a) / 5)), back = []
    for (let k = n - 1; k > 0; k--) back.push([a + ((b - a) * k) / n, snowline + (k % 2 ? 3.5 : 0.5)])
    return line([...c, ...back]) + 'Z'
  }).join('')
}

// ---- Trees ----
export function palm(x, h, lean = 4) {
  const tx = x + lean, ty = 150 - h
  const trunk = `M${f(x - 1.2)} 150Q${f(x + lean * 0.4 - 1)} ${f(150 - h * 0.5)} ${f(tx - 0.8)} ${f(ty)}L${f(tx + 0.8)} ${f(ty)}Q${f(x + lean * 0.4 + 1)} ${f(150 - h * 0.5)} ${f(x + 1.2)} 150Z`
  const fronds = [-172, -142, -112, -68, -38, -8].map((deg, i) => {
    const a = (deg * Math.PI) / 180, L = 15 + (i % 2) * 3
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L + 7
    const cx = tx + Math.cos(a) * L * 0.55, cy = ty + Math.sin(a) * L * 0.55 - 4
    const nx = -Math.sin(a) * 1.6, ny = Math.cos(a) * 1.6 // the leaf's width
    return `M${f(tx)} ${f(ty)}Q${f(cx + nx)} ${f(cy + ny)} ${f(ex)} ${f(ey)}Q${f(cx - nx)} ${f(cy - ny)} ${f(tx)} ${f(ty)}Z`
  })
  return trunk + fronds.join('')
}
export function pine(x, h) {
  const tiers = [0, 1, 2].map((i) => {
    const top = 150 - h + i * h * 0.24, bot = 150 - h * 0.5 + i * h * 0.2, hw = h * 0.17 * (1 + i * 0.45)
    return `M${f(x)} ${f(top)}L${f(x + hw)} ${f(bot)}L${f(x - hw)} ${f(bot)}Z`
  })
  return tiers.join('') + `M${f(x - 1.2)} 150V${f(150 - h * 0.12)}H${f(x + 1.2)}V150Z`
}
const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`
export function oak(x, r) {
  return circle(x, 150 - r * 1.7, r) + circle(x - r * 0.85, 150 - r * 1.25, r * 0.78) + circle(x + r * 0.9, 150 - r * 1.3, r * 0.72) +
    `M${f(x - r * 0.16)} 150L${f(x - r * 0.1)} ${f(150 - r)}H${f(x + r * 0.1)}L${f(x + r * 0.16)} 150Z`
}
/** A round tree on a short trunk: an orange grove's, or a cherry's. */
export function roundTree(x, r) {
  return circle(x, 150 - r * 1.35, r) + `M${f(x - 0.9)} 150V${f(150 - r * 0.5)}H${f(x + 0.9)}V150Z`
}
/** A tall windbreak tree: the eucalyptus rows of the old Fontana ranches. */
export function eucalyptus(x, h) {
  const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`
  return ell(x, 150 - h * 0.62, h * 0.11, h * 0.36) + ell(x + h * 0.06, 150 - h * 0.42, h * 0.1, h * 0.22) + `M${f(x - 0.9)} 150V${f(150 - h * 0.3)}H${f(x + 0.9)}V150Z`
}

// ---- Buildings ----
export function house(x, w, h) {
  return `M${f(x)} 150V${f(150 - h)}L${f(x + w / 2)} ${f(150 - h - w * 0.36)}L${f(x + w)} ${f(150 - h)}V150Z` +
    `M${f(x + w * 0.72)} ${f(150 - h - w * 0.2)}V${f(150 - h - w * 0.36)}H${f(x + w * 0.82)}V${f(150 - h - w * 0.1)}Z`
}
/** A house with a round turret: Redlands' Victorians. */
export function victorian(x) {
  return `M${f(x)} 150V122L${f(x + 20)} 104L${f(x + 40)} 122V150Z` + `M${f(x - 10)} 150V112H${f(x)}V150Z` + `M${f(x - 11)} 112L${f(x - 5)} 96L${f(x + 1)} 112Z` + `M${f(x + 26)} 112V102H${f(x + 30)}V108Z`
}
export function clockTower(x, h) {
  return `M${f(x - 6)} 150V${f(150 - h)}H${f(x + 6)}V150Z` + `M${f(x - 8)} ${f(150 - h)}L${f(x)} ${f(150 - h - 12)}L${f(x + 8)} ${f(150 - h)}Z`
}
/** A school: long and low, its entry raised, and a flagpole. */
export function school(x) {
  return `M${f(x)} 150V126H${f(x + 44)}V118H${f(x + 66)}V126H${f(x + 110)}V150Z` + `M${f(x - 12)} 150V92H${f(x - 10.8)}V150Z`
}
export const flag = (x) => `M${f(x - 10.8)} 92H${f(x + 2)}V100H${f(x - 10.8)}Z`
export function swingSet(x) {
  return `M${f(x)} 150L${f(x + 9)} 128L${f(x + 18)} 150H${f(x + 16.5)}L${f(x + 9)} 131L${f(x + 1.5)} 150Z` + `M${f(x + 9)} 128H${f(x + 39)}V129.5H${f(x + 9)}Z` +
    `M${f(x + 30)} 150L${f(x + 39)} 128L${f(x + 48)} 150H${f(x + 46.5)}L${f(x + 39)} 131L${f(x + 31.5)} 150Z`
}
export function bleachers(x) {
  return `M${f(x)} 150V144H${f(x + 8)}V138H${f(x + 16)}V132H${f(x + 24)}V126H${f(x + 32)}V150Z`
}
/** A mission church: a curved gable, an arched door, a domed bell tower with its cross. */
export function mission(x) {
  return `M${f(x)} 150V118Q${f(x + 6)} 118 ${f(x + 10)} 112Q${f(x + 16)} 102 ${f(x + 22)} 100Q${f(x + 28)} 102 ${f(x + 34)} 112Q${f(x + 38)} 118 ${f(x + 44)} 118V150Z` +
    `M${f(x + 48)} 150V86H${f(x + 62)}V150Z` + `M${f(x + 47)} 86Q${f(x + 55)} 72 ${f(x + 63)} 86Z` +
    `M${f(x + 54.3)} 79V68H${f(x + 55.7)}V79Z` + `M${f(x + 51.5)} 71.5H${f(x + 58.5)}V72.9H${f(x + 51.5)}Z` +
    `M${f(x - 40)} 150V128H${f(x)}V150Z`
}
export const missionDoor = (x) => `M${f(x + 17)} 150V136Q${f(x + 22)} 128 ${f(x + 27)} 136V150Z`
export const missionArches = (x) => [0, 1, 2, 3].map((i) => `M${f(x - 37 + i * 10)} 150V140Q${f(x - 33 + i * 10)} 134 ${f(x - 29 + i * 10)} 140V150Z`).join('')
export const bellWindow = (x) => `M${f(x + 52)} 104V96Q${f(x + 55)} 91 ${f(x + 58)} 96V104Z`

/** A fairy-tale castle: towers under tall cones, a wall and a gate. Generic. */
export function castle(x) {
  const tower = (cx, w, top, cone) => `M${f(cx - w / 2)} 150V${f(top)}H${f(cx + w / 2)}V150Z` + `M${f(cx - w / 2 - 2)} ${f(top)}L${f(cx)} ${f(top - cone)}L${f(cx + w / 2 + 2)} ${f(top)}Z`
  let wall = `M${f(x - 46)} 150V128`
  for (let i = 0; i < 9; i++) wall += `H${f(x - 46 + i * 10 + 5)}V125H${f(x - 46 + i * 10 + 10)}V128`
  wall += `H${f(x + 46)}V150Z`
  return wall + tower(x, 14, 96, 30) + tower(x - 14, 9, 110, 20) + tower(x + 14, 9, 108, 22) + tower(x - 34, 10, 118, 18) + tower(x + 36, 10, 120, 16) + tower(x + 6, 6, 104, 14)
}
export const castleGate = (x) => `M${f(x - 6)} 150V140Q${f(x)} 132 ${f(x + 6)} 140V150Z`
export const castleFlags = (x) => [[x, 66], [x - 14, 90], [x + 14, 86], [x - 34, 100], [x + 36, 104]].map(([cx, top]) => `M${f(cx)} ${f(top)}V${f(top - 7)}L${f(cx + 6)} ${f(top - 5)}L${f(cx + 0.8)} ${f(top - 3)}Z`).join('')
/** A craggy peak with a snowy top. */
export const crag = (x) => line([[x - 58, 150], [x - 36, 116], [x - 26, 104], [x - 14, 86], [x - 9, 78], [x - 3, 64], [x + 2, 60], [x + 6, 68], [x + 12, 76], [x + 20, 90], [x + 28, 98], [x + 38, 118], [x + 58, 150]]) + 'Z'
export const cragSnow = (x) => line([[x - 14, 86], [x - 9, 78], [x - 3, 64], [x + 2, 60], [x + 6, 68], [x + 12, 76], [x + 16, 84], [x + 11, 82], [x + 6, 88], [x + 1, 80], [x - 4, 90], [x - 9, 84]]) + 'Z'

export function ferrisFrame(x, r) {
  const cy = 150 - r - 8
  return `M${f(x - r * 0.55)} 150L${f(x)} ${f(cy)}L${f(x + r * 0.55)} 150H${f(x + r * 0.55 - 2)}L${f(x)} ${f(cy + 3)}L${f(x - r * 0.55 + 2)} 150Z`
}
export function ferrisWheel(x, r) {
  const cy = 150 - r - 8
  let d = circle(x, cy, r) + circle(x, cy, r - 1.4)
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, ex = x + Math.cos(a) * r, ey = cy + Math.sin(a) * r
    d += `M${f(x)} ${f(cy)}L${f(ex)} ${f(ey)}` + circle(ex, ey, 2.2)
  }
  return d
}
export const ferrisCentre = (x, r) => [x, 150 - r - 8]

/** The monorail's beam on its pillars, and the train (drawn at x = 0). */
export function monorailBeam(y, x0, x1) {
  let d = `M${f(x0)} ${f(y)}H${f(x1)}V${f(y + 3)}H${f(x0)}Z`
  for (let x = x0 + 20; x < x1; x += 70) d += `M${f(x - 1.5)} ${f(y + 3)}H${f(x + 1.5)}L${f(x + 2.5)} 150H${f(x - 2.5)}Z`
  return d
}
export const monorailTrain = (y) => `M0 ${f(y)}H62Q72 ${f(y)} 76 ${f(y - 5)}Q72 ${f(y - 11)} 62 ${f(y - 11)}H6Q0 ${f(y - 11)} 0 ${f(y - 5)}Z`
export const monorailWindows = (y) => [8, 20, 32, 44].map((x) => `M${x} ${f(y - 9)}H${x + 8}V${f(y - 6)}H${x}Z`).join('') + `M60 ${f(y - 9)}Q68 ${f(y - 9)} 70 ${f(y - 6)}H60Z`

// ---- Landmarks ----
/**
 * The Eiffel Tower, as an open lattice: its four legs curving in to the first
 * platform, the great arch between them, the legs meeting at the second
 * platform, the shaft to the top. { solid, lines }: platforms to fill, and
 * the legs' edges and bracing to stroke, so the sky shows through.
 */
export function eiffel(x, h) {
  const Y = (k) => 150 - h * k
  const y1 = Y(0.27), y2 = Y(0.56), y3 = Y(0.9)
  // Half-widths up the tower: outer and inner edge of a leg
  const outer = (y) => (y >= y1 ? 19 + 11 * Math.pow((y - y1) / (150 - y1), 1.6) : y >= y2 ? 9.5 + 9.5 * ((y - y2) / (y1 - y2)) ** 1.15 : 2 + 4 * ((y - y3) / (y2 - y3)) ** 1.4)
  const inner = (y) => (y >= y1 ? 11 + 6 * Math.pow((y - y1) / (150 - y1), 1.4) : y >= y2 ? 3 + 8 * ((y - y2) / (y1 - y2)) : 0)
  const edge = (fn, sign, from, to, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const y = from + ((to - from) * i) / n; return [x + sign * fn(y), y] })
  let lines = ''
  for (const sign of [-1, 1]) {
    for (const [a, b] of [[150, y1], [y1, y2]]) {
      lines += line(edge(outer, sign, a, b)) + line(edge(inner, sign, a, b))
      // Bracing: a zigzag between the leg's two edges
      const steps = a === 150 ? 7 : 6, zig = []
      for (let i = 0; i <= steps; i++) { const y = a + ((b - a) * i) / steps; zig.push([x + sign * (i % 2 ? inner(y) : outer(y)), y]) }
      lines += line(zig)
    }
  }
  // The shaft above the second platform, braced across
  lines += line(edge(outer, -1, y2, y3, 10)) + line(edge(outer, 1, y2, y3, 10))
  for (let i = 0; i < 8; i++) {
    const ya = y2 + ((y3 - y2) * i) / 8, yb = y2 + ((y3 - y2) * (i + 1)) / 8
    lines += line([[x - outer(ya), ya], [x + outer(yb), yb]]) + line([[x + outer(ya), ya], [x - outer(yb), yb]])
  }
  // The great arch between the legs, under the first platform
  const archFoot = Y(0.08)
  lines += `M${f(x - inner(archFoot))} ${f(archFoot)}Q${f(x)} ${f(y1 - 2)} ${f(x + inner(archFoot))} ${f(archFoot)}`
  lines += `M${f(x)} ${f(y3)}V${f(Y(1))}` // the mast
  const solid = `M${f(x - 23)} ${f(y1 - 2.4)}H${f(x + 23)}V${f(y1 + 1.4)}H${f(x - 23)}Z` + `M${f(x - 11.5)} ${f(y2 - 2)}H${f(x + 11.5)}V${f(y2 + 1)}H${f(x - 11.5)}Z` +
    `M${f(x - 3)} ${f(y3 - 1)}H${f(x + 3)}V${f(y3 + 1.2)}H${f(x - 3)}Z` + `M${f(x - 1.4)} ${f(y3 - 1)}V${f(y3 - 5)}H${f(x + 1.4)}V${f(y3 - 1)}Z`
  return { solid, lines }
}
/** Paris rooftops: mansards, chimneys, a dome or two. */
export function rooftops(seed, x0, x1) {
  const r = seeded(seed)
  let d = '', x = x0
  while (x < x1) {
    const w = 18 + r() * 16, h = 18 + r() * 12, top = 150 - h
    d += `M${f(x)} 150V${f(top)}L${f(x + 4)} ${f(top - 7)}H${f(x + w - 4)}L${f(x + w)} ${f(top)}V150Z`
    if (r() > 0.4) d += `M${f(x + w * 0.3)} ${f(top - 7)}V${f(top - 11)}H${f(x + w * 0.3 + 3)}V${f(top - 7)}Z`
    x += w + 1
  }
  return d
}
export function capitol(x) {
  return `M${f(x - 64)} 150V134H${f(x + 64)}V150Z` + `M${f(x - 22)} 134V122H${f(x + 22)}V134Z` + `M${f(x - 14)} 122V110H${f(x + 14)}V122Z` +
    `M${f(x - 15)} 110Q${f(x - 14)} 88 ${f(x)} 86Q${f(x + 14)} 88 ${f(x + 15)} 110Z` + `M${f(x - 2.5)} 87V79H${f(x + 2.5)}V87Z` + `M${f(x - 0.8)} 79V73H${f(x + 0.8)}V79Z`
}
export const obelisk = (x, h) => `M${f(x - 5)} 150L${f(x - 3.6)} ${f(150 - h + 8)}L${f(x)} ${f(150 - h)}L${f(x + 3.6)} ${f(150 - h + 8)}L${f(x + 5)} 150Z`
export function templeOfHeaven(x) {
  const roof = (y, wb, wt, h) => `M${f(x - wb / 2)} ${f(y)}Q${f(x - wb / 2 + 3)} ${f(y - 2)} ${f(x - wt / 2)} ${f(y - h)}H${f(x + wt / 2)}Q${f(x + wb / 2 - 3)} ${f(y - 2)} ${f(x + wb / 2)} ${f(y)}Z`
  return `M${f(x - 56)} 150V145H${f(x + 56)}V150Z` + `M${f(x - 46)} 145V140H${f(x + 46)}V145Z` + `M${f(x - 36)} 140V135H${f(x + 36)}V140Z` +
    `M${f(x - 15)} 135V126H${f(x + 15)}V135Z` + roof(127, 50, 26, 8) + `M${f(x - 11)} 119V113H${f(x + 11)}V119Z` + roof(114, 40, 18, 7) +
    `M${f(x - 8)} 107V102H${f(x + 8)}V107Z` + roof(103, 30, 2, 13)
}
export const finial = (x) => circle(x, 88, 2)
export function skyline(seed, x0, x1, lo, hi) {
  const r = seeded(seed)
  let d = '', x = x0
  while (x < x1) {
    const w = 8 + r() * 14, h = lo + r() * (hi - lo)
    d += `M${f(x)} 150V${f(150 - h)}H${f(x + w)}V150Z`
    if (r() > 0.7) d += `M${f(x + w * 0.25)} ${f(150 - h)}V${f(150 - h - 6)}H${f(x + w * 0.75)}V${f(150 - h)}Z`
    x += w + 0.5
  }
  return d
}
/** Lit windows scattered over a skyline's span. */
export function windows(seed, x0, x1, lo, hi, share = 0.35) {
  const r = seeded(seed + 7)
  let d = ''
  for (let x = x0; x < x1; x += 4) for (let y = 150 - lo; y > 150 - hi; y -= 5) if (r() < share * 0.25) d += `M${f(x)} ${f(y)}h1.6v2.2h-1.6Z`
  return d
}
/** A tall stepped tower with a spire. Generic art deco. */
export const spireTower = (x) => `M${f(x - 12)} 150V92H${f(x - 8)}V80H${f(x - 5)}V70H${f(x - 2)}V56H${f(x - 0.6)}V40H${f(x + 0.6)}V56H${f(x + 2)}V70H${f(x + 5)}V80H${f(x + 8)}V92H${f(x + 12)}V150Z`
export function volcano(x, w, h) {
  return `M${f(x - w / 2)} 150C${f(x - w / 4)} ${f(150 - h * 0.55)} ${f(x - w * 0.12)} ${f(150 - h)} ${f(x - w * 0.04)} ${f(150 - h)}L${f(x)} ${f(150 - h + 2)}L${f(x + w * 0.04)} ${f(150 - h)}C${f(x + w * 0.12)} ${f(150 - h)} ${f(x + w / 4)} ${f(150 - h * 0.55)} ${f(x + w / 2)} 150Z`
}
export const water = (y) => `M-160 ${f(y)}H560V150H-160Z`
export function waves(seed, y, x0 = -160, x1 = 560) {
  const r = seeded(seed)
  let d = ''
  for (let i = 0; i < 26; i++) { const x = x0 + r() * (x1 - x0), yy = y + 3 + r() * (150 - y - 5), w = 6 + r() * 12; d += `M${f(x)} ${f(yy)}h${f(w)}v.8h${f(-w)}Z` }
  return d
}
export const hull = (x, s, y) => `M${f(x - 9 * s)} ${f(y)}H${f(x + 9 * s)}L${f(x + 6 * s)} ${f(y + 3 * s)}H${f(x - 6 * s)}Z`
export const sails = (x, s, y) => `M${f(x)} ${f(y - 1)}V${f(y - 22 * s)}L${f(x + 8 * s)} ${f(y - 3 * s)}Z` + `M${f(x - 1)} ${f(y - 19 * s)}L${f(x - 7 * s)} ${f(y - 3 * s)}H${f(x - 1)}Z`
/** An ocean liner with three funnels. */
export function liner(x, y) {
  return `M${f(x - 62)} ${f(y - 8)}H${f(x + 58)}L${f(x + 66)} ${f(y - 11)}L${f(x + 60)} ${f(y + 3)}H${f(x - 58)}Z` + `M${f(x - 44)} ${f(y - 8)}V${f(y - 14)}H${f(x + 40)}V${f(y - 8)}Z` + `M${f(x - 34)} ${f(y - 14)}V${f(y - 18)}H${f(x + 28)}V${f(y - 14)}Z`
}
export const funnels = (x, y) => [-22, -2, 18].map((dx) => `M${f(x + dx - 4)} ${f(y - 18)}L${f(x + dx - 2)} ${f(y - 32)}H${f(x + dx + 5)}L${f(x + dx + 4)} ${f(y - 18)}Z`).join('')
export const portholes = (x, y) => Array.from({ length: 16 }, (_, i) => circle(x - 52 + i * 7, y - 3.5, 0.9)).join('')
/** A harbour crane: legs over the quay, its boom out over the water. */
export function crane(x, h) {
  const t = 150 - h
  return `M${f(x - 12)} 150L${f(x - 9)} ${f(t)}H${f(x - 7)}L${f(x - 9)} 150Z` + `M${f(x + 10)} 150L${f(x + 9)} ${f(t)}H${f(x + 11)}L${f(x + 12)} 150Z` +
    `M${f(x - 26)} ${f(t)}H${f(x + 56)}V${f(t + 3)}H${f(x - 26)}Z` + `M${f(x - 6)} ${f(t + 3)}H${f(x + 6)}V${f(t + 9)}H${f(x - 6)}Z` +
    `M${f(x - 1)} ${f(t)}L${f(x + 1)} ${f(t - 14)}L${f(x + 2)} ${f(t)}Z` + `M${f(x + 1)} ${f(t - 14)}L${f(x + 54)} ${f(t)}L${f(x + 52)} ${f(t)}L${f(x + 1)} ${f(t - 12)}Z`
}
export function lighthouse(x) {
  return `M${f(x - 4.5)} 150L${f(x - 3)} 116H${f(x + 3)}L${f(x + 4.5)} 150Z` + `M${f(x - 3.5)} 116V110H${f(x + 3.5)}V116Z` + `M${f(x - 3.5)} 110L${f(x)} 105L${f(x + 3.5)} 110Z`
}
export const canoe = (x, y) => `M${f(x - 16)} ${f(y)}Q${f(x)} ${f(y + 4)} ${f(x + 16)} ${f(y)}L${f(x + 14)} ${f(y + 2.5)}H${f(x - 14)}Z` + `M${f(x - 7)} ${f(y)}V${f(y - 5)}H${f(x - 6)}V${f(y)}Z` + `M${f(x - 8)} ${f(y - 6)}H${f(x + 8)}V${f(y - 5)}H${f(x - 8)}Z` + `M${f(x - 9)} ${f(y - 6.5)}H${f(x + 3)}V${f(y - 4.5)}H${f(x - 9)}Z`
export const cabin = (x) => `M${f(x)} 150V134L${f(x + 11)} 124L${f(x + 22)} 134V150Z`
export const shops = (x0, n) => Array.from({ length: n }, (_, i) => `M${f(x0 + i * 17)} 150V${f(132 - (i % 3) * 3)}H${f(x0 + i * 17 + 16)}V150Z`).join('')
/** The Arrowhead on the mountain above San Bernardino: a bare patch the shape of an arrowhead. */
export const arrowhead = (x, y) => `M${f(x)} ${f(y)}L${f(x + 4)} ${f(y + 6)}L${f(x + 2)} ${f(y + 12)}L${f(x)} ${f(y + 14)}L${f(x - 2)} ${f(y + 12)}L${f(x - 4)} ${f(y + 6)}Z`
export function cloud(x, y, s) {
  const e = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`
  return e(x, y, 18 * s, 6 * s) + e(x - 7 * s, y - 4 * s, 9 * s, 6 * s) + e(x + 6 * s, y - 6 * s, 10 * s, 7 * s)
}
export function stars(seed, n) {
  const r = seeded(seed)
  return Array.from({ length: n }, () => [-150 + r() * 700, 4 + r() * 70, 0.4 + r() * 0.7])
}

/** A Joshua tree: a shaggy trunk, arms that fork and bend upward, spiky tufts at the tips. */
export function joshuaTree(x, h, seed = 1) {
  const r = seeded(seed)
  const limb = (x0, y0, ang, len, depth) => {
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 - Math.sin(ang) * len, w = 2.2 + depth * 1.1
    let d = `M${f(x0 - w)} ${f(y0)}L${f(x1 - w * 0.8)} ${f(y1)}L${f(x1 + w * 0.8)} ${f(y1)}L${f(x0 + w)} ${f(y0)}Z`
    if (depth > 0) {
      const spread = 0.5 + r() * 0.35
      d += limb(x1, y1, ang + spread, len * (0.62 + r() * 0.15), depth - 1) + limb(x1, y1, ang - spread * 0.8, len * (0.55 + r() * 0.2), depth - 1)
    } else {
      // A tuft of spiky leaves
      for (let k = 0; k < 15; k++) {
        const a = Math.PI / 2 + ((k - 7) / 7) * 1.7, L = 5 + r() * 3.5
        d += `M${f(x1)} ${f(y1)}L${f(x1 + Math.cos(a) * L - 0.5)} ${f(y1 - Math.sin(a) * L)}L${f(x1 + Math.cos(a) * L + 0.5)} ${f(y1 - Math.sin(a) * L)}Z`
      }
    }
    return d
  }
  return limb(x, 150, Math.PI / 2 + (r() - 0.5) * 0.15, h * 0.42, 2)
}
/** A wind turbine on a far ridge: its tower, and its three blades turning about [x, top]. */
export const turbineTower = (x, h) => `M${f(x - 0.7)} 150L${f(x - 0.35)} ${f(150 - h)}H${f(x + 0.35)}L${f(x + 0.7)} 150Z`
export function turbineBlades(x, top, L) {
  return [0, 120, 240].map((deg) => {
    const a = (deg * Math.PI) / 180, ex = x + Math.sin(a) * L, ey = top - Math.cos(a) * L, nx = Math.cos(a) * 0.6, ny = Math.sin(a) * 0.6
    return `M${f(x + nx)} ${f(top + ny)}L${f(ex)} ${f(ey)}L${f(x - nx)} ${f(top - ny)}Z`
  }).join('') + circle(x, top, 0.9)
}

/**
 * Three round bursts: one large, and two smaller ones rising out of it up
 * and to either side, about 60 degrees from straight up, just overlapping
 * its edge. [{ x, y, r, delay }] around a centre (cx, cy).
 */
export function burstTrio(cx, cy, R) {
  const r = R * 0.56, d = R + r * 0.62, a = Math.PI / 3
  return [
    { x: cx, y: cy, r: R, delay: 0 },
    { x: cx - Math.sin(a) * d, y: cy - Math.cos(a) * d, r, delay: 0.45 },
    { x: cx + Math.sin(a) * d, y: cy - Math.cos(a) * d, r, delay: 0.45 },
  ]
}
