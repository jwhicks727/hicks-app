import { useEffect, useState } from 'react'
import SunCalc from 'suncalc'
import { HOME_TOWN, SKIES, phaseOf, skyGradient } from '../lib/sky.js'
import { useNow } from '../lib/useNow.js'
import { useHere } from '../lib/useHere.js'

/**
 * The sky of the hour behind everything, with lamplight glowing up from below.
 * On an installed iPhone the page draws under the status bar, so a strip of the
 * same sky is laid along the top and faded out below it: whatever has scrolled up
 * under the time and battery dissolves into the sky and they stay readable (as in
 * Apple Podcasts). It shows only once something has scrolled, so nothing at rest
 * is dimmed, and only where there is a safe area to cover.
 *
 * Inside the app (`follow`), the sky is the sky where the phone is, once its
 * owner has switched on "Notice where I am" and is away from home ground; the
 * sign-in screen's sky is always home's.
 */
export default function Sky({ follow = false }) {
  const now = useNow()
  const here = useHere({ follow })
  const at = here.point && here.tier && here.tier !== 'home' ? here.point : HOME_TOWN
  const key = phaseOf(now, SunCalc.getTimes(now, at.lat, at.lng))
  const sky = SKIES[key]
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    document.body.classList.toggle('sky-dark', sky.dark)
    document.body.style.backgroundColor = sky.g[sky.g.length - 1]
  }, [sky])
  return (
    <>
      <div className="sky-bg" aria-hidden="true" style={{ background: skyGradient(key) }} />
      <div className={'sky-top' + (scrolled ? ' on' : '')} aria-hidden="true" style={{ background: skyGradient(key), backgroundSize: '100% 100lvh', backgroundRepeat: 'no-repeat' }} />
    </>
  )
}
