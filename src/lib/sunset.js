// ============================================
// sunset.js -- will tonight's sunset be a good one?
// ============================================
// Read from the forecast's clouds at the hour of sunset, the way sky
// watchers do: high and middle clouds catch the colour, low cloud on the
// horizon blocks the light from reaching them, and a bare sky gives a
// clean gold with little drama. A guess from a forecast, said as one.

/** { grade: 'glorious' | 'good' | 'clear' | 'hidden', words } from clouds at sunset (percent). */
export function sunsetOdds(clouds) {
  if (!clouds || clouds.low == null) return null
  const low = clouds.low, up = Math.max(clouds.mid ?? 0, clouds.high ?? 0)
  if (low >= 70) return { grade: 'hidden', words: 'Low cloud on the horizon is likely to hide it.' }
  if (up >= 25 && up <= 75 && low < 35) return { grade: 'glorious', words: 'High clouds to catch the colour, and a clear horizon to let the light under them: one worth stepping outside for.' }
  if (up > 75 && low < 35) return { grade: 'good', words: 'A high, full deck of cloud: if the light gets under its edge, it can glow all over.' }
  if (up >= 10 && low < 50) return { grade: 'good', words: 'A few clouds to catch some colour.' }
  return { grade: 'clear', words: 'A clear sky: a clean gold, then a long pink afterglow.' }
}
/** The forecast hour nearest sunset (hours are { time: 'YYYY-MM-DDTHH:MM', clouds }). */
export function hourAtSunset(hours, sunsetIso) {
  if (!hours || !hours.length || !sunsetIso) return null
  const target = Date.parse(sunsetIso)
  let best = null, gap = Infinity
  for (const h of hours) { const g = Math.abs(Date.parse(h.time + ':00Z') - target); if (h.clouds && g < gap) { gap = g; best = h } }
  return gap <= 90 * 60e3 ? best : null
}
