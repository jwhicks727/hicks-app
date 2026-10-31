import { useEffect, useState } from 'react'

// Settings kept on this device only: they're conveniences, never the
// family's data. Text size, motion, which calendar kinds show, whose days.
const KEY = 'teamhicks.prefs'
const EVENT = 'teamhicks:prefs'

export function readPrefs() { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }

export function applyPrefs(p = readPrefs()) {
  document.documentElement.dataset.textSize = p.textSize || 'normal'
  document.documentElement.dataset.motion = p.motion || 'device'
}

/** [prefs, update]: update merges and is shared by every screen that reads them. */
export function usePrefs() {
  const [prefs, setPrefs] = useState(readPrefs)
  useEffect(() => {
    const on = () => setPrefs(readPrefs())
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  const update = (patch) => {
    const next = { ...readPrefs(), ...patch }
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private window: applied for now */ }
    applyPrefs(next)
    setPrefs(next)
    window.dispatchEvent(new Event(EVENT))
  }
  return [prefs, update]
}

// Trying on another season's colours: for this visit only (it never sticks),
// so the app can't be left in October by mistake.
const TRY = 'teamhicks.season-try'
export function readSeasonTry() { try { return sessionStorage.getItem(TRY) || '' } catch { return '' } }
/** [key or '', set]: set('') goes back to the real season. */
export function useSeasonTry() {
  const [key, setKey] = useState(readSeasonTry)
  useEffect(() => {
    const on = () => setKey(readSeasonTry())
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  const set = (k) => {
    try { if (k) sessionStorage.setItem(TRY, k); else sessionStorage.removeItem(TRY) } catch { /* fine */ }
    setKey(k)
    window.dispatchEvent(new Event(EVENT))
  }
  return [key, set]
}
