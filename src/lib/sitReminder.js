// ============================================
// sitReminder.js -- the day's sit, waiting at the top of Home until it's done
// ============================================
// The first thing on Home each day, for whoever keeps a sit: an invitation to
// the morning's ten minutes (src/parts/Sit.jsx), there until the sit is done
// (finishing one in the app marks it, or "Done already" for one sat elsewhere)
// or skipped for the day. Kept on this device, like the sit's own length: it is
// a convenience, never the family's data. On by default for the parents; anyone
// can switch it off from the card or in Settings. Pure, so tests run it in Node.

const KEY = 'teamhicks.sit'

/** What this device remembers of today: { day: 'YYYY-MM-DD', state: 'sat' | 'skipped', minutes? }, or null. */
export function readSitDay(storage) {
  try { return JSON.parse(storage.getItem(KEY)) || null } catch { return null }
}

/** Today's sit: 'due' until it is 'sat' or 'skipped' (yesterday's answer doesn't count today). */
export const sitStateFor = (stored, today) => (stored && stored.day === today && (stored.state === 'sat' || stored.state === 'skipped') ? stored.state : 'due')

/** Remember today's sit as sat (with how long, when known) or skipped. */
export function markSitDay(storage, today, state, minutes) {
  try { storage.setItem(KEY, JSON.stringify({ day: today, state, ...(minutes ? { minutes } : {}) })) } catch { /* a private window: asked again next time */ }
}

/** Forget today's answer (an Undo). An older day's is left alone; it no longer counts anyway. */
export function clearSitDay(storage, today) {
  try { const s = readSitDay(storage); if (s && s.day === today) storage.removeItem(KEY) } catch { /* nothing kept */ }
}

/** Whether this device shows the reminder: as Settings says once chosen; until then, for a parent, unless the mindful moment is off. */
export function reminderOn(prefs, member) {
  if (prefs.sitReminder === true || prefs.sitReminder === false) return prefs.sitReminder
  return prefs.mindful !== false && Boolean(member && member.role === 'parent')
}

const WORDS = { 5: 'five', 10: 'ten', 15: 'fifteen', 20: 'twenty', 30: 'thirty', 45: 'forty-five', 60: 'sixty' }
const cap = (s) => s[0].toUpperCase() + s.slice(1)

/** The card's heading for the hour: the morning's, then whenever, then before bed. */
export function sitHeading(hour, minutes = 10) {
  const n = WORDS[minutes] || String(minutes)
  if (hour < 12) return `Your ${n} minutes this morning`
  if (hour < 18) return `${cap(n)} minutes, whenever you can`
  return `${cap(n)} minutes before bed`
}
