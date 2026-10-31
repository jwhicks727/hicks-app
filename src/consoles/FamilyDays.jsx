import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useDraft, hasDraft } from '../lib/useDraft.js'
import { upcoming } from '../lib/cal/family.js'
import { MONTHS, daysInMonth } from '../lib/cal/dates.js'
import { Card } from '../ui/Card.jsx'
import { Confirm } from '../ui/Confirm.jsx'

const EMPTY = { title: '', month: '', day: '', year: '', kind: 'celebrate', for_whom: '', note: '' }

function DayForm({ initial, members, draftKey, onSaved, onCancel }) {
  const [f, setF, clearDraft] = useDraft(draftKey, initial)
  const [err, setErr] = useState(null)
  const max = f.month ? daysInMonth(2028, Number(f.month)) : 31 // a leap year, so February 29 can be kept
  async function save(e) {
    e.preventDefault()
    const row = { title: f.title.trim(), month: Number(f.month), day: Number(f.day), year: f.year ? Number(f.year) : null, kind: f.kind, for_whom: f.for_whom || null, note: f.note.trim() || null }
    if (row.day > daysInMonth(2028, row.month)) { setErr(`${MONTHS[row.month - 1]} has no day ${row.day}.`); return }
    const { error } = initial.id ? await supabase.from('family_days').update(row).eq('id', initial.id) : await supabase.from('family_days').insert(row)
    if (error) setErr(error.message); else { clearDraft(); onSaved() }
  }
  return (
    <form className="form" onSubmit={save}>
      <label>What it is<input required maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Anna’s birthday, our wedding anniversary…" /></label>
      <div className="form-row three">
        <label>Month<select required value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}><option value="">Month…</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
        <label>Day<input required type="number" inputMode="numeric" min={1} max={max} value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></label>
        <label>Year<input type="number" inputMode="numeric" min={1900} max={2200} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} placeholder="Optional" /></label>
      </div>
      <fieldset className="choice-row"><legend>How we keep it</legend>
        {[['celebrate', 'Celebrate it big'], ['remember', 'Remember gently']].map(([k, l]) => <button key={k} type="button" aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k })}>{l}</button>)}
      </fieldset>
      <label>Whose day<select value={f.for_whom || ''} onChange={(e) => setF({ ...f, for_whom: e.target.value })}><option value="">The whole family</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label>A line to show under it<input maxLength={200} value={f.note || ''} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={f.kind === 'remember' ? 'Remembering…' : 'Optional: the years are counted for you'} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions">
        <button type="submit" className="btn">{initial.id ? 'Save' : 'Add the day'}</button>
        <button type="button" className="btn ghost" onClick={() => { clearDraft(); onCancel() }}>Cancel</button>
      </div>
    </form>
  )
}

/** Setup: the family's own days. Kept only in the database; parents keep them. */
export default function FamilyDays({ family, today, reload }) {
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(() => hasDraft('family-day.new'))
  const [removing, setRemoving] = useState(null)
  const list = upcoming(today, family.days, family.days.length)
  const whose = (id) => family.members.find((m) => m.id === id)?.name
  return (
    <Card tint="#E0662F" label="Family days" glyph="star" tag={family.loaded ? `${family.days.length} kept` : undefined} className="span-6">
      <p className="muted">Birthdays, anniversaries and the days we remember. They’re celebrated on Home and in the calendar, and stay inside the app.</p>
      {family.error && <p className="err">{family.error}</p>}
      <ul className="sources">
        {list.map((d) => (
          <li key={d.id} className={'source fam-src k-' + d.kind}>
            {editing === d.id ? (
              <DayForm initial={{ ...EMPTY, ...d, month: String(d.month), day: String(d.day), year: d.year ? String(d.year) : '', for_whom: d.for_whom || '', note: d.note || '' }} members={family.members} draftKey={`family-day.${d.id}`} onSaved={() => { setEditing(null); reload() }} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <div className="source-t">
                  <b>{d.title}</b>
                  <span>{MONTHS[d.month - 1]} {d.day}{d.year ? `, ${d.year}` : ''}{whose(d.for_whom) ? ` · ${whose(d.for_whom)}’s` : ''} · {d.inDays === 0 ? 'today' : d.inDays === 1 ? 'tomorrow' : `in ${d.inDays} days`}{d.line ? ` · ${d.line}` : ''}</span>
                </div>
                <div className="source-b">
                  <button type="button" className="btn ghost" onClick={() => setEditing(d.id)}>Edit</button>
                  <button type="button" className="btn ghost" onClick={() => setRemoving(d)}>Remove</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {family.loaded && family.days.length === 0 && !adding && <p className="muted">None yet.</p>}
      {adding
        ? <DayForm initial={EMPTY} members={family.members} draftKey="family-day.new" onSaved={() => { setAdding(false); reload() }} onCancel={() => setAdding(false)} />
        : <button type="button" className="btn" onClick={() => setAdding(true)}>Add a family day</button>}
      {removing && (
        <Confirm title={`Remove ${removing.title}?`} yes="Remove it" danger
          onNo={() => setRemoving(null)}
          onYes={async () => { const { error } = await supabase.from('family_days').delete().eq('id', removing.id); setRemoving(null); if (!error) reload() }}>
          <p>It comes off Home and the calendar. You can add it again any time.</p>
        </Confirm>
      )}
    </Card>
  )
}
