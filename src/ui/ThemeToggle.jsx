import { useEffect, useState } from 'react'
import { usePrefs, themeOf } from '../lib/prefs.js'

/**
 * Light or dark, in one tap: a sun in the light (tap for dark), a moon in the
 * dark (tap for light). The choice sticks on this device; Settings still
 * offers "the device's own", which follows the phone at sunset.
 */
export default function ThemeToggle({ className = '' }) {
  const [prefs, update] = usePrefs()
  const [theme, setTheme] = useState(() => themeOf(prefs))
  // The device's own can change under us (sunset on Automatic)
  useEffect(() => {
    setTheme(themeOf(prefs))
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setTheme(themeOf())
    mq?.addEventListener?.('change', on)
    return () => mq?.removeEventListener?.('change', on)
  }, [prefs])
  const dark = theme === 'dark'
  return (
    <button type="button" className={'icon-btn theme-btn ' + className} onClick={() => update({ theme: dark ? 'light' : 'dark' })}
      aria-label={dark ? 'Switch to light' : 'Switch to dark'} title={dark ? 'Switch to light' : 'Switch to dark'}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {dark
          ? <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
          : <><circle cx="12" cy="12" r="3.6" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></>}
      </svg>
    </button>
  )
}
