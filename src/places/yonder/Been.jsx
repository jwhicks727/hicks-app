import { useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { Toast } from '../../ui/Toast.jsx'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { useNow } from '../../lib/useNow.js'
import { useDraft } from '../../lib/useDraft.js'
import { useOutings } from '../../lib/useLife.js'
import { useBeen, addBeen, dropBeen, wentAgain, undoVisit, updateBeen, removeBeen, restoreBeen } from '../../lib/useBeen.js'
import { KINDS, KIND_ORDER, KIND_ONE, RATINGS, townOf, findTown, withVisits, byKind, summaryWords, timesWords, matchBeen, kindFromSection, norm } from '../../lib/been.js'
import { mapsSearch } from '../../lib/around.js'
import { placeWords } from '../../lib/here.js'
import { todayAt } from '../../lib/cal/dates.js'
import { HOME_TOWN } from '../../lib/sky.js'
import './yonder.css'

// Our list for each town (Jason's ask): the restaurants, wineries, hikes and things
// we've done there, with what we thought and a note, for next time. Added by one of
// us from the guide, from a hike ticked off, or by hand; never from where a phone has been.

function useMe() {
  const session = useSession()
  const family = useFamily(session)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) || null : null
  return { session, family, me, parent: Boolean(me && me.role === 'parent') }
}
const RATING_MARK = { loved: '♥', good: '✓', 'not-again': '✕' }

/** A small mark on a guide's place we've been to: "♥ Loved · 3×", "✓ Been", "Not again". */
export function BeenBadge({ p }) {
  if (!p) return null
  const label = p.rating === 'not-again' ? 'Not again' : p.rating === 'loved' ? `♥ Loved${p.times > 1 ? ` · ${p.times}×` : ''}` : `✓ Been${p.times > 1 ? ` · ${p.times}×` : ''}`
  return <span className={'yo-been-badge ' + (p.rating || 'been')}>{label}</span>
}

/** The town's list as the screens use it: { t, town, list, been } for a town we're in (or name). */
export function useTownList(t) {
  const { session } = useMe()
  const been = useBeen(session)
  const town = findTown(been.towns, t)
  const list = town ? withVisits(been.places.filter((p) => p.town_id === town.id), been.visits) : []
  return { town, list, been }
}

/** Add a place we went, by hand: its name, what kind, what we thought, a note. Kept as a draft until added. */
export function AddBeen({ t, defaultKind = 'eat', onDone }) {
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const [d, setD, clear] = useDraft(`been.add.${norm(t.town)}`, { name: '', kind: defaultKind, rating: '', note: '' })
  const [busy, setBusy] = useState(false), [toast, setToast] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    if (!d.name.trim() || busy) return
    setBusy(true)
    const r = await addBeen(t, { name: d.name, kind: d.kind, rating: d.rating || null, note: d.note }, today)
    setBusy(false)
    if (r.error) { setToast({ text: r.error, undo: () => setToast(null) }); return }
    const name = d.name.trim()
    clear()
    setToast({ text: `${name} is on our ${t.town} list.`, undo: async () => { if (r.created) await dropBeen(r.id); else await undoVisit(r.id, today); setToast(null) } })
    if (onDone) onDone()
  }
  return (
    <form className="yo-been-add" onSubmit={submit}>
      <label className="yo-field">Where we went<input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="A restaurant, a winery, a hike…" maxLength={100} /></label>
      <fieldset className="choice-row yo-kinds"><legend>What kind</legend>
        {KIND_ORDER.map((k) => <button key={k} type="button" aria-pressed={d.kind === k} onClick={() => setD({ ...d, kind: k })}>{KIND_ONE[k]}</button>)}
      </fieldset>
      <fieldset className="choice-row"><legend>What we thought</legend>
        {Object.entries(RATINGS).map(([k, l]) => <button key={k} type="button" aria-pressed={d.rating === k} onClick={() => setD({ ...d, rating: d.rating === k ? '' : k })}>{RATING_MARK[k]} {l}</button>)}
      </fieldset>
      <label className="yo-field">A note for next time<input value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="Get the fish tacos; dogs welcome on the patio" maxLength={500} /></label>
      <div className="form-actions">
        <button type="submit" className="btn" disabled={busy || !d.name.trim()}>{busy ? 'Adding…' : 'Add it, with today'}</button>
        {(d.name || d.note) && <button type="button" className="btn ghost" onClick={() => clear()}>Cancel</button>}
      </div>
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </form>
  )
}

