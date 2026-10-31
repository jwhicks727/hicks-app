// Turn Natural Earth land (world-atlas TopoJSON files, read as data) into two
// small SVG outlines. Nothing from the package runs: TopoJSON is decoded here.
// Usage: node scripts/make-map.mjs <world-atlas dir> src/lib/mapdata.js, where the
// directory is world-atlas 2.0.2 unpacked (npm pack world-atlas@2.0.2, then tar -xzf):
// its JSON is read as data, and it is never a dependency of the app.
import fs from 'node:fs'
import path from 'node:path'

const [atlas, out] = process.argv.slice(2)
const read = (f) => JSON.parse(fs.readFileSync(path.join(atlas, f), 'utf8'))

// Arcs are delta-encoded and quantized; a ring is a list of arc indexes (~i reversed).
function landRings(topo) {
  const t = topo.transform
  const arcs = topo.arcs.map((arc) => {
    let x = 0, y = 0
    return arc.map(([a, b]) => {
      if (!t) return [a, b]
      x += a; y += b
      return [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]]
    })
  })
  const ring = (ids) => {
    const pts = []
    for (const i of ids) { const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]; pts.push(...(pts.length ? a.slice(1) : a)) }
    return pts
  }
  const rings = []
  const walk = (g) => {
    if (g.type === 'GeometryCollection') g.geometries.forEach(walk)
    else if (g.type === 'Polygon') g.arcs.forEach((r) => rings.push(ring(r)))
    else if (g.type === 'MultiPolygon') g.arcs.forEach((p) => p.forEach((r) => rings.push(ring(r))))
  }
  walk(topo.objects.land)
  return rings
}

// A closed ring starts and ends on one point, which Douglas-Peucker can't measure from:
// split it at the point farthest from the start and simplify each half.
function simplify(pts, tol) {
  if (pts.length < 4) return pts
  const [x0, y0] = pts[0]
  let far = 1, best = 0
  for (let i = 1; i < pts.length; i++) { const dd = Math.hypot(pts[i][0] - x0, pts[i][1] - y0); if (dd > best) { best = dd; far = i } }
  return [...dp(pts.slice(0, far + 1), tol).slice(0, -1), ...dp(pts.slice(far), tol)]
}
function dp(pts, tol) { // Douglas-Peucker
  if (pts.length < 3) return pts
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, idx = -1
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1
    for (let i = a + 1; i < b; i++) { const dd = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len; if (dd > max) { max = dd; idx = i } }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]) }
  }
  return pts.filter((_, i) => keep[i])
}

function clip(ring, [x0, y0, x1, y1]) { // Sutherland-Hodgman against a rectangle
  const edges = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + (b[1] - a[1]) * (x0 - a[0]) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + (b[0] - a[0]) * (y0 - a[1]) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]],
  ]
  let res = ring
  for (const [inside, cut] of edges) {
    const inp = res; res = []
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length]
      if (inside(cur)) { if (!inside(prev)) res.push(cut(prev, cur)); res.push(cur) } else if (inside(prev)) res.push(cut(prev, cur))
    }
    if (!res.length) return []
  }
  return res
}
const d = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L') + 'Z'

// The world: equirectangular, 84°N to 58°S, 1000 wide
const W = 1000, top = 84, bottom = -58, H = Math.round(W * (top - bottom) / 360)
// world-atlas stitches rings across the antimeridian (Fiji, Chukotka), which would
// draw a line across the whole map: unwrap their longitudes, then draw a ring that
// spills past 180° a second time, a world over, and let the viewBox clip both.
const unwrap = (r) => {
  const out = [r[0]]
  for (let i = 1; i < r.length; i++) {
    let lon = r[i][0]; const prev = out[i - 1][0]
    while (lon - prev > 180) lon -= 360
    while (prev - lon > 180) lon += 360
    out.push([lon, r[i][1]])
  }
  return out
}
const world = landRings(read('land-110m.json'))
  .filter((r) => Math.max(...r.map((p) => p[1])) > bottom)
  .map(unwrap)
  .flatMap((r) => {
    const lons = r.map((p) => p[0]), copies = [r]
    if (Math.max(...lons) > 180) copies.push(r.map(([lon, lat]) => [lon - 360, lat]))
    if (Math.min(...lons) < -180) copies.push(r.map(([lon, lat]) => [lon + 360, lat]))
    return copies
  })
  .map((r) => simplify(r.map(([lon, lat]) => [(lon + 180) / 360 * W, (top - Math.max(bottom, lat)) / 360 * W]), 0.6))
  .filter((r) => r.length > 3)

