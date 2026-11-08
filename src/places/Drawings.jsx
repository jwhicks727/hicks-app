import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Crumb } from '../shell/Link.jsx'
import { Card } from '../ui/Card.jsx'
import { Toast } from '../ui/Toast.jsx'
import { useSession } from '../lib/auth.js'
import { useFamily } from '../lib/useCalendar.js'
import { useNow } from '../lib/useNow.js'
import { todayAt } from '../lib/cal/dates.js'
import { navigate } from '../lib/router.js'
import { TOPICS, cleanDrawing, drawnWords, tilt, tapeOf } from '../lib/drawings.js'
import { useDrawings, useDrawingUrls, saveDrawing, removeDrawing } from '../lib/useDrawings.js'
import { drawingsInbox } from '../lib/drawingInbox.js'
import { tally } from '../lib/paintingBatch.js'
import { artOf } from '../lib/annasArt.js'
import { clipPathOf, isShaped, shapeName, SHAPES, cleanShape } from '../lib/shapes.js'
import { familiesOf, FAMILIES } from '../lib/artColour.js'
import { MOODS, STYLES, WEATHERS, cleanLooks } from '../lib/gallery.js'
import { Featured, Finder, useWallView, wallOrder } from '../parts/ArtFinder.jsx'
import LookWords from '../parts/LookWords.jsx'
import { writeDrawing } from './useDrawingBatch.js'
import AddDrawings from './AddDrawings.jsx'
import RecropDrawing from './RecropDrawing.jsx'
import LookOverArt from './LookOverArt.jsx'
import './drawings.css'

const TINT = '#D9739B'

// /drawings          Anna's Art: her drawings and paintings, taped to the wall, newest first
// /drawings/<id>     one piece, hung large; its next and previous replace the address
// /drawings/add      adding drawings, one or many at once (src/places/AddDrawings.jsx)
// /drawings/look-again  her art looked over again: what it's made with, shapes, colours, Claude's words (parents)
// The wall shares Laurie's gallery's tools (src/parts/ArtFinder.jsx): a featured wall that changes every few days,
// and finding her pieces by colour, mood, what they show, year, medium (drawn or painted), what they're about and shape.
// Behind sign-in, like Laurie's paintings: the pictures are in a private bucket, read through
// signed links, never in the app's own files (CLAUDE.md, "Anna's drawings"). Anyone in the
// family can add one; whoever added it, or a parent, can change it or take it down.
export default function Drawings({ rest }) {
  const session = useSession()
  const family = useFamily(session)
  const today = todayAt('America/Los_Angeles', useNow())
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  const g = useDrawings()

  // Taking one down happens at once, with an Undo: it leaves the wall now and is deleted for good when the
  // Undo goes by (or when this screen is left), never by asking first.
  const [gone, setGone] = useState({}), [undo, setUndo] = useState(null)
  const pending = useRef(null), reload = useRef(g.reload)
  useEffect(() => { reload.current = g.reload })
  const commit = useCallback(async () => {
    const d = pending.current
    if (!d) return
    pending.current = null
    await removeDrawing(d)
    reload.current()
  }, [])
  useEffect(() => () => { commit() }, [commit])
  const takeDown = async (d) => {
    await commit() // one already showing its Undo goes first
    pending.current = d
    setGone((x) => ({ ...x, [d.id]: true }))
    setUndo({ id: d.id, text: `Took down “${d.title}”.` })
  }
  const undoIt = () => {
    const d = pending.current
    pending.current = null
    if (d) setGone((x) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== d.id)))
    setUndo(null)
  }
  const list = g.list.filter((d) => !gone[d.id])
  const [id] = rest || []
  return (
    <>
      {id === 'add'
        ? (family.loaded && me ? <AddDrawings me={me} members={family.members} g={g} today={today} /> : <header className="hero span-6"><Crumb to="/drawings">Anna’s Art</Crumb><h1 className="greet">…</h1></header>)
        : id === 'look-again' ? <LookOverArt g={g} parent={parent} family={family} today={today} />
          : id ? <DrawingPage id={id} g={g} list={list} me={me} parent={parent} today={today} onTakeDown={takeDown} /> : <Wall g={g} list={list} parent={parent} />}
      {undo && <Toast key={undo.id} action="Undo" onAction={undoIt} onClose={() => { setUndo(null); commit() }}>{undo.text}</Toast>}
    </>
  )
}

