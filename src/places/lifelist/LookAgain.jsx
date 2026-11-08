import { useEffect, useRef, useState } from 'react'
import { Crumb } from '../../shell/Link.jsx'
import { Card } from '../../ui/Card.jsx'
import { Working } from '../../ui/Toast.jsx'
import { supabase } from '../../lib/supabase.js'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { useDraft } from '../../lib/useDraft.js'
import { askClaude } from '../../lib/claude.js'
import { todayAtHome } from '../../lib/useSources.js'
import { wholeCrop, lookProposals, MONTHS } from '../../lib/paintingBatch.js'
import { shapeName } from '../../lib/shapes.js'
import { MOODS } from '../../lib/gallery.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'
import { readingFiles, measurePicture, oneAtATime } from './paintingPhotos.js'
import { missingColumn } from './usePaintingBatch.js'
import './addpaintings.css'

// /lifelist/paintings/look-again: her gallery looked over again, for Jason or Laurie. For each of
// her paintings this measures its colours and its fingerprint here on the device (kept at once:
// they're measurements, for the colour filter, the rainbow sort and spotting a second photo of it),
// and, if left on, has Claude look at it again (`look-painting`: the painting and its corners) for a
// month she wrote by her signature (and a year, where none was kept), the shape of its canvas, and a
// few words for what it shows and how it feels. Those come back as suggestions: nothing of hers
// changes until a parent ticks it and saves. Made for the paintings added before months, shapes and
// fingerprints were kept (decisions log, 2026-11-08); it can be run again for any not yet looked at.
// What's found waits on this device until it's saved, so the app closing loses nothing.
const TINT = '#C0824F'
const AT_ONCE = 3
const BLANK = { read: true, all: false, found: {}, skip: {} }

export default function LookAgain() {
  const session = useSession()
  const family = useFamily(session)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/lifelist/paintings">Laurie’s Gallery</Crumb>
        <span className="kicker">Painted by Laurie</span>
        <h1 className="greet">Look over her gallery again</h1>
      </header>
      {!family.loaded ? null
        : !supabase ? <Card tint={TINT} label="Not connected" glyph="star" className="span-6"><p>The database isn’t connected on this copy of the app.</p></Card>
          : !parent ? <Card tint={TINT} label="Jason or Laurie" glyph="star" className="span-6"><p>Jason or Laurie look over her gallery.</p></Card>
            : <Look />}
    </>
  )
}

