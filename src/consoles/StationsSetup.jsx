import { useEffect, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { supabase } from '../lib/supabase.js'

const PLACES = [['home', 'Home', 'The station nearest the house. Kept here only, never shown by name.'], ['kordyak', 'Kordyak', ''], ['ruble', 'Wayne Ruble', ''], ['soar', 'SOAR', '']]
const OK = /^[A-Za-z0-9_]{2,16}$/

/** Admin: which station each place reads, and the airport that stands in when it's quiet. Parents change them. */
export default function StationsSetup() {
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState({})
  const [msg, setMsg] = useState(null)
  const load = async () => {
    const { data, error } = await supabase.from('weather_stations').select('place, stid, fallback')
    if (error) { setMsg('The stations table isn’t there yet: run the newest migration (docs/MORNING.md).'); return }
    const by = Object.fromEntries(data.map((r) => [r.place, r]))
    setRows(by)
    setEdit(Object.fromEntries(PLACES.map(([k]) => [k, { stid: (by[k] && by[k].stid) || '', fallback: (by[k] && by[k].fallback) || '' }])))
  }
  useEffect(() => { load() }, [])
  const save = async (e) => {
    e.preventDefault()
    for (const [k] of PLACES) {
      const v = edit[k]
      if ((v.stid && !OK.test(v.stid)) || (v.fallback && !OK.test(v.fallback))) { setMsg('A station id is letters, numbers and underscores, 2 to 16 of them (SE685, KONT).'); return }
    }
    for (const [k] of PLACES) {
      const v = edit[k], r = rows[k] || {}
      if ((r.stid || '') === v.stid && (r.fallback || '') === v.fallback) continue
      const { error } = await supabase.from('weather_stations').update({ stid: v.stid.toUpperCase() || null, fallback: v.fallback.toUpperCase() || null }).eq('place', k)
      if (error) { setMsg(/permission|policy|denied/i.test(error.message) ? 'Only Jason or Laurie can change the stations.' : error.message); return }
    }
    setMsg('Saved. The next look at the weather reads them.')
    load()
  }
  return (
    <Card tint="#4A7FD6" label="Weather stations" glyph="weather" className="span-6">
      <p className="muted">Each place reads its own station through Synoptic; its fallback, an airport, stands in when that one goes quiet. Find a station’s id on <a href="https://mesowest.utah.edu/" target="_blank" rel="noopener noreferrer">MesoWest</a>.</p>
      {msg && <p className="nudge" role="status">{msg}</p>}
      {rows && (
        <form className="form st-setup" onSubmit={save}>
          {PLACES.map(([k, name, note]) => (
            <div key={k} className="st-place" role="group" aria-label={name}>
              <b className="st-place-h">{name}</b>
              {note && <small className="muted">{note}</small>}
              <label>Station<input value={edit[k].stid} maxLength={16} autoCapitalize="characters" autoComplete="off" spellCheck="false" onChange={(e) => setEdit({ ...edit, [k]: { ...edit[k], stid: e.target.value.trim() } })} placeholder={k === 'home' ? 'Its id' : ''} /></label>
              <label>Fallback<input value={edit[k].fallback} maxLength={16} autoCapitalize="characters" autoComplete="off" spellCheck="false" onChange={(e) => setEdit({ ...edit, [k]: { ...edit[k], fallback: e.target.value.trim() } })} placeholder="An airport’s id" /></label>
            </div>
          ))}
          <div className="form-actions"><button type="submit" className="btn">Save stations</button></div>
        </form>
      )}
    </Card>
  )
}
