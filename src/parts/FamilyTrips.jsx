import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { Toast } from '../ui/Toast.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import WeatherIcon from './WeatherIcon.jsx'
import { usePlacesWeather } from '../lib/useWeather.js'
import { useWhereabouts } from '../lib/useWhereabouts.js'
import { usePostcards } from '../lib/useYonder.js'
import { useSession } from '../lib/auth.js'
import { todayAt } from '../lib/cal/dates.js'
import { useAround } from '../lib/useAround.js'
import { useEvents } from '../lib/useCalendar.js'
import { useOutings, useParkMarks, saveOuting, deleteOuting, saveParkMark } from '../lib/useLife.js'
import { othersAway, isInWords, parkNear, tripsToKeep, todayTrip } from '../lib/trips.js'
import { aroundPlace } from './AroundCard.jsx'
import { mapsSearch } from '../lib/around.js'
import { addDays, ordinal } from '../lib/cal/dates.js'
import { HOME_TOWN } from '../lib/sky.js'
import './trips.css'

const clock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: HOME_TOWN.tz })
const range = (a, b) => { const f = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); return a === b ? f(a) : `${f(a)} to ${f(b)}` }

/**
 * "Meanwhile": which town each of the others is in while away, with the weather
 * there (Jason's decision: full transparency). Their own phone shares it; it
 * lapses twelve hours after they last opened the app there, and goes when
 * they're home. Never on the wall or in Reports.
 */
export function FamilyAway({ family, me }) {
  const rows = useWhereabouts()
  const session = useSession()
  const cards = usePostcards(session, todayAt(HOME_TOWN.tz))
  const away = othersAway(rows, family.members, me && me.name)
  const nameOf = (id) => (family.members.find((m) => m.id === id) || {}).name
  const cardFrom = (name) => (cards.rows || []).find((c) => nameOf(c.member_id) === name)
  const weather = usePlacesWeather(away.map((o) => ({ slug: 'fam-' + o.name, lat: o.lat, lng: o.lng })))
  if (!away.length) return null
  return (
    <Card tint="#2F7D7A" label="Meanwhile" glyph="weather" className="span-3 tr-away">
      <ul className="tr-list">
        {away.map((o) => {
          const w = weather['fam-' + o.name]
          return (
            <li key={o.name}>
              {w && <WeatherIcon pic={w.pic} size={28} label={w.words} />}
              <span><b>{isInWords(o)}</b>{w && <>: <span className="fig">{w.temp}°</span>, {w.words.toLowerCase()}</>}{cardFrom(o.name) && <span className="tr-card">{o.name} sent a postcard: “{cardFrom(o.name).words || `Greetings from ${cardFrom(o.name).town}.`}”</span>}<small>Since {clock(o.since)}, shared while {o.name} is away · <Link to="/yonder">{cardFrom(o.name) ? 'Postcards' : 'Trips'} ›</Link></small></span>
            </li>
          )
        })}
      </ul>
      <p className="muted small">Each of us shares the town only, while away, from Settings › Notice where I am.</p>
    </Card>
  )
}

/**
 * Mass near here, away on a Saturday evening or a Sunday morning: the guide's
 * own Mass section where it has one (times only from a parish's own page), else
 * the Catholic churches the open map knows nearby. Times unchecked; it says so.
 */
