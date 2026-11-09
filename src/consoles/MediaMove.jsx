import { useEffect, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { Working } from '../ui/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { media, whereKept } from '../lib/media.js'
import { MEDIA_AREAS, sizeWords, matchesCopy, drawingOwners } from '../lib/mediaMove.js'

// Admin › Where pictures are kept: the family's pictures moving from Supabase's storage
// to the private Cloudflare R2 bucket (docs/R2-SETUP.md). It looks at what each old
// bucket holds and what R2 has, copies what's missing (each checked afterwards: there,
// and the same size), and only then offers to free the space in Supabase, taking away
// only copies R2 is seen to hold. A drawing keeps who added it (from its row), so only they or a
// parent can take it away, as before. Until the move is done, the media function shows any
// picture not yet in R2 from Supabase, so nothing goes missing on the way. This is the
// one screen that reads Supabase's storage directly (tests/media.test.mjs).

/** Every file in one Supabase bucket, folders and all, with its size and type. */
async function listAll(bucket, prefix = '') {
  const out = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(error.message)
    for (const x of data || []) {
      if (x.name.startsWith('.')) continue // the dashboard's placeholder in an empty folder
      const path = prefix ? `${prefix}/${x.name}` : x.name
      if (x.id === null || !x.metadata) out.push(...await listAll(bucket, path)) // a folder
      else out.push({ path, size: Number(x.metadata.size) || 0, type: x.metadata.mimetype || 'image/jpeg' })
    }
    if (!data || data.length < 100) break
  }
  return out
}

/** Who added each drawing file, read from the drawings and the batch waiting (paged: there can be more than 1000). */
async function readDrawingOwners() {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('annas_drawings').select('id, path, thumb_path, original, added_by').order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const { data: inbox, error } = await supabase.from('drawing_inbox').select('id, added_by').limit(1000)
  if (error) throw new Error(error.message)
  return drawingOwners(rows, inbox)
}

/** What one area holds in each place: the old bucket's files, and which of them R2 already has, the same size. */
async function survey(area) {
  const files = await listAll(area)
  const heads = files.length ? await media.from(area).heads(files.map((f) => f.path)) : []
  const inR2 = files.map((f, i) => matchesCopy(f, heads && heads[i]))
  return { files, inR2, bytes: files.reduce((a, f) => a + f.size, 0), moved: inR2.filter(Boolean).length }
}

