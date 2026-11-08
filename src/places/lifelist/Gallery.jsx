import { useEffect, useState } from 'react'
import { Link, Crumb } from '../../shell/Link.jsx'
import { Card } from '../../ui/Card.jsx'
import { supabase } from '../../lib/supabase.js'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { loadInbox } from '../../lib/inboxStore.js'
import { PAINTINGS, toRow, storedPaths } from '../../lib/paintings.js'
import { tally } from '../../lib/paintingBatch.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'
import '../../parts/paintings.css'

// /lifelist/paintings: Laurie's gallery, framed and hung, newest first.
// Behind sign-in: the paintings live in the private `paintings` bucket. The
// parents add newly photographed ones, many at once (/lifelist/paintings/add,
// AddPaintings.jsx), and move the ones first bundled with the code into the
// bucket with a tap.
export default function Gallery() {
  const session = useSession()
  const family = useFamily(session)
  const { list, stored, loaded, reload } = usePaintings()
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/lifelist">Life List</Crumb>
        <span className="kicker">Painted by Laurie</span>
        <h1 className="greet">Laurie’s Gallery</h1>
      </header>
      {loaded && !list.length && (
        <Card tint="#C0824F" label={supabase ? 'Not moved in yet' : 'Not connected'} glyph="star" className="span-6">
          <p>{supabase
            ? 'Laurie’s paintings are kept in the family’s private storage, and none have been moved in yet. A parent does that once, from the development copy on a computer (npm run dev): this page then has a “Move them now” button (docs/MORNING.md, step 7).'
            : 'Laurie’s paintings are only for us, kept behind sign-in, and the database isn’t connected on this copy of the app.'}</p>
        </Card>
      )}
      <section className="gallery-wall span-6" aria-label="Laurie’s paintings">
        {list.map((p) => (
          <Link key={p.slug} className="gallery-piece" to={'/lifelist/paintings/' + p.slug}>
            <span className="gallery-frame">{p.small ? <img src={p.small} alt={`${p.title}, a painting by Laurie`} width={p.w} height={p.h} loading="lazy" /> : <span className="gallery-blank" />}</span>
            <b>{p.title}</b>
            <small>{[p.year, p.medium].filter(Boolean).join(' · ') || (p.named ? 'By Laurie' : 'A working title, until Laurie names it')}</small>
          </Link>
        ))}
      </section>
      {list.length > 0 && <p className="gallery-note span-6">{list.length === 1 ? 'The first of her paintings here.' : `${list.length} of her paintings so far.`} More as each one is photographed.</p>}
      {parent && import.meta.env.DEV && <MoveIn have={stored ? list.map((x) => x.slug) : []} onDone={reload} />}
      {parent && supabase && <AddPaintingsLink />}
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

/** To the batch screen: a plain button, or the shine while photos are waiting there to be checked. */
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
  return <div className="span-6"><Link to="/lifelist/paintings/add" className="btn">Add her paintings</Link></div>
}
