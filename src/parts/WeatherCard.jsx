import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { useWeather } from '../lib/useWeather.js'
import WeatherIcon from './WeatherIcon.jsx'
import SchoolsBeside from './SchoolsBeside.jsx'
import { WEEKDAYS } from '../lib/cal/dates.js'

const SEV = { 3: '#8A1F11', 2: '#B3401A', 1: '#C98A12', 0: '#6E5B4B' }
const hm = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', minute: '2-digit' })

function Alerts({ alerts }) {
  if (!alerts.length) return null
  return (
    <ul className="wx-alerts">
      {alerts.map((a) => (
        <li key={a.event} style={{ '--sev': SEV[a.level] }}>
          <details>
            <summary><b>{a.event}</b>{a.ends && <span> · until {hm.format(new Date(a.ends))}</span>}</summary>
            {a.headline && <p>{a.headline}</p>}
            {a.instruction && <p className="muted">{a.instruction}</p>}
          </details>
        </li>
      ))}
    </ul>
  )
}

export const Credit = () => <p className="wx-credit">Forecast by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · alerts from the <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">National Weather Service</a></p>

/** The next twelve hours, a strip to scroll. */
export function HoursList({ hours }) {
  return (
    <ol className="wx-hours" aria-label="The next twelve hours">
      {hours.map((h) => (
        <li key={h.time}>
          <span className="wx-h">{h.label}</span>
          <WeatherIcon pic={h.pic} size={26} label={h.words} />
          <b>{h.temp}°</b>
          <span className="wx-rain">{h.rain >= 20 ? `${h.rain}%` : ' '}</span>
        </li>
      ))}
    </ol>
  )
}

/** The week ahead, each day's range against the whole week's. */
export function WeekList({ days }) {
  const lo = Math.min(...days.map((d) => d.low)), hi = Math.max(...days.map((d) => d.high)), span = Math.max(1, hi - lo)
  return (
    <ol className="wx-week">
      {days.map((d, i) => (
        <li key={d.date}>
          <span className="wx-day">{i === 0 ? 'Today' : WEEKDAYS[new Date(d.date + 'T12:00:00Z').getUTCDay()].slice(0, 3)}</span>
          <WeatherIcon pic={d.pic} size={28} label={d.words} />
          <span className="wx-lo">{d.low}°</span>
          <span className="wx-bar" aria-hidden="true"><i style={{ left: `${((d.low - lo) / span) * 100}%`, right: `${((hi - d.high) / span) * 100}%` }} /></span>
          <span className="wx-hi">{d.high}°</span>
          <span className="wx-note">{[d.rain >= 20 && `${d.rain}% rain`, d.gusts >= 25 && `gusts ${d.gusts}`].filter(Boolean).join(' · ')}</span>
        </li>
      ))}
    </ol>
  )
}

/** The weather at home now, the schools beside it, and the next twelve hours. */
export function WeatherNow({ className = 'span-3', more = true, schools = true }) {
  const { forecast: f, alerts, error } = useWeather()
  return (
    <Card tint="#4A7FD6" label="Weather at home" glyph="weather" className={className + ' wx-card'}>
      {!f && !error && <p className="muted">Looking at the sky…</p>}
      {!f && error && <p className="muted">{error}</p>}
      {f && (
        <>
          <div className="wx-now">
            <WeatherIcon pic={f.now.pic} size={64} label={f.now.words} />
            <div>
              <b className="wx-temp">{f.now.temp}°</b>
              <p><b>{f.now.words}</b>{f.today && <> · high {f.today.high}°, low {f.today.low}°</>}</p>
              <p className="muted">Feels like {f.now.feels}° · humidity {f.now.humidity}%</p>
            </div>
          </div>
          <p>{f.now.wind.line}.{f.now.wind.santaAna && <b> Santa Ana winds: dry and gusty. Hold on to the patio umbrella.</b>}</p>
          <Alerts alerts={alerts} />
          {schools && <SchoolsBeside homeTemp={f.now.temp} />}
          <HoursList hours={f.hours} />
          {more && <Link className="btn ghost" to="/world">The week ›</Link>}
          <Credit />
        </>
      )}
    </Card>
  )
}

/** The week ahead, each day's range against the whole week's. */
export function WeatherWeek({ className = 'span-3' }) {
  const { forecast: f, error } = useWeather()
  if (!f) return <Card tint="#3BA3A8" label="The week" glyph="weather" className={className}><p className="muted">{error || 'Looking ahead…'}</p></Card>
  return (
    <Card tint="#3BA3A8" label="The week" glyph="weather" className={className}>
      <WeekList days={f.days} />
      <Credit />
    </Card>
  )
}
