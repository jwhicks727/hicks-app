// ============================================
// islamic.js -- Ramadan and the two Eids, from the arithmetic Islamic
// calendar. The real days begin with the sighting of the new moon, so these
// are expected dates: shown as "expected", and often a day off.
// ============================================

const ISLAMIC_EPOCH = 227015 // R.D. of 1 Muharram, A.H. 1 (July 16, 622)
const RD_1970 = 719163
function rd(year, month, day) {
  return day + 29 * (month - 1) + Math.ceil((month - 1) / 2) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + ISLAMIC_EPOCH - 1
}
const toDs = (n) => new Date((n - RD_1970) * 864e5).toISOString().slice(0, 10)

/** Each expected day in Gregorian year `y`: [{ key, date }]. A year can hold one or two of each. */
export function islamicDays(y) {
  const out = []
  const first = Math.floor((y - 622) * 33 / 32)
  for (let h = first - 1; h <= first + 2; h++) {
    for (const [key, m, d] of [['ramadan', 9, 1], ['eidAlFitr', 10, 1], ['eidAlAdha', 12, 10]]) {
      const date = toDs(rd(h, m, d))
      if (date.startsWith(String(y))) out.push({ key, date })
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}