function Look() {
  const { list, stored, reload } = usePaintings()
  const [d, setD, clearD] = useDraft('paintings.lookAgain', BLANK)
  const [run, setRun] = useState(false), [pause, setPause] = useState(null), [busy, setBusy] = useState(null), [done, setDone] = useState(null)
  const [noCols, setNoCols] = useState(false)
  const thisYear = Number(todayAtHome().slice(0, 4))
  const latest = useRef(d)
  latest.current = d
  const want = list.filter((p) => p.src && (d.all || !p.print || !p.palette || (d.read && !p.looks)))
  // Done with one: measured and (if Claude is on) read, or given up on for now (tried again with "Try those again")
  const todo = want.filter((p) => { const f = d.found[p.slug]; return !(f && (f.error || (f.print && (f.reading || !d.read)))) })
  const working = useRef(new Set())

  // One painting: measured here (its small picture), then read by Claude (the painting and its corners)
  async function one(p) {
    const f = { ...(latest.current.found[p.slug] || {}) }
    if (!f.print) {
      const res = await fetch(p.small || p.src)
      if (!res.ok) throw new Error('Its picture couldn’t be loaded.')
      const m = await oneAtATime(async () => measurePicture(await res.blob()))
      f.print = m.print
      if (!noCols) {
        const { error } = await supabase.from('paintings').update({ print: m.print, palette: m.palette }).eq('slug', p.slug)
        if (error && missingColumn(error)) setNoCols(true)
      }
    }
    if (latest.current.read && !f.reading) {
      const res = await fetch(p.src)
      if (!res.ok) throw new Error('Its picture couldn’t be loaded.')
      const blob = await res.blob()
      const files = await oneAtATime(() => readingFiles(blob, wholeCrop(p.w, p.h)))
      const ans = await askClaude('look-painting', { files })
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
    if (!todo.length && !working.current.size) { setRun(false); reload(); return }
    for (const p of todo.filter((x) => !working.current.has(x.slug)).slice(0, Math.max(0, AT_ONCE - working.current.size))) {
      working.current.add(p.slug)
      one(p).then((f) => {
        working.current.delete(p.slug)
        setD((x) => ({ ...x, found: { ...x.found, [p.slug]: f } }))
      }, (e) => {
        working.current.delete(p.slug)
        if (e && e.stop) { setPause(e.message); return }
        setD((x) => ({ ...x, found: { ...x.found, [p.slug]: { ...(x.found[p.slug] || {}), print: (x.found[p.slug] || {}).print || null, error: (e && e.message) || 'It couldn’t be looked at.' } } }))
      })
    }
  }, [run, pause, todo.length, d.found]) // eslint-disable-line react-hooks/exhaustive-deps -- runs while there's more to do

  // What it found, as suggestions
  const rows = list.map((p) => ({ p, s: lookProposals(p, d.found[p.slug] && d.found[p.slug].reading, thisYear) }))
  const months = rows.filter((r) => r.s.month), years = rows.filter((r) => r.s.year), shapes = rows.filter((r) => r.s.shape), looks = rows.filter((r) => r.s.looks)
  const ticked = (kind, r) => (d.skip[`${kind}:${r.p.slug}`] === undefined ? Boolean(r.s[kind].sure) : !d.skip[`${kind}:${r.p.slug}`])
  const tick = (kind, r, on) => setD((x) => ({ ...x, skip: { ...x.skip, [`${kind}:${r.p.slug}`]: !on } }))
  const keepLooks = d.skip.looks === undefined ? true : !d.skip.looks
  const errors = Object.entries(d.found).filter(([, f]) => f.error).length

  async function save() {
    const changes = rows.map(({ p, s }) => {
      const c = {}
      if (s.year && ticked('year', { p, s })) c.year = s.year.value
      if (s.month && ticked('month', { p, s })) c.month = s.month.value
      if (s.shape && ticked('shape', { p, s })) c.shape = s.shape.value
      if (s.looks && keepLooks) c.looks = s.looks.value
      return [p, c]
    }).filter(([, c]) => Object.keys(c).length)
    for (const [k, [p, c]] of changes.entries()) {
      setBusy(`Saving ${k + 1} of ${changes.length}…`)
      const { error } = await supabase.from('paintings').update(c).eq('slug', p.slug)
      if (error) { setBusy(null); setDone(missingColumn(error) ? 'They can’t be kept until the database step for months, shapes and Claude’s words is run (20261108200000_gallery_shapes_months_features).' : `${p.title}: ${error.message}`); return }
    }
    setBusy(null)
    setDone(changes.length ? `Saved ${changes.length === 1 ? 'one painting' : `${changes.length} paintings`}.` : 'Nothing needed saving.')
    clearD(); reload()
  }

  const cents = Math.round(todo.length * 2)
  return (
    <>
      {(run && !pause) && <Working>Looking at her paintings: {list.length - todo.length} of {list.length}…</Working>}
      {busy && <Working>{busy}</Working>}
      {!stored && <Card tint={TINT} label="Not moved in yet" glyph="star" className="span-6"><p>Her paintings aren’t in the family’s storage yet.</p></Card>}
      <Card tint={TINT} label="What it does" glyph="star" className="span-6">
        <p>For each of her paintings, this measures its colours and a fingerprint here on this device (they’re kept at once: they let you find her paintings by colour, sort them as a rainbow, and notice a second photo of one), and can have Claude look at it again.</p>
        <label className="ll-up-check">
          <input type="checkbox" checked={d.read} onChange={(e) => setD({ ...d, read: e.target.checked })} />
          <span><b>Have Claude look at each one.</b> The painting and its corners enlarged go to Claude (Anthropic), which reads any month she wrote by her signature (and a year, where none is kept), the shape of its canvas, and a few words for what it shows and how it feels. They come back as suggestions below: nothing of hers changes until you tick it and save. About two cents a painting, an estimate, within the family’s Claude budget.</span>
        </label>
        <label className="ll-up-check">
          <input type="checkbox" checked={d.all} onChange={(e) => setD({ ...d, all: e.target.checked })} />
          <span>Look at every painting, not only the ones not looked at yet.</span>
        </label>
        <p className="muted">{todo.length ? `${todo.length} of her ${list.length} paintings to look at${d.read ? `, about $${(cents / 100).toFixed(2)} of Claude’s budget` : ''}.` : `All ${list.length} looked at.`}</p>
        <div className="form-actions">
          {!run && todo.length > 0 && <button type="button" className="btn" onClick={() => { setPause(null); setRun(true) }}>{Object.keys(d.found).length ? 'Carry on' : 'Look at them'}</button>}
          {run && !pause && <button type="button" className="btn ghost" onClick={() => setRun(false)}>Stop for now</button>}
        </div>
        {pause && <p className="ll-up-flag" role="status">{pause} <button type="button" className="ll-up-link" onClick={() => setPause(null)}>Try again</button></p>}
        {noCols && <p className="ll-up-flag" role="status">Colours and fingerprints can’t be kept until the database step is run (20261108200000_gallery_shapes_months_features).</p>}
        {errors > 0 && <p className="muted small">{errors === 1 ? 'One couldn’t be looked at.' : `${errors} couldn’t be looked at.`} <button type="button" className="ll-up-link" onClick={() => setD((x) => ({ ...x, found: Object.fromEntries(Object.entries(x.found).map(([k, f]) => [k, f.error ? { print: f.print || null } : f])) }))}>Try {errors === 1 ? 'it' : 'those'} again</button></p>}
      </Card>

      {(months.length > 0 || years.length > 0 || shapes.length > 0 || looks.length > 0) && (
        <Card tint={TINT} label="What it found" glyph="star" className="span-6 ll-again">
          {months.length > 0 && <Group title="Months by her signature" rows={months} kind="month" ticked={ticked} tick={tick}
            words={(r) => `${MONTHS[r.s.month.value - 1]} ${r.p.year || (r.s.year && r.s.year.value)}, from “${r.s.month.written}”${r.s.month.was ? ` (kept now: ${MONTHS[r.s.month.was - 1]})` : ''}${r.s.month.sure ? '' : ': hard to read, check it'}`} />}
          {years.length > 0 && <Group title="Years, where none was kept" rows={years} kind="year" ticked={ticked} tick={tick} words={(r) => `${r.s.year.value}, from “${r.s.year.written}”${r.s.year.sure ? '' : ': hard to read, check it'}`} />}
          {shapes.length > 0 && <Group title="Canvases that aren’t rectangles (the frame follows the shape)" rows={shapes} kind="shape" ticked={ticked} tick={tick} words={(r) => shapeName(r.s.shape.value)} />}
          {looks.length > 0 && (
            <label className="ll-up-check">
              <input type="checkbox" checked={keepLooks} onChange={(e) => setD({ ...d, skip: { ...d.skip, looks: !e.target.checked } })} />
              <span><b>Keep what Claude saw in {looks.length === 1 ? 'it' : `all ${looks.length}`}</b>, for finding them in her gallery and for the featured wall: {looks.slice(0, 3).map((r) => `${r.p.title} (${[...r.s.looks.value.subjects.slice(0, 2), ...r.s.looks.value.moods.slice(0, 1).map((m) => MOODS[m].toLowerCase())].join(', ')})`).join('; ')}{looks.length > 3 ? '…' : ''}. A word that’s wrong can be taken off on each painting’s page.</span>
            </label>
          )}
          <div className="form-actions"><button type="button" className="btn" disabled={Boolean(busy)} onClick={save}>Save what’s ticked</button></div>
        </Card>
      )}
      {done && <p className="ll-up-note span-6" role="status">{done}</p>}
    </>
  )
}

function Group({ title, rows, kind, ticked, tick, words }) {
  return (
    <fieldset className="ll-again-group">
      <legend>{title}</legend>
      {rows.map((r) => (
        <label key={r.p.slug} className="ll-again-row">
          <input type="checkbox" checked={ticked(kind, r)} onChange={(e) => tick(kind, r, e.target.checked)} />
          {r.p.small && <span className="ll-up-mini"><img src={r.p.small} alt="" /></span>}
          <span><b>{r.p.title}</b><small>{words(r)}</small></span>
        </label>
      ))}
    </fieldset>
  )
}
