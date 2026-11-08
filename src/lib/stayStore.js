// ============================================
// stayStore.js -- what this phone remembers for the recap, and the saves waiting to be sent
// ============================================
// Device storage only, no imports from the hooks (so signing out can clear it
// without a tangle). See src/lib/stay.js for what is kept and why: the town and
// the first and last day of a stay away, for a week; and places that couldn't be
// saved yet, until they can.

const STAYS = 'teamhicks.stays'
const OUTBOX = 'teamhicks.outbox'
export const STAY_EVENT = 'teamhicks:stay'

const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : [] } catch { return [] } }
const write = (k, v) => { try { if (v && v.length) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k) } catch { /* private window: kept for now */ } try { window.dispatchEvent(new Event(STAY_EVENT)) } catch { /* not in a browser */ } }

export const readStays = () => read(STAYS)
export const writeStays = (v) => write(STAYS, v)
export const readOutbox = () => read(OUTBOX)
export const writeOutbox = (v) => write(OUTBOX, v)

/** Signing out, or switching "Notice where I am" off, forgets the recap's stays. */
export function clearStays() { try { localStorage.removeItem(STAYS) } catch { /* nothing kept */ } }
/** Signing out forgets places waiting to be sent too (they were someone's, on this phone). */
export function clearOutbox() { try { localStorage.removeItem(OUTBOX) } catch { /* nothing kept */ } }