function SetupCard() {
  return (
    <Card tint={TINT} label="One step first" glyph="star" className="span-6">
      <p>Anna’s Art keeps her drawings and paintings in the family’s private storage, and the database doesn’t have a place for them yet. A parent runs <b>20261105040000_annas_gallery</b> (it’s in the repository’s <code>supabase/migrations</code> folder) once, and this page works.</p>
    </Card>
  )
}

/** To the adding screen: a plain button, or the shine while photos are waiting there to be checked (anyone's, for a parent). */
function AddDrawingsLink() {
  const [waiting, setWaiting] = useState(null)
  useEffect(() => {
    let live = true
    drawingsInbox.loadInbox().then((items) => { if (live) setWaiting(tally(items)) }, () => {})
    return () => { live = false }
  }, [])
  const n = waiting ? waiting.ready + waiting.saving : 0
  if (n) return <Link to="/drawings/add" className="shine span-6">Photos of her art waiting<span className="n">{n}</span></Link>
  return <div className="span-6 ag-add"><Link to="/drawings/add" className="btn">Add her art</Link></div>
}

/** One of her pieces on its paper, as the wall and the featured wall show it: a shaped one keeps its shape, with no paper round it. */
function Paper({ p }) {
  const clip = clipPathOf(p.shape)
  return (
    <span className={'ag-paper' + (clip ? ' ag-shaped' : '')} data-tape={tapeOf(p.slug)}>
      <span className="ag-tape" aria-hidden="true" />
      {p.small
        ? <img src={p.small} alt={`${p.title}, by Anna`} width={p.w || undefined} height={p.h || undefined} loading="lazy" style={{ aspectRatio: p.w && p.h ? `${p.w} / ${p.h}` : undefined, clipPath: clip || undefined }} />
        : <span className="ag-blank" style={{ aspectRatio: p.w && p.h ? `${p.w} / ${p.h}` : '3 / 2', clipPath: clip || undefined }} />}
    </span>
  )
}

function Wall({ g, list, parent }) {
  const urls = useDrawingUrls(list.map((d) => d.thumb_path || d.path))
  const art = useMemo(() => list.map((d) => artOf(d, urls[d.thumb_path || d.path] || '')), [list, urls])
  const byId = useMemo(() => new Map(list.map((d) => [d.id, d])), [list])
  const { view, setView, shown, n } = useWallView(art, 'drawings')
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Made by Anna</span>
        <h1 className="greet">Anna’s Art</h1>
      </header>
      {g.missing && <SetupCard />}
      {!g.missing && g.error && <Card tint={TINT} label="Couldn’t open it" glyph="star" className="span-6"><p>{g.error}</p></Card>}
      {!g.missing && !g.error && <AddDrawingsLink />}
      {g.loaded && !g.missing && !g.error && !list.length && (
        <Card tint={TINT} label="Nothing hung yet" glyph="star" className="span-6">
          <p>Anna’s drawings and paintings go here, taped up the way they would be on the fridge. Photograph one, crop it close to the paper, and tap <b>Add her art</b>.</p>
        </Card>
      )}
      {art.length >= 4 && <Featured list={art} parent={parent} collection="drawings" Thumb={Paper} to={(p) => '/drawings/' + p.slug} />}
      {art.length > 1 && <Finder list={art} view={view} setView={setView} count={shown.length} collection="drawings" />}
      <section className="ag-wall span-6" aria-label="Anna’s drawings and paintings">
        {shown.map((p) => {
          const d = byId.get(p.slug)
          return (
            <Link key={p.slug} className="ag-piece" to={'/drawings/' + p.slug} style={{ '--tilt': `${tilt(p.slug)}deg` }}>
              <Paper p={p} />
              <b>{p.title}</b>
              <small>{drawnWords(d && d.made_on).replace(/^Drawn /, 'Made ') || 'By Anna'}</small>
            </Link>
          )
        })}
      </section>
      {list.length > 0 && !shown.length && (
        <Card tint={TINT} label="None of them" glyph="star" className="span-6">
          <p>None of her pieces match all of that.</p>
          <button type="button" className="btn ghost" onClick={() => setView({ ...view, f: {} })}>Show them all</button>
        </Card>
      )}
      {list.length > 0 && <p className="ag-note span-6">{n ? `${shown.length} of her ${list.length} pieces.` : list.length === 1 ? 'The first of her pieces on the wall.' : `${list.length} of her pieces on the wall.`} Tap one to see it large.</p>}
      {parent && list.length > 0 && <p className="ag-note span-6"><Link to="/drawings/look-again">Look over her art again ›</Link> What each is made with, the shapes of her papers and canvases, her colours, and what Claude sees in each, for the pieces added before they were kept.</p>}
    </>
  )
}

