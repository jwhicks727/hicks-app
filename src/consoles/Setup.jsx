import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useFamily } from '../lib/useCalendar.js'
import { useDraft, hasDraft } from '../lib/useDraft.js'
import { SCHOOLS } from '../lib/cal/schools.js'
import FamilyDays from './FamilyDays.jsx'
import CalendarFromPicture from './CalendarFromPicture.jsx'
import ParishTimes from './ParishTimes.jsx'
import StationsSetup from './StationsSetup.jsx'
import { useSession } from '../lib/auth.js'
import { useSources, todayAtHome } from '../lib/useSources.js'
import { SOURCE_KINDS, guessKind, staleness } from '../lib/sources.js'
import { REGISTRY } from '../registry.js'
import { Card } from '../ui/Card.jsx'
import { Confirm } from '../ui/Confirm.jsx'

const KIND_NAME = Object.fromEntries(SOURCE_KINDS.map(([k, n]) => [k, n]))
const FEEDS = ['ical', 'google_calendar'] // read by the read-sources function; the rest wait for document reading
// When a source was added, to tell two of the same name apart
const addedOn = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
const EMPTY = { title: '', url: '', kind: '', covers_until: '', remind_days: 30, notes: '', for_whom: '' }

function SourceForm({ initial, members, draftKey, onSaved, onCancel }) {
  const [f, setF, clearDraft] = useDraft(draftKey, initial || EMPTY)
  const school = SCHOOLS.find((s) => s.person.toLowerCase() === (members.find((m) => m.id === f.for_whom)?.name || '').toLowerCase())
  const [err, setErr] = useState(null)
  const kind = f.kind || guessKind(f.url) || ''
  async function save(e) {
    e.preventDefault()
    const row = { title: f.title.trim(), url: f.url.trim() || null, kind: kind || 'other', covers_until: f.covers_until || null, remind_days: Number(f.remind_days) || 30, notes: (f.notes || '').trim() || null, for_whom: f.for_whom || null }
    const q = initial?.id ? supabase.from('sources').update(row).eq('id', initial.id) : supabase.from('sources').insert(row)
    const { error } = await q
    if (error) setErr(error.message); else { clearDraft(); onSaved() }
  }
  return (
    <form className="form" onSubmit={save}>
      <label>Name<input required maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Wayne Ruble 2026–27 calendar" /></label>
      <label>Link<input inputMode="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="Paste a link: a calendar, a PDF, a Doc, a Drive folder, a web page" /></label>
      <label>What it is
        <select value={kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="">Choose…</option>
          {SOURCE_KINDS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
      </label>
      {kind && <p className="muted">{SOURCE_KINDS.find((x) => x[0] === kind)?.[2]}</p>}
      <label>Whose is it
        <select value={f.for_whom || ''} onChange={(e) => setF({ ...f, for_whom: e.target.value })}>
          <option value="">The whole family</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}’s</option>)}
        </select>
      </label>
      {school && <p className="muted">A school calendar marked {school.person}’s is {school.name}’s: its days off line up in the year view.</p>}
      <div className="form-row">
        <label>Good until<input type="date" value={f.covers_until || ''} onChange={(e) => setF({ ...f, covers_until: e.target.value })} /></label>
        <label>Remind me<select value={f.remind_days} onChange={(e) => setF({ ...f, remind_days: e.target.value })}>{[14, 30, 45, 60].map((d) => <option key={d} value={d}>{d} days before</option>)}</select></label>
      </div>
      <label>Notes<textarea rows={2} maxLength={4000} value={f.notes || ''} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Where to find next year’s, who sends it…" /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions">
        <button type="submit" className="btn">{initial?.id ? 'Save' : 'Add source'}</button>
        {onCancel && <button type="button" className="btn ghost" onClick={() => { clearDraft(); onCancel() }}>Cancel</button>}
      </div>
    </form>
  )
}

