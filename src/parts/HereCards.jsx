import { useEffect, useState } from 'react'
import './here.css'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import WeatherIcon from './WeatherIcon.jsx'
import LivingSky from './LivingSky.jsx'
import { Alerts, HoursList, WeekList } from './WeatherCard.jsx'
import { WindArrow } from './WxStrips.jsx'
import { useWeather, useHereForecast, useAlertsAt, usePlaceWeather } from '../lib/useWeather.js'
import { useEvents } from '../lib/useCalendar.js'
import { dedupeEvents } from '../lib/cal/tidy.js'
import { addDays } from '../lib/cal/dates.js'
import { inchWords } from '../lib/weather.js'
import { tripForecastUrl } from '../lib/outdoors.js'
import { useAround } from '../lib/useAround.js'
import { cellIdOf } from '../lib/around.js'
import { sleepsFigure } from '../lib/yonder.js'
import { placeWords, tripsAhead, whenWords, tripWindow, shapeTripDays, packWords, miles, cellOf, OSM_CREDIT, TRIP_AHEAD_DAYS } from '../lib/here.js'

/** The town's name, or our own place's while the name is still being looked up. */
export const whereWords = (here) => placeWords(here.town) || (here.place ? here.place.town : '')

const WHERE_NOTE = 'Where you are is rounded to about a kilometre and kept only on this phone; while you’re away the family sees which town (Settings › Notice where I am).'

/** The National Weather Service's alerts where we are: the United States only, so this is drawn only there. */
function HereAlerts({ point }) {
  return <Alerts alerts={useAlertsAt(point)} />
}

/** Home's weather in one line, under the weather where we are. */
function AtHome() {
  const { forecast: f } = useWeather()
  if (!f) return null
  return (
    <Link className="here-home" to="/world">
      <WeatherIcon pic={f.now.pic} size={22} label={f.now.words} />
      <span>At home: <b className="fig">{f.now.temp}°</b>, {f.now.words.toLowerCase()}{f.today && <> · high {f.today.high}°</>}{f.now.wind.santaAna && <> · Santa Ana winds</>}</span>
    </Link>
  )
}

/** The weather where the phone is, when we're away: now, the next twelve hours and the week, with home's in a line beneath. */
export function WeatherHere({ here, className = 'span-3' }) {
  const { forecast: f, error } = useHereForecast(here.point)
  const where = whereWords(here)
  const us = !here.town || here.town.cc === 'US'
  return (
    <Card tint="#4A7FD6" label={where ? `Weather in ${where}` : 'Weather here'} glyph="weather" className={className + ' wx-card here-card'}>
      {f && <LivingSky pic={f.now.pic} />}
      {!f && !error && <p className="muted">Looking at the sky here…</p>}
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
          <p className="wx-windline"><WindArrow dir={f.now.dir} size={14} /> {f.now.wind.line}{f.now.speed != null ? ` (${Math.round(f.now.speed)} mph)` : ''}.{f.today && f.today.rain != null && <> {f.today.rain}% chance of rain today{f.today.inches ? `, ${inchWords(f.today.inches)} expected` : ''}.</>}</p>
          {us ? <HereAlerts point={here.point} /> : <p className="muted small">Weather alerts are read only in the United States.</p>}
          <HoursList hours={f.hours} />
          <WeekList days={f.days} />
        </>
      )}
      <AtHome />
      <p className="wx-credit">Forecast by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>{us && <> · alerts from the <a href="https://www.weather.gov/" target="_blank" rel="noopener noreferrer">National Weather Service</a></>}{here.town && <> · the town’s name from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{OSM_CREDIT}</a></>}</p>
      <p className="here-note">{WHERE_NOTE}</p>
    </Card>
  )
}

/** One line under home's weather when we're out and about: right now where we are. */
export function HereNowLine({ here }) {
  const slug = here.point ? 'here-' + cellOf(here.point) : null
  const { now } = usePlaceWeather(slug ? { slug, lat: here.point.lat, lng: here.point.lng } : null)
  const where = whereWords(here)
  if (!now) return null
  return (
    <p className="here-line">
      <WeatherIcon pic={now.pic} size={22} label={now.words} />
      <span>{where ? `In ${where}` : 'Where you are'} now: <b className="fig">{now.temp}°</b>, {now.words.toLowerCase()}{now.high != null && <> · high {now.high}°</>}</span>
    </p>
  )
}

