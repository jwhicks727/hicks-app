import { useEffect, useRef, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import Tape from '../ui/Tape.jsx'
import { GROUPS, tapesIn, tapeFor, surpriseTape } from '../lib/tapes.js'
import { saveTape } from '../lib/useDrawings.js'

const TINT = '#D9739B'
const WAIT = 700 // a run of taps saves once, the last one: a moment after she stops

/**
 * Choosing the tape a piece hangs with (Anna's ask): every tape in its group, each a tap. A tap shows it on the
 * drawing at once (`onShow`) and saves it a moment after the last tap, so trying ten in a row writes once; leaving
 * saves what's showing. Anyone in the family can choose (`drawing_tapes`). A save that fails says so here, in words.
 */
export default function TapePicker({ d, me, ready, missing, onShow, onDone }) {
  const [now, setNow] = useState(() => tapeFor(d))
  const [state, setState] = useState({ saving: false, msg: null })
  const timer = useRef(null), want = useRef(null), live = useRef(true)

  const flush = async () => {
    clearTimeout(timer.current); timer.current = null
    if (want.current === null) return true
    const id = want.current
    want.current = null
    if (live.current) setState({ saving: true, msg: null })
    const { error } = await saveTape(d.id, id || null, me ? me.id : null)
    if (live.current) setState({ saving: false, msg: error ? `That tape didn’t stick: ${error.message || 'try again'}.` : null })
    return !error
  }
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => { live.current = true; return () => { live.current = false; flushRef.current() } }, [])

  const choose = (t, own = false) => {
    setNow(t)
    onShow(own ? null : t.id)
    want.current = own ? '' : t.id
    clearTimeout(timer.current)
    timer.current = setTimeout(() => flushRef.current(), WAIT)
  }
  const done = async () => { if (await flush()) onDone() }

  if (!ready) {
    return (
      <Card tint={TINT} label="Change the tape" glyph="star" className="span-6">
        <p>{missing
          ? <>The tapes need one step first: a parent runs <b>20261115090000_drawing_tapes</b> (it’s in the repository’s <code>supabase/migrations</code> folder) once, and then any of the family can choose a tape for each piece.</>
          : 'The tapes couldn’t be reached just now. Try again in a moment.'}</p>
        <div className="form-actions"><button type="button" className="btn ghost" onClick={onDone}>Close</button></div>
      </Card>
    )
  }
  const original = tapeFor({ id: d.id }) // the tape it hung with before anyone chose
  return (
    <Card tint={TINT} label="Change the tape" glyph="star" className="span-6 ag-tapes">
      {/* Stays at the top while she scrolls through them all, so the tape she just tapped is always in sight */}
      <div className="ag-tapes-now">
        <Tape tape={now} className="ag-tapes-big" />
        <b className="ag-tapes-name">{now.name}</b>
        <button type="button" className="btn" onClick={done} disabled={state.saving}>{state.saving ? 'Saving…' : 'Done'}</button>
        {now.line && <small>{now.line}</small>}
      </div>
      <div className="ag-actions">
        <button type="button" className="btn ghost" onClick={() => choose(surpriseTape(now.id))}>Surprise me</button>
        {now.id !== original.id ? <button type="button" className="btn ghost" onClick={() => choose(original, true)}>Its first tape ({original.name})</button> : null}
      </div>
      {state.msg && <p className="ag-tapes-msg" role="alert">{state.msg}</p>}
      {GROUPS.map(([g, title]) => (
        <section key={g} className="ag-tapes-group" aria-label={title}>
          <h3>{title}</h3>
          <div className="ag-tapes-grid">
            {tapesIn(g).map((t) => (
              <button key={t.id} type="button" className={'ag-swatch' + (t.id === now.id ? ' on' : '')} aria-pressed={t.id === now.id} onClick={() => choose(t)} style={{ '--tint': t.tint }}>
                <Tape tape={t} className="ag-swatch-tape" />
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <p className="muted small">Every tape is drawn in code for Anna’s Art. The ones for her favourites are nods (colours and shapes), never anyone’s name or picture.</p>
    </Card>
  )
}
