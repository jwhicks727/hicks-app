// Temperatures as colour, the same blue-to-red everywhere a graph draws them.
const STOPS = [[30, [74, 127, 214]], [50, [63, 156, 176]], [65, [95, 168, 90]], [78, [242, 193, 78]], [90, [224, 102, 47]], [105, [168, 40, 40]]]
/** A °F as a colour; `text` darkens the light yellow so it stays readable on paper. */
export function tempColour(t, text = false) {
  const x = Math.max(STOPS[0][0], Math.min(STOPS[STOPS.length - 1][0], t))
  let i = 0
  while (i < STOPS.length - 2 && x > STOPS[i + 1][0]) i++
  const [t0, c0] = STOPS[i], [t1, c1] = STOPS[i + 1], k = (x - t0) / (t1 - t0)
  const c = c0.map((v, j) => Math.round(v + (c1[j] - v) * k))
  const d = text ? 0.78 : 1
  return `rgb(${c.map((v) => Math.round(v * d)).join(',')})`
}
