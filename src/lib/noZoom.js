// iOS Safari ignores user-scalable=no for pinch, so stop its gesture events.
export function blockPageZoom(doc = document) {
  const stop = (e) => e.preventDefault()
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(name, stop, { passive: false })
}
