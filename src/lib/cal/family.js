// ============================================
// family.js -- the family's own days, celebrated big
// ============================================
// The days themselves live only in the database (family_days), never here.
// This is how they read: "Turning 12", "24th anniversary", "11 years since
// November 1, 2015".

import { ds, parts, diffDays, ordinal, MONTHS } from './dates.js'

const MILESTONES = { 1: 'paper', 5: 'wood', 10: 'tin', 15: 'crystal', 20: 'china', 25: 'silver', 30: 'pearl', 35: 'coral', 40: 'ruby', 45: 'sapphire', 50: 'gold', 60: 'diamond' }
const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** The date a family day falls on in year `y` (February 29 on the 28th otherwise). */
export function occurrence(row, y) {
  const day = row.month === 2 && row.day === 29 && !isLeap(y) ? 28 : row.day
  return ds(y, row.month, day)
}

/** The words under a family day in year `y`. */
export function familyLine(row, y) {
  const years = row.year ? y - row.year : null
  if (row.kind === 'remember') return row.note || (years ? `${years} years` : 'Remembering')
  if (!years) return row.note || ''
  if (/birthday/i.test(row.title)) return `Turning ${years}`
  if (/anniversary/i.test(row.title)) return `${ordinal(years)} anniversary${MILESTONES[years] ? `: ${MILESTONES[years]}` : ''}`
  return `${years} ${years === 1 ? 'year' : 'years'} since ${MONTHS[row.month - 1]} ${row.day}, ${row.year}`
}

/** The family days on a date. */
export function familyOn(d, rows) {
  const [y] = parts(d)
  return (rows || []).filter((r) => occurrence(r, y) === d).map((r) => ({ ...r, line: familyLine(r, y) }))
}

/** The next `n` family days from `today`: [{ ...row, date, inDays, line }]. */
export function upcoming(today, rows, n = 7) {
  const [y] = parts(today)
  return (rows || []).map((r) => {
    let date = occurrence(r, y)
    if (date < today) date = occurrence(r, y + 1)
    return { ...r, date, inDays: diffDays(today, date), line: familyLine(r, parts(date)[0]) }
  }).sort((a, b) => a.inDays - b.inDays).slice(0, n)
}