function DrawingPage({ id, g, list, me, parent, today, onTakeDown }) {
  const i = list.findIndex((x) => x.id === id), d = list[i]
  const urls = useDrawingUrls(d ? [d.path] : [])
  const [editing, setEditing] = useState(false), [recrop, setRecrop] = useState(false)
  if (!d) {
    return (
      <header className="hero span-6">
        <Crumb to="/drawings">Anna’s Art</Crumb>
        <h1 className="greet">{g.loaded ? 'Not one of her pieces' : '…'}</h1>
      </header>
    )
  }
  const canChange = parent || Boolean(me && d.added_by === me.id)
  // The order the wall last showed (its filters and sort), while this piece is in it; else the wall's own
  const o = wallOrder('drawings', d.id)
  const seq = o ? o.map((x) => list.find((y) => y.id === x)).filter(Boolean) : list
  const at = seq.indexOf(d)
  const near = (k) => seq[(at + k + seq.length) % seq.length]
  const art = artOf(d)
  const clip = clipPathOf(art.shape)
  const colours = familiesOf(art.palette).map((k) => FAMILIES[k].label.toLowerCase())
  const looks = art.looks || {}
  const step = (q) => (e) => { e.preventDefault(); setEditing(false); setRecrop(false); navigate('/drawings/' + q.id, { replace: true }) }
  const src = urls[d.path]
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/drawings">Anna’s Art</Crumb>
        <span className="kicker">Made by Anna</span>
        <h1 className="greet">{d.title}</h1>
      </header>
      <div className="ag-hang span-6" style={{ '--tilt': `${tilt(d.id) / 2}deg` }}>
        <div className={'ag-paper' + (clip ? ' ag-shaped' : '')} data-tape={tapeOf(d.id)}>
          <span className="ag-tape" aria-hidden="true" />
          {src
            ? <img src={src} alt={`${d.title}, by Anna`} width={d.width || undefined} height={d.height || undefined} style={{ aspectRatio: d.width && d.height ? `${d.width} / ${d.height}` : undefined, clipPath: clip || undefined }} />
            : <span className="ag-blank" style={{ aspectRatio: d.width && d.height ? `${d.width} / ${d.height}` : '3 / 2', clipPath: clip || undefined }} />}
        </div>
      </div>
      {editing
        ? <EditDrawing d={d} today={today} onDone={() => { setEditing(false); g.reload() }} onCancel={() => setEditing(false)} />
        : recrop
          ? <Card className="span-6" tint={TINT} label="Crop it again" glyph="star"><RecropDrawing drawing={d} onDone={() => { setRecrop(false); g.reload() }} onCancel={() => setRecrop(false)} /></Card>
          : (
          <Card className="span-6" tint={TINT} label="About it" glyph="star">
            <dl className="ag-facts">
              {d.made_on && <div><dt>Made</dt><dd>{drawnWords(d.made_on).replace(/^Drawn /, '')}</dd></div>}
              {d.topic === 'pets' && <div><dt>About</dt><dd><Link to="/pets">{TOPICS.pets}</Link></dd></div>}
              {d.medium && <div><dt>Made with</dt><dd>{d.medium}</dd></div>}
              {isShaped(art.shape) && <div><dt>Its shape</dt><dd>{shapeName(art.shape)}</dd></div>}
              {colours.length > 0 && <div><dt>Its colours</dt><dd>{colours.join(', ')}{art.palette && art.palette.swatches.length ? <span className="painting-swatches" aria-hidden="true">{art.palette.swatches.map((c) => <i key={c} style={{ background: c }} />)}</span> : null}</dd></div>}
              {(looks.subjects?.length > 0 || looks.moods?.length > 0) && <div><dt>What Claude sees</dt><dd>{[...(looks.subjects || []), ...(looks.moods || []).map((m) => (MOODS[m] || m).toLowerCase()), looks.style && (STYLES[looks.style] || '').toLowerCase(), looks.weather && (WEATHERS[looks.weather] || '').toLowerCase()].filter(Boolean).join(', ')}</dd></div>}
              {d.words && <div><dt>In her words</dt><dd className="ag-words">“{d.words}”</dd></div>}
              {!d.made_on && !d.topic && !d.words && <div><dt>By</dt><dd>Anna</dd></div>}
            </dl>
            {canChange && (
              <div className="ag-actions">
                <button type="button" className="btn ghost" onClick={() => setEditing(true)}>Change the details</button>
                {d.original ? <button type="button" className="btn ghost" onClick={() => setRecrop(true)}>Crop it again</button> : <p className="muted small">Its original photo wasn’t kept when it was added, so its crop can’t be changed here.</p>}
                <button type="button" className="btn ghost danger-t" onClick={() => { onTakeDown(d); navigate('/drawings', { replace: true }) }}>Take it down</button>
              </div>
            )}
            {seq.length > 1 && (
              <nav className="place-step" aria-label="Her other pieces">
                <a href={'/drawings/' + near(-1).id} onClick={step(near(-1))}>‹ {near(-1).title}</a>
                <a href={'/drawings/' + near(1).id} onClick={step(near(1))}>{near(1).title} ›</a>
              </nav>
            )}
          </Card>
        )}
    </>
  )
}

