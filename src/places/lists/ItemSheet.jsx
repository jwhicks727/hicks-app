import { useState } from 'react'
import { Sheet } from '../../ui/Sheet.jsx'
import { useDraft } from '../../lib/useDraft.js'
import { ruleWords } from '../../lib/routines.js'
import { ITEM_ICONS, ItemIcon } from './icons.jsx'

// Writing or changing one thing on a list: what it is, which list, which days
// (every day, weekdays, weekends, or any of the seven), every week or every
// other, any day or only school days (or days off, from the school calendars
// in Admin), taking turns through a rotation, and for a while only. Kept on
// the device as it's typed (useDraft) until it's saved or cancelled.

const DAYS = [['S', 'Sunday'], ['M', 'Monday'], ['T', 'Tuesday'], ['W', 'Wednesday'], ['T', 'Thursday'], ['F', 'Friday'], ['S', 'Saturday']]
const blank = (part, today) => ({ title: '', part, icon: '', weekdays: [0, 1, 2, 3, 4, 5, 6], every_weeks: 1, school: 'any', turns: '', starts_on: today, ends_on: '' })

export function ItemSheet({ item, part, today, names, schoolName, onSave, onClose, draftKey }) {
  const initial = item
    ? { title: item.title, part: item.part, icon: item.icon || '', weekdays: item.weekdays || [0, 1, 2, 3, 4, 5, 6], every_weeks: item.every_weeks || 1, school: item.school || 'any', turns: (item.turns || []).join('\n'), starts_on: item.starts_on || today, ends_on: item.ends_on || '' }
    : blank(part, today)
  const [f, setF, clear] = useDraft(draftKey, initial)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (patch) => setF({ ...f, ...patch })
  const days = new Set(f.weekdays)
  const toggleDay = (d) => { const s = new Set(days); if (s.has(d)) s.delete(d); else s.add(d); if (s.size) set({ weekdays: [...s].sort() }) }
  const turns = f.turns.split('\n').map((x) => x.trim()).filter(Boolean)
  const preview = ruleWords({ weekdays: f.weekdays, every_weeks: +f.every_weeks, school: f.school, turns, ends_on: f.ends_on || null })

  async function save(e) {
    e.preventDefault()
    const title = f.title.trim()
    if (!title) { setErr('What is it? A few words will do.'); return }
    if (turns.length === 1) { setErr('Taking turns needs two or more, one on each line (or leave it empty).'); return }
    if (f.ends_on && f.ends_on < (f.starts_on || today)) { setErr('It can’t end before it starts.'); return }
    setBusy(true)
    const row = { title: title.slice(0, 120), part: f.part, icon: f.icon || null, weekdays: f.weekdays, every_weeks: +f.every_weeks || 1, school: f.school, turns: turns.slice(0, 12).map((t) => t.slice(0, 100)), ends_on: f.ends_on || null }
    // Every other week and taking turns count from the day the rule is saved (a new thing starts today)
    if (!item || +f.every_weeks !== (item.every_weeks || 1) || turns.join('|') !== (item.turns || []).join('|')) row.starts_on = today
    const problem = await onSave(row)
    setBusy(false)
    if (problem) { setErr(problem); return }
    clear(); onClose()
  }

  return (
    <Sheet title={item ? 'Change it' : `Add to ${names[part]}`} onClose={onClose} className="dl-sheet">
      <form className="form dl-form" onSubmit={save}>
        <label>What is it
          <input required maxLength={120} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder={f.part === 'evening' ? 'Lay out tomorrow’s clothes' : 'Make the bed'} autoFocus={!item} />
        </label>
        <fieldset className="choice-row"><legend>Which list</legend>
          {['morning', 'evening'].map((p) => <button key={p} type="button" aria-pressed={f.part === p} onClick={() => set({ part: p })}>{names[p]}</button>)}
        </fieldset>
        <fieldset className="choice-row dl-days"><legend>Which days</legend>
          {DAYS.map(([l, name], d) => <button key={d} type="button" aria-pressed={days.has(d)} aria-label={name} onClick={() => toggleDay(d)}>{l}</button>)}
          <span className="dl-quick">
            <button type="button" className="dl-link" onClick={() => set({ weekdays: [0, 1, 2, 3, 4, 5, 6] })}>Every day</button>
            <button type="button" className="dl-link" onClick={() => set({ weekdays: [1, 2, 3, 4, 5] })}>Weekdays</button>
            <button type="button" className="dl-link" onClick={() => set({ weekdays: [0, 6] })}>Weekends</button>
          </span>
        </fieldset>
        <div className="form-row">
          <label>How often
            <select value={f.every_weeks} onChange={(e) => set({ every_weeks: +e.target.value })}>
              <option value={1}>Every week</option><option value={2}>Every other week</option><option value={3}>Every three weeks</option><option value={4}>Every four weeks</option>
            </select>
          </label>
          <label>School or not
            <select value={f.school} onChange={(e) => set({ school: e.target.value })}>
              <option value="any">Any day</option><option value="school">School days only</option><option value="off">Days off only</option>
            </select>
          </label>
        </div>
        {f.school !== 'any' && <p className="muted small">{schoolName ? `From ${schoolName}’s calendar in Admin: its days off (and weekends) aren’t school days.` : 'There’s no school calendar for this person in Admin yet, so every weekday counts as a school day.'}</p>}
        <label>Taking turns <span className="muted">(optional: one per line; each day it comes up, the next one)</span>
          <textarea rows={3} value={f.turns} onChange={(e) => set({ turns: e.target.value })} placeholder={'Bedroom\nBathroom\nDesk'} />
        </label>
        <div className="form-row">
          <label>Until <span className="muted">(optional)</span><input type="date" value={f.ends_on} min={today} onChange={(e) => set({ ends_on: e.target.value })} /></label>
          <label>A picture
            <select value={f.icon} onChange={(e) => set({ icon: e.target.value })}>
              <option value="">None</option>
              {Object.entries(ITEM_ICONS).map(([k, [name]]) => <option key={k} value={k}>{name}</option>)}
            </select>
          </label>
        </div>
        <p className="dl-preview">{f.icon && <ItemIcon name={f.icon} />}<span><b>{f.title.trim() || 'It'}</b>: {preview}{f.every_weeks > 1 || turns.length ? ', counting from the day it’s saved' : ''}.</span></p>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={busy}>{item ? 'Save' : 'Add it'}</button>
          <button type="button" className="btn ghost" onClick={() => { clear(); onClose() }}>Cancel</button>
        </div>
      </form>
    </Sheet>
  )
}
