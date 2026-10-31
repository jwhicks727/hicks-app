// ============================================
// formations.js -- the world map's natural formations, drawn simply
// ============================================
// Pure, so tests run it in Node. Land is green; the great deserts are sand,
// the great forests a deeper green, the far north tundra, the ice caps and
// the highest snows white, and the mountain ranges rows of little brown
// peaks with white tips. Rough outlines, smoothed: a hint of each, not a
// survey. [lng, lat] rings; the map clips them to the coastline.

import { project } from './places.js'

export const DESERTS = [
  ['Sahara', [[-16, 20], [-13, 27], [-6, 30.5], [3, 31], [11, 31.5], [20, 30], [29, 29.5], [33, 26], [33.5, 21], [31, 17], [23, 15.5], [14, 15.5], [4, 16.5], [-5, 16], [-15, 16.5]]],
  ['Arabian', [[36.5, 29.5], [42, 30.5], [47.5, 28.5], [54, 24.5], [56.5, 21], [52, 17.5], [46, 15], [41, 18.5], [38, 24]]],
  ['Iranian and Thar', [[51, 34], [58, 35.5], [63, 33], [67, 29], [72, 27.5], [73.5, 25], [70, 23.5], [64, 25.5], [58, 27.5], [53, 30.5]]],
  ['Karakum', [[54, 41.5], [61, 43.5], [66.5, 42], [65, 38.5], [58, 38]]],
  ['Taklamakan', [[77, 40], [86, 41.2], [89.5, 39.5], [85, 37], [79, 37.5]]],
  ['Gobi', [[93, 44], [102, 45], [111, 44], [112, 41.5], [104, 40.5], [96, 41.5]]],
  ['Australian', [[115, -22], [122, -19.5], [131, -18.5], [137.5, -21.5], [140, -27], [136.5, -31], [128, -31.5], [120, -30.5], [115.5, -27]]],
  ['Kalahari and Namib', [[13, -18.5], [20, -18.5], [24.5, -21.5], [24.5, -27], [20, -29], [15.5, -28], [12, -22]]],
  ['Great Basin and Mojave', [[-120, 42], [-114.5, 42], [-111.5, 38.5], [-110.5, 33.5], [-113, 31.8], [-115.8, 32.6], [-117.3, 34.9], [-118.6, 37.8]]],
  ['Chihuahuan', [[-108, 32], [-104, 32], [-102.5, 28.5], [-104, 25.5], [-107, 27.5]]],
  ['Atacama', [[-71, -18], [-69, -18.5], [-68.8, -25.5], [-70.2, -28], [-71.2, -25]]],
  ['Patagonian steppe', [[-70, -38], [-65, -40.5], [-66.5, -47], [-69, -51], [-71, -46]]],
]

export const FORESTS = [
  ['Amazon', [[-78, 0], [-70, 2.5], [-60, 4], [-52, 2], [-48, -2], [-50, -8], [-58, -12], [-66, -12], [-74, -8.5], [-78, -3.5]]],
  ['Congo', [[9.5, 4], [18, 5], [28, 4], [30, 0], [28, -5], [20, -6.5], [12, -3]]],
  ['The northern forest of North America', [[-165, 64], [-150, 66.5], [-130, 66.5], [-110, 62.5], [-95, 58.5], [-80, 54], [-65, 52.5], [-57, 50], [-62, 46], [-75, 46], [-90, 48], [-105, 53], [-120, 56.5], [-140, 60.5], [-158, 60.5]]],
  ['The taiga', [[24, 64], [40, 66], [60, 66.5], [80, 67], [100, 67.5], [120, 66], [140, 64], [160, 62], [150, 56], [135, 51.5], [120, 52], [100, 54], [85, 55], [65, 56], [50, 57], [35, 58], [24, 60]]],
  ['Southeast Asia', [[96, 22], [104, 22], [108, 16], [106, 10], [100, 6], [100, 12], [97, 16]]],
  ['Borneo and Sumatra', [[96, 4], [104, -1], [106, -5], [102, -4], [98, 0]]],
  ['Borneo', [[109, 3.5], [117, 6.8], [119, 1], [116, -3.5], [110, -3]]],
  ['The Pacific Northwest', [[-125, 49.5], [-121, 49.5], [-121, 42], [-124.3, 42]]],
  ['The eastern woods', [[-91, 45], [-77, 44.5], [-75, 38.5], [-81.5, 32.5], [-90, 32], [-94.5, 37]]],
]

