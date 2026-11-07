// What this device has already shown (a challenge's start, a streak's end, a hello), so each plays once.
// Kept on the device, like the glow's "seen today": a convenience, never the family's data.
const KEY = 'teamhicks.lists.seen'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }
export const seen = (k) => Boolean(read()[k])
export function markSeen(k) {
  try {
    const s = read(); s[k] = 1
    const keys = Object.keys(s)
    for (const old of keys.slice(0, Math.max(0, keys.length - 300))) delete s[old]
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* a private window: shown again next time */ }
}
