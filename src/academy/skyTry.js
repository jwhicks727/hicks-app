import { useEffect, useState } from 'react'

// Trying a sky on in the academy: a time of day, a weather, a wind, for this visit only. It is never kept past
// the app closing, so the school can't be left in a pretend storm by mistake, and the screens say it's pretend
// (CLAUDE.md: no invented data; the real sky is home's own).
const KEY = 'teamhicks.academy.sky-try', EVENT = 'teamhicks:sky-try'

export function readSkyTry() {
  try { const v = JSON.parse(sessionStorage.getItem(KEY)); return v && (v.time || v.weather || v.wind) ? v : null } catch { return null }
}

/** [the pretend sky or null, set]: set(null) goes back to the real one. Shared by the campus and every room. */
export function useSkyTry() {
  const [value, setValue] = useState(readSkyTry)
  useEffect(() => {
    const on = () => setValue(readSkyTry())
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  const set = (next) => {
    const v = next && (next.time || next.weather || next.wind) ? { time: next.time || undefined, weather: next.weather || undefined, wind: next.wind || undefined } : null
    try { if (v) sessionStorage.setItem(KEY, JSON.stringify(v)); else sessionStorage.removeItem(KEY) } catch { /* a private window: it lasts until the screen changes */ }
    setValue(v)
    window.dispatchEvent(new Event(EVENT))
  }
  return [value, set]
}
