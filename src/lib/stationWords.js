// ============================================
// stationWords.js -- our stations' readings, in words for the screen
// ============================================
// The readings themselves come from the `stations` Edge Function
// (supabase/functions/_shared/stations.js).

/** "2° warmer than home", "about the same as home", "3° cooler than home". */
export function besideHome(t, home) {
  if (t == null || home == null) return ''
  const d = Math.round(t - home)
  if (Math.abs(d) <= 1) return 'about the same as home'
  return `${Math.abs(d)}° ${d > 0 ? 'warmer' : 'cooler'} than home`
}

/** "just now", "12 min ago", "2 hr ago". */
export function readAgo(at, nowMs) {
  const m = Math.round((nowMs - at) / 60000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.round(m / 60)} hr ago`
}

/** The low and high of a day's series, for drawing them side by side. */
export function seriesRange(lists) {
  const all = lists.flat().map((p) => p.temp).filter((t) => t != null)
  return all.length ? [Math.floor(Math.min(...all)), Math.ceil(Math.max(...all))] : [0, 1]
}

/** The station on MesoWest (the University of Utah's view of the same readings). */
export const mesowestUrl = (stid) => `https://mesowest.utah.edu/cgi-bin/droman/meso_base_dyn.cgi?stn=${encodeURIComponent(stid)}`
