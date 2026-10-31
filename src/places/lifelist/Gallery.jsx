import { useState } from 'react'
import { Link, Crumb } from '../../shell/Link.jsx'
import { Card } from '../../ui/Card.jsx'
import Dropzone from '../../ui/Dropzone.jsx'
import { supabase } from '../../lib/supabase.js'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { useDraft } from '../../lib/useDraft.js'
import { prepareUpload } from '../../lib/claude.js'
import { PAINTINGS, FILES, toRow, storedPaths } from '../../lib/paintings.js'
import { SEASONS, SEASON_ORDER } from '../../lib/seasons.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'
import '../../parts/paintings.css'

// /lifelist/paintings: Laurie's gallery, framed and hung, newest first.
// Behind sign-in: the paintings live in the private `paintings` bucket. The
// parents add a newly photographed one here, with Laurie's yes, and move
// the ones first bundled with the code into the bucket with a tap.
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
      {loaded && !list.length && <Card tint="#C0824F" label="Not connected" glyph="star" className="span-6"><p>Laurie’s paintings are only for us, kept behind sign-in, and the database isn’t connected on this copy of the app.</p></Card>}
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
      {parent && !stored && import.meta.env.DEV && <MoveIn onDone={reload} />}
      {parent && stored && <AddPainting me={me} onDone={reload} />}
    </>
  )
}

/** The paintings bundled with the code, moved into the private bucket, files and all. */
function MoveIn({ onDone }) {
  const [busy, setBusy] = useState(null)
  async function move() {
    for (const p of PAINTINGS) {
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
  return (
    <Card tint="#B3263A" label="Into private storage" glyph="candle" className="span-6">
      <p>The paintings here so far came in with the app’s code. Move them into the family’s private storage, so a hosted copy of the app shows them only to us, signed in.</p>
      <button type="button" className="btn" disabled={Boolean(busy && busy.endsWith('…'))} onClick={move}>Move them now</button>
      {busy && <p className="muted" role="status">{busy}</p>}
    </Card>
  )
}

/** A newly photographed painting, with Laurie's yes. */
function AddPainting({ me, onDone }) {
  const [f, setF, clear] = useDraft('paintings.new', null)
  const [pic, setPic] = useState(null), [busy, setBusy] = useState(null)
  const slugOf = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  async function save() {
    const slug = slugOf(f.title) || `painting-${Date.now()}`
    setBusy('Saving…')
    const full = await prepareUpload(pic, { max: 2400, quality: 0.88 }), small = await prepareUpload(pic, { max: 720, quality: 0.84 })
    for (const [path, up] of [[`${slug}/${FILES.src}`, full], [`${slug}/${FILES.small}`, small]]) {
      const { error } = await supabase.storage.from('paintings').upload(path, up.blob, { contentType: 'image/jpeg', upsert: true })
      if (error) { setBusy(error.message); return }
    }
    const { error } = await supabase.from('paintings').insert({ slug, title: f.title.trim(), named: f.named, year: Number(f.year) || null, medium: f.medium.trim() || null, size: f.size.trim() || null, w: full.width, h: full.height, seasons: f.seasons, added: new Date().toISOString().slice(0, 10), focus: [0, 0, 1, 1], said_yes_by: me ? me.id : null })
    if (error) { setBusy(error.message); return }
    clear(); setPic(null); setBusy('Added to her gallery.'); onDone()
  }
  if (!f) return <div className="span-6"><button type="button" className="btn" onClick={() => setF({ title: '', named: true, year: '', medium: '', size: '', seasons: [], yes: false })}>Add a painting</button></div>
  return (
    <Card tint="#C0824F" label="A painting of Laurie’s" glyph="star" className="span-6">
      <Dropzone accept="image/*" label="The photo or scan" hint="docs/ART-CAPTURE.md says how; drop it, paste it, or choose it." onFiles={(files) => setPic(files[0])} />
      {pic && <p className="muted">{pic.name || 'A pasted picture'} is ready.</p>}
      <div className="form">
        <label>Its title<input maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label className="check-row"><input type="checkbox" checked={!f.named} onChange={(e) => setF({ ...f, named: !e.target.checked })} /> A working title, until Laurie names it</label>
        <div className="form-row"><label>Year<input inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} /></label><label>Medium<input maxLength={80} value={f.medium} onChange={(e) => setF({ ...f, medium: e.target.value })} placeholder="Acrylic on canvas" /></label></div>
        <label>Size<input maxLength={40} value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} placeholder="18 × 24 in" /></label>
        <fieldset className="choice-row"><legend>Its season (it hangs on Home then)</legend>
          {SEASON_ORDER.map((k) => <button key={k} type="button" aria-pressed={f.seasons.includes(k)} onClick={() => setF({ ...f, seasons: f.seasons.includes(k) ? f.seasons.filter((x) => x !== k) : [...f.seasons, k] })}>{SEASONS[k].label}</button>)}
        </fieldset>
        <label className="check-row"><input type="checkbox" checked={f.yes} onChange={(e) => setF({ ...f, yes: e.target.checked })} /> Laurie said yes to this one being in the app</label>
      </div>
      <div className="form-actions"><button type="button" className="btn" disabled={!pic || !f.title.trim() || !f.yes || busy === 'Saving…'} onClick={save}>Add it to her gallery</button><button type="button" className="btn ghost" onClick={() => { clear(); setPic(null) }}>Cancel</button></div>
      {busy && <p className="muted" role="status">{busy}</p>}
    </Card>
  )
}
