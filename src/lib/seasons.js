// ============================================
// seasons.js -- the year's colours: which seasonal palette applies on a date
// ============================================
// After SOAR's seasonal schedule (its src/seasons.js): windows of dates, a
// specific holiday winning over the broad season around it, and palettes of
// an accent and three hues for a soft wash. Written fresh for the family:
// the Church's seasons move with Easter and are worked out each year, and
// Christmas lasts until the Baptism of the Lord. The wash sits lightly over
// the sunset sky; each season can carry one of Laurie's paintings
// (`art`, docs/ART-CAPTURE.md). Pure: tests/seasons.test.mjs.

import { keyDates } from './cal/liturgy.js'
import { nthWeekday, addDays, parts } from './cal/dates.js'

export const SEASON_ORDER = ['christmas', 'advent', 'easter', 'lent', 'muertos', 'halloween', 'thanksgiving', 'valentine', 'july4', 'back-to-school', 'summer', 'spring', 'fall', 'winter']

export const SEASONS = {
  christmas: { label: 'Christmas', accent: '#C8323A', field: ['#C8323A', '#1E6B3E', '#E8C361'] },
  advent: { label: 'Advent', accent: '#6B4A8E', field: ['#6B4A8E', '#D98AA6', '#E8C361'] },
  easter: { label: 'Easter', accent: '#D9A520', field: ['#F6E3A1', '#9BD08A', '#F2B8CB'] },
  lent: { label: 'Lent', accent: '#6B4A8E', field: ['#6B4A8E', '#9C8FA8', '#C9B79C'] },        // deliberately the quietest
  muertos: { label: 'Día de los Muertos', accent: '#F28C1E', field: ['#F28C1E', '#C2185B', '#7A3FA0'] },
  halloween: { label: 'Halloween', accent: '#FF7A18', field: ['#FF7A18', '#8A4DFF', '#B6FF3A'] },
  thanksgiving: { label: 'Thanksgiving', accent: '#D98324', field: ['#D98324', '#9E3B2F', '#E9B44C'] },
  valentine: { label: 'Valentine’s', accent: '#E0506F', field: ['#FF8FA3', '#E0506F', '#FFD1DC'] },
  july4: { label: 'The Fourth', accent: '#C8323A', field: ['#C8323A', '#F4F1E8', '#3C5AA6'] },
  'back-to-school': { label: 'Back to school', accent: '#E2483D', field: ['#E2483D', '#F4C542', '#2C4A40'] },
  summer: { label: 'Summer', accent: '#0AA6C2', field: ['#0AA6C2', '#14C8B0', '#FFB22E'] },
  spring: { label: 'Spring', accent: '#F06FA0', field: ['#F06FA0', '#5FB85A', '#F3C33B'] },
  fall: { label: 'Fall', accent: '#E8852B', field: ['#E8852B', '#C4622A', '#F3B13A'] },
  winter: { label: 'Winter', accent: '#69B7FF', field: ['#69B7FF', '#B9D9F2', '#294263'] },
}

// Laurie's painting for a season, once scanned: '/seasons/<key>.jpg'. Empty until then.
export const SEASON_ART = {}

/** Each season's windows in year `y`: [{ from, to }] as 'YYYY-MM-DD', inclusive. */
export function windowsOf(key, y) {
  const k = keyDates(y)
  const d = (m, dd) => `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  switch (key) {
    case 'christmas': return [{ from: d(12, 24), to: d(12, 31) }, { from: d(1, 1), to: k.baptism }]
    case 'advent': return [{ from: k.advent1, to: d(12, 23) }]
    case 'easter': return [{ from: k.easter, to: k.pentecost }]
    case 'lent': return [{ from: k.ashWednesday, to: k.holySaturday }]
    case 'muertos': return [{ from: d(11, 1), to: d(11, 2) }]
    case 'halloween': return [{ from: d(10, 15), to: d(10, 31) }]
    case 'thanksgiving': { const t = nthWeekday(y, 11, 4, 4); return [{ from: addDays(t, -4), to: addDays(t, 3) }] }
    case 'valentine': return [{ from: d(2, 7), to: d(2, 14) }]
    case 'july4': return [{ from: d(7, 1), to: d(7, 5) }]
    case 'back-to-school': return [{ from: d(8, 1), to: d(8, 31) }]
    case 'summer': return [{ from: d(6, 15), to: d(7, 31) }]
    case 'spring': return [{ from: d(3, 20), to: d(6, 14) }]
    case 'fall': return [{ from: d(9, 1), to: d(11, 30) }]
    case 'winter': return [{ from: d(12, 1), to: d(12, 31) }, { from: d(1, 1), to: d(3, 19) }]
    default: return []
  }
}

/** The season for a 'YYYY-MM-DD' home date: { key, label, accent, field, art } (never null: winter, spring, summer or fall at the least). */
export function seasonFor(date) {
  const y = parts(date)[0]
  const key = SEASON_ORDER.find((k) => windowsOf(k, y).some((w) => date >= w.from && date <= w.to)) || 'winter'
  return { key, ...SEASONS[key], art: SEASON_ART[key] || null }
}