/** One place on the list: what we thought (tap to change), how often and when, the note, and what to do. */
function BeenRow({ p, t, me, parent, visits, today }) {
  const [editing, setEditing] = useState(false), [note, setNote] = useState(p.note || ''), [toast, setToast] = useState(null)
  const canRemove = parent || (me && p.added_by === me.id)
  return (
    <li className={'yo-been-row ' + (p.rating || '')}>
      <div className="yo-been-main">
        <b>{p.name}</b>
        <small className="fig">{timesWords(p)}</small>
        {!editing && p.note && <button type="button" className="yo-been-note" onClick={() => setEditing(true)}>“{p.note}”</button>}
        {editing && (
          <form className="yo-been-edit" onSubmit={async (e) => { e.preventDefault(); await updateBeen(p.id, { note }); setEditing(false) }}>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} aria-label={`A note on ${p.name}`} autoFocus />
            <button type="submit" className="btn ghost">Save</button>
            <button type="button" className="btn ghost" onClick={() => { setNote(p.note || ''); setEditing(false) }}>Cancel</button>
          </form>
        )}
      </div>
      <div className="yo-been-rate" role="group" aria-label={`What we thought of ${p.name}`}>
        {Object.entries(RATINGS).map(([k, l]) => <button key={k} type="button" className={'yo-rate ' + k} aria-pressed={p.rating === k} aria-label={l} title={l} onClick={() => updateBeen(p.id, { rating: p.rating === k ? null : k })}>{RATING_MARK[k]}</button>)}
      </div>
      <div className="yo-been-go">
        {p.last !== today && <button type="button" className="btn ghost" onClick={async () => { await wentAgain(p.id, today); setToast({ text: `Today added for ${p.name}.`, undo: async () => { await undoVisit(p.id, today); setToast(null) } }) }}>We went today</button>}
        <a className="btn ghost" href={mapsSearch(p.name, t.town)} target="_blank" rel="noopener noreferrer">Directions</a>
        {p.website && <a className="btn ghost" href={p.website} target="_blank" rel="noopener noreferrer">Website</a>}
        {!p.note && !editing && <button type="button" className="btn ghost" onClick={() => setEditing(true)}>Add a note</button>}
        {canRemove && <button type="button" className="icon-btn" aria-label={`Take ${p.name} off the list`} onClick={async () => { const { snapshot } = await removeBeen(p, visits); setToast({ text: `Took ${p.name} off the list.`, undo: async () => { await restoreBeen(snapshot); setToast(null) } }) }}>✕</button>}
      </div>
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </li>
  )
}

export function TownList({ t, list, visits, compact = false }) {
  const { me, parent } = useMe()
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const groups = byKind(list)
  return groups.map((g) => (
    <section key={g.kind} className="yo-been-group" aria-label={g.title}>
      <h3>{g.title}</h3>
      <ul className="yo-been-list">{(compact ? g.places.filter((p) => p.rating !== 'not-again').slice(0, 3) : g.places).map((p) => <BeenRow key={p.id} p={p} t={t} me={me} parent={parent} visits={visits} today={today} />)}</ul>
      {compact && g.places.some((p) => p.rating === 'not-again') && <p className="muted small">Not again: {g.places.filter((p) => p.rating === 'not-again').map((p) => p.name).join(', ')}</p>}
    </section>
  ))
}

/**
 * Home, while we're in a town (away or out and about): our list there, loved first,
 * with "We went today" a tap away, and a place added by hand. A town with no list yet
 * offers to start one.
 */
export function BeenHereCard({ here }) {
  const t = townOf(here)
  const { town, list, been } = useTownList(t)
  const [adding, setAdding] = useState(false)
  if (!t || !been.loaded) return null
  const where = placeWords(t) || t.town
  return (
    <Card tint="#C9863F" label={`Our list in ${where}`} glyph="star" tag={summaryWords(list) || undefined} className="span-6 yo-been">
      {!list.length && <p>For the towns we keep coming back to: where we ate, the wineries, the hikes and what we did, with what we thought, for next time.</p>}
      {list.length > 0 && <TownList t={t} list={list} visits={been.visits} compact />}
      {adding ? <AddBeen t={t} onDone={() => setAdding(false)} /> : <button type="button" className="btn ghost" onClick={() => setAdding(true)}>+ Add a place we went</button>}
      {town && <Link className="btn ghost" to={`/yonder/town/${town.id}`}>The whole {t.town} list ›</Link>}
      <p className="muted small">Places from the guide can be added from their page with “We went here”. Kept for the family; it says the town, never where a phone has been.</p>
    </Card>
  )
}

