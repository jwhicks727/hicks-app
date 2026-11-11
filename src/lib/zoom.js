// The arithmetic of the close-up's pinch and pan (src/ui/ZoomView.jsx), kept out of React so npm test can run it.
export const MAX_ZOOM = 6

/** Keep a zoom between whole (1) and MAX_ZOOM. */
export const clampZoom = (s) => Math.min(MAX_ZOOM, Math.max(1, s))

/** Keep the picture from being dragged off the screen: when it is larger than the stage it may move only as far as
 *  its edge reaches the stage's; when smaller, it stays centred. */
export function clampPan(t, scale, img, stage) {
  const mx = Math.max(0, (img.w * scale - stage.w) / 2), my = Math.max(0, (img.h * scale - stage.h) / 2)
  return { x: Math.min(mx, Math.max(-mx, t.x)), y: Math.min(my, Math.max(-my, t.y)) }
}

/** The new pan that keeps the picture's point under `at` (relative to the stage's centre) still while the scale
 *  changes from `from` to `to`. */
export function panAround(t, from, to, at) {
  const k = to / from
  return { x: at.x - (at.x - t.x) * k, y: at.y - (at.y - t.y) * k }
}

