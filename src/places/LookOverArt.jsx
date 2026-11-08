import { useEffect, useRef, useState } from 'react'
import { Crumb } from '../shell/Link.jsx'
import { Card } from '../ui/Card.jsx'
import { Working } from '../ui/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { useDraft } from '../lib/useDraft.js'
import { askClaude } from '../lib/claude.js'
import { wholeCrop } from '../lib/paintingBatch.js'
import { shapeName } from '../lib/shapes.js'
import { MOODS } from '../lib/gallery.js'
import { drawnWords } from '../lib/drawings.js'
import { drawingProposals } from '../lib/annasArt.js'
import { readingFiles, measurePicture, oneAtATime } from './lifelist/paintingPhotos.js'
import { missingColumn } from './lifelist/usePaintingBatch.js'
import './lifelist/addpaintings.css'

// /drawings/look-again: her art looked over again, for Jason or Laurie, as Laurie's gallery has (decisions log,
// 2026-11-08, "Anna's Art catches up"). For each piece this measures its colours and its fingerprint here on the
// device (kept at once: they're measurements, for the colour filter, the rainbow sort and noticing a second photo of
// it) and, if left on, has Claude look at it again (`look-drawing`: the one picture) for what it's made with, the
// shape of its paper, any day written on it, and a few words for what it shows and how it feels. Those come back as
// suggestions: nothing of hers changes until a parent ticks it and saves. Never her title, never her own words, never
// a name written on it. What's found waits on this device until it's saved.
const TINT = '#D9739B'
const AT_ONCE = 3
const BLANK = { read: true, all: false, found: {}, skip: {} }

export default function LookOverArt({ g, parent, family, today }) {
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/drawings">Anna’s Art</Crumb>
        <span className="kicker">Made by Anna</span>
        <h1 className="greet">Look over her art again</h1>
      </header>
      {!family.loaded || !g.loaded ? null
        : !supabase ? <Card tint={TINT} label="Not connected" glyph="star" className="span-6"><p>The database isn’t connected on this copy of the app.</p></Card>
          : !parent ? <Card tint={TINT} label="Jason or Laurie" glyph="star" className="span-6"><p>Jason or Laurie look over her art.</p></Card>
            : <Look g={g} today={today} />}
    </>
  )
}

