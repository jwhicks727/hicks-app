// ============================================
// zoom.js -- pinch zoom and pan for the campus and the rooms
// ============================================
// Pure, so tests run it in Node. A view is { s, x, y }: the scale (1 is the
// whole picture, fitted) and where the picture's top-left corner sits, in
// pixels, inside a frame of width w and height h. Origin is top-left.

export const MIN_ZOOM = 1, MAX_ZOOM = 4
export const FIT = { s: 1, x: 0, y: 0 }

/** Keep the scale in range and the picture covering its frame (never a gap at an edge). */
export function clampView(v, w, h) {
  const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.s))
  return { s, x: Math.min(0, Math.max(w - w * s, v.x)), y: Math.min(0, Math.max(h - h * s, v.y)) }
}

/** Scale by `factor` keeping the point (px, py) of the frame still under the fingers. */
export function zoomAt(v, factor, px, py, w, h) {
  const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.s * factor)), k = s / v.s
  return clampView({ s, x: px - (px - v.x) * k, y: py - (py - v.y) * k }, w, h)
}

/** Move the picture by (dx, dy) pixels. */
export const panBy = (v, dx, dy, w, h) => clampView({ ...v, x: v.x + dx, y: v.y + dy }, w, h)

/** The distance between two touches, and their middle. */
export const spread = (a, b) => ({ d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/** One step of a pinch: from the previous two touches to the current two, zoom by the change in spread and follow the middle. */
export function pinch(v, before, now, w, h) {
  if (!before.d || !now.d) return v
  const z = zoomAt(v, now.d / before.d, before.x, before.y, w, h)
  return panBy(z, now.x - before.x, now.y - before.y, w, h)
}
