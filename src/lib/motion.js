// The device's Reduce Motion setting. Animations play for everyone else;
// for anyone who asked for less motion, movement becomes a gentle fade or stops.
export function reducedMotion() {
  if (typeof window === 'undefined') return false
  if (document.documentElement.dataset.motion === 'less') return true // Settings, on this device
  return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}