function Look({ g, today }) {
  const list = g.list
  const [d, setD, clearD] = useDraft('drawings.lookAgain', BLANK)
  const [run, setRun] = useState(false), [pause, setPause] = useState(null), [busy, setBusy] = useState(null), [done, setDone] = useState(null)
  const [noCols, setNoCols] = useState(false)
  const [thumbs, setThumbs] = useState({})
  const latest = useRef(d)
  latest.current = d
  const want = list.filter((x) => x.path && (d.all || !x.print || !x.palette || (d.read && !x.looks)))
  // Done with one: measured and (if Claude is on) read, or given up on for now
  const todo = want.filter((x) => { const f = d.found[x.id]; return !(f && (f.error || (f.print && (f.reading || !d.read)))) })
  const working = useRef(new Set())

  // Small pictures for the list of what it found
  const shownIds = Object.keys(d.found).join('|')
  useEffect(() => {
    let live = true
    const need = list.filter((x) => d.found[x.id] && !thumbs[x.id]).map((x) => x.thumb_path || x.path)
    if (!need.length) return undefined
    supabase.storage.from('drawings').createSignedUrls(need, 3600).then(({ data }) => {
      if (!live) return
      const byPath = Object.fromEntries((data || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl]))
      setThumbs((t) => ({ ...t, ...Object.fromEntries(list.filter((x) => byPath[x.thumb_path || x.path]).map((x) => [x.id, byPath[x.thumb_path || x.path]])) }))
    })
    return () => { live = false }
  }, [shownIds]) // eslint-disable-line react-hooks/exhaustive-deps -- when more are found

  const signed = async (path) => {
    const { data, error } = await supabase.storage.from('drawings').createSignedUrl(path, 600)
    if (error || !data) throw new Error('Its picture couldn’t be found.')
    const res = await fetch(data.signedUrl)
    if (!res.ok) throw new Error('Its picture couldn’t be loaded.')
    return res.blob()
  }

  // One piece: measured here (its small picture), then looked at by Claude (the picture itself)
  async function one(x) {
    const f = { ...(latest.current.found[x.id] || {}) }
    if (!f.print) {
      const m = await oneAtATime(async () => measurePicture(await signed(x.thumb_path || x.path)))
      f.print = m.print
      if (!noCols) {
        const { error } = await supabase.from('annas_drawings').update({ print: m.print, palette: m.palette }).eq('id', x.id)
        if (error && missingColumn(error)) setNoCols(true)
      }
    }
    if (latest.current.read && !f.reading) {
      const blob = await signed(x.path)
      const [file] = await oneAtATime(() => readingFiles(blob, wholeCrop(x.width || 1000, x.height || 1000), { corners: false }))
      const ans = await askClaude('look-drawing', { file })
      if (ans && ans.error) {
        if (/budget/i.test(ans.error)) throw Object.assign(new Error(`${ans.error} The rest can be looked at then.`), { stop: true })
        if (/unknown task/i.test(ans.error)) throw Object.assign(new Error('Claude’s look needs the claude function deployed again (after this change is merged). Colours and fingerprints are measured meanwhile: switch Claude off below to do just those.'), { stop: true })
        throw new Error(ans.error)
      }
      if (ans && ans.reading) f.reading = ans.reading
      else f.error = 'Claude didn’t look at this one.'
    }
    return f
  }

  useEffect(() => {
    if (!run || pause) return
    if (!todo.length && !working.current.size) { setRun(false); g.reload(); return }
    for (const x of todo.filter((y) => !working.current.has(y.id)).slice(0, Math.max(0, AT_ONCE - working.current.size))) {
      working.current.add(x.id)
      one(x).then((f) => {
        working.current.delete(x.id)
        setD((v) => ({ ...v, found: { ...v.found, [x.id]: f } }))
      }, (e) => {
        working.current.delete(x.id)
        if (e && e.stop) { setPause(e.message); return }
        setD((v) => ({ ...v, found: { ...v.found, [x.id]: { print: (v.found[x.id] || {}).print || null, error: (e && e.message) || 'It couldn’t be looked at.' } } }))
      })
    }
  }, [run, pause, todo.length, d.found]) // eslint-disable-line react-hooks/exhaustive-deps -- runs while there's more to do

  const rows = list.map((x) => ({ x, s: drawingProposals(x, d.found[x.id] && d.found[x.id].reading, today) }))
  const media = rows.filter((r) => r.s.medium), shapes = rows.filter((r) => r.s.shape), days = rows.filter((r) => r.s.madeOn), looks = rows.filter((r) => r.s.looks)
  const ticked = (kind, r) => (d.skip[`${kind}:${r.x.id}`] === undefined ? Boolean(r.s[kind].sure) : !d.skip[`${kind}:${r.x.id}`])
  const tick = (kind, r, on) => setD((v) => ({ ...v, skip: { ...v.skip, [`${kind}:${r.x.id}`]: !on } }))
  const keepLooks = d.skip.looks === undefined ? true : !d.skip.looks
  const errors = Object.values(d.found).filter((f) => f.error).length

  async function save() {
    const changes = rows.map((r) => {
      const c = {}
      if (r.s.medium && ticked('medium', r)) c.medium = r.s.medium.value
      if (r.s.shape && ticked('shape', r)) c.shape = r.s.shape.value
      if (r.s.madeOn && ticked('madeOn', r)) c.made_on = r.s.madeOn.value
      if (r.s.looks && keepLooks) c.looks = r.s.looks.value
      return [r.x, c]
    }).filter(([, c]) => Object.keys(c).length)
    for (const [k, [x, c]] of changes.entries()) {
      setBusy(`Saving ${k + 1} of ${changes.length}…`)
      const { error } = await supabase.from('annas_drawings').update(c).eq('id', x.id)
      if (error) { setBusy(null); setDone(missingColumn(error) ? 'They can’t be kept until the database step for her medium, shapes and Claude’s words is run (20261108210000_annas_art_gallery).' : `${x.title}: ${error.message}`); return }
    }
    setBusy(null)
    setDone(changes.length ? `Saved ${changes.length === 1 ? 'one piece' : `${changes.length} pieces`}.` : 'Nothing needed saving.')
    clearD(); g.reload()
  }

  const cents = Math.round(todo.length * 1)
  const group = (title, rs, kind, words) => rs.length > 0 && (
    <fieldset className="ll-again-group">
      <legend>{title}</legend>
      {rs.map((r) => (
        <label key={r.x.id} className="ll-again-row">
          <input type="checkbox" checked={ticked(kind, r)} onChange={(e) => tick(kind, r, e.target.checked)} />
          {thumbs[r.x.id] && <span className="ll-up-mini"><img src={thumbs[r.x.id]} alt="" /></span>}
          <span><b>{r.x.title}</b><small>{words(r)}</small></span>
        </label>
      ))}
    </fieldset>
  )
  return (
    <>
      {(run && !pause) && <Working>Looking at her art: {list.length - todo.length} of {list.length}…</Working>}
      {busy && <Working>{busy}</Working>}
      <Card tint={TINT} label="What it does" glyph="star" className="span-6">
        <p>For each of her pieces, this measures its colours and a fingerprint here on this device (they’re kept at once: they let you find her art by colour, sort it as a rainbow, and notice a second photo of one), and can have Claude look at it again.</p>
        <label className="ll-up-check">
          <input type="checkbox" checked={d.read} onChange={(e) => setD({ ...d, read: e.target.checked })} />
          <span><b>Have Claude look at each one.</b> The picture goes to Claude (Anthropic), which suggests what it’s made with, the shape of its paper, any day written on it, and a few words for what it shows and how it feels. They come back as suggestions below: nothing of hers changes until you tick it and save. Never her title or her own words. About a cent a piece, an estimate, within the family’s Claude budget.</span>
        </label>
        <label className="ll-up-check">
          <input type="checkbox" checked={d.all} onChange={(e) => setD({ ...d, all: e.target.checked })} />
          <span>Look at every piece, not only the ones not looked at yet.</span>
        </label>
        <p className="muted">{todo.length ? `${todo.length} of her ${list.length} pieces to look at${d.read ? `, about $${(cents / 100).toFixed(2)} of Claude’s budget` : ''}.` : `All ${list.length} looked at.`}</p>
        <div className="form-actions">
          {!run && todo.length > 0 && <button type="button" className="btn" onClick={() => { setPause(null); setRun(true) }}>{Object.keys(d.found).length ? 'Carry on' : 'Look at them'}</button>}
          {run && !pause && <button type="button" className="btn ghost" onClick={() => setRun(false)}>Stop for now</button>}
        </div>
        {pause && <p className="ll-up-flag" role="status">{pause} <button type="button" className="ll-up-link" onClick={() => setPause(null)}>Try again</button></p>}
        {noCols && <p className="ll-up-flag" role="status">Colours and fingerprints can’t be kept until the database steps are run (20261108200000 and 20261108210000).</p>}
        {errors > 0 && <p className="muted small">{errors === 1 ? 'One couldn’t be looked at.' : `${errors} couldn’t be looked at.`} <button type="button" className="ll-up-link" onClick={() => setD((v) => ({ ...v, found: Object.fromEntries(Object.entries(v.found).map(([k, f]) => [k, f.error ? { print: f.print || null } : f])) }))}>Try {errors === 1 ? 'it' : 'those'} again</button></p>}
      </Card>

      {(media.length > 0 || shapes.length > 0 || days.length > 0 || looks.length > 0) && (
        <Card tint={TINT} label="What it found" glyph="star" className="span-6 ll-again">
          {group('What each is made with, where none was kept', media, 'medium', (r) => r.s.medium.value)}
          {group('Days written on them, where none was kept (check each)', days, 'madeOn', (r) => drawnWords(r.s.madeOn.value).replace(/^Drawn /, ''))}
          {group('Papers and canvases that aren’t rectangles', shapes, 'shape', (r) => shapeName(r.s.shape.value))}
          {looks.length > 0 && (
            <label className="ll-up-check">
              <input type="checkbox" checked={keepLooks} onChange={(e) => setD({ ...d, skip: { ...d.skip, looks: !e.target.checked } })} />
              <span><b>Keep what Claude saw in {looks.length === 1 ? 'it' : `all ${looks.length}`}</b>, for finding them on her wall and for her featured wall: {looks.slice(0, 3).map((r) => `${r.x.title} (${[...r.s.looks.value.subjects.slice(0, 2), ...r.s.looks.value.moods.slice(0, 1).map((m) => MOODS[m].toLowerCase())].join(', ')})`).join('; ')}{looks.length > 3 ? '…' : ''}. A word that’s wrong can be taken off on each piece’s page.</span>
            </label>
          )}
          <div className="form-actions"><button type="button" className="btn" disabled={Boolean(busy)} onClick={save}>Save what’s ticked</button></div>
        </Card>
      )}
      {done && <p className="ll-up-note span-6" role="status">{done}</p>}
    </>
  )
}
