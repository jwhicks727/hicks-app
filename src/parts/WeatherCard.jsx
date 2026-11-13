import './wxs.css'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import SunCalc from 'suncalc'
import { useWeather, useAir, useYearAgo } from '../lib/useWeather.js'
import { useNow } from '../lib/useNow.js'
import { HOME_TOWN } from '../lib/sky.js'
import { stargazing, rainbowChance, inchWords, sinceYesterday } from '../lib/weather.js'
import WeatherIcon from './WeatherIcon.jsx'
import SchoolsBeside from './SchoolsBeside.jsx'
import { HourStrip, DayStrip, RainWind, WindArrow } from './WxStrips.jsx'
import LivingSky from './LivingSky.jsx'
import { WEEKDAYS, homeInstant } from '../lib/cal/dates.js'

const SEV = { 3: '#8A1F11', 2: '#B3401A', 1: '#C98A12', 0: '#6E5B4B' }
const hm = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', minute: '2-digit' })

export function Alerts({ alerts }) {
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

export const Credit = ({ source = 'open-meteo' }) => (source === 'nws'
  ? <p className="wx-credit">Forecast and alerts from the <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">National Weather Service</a></p>
  : <p className="wx-credit">Forecast by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · alerts from the <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">National Weather Service</a></p>)

/** Says so when the forecast isn't Open-Meteo's live answer: the backup source, or an older copy kept on this phone. */
export function SourceNote({ forecast, stale }) {
  if (stale) {
    const mins = Math.max(1, Math.round((Date.now() - stale) / 60000))
    return <p className="wx-source muted" role="status">No forecast could be reached just now, so this is the last one we had, from {mins < 90 ? `${mins} minutes` : `${Math.round(mins / 60)} hours`} ago. It tries again every minute.</p>
  }
  if (forecast && forecast.source === 'nws') return <p className="wx-source muted" role="status">Open-Meteo isn’t answering, so this is the National Weather Service’s forecast: a week ahead, without UV, rain amounts or the days gone by.</p>
  return null
}

/** The next twelve hours at a place, a strip to scroll, each with its rain and wind. */
export function HoursList({ hours }) {
  return (
    <ol className="wx-hours" aria-label="The next twelve hours">
      {hours.map((h) => (
        <li key={h.time}>
          <span className="wx-h">{h.label}</span>
          <WeatherIcon pic={h.pic} size={26} label={h.words} />
          <b>{Math.round(h.temp)}°</b>
          <RainWind rain={h.rain} inches={h.inches} wind={h.wind} gusts={h.gusts} dir={h.dir} compact quiet />
        </li>
      ))}
    </ol>
  )
}

/** The week ahead, each day's range against the whole week's. */
export function WeekList({ days, linkDays = false }) {
  const lo = Math.min(...days.map((d) => d.low)), hi = Math.max(...days.map((d) => d.high)), span = Math.max(1, hi - lo)
  return (
    <ol className="wx-week">
      {days.map((d, i) => (
        <li key={d.date}>
          {linkDays && <Link className="wx-row-link" to={`/world/day/${d.date}`} aria-label={`The day in detail: ${d.date}`} />}
          <span className="wx-day">{i === 0 ? 'Today' : WEEKDAYS[new Date(d.date + 'T12:00:00Z').getUTCDay()].slice(0, 3)}</span>
          <WeatherIcon pic={d.pic} size={28} label={d.words} />
          <span className="wx-lo">{d.low}°</span>
          <span className="wx-bar" aria-hidden="true"><i style={{ left: `${((d.low - lo) / span) * 100}%`, right: `${((hi - d.high) / span) * 100}%` }} /></span>
          <span className="wx-hi">{d.high}°</span>
          <span className="wx-note">{[`${d.rain ?? 0}% rain`, inchWords(d.inches), d.wind != null && `wind to ${Math.round(d.wind)} mph`, d.gusts >= 25 && `gusts ${Math.round(d.gusts)}`].filter(Boolean).join(' · ')}</span>
        </li>
      ))}
    </ol>
  )
}

/** The weather at home now, the schools beside it, and the next twelve hours. `extra` is a line for where we are when out and about. */
export function WeatherNow({ className = 'span-3', more = true, schools = true, extra = null }) {
  const { forecast: f, alerts, error, stale } = useWeather()
  const now = useNow()
  const air = useAir()
  const sinceYest = f ? sinceYesterday(f.allDays) : null
  const ago = useYearAgo(new Intl.DateTimeFormat('en-CA', { timeZone: HOME_TOWN.tz }).format(now))
  const treats = f ? treatsFor(f, now, air.air) : []
  return (
    <Card tint="#4A7FD6" label="Weather at home" glyph="weather" className={className + ' wx-card'}>
      {f && <LivingSky pic={f.now.pic} />}
      {!f && !error && <p className="muted">Looking at the sky…</p>}
      {!f && error && <p className="muted">{error}</p>}
      {f && (
        <>
          <Link className="wx-now wx-now-link" to={`/world/day/${f.today ? f.today.date : ''}/${String(f.timeline[f.nowIndex] ? f.timeline[f.nowIndex].hour : 0).padStart(2, '0')}`} aria-label="Today in detail">
            <WeatherIcon pic={f.now.pic} size={64} label={f.now.words} />
            <div>
              <b className="wx-temp">{f.now.temp}°</b>
              <p><b>{f.now.words}</b>{f.today && <> · high {f.today.high}°, low {f.today.low}°</>}</p>
              <p className="muted">Feels like {f.now.feels}° · humidity {f.now.humidity}%</p>
            </div>
          </Link>
          {extra}
          <p className="wx-windline"><WindArrow dir={f.now.dir} size={14} /> {f.now.wind.line}{f.now.speed != null ? ` (${Math.round(f.now.speed)} mph)` : ''}.{f.today && f.today.rain != null && <> {f.today.rain}% chance of rain today{f.today.inches ? `, ${inchWords(f.today.inches)} expected` : ''}.</>}{f.now.wind.santaAna && <b> Santa Ana winds: dry and gusty. Hold on to the patio umbrella.</b>}</p>
          <Alerts alerts={alerts} />
          <SourceNote forecast={f} stale={stale} />
          {treats.length > 0 && (
            <ul className="wx-treats">
              {treats.map((t) => <li key={t.key} style={{ '--c': t.colour }}>{t.to ? <Link to={t.to}><span aria-hidden="true">{t.icon}</span><b>{t.title}</b><small>{t.words}</small></Link> : <div><span aria-hidden="true">{t.icon}</span><b>{t.title}</b><small>{t.words}</small></div>}</li>)}
            </ul>
          )}
          {sinceYest && <p className={`wx-yday ${sinceYest.tone}` + (sinceYest.big ? ' big' : '')}>{sinceYest.intro} <b className="wx-yday-lead">{sinceYest.lead}</b> {sinceYest.rest}.</p>}
          {ago && f.today && (
            <Link className="wx-ago" to={`/world/day/${ago.date}`}>
              <WeatherIcon pic={ago.pic} size={22} />
              <span>A year ago today: <b className="fig">{Math.round(ago.high)}°</b> / <b className="fig">{Math.round(ago.low)}°</b>, {ago.words.toLowerCase()}{ago.inches ? `, ${inchWords(ago.inches)}` : ''}. {agoWords(f.today.high, ago.high)}</span>
            </Link>
          )}
          {schools && <SchoolsBeside homeTemp={f.now.temp} />}
          <DayStrip days={f.allDays} timeline={f.timeline} />
          <HourStrip timeline={f.timeline} nowIndex={f.nowIndex} />
          {more && <Link className="btn ghost" to="/world">The week ›</Link>}
          <Credit source={f.source} />
        </>
      )}
    </Card>
  )
}

const agoWords = (today, then) => { const d = Math.round(today - then); return Math.abs(d) < 2 ? 'About the same today.' : d > 0 ? `${d}° warmer today.` : `${-d}° cooler today.` }

/** The small treats under the weather: air, tonight's stars, a rainbow, a drive for the sunset. */
function treatsFor(f, now, air) {
  const out = []
  if (air && air.band) out.push({ key: 'air', icon: '🍃', title: `Air ${air.now}`, words: air.band.name, colour: air.band.colour, to: '/world/sky/air' })
  const nine = f.timeline.find((h) => h.date === f.today.date && h.hour === 21)
  const moon = SunCalc.getMoonIllumination(now).fraction
  const st = nine && nine.clouds ? stargazing(Math.max(nine.clouds.low, nine.clouds.mid ?? 0, nine.clouds.high ?? 0), moon) : null
  if (st && now.getHours() < 23) out.push({ key: 'stars', icon: '✦', title: 'Tonight’s stars', words: { dazzling: 'Dazzling', good: 'Good', 'so-so': 'Patchy', poor: 'Clouded over' }[st.grade], colour: '#6C7FB8', to: '/world/sky/moon' })
  const soon = f.timeline.slice(f.nowIndex, f.nowIndex + 4).find((h) => rainbowChance(h, (SunCalc.getPosition(new Date(homeInstant(h.date, `${String(h.hour).padStart(2, '0')}:30`)), HOME_TOWN.lat, HOME_TOWN.lng).altitude * 180) / Math.PI))
  if (soon) out.push({ key: 'bow', icon: '🌈', title: 'Rainbow watch', words: 'Showers and low sun: look away from the sun', colour: '#C45C9A', to: `/world/day/${soon.date}/${String(soon.hour).padStart(2, '0')}` })
  return out
}

/** The week ahead, each day's range against the whole week's. */
export function WeatherWeek({ className = 'span-3' }) {
  const { forecast: f, error } = useWeather()
  if (!f) return <Card tint="#3BA3A8" label="The week" glyph="weather" className={className}><p className="muted">{error || 'Looking ahead…'}</p></Card>
  return (
    <Card tint="#3BA3A8" label="The week" glyph="weather" className={className}>
      <WeekList days={f.days} linkDays />
      <Credit />
    </Card>
  )
}
