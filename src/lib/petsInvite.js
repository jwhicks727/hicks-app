// ============================================
// petsInvite.js -- one of the cats peeks up on Home to say Pets is new
// ============================================
// Pets is new (docs/DECISIONS-LOG.md, 2026-11-05), so one of Anna's cats peeks up
// over the tab bar on Home (src/places/pets/PetsInvite.jsx) and says so. Rare, like
// every shine: once a day at most, on the first few days Home is opened on a device,
// and never again once Pets has been opened there or the invitation is waved away.
// Kept on the device: it's a nudge, not the family's data. Pure, so tests run it in Node.

const KEY = 'teamhicks.pets.invite'
/** Set the first time Pets is opened on a device (its launch plays then). Opening Pets answers the invitation too. */
export const PETS_OPENED = 'teamhicks.pets.launched'
/** On how many days, at most, the cat asks. */
export const MAX_DAYS = 5

export const CATS = ['kona', 'portia', 'goldie']
export const CAT_NAMES = { kona: 'Kona', portia: 'Portia', goldie: 'Goldie' }

/** What this device remembers: the days the cat came up, and whether it was answered. */
export function readInvite(storage) {
  try {
    const v = JSON.parse(storage.getItem(KEY))
    if (v && Array.isArray(v.days)) return { days: v.days.filter((d) => typeof d === 'string'), done: v.done === true }
  } catch { /* nothing kept, or unreadable: start again */ }
  return { days: [], done: false }
}

export function petsOpened(storage) {
  try { return storage.getItem(PETS_OPENED) === '1' } catch { return false }
}

/** Whether the cat comes up today: Pets not yet opened here, not waved away, not up yet today, and not past its few days. */
export const inviteDue = (state, today, opened) => !opened && !state.done && !state.days.includes(today) && state.days.length < MAX_DAYS

function write(storage, state) {
  try { storage.setItem(KEY, JSON.stringify(state)) } catch { /* a private window: it may ask again, and that's all */ }
}

/** Remember that the cat came up today. */
export function markShown(storage, today) {
  const s = readInvite(storage)
  if (!s.days.includes(today)) write(storage, { ...s, days: [...s.days, today] })
}

/** The invitation is answered (opened, or waved away): the cat doesn't come again. */
export function markDone(storage) {
  write(storage, { ...readInvite(storage), done: true })
}

/** Which cat comes up: the three take turns, one a day, by the calendar date ('YYYY-MM-DD'). */
export function catFor(today) {
  const [y, m, d] = today.split('-').map(Number)
  const n = Math.round(Date.UTC(y, m - 1, d) / 864e5)
  return CATS[((n % 3) + 3) % 3]
}
