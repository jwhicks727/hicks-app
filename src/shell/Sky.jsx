import { useEffect } from 'react'
import SunCalc from 'suncalc'
import { HOME_TOWN, SKIES, phaseOf, skyGradient } from '../lib/sky.js'
import { useNow } from '../lib/useNow.js'
import { seasonFor, seasonByKey } from '../lib/seasons.js'
import { usePrefs, useSeasonTry } from '../lib/prefs.js'
import { todayAt } from '../lib/cal/dates.js'

/** The sky of the hour behind everything, with lamplight glowing up from below. */
export default function Sky() {
  const now = useNow()
  const key = phaseOf(now, SunCalc.getTimes(now, HOME_TOWN.lat, HOME_TOWN.lng))
  const sky = SKIES[key]
  const [prefs] = usePrefs()
  const [tryKey] = useSeasonTry()
  const season = prefs.seasonal === false ? null : (tryKey && seasonByKey(tryKey)) || seasonFor(todayAt(HOME_TOWN.tz, now))
  useEffect(() => {
    document.body.classList.toggle('sky-dark', sky.dark)
    document.body.style.backgroundColor = sky.g[sky.g.length - 1]
  }, [sky])
  useEffect(() => { document.documentElement.dataset.season = season ? season.key : '' }, [season && season.key]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="sky-bg" aria-hidden="true" style={{ background: skyGradient(key) }} />
      {season && (
        <div className="season-wash" aria-hidden="true" style={{ '--sa': season.field[0], '--sb': season.field[1], '--sc': season.field[2] }}>
          {season.art && <div className="season-art" style={{ backgroundImage: `url(${season.art})` }} />}
        </div>
      )}
    </>
  )
}
