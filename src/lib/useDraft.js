import { useEffect, useState } from 'react'

// Half-done typing survives the phone closing the app: kept on this device
// under one key until it's saved or cancelled (CLAUDE.md, "Touch, screens
// and settings").
const PREFIX = 'teamhicks.draft.'

/** [value, setValue, clear]: like useState, but kept on the device until cleared. */
export function useDraft(key, initial) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(PREFIX + key); return v ? { ...initial, ...JSON.parse(v) } : initial } catch { return initial }
  })
  useEffect(() => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* private window: kept for now */ }
  }, [key, value])
  const clear = () => { try { localStorage.removeItem(PREFIX + key) } catch { /* nothing kept */ } }
  return [value, setValue, clear]
}

/** Was something left half-done under this key? */
export function hasDraft(key) {
  try { return Boolean(localStorage.getItem(PREFIX + key)) } catch { return false }
}

/** Every draft goes when someone signs out. */
export function clearDrafts() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)) } catch { /* nothing kept */ }
}
