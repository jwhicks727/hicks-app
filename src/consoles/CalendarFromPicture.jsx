import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Card } from '../ui/Card.jsx'
import Dropzone from '../ui/Dropzone.jsx'
import { askClaude, prepareUpload } from '../lib/claude.js'
import { useDraft } from '../lib/useDraft.js'
import { cleanReading, eventRows } from '../lib/cal/fromPicture.js'

const fmt = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
const KIND = { no_school: 'No school', school: 'School', event: 'Event', other: 'Event' }

/**
 * Setup: a calendar from a screenshot, a photo or a PDF. Claude reads the
 * dates; you tick the ones to keep; they go in under a source of their own.
 * What was read is kept on this device until it's added or dismissed.
 */
export default function CalendarFromPicture({ members, onAdded }) {
  const [d, setD, clear] = useDraft('calendar.picture', { events: null, picked: [], title: '', hint: '', for_whom: '' })
  const [busy, setBusy] = useState(null), [preview, setPreview] = useState(null)
  const adding = useRef(false) // a second tap while the first is still saving does nothing
  async function read(files) {
    const f = files[0]
    setBusy('Reading the dates…')
    const up = await prepareUpload(f, { max: 2200 })
    setPreview(up.preview)
    const res = await askClaude('calendar-from-image', { file: { data: up.data, media_type: up.media_type }, hint: d.hint })
    if (res.error) { setBusy(res.error); return }
    const events = cleanReading(res.events)
    setD({ ...d, events, picked: events.map((_, i) => i), title: d.title || res.title || f.name || 'A calendar from a picture' })
    setBusy(events.length ? null : 'No dates found in that one.')
  }
  async function add() {
    const keep = d.events.filter((_, i) => d.picked.includes(i))
    if (!keep.length || adding.current) return
    adding.current = true
    setBusy('Adding…')
    const last = keep.reduce((m, e) => (e.ends_on > m ? e.ends_on : m), keep[0].ends_on)
    const { data: src, error } = await supabase.from('sources').insert({ title: d.title.slice(0, 200) || 'A calendar from a picture', kind: 'image', purpose: 'calendar', for_whom: d.for_whom || null, covers_until: last, last_checked_at: new Date().toISOString(), last_status: `Read from a picture: ${keep.length} dates added` }).select('id').single()
    if (error) { adding.current = false; setBusy(error.message); return }
    const { error: e2 } = await supabase.from('calendar_events').upsert(eventRows(keep, { sourceId: src.id, forWhom: d.for_whom }), { onConflict: 'source_id,external_id' })
    if (e2) { adding.current = false; setBusy(e2.message); return }
    // Done: the card goes back to asking for a picture, and says what was added
    adding.current = false
    clear(); setPreview(null); setBusy(`Added ${keep.length} to the calendar.`); onAdded && onAdded()
  }
  const toggle = (i) => setD({ ...d, picked: d.picked.includes(i) ? d.picked.filter((x) => x !== i) : [...d.picked, i] })
  return (
    <Card tint="#3E7A4C" label="A calendar from a picture" glyph="calendar" className="span-6">
      {!d.events && (
        <>
          <p>A screenshot of a school calendar, a photo of a flyer on the fridge, a PDF from an email: Claude reads the dates, and you choose which to keep.</p>
          <div className="form form-row">
            <label>What it is (if you like)<input maxLength={200} value={d.hint} onChange={(e) => setD({ ...d, hint: e.target.value })} placeholder="Wayne Ruble’s 2026–27 calendar" /></label>
            <label>Whose<select value={d.for_whom} onChange={(e) => setD({ ...d, for_whom: e.target.value })}><option value="">The whole family</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}’s</option>)}</select></label>
          </div>
          <Dropzone accept="image/*,application/pdf" label="A calendar: screenshot, photo or PDF" hint="Paste a screenshot, drop a file, or choose one." onFiles={read} disabled={busy === 'Reading the dates…'} />
          <p className="muted small">The picture goes to Claude (Anthropic) to read its dates; nothing is added until you say.</p>
        </>
      )}
      {preview && d.events && <img className="pic-preview" src={preview} alt="The picture that was read" />}
      {d.events && d.events.length > 0 && (
        <>
          <div className="form"><label>Call it<input maxLength={200} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label></div>
          <ul className="pic-events">
            {d.events.map((e, i) => (
              <li key={i}>
                <label>
                  <input type="checkbox" checked={d.picked.includes(i)} onChange={() => toggle(i)} />
                  <span className="fig">{fmt(e.starts_on)}{e.ends_on !== e.starts_on ? ` – ${fmt(e.ends_on)}` : ''}{e.time ? ` · ${e.time}` : ''}</span>
                  <b>{e.title}</b>
                  <em className={'pic-kind ' + e.kind}>{KIND[e.kind]}</em>
                </label>
              </li>
            ))}
          </ul>
          <div className="form-actions">
            <button type="button" className="btn" disabled={!d.picked.length || busy === 'Adding…'} onClick={add}>Add {d.picked.length} to the calendar</button>
            <button type="button" className="btn ghost" onClick={() => { clear(); setPreview(null); setBusy(null) }}>Not these</button>
          </div>
        </>
      )}
      {busy && <p className="muted" role="status">{busy}</p>}
    </Card>
  )
}
