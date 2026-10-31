// ============================================
// hebrew.js -- Jewish holy days, from the fixed arithmetic of the Hebrew
// calendar (Dershowitz and Reingold, Calendrical Calculations). Exact, with
// no table to keep up: tests/observances.test.mjs checks known years.
// ============================================

const HEBREW_EPOCH = -1373427 // R.D. of 1 Tishri, A.M. 1
const RD_1970 = 719163

function elapsedDays(h) {
  const months = Math.floor((235 * h - 234) / 19)
  const partsElapsed = 12084 + 13753 * months
  const days = 29 * months + Math.floor(partsElapsed / 25920)
  return (3 * (days + 1)) % 7 < 3 ? days + 1 : days
}
function lengthCorrection(h) {
  const ny0 = elapsedDays(h - 1), ny1 = elapsedDays(h), ny2 = elapsedDays(h + 1)
  if (ny2 - ny1 === 356) return 2
  if (ny1 - ny0 === 382) return 1
  return 0
}
function newYearRd(h) { return HEBREW_EPOCH + elapsedDays(h) + lengthCorrection(h) }
function rdToDs(rd) { return new Date((rd - RD_1970) * 864e5).toISOString().slice(0, 10) }

/** The first full day of each holy day falling in Gregorian year `y` (each begins at sundown the evening before). */
export function jewishHolyDays(y) {
  const h = y + 3761 // the year that begins this autumn
  const rh = newYearRd(h), next = newYearRd(h + 1), len = next - rh
  const cheshvan = len % 10 === 5 ? 30 : 29
  return {
    passover: rdToDs(rh - 163), // 15 Nisan of the spring before
    roshHashanah: rdToDs(rh),
    yomKippur: rdToDs(rh + 9),
    sukkot: rdToDs(rh + 14),
    hanukkah: rdToDs(rh + 30 + cheshvan + 24), // 25 Kislev
    hebrewYear: h,
  }
}
