import { useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Link } from '../../shell/Link.jsx'
import { Toast } from '../../ui/Toast.jsx'
import { useSession } from '../../lib/auth.js'
import { useDraft } from '../../lib/useDraft.js'
import { useOutings, saveOuting } from '../../lib/useLife.js'
import { useStay, addBeenOrQueue, flushOutbox } from '../../lib/useStay.js'
import { recaps, stayId, stayWords, queuedFor, parseLines } from '../../lib/stay.js'
import { KINDS, KIND_ORDER, KIND_ONE, townOf, visitedBetween, norm } from '../../lib/been.js'
import { addDays } from '../../lib/cal/dates.js'
import { placeWords } from '../../lib/here.js'
import { TownList, useTownList } from './Been.jsx'
import PhotoReel from '../../parts/PhotoReel.jsx'
import './yonder.css'

// A stay away leaves a recap on Home, named for the town, for a week or until it's
// dismissed (Jason's ask after a day in Temecula): somewhere to go back and add what
// we didn't get to, without being at the table or on the road. The phone remembers
// only the town and the days (src/lib/stay.js); nothing reaches the database until
// something is added, and a place that can't be sent waits on the phone.

const daysOf = (s) => { const out = []; for (let d = s.from; d <= s.last && out.length < 8; d = addDays(d, 1)) out.push(d); return out }
const dayWord = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })

/** Home: a recap for each stay worth one (not the town we're standing in; that has its own list card). */
export default function RecapCards({ here, me, today }) {
  const session = useSession()
  const { stays } = useStay()
  const standing = here && (here.tier === 'away' || here.tier === 'near') ? townOf(here) : null
  const list = recaps(stays, today, standing).slice(0, 2)
  if (!session || !list.length) return null
  return list.map((s) => <Recap key={stayId(s)} stay={s} me={me} session={session} />)
}

function Recap({ stay, me, session }) {
  const t = { town: stay.town, region: stay.region, cc: stay.cc }
  const id = stayId(stay)
  const { outbox, dismiss, restore } = useStay()
  const { list, been } = useTownList(t)
  const outings = useOutings(session)
  const [d, setD, clear] = useDraft(`recap.${id}`, { text: '', kind: 'eat', day: stay.last })
  const [busy, setBusy] = useState(false), [toast, setToast] = useState(null), [err, setErr] = useState(null), [open, setOpen] = useState(false)
  const parent = Boolean(me && me.role === 'parent')
  const went = visitedBetween(list, been.visits, stay.from, stay.last)
  const waiting = queuedFor(outbox, t).filter((q) => q.day >= stay.from && q.day <= stay.last)
  const lines = parseLines(d.text)
  const days = daysOf(stay)
  const day = days.includes(d.day) ? d.day : stay.last
  const kept = (outings.rows || []).find((o) => o.starts_on <= stay.last && o.ends_on >= stay.from && norm(`${o.title} ${o.place || ''}`).includes(norm(stay.town)))
  const where = placeWords(t) || stay.town

  const addAll = async (e) => {
    e.preventDefault()
    if (!lines.length || busy) return
    setBusy(true); setErr(null)
    let queued = 0, bad = null
    for (const name of lines) {
      const r = await addBeenOrQueue(t, { name, kind: d.kind }, day)
      if (r.error) { bad = r.error; break }
      if (r.queued) queued += 1
    }
    setBusy(false)
    if (bad) { setErr(`${bad}. What you typed is still here.`); return }
    clear()
    setToast({ text: queued ? `${lines.length} saved. ${queued === 1 ? 'One is' : `${queued} are`} waiting on this phone and will go as soon as they can.` : `${lines.length === 1 ? 'It is' : `All ${lines.length} are`} on our ${stay.town} list. Rate them below.`, undo: () => setToast(null) })
  }
  const keep = async () => {
    const { error } = await saveOuting({ kind: 'trip', title: stay.town.slice(0, 120), starts_on: stay.from, ends_on: stay.last, place: where.slice(0, 200) }, null, me)
    if (error) { setErr('It couldn’t be kept just now. Try again in a moment.'); return }
    outings.reload()
    setToast({ text: `Kept: ${stay.town}, in the Life List’s trips.`, undo: () => setToast(null) })
  }
  const off = () => { dismiss(id); setToast({ text: `Put ${stay.town} away.`, undo: () => { restore(id); setToast(null) } }) }

  return (
    <Card tint="#C9863F" label={stay.town} glyph="star" tag={stayWords(stay)} className="span-6 yo-been yo-recap">
      <p>You were in {where}. Add what you didn’t get to; nothing here is lost, and you can leave it for later.</p>
      {waiting.length > 0 && (
        <p className="yo-recap-wait" role="status">{waiting.length === 1 ? '1 place is' : `${waiting.length} places are`} saved on this phone, waiting to be sent: {waiting.map((q) => q.place.name).join(', ')}.{' '}
          <button type="button" className="yo-linklike" onClick={async () => { const n = await flushOutbox(); setToast({ text: n ? `${n} sent.` : 'Still can’t reach the family’s database. They’re safe here, and it will keep trying.', undo: () => setToast(null) }) }}>Send now</button></p>
      )}
      {went.length > 0 && <TownList t={t} list={went} visits={been.visits} />}
      {!went.length && !waiting.length && <p className="muted">Nothing recorded yet for {where}.</p>}
      <PhotoReel town={stay.town} region={stay.region} from={stay.from} last={stay.last} />

      {open ? (
        <form className="yo-been-add" onSubmit={addAll}>
          <label className="yo-field">Places we went, one on each line
            <textarea rows={5} value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} placeholder={'Wilson Creek Winery\nPechanga Grill\nOld Town Spice Merchants'} />
          </label>
          <fieldset className="choice-row yo-kinds"><legend>What kind</legend>
            {KIND_ORDER.map((k) => <button key={k} type="button" aria-pressed={d.kind === k} onClick={() => setD({ ...d, kind: k })}>{KIND_ONE[k]}</button>)}
          </fieldset>
          {days.length > 1 && (
            <label className="yo-field">Which day
              <select value={day} onChange={(e) => setD({ ...d, day: e.target.value })}>{days.map((x) => <option key={x} value={x}>{dayWord(x)}</option>)}</select>
            </label>
          )}
          <div className="form-actions">
            <button type="submit" className="btn" disabled={busy || !lines.length}>{busy ? 'Adding…' : lines.length > 1 ? `Add these ${lines.length}` : 'Add it'}</button>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Close</button>
            {d.text && <button type="button" className="btn ghost" onClick={() => clear()}>Clear</button>}
          </div>
          <p className="muted small">They go in as “{KINDS[d.kind]}”; rate them and add notes in the list above once they’re in. Half-typed words are kept on this phone.</p>
          {err && <p className="err" role="alert">{err}</p>}
        </form>
      ) : <button type="button" className="btn ghost" onClick={() => setOpen(true)}>+ Add places we went</button>}
      {err && !open && <p className="err" role="alert">{err}</p>}

      <div className="form-actions">
        {kept ? <Link className="btn ghost" to={`/yonder/trip/${kept.id}`}>It’s a kept trip: open its scrapbook ›</Link>
          : parent ? <button type="button" className="btn ghost" onClick={keep}>Keep {stay.town} as a trip</button>
            : <span className="muted small">Jason or Laurie can keep it as a trip.</span>}
        <button type="button" className="btn ghost" onClick={off}>Not for the scrapbook: put it away</button>
      </div>
      <p className="muted small">This recap is kept on this phone for a week, then goes by itself. It remembers only the town and the days, never where you were.</p>
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </Card>
  )
}
