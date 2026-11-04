import { useEffect, useRef, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import Dropzone from '../ui/Dropzone.jsx'
import { Toast } from '../ui/Toast.jsx'
import { useSession } from '../lib/auth.js'
import { useDraft } from '../lib/useDraft.js'
import { useKeepsakes, addKeepsakeFile, addKeepsakeNote, removeKeepsake } from '../lib/useKeepsakes.js'
import { diffDays } from '../lib/cal/dates.js'

/**
 * A concert's own cards: its ticket, kept where we can find it on the night (a photo, a screenshot or the
 * PDF), the days until it, and afterwards a scrapbook of photos and a few words. Taking something out happens
 * at once, with an Undo.
 */
export default function Keepsakes({ ev, me, today }) {
  const session = useSession()
  const k = useKeepsakes(session, ev.id)
  const [busy, setBusy] = useState(null), [err, setErr] = useState(null)
  const [gone, setGone] = useState(null) // a keepsake taken out, for the length of its Undo
  const [note, setNote, clearNote] = useDraft(`keepsake.${ev.id}`, { words: '' })
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const days = diffDays(today, ev.starts_on)
  const rows = k.rows.filter((r) => !gone || r.id !== gone.id)
  const ticket = rows.filter((r) => r.kind === 'ticket').at(-1)
  const book = rows.filter((r) => r.kind !== 'ticket')
  const mine = (r) => me && (r.added_by === me.id || me.role === 'parent')
  if (k.error === 'setup') return <Card tint="#8A5BC4" label="Ticket and scrapbook" glyph="star" className="span-6"><p className="muted">The ticket and scrapbook need the newest migration run (concert keepsakes).</p></Card>

  async function add(kind, files) {
    if (!me) return
    setErr(null)
    for (const [i, f] of files.slice(0, kind === 'ticket' ? 1 : 12).entries()) {
      if (!/^image\//.test(f.type) && f.type !== 'application/pdf') { setErr('A picture or a PDF, please.'); continue }
      setBusy(files.length > 1 ? `Keeping ${i + 1} of ${files.length}…` : 'Keeping it…')
      const { error } = await addKeepsakeFile(ev.id, kind, f, me.id)
      if (error) { setErr(error); break }
    }
    setBusy(null); k.reload()
  }
  async function keepNote() {
    if (!note.words.trim() || !me) return
    setBusy('Keeping it…')
    const { error } = await addKeepsakeNote(ev.id, note.words, me.id)
    setBusy(null)
    if (error) { setErr(error.message); return }
    clearNote(); k.reload()
  }
  function takeOut(r) {
    setGone(r)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => { await removeKeepsake(r); setGone(null); k.reload() }, 7000)
  }
  function undo() { clearTimeout(timer.current); setGone(null) }
  const file = (r, cls) => {
    const url = k.urls[r.path]
    if (!url) return null
    return r.path.endsWith('.pdf')
      ? <a className="btn ghost" href={url} target="_blank" rel="noopener noreferrer">Open the {r.kind === 'ticket' ? 'ticket' : 'PDF'} ›</a>
      : <a href={url} target="_blank" rel="noopener noreferrer" className={cls}><img src={url} alt={r.kind === 'ticket' ? 'The ticket' : 'A photo from the show'} loading="lazy" /></a>
  }
  return (
    <>
      <Card tint="#C45C9A" label="The ticket" glyph="star" tag={days > 0 ? `in ${days} ${days === 1 ? 'day' : 'days'}` : days === 0 ? 'tonight' : undefined} className="span-3 ks-ticket">
        {ticket ? (
          <>
            {file(ticket, 'ks-ticket-pic')}
            {mine(ticket) && <button type="button" className="btn ghost" onClick={() => takeOut(ticket)}>Take it out</button>}
          </>
        ) : (
          <>
            <p className="muted">Keep the ticket here, so it’s one tap away on the night: a photo, a screenshot, or the PDF.</p>
            {me && <Dropzone accept="image/*,application/pdf" label="The ticket" hint="Drop it here, or choose it." onFiles={(fs) => add('ticket', fs)} disabled={Boolean(busy)} />}
          </>
        )}
      </Card>
      <Card tint="#8A5BC4" label="The scrapbook" glyph="star" tag={book.length ? `${book.length} kept` : undefined} className="span-3 ks-book">
        {days > 0 && !book.length && <p className="muted">After the show, add photos and a few words: the setlist, who we went with, the best moment.</p>}
        {book.length > 0 && (
          <ul className="ks-items">
            {book.map((r) => (
              <li key={r.id} className={r.kind === 'note' ? 'ks-note' : 'ks-photo'}>
                {r.kind === 'note' ? <p className="pre-line">{r.words}</p> : file(r, 'ks-pic')}
                {mine(r) && <button type="button" className="ks-x" aria-label="Take this out" onClick={() => takeOut(r)}>✕</button>}
              </li>
            ))}
          </ul>
        )}
        {me && days <= 1 && (
          <div className="ks-add">
            <Dropzone accept="image/*" multiple label="Photos from the show" hint="Drop them here, or choose them." onFiles={(fs) => add('photo', fs)} disabled={Boolean(busy)} />
            <label className="ks-words">A few words
              <textarea rows={3} maxLength={2000} value={note.words} onChange={(e) => setNote({ words: e.target.value })} placeholder="The setlist, who we went with, the best moment" />
            </label>
            <button type="button" className="btn" disabled={!note.words.trim() || Boolean(busy)} onClick={keepNote}>Keep these words</button>
          </div>
        )}
        {busy && <p className="muted" role="status">{busy}</p>}
        {err && <p className="err" role="alert">{err}</p>}
      </Card>
      {gone && <Toast action="Undo" onAction={undo} onClose={() => {}}>{gone.kind === 'ticket' ? 'Ticket taken out.' : 'Taken out of the scrapbook.'}</Toast>}
    </>
  )
}