/** The travel app's home: every town with a list, the most recent first. */
export function BeenTownsCard() {
  const { session } = useMe()
  const been = useBeen(session)
  const towns = been.towns.map((t) => {
    const list = withVisits(been.places.filter((p) => p.town_id === t.id), been.visits)
    return { ...t, list, last: list.reduce((m, p) => (p.last && p.last > m ? p.last : m), '') }
  }).filter((t) => t.list.length).sort((a, b) => b.last.localeCompare(a.last) || a.town.localeCompare(b.town))
  return (
    <Card tint="#C9863F" label="Our places" glyph="star" tag={towns.length ? `${towns.length} ${towns.length === 1 ? 'town' : 'towns'}` : undefined} className="span-3">
      {!towns.length && <p className="muted">A list for each town we keep coming back to: where we ate, the wineries, the hikes, and what we thought. Start one from Home when you’re there.</p>}
      <ul className="yo-trips">{towns.map((t) => <li key={t.id}><Link to={`/yonder/town/${t.id}`}><span><b>{placeWords(t) || t.town}</b><small>{summaryWords(t.list)}</small></span></Link></li>)}</ul>
    </Card>
  )
}

/** /yonder/town/<id>: a town's whole list, by kind, and the trips we kept there. */
export function BeenTownPage({ id }) {
  const { session } = useMe()
  const been = useBeen(session)
  const outings = useOutings(session)
  const town = been.towns.find((x) => x.id === id)
  if (!been.loaded) return <><header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><h1 className="greet">Our list</h1></header><p className="muted span-6">Opening it…</p></>
  if (!town) return <><header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><h1 className="greet">Our list</h1></header><Card tint="#C9863F" label="Not found" className="span-6"><p>No list at this address.</p></Card></>
  const t = { town: town.town, region: town.region, cc: town.cc }
  const list = withVisits(been.places.filter((p) => p.town_id === town.id), been.visits)
  const trips = (outings.rows || []).filter((o) => norm(`${o.title} ${o.place || ''}`).includes(norm(town.town))).sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1))
  return (
    <>
      <header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><span className="kicker">{summaryWords(list) || 'Our list'}</span><h1 className="greet">{placeWords(t) || town.town}</h1></header>
      <Card tint="#C9863F" label="Where we’ve been" glyph="star" className="span-6 yo-been">
        {!list.length && <p className="muted">Nothing on the list yet.</p>}
        <TownList t={t} list={list} visits={been.visits} />
      </Card>
      <Card tint="#8A5A33" label="Add a place we went" glyph="star" className="span-3"><AddBeen t={t} /></Card>
      {trips.length > 0 && <Card tint="#2F7D7A" label={`Trips to ${town.town}`} glyph="calendar" className="span-3"><ul className="yo-trips">{trips.map((o) => <li key={o.id}><Link to={`/yonder/trip/${o.id}`}><span><b>{o.title}</b><small>{o.starts_on}</small></span></Link></li>)}</ul></Card>}
    </>
  )
}

/**
 * On a guide's place: "We went here" (with what we thought), or, for one on our list,
 * how often and when, and "We went today". Hikes ticked off with "We did it" join the list too.
 */
export function BeenButton({ item, section, t, list }) {
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const p = matchBeen(item.name, list)
  const [asking, setAsking] = useState(false), [toast, setToast] = useState(null)
  if (!t) return null
  const add = async (rating) => {
    setAsking(false)
    const r = await addBeen(t, { name: item.name, kind: kindFromSection(section), rating, website: item.website || '' }, today)
    if (r.error) { setToast({ text: r.error, undo: () => setToast(null) }); return }
    setToast({ text: `${item.name} is on our ${t.town} list.`, undo: async () => { if (r.created) await dropBeen(r.id); else await undoVisit(r.id, today); setToast(null) } })
  }
  return (
    <div className="yo-been-here">
      {p ? (
        <p><BeenBadge p={p} /> <span className="muted small">{timesWords(p)}{p.note ? `: “${p.note}”` : ''}</span>{p.last !== today && <> <button type="button" className="btn ghost" onClick={async () => { await wentAgain(p.id, today); setToast({ text: 'Today added.', undo: async () => { await undoVisit(p.id, today); setToast(null) } }) }}>We went today</button></>}</p>
      ) : asking ? (
        <div className="choice-row" role="group" aria-label="What we thought">{Object.entries(RATINGS).map(([k, l]) => <button key={k} type="button" onClick={() => add(k)}>{RATING_MARK[k]} {l}</button>)}<button type="button" onClick={() => add(null)}>Just add it</button></div>
      ) : <button type="button" className="btn ghost" onClick={() => setAsking(true)}>We went here</button>}
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </div>
  )
}

export { KINDS }