export default function MediaMove({ parent }) {
  const [where, setWhere] = useState(null)
  const [areas, setAreas] = useState({}) // area -> survey
  const [busy, setBusy] = useState(null), [note, setNote] = useState(null), [failed, setFailed] = useState([]), [freeing, setFreeing] = useState(false)
  useEffect(() => { whereKept().then(setWhere) }, [])

  async function look() {
    setNote(null); setFailed([])
    const next = {}
    try {
      for (const [area, name] of MEDIA_AREAS) { setBusy(`Looking at ${name.toLowerCase()}…`); next[area] = await survey(area) }
      setAreas(next)
    } catch (e) { setNote(e.message) }
    setBusy(null)
  }

  async function copy() {
    setNote(null)
    const bad = []
    let done = 0
    for (const [area, name] of MEDIA_AREAS) {
      const s = areas[area] || await survey(area)
      const todo = s.files.filter((_, i) => !s.inR2[i])
      let owners = new Map()
      if (area === 'drawings' && todo.length) {
        try { owners = await readDrawingOwners() } catch (e) { bad.push({ area, path: '(who added each)', why: e.message }); continue } // never moved without who added it
      }
      for (const f of todo) {
        setBusy(`Copying ${name.toLowerCase()}: ${++done} so far…`)
        const { data: blob, error } = await supabase.storage.from(area).download(f.path)
        if (error || !blob) { bad.push({ area, path: f.path, why: (error && error.message) || 'couldn’t be read' }); continue }
        const up = await media.from(area).upload(f.path, blob, { contentType: f.type, upsert: true, owner: owners.get(f.path) })
        if (up.error) bad.push({ area, path: f.path, why: up.error.message })
      }
    }
    setFailed(bad)
    await look() // each copy checked: there, and the same size
    setNote(bad.length ? `${bad.length} couldn’t be copied (listed below); everything else is in R2.` : 'Everything is in R2 now, each copy checked.')
  }

  async function free() {
    setFreeing(false); setNote(null)
    let gone = 0
    const bad = []
    for (const [area, name] of MEDIA_AREAS) {
      setBusy(`Freeing the space ${name.toLowerCase()} took…`)
      const s = await survey(area) // looked at again, right before: only copies R2 is seen to hold go
      const safe = s.files.filter((_, i) => s.inR2[i]).map((f) => f.path)
      for (let i = 0; i < safe.length; i += 100) {
        const { error } = await supabase.storage.from(area).remove(safe.slice(i, i + 100))
        if (error) bad.push({ area, path: `${safe.length} files`, why: error.message }); else gone += Math.min(100, safe.length - i)
      }
    }
    setFailed(bad)
    await look()
    setNote(`${gone} copies taken out of Supabase.${bad.length ? ' Some couldn’t be (below).' : ''}`)
  }

  const surveyed = Object.keys(areas).length === MEDIA_AREAS.length
  const total = Object.values(areas).reduce((a, s) => a + s.files.length, 0)
  const moved = Object.values(areas).reduce((a, s) => a + s.moved, 0)
  const bytes = Object.values(areas).reduce((a, s) => a + s.bytes, 0)

  return (
    <Card tint="#2F6B8A" label="Where pictures are kept" glyph="star" className="span-6">
      {busy && <Working>{busy}</Working>}
      {where === 'r2' && <p>Pictures are kept in the family’s private <b>Cloudflare R2</b> bucket. Any not moved over yet are still shown from Supabase until they are.</p>}
      {where === 'supabase' && <p>Pictures are kept in <b>Supabase’s storage</b>: Cloudflare R2 isn’t set up yet, or the <code>media</code> function isn’t answering. <code>docs/R2-SETUP.md</code> says how, and this card then moves them over.</p>}
      {where === null && <p className="muted">Couldn’t tell just now where pictures are kept.</p>}

      {where === 'r2' && parent && (
        <>
          <div className="form-actions">
            <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={look}>See what’s where</button>
            {surveyed && moved < total && <button type="button" className="btn" disabled={Boolean(busy)} onClick={copy}>Copy the rest into R2</button>}
            {surveyed && total > 0 && moved === total && <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={() => setFreeing(true)}>Free the space in Supabase</button>}
          </div>
          {surveyed && (
            <ul className="coming">
              {MEDIA_AREAS.map(([area, name]) => {
                const s = areas[area]
                return <li key={area}><b>{name}:</b> {s.files.length ? `${s.moved} of ${s.files.length} in R2 · ${sizeWords(s.bytes)} still in Supabase` : 'nothing left in Supabase'}</li>
              })}
            </ul>
          )}
          {surveyed && <p className="muted">{total ? `${sizeWords(bytes)} in Supabase’s storage in all, ${moved} of ${total} pictures already copied to R2.` : 'Supabase’s storage is empty of pictures: everything lives in R2.'}</p>}
        </>
      )}
      {where === 'r2' && !parent && <p className="muted">Jason or Laurie move the pictures over.</p>}
      {note && <p className="muted" role="status">{note}</p>}
      {failed.length > 0 && <ul className="coming">{failed.slice(0, 30).map((f) => <li key={f.area + f.path}><b>{f.area}/{f.path}:</b> {f.why}</li>)}</ul>}
      {freeing && (
        <Confirm title="Free the space in Supabase?" yes="Free it" danger onNo={() => setFreeing(false)} onYes={free}>
          <p>Each picture is looked at again first, and only the ones R2 holds, the same size, are taken out of Supabase. Anything not safely in R2 stays where it is.</p>
        </Confirm>
      )}
    </Card>
  )
}