/** The words about a drawing: used to add one and to change one. */
function Fields({ f, setF, today }) {
  return (
    <div className="form">
      <label>Its title<input maxLength={120} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What Anna calls it" /></label>
      <div className="form-row">
        <label>The day she drew it (if you know)<input type="date" max={today} value={f.madeOn} onChange={(e) => setF({ ...f, madeOn: e.target.value })} /></label>
        <label>It’s about<select value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>
          <option value="">No topic</option>
          {Object.entries(TOPICS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select></label>
      </div>
      <label>In her words (only if she said some)<textarea rows={3} maxLength={1000} value={f.words} onChange={(e) => setF({ ...f, words: e.target.value })} placeholder="Exactly what she said, or leave it blank" /></label>
    </div>
  )
}

function EditDrawing({ d, today, onDone, onCancel }) {
  const [f, setF] = useState({ title: d.title, madeOn: d.made_on || '', words: d.words || '', topic: d.topic || '', medium: d.medium || '' })
  const [shape, setShape] = useState(cleanShape(d.shape)), [looks, setLooks] = useState(cleanLooks(d.looks))
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)
  async function save() {
    const fields = cleanDrawing(f, today)
    if (fields.error) { setMsg(fields.error); return }
    setBusy(true); setMsg(null)
    const { error, old } = await writeDrawing((row) => saveDrawing(d.id, row), { ...fields, shape: cleanShape(shape), looks: cleanLooks(looks) })
    setBusy(false)
    if (error) { setMsg(error.message || 'That didn’t save. Try again.'); return }
    if (old) { setMsg('Saved, but without what it’s made with, its shape or Claude’s words: the database step for them hasn’t been run yet (20261108210000).'); return }
    onDone()
  }
  return (
    <Card tint={TINT} label="Change the details" glyph="star" className="span-6">
      <Fields f={f} setF={setF} today={today} />
      <div className="form">
        <label>Made with<input maxLength={80} value={f.medium} onChange={(e) => setF({ ...f, medium: e.target.value })} placeholder="Crayon on paper" /></label>
        <fieldset className="choice-row"><legend>The shape of its paper (its edge follows it)</legend>
          {Object.keys(SHAPES).filter((k) => k !== 'polygon' || (shape && shape.kind === 'polygon')).map((k) => {
            const on = k === 'rect' ? !shape : Boolean(shape && shape.kind === k)
            return <button key={k} type="button" aria-pressed={on} onClick={() => setShape(k === 'rect' ? null : k === 'polygon' ? shape : { kind: k })}>{SHAPES[k].label}</button>
          })}
        </fieldset>
        {d.original && <p className="muted small">A shape all its own is traced in “Crop it again”.</p>}
        <LookWords looks={looks} onChange={setLooks} what="her wall" />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" disabled={!f.title.trim() || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
      {msg && <p className="muted" role="status">{msg}</p>}
    </Card>
  )
}
