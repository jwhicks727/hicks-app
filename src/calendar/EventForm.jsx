import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { useDraft } from '../lib/useDraft.js'
import { saveEvent } from '../lib/useCalendar.js'
import { looksOutdoors, geocodeUrl, shapePlaces } from '../lib/outdoors.js'
import { homeInstant } from '../lib/cal/dates.js'

const KINDS = [['event', 'Something on'], ['show', 'A show or concert'], ['family', 'Family'], ['ministry', 'Church or ministry'], ['school', 'School'], ['no_school', 'No school'], ['holiday', 'Holiday'], ['other', 'Other']]
const hmOf = (iso) => (iso ? new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)) : '')

/** A new event, or one of ours changed. Kept on the device until saved or cancelled. */
export default function EventForm({ event, date, members }) {
  const blank = { title: '', starts_on: date, ends_on: date, allDay: true, start: '18:00', end: '19:00', kind: 'event', for_whom: '', place: '', lat: null, lng: null, outdoors: null, notes: '' }
  const initial = event ? { ...blank, ...event, allDay: !event.starts_at, start: hmOf(event.starts_at) || '18:00', end: hmOf(event.ends_at) || '19:00', for_whom: event.for_whom || '', place: event.place || '', notes: event.notes || '', outdoors: event.outdoors } : blank
  const [f, setF, clear] = useDraft(event ? `event.${event.id}` : 'event.new', initial)
  const [found, setFound] = useState(null)
  const [err, setErr] = useState(null)
  const outdoors = f.outdoors ?? looksOutdoors(f.title, f.place)
  async function find() {
    setFound('Looking…')
    try { const r = await fetch(geocodeUrl(f.place)); setFound(shapePlaces(await r.json())) } catch { setFound('The map couldn’t be reached just now.') }
  }
  async function save(e) {
    e.preventDefault()
    if (f.ends_on < f.starts_on) { setErr('It ends before it starts.'); return }
    const row = {
      title: f.title.trim().slice(0, 300), starts_on: f.starts_on, ends_on: f.ends_on || f.starts_on,
      starts_at: f.allDay ? null : homeInstant(f.starts_on, f.start), ends_at: f.allDay ? null : homeInstant(f.ends_on || f.starts_on, f.end),
      kind: f.kind, for_whom: f.for_whom || null, place: f.place.trim().slice(0, 200) || null, lat: f.place.trim() ? f.lat : null, lng: f.place.trim() ? f.lng : null,
      outdoors: Boolean(outdoors), notes: f.notes.trim().slice(0, 4000) || null,
    }
    const { data, error } = await saveEvent(row, event && event.id)
    if (error) { setErr(error.message); return }
    clear()
    navigate(`/calendar/event/${data.id}`, { replace: true })
  }
  return (
    <>
      <header className="hero span-6"><Crumb to={`/calendar/day/${date}`}>Calendar</Crumb><span className="kicker">Calendar</span><h1 className="greet">{event ? 'Change it' : 'Something new'}</h1></header>
      <Card tint="#3E7A4C" label={event ? event.title : 'New event'} glyph="calendar" className="span-6">
        <form className="form" onSubmit={save}>
          <label>What<input required maxLength={300} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Camping at Big Bear, the String Cheese Incident…" /></label>
          <div className="form-row">
            <label>Starts<input type="date" required value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value, ends_on: f.ends_on < e.target.value ? e.target.value : f.ends_on })} /></label>
            <label>Ends<input type="date" required value={f.ends_on} min={f.starts_on} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></label>
          </div>
          <fieldset className="choice-row"><legend>When in the day</legend>
            <button type="button" aria-pressed={f.allDay} onClick={() => setF({ ...f, allDay: true })}>All day</button>
            <button type="button" aria-pressed={!f.allDay} onClick={() => setF({ ...f, allDay: false })}>At a time</button>
          </fieldset>
          {!f.allDay && (
            <div className="form-row">
              <label>From<input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></label>
              <label>To<input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></label>
            </div>
          )}
          <div className="form-row">
            <label>Kind<select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label>Whose<select value={f.for_whom} onChange={(e) => setF({ ...f, for_whom: e.target.value })}><option value="">Everyone’s</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}’s</option>)}</select></label>
          </div>
          <label>Where
            <span className="place-row">
              <input maxLength={200} value={f.place} onChange={(e) => setF({ ...f, place: e.target.value, lat: null, lng: null })} placeholder="A park, a town, a venue" />
              <button type="button" className="btn ghost" disabled={!f.place.trim()} onClick={find}>Find it</button>
            </span>
          </label>
          {f.lat != null && <p className="ok">On the map ✓</p>}
          {typeof found === 'string' && <p className="muted">{found}</p>}
          {Array.isArray(found) && (
            found.length ? <ul className="place-picks">{found.map((p) => <li key={`${p.lat},${p.lng}`}><button type="button" onClick={() => { setF({ ...f, place: p.where ? `${p.name}, ${p.where}` : p.name, lat: p.lat, lng: p.lng }); setFound(null) }}><b>{p.name}</b>{p.where && <span> {p.where}</span>}</button></li>)}</ul>
              : <p className="muted">Nothing by that name. Try the park or the town.</p>
          )}
          <p className="muted small">The place’s name goes to Open-Meteo to find it on the map: a park, town or venue, never someone’s address.</p>
          <div className="switch-row">
            <span><b>Outdoors</b><span>Adds the weather there, the skies at night and what’s been seen nearby</span></span>
            <button type="button" className="switch" role="switch" aria-checked={Boolean(outdoors)} aria-label="Outdoors" onClick={() => setF({ ...f, outdoors: !outdoors })}><i /></button>
          </div>
          <label>Notes<textarea rows={3} maxLength={4000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="form-actions">
            <button type="submit" className="btn">{event ? 'Save' : 'Add it'}</button>
            <button type="button" className="btn ghost" onClick={() => { clear(); navigate(event ? `/calendar/event/${event.id}` : `/calendar/day/${date}`, { replace: true }) }}>Cancel</button>
          </div>
        </form>
      </Card>
    </>
  )
}
