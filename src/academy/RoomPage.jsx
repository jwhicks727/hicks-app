import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { Sheet } from '../ui/Sheet.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { saveRoom, removeRoom, useAssetUrls, saveTask } from './useAcademy.js'
import { ROOM_KINDS, FLOORS, WALLS, ROOM_N, moveItem } from './rooms.js'
import { ITEMS, ITEM, CATEGORIES, itemSrc } from './items.js'
import { MOVES } from './iso.js'
import { taskDay, goalProgress, fame, menuFor, dueWords } from './school.js'
import RoomScene from './RoomScene.jsx'
import ZoomView from './ZoomView.jsx'

// A room of the academy: look around (tap a thing and it hops), arrange it
// (tap a thing, then the arrows, size, flip and colour; or drag it), add
// anything from the catalog or the family's own pictures, and change the
// room's walls, floor and name. Changes save as they're made.
const HUES = [0, 45, 90, 150, 210, 280]

export default function RoomPage({ id, a, today, celebrate, atmos }) {
  const room = a.rooms.find((r) => r.id === id)
  const kind = room ? ROOM_KINDS[room.kind] || ROOM_KINDS.classroom : null
  const [items, setItems] = useState(room ? room.items || [] : [])
  const [arranging, setArranging] = useState(false), [picked, setPicked] = useState(null)
  const [catalog, setCatalog] = useState(false), [look, setLook] = useState(false), [gone, setGone] = useState(false)
  const [saved, setSaved] = useState(null), [prize, setPrize] = useState(null)
  const timer = useRef(null), pending = useRef(null)
  const urls = useAssetUrls(a.assets)
  useEffect(() => { if (room) setItems(room.items || []) }, [room && room.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // Save a moment after the last change, and on the way out
  const flush = () => { if (pending.current) { const p = pending.current; pending.current = null; saveRoom(p.id, { items: p.items }).then(({ error }) => setSaved(error ? error.message : 'Saved')) } }
  useEffect(() => () => { clearTimeout(timer.current); flush() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const change = (next) => { setItems(next); pending.current = { id: room.id, items: next }; setSaved(null); clearTimeout(timer.current); timer.current = setTimeout(flush, 700) }

  if (!room) return (<><header className="hero span-6"><Crumb to="/academy">The Academy</Crumb><h1 className="greet">Not here</h1></header><Card tint="#3FA34D" label="This room isn’t on the campus" glyph="star" className="span-6"><p className="muted">It may have been taken down.</p></Card></>)

  const it = picked && items.find((x) => x.id === picked)
  const set = (patch) => it && change(items.map((x) => (x.id === it.id ? { ...x, ...patch } : x)))
  const urlFor = (assetId) => { const as = a.assets.find((x) => x.id === assetId); return as ? urls[as.path] : null }
  const extras = {
    today,
    tasks: (() => { const d = taskDay(a.tasks, today); return [...d.late, ...d.today, ...d.done] })(),
    goals: a.goals.map((g) => ({ ...g, ratio: goalProgress(g).ratio })),
    fame: fame(a),
  }
  const drop = (itemId, cell) => { if (cell) change(items.map((x) => (x.id === itemId ? { ...x, i: cell.i, j: cell.j } : x))) }
  const add = (k) => {
    const free = []
    for (let i = 0; i < ROOM_N; i++) for (let j = 0; j < ROOM_N; j++) if (!items.some((x) => x.i === i && x.j === j)) free.push({ i, j })
    const spot = free.sort((p, q) => Math.abs(p.i - 2.5) + Math.abs(p.j - 2.5) - (Math.abs(q.i - 2.5) + Math.abs(q.j - 2.5)))[0] || { i: 3, j: 3 }
    const next = { id: `${k.replace(/[^a-z0-9]/gi, '').slice(0, 12)}-${Date.now().toString(36)}`, k, i: spot.i, j: spot.j, s: 1 }
    change([...items, next].slice(0, 120)); setPicked(next.id); setArranging(true); setCatalog(false)
  }
  const day = taskDay(a.tasks, today)
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/academy">The Academy</Crumb>
        <span className="kicker">{kind.name}</span>
        <h1 className="greet">{room.name}</h1>
      </header>
      <Card tint="#3FA34D" label={arranging ? 'Arranging' : 'Look around'} glyph="star" tag={saved || undefined} className="span-6 ac-room">
        <ZoomView pan={!arranging}><RoomScene room={room} kind={kind} items={items} arranging={arranging} selected={picked} onSelect={setPicked} onDrop={drop} urlFor={urlFor} onPrize={setPrize} extras={extras} id={'r' + room.id.slice(0, 6)} atmos={atmos} assetOf={(assetId) => a.assets.find((x) => x.id === assetId) || null} /></ZoomView>
        {atmos && atmos.pretend && <p className="ac-sky">A pretend sky, just for now.</p>}
        {arranging ? (
          <div className="ac-edit">
            {it ? (
              <>
                <span className="ac-tools-t"><img src={it.k.startsWith('a:') ? urlFor(it.k.slice(2)) || '' : itemSrc(it.k)} alt="" width="26" height="26" /><b>{(ITEM[it.k] || a.assets.find((x) => `a:${x.id}` === it.k) || { name: 'Picture' }).name}</b></span>
                <div className="ac-arrows" role="group" aria-label="Move it">{MOVES.map(([k, glyph, label, di, dj]) => <button key={k} type="button" aria-label={label} onClick={() => set(moveItem(it, di, dj))}>{glyph}</button>)}</div>
                <div className="ac-edit-b">
                  <button type="button" className="btn ghost" onClick={() => set({ s: Math.max(0.5, Math.round(((it.s || 1) - 0.15) * 100) / 100) })} aria-label="Smaller">−</button>
                  <button type="button" className="btn ghost" onClick={() => set({ s: Math.min(2.2, Math.round(((it.s || 1) + 0.15) * 100) / 100) })} aria-label="Bigger">+</button>
                  <button type="button" className="btn ghost" onClick={() => set({ f: !it.f })}>Flip</button>
                  <button type="button" className="btn ghost" onClick={() => set({ h: HUES[(HUES.indexOf(it.h || 0) + 1) % HUES.length] || undefined })}>Colour</button>
                  <button type="button" className="btn ghost danger-t" onClick={() => { change(items.filter((x) => x.id !== it.id)); setPicked(null) }}>Take out</button>
                </div>
              </>
            ) : <span className="ac-tools-t">Tap something to move it, or drag it.</span>}
            <div className="ac-edit-b">
              <button type="button" className="btn" onClick={() => setCatalog(true)}>Add something</button>
              <button type="button" className="btn ghost" onClick={() => { setArranging(false); setPicked(null); clearTimeout(timer.current); flush() }}>Done</button>
            </div>
          </div>
        ) : (
          <div className="ac-tools">
            <button type="button" className="btn" onClick={() => setArranging(true)}>Arrange</button>
            <button type="button" className="btn ghost" onClick={() => setCatalog(true)}>Add something</button>
            <button type="button" className="btn ghost" onClick={() => setLook(true)}>Walls, floor, name</button>
          </div>
        )}
      </Card>
      {kind.detail === 'tasks' && (
        <Card tint="#F2C14E" label="On the board: today" glyph="calendar" className="span-3">
          <ul className="ac-tasks">{[...day.late, ...day.today].map((t) => <li key={t.id}><button type="button" className="ac-check" aria-label={`Done: ${t.title}`} onClick={async () => { await saveTask(t.id, { done_on: today }); a.reload(); celebrate({ title: 'A star for you!', prize: 'glowing-star' }) }} /><span><b>{t.title}</b>{t.due_on && t.due_on !== today && <small className="late">{dueWords(t.due_on, today)}</small>}</span></li>)}</ul>
          {!day.late.length && !day.today.length && <p className="muted">Nothing on the board. <Link to="/academy/tasks">Add a task</Link></p>}
        </Card>
      )}
      {kind.detail === 'goals' && (
        <Card tint="#8A5BC4" label="On the corkboard: goals" glyph="star" className="span-3">
          <ul className="ac-goals">{a.goals.filter((g) => !g.done_on).map((g) => { const p = goalProgress(g); return <li key={g.id}><Link to={`/academy/goal/${g.id}`}><img src={itemSrc(g.icon || 'rocket')} alt="" width="30" height="30" /><span><b>{g.title}</b><i className="ac-bar"><i style={{ width: `${Math.round(p.ratio * 100)}%` }} /></i></span></Link></li> })}</ul>
          <Link to="/academy/goals" className="ac-more">Set a goal ›</Link>
        </Card>
      )}
      {kind.detail === 'fame' && <Card tint="#C9A227" label="On the shelves" glyph="star" className="span-3"><p>{extras.fame.length ? `${extras.fame.length} trophies, ribbons and cheers so far.` : 'Nothing yet: the first goal reached puts a trophy here.'}</p><Link to="/academy/fame" className="ac-more">The whole Hall ›</Link></Card>}
      {kind.detail === 'menu' && <Card tint="#F2C14E" label="Today’s lunch" glyph="star" className="span-3"><p className="ac-menu">{menuFor(today)}</p></Card>}
      {prize && <PrizeSheet p={prize} a={a} urlFor={urlFor} onClose={() => setPrize(null)} />}
      {catalog && <Catalog onPick={add} onClose={() => setCatalog(false)} assets={a.assets} urls={urls} />}
      {look && <RoomLook room={room} kind={kind} onClose={() => setLook(false)} onSave={async (patch) => { await saveRoom(room.id, patch); a.reload(); setLook(false) }} onRemove={() => { setLook(false); setGone(true) }} />}
      {gone && <Confirm title={`Take down ${room.name}?`} yes="Take it down" danger onNo={() => setGone(false)} onYes={async () => { await removeRoom(room.id); a.reload(); navigate('/academy', { replace: true }) }}>The room and everything in it leave the campus. The goals, tasks and trophies stay.</Confirm>}
    </>
  )
}

/** Everything that can go in a room, by kind, and the family's own pictures. */
function Catalog({ onPick, onClose, assets, urls }) {
  const [cat, setCat] = useState('School')
  const [q, setQ] = useState('')
  const cats = [...CATEGORIES.filter((c) => c !== 'Prizes'), ...(assets.length ? ['Ours'] : [])]
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (t) return ITEMS.filter((x) => !x.earned && x.name.toLowerCase().includes(t))
    return cat === 'Ours' ? [] : ITEMS.filter((x) => x.cat === cat && !x.earned)
  }, [cat, q])
  return (
    <Sheet title="Add something" onClose={onClose}>
      <div className="ac-cat">
        <label className="jr-search"><span className="sr">Find something</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find something (a cat, a lamp…)" /></label>
        {!q && <div className="ac-cat-tabs" role="tablist">{cats.map((c) => <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>}
        <div className="ac-cat-grid">
          {list.map((x) => <button key={x.k} type="button" onClick={() => onPick(x.k)}><img src={itemSrc(x.k)} alt="" width="48" height="48" loading="lazy" /><span>{x.name}</span></button>)}
          {cat === 'Ours' && !q && assets.map((x) => <button key={x.id} type="button" onClick={() => onPick(`a:${x.id}`)}>{urls[x.path] ? <img src={urls[x.path]} alt="" width="48" height="48" /> : <span className="ac-blank" />}<span>{x.name}</span></button>)}
        </div>
        {q && !list.length && <p className="muted">Nothing called that yet.</p>}
        <p className="muted small">Pictures: Fluent Emoji by Microsoft (MIT licence), and the family’s own.</p>
      </div>
    </Sheet>
  )
}

function RoomLook({ room, kind, onClose, onSave, onRemove }) {
  const st = room.style || {}
  const [f, setF] = useState({ name: room.name, wall: st.wall || kind.wall, floor: st.floor || kind.floor })
  return (
    <Sheet title="Walls, floor, name" onClose={onClose}>
      <div className="form">
        <label>The room’s name<input maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        {kind.wall !== 'none' && kind.wall !== 'glass' && (
          <fieldset className="choice-row ac-walls"><legend>Walls</legend>
            {WALLS.map((c) => <button key={c} type="button" aria-pressed={f.wall === c} aria-label={c} style={{ background: c }} onClick={() => setF({ ...f, wall: c })} />)}
          </fieldset>
        )}
        <fieldset className="choice-row"><legend>Floor</legend>
          {Object.entries(FLOORS).map(([k, label]) => <button key={k} type="button" aria-pressed={f.floor === k} onClick={() => setF({ ...f, floor: k })}>{label}</button>)}
        </fieldset>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => onSave({ name: f.name.trim() || kind.name, style: { ...st, wall: f.wall, floor: f.floor } })}>Save</button>
          <button type="button" className="btn ghost danger-t" onClick={onRemove}>Take down this room</button>
        </div>
      </div>
    </Sheet>
  )
}

/** One prize from the wall: what it is for, when, and who cheered. */
function PrizeSheet({ p, a, urlFor, onClose }) {
  const cheer = p.kind === 'cheer' && (a.cheers || []).find((c) => 'c' + c.id === p.key)
  return (
    <Sheet title={p.title} onClose={onClose}>
      <div className="ac-prize-sheet">
        <img src={p.prize.startsWith('a:') ? urlFor(p.prize.slice(2)) || '' : itemSrc(p.prize)} alt="" width="96" height="96" />
        <p><b>{p.kind === 'goal' ? 'Goal reached' : p.kind === 'grade' ? 'Report card' : 'A cheer'}</b>{p.on ? ` · ${p.on}` : ''}</p>
        {p.from && <p className="muted">From {p.from}</p>}
        {cheer && cheer.note && <p>{cheer.note}</p>}
        <Link to="/academy/fame" className="ac-more">The whole Hall ›</Link>
      </div>
    </Sheet>
  )
}
