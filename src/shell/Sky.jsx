import { useEffect } from 'react'
import SunCalc from 'suncalc'
import { HOME_TOWN, SKIES, phaseOf, skyGradient } from '../lib/sky.js'
import { useNow } from '../lib/useNow.js'

/** The sky of the hour behind everything, with lamplight glowing up from below. */
export default function Sky() {
  const now = useNow()
  const key = phaseOf(now, SunCalc.getTimes(now, HOME_TOWN.lat, HOME_TOWN.lng))
  const sky = SKIES[key]
  useEffect(() => {
    document.body.classList.toggle('sky-dark', sky.dark)
    document.body.style.backgroundColor = sky.g[sky.g.length - 1]
  }, [sky])
  return <div className="sky-bg" aria-hidden="true" style={{ background: skyGradient(key) }} />
}
