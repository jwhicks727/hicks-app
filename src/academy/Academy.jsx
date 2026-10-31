import { useCallback, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { Sheet } from '../ui/Sheet.jsx'
import { useSession } from '../lib/auth.js'
import { useFamily } from '../lib/useCalendar.js'
import { useDraft } from '../lib/useDraft.js'
import { todayAt } from '../lib/cal/dates.js'
import { HOME_TOWN } from '../lib/sky.js'
import { useAcademy, saveSettings, addRooms, saveRoom, saveTask, addTask } from './useAcademy.js'
import { ROOM_KINDS, KIND_ORDER, newRoom, campusSize, moveRoom, kindColours } from './rooms.js'
import IconTile from '../ui/IconTile.jsx'
import { itemSrc } from './items.js'
import { MOVES } from './iso.js'
import { starsThisMonth, taskDay, dueWords, goalProgress, latestByClass, gradeCheer, fame, spotlight } from './school.js'
import Campus from './Campus.jsx'
import RoomPage from './RoomPage.jsx'
import { TasksPage, GoalsPage, GoalPage, GradesPage } from './Work.jsx'
import { FamePage, PicturesPage, CheerSheet } from './Fame.jsx'
import Celebrate from './Celebrate.jsx'
import './academy.css'

// /academy                   the campus: her rooms, today's tasks, goals, grades, cheers
// /academy/room/<id>         a room, to look around, arrange and fill
// /academy/tasks             every task; /academy/goals, /academy/goal/<id>; /academy/grades
// /academy/fame              the Hall of Fame: every trophy, ribbon and cheer
// /academy/pictures          pictures the family has added, each with its licence
// Anna's own school, built room by room. The family builds it with her;
// above all it's for celebrating her: tasks done, goals reached, grades, and
// cheers for anything at all.
export default function Academy({ rest = [] }) {
  const session = useSession()
  const family = useFamily(session)
  const a = useAcademy(session)
  const [moment, setMoment] = useState(null)
  const done = useCallback(() => setMoment(null), [])
  const today = todayAt(HOME_TOWN.tz, new Date())
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const anna = family.members.find((m) => m.role === 'child') || { name: 'Anna' }
  if (!session || (family.loaded && !me)) {
    return (
      <>
        <header className="hero span-6"><span className="kicker">Anna’s school</span><h1 className="greet">The Academy</h1></header>
        <Card tint="#3FA34D" label="Not connected" glyph="star" className="span-6"><p>Anna’s school is kept in the database, and the database isn’t connected on this copy of the app.</p></Card>
      </>
    )
  }
  const colours = (a.settings && a.settings.colours) || []
  const props = { a, me, anna, today, celebrate: setMoment, parent: Boolean(me && me.role === 'parent') }
  let screen
  if (!a.loaded) screen = <header className="hero span-6"><span className="kicker">Anna’s school</span><h1 className="greet">The Academy</h1><p className="sub">Opening the gates…</p></header>
  else if (!a.settings && !a.rooms.length) screen = <Welcome {...props} />
  else if (rest[0] === 'room') screen = <RoomPage id={rest[1]} {...props} />
  else if (rest[0] === 'tasks') screen = <TasksPage {...props} />
  else if (rest[0] === 'goals') screen = <GoalsPage {...props} />
  else if (rest[0] === 'goal') screen = <GoalPage id={rest[1]} {...props} />
  else if (rest[0] === 'grades') screen = <GradesPage {...props} />
  else if (rest[0] === 'fame') screen = <FamePage {...props} />
  else if (rest[0] === 'pictures') screen = <PicturesPage {...props} />
  else screen = <CampusHome {...props} />
  return <div className="academy" style={{ '--ac-dark': colours[0] || '#1C2B22', '--ac-green': colours[1] || '#3FA34D', '--ac-gold': colours[2] || '#F2C14E', display: 'contents' }}>{screen}<Celebrate moment={moment} onDone={done} colours={colours} /></div>
}

/** The first visit: name the school, and pick the rooms to start with. */
function Welcome({ a, anna, celebrate }) {
  const [f, setF, clear] = useDraft('academy.welcome', { name: `${anna.name}’s Academy`, motto: '', picks: ['office', 'classroom', 'hall', 'library', 'courtyard'] })
  const [busy, setBusy] = useState(null)
  const toggle = (k) => setF({ ...f, picks: f.picks.includes(k) ? f.picks.filter((x) => x !== k) : [...f.picks, k] })
  async function open() {
    setBusy('Building…')
    const s = await saveSettings({ name: f.name.trim() || `${anna.name}’s Academy`, motto: f.motto.trim() || null })
    if (s.error) { setBusy(s.error.message); return }
    const rows = []
    const n = campusSize(f.picks.length)
    for (const k of f.picks) rows.push(newRoom(k, rows, n))
    const r = rows.length ? await addRooms(rows) : { error: null }
    if (r.error) { setBusy(r.error.message); return }
    clear(); a.reload()
    celebrate({ title: `Welcome to ${f.name.trim() || 'your academy'}!`, line: `Principal ${anna.name}, your school is open.`, prize: 'graduation-cap', big: true, long: true })
  }
  return (
    <>
      <header className="hero span-6"><span className="kicker">A school of your own</span><h1 className="greet">Welcome, Principal {anna.name}</h1></header>
      <Card tint="#3FA34D" label="Name your school" glyph="star" className="span-6">
        <div className="form">
          <label>Its name<input maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label>A motto, if you like<input maxLength={160} value={f.motto} onChange={(e) => setF({ ...f, motto: e.target.value })} placeholder="Courage, kindness, curiosity" /></label>
        </div>
      </Card>
      <Card tint="#F2C14E" label={`Pick your first rooms (${f.picks.length})`} glyph="star" className="span-6">
        <p className="muted">Any of them, as many as you like. You can add more whenever you want, and move them anywhere.</p>
        <div className="ac-kinds">
          {KIND_ORDER.map((k) => (
            <KindButton key={k} kind={k} pressed={f.picks.includes(k)} onClick={() => toggle(k)} />
          ))}
        </div>
        <div className="form-actions"><button type="button" className="btn ac-gleam" disabled={busy === 'Building…'} onClick={open}>Open the school</button></div>
        {busy && busy !== 'Building…' && <p className="err" role="alert">{busy}</p>}
      </Card>
    </>
  )
}

function CampusHome({ a, anna, today, celebrate, me }) {
  const s = a.settings || {}
  const n = campusSize(a.rooms.length)
  const [arranging, setArranging] = useState(false), [picked, setPicked] = useState(null)
  const [adding, setAdding] = useState(false), [editing, setEditing] = useState(false), [cheering, setCheering] = useState(false)
  const [quick, setQuick] = useState('')
  const stars = starsThisMonth(a.tasks, today)
  const day = taskDay(a.tasks, today)
  const goals = a.goals.filter((g) => !g.done_on).slice(0, 3)
  const grades = latestByClass(a.grades)
  const prizes = fame(a)
  const spot = spotlight(a.cheers, today)
  const room = picked && a.rooms.find((r) => r.id === picked)
  async function tick(t) {
    await saveTask(t.id, { done_on: today })
    a.reload()
    const left = day.today.length + day.late.length - 1
    celebrate({ title: 'A star for you!', line: `${stars + 1} ${stars + 1 === 1 ? 'star' : 'stars'} this month${left > 0 ? `, ${left} to go today` : '. All done for today!'}`, prize: 'glowing-star', big: left <= 0 })
  }
  async function quickAdd(e) {
    e.preventDefault()
    if (!quick.trim()) return
    await addTask({ title: quick.trim().slice(0, 200), due_on: today })
    setQuick(''); a.reload()
  }
  async function move(di, dj) {
    if (!room) return
    const next = moveRoom(room, di, dj, a.rooms, n)
    if (next === room) return
    await saveRoom(room.id, { cx: next.cx, cy: next.cy }); a.reload()
  }
  return (
    <>
      <header className="hero span-6 ac-hero">
        <div className="hero-top"><span className="kicker">{anna.name}’s school</span><button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label="The school’s name, motto and colours"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg></button></div>
        <h1 className="greet">{s.name || `${anna.name}’s Academy`}</h1>
        {s.motto && <p className="ac-motto">{s.motto}</p>}
      </header>
      {spot && (
        <Link to="/academy/fame" className="ac-spot span-6">
          <img src={itemSrc(spot.icon || 'glowing-star')} alt="" width="56" height="56" />
          <span><small>Three cheers for {anna.name}</small><b>{spot.title}</b>{spot.note && <span>{spot.note}</span>}</span>
        </Link>
      )}
      <Card tint="#3FA34D" label="The campus" glyph="star" tag={`${stars} ★ this month`} className="span-4 ac-campus">
        <Campus rooms={a.rooms} n={n} colours={s.colours} stars={stars} newStars={day.done.length} arranging={arranging} selected={picked} name={s.name || 'The academy'} onOpen={(id) => navigate(`/academy/room/${id}`)} onSelect={setPicked} />
        {arranging ? (
          <div className="ac-tools">
            {room ? <span className="ac-tools-t">Moving <b>{room.name}</b></span> : <span className="ac-tools-t">Tap a building to move it</span>}
            {room && <div className="ac-arrows" role="group" aria-label="Move it">{MOVES.map(([k, glyph, label, di, dj]) => <button key={k} type="button" aria-label={label} onClick={() => move(di, dj)}>{glyph}</button>)}</div>}
            <button type="button" className="btn" onClick={() => { setArranging(false); setPicked(null) }}>Done</button>
          </div>
        ) : (
          <div className="ac-tools">
            <button type="button" className="btn" onClick={() => setAdding(true)}>Add a room</button>
            {a.rooms.length > 1 && <button type="button" className="btn ghost" onClick={() => setArranging(true)}>Arrange</button>}
          </div>
        )}
        <nav className="ac-rooms" aria-label="Rooms">
          {a.rooms.map((r) => <Link key={r.id} to={`/academy/room/${r.id}`} style={{ '--k1': kindColours(r.kind)[0], '--k2': kindColours(r.kind)[1] }}><IconTile colours={kindColours(r.kind)} size={30}><img src={itemSrc((ROOM_KINDS[r.kind] || ROOM_KINDS.classroom).sign)} alt="" /></IconTile>{r.name}</Link>)}
        </nav>
      </Card>
      <Card tint="#F2C14E" label="Today" glyph="calendar" tag={day.today.length + day.late.length ? `${day.today.length + day.late.length} to do` : 'All done'} className="span-2">
        <ul className="ac-tasks">
          {[...day.late, ...day.today].slice(0, 6).map((t) => (
            <li key={t.id}><button type="button" className="ac-check" onClick={() => tick(t)} aria-label={`Done: ${t.title}`} /><span><b>{t.title}</b>{(t.subject || t.due_on !== today) && <small className={t.due_on && t.due_on < today ? 'late' : ''}>{[t.subject, t.due_on && t.due_on !== today ? dueWords(t.due_on, today) : null].filter(Boolean).join(' · ')}</small>}</span></li>
          ))}
          {day.done.map((t) => <li key={t.id} className="done"><span className="ac-check on" aria-hidden="true">★</span><span><b>{t.title}</b></span></li>)}
        </ul>
        {!day.today.length && !day.late.length && !day.done.length && <p className="muted">Nothing for today yet.</p>}
        <form className="ac-quick" onSubmit={quickAdd}><input value={quick} maxLength={200} onChange={(e) => setQuick(e.target.value)} placeholder="Add something for today" aria-label="Add something for today" /><button type="submit" className="btn" disabled={!quick.trim()}>Add</button></form>
        <Link to="/academy/tasks" className="ac-more">All tasks{day.coming.length ? ` · ${day.coming.length} coming up` : ''} ›</Link>
      </Card>
      <Card tint="#8A5BC4" label="Goals" glyph="star" className="span-2">
        {goals.length ? <ul className="ac-goals">{goals.map((g) => { const p = goalProgress(g); return <li key={g.id}><Link to={`/academy/goal/${g.id}`}><img src={itemSrc(g.icon || 'rocket')} alt="" width="30" height="30" /><span><b>{g.title}</b><i className="ac-bar"><i style={{ width: `${Math.round(p.ratio * 100)}%` }} /></i><small>{p.total ? `${p.done} of ${p.total} steps` : dueWords(g.due_on, today) || 'Just started'}</small></span></Link></li> })}</ul> : <p className="muted">What would you love to do? Set a goal, break it into steps, and a trophy waits at the end.</p>}
        <Link to="/academy/goals" className="ac-more">{goals.length ? 'All goals' : 'Set a goal'} ›</Link>
      </Card>
      <Card tint="#4A7FD6" label="Grades" glyph="calendar" className="span-2">
        {grades.length ? <ul className="ac-grades">{grades.slice(0, 6).map((g) => { const c = gradeCheer(g, a.grades); return <li key={g.id} className={c ? 'cheer' : ''}><b>{g.mark || `${g.percent}%`}</b><span>{g.class_name}</span>{c && <img src={itemSrc(c.prize)} alt="A cheer" width="20" height="20" />}</li> })}</ul> : <p className="muted">Add a grade when one comes home; the good ones (and the better ones) get celebrated.</p>}
        <Link to="/academy/grades" className="ac-more">{grades.length ? 'All grades' : 'Add a grade'} ›</Link>
      </Card>
      <Card tint="#C9A227" label="Hall of Fame" glyph="star" tag={prizes.length ? `${prizes.length}` : undefined} className="span-2">
        {prizes.length ? <div className="ac-prizes">{prizes.slice(0, 8).map((p) => <img key={p.key} src={itemSrc(p.prize)} alt={p.title} title={p.title} width="40" height="40" />)}</div> : <p className="muted">Every trophy, ribbon and cheer ends up here.</p>}
        <div className="form-actions"><button type="button" className="btn ac-gleam" onClick={() => setCheering(true)}>Cheer {anna.name}</button><Link to="/academy/fame" className="btn ghost">The Hall</Link></div>
      </Card>
      {adding && <AddRoom a={a} n={n} onClose={() => setAdding(false)} celebrate={celebrate} />}
      {editing && <SchoolSettings a={a} onClose={() => setEditing(false)} />}
      {cheering && <CheerSheet a={a} me={me} anna={anna} today={today} celebrate={celebrate} onClose={() => setCheering(false)} />}
    </>
  )
}

/** Any room, from the start. */
function AddRoom({ a, n, onClose, celebrate }) {
  const [busy, setBusy] = useState(null)
  async function add(k) {
    setBusy(k)
    const size = campusSize(a.rooms.length + 1)
    const { data, error } = await addRooms([newRoom(k, a.rooms, Math.max(n, size))])
    if (error) { setBusy(error.message); return }
    a.reload(); onClose()
    celebrate({ title: `A new ${ROOM_KINDS[k].name.toLowerCase()}!`, line: 'Tap it on the campus to go in and make it yours.', prize: ROOM_KINDS[k].sign })
    if (data && data[0]) setTimeout(() => navigate(`/academy/room/${data[0].id}`), 50)
  }
  return (
    <Sheet title="Add a room" onClose={onClose}>
      <div className="ac-kinds">
        {KIND_ORDER.map((k) => (
          <KindButton key={k} kind={k} disabled={Boolean(busy)} onClick={() => add(k)} />
        ))}
      </div>
      {busy && !ROOM_KINDS[busy] && <p className="err" role="alert">{busy}</p>}
    </Sheet>
  )
}

const SCHOOL_COLOURS = [['Wildcats', '#1C2B22', '#3FA34D', '#F2C14E'], ['Isibindi', '#111111', '#2E7D32', '#C9A227'], ['Ocean', '#13315C', '#2EA7C9', '#F6D58E'], ['Sunset', '#4A1E3A', '#E8546B', '#F6B54E'], ['Lavender', '#2E2152', '#8A5BC4', '#F4C7E0'], ['Forest', '#1E2E1C', '#5F8A4A', '#E8C27A']]
const MASCOTS = ['tiger', 'leopard', 'cat', 'black-cat', 'owl', 'dragon', 'unicorn', 'fox', 'panda', 'dolphin', 'lion', 'butterfly']

function SchoolSettings({ a, onClose }) {
  const s = a.settings || {}
  const [f, setF] = useState({ name: s.name || '', motto: s.motto || '', colours: s.colours || SCHOOL_COLOURS[0].slice(1), mascot: s.mascot || 'tiger' })
  const [msg, setMsg] = useState(null)
  async function save() {
    const { error } = await saveSettings({ name: f.name.trim() || 'The Academy', motto: f.motto.trim() || null, colours: f.colours, mascot: f.mascot })
    if (error) { setMsg(error.message); return }
    a.reload(); onClose()
  }
  return (
    <Sheet title="The school" onClose={onClose}>
      <div className="form">
        <label>Its name<input maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Its motto<input maxLength={160} value={f.motto} onChange={(e) => setF({ ...f, motto: e.target.value })} /></label>
        <fieldset className="choice-row"><legend>School colours</legend>
          {SCHOOL_COLOURS.map(([label, ...c]) => <button key={label} type="button" aria-pressed={f.colours.join() === c.join()} onClick={() => setF({ ...f, colours: c })} className="ac-swatch-b"><span className="ac-swatches">{c.map((x) => <i key={x} style={{ background: x }} />)}</span>{label}</button>)}
        </fieldset>
        <fieldset className="choice-row"><legend>Mascot</legend>
          {MASCOTS.map((m) => <button key={m} type="button" aria-pressed={f.mascot === m} onClick={() => setF({ ...f, mascot: m })} aria-label={m}><img src={itemSrc(m)} alt="" width="28" height="28" /></button>)}
        </fieldset>
        <div className="form-actions"><button type="button" className="btn" onClick={save}>Save</button></div>
        {msg && <p className="err" role="alert">{msg}</p>}
        <p className="muted"><Link to="/academy/pictures">Pictures the family has added</Link></p>
      </div>
    </Sheet>
  )
}

/** A kind of room as a button: its picture on a tile of its own colour, its name and what's special about it. */
function KindButton({ kind, pressed, disabled, onClick }) {
  const k = ROOM_KINDS[kind], c = kindColours(kind)
  return (
    <button type="button" className="ac-kind" aria-pressed={pressed} disabled={disabled} onClick={onClick} style={{ '--k1': c[0], '--k2': c[1] }}>
      <IconTile colours={c} size={52} alive><img src={itemSrc(k.sign)} alt="" /></IconTile>
      <b>{k.name}</b>
      <span>{k.blurb}</span>
      {pressed && <i className="ac-kind-tick" aria-hidden="true">✓</i>}
    </button>
  )
}