// Continents, for their own colours: the land cut along longitude and latitude
// into bands that don't overlap (lon/lat boxes: [west, south, east, north]), each
// part filled in its region's colour, the coastline drawn once over them all.
const BANDS = {
  ice: [[-75, 59, -10, 84]],
  na: [[-180, 7.5, -75, 84], [-75, 7.5, -25, 59]],
  sa: [[-180, -60, -25, 7.5]],
  eu: [[-25, 36, 45, 59], [-10, 59, 45, 84]],
  af: [[-25, -60, 33, 36], [33, -60, 52, 12]],
  as: [[33, 12, 45, 36], [45, 12, 52, 84], [52, -10, 180, 84]],
  oc: [[52, -60, 110, -10], [110, -60, 180, -10]],
}
const lonlat = landRings(read('land-110m.json')).filter((r) => Math.max(...r.map((p) => p[1])) > bottom).map(unwrap)
  .flatMap((r) => { const lons = r.map((p) => p[0]), out = [r]; if (Math.max(...lons) > 180) out.push(r.map(([a, b]) => [a - 360, b])); if (Math.min(...lons) < -180) out.push(r.map(([a, b]) => [a + 360, b])); return out })
const toW = (r) => r.map(([lon, lat]) => [(lon + 180) / 360 * W, (top - Math.max(bottom, lat)) / 360 * W])
const regionsOut = Object.fromEntries(Object.entries(BANDS).map(([k, boxes]) => [k, boxes.flatMap((b) => lonlat.map((r) => clip(r, b)).filter((r) => r.length > 2))
  .map((r) => simplify(toW(r), 0.6)).filter((r) => r.length > 2).map(d).join('')]))
const worldLand = world.map(d).join('')

// Southern California, with room round it so a wide or tall screen can show more:
// the Channel Islands to past the Salton Sea, Ensenada to past Santa Barbara
const BOX = [-120.4, 31.6, -114.6, 35.6], lat0 = (BOX[1] + BOX[3]) / 2, cos0 = Math.cos(lat0 * Math.PI / 180)
const k = 1000 / ((BOX[2] - BOX[0]) * cos0), NH = Math.round((BOX[3] - BOX[1]) * k)
const near = landRings(read('land-10m.json'))
  .map((r) => clip(r, BOX)).filter((r) => r.length > 2)
  .map((r) => simplify(r.map(([lon, lat]) => [(lon - BOX[0]) * cos0 * k, (BOX[3] - lat) * k]), 0.45))
  .filter((r) => r.length > 2).map(d).join('')

fs.writeFileSync(out, `// Generated from Natural Earth's land (public domain), by way of the world-atlas
// package (ISC): outlines only, simplified. Regenerate rather than edit
// (docs/DECISIONS-LOG.md, "Our places on a map").

export const WORLD = { width: ${W}, height: ${H}, top: ${top}, bottom: ${bottom}, land: '${worldLand}', regions: ${JSON.stringify(regionsOut)} }
export const NEAR = { width: 1000, k: ${k}, cos0: ${cos0}, height: ${NH}, box: ${JSON.stringify(BOX)}, lat0: ${lat0}, land: '${near}' }
`)
console.log('world', worldLand.length, 'regions', Object.keys(regionsOut).join(','), 'near', near.length, 'heights', H, NH)
