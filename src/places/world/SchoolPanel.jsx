import { useMemo } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Link } from '../../shell/Link.jsx'
import { useNow } from '../../lib/useNow.js'
import { useWeather, usePlaceForecast, useAir, useAlertsAt } from '../../lib/useWeather.js'
import { HOME_TOWN } from '../../lib/sky.js'
import { milesBetween } from '../../lib/places.js'
import { todayAt } from '../../lib/cal/dates.js'
import { schoolDay, recessHours, worstFlag } from '../../lib/recess.js'
import { inchWords } from '../../lib/weather.js'
import { tempColour } from '../../lib/tempColour.js'
import WeatherIcon from '../../parts/WeatherIcon.jsx'
import { Alerts } from '../../parts/WeatherCard.jsx'
import { RecessChip } from './DayPage.jsx'

// A school's page, beyond its picture and its own station: whether the
// children can play outside today (hour by hour across the school day),
// the Weather Service's alerts at the school, and the last twenty-four hours
// against home from the forecast model. Guesses from the forecast and the
// air: the school decides.

const fmtH = (h) => (h === 12 ? 'Noon' : h < 12 ? `${h} AM` : `${h - 12} PM`)
const LEVEL = { go: 'Good to be out', care: 'Take care', inside: 'Better inside' }

export default function SchoolPanel({ place }) {
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const hour = +new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', hourCycle: 'h23' }).format(now)
  const { forecast: f } = usePlaceForecast(place)
  const { forecast: home } = useWeather()
  const { air } = useAir(place)
  const alerts = useAlertsAt(place)
  const day = schoolDay(today, hour)
  const hours = useMemo(() => (f ? recessHours(f.timeline, air ? air.hours : [], day) : []), [f, air, day])
  const worst = worstFlag(hours)
  const nowHour = f && f.timeline[f.nowIndex]
  return (
    <>
      <Card className="span-3" tint={place.colour} label={day === today ? 'Recess today' : 'Recess next school day'} glyph="weather">
        {!f && <p className="muted">Looking at the sky there…</p>}
        {f && worst && <RecessChip flag={{ level: worst.level, reasons: worst.reasons }} aqi={null} who={day === today ? 'Today at school' : 'Next school day'} />}
        {air && <Link className="recess-air" to="/world/sky/air" style={{ '--c': air.band.colour }}>Air {air.now}, {air.band.name.toLowerCase()} ›</Link>}
        {hours.length > 0 && (
          <ol className="rc-hours" aria-label="Outside play hour by hour across the school day">
            {hours.map(({ hour: h, flag }) => (
              <li key={h.time} className={flag.level}>
                <Link to={`/world/day/${h.date}/${String(h.hour).padStart(2, '0')}`} aria-label={`${fmtH(h.hour)}: ${LEVEL[flag.level]}. ${flag.reasons.join(', ')}`}>
                  <span className="rc-h">{fmtH(h.hour)}</span><WeatherIcon pic={h.pic} size={22} /><b className="fig" style={{ color: tempColour(h.temp, true) }}>{Math.round(h.temp)}°</b>
                  <small className="fig">{h.rain ?? 0}%</small><small className="fig">{Math.round(h.wind ?? 0)} mph</small><i className="rc-dot" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        )}
        {nowHour && <p className="muted small">Right now: {nowHour.words.toLowerCase()}, {Math.round(nowHour.temp)}°, {nowHour.rain ?? 0}% chance of rain{nowHour.inches ? ` (${inchWords(nowHour.inches)})` : ''}, wind {Math.round(nowHour.wind ?? 0)} mph.</p>}
        <p className="muted small">A guess from the forecast and the air: heat, wind, rain, sun and smoke. The school decides.</p>
      </Card>
      {alerts.length > 0 && <Card className="span-3" tint="#B3401A" label="Weather alerts here" glyph="weather"><Alerts alerts={alerts} /></Card>}
      {f && home && milesBetween(HOME_TOWN, place) > 1 && <VsHome school={f.timeline} home={home.timeline} place={place} />}
    </>
  )
}

/** The last day at the school and at home from the forecast model, the two lines together. */
function VsHome({ school, home, place }) {
  const tail = (list) => { const i = Math.max(0, list.findIndex((h) => h.now)); return list.slice(Math.max(0, i - 24), i + 1) }
  const a = tail(school), b = tail(home)
  if (a.length < 6 || b.length < 6) return null
  const all = [...a, ...b].map((h) => h.temp), lo = Math.floor(Math.min(...all) - 1), hi = Math.ceil(Math.max(...all) + 1)
  const W = 320, H = 130, L = 28, R = 312, T = 10, B = 104
  const x = (i, n) => L + (i / Math.max(1, n - 1)) * (R - L), y = (t) => B - ((t - lo) / Math.max(1, hi - lo)) * (B - T)
  const line = (l) => l.map((h, i) => `${i ? 'L' : 'M'}${x(i, l.length).toFixed(1)} ${y(h.temp).toFixed(1)}`).join('')
  const diff = Math.round((a.reduce((s, h) => s + h.temp, 0) / a.length - b.reduce((s, h) => s + h.temp, 0) / b.length) * 10) / 10
  const rain = (l) => Math.round(l.reduce((s, h) => s + (h.inches || 0), 0) * 100) / 100
  const peak = (l) => Math.round(Math.max(...l.map((h) => h.gusts || 0)))
  return (
    <Card className="span-3" tint={place.colour} label="The last 24 hours, against home" glyph="weather">
      <svg viewBox={`0 0 ${W} ${H}`} className="yg-svg" role="img" aria-label="The last day's temperatures here and at home">
        {[lo, hi].map((t) => <g key={t}><line x1={L} x2={R} y1={y(t)} y2={y(t)} className="yg-grid" /><text x={L - 4} y={y(t) + 3} textAnchor="end" className="yg-lab">{t}°</text></g>)}
        <path d={line(b)} className="st-home" fill="none" /><path d={line(a)} fill="none" stroke={place.colour} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <text x={L} y="124" className="yg-lab">24 h ago</text><text x={R} y="124" textAnchor="end" className="yg-lab">now</text>
      </svg>
      <p className="muted small"><i className="rc-key" style={{ background: place.colour }} /> Here <i className="rc-key home" /> Home</p>
      <dl className="place-facts">
        <div><dt>Temperature</dt><dd>{Math.abs(diff) < 0.6 ? 'About the same as home' : `${Math.abs(diff)}° ${diff > 0 ? 'warmer' : 'cooler'} than home on average`}</dd></div>
        <div><dt>Rain</dt><dd className="fig">{rain(a) ? inchWords(rain(a)) : 'none'} here · {rain(b) ? inchWords(rain(b)) : 'none'} at home</dd></div>
        <div><dt>Strongest gust</dt><dd className="fig">{peak(a)} mph here · {peak(b)} at home</dd></div>
      </dl>
      <p className="muted small">The forecast model’s hourly figures at each place, not a thermometer. A school’s own station, when it’s set up, is the card beside this one.</p>
    </Card>
  )
}
