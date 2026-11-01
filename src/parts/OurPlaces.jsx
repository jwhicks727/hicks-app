import { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { useSession } from '../lib/auth.js'
import { useNow } from '../lib/useNow.js'
import { useEvents } from '../lib/useCalendar.js'
import { useWeather, useAir, useAlertsAt, usePlacesWeather } from '../lib/useWeather.js'
import { usePlaceWeather as useTripWeather } from '../lib/useOutdoors.js'
import { useStations } from '../lib/useOutside.js'
import { geocodeUrl, shapePlaces } from '../lib/outdoors.js'
import { placeBySlug } from '../lib/places.js'
import { todayAt } from '../lib/cal/dates.js'
import { HOME_TOWN } from '../lib/sky.js'
import { recessFlag, inchWords } from '../lib/weather.js'
import { eventIcon, watchable, whenWords, watchFlag, worstDay } from '../lib/watch.js'
import WeatherIcon from './WeatherIcon.jsx'
import { WindArrow } from './WxStrips.jsx'
import { RecessChip } from '../places/world/DayPage.jsx'
import Scene from '../places/world/Scene.jsx'

// Our most important places, up top beside the weather at home: the three
// schools side by side, then whatever is coming up somewhere else (Jason's
// concert, Anna's campout), each with the weather it will have. Every tile
// opens its own page. No stand-in data: an event shows here only when the
// calendar has it with a place.

const SCHOOLS = [{ slug: 'kordyak', name: 'Kordyak', who: 'Laurie' }, { slug: 'ruble', name: 'Wayne Ruble', who: 'Anna' }, { slug: 'soar', name: 'SOAR', who: 'Jason' }]
const SEV = { 3: '#8A1F11', 2: '#B3401A', 1: '#C98A12', 0: '#6E5B4B' }

/** The little pictures for events, drawn in code on a 24-unit grid. */
export function EventArt({ kind, size = 30 }) {
  const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const art = {
    music: <g {...S}><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></g>,
    tent: <g {...S}><path d="M3 20L12 5l9 15z" /><path d="M12 5v15M9 20l3-6 3 6" /></g>,
    mountain: <g {...S}><path d="M2.5 19.5L9 8l4 6 2-3 6.5 8.5z" /><path d="M7.4 11.2l1.6 1.2 1.4-1" /></g>,
    wave: <g {...S}><path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></g>,
    ball: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17M6 6c3 3 3 9 0 12M18 6c-3 3-3 9 0 12" /></g>,
    plane: <g {...S}><path d="M21 4L3 11l6 2.5L11 20l2.6-5.2L19 12z" /><path d="M9 13.5L21 4" /></g>,
    tree: <g {...S}><path d="M12 21v-6M12 15c-4 0-6-3-4.5-6 .2-2 1.6-3.6 3-4.5C11.6 3.8 12.4 3.8 13 4.5c1.4.9 2.8 2.5 3 4.5 1.5 3-.5 6-4 6z" /></g>,
    star: <path {...S} d="M12 3.5l2.5 5.2 5.6.8-4 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4-4 5.6-.8z" />,
  }[kind] || null
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">{art}</svg>
}
const ART_COLOUR = { music: '#8A5BC4', tent: '#C98A12', mountain: '#4A7FD6', wave: '#2C6E9E', ball: '#E0662F', plane: '#3BA3A8', tree: '#4E6C3D', star: '#C42D20' }

/** A place name found on the map, kept for the visit: { lat, lng } or null. */
function useFound(events) {
  const [found, setFound] = useState({})
  const need = events.filter((e) => e.lat == null && e.place).map((e) => e.place)
  const key = need.join('|')
  useEffect(() => {
    let live = true
    need.forEach(async (name) => {
      const k = 'teamhicks.geo.' + name.toLowerCase()
      let hit = null
      try { hit = JSON.parse(sessionStorage.getItem(k)) } catch { /* nothing kept */ }
      if (!hit) {
        try { const r = await fetch(geocodeUrl(name)); hit = shapePlaces(await r.json())[0] || { none: true }; try { sessionStorage.setItem(k, JSON.stringify(hit)) } catch { /* fine */ } } catch { return }
      }
      if (live && !hit.none) setFound((f) => ({ ...f, [name]: { lat: hit.lat, lng: hit.lng } }))
    })
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return found
}

function Trip({ ev, today }) {
  const w = useTripWeather(ev.lat != null ? ev : null, today)
  const icon = eventIcon(ev.title, ev.place)
  const days = w.days || []
  const worst = worstDay(days), first = days[0]
  const flag = watchFlag(worst)
  return (
    <li>
      <Link to={`/calendar/event/${ev.id}`} className="op-trip" style={{ '--c': ART_COLOUR[icon] }}>
        <span className="op-art"><EventArt kind={icon} /></span>
        <span className="op-trip-t"><b>{ev.title}</b><small>{whenWords(ev, today)} · {String(ev.place).split(',')[0]}</small></span>
        {first && <span className="op-trip-w"><WeatherIcon pic={first.pic} size={28} label={first.words} /><b className="fig">{first.high}°</b><small className="fig">{first.rain ?? 0}% · {first.wind != null ? <><WindArrow dir={null} />{first.wind} mph</> : ''}{first.inches ? ` · ${inchWords(first.inches)}` : ''}</small></span>}
        {!first && w.kind === 'past' && w.past && <span className="op-trip-w"><b className="fig">{w.past.high[0]}–{w.past.high[1]}°</b><small>usual highs</small></span>}
        {!first && ev.lat == null && <span className="op-trip-w"><small>finding the place…</small></span>}
        {flag && <span className="op-flag">{flag}</span>}
      </Link>
    </li>
  )
}

export default function OurPlaces({ className = 'span-3' }) {
  const session = useSession()
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const places = SCHOOLS.map((s) => ({ ...s, ...placeBySlug(s.slug) }))
  const wx = usePlacesWeather(places)
  const st = useStations()
  const { forecast: f } = useWeather()
  const air = useAir()
  const alerts = [useAlertsAt(places[0]), useAlertsAt(places[1]), useAlertsAt(places[2])]
  const end = useMemo(() => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 16); return d.toISOString().slice(0, 10) }, [today])
  const { events } = useEvents(session, today, end)
  const trips = useMemo(() => watchable(events, today), [events, today])
  const found = useFound(trips)
  const withPoints = useMemo(() => trips.map((e) => (e.lat == null && found[e.place] ? { ...e, ...found[e.place] } : e)), [trips, found])
  const hour = f && f.timeline[f.nowIndex]
  const flag = hour ? recessFlag(hour, air.air ? air.air.now : null) : null
  // The same alert across schools reads once, "all three"
  const merged = useMemo(() => {
    const by = new Map()
    alerts.forEach((list, i) => list.forEach((a) => { const e = by.get(a.event) || { ...a, at: [] }; e.at.push(SCHOOLS[i].name); by.set(a.event, e) }))
    return [...by.values()].sort((a, b) => b.level - a.level)
  }, [alerts[0], alerts[1], alerts[2]]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card tint="#D4553A" label="Our places" glyph="star" className={className + ' op-card'}>
      <ul className="op-schools">
        {places.map((p) => {
          const w = wx[p.slug], s = st && st.places && st.places[p.slug] && st.places[p.slug].latest
          const temp = s ? Math.round(s.temp) : w ? w.temp : null
          return (
            <li key={p.slug} style={{ '--c': p.colour }}>
              <Link to={`/world/place/${p.slug}`} aria-label={`${p.name}, ${p.who}'s school${temp != null ? `, ${temp} degrees` : ''}`}>
                <Scene place={p} now={now} pic={w && w.pic} mini />
                <b className="op-name">{p.name}</b><small>{p.who}’s</small>
                {w ? <WeatherIcon pic={w.pic} size={38} label={w.words} /> : <span className="op-blank" />}
                <b className="op-temp fig">{temp != null ? `${temp}°` : '–'}</b>
                {w && <small className="fig">{w.high}° / {w.low}°</small>}
                {w && <small className="fig">{w.rain ?? 0}% · {w.wind ?? 0} mph</small>}
                {s && <small className="op-st">its station</small>}
              </Link>
            </li>
          )
        })}
      </ul>
      {flag && <RecessChip flag={flag} aqi={air.air} who="Recess now" />}
      {merged.length > 0 && (
        <ul className="wx-alerts">
          {merged.map((a) => (
            <li key={a.event} style={{ '--sev': SEV[a.level] }}>
              <details><summary><b>{a.event}</b><span> · {a.at.length === SCHOOLS.length ? 'all three schools' : a.at.join(', ')}</span></summary>{a.headline && <p>{a.headline}</p>}{a.instruction && <p className="muted">{a.instruction}</p>}</details>
            </li>
          ))}
        </ul>
      )}
      <div className="op-head"><b>Coming up</b><Link to="/calendar/new" className="op-add">Add an event ›</Link></div>
      {withPoints.length > 0 ? (
        <ul className="op-trips">{withPoints.map((e) => <Trip key={e.id} ev={e} today={today} />)}</ul>
      ) : (
        <p className="muted small">Nothing with a place in the next two weeks. Add a concert, a campout or a trip to the calendar with its place and its weather shows up here.</p>
      )}
    </Card>
  )
}
