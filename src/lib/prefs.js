import { useEffect, useState } from 'react'

// Settings kept on this device only: they're conveniences, never the
// family's data. Text size, motion, light or dark, which calendar kinds
// show, whose days.
const KEY = 'teamhicks.prefs'
const EVENT = 'teamhicks:prefs'

export function readPrefs() { try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} } }

// Light or dark: chosen, or the device's own (followed as it changes, at
// sunset on a phone set to Automatic). index.html sets it before the first
// paint the same way, so the app never flashes the wrong one.
const darkDevice = () => Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
export const themeOf = (p = readPrefs()) => (p.theme === 'dark' || p.theme === 'light' ? p.theme : darkDevice() ? 'dark' : 'light')
let following = false

export function applyPrefs(p = readPrefs()) {
  document.documentElement.dataset.textSize = p.textSize || 'normal'
  document.documentElement.dataset.motion = p.motion || 'device'
  document.documentElement.dataset.theme = themeOf(p)
  if (!following && window.matchMedia) {
    following = true
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyPrefs())
  }
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

// Trying Thanksgiving: "Next painting" moves Home on by one block of days (src/lib/harvest.js), until the app closes
const SHIFT = 'teamhicks.harvest-shift'
export function readHarvestShift() { try { return Number(sessionStorage.getItem(SHIFT)) || 0 } catch { return 0 } }
/** [days, set]: how many days ahead Thanksgiving's painting is being tried (0 on a real day). */
export function useHarvestShift() {
  const [n, setN] = useState(readHarvestShift)
  useEffect(() => {
    const on = () => setN(readHarvestShift())
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  const set = (v) => {
    try { if (v) sessionStorage.setItem(SHIFT, String(v)); else sessionStorage.removeItem(SHIFT) } catch { /* fine */ }
    setN(v)
    window.dispatchEvent(new Event(EVENT))
  }
  return [n, set]
}
