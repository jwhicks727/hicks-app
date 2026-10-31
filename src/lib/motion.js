// The device's Reduce Motion setting. Animations play for everyone else;
// for anyone who asked for less motion, movement becomes a gentle fade or stops.
export function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