export default function Setup() {
  const session = useSession()
  const { rows, error, reload } = useSources(session)
  const family = useFamily(session)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(() => hasDraft('source.new'))
  const [reading, setReading] = useState({})
  const [removing, setRemoving] = useState(null) // { s, count }: asked, not yet done
  const [removeNote, setRemoveNote] = useState(null)
  // Remove a calendar: its dates first (they would otherwise stay on the calendar with no source), then the source
  async function askRemove(s) {
    setRemoveNote(null)
    const { count, error } = await supabase.from('calendar_events').select('id', { count: 'exact', head: true }).eq('source_id', s.id)
    if (error) { setRemoveNote(error.message); return }
    setRemoving({ s, count: count || 0 })
  }
  async function remove() {
    const { s } = removing
    setRemoving(null)
    const sorry = (m) => (/permission|policy|denied/i.test(m) ? 'Only Jason or Laurie can remove a calendar.' : m)
    const { error: e1 } = await supabase.from('calendar_events').delete().eq('source_id', s.id)
    if (e1) { setRemoveNote(sorry(e1.message)); return }
    const { error: e2 } = await supabase.from('sources').delete().eq('id', s.id)
    if (e2) { setRemoveNote(sorry(e2.message)); return }
    setRemoveNote(`Removed “${s.title}”.`)
    reload()
  }
  async function readNow(s) {
    setReading((r) => ({ ...r, [s.id]: 'Reading…' }))
    const { data, error } = await supabase.functions.invoke('read-sources', { body: { source_id: s.id } })
    let words = data?.results?.[0]?.status
    if (error) {
      const status = error.context?.status
      words = status === 403 ? 'Only Jason or Laurie can read a source.' : status && status !== 404 ? `The reader answered ${status}.` : 'The feed reader isn’t set up yet (docs/DATABASE.md, “Reading calendar feeds”).'
    }
    setReading((r) => ({ ...r, [s.id]: words || 'Done.' }))
    reload()
  }
  const today = todayAtHome()

  if (!supabase || session === null) {
    return (
      <>
        <header className="hero span-6"><span className="kicker">Team Hicks</span><h1 className="greet">Admin</h1></header>
        <Card tint="#453644" label="Not connected" glyph="star" className="span-6">
          <p>Admin is for Jason and Laurie, and the database isn’t connected on this copy of the app.</p>
        </Card>
      </>
    )
  }
  const counts = (rows || []).reduce((a, s) => { const st = staleness(s, today).state; a[st] = (a[st] || 0) + 1; return a }, {})
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Team Hicks · parents</span>
        <h1 className="greet">Admin</h1>
        <span className="sub">Every outside thing the app reads: pasted in once, rechecked when you like, and a nudge before it goes stale.</span>
      </header>

      <Card tint="#3E7A4C" label="Calendar sources" glyph="calendar" tag={rows ? `${rows.length} saved` : undefined} className="span-6">
        {error && <p className="err">{error}</p>}
        {(counts.stale || counts.soon) ? <p className="nudge">{counts.stale ? `${counts.stale} need rolling over now` : ''}{counts.stale && counts.soon ? ' · ' : ''}{counts.soon ? `${counts.soon} soon` : ''}</p> : null}
        <ul className="sources">
          {(rows || []).map((s) => {
            const st = staleness(s, today)
            return (
              <li key={s.id} className={'source ' + st.state}>
                {editing === s.id ? (
                  <SourceForm initial={{ ...s, covers_until: s.covers_until || '', notes: s.notes || '', url: s.url || '', for_whom: s.for_whom || '' }} members={family.members} draftKey={`source.${s.id}`} onSaved={() => { setEditing(null); reload() }} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="source-t">
                      <b>{s.title}</b>
                      <span>{KIND_NAME[s.kind] || s.kind}{s.for_whom && family.members.find((m) => m.id === s.for_whom) ? ` · ${family.members.find((m) => m.id === s.for_whom).name}’s` : ''}{s.covers_until ? ` · good until ${s.covers_until}` : ''}{s.last_checked_at ? ` · checked ${s.last_checked_at.slice(0, 10)}` : ' · not read yet'}{s.created_at ? ` · added ${addedOn(s.created_at)}` : ''}</span>
                      {s.last_status && <span>{s.last_status}</span>}
                      {s.url && (/^(https?|webcal):\/\//i.test(s.url) ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="source-link">{s.url}</a> : <span className="source-link">{s.url}</span>)}
                    </div>
                    <span className={'state ' + st.state}>{st.state === 'stale' ? 'Needs next year’s' : st.state === 'soon' ? `Runs out in ${st.days} days` : st.state === 'ok' ? 'Current' : 'Ongoing'}</span>
                    <div className="source-b">
                      {FEEDS.includes(s.kind) && s.url
                        ? <button type="button" className="btn ghost" disabled={reading[s.id] === 'Reading…'} onClick={() => readNow(s)}>Read now</button>
                        : <button type="button" className="btn ghost" onClick={async () => { await supabase.from('sources').update({ last_checked_at: new Date().toISOString(), last_status: 'Checked by hand' }).eq('id', s.id); reload() }}>Mark checked</button>}
                      <button type="button" className="btn ghost" onClick={() => setEditing(s.id)}>Edit</button>
                      <button type="button" className="btn ghost" onClick={() => askRemove(s)}>Remove</button>
                    </div>
                    {reading[s.id] && <p className="muted" role="status">{reading[s.id]}</p>}
                  </>
                )}
              </li>
            )
          })}
        </ul>
        {removeNote && <p className="muted" role="status">{removeNote}</p>}
        {removing && (
          <Confirm title={`Remove “${removing.s.title}”?`} yes="Remove it" danger onYes={remove} onNo={() => setRemoving(null)}>
            <p>{removing.count ? `Its ${removing.count} date${removing.count === 1 ? '' : 's'} leave the calendar too, including anything the family changed on them.` : 'It has no dates on the calendar.'} This can’t be undone, but the calendar can be added again.</p>
          </Confirm>
        )}
        {rows && rows.length === 0 && !adding && <p className="muted">Nothing yet. Start with the school calendars: Kordyak (Rialto Unified), Wayne Ruble (Fontana Unified) and SOAR.</p>}
        {adding ? <SourceForm members={family.members} draftKey="source.new" onSaved={() => { setAdding(false); reload() }} onCancel={() => setAdding(false)} /> : <button type="button" className="btn" onClick={() => setAdding(true)}>Add a source</button>}
        <p className="muted">Calendar feeds (iCal, webcal, a Google Calendar’s iCal address) are read every night once the reader is set up, and “Read now” reads one at once. A screenshot, photo or PDF of a calendar goes in below, its dates read by Claude for you to choose from.</p>
      </Card>

      <CalendarFromPicture members={family.members} onAdded={reload} />

      <FamilyDays family={family} today={today} reload={family.reload} />

      <ParishTimes />

      <StationsSetup />

      <Card tint="#8A5BC4" label="Still to come here" glyph="star" className="span-6">
        <ul className="coming">
          {REGISTRY.flatMap((p) => p.setup.filter((x) => !x.ready).map((x) => <li key={p.key + x.key}><b>{p.name}:</b> {x.title}</li>))}
        </ul>
      </Card>
    </>
  )
}
