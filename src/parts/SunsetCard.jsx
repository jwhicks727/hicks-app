import SunCalc from 'suncalc'
import { Card } from '../ui/Card.jsx'
import { useWeather } from '../lib/useWeather.js'
import { useNow } from '../lib/useNow.js'
import { HOME_TOWN } from '../lib/sky.js'
import { sunsetOdds, hourAtSunset } from '../lib/sunset.js'

const hm = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: '2-digit' })
const wall = (d) => new Intl.DateTimeFormat('sv-SE', { timeZone: HOME_TOWN.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d).replace(' ', 'T')
const GRADE = { glorious: 'Likely glorious', good: 'Some colour likely', clear: 'Clean and golden', hidden: 'Probably hidden' }

/** Afternoons on Home: tonight's sunset, and whether it's one to step outside for (a guess from the clouds forecast). */
export default function SunsetCard() {
  const now = useNow()
  const { forecast } = useWeather()
  const t = SunCalc.getTimes(now, HOME_TOWN.lat, HOME_TOWN.lng)
  const hour = +new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', hourCycle: 'h23' }).format(now)
  if (!forecast || hour < 12 || now > new Date(t.sunset.getTime() + 20 * 60e3)) return null
  const at = hourAtSunset(forecast.hours, wall(t.sunset) + ':00Z')
  const odds = at && sunsetOdds(at.clouds)
  if (!odds) return null
  return (
    <Card tint="#E07A3F" label="Tonight’s sunset" glyph="sunmoon" tag={hm.format(t.sunset)} className={'span-3 sunset-card ' + odds.grade}>
      <div className="sunset-band" aria-hidden="true" />
      <b className="sunset-grade">{GRADE[odds.grade]}</b>
      <p>{odds.words}</p>
      <p className="muted small">Golden hour from {hm.format(t.goldenHour)}. A guess from the clouds in the forecast, not a promise.</p>
    </Card>
  )
}
