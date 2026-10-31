// ============================================
// router.js -- every screen has an address, and Back goes back
// ============================================
// /home, /world, /calendar, /kitchen, /us (and /lifelist, /jams, /academy), and below each the thing open
// on it (/world/school/soar). Filters, sorts and layouts stay out of the
// address. Each in-app step stores its depth in history.state, so an in-app
// Back walks the same history as the browser's Back and the phone's gesture,
// and only falls back to a parent when the screen was opened directly.

import { useEffect, useState } from 'react'

export const PLACES = ['home', 'world', 'calendar', 'kitchen', 'us', 'lifelist', 'jams', 'academy']
// The tab bar's five: Home, Calendar, Kitchen, World and Us. Life List, Jams and the
// academy are reached from Us, and light its tab while they're open.
export const UNDER_US = ['us', 'lifelist', 'jams', 'academy']
// Reached from Settings (and the desktop rail), not the tab bar.
export const CONSOLES = ['settings', 'setup', 'reports']

export function parsePath(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const known = PLACES.includes(parts[0]) || CONSOLES.includes(parts[0])
  return { place: known ? parts[0] : 'home', rest: known ? parts.slice(1) : [] }
}

function depth() {
  return (window.history.state && window.history.state.depth) || 0
}

export function navigate(to, { replace = false } = {}) {
  if (to === window.location.pathname) return
  const state = { depth: replace ? depth() : depth() + 1 }
  if (replace) window.history.replaceState(state, '', to)
  else window.history.pushState(state, '', to)
  window.dispatchEvent(new Event('hicks:navigate'))
  window.scrollTo(0, 0)
}

/** Back through history when there is in-app history; otherwise to `fallback`. */
export function goBack(fallback = '/') {
  if (depth() > 0) window.history.back()
  else navigate(fallback, { replace: true })
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const on = () => setPath(window.location.pathname)
    window.addEventListener('popstate', on)
    window.addEventListener('hicks:navigate', on)
    return () => {
      window.removeEventListener('popstate', on)
      window.removeEventListener('hicks:navigate', on)
    }
  }, [])
  return path
}
