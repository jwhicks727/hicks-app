import { useState } from 'react'
import SunCalc from 'suncalc'
import { Card } from '../ui/Card.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { deleteEvent } from '../lib/useCalendar.js'
import { usePlaceWeather, useSightings } from '../lib/useOutdoors.js'
import { SIGHTING_GROUPS, exploreUrl } from '../lib/outdoors.js'
import { METEOR_SHOWERS } from '../lib/cal/nature.js'
import { addDays, parts, MONTHS, WEEKDAYS, diffDays } from '../lib/cal/dates.js'
import { moonName } from '../lib/sky.js'
import WeatherIcon from '../parts/WeatherIcon.jsx'
import { MoonGlyph } from './Glyph.jsx'
import { KIND_STYLE } from './kinds.js'
import { GlowWrap } from '../ui/Glow.jsx'
import { occasionFor } from '../lib/occasions.js'
import { dayView } from '../lib/cal/day.js'

const day = (d) => { const [y, m, dd] = parts(d); return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()].slice(0, 3)} ${MONTHS[m - 1].slice(0, 3)} ${dd}` }
const hm = (iso, tz = 'America/Los_Angeles') => new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
const localHm = (s) => { if (!s) return ''; const [h, m] = s.slice(11, 16).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` }

function Weather({ ev, today }) {
  const w = usePlaceWeather(ev, today)
  if (w.kind === 'past' && !w.past) return null
  const lo = w.days ? Math.min(...w.days.map((d) => d.low)) : 0, span = w.days ? Math.max(1, Math.max(...w.days.map((d) => d.high)) - lo) : 1
  return (
    <Card tint="#4A7FD6" label={`Weather at ${ev.place.split(',')[0]}`} glyph="weather" className="span-3">
      {!w.kind && <p className="muted">Looking…</p>}
      {w.error && <p className="muted">{w.error}</p>}
      {w.days && (
        <ol className="wx-week">
          {w.days.map((d) => (
            <li key={d.date}>
              <span className="wx-day">{day(d.date).slice(0, 3)}</span>
              <WeatherIcon pic={d.pic} size={28} label={d.words} />
              <span className="wx-lo">{d.low}°</span>
              <span className="wx-bar" aria-hidden="true"><i style={{ left: `${((d.low - lo) / span) * 100}%`, right: `${((lo + span - d.high) / span) * 100}%` }} /></span>
              <span className="wx-hi">{d.high}°</span>
              <span className="wx-note">{[d.words, d.rain >= 20 && `${d.rain}% chance of ${d.pic === 'snow' ? 'snow' : 'rain'}`, d.gusts >= 25 && `gusts ${d.gusts}`, d.uv >= 7 && `UV ${Math.round(d.uv)}: sunscreen`, d.sunrise && `sun ${localHm(d.sunrise)}–${localHm(d.sunset)}`].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ol>
      )}
      {w.past && (
        <>
          <p>These dates over the last {w.past.years} years there: highs <b className="nw">{w.past.high[0]}–{w.past.high[1]}°</b>, lows <b className="nw">{w.past.low[0]}–{w.past.low[1]}°</b>, rain on {w.past.wetDays} of {w.past.days} days.</p>
          <p className="muted">The real forecast opens on {day(addDays(ev.starts_on, -15))}.</p>
        </>
      )}
      <p className="wx-credit">Weather by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></p>
    </Card>
  )
}

function Nights({ ev }) {
  const nights = []
  for (let d = ev.starts_on; d <= ev.ends_on && nights.length < 14; d = addDays(d, 1)) {
    const [y, m, dd] = parts(d)
    const night = new Date(Date.UTC(y, m - 1, dd, 6 + 24)) // about 10 PM at home
    const mi = SunCalc.getMoonIllumination(night)
    const up = SunCalc.getMoonPosition(night, ev.lat, ev.lng).altitude > 0
    nights.push({ d, mi, up, dark: mi.fraction < 0.3 || !up })
  }
  const showers = METEOR_SHOWERS.filter((s) => nights.some((n) => { const [, m, dd] = parts(n.d); return m === s.m && Math.abs(dd - s.d) <= 1 }))
  return (
    <Card tint="#2E2A5C" label="The nights" glyph="sunmoon" className="span-3">
      <ul className="nights">
        {nights.map((n) => (
          <li key={n.d}>
            <MoonGlyph phase={n.mi.phase} size={30} />
            <span><b>{day(n.d)}</b> · {moonName(n.mi.phase)}, {Math.round(n.mi.fraction * 100)}% lit{n.dark ? <b className="dark-sky"> · dark sky: stars</b> : n.up ? ' · moon up at 10 PM' : ''}</span>
          </li>
        ))}
      </ul>
      {showers.map((s) => <p key={s.name} className="ok">{s.name} peak around then: {s.word.toLowerCase()}.</p>)}
    </Card>
  )
}

function Sightings({ ev }) {
  const [taxon, setTaxon] = useState('Aves')
  const s = useSightings(ev, taxon)
  const month = MONTHS[Number(ev.starts_on.slice(5, 7)) - 1]
  return (
    <Card tint="#5F8A4A" label={`What’s been seen near there in ${month}`} glyph="bird" className="span-6 sightings">
      <div className="choice-row" role="group" aria-label="Which kind">
        {SIGHTING_GROUPS.map(([k, l]) => <button key={k} type="button" aria-pressed={taxon === k} onClick={() => setTaxon(k)}>{l}</button>)}
      </div>
      {!s.list && !s.error && <p className="muted">Asking iNaturalist…</p>}
      {s.error && <p className="muted">{s.error}</p>}
      {s.list && s.list.length === 0 && <p className="muted">Nothing recorded nearby that month yet.</p>}
      {s.list && s.list.length > 0 && (
        <ul className="seen">
          {s.list.map((x) => (
            <li key={x.id}>
              <a href={x.url} target="_blank" rel="noopener noreferrer">
                {x.photo ? <img src={x.photo} alt={x.name} loading="lazy" referrerPolicy="no-referrer" /> : <span className="seen-none" aria-hidden="true" />}
                <b>{x.name}</b>
                <span className="seen-n">seen {x.count} {x.count === 1 ? 'time' : 'times'}</span>
              </a>
              {x.credit && <span className="seen-credit">Photo {x.credit}</span>}
            </li>
          ))}
        </ul>
      )}
      <p className="wx-credit">Sightings from <a href={exploreUrl(ev.lat, ev.lng, Number(ev.starts_on.slice(5, 7)))} target="_blank" rel="noopener noreferrer">iNaturalist</a>, research-grade, within about 12 km, in {month} of any year.</p>
    </Card>
  )
}

/** One event: what, when, where, whose; outdoors, its weather, nights and sightings. */
export default function EventPage({ state, members, parent, today }) {
  const { event: ev, loaded } = state
  const [removing, setRemoving] = useState(false)
  if (!loaded) return <p className="muted span-6">Opening…</p>
  if (!ev) return <><div className="span-6"><Crumb to="/calendar">Calendar</Crumb></div><Card tint="#3E7A4C" label="Not found" glyph="calendar" className="span-6"><p>No event at this address.</p></Card></>
  const who = members.find((m) => m.id === ev.for_whom)
  const style = KIND_STYLE[ev.kind] || KIND_STYLE.event
  const when = ev.starts_on === ev.ends_on ? day(ev.starts_on) : `${day(ev.starts_on)} to ${day(ev.ends_on)}`
  const soon = diffDays(today, ev.starts_on)
  return (
    <>
      <header className="hero span-6">
        <Crumb to={`/calendar/day/${ev.starts_on}`}>Calendar</Crumb>
        <span className="kicker">{when}{ev.starts_at ? ` · ${hm(ev.starts_at)}${ev.ends_at ? `–${hm(ev.ends_at)}` : ''}` : ''}</span>
        <h1 className="greet">{ev.title}</h1>
        <span className="eyebrow">{[who && `${who.name}’s`, ev.place, soon > 0 ? `in ${soon} ${soon === 1 ? 'day' : 'days'}` : soon === 0 ? 'today' : null].filter(Boolean).join(' · ')}</span>
      </header>
      {(ev.notes || ev.lat != null || !ev.source_id) && (
        <GlowWrap occasion={ev.kind === 'show' ? occasionFor(dayView(ev.starts_on, { events: [ev] })) : null} day={ev.starts_on} className="span-6">
        <Card tint={style.colour} label="The details" glyph="calendar" className="span-6">
          {ev.notes && <p className="pre-line">{ev.notes}</p>}
          {ev.lat != null && <a className="btn ghost" href={`https://www.openstreetmap.org/?mlat=${ev.lat}&mlon=${ev.lng}#map=12/${ev.lat}/${ev.lng}`} target="_blank" rel="noopener noreferrer">On the map ›</a>}
          {!ev.source_id && <div className="form-actions"><Link className="btn ghost" to={`/calendar/event/${ev.id}/edit`}>Change it</Link>{parent && <button type="button" className="btn ghost" onClick={() => setRemoving(true)}>Remove it</button>}</div>}
          {ev.source_id && <p className="muted small">From one of the calendars in Admin: change it there.</p>}
        </Card>
        </GlowWrap>
      )}
      {ev.outdoors && ev.lat != null && (
        <>
          <Weather ev={ev} today={today} />
          <Nights ev={ev} />
          <Sightings ev={ev} />
        </>
      )}
      {ev.outdoors && ev.lat == null && <Card tint="#5F8A4A" label="Outdoors" glyph="bird" className="span-6"><p>Find its place on the map (Change it) and the weather there, the nights and what’s been seen nearby appear here.</p></Card>}
      {removing && (
        <Confirm title={`Remove ${ev.title}?`} yes="Remove it" danger onNo={() => setRemoving(false)}
          onYes={async () => { await deleteEvent(ev.id); setRemoving(false); navigate(`/calendar/day/${ev.starts_on}`, { replace: true }) }}>
          <p>It comes off the calendar for everyone.</p>
        </Confirm>
      )}
    </>
  )
}
