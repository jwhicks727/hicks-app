import { useEffect, useRef, useState } from 'react'
import { useDraft, hasDraft } from '../../lib/useDraft.js'

// A day that's different, quietly, under a list: "+" opens a field to add
// something just for today; "Skip" offers the reasons to give the list the
// day off (which holds the streak). Each answer goes at once, with an Undo
// (`onToast`). Escape or Cancel puts it away; what's half-typed is kept on
// the device until it's added or cancelled.

export const SKIP_REASONS = ['Sick', 'Away', 'A holiday', 'A busy day']
const BLANK = { title: '' }

/** `L` is useLists(); `memberId` whose list; `canSkip` when there's something left to skip. */
export function DayTools({ L, memberId, part, name, today, canSkip, onToast }) {
  const key = `list.extra.${memberId}.${part}`
  const [open, setOpen] = useState(() => (hasDraft(key) ? 'add' : null)) // 'add' | 'skip' | null
  const [draft, setDraft, clear] = useDraft(key, BLANK)
  const text = draft.title || ''
  const setText = (title) => setDraft({ title })
  const [busy, setBusy] = useState(false)
  const input = useRef(null)
  useEffect(() => { if (open === 'add') input.current?.focus() }, [open])
  useEffect(() => {
    if (!open) return undefined
    const esc = (e) => { if (e.key === 'Escape') { if (open === 'add') clear(); setOpen(null) } }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e) => {
    e.preventDefault()
    const title = text.trim().slice(0, 120)
    if (!title || busy) return
    setBusy(true)
    const c = await L.addChange({ on_date: today, part, kind: 'add', title })
    setBusy(false)
    if (!c) return
    clear(); setOpen(null)
    onToast({ text: `Added “${title}” for today.`, undo: () => L.removeChange(c.id) })
  }
  const skip = async (reason) => {
    setBusy(true)
    const c = await L.addChange({ on_date: today, part, kind: 'rest', note: reason })
    setBusy(false)
    if (!c) return
    setOpen(null)
    onToast({ text: `${name} has today off. The streak waits.`, undo: () => L.removeChange(c.id) })
  }

  if (open === 'add') {
    return (
      <form className="dl-tools-add" onSubmit={add}>
        <input ref={input} value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder="Just for today…" aria-label={`Add to ${name}, just for today`} />
        <button type="submit" className="btn" disabled={!text.trim() || busy}>Add</button>
        <button type="button" className="dl-link" onClick={() => { clear(); setOpen(null) }}>Cancel</button>
      </form>
    )
  }
  if (open === 'skip') {
    return (
      <div className="dl-tools-skip" role="group" aria-label={`Skip ${name} today`}>
        <span>Skip today’s {name}:</span>
        {SKIP_REASONS.map((r) => <button key={r} type="button" className="dl-mini" disabled={busy} onClick={() => skip(r)}>{r}</button>)}
        <button type="button" className="dl-link" onClick={() => setOpen(null)}>Cancel</button>
      </div>
    )
  }
  return (
    <div className="dl-tools">
      <button type="button" className="dl-tool" onClick={() => setOpen('add')} aria-label={`Add something to ${name}, just for today`} title="Add something just for today">+</button>
      {canSkip && <button type="button" className="dl-tool" onClick={() => setOpen('skip')}>Skip</button>}
    </div>
  )
}