export function MassNearHere({ here, now }) {
  const place = here && here.tier === 'away' ? aroundPlace(here) : null
  const { map, guide } = useAround(place)
  const local = new Date(now.toLocaleString('en-US', { timeZone: here.tz || HOME_TOWN.tz }))
  const time = (local.getDay() === 6 && local.getHours() >= 14) || (local.getDay() === 0 && local.getHours() < 13)
  if (!place || !time) return null
  const fromGuide = guide && (guide.sections || []).find((s) => s.key === 'mass')
  const churches = fromGuide ? fromGuide.items.slice(0, 3) : ((map && map.map && map.map.mass) || []).slice(0, 3).map((c) => ({ name: c.name, website: c.website, km: c.km }))
  if (!churches.length) return null
  return (
    <Card tint="#B3263A" label="Mass near here" glyph="candle" className="span-3">
      <ul className="tr-list">
        {churches.map((c) => (
          <li key={c.name}>
            <span><b>{c.name}</b>{c.more && <small>{c.more}</small>}{c.km != null && <small className="fig">{c.km} km from the middle of the area</small>}
              <span className="tr-go"><a href={mapsSearch(c.name, place.town)} target="_blank" rel="noopener noreferrer">Directions</a>{c.website && <> · <a href={c.website} target="_blank" rel="noopener noreferrer">The parish’s page</a></>}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small">Times aren’t checked here: the parish’s own page has the week’s Masses.</p>
    </Card>
  )
}

/**
 * A national park near here, from the open map: not checked off yet, a parent can
 * check it off (asked first), and a new park gets the rainbow gleam.
 */
export function ParkNear({ here, session, me, today }) {
  const place = here && here.tier === 'away' ? aroundPlace(here) : null
  const { map } = useAround(place)
  const marks = useParkMarks(session)
  const [asking, setAsking] = useState(false)
  const [done, setDone] = useState(null)
  const near = parkNear(map && map.map, marks.rows)
  if (!place || !near) return null
  const parent = Boolean(me && me.role === 'parent')
  const count = (marks.rows || []).filter((m) => m.visited_on).length
  return (
    <Card tint="#4E6C3D" label="A national park" glyph="sunmoon" className={'span-3 tr-park' + (done ? ' tr-gleaming' : '')}>
      {done && <i className="tr-gleam" aria-hidden="true" />}
      <p><b>{near.park.name}</b> is right here.</p>
      {near.visited || done ? <p>{done ? `Checked off: our ${ordinal(done)} national park.` : `Checked off on ${range(near.visited, near.visited)}.`}</p> : <p>Not checked off yet.</p>}
      {!near.visited && !done && parent && <button type="button" className="btn" onClick={() => setAsking(true)}>Check it off</button>}
      <Link className="btn ghost" to="/lifelist/parks">The parks ›</Link>
      {asking && (
        <Confirm title={`Check off ${near.park.name}?`} yes="Check it off" onNo={() => setAsking(false)} onYes={async () => {
          setAsking(false)
          const { error } = await saveParkMark(near.park.slug, { visited_on: today, want: false })
          if (!error) { setDone(count + 1); marks.reload() }
        }}>
          <p>It goes on the Life List’s parks with today’s date.</p>
        </Confirm>
      )}
    </Card>
  )
}

/**
 * "Keep this trip?": a calendar trip just finished, or today away with nothing
 * planned. Kept at once with an Undo, as one of Life List's outings; a parent's to
 * keep (outings are). Never made from where a phone has been.
 */
export function KeepTrip({ here, session, me, today }) {
  const parent = Boolean(me && me.role === 'parent')
  const { events } = useEvents(parent ? session : null, addDays(today, -10), today)
  const outings = useOutings(parent ? session : null)
  const [toast, setToast] = useState(null)
  const [skipped, setSkipped] = useState(() => { try { return JSON.parse(localStorage.getItem('teamhicks.keep-skipped')) || [] } catch { return [] } })
  if (!parent || !outings.loaded) return toast ? <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast> : null
  const finished = tripsToKeep(events, outings.rows, today, HOME_TOWN).filter((e) => !skipped.includes(e.id))
  const todays = todayTrip(here, events, outings.rows, today)
  const offer = finished[0] ? { key: finished[0].id, title: finished[0].title, starts_on: finished[0].starts_on, ends_on: finished[0].ends_on, place: finished[0].place || '', event_id: finished[0].id } : todays && !skipped.includes('today:' + today + todays.title) ? { key: 'today:' + today + todays.title, ...todays } : null
  const skip = (k) => { const n = [...skipped, k].slice(-40); setSkipped(n); try { localStorage.setItem('teamhicks.keep-skipped', JSON.stringify(n)) } catch { /* fine */ } }
  const keep = async () => {
    const row = { kind: 'trip', title: offer.title.slice(0, 120), starts_on: offer.starts_on, ends_on: offer.ends_on, place: offer.place ? offer.place.slice(0, 200) : null, ...(offer.event_id ? { event_id: offer.event_id } : {}) }
    const { data, error } = await saveOuting(row, null, me)
    if (error) { setToast({ text: 'It couldn’t be kept just now.', undo: () => setToast(null) }); return }
    outings.reload()
    setToast({ text: `Kept: ${row.title}, in the Life List’s trips.`, undo: async () => { await deleteOuting(data.id); outings.reload(); setToast(null) } })
  }
  return (
    <>
      {offer && (
        <Card tint="#C9863F" label="Keep this trip?" glyph="star" className="span-3">
          <p><b>{offer.event_id ? offer.title : `Today in ${offer.title}`}</b> <span className="muted">{range(offer.starts_on, offer.ends_on)}</span></p>
          <p className="muted small">Kept trips go in the Life List, and later its scrapbook, recipes and passport stamp gather round them.</p>
          <div className="form-actions">
            <button type="button" className="btn" onClick={keep}>Keep it</button>
            <button type="button" className="btn ghost" onClick={() => skip(offer.key)}>Not this one</button>
          </div>
        </Card>
      )}
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </>
  )
}
