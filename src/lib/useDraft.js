import { useEffect, useState } from 'react'

// Half-done typing survives the phone closing the app: kept on this device
// under one key until it's saved or cancelled (CLAUDE.md, "Touch, screens
// and settings").
const PREFIX = 'teamhicks.draft.'

/** Keep a draft on the device while it differs from the blank form; a form nobody has typed in leaves nothing behind. */
export function persistDraft(storage, key, value, initial) {
  if (JSON.stringify(value) === JSON.stringify(initial)) storage.removeItem(PREFIX + key)
  else storage.setItem(PREFIX + key, JSON.stringify(value))
}

/**
 * [value, setValue, clear]: like useState, but kept on the device until
 * cleared. `clear` forgets it on the device and puts the form back to blank
 * (it used to forget only the device's copy, so a saved form stayed filled
 * in and a second tap saved it again).
 */
export function useDraft(key, initial) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(PREFIX + key); return v ? { ...initial, ...JSON.parse(v) } : initial } catch { return initial }
  })
  useEffect(() => {
    try { persistDraft(localStorage, key, value, initial) } catch { /* private window: kept for now */ }
  }, [key, value]) // eslint-disable-line react-hooks/exhaustive-deps -- `initial` is the blank form, compared whenever the value changes
  const clear = () => { try { localStorage.removeItem(PREFIX + key) } catch { /* nothing kept */ } setValue(initial) }
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
