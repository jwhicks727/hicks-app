import { useEffect, useState } from 'react'
import { Link, Crumb } from '../../shell/Link.jsx'
import { Card } from '../../ui/Card.jsx'
import { supabase } from '../../lib/supabase.js'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { loadInbox } from '../../lib/inboxStore.js'
import { PAINTINGS, toRow, storedPaths } from '../../lib/paintings.js'
import { tally, paintedWords } from '../../lib/paintingBatch.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'
import { Framed } from '../../parts/PaintingFrame.jsx'
import { Featured, Finder, useWallView } from '../../parts/ArtFinder.jsx'
import '../../parts/paintings.css'

// /lifelist/paintings: Laurie's gallery, framed and hung. At the top, for Jason or Laurie, adding
// her paintings (or the photos waiting to be checked); then the featured wall, a few of her
// paintings that hang together for a few days, chosen by Claude from their facts (the weather at
// home, a concert coming, the season) or, until it can, by the app; then finding her paintings by
// colour, mood, what they show, year, season, medium or shape, and sorting them, a rainbow
// included. Filters and sorts stay out of the address (CLAUDE.md) and are kept for this visit, so
// a painting's page and Back find them as they were; its next and previous follow the order shown.
// Behind sign-in: the paintings live in the private `paintings` bucket. The featured wall and the finder are
// shared with Anna's Art (src/parts/ArtFinder.jsx).
const TINT = '#C0824F'
const Thumb = ({ p }) => <Framed shape={p.shape}>{p.small ? <img src={p.small} alt={`${p.title}, a painting by Laurie`} width={p.w} height={p.h} loading="lazy" /> : <span className="gallery-blank" />}</Framed>

export default function Gallery() {
  const session = useSession()
  const family = useFamily(session)
  const { list, stored, loaded, reload } = usePaintings()
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  const { view, setView, shown, n } = useWallView(list, 'paintings')
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/lifelist">Life List</Crumb>
        <span className="kicker">Painted by Laurie</span>
        <h1 className="greet">Laurie’s Gallery</h1>
      </header>
      {parent && supabase && <AddPaintingsLink />}
      {loaded && !list.length && (
        <Card tint={TINT} label={supabase ? 'Not moved in yet' : 'Not connected'} glyph="star" className="span-6">
          <p>{supabase
            ? 'Laurie’s paintings are kept in the family’s private storage, and none have been moved in yet. A parent does that once, from the development copy on a computer (npm run dev): this page then has a “Move them now” button (docs/MORNING.md, step 7).'
            : 'Laurie’s paintings are only for us, kept behind sign-in, and the database isn’t connected on this copy of the app.'}</p>
        </Card>
      )}
      {list.length >= 4 && <Featured list={list} parent={parent} collection="paintings" Thumb={Thumb} to={(p) => '/lifelist/paintings/' + p.slug} />}
      {list.length > 1 && <Finder list={list} view={view} setView={setView} count={shown.length} collection="paintings" />}
      <section className="gallery-wall span-6" aria-label="Laurie’s paintings">
        {shown.map((p) => (
          <Link key={p.slug} className="gallery-piece" to={'/lifelist/paintings/' + p.slug}>
            <Thumb p={p} />
            <b>{p.title}</b>
            <small>{[paintedWords(p.year, p.month), p.medium].filter(Boolean).join(' · ') || (p.named ? 'By Laurie' : 'A working title, until Laurie names it')}</small>
          </Link>
        ))}
      </section>
      {list.length > 0 && !shown.length && (
        <Card tint={TINT} label="None of them" glyph="star" className="span-6">
          <p>None of her paintings match all of that.</p>
          <button type="button" className="btn ghost" onClick={() => setView({ ...view, f: {} })}>Show them all</button>
        </Card>
      )}
      {list.length > 0 && <p className="gallery-note span-6">{n ? `${shown.length} of her ${list.length} paintings.` : list.length === 1 ? 'The first of her paintings here.' : `${list.length} of her paintings so far.`} More as each one is photographed.</p>}
      {parent && stored && <p className="gallery-note span-6"><Link to="/lifelist/paintings/look-again">Look over her gallery again ›</Link> Months by her signature, the shapes of her canvases, her colours, and what Claude sees in each, for the paintings added before they were kept.</p>}
      {parent && import.meta.env.DEV && <MoveIn have={stored ? list.map((x) => x.slug) : []} onDone={reload} />}
      {parent && supabase && list.length > 8 && <div className="span-6"><Link to="/lifelist/paintings/add" className="btn ghost">Add her paintings</Link></div>}
    </>
  )
}

/** The paintings bundled with the code, moved into the private bucket, files and all. */
function MoveIn({ have, onDone }) {
  const [busy, setBusy] = useState(null)
  // Only the ones not already stored, so details a parent has since added (what a painting shows) are never written over.
  const todo = PAINTINGS.filter((p) => !have.includes(p.slug))
  async function move() {
    for (const p of todo) {
      setBusy(`Moving ${p.title}…`)
      const row = toRow(p), paths = storedPaths(p.slug, row)
      const local = { src: p.src, small: p.small, sprite: p.flyer && p.flyer.sprite, sky: p.flyer && p.flyer.sky, sheet: p.leaves && p.leaves.sheet }
      for (const [k, path] of Object.entries(paths)) {
        const blob = await (await fetch(local[k])).blob()
        const { error } = await supabase.storage.from('paintings').upload(path, blob, { contentType: blob.type, upsert: true })
        if (error) { setBusy(`${p.title}: ${error.message}`); return }
      }
      const { error } = await supabase.from('paintings').upsert(row, { onConflict: 'slug' })
      if (error) { setBusy(`${p.title}: ${error.message}`); return }
    }
    setBusy('Moved. They’re behind sign-in now.'); onDone()
  }
  if (!todo.length) return null
  return (
    <Card tint="#B3263A" label="Into private storage" glyph="candle" className="span-6">
      <p>{todo.map((p) => p.title).join(', ')} came in with the app’s code. Move {todo.length === 1 ? 'it' : 'them'} into the family’s private storage, so a hosted copy of the app shows them only to us, signed in.</p>
      <button type="button" className="btn" disabled={Boolean(busy && busy.endsWith('…'))} onClick={move}>Move them now</button>
      {busy && <p className="muted" role="status">{busy}</p>}
    </Card>
  )
}

/** To the batch screen, at the top: a plain button, or the shine while photos are waiting there to be checked. */
function AddPaintingsLink() {
  // Photos waiting in the family's storage (a batch sent from any device)
  const [waiting, setWaiting] = useState(null)
  useEffect(() => {
    let live = true
    loadInbox().then((items) => { if (live) setWaiting(tally(items)) }, () => {})
    return () => { live = false }
  }, [])
  // Still to check, and any the app closed on mid-save (opening the screen finishes them)
  const n = waiting ? waiting.ready + waiting.failed + waiting.saving : 0
  if (n) return <Link to="/lifelist/paintings/add" className="shine span-6">Photos of her paintings waiting<span className="n">{n}</span></Link>
  return <div className="span-6 gallery-top"><Link to="/lifelist/paintings/add" className="btn">Add her paintings</Link></div>
}