export const ICE = [
  ['Greenland', [[-54, 61], [-44, 60], [-36, 65.5], [-22, 70], [-18, 77.5], [-28, 83], [-55, 82.5], [-70, 78.5], [-61, 73], [-53, 67]]],
  ['Tibet’s snows', [[73, 36.5], [80, 35.5], [88, 30.5], [97, 29.5], [95.5, 27.5], [86, 27.8], [78, 30], [74, 33]]],
  ['The Alps', [[6, 45.8], [9.5, 46.8], [13.5, 47.2], [12.5, 46.3], [7, 45.4]]],
]
/** Bands by latitude: tundra across the far north, ice at the poles. */
export const BANDS = [['tundra', 66.5, 78], ['ice', 78, 90], ['ice', -90, -62]]

export const RANGES = [
  ['Rockies', [[-123, 58], [-117, 52], [-114, 46.5], [-110.5, 43], [-107, 39], [-106, 35]]],
  ['Sierra Nevada', [[-121.2, 40.2], [-118.4, 36]]],
  ['Andes', [[-74, 9], [-77.5, 1], [-79, -5], [-76, -12], [-70.5, -17], [-68.5, -24], [-70, -33], [-71.2, -40], [-73, -48], [-72.5, -52.5]]],
  ['Alps', [[6, 45], [10, 46.5], [14.5, 47.2]]],
  ['Himalaya', [[72.5, 35.5], [78, 32.5], [84, 28.8], [90, 28], [95.5, 28.5]]],
  ['Tian Shan', [[70, 42], [80, 42.5], [88, 43.2]]],
  ['Urals', [[60, 68], [59, 62], [58, 56], [58.5, 52]]],
  ['Atlas', [[-8.5, 31], [-2, 33.5], [6, 35.5], [9, 36.5]]],
  ['Caucasus', [[39.5, 43.8], [47, 41.8]]],
  ['Zagros', [[45, 36], [50, 32.5], [56, 28]]],
  ['Appalachians', [[-84.5, 34], [-80, 37.5], [-76.5, 41], [-71.5, 44.5]]],
  ['Scandinavian mountains', [[6.5, 59], [10, 63], [15.5, 68], [20, 70]]],
  ['Great Dividing Range', [[145, -15], [147, -22], [150.5, -28.5], [149, -34], [146, -37.5]]],
  ['Southern Alps', [[167, -46], [171.5, -43]]],
  ['Ethiopian Highlands', [[37, 14], [39, 11], [38.5, 7.5]]],
]

const fmt = (n) => Math.round(n * 10) / 10

/** A ring as a smooth closed path (Catmull-Rom made into curves), in world-map units. */
export function smoothRing(ring) {
  const p = ring.map(([lng, lat]) => project('world', lat, lng))
  const n = p.length
  let d = `M${fmt(p[0][0])} ${fmt(p[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`
  }
  return d + 'Z'
}

/** A band of latitude across the whole world map. */
export function bandRect(from, to) {
  const [, y1] = project('world', to, 0), [, y2] = project('world', from, 0)
  return { x: -1000, y: Math.min(y1, y2), width: 3000, height: Math.abs(y2 - y1) }
}

/** Points along each range every `step` degrees: where the little peaks stand. */
export function rangePoints(step = 1.4) {
  const out = []
  for (const [name, line] of RANGES) {
    for (let k = 0; k < line.length - 1; k++) {
      const [a, b] = [line[k], line[k + 1]]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / step))
      for (let q = 0; q < n; q++) { const t = q / n; out.push({ range: name, lng: a[0] + (b[0] - a[0]) * t, lat: a[1] + (b[1] - a[1]) * t, big: q % 3 === 0 }) }
    }
    const last = line[line.length - 1]
    out.push({ range: name, lng: last[0], lat: last[1], big: false })
  }
  return out
}