const KEEP_MS = 15 * 60e3
/** The forecast for a trip's days there: { days, error }, kept for a quarter hour. */
export function useTripDays(trip, today) {
  const win = trip ? tripWindow(trip, today) : null
  const key = trip && win ? `teamhicks.weather.trip.${trip.lat.toFixed(2)},${trip.lng.toFixed(2)}.${win.from}.${win.to}` : null
  const [state, setState] = useState({ days: null, error: null })
  useEffect(() => {
    if (!key) { setState({ days: null, error: null }); return undefined }
    let live = true
    const run = async () => {
      try {
        let kept = null
        try { kept = JSON.parse(sessionStorage.getItem(key)) } catch { /* nothing kept */ }
        if (!kept || Date.now() - kept.at > KEEP_MS) {
          const r = await fetch(tripForecastUrl(trip.lat, trip.lng, win.from, win.to))
          if (!r.ok) throw new Error(String(r.status))
          kept = { at: Date.now(), json: await r.json() }
          try { sessionStorage.setItem(key, JSON.stringify(kept)) } catch { /* fine */ }
        }
        if (live) setState({ days: shapeTripDays(kept.json), error: null })
      } catch { if (live) setState({ days: null, error: 'The forecast there couldn’t be reached just now.' }) }
    }
    run()
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

/**
 * A trip's guide, written ahead: from two days before it starts, the first of us to open
 * the app asks for it, so it's waiting when we arrive. Sent: the area to about ten
 * kilometres, and the place's name and region as the calendar has them.
 */
function TripGuide({ trip }) {
  const [town, region] = trip.place.split(',').map((x) => x.trim())
  const place = { cell: cellIdOf(trip), town: town || trip.title, region: region || '', cc: '' }
  const { guide, building } = useAround(trip.inDays <= 2 ? place : null, { auto: true })
  if (guide) return <Link className="here-home" to={`/world/around/${guide.id}`}><span>The guide to {place.town} is ready: hikes, roasters, brewpubs and the rest ›</span></Link>
  if (building) return <p className="here-line"><span>Writing the guide to {place.town}, ready before you go.</span></p>
  return null
}

const short = (date) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })

/**
 * A trip on the calendar, up to three days before it starts: when, how far,
 * its forecast for those days, and what to pack. Gone once we're there (the
 * weather where we are takes over) and once it's over.
 */
export function TripAhead({ session, today, here, className = 'span-3' }) {
  const { events } = useEvents(session, today, addDays(today, TRIP_AHEAD_DAYS))
  const trips = tripsAhead(dedupeEvents(events), today)
  const trip = trips.find((t) => !(here.point && miles(here.point, t) < 15)) || null
  const { days, error } = useTripDays(trip, today)
  if (!trip) return null
  const pack = packWords(days || [])
  const place = trip.place.split(',')[0]
  return (
    <Card tint="#2F7D7A" label="Coming up" glyph="star" className={className + ' here-trip'}>
      <Link className="here-trip-head" to={`/yonder/plan/${trip.id}`}>
        <span className="here-when">{whenWords(trip, today)}{trip.inDays > 0 ? ` · ${sleepsFigure(trip.inDays)}` : ''}</span>
        <b className="here-title">{trip.title}</b>
        <span className="muted">{[place && place !== trip.title ? place : null, `${trip.miles} miles from home`].filter(Boolean).join(' · ')}</span>
      </Link>
      {!days && !error && <p className="muted">Looking at the forecast there…</p>}
      {error && <p className="muted">{error}</p>}
      {days && days.length > 0 && (
        <ol className="here-days" aria-label="The forecast there">
          {days.map((d) => (
            <li key={d.date}>
              <span>{short(d.date)}</span>
              <WeatherIcon pic={d.pic} size={28} label={d.words} />
              <b className="fig">{d.high}°</b>
              <small className="fig">{d.low}°</small>
              {(d.rain ?? 0) >= 20 && <small className="here-rain fig">{d.rain}%</small>}
            </li>
          ))}
        </ol>
      )}
      {days && !days.length && <p className="muted">The forecast doesn’t reach those days yet.</p>}
      {pack.length > 0 && <ul className="here-pack">{pack.map((p) => <li key={p}>{p}</li>)}</ul>}
      <TripGuide trip={trip} />
      <p className="wx-credit">Forecast by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>, for the place on the calendar, rounded to about a kilometre.</p>
    </Card>
  )
}
