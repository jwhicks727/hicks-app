import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSession } from '../lib/auth.js'
import { useSources, todayAtHome } from '../lib/useSources.js'
import { SOURCE_KINDS, guessKind, staleness } from '../lib/sources.js'
import { REGISTRY } from '../registry.js'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'

const KIND_NAME = Object.fromEntries(SOURCE_KINDS.map(([k, n]) => [k, n]))
const EMPTY = { title: '', url: '', kind: '', covers_until: '', remind_days: 30, notes: '' }

function SourceForm({ initial, onSaved, onCancel }) {
  const [f, setF] = useState(initial || EMPTY)
  const [err, setErr] = useState(null)
  const kind = f.kind || guessKind(f.url) || ''
  async function save(e) {
    e.preventDefault()
    const row = { title: f.title.trim(), url: f.url.trim() || null, kind: kind || 'other', covers_until: f.covers_until || null, remind_days: Number(f.remind_days) || 30, notes: f.notes.trim() || null }
    const q = initial?.id ? supabase.from('sources').update(row).eq('id', initial.id) : supabase.from('sources').insert(row)
    const { error } = await q
    if (error) setErr(error.message); else onSaved()
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
      <div className="form-row">
        <label>Good until<input type="date" value={f.covers_until || ''} onChange={(e) => setF({ ...f, covers_until: e.target.value })} /></label>
        <label>Remind me<select value={f.remind_days} onChange={(e) => setF({ ...f, remind_days: e.target.value })}>{[14, 30, 45, 60].map((d) => <option key={d} value={d}>{d} days before</option>)}</select></label>
      </div>
      <label>Notes<textarea rows={2} maxLength={4000} value={f.notes || ''} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Where to find next year’s, who sends it…" /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions">
        <button type="submit" className="btn">{initial?.id ? 'Save' : 'Add source'}</button>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

export default function Setup() {
  const session = useSession()
  const { rows, error, reload } = useSources(session)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const today = todayAtHome()

  if (!supabase || session === null) {
    return (
      <>
        <header className="hero span-6"><span className="kicker">Team Hicks</span><h1 className="greet">Setup</h1></header>
        <Card tint="#453644" label="Sign in first" glyph="star" className="span-6">
          <p>Setup is for Jason and Laurie. <Link to="/settings">Sign in from Settings</Link>.</p>
        </Card>
      </>
    )
  }
  const counts = (rows || []).reduce((a, s) => { const st = staleness(s, today).state; a[st] = (a[st] || 0) + 1; return a }, {})
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Team Hicks · parents</span>
        <h1 className="greet">Setup</h1>
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
                  <SourceForm initial={{ ...s, covers_until: s.covers_until || '', notes: s.notes || '', url: s.url || '' }} onSaved={() => { setEditing(null); reload() }} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="source-t">
                      <b>{s.title}</b>
                      <span>{KIND_NAME[s.kind] || s.kind}{s.covers_until ? ` · good until ${s.covers_until}` : ''}{s.last_checked_at ? ` · checked ${s.last_checked_at.slice(0, 10)}` : ' · not read yet'}</span>
                      {s.url && (/^(https?|webcal):\/\//i.test(s.url) ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="source-link">{s.url}</a> : <span className="source-link">{s.url}</span>)}
                    </div>
                    <span className={'state ' + st.state}>{st.state === 'stale' ? 'Needs next year’s' : st.state === 'soon' ? `Runs out in ${st.days} days` : st.state === 'ok' ? 'Current' : 'Ongoing'}</span>
                    <div className="source-b">
                      <button type="button" className="btn ghost" onClick={async () => { await supabase.from('sources').update({ last_checked_at: new Date().toISOString(), last_status: 'Checked by hand' }).eq('id', s.id); reload() }}>Mark checked</button>
                      <button type="button" className="btn ghost" onClick={() => setEditing(s.id)}>Edit</button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
        {rows && rows.length === 0 && !adding && <p className="muted">Nothing yet. Start with the school calendars: Kordyak (Rialto Unified), Wayne Ruble (Fontana Unified) and SOAR.</p>}
        {adding ? <SourceForm onSaved={() => { setAdding(false); reload() }} onCancel={() => setAdding(false)} /> : <button type="button" className="btn" onClick={() => setAdding(true)}>Add a source</button>}
        <p className="muted">Reading sources automatically (feeds every night, documents into dates you approve) comes next; for now Setup keeps them and tells you when they go stale.</p>
      </Card>

      <Card tint="#8A5BC4" label="Still to come here" glyph="star" className="span-6">
        <ul className="coming">
          {REGISTRY.flatMap((p) => p.setup.filter((x) => !x.ready).map((x) => <li key={p.key + x.key}><b>{p.name}:</b> {x.title}</li>))}
        </ul>
      </Card>
    </>
  )
}
