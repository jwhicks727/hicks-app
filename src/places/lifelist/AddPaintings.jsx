import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Crumb } from '../../shell/Link.jsx'
import { Card } from '../../ui/Card.jsx'
import Dropzone from '../../ui/Dropzone.jsx'
import { Toast, Working } from '../../ui/Toast.jsx'
import { Confirm } from '../../ui/Confirm.jsx'
import { supabase } from '../../lib/supabase.js'
import { navigate } from '../../lib/router.js'
import { reducedMotion } from '../../lib/motion.js'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { inboxUrl } from '../../lib/inboxStore.js'
import { cleanTitle, cleanYear, MONTHS } from '../../lib/paintingBatch.js'
import { SEASONS, SEASON_ORDER } from '../../lib/seasons.js'
import { shapeName } from '../../lib/shapes.js'
import { MOODS, STYLES, WEATHERS } from '../../lib/gallery.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'
import { usePaintingBatch } from './usePaintingBatch.js'
import Cropper from './Cropper.jsx'
import './addpaintings.css'

// /lifelist/paintings/add: many of Laurie's paintings at once, for Jason or Laurie.
// Each photo is straightened and cropped to the painting as it's sent up; Claude
// (if they leave it on) reads the year by her signature and suggests a working
// title, the medium and the seasons; then they go through the photos one at a
// time, fix whatever's off, and each one that looks right is saved while they
// look at the next. Her blanket yes covers every painting (decisions log,
// 2026-11-01). The batch waits in the family's private storage, not on one
// device: send it from a phone and go through it on a computer, or leave it half
// done and carry on from another device (decisions log, 2026-11-08).
export default function AddPaintings() {
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
        <h1 className="greet">Add her paintings</h1>
      </header>
      {!family.loaded ? null
        : !supabase ? <Card tint="#C0824F" label="Not connected" glyph="star" className="span-6"><p>Her paintings are kept in the family’s private storage, and the database isn’t connected on this copy of the app.</p></Card>
          : !parent ? <Card tint="#C0824F" label="Jason or Laurie" glyph="star" className="span-6"><p>Jason or Laurie add her paintings.</p></Card>
            : <Batch />}
    </>
  )
}

function Batch() {
  const { list, loaded, reload } = usePaintings()
  const onSaved = useCallback(() => reload(), [reload])
  const b = usePaintingBatch({ gallery: list, onSaved })
  const [toast, setToast] = useState(null), [wipe, setWipe] = useState(false)
  const t = b.tally, it = b.current

  const sending = b.items.filter((x) => x.sending).length
  const working = t.new ? `Getting ${t.new === 1 ? 'a photo' : `${t.new} photos`} ready…`
    : sending ? `Sending ${sending === 1 ? 'a photo' : `${sending} photos`} to the family’s storage…`
    : t.saving ? `Saving ${t.saving === 1 ? 'one painting' : `${t.saving} paintings`} to her gallery…`
      : t.reading && !b.pause ? `Claude is reading ${t.reading === 1 ? 'her signature' : `${t.reading} signatures`}…` : null

  return (
    <>
      {working && <Working>{working}</Working>}
      {b.syncError && <p className="ll-up-note span-6" role="alert">The family’s storage couldn’t be reached just now, so changes may not be saved: {b.syncError} <button type="button" className="ll-up-link" onClick={b.refresh}>Try again</button></p>}
      {!b.loaded && <p className="ll-up-note span-6" role="status">Looking for photos already waiting…</p>}
      {b.pause && <p className="ll-up-note span-6" role="status">Reading stopped: {b.pause} <button type="button" className="ll-up-link" onClick={b.resume}>Try again</button></p>}
      {b.oldDb && <p className="ll-up-note span-6" role="status">Her paintings are being saved without their month, shape, colours or fingerprint, because the database step for them hasn’t been run yet (20261108200000_gallery_shapes_months_features). Run it, and paintings added after that keep them.</p>}

      {b.loaded && !t.total && <Start read={b.read} setRead={b.setRead} add={b.add} />}

      {t.finished && (
        <Card tint="#5F8A4A" label="All done" glyph="star" className="span-6">
          <p>{t.added === 0 ? 'None were added.' : t.added === 1 ? 'Her painting is in her gallery.' : `All ${t.added} are in her gallery.`}{t.skipped ? ` ${t.skipped} left out.` : ''}</p>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => { b.finish(); navigate('/lifelist/paintings') }}>See her gallery</button>
            <button type="button" className="btn ghost" onClick={b.finish}>Add more</button>
          </div>
        </Card>
      )}

      {it && <Review key={it.id} b={b} it={it} loaded={loaded} onSkip={(x) => setToast(x)} />}

      {t.total > 0 && <Strip b={b} />}

      {t.total > 0 && !t.finished && (
        <Card tint="#C0824F" label="More photos" glyph="star" className="span-6">
          <Dropzone accept="image/*" multiple label="Add more photos" hint="Choose them, take one, paste or drop them in." onFiles={b.add} />
          <ReadSwitch read={b.read} setRead={b.setRead} />
          <p className="muted">This batch waits in the family’s private storage, so you can open this page on another device (a computer, say) and carry on from here.</p>
          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={b.refresh}>Look for photos from another device</button>
            <button type="button" className="btn ghost" onClick={() => setWipe(true)}>Put this batch away</button>
          </div>
        </Card>
      )}

      {wipe && (
        <Confirm title="Put this batch away?" yes="Put it away" danger onNo={() => setWipe(false)} onYes={() => { b.finish(); setWipe(false) }}>
          <p>{t.added ? `The ${t.added === 1 ? 'one' : t.added} already in her gallery stay${t.added === 1 ? 's' : ''}. ` : ''}The {t.toCheck + t.saving === 1 ? 'photo' : `${t.toCheck + t.saving} photos`} not yet added {t.toCheck + t.saving === 1 ? 'is' : 'are'} taken out of the family’s storage, from every device.</p>
        </Confirm>
      )}
      {toast && <Toast action="Undo" onAction={() => { b.unskip(toast.id); setToast(null) }} onClose={() => setToast(null)}>Left out {toast.title || 'that photo'}.</Toast>}
    </>
  )
}

/** The first screen: what happens, what goes to Claude, and the photos. */
function Start({ read, setRead, add }) {
  return (
    <Card tint="#C0824F" label="Photos of her paintings" glyph="star" className="span-6">
      <p>Choose as many as you like. Each is straightened and cropped to the painting as it’s sent up; then you go through them one at a time and fix any it got wrong, here or on another device. Her painting is only ever cropped and turned, never changed.</p>
      <ReadSwitch read={read} setRead={setRead} />
      <Dropzone accept="image/*" multiple label="Photos of her paintings" hint="docs/ART-CAPTURE.md says how to take them. Choose them, take one, paste or drop them in." onFiles={add} />
      <p className="muted">They’re sent to the family’s private storage (only Jason and Laurie see them there) and wait until each is added, even if the app is closed. Send them from a phone and open this page on a computer to crop them, if that’s easier.</p>
    </Card>
  )
}

function ReadSwitch({ read, setRead }) {
  return (
    <label className="ll-up-check">
      <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
      <span><b>Have Claude read each one.</b> The cropped photo, and its corners enlarged, go to Claude (Anthropic), which reads the year (and any month) by her signature and suggests a working title, the medium, the seasons it suits, the shape of its canvas, and a few words for what it shows and how it feels, for finding it in her gallery. It only reads them; nothing is made from her painting, and you check everything before it’s saved.</span>
    </label>
  )
}

/** One photo: its crop, and what it'll be called. */
function Review({ b, it, loaded, onSkip }) {
  const saved = it.status === 'added'
  const locked = it.status === 'saving' || saved
  // Once saved, only its thumbnail is still kept
  const url = usePhotoUrl(it.status === 'new' || it.status === 'failed' ? null : it.id + (locked ? ':thumb' : ':view'))
  // Details of a photo that's already saved can be fixed here; its crop can't (the files are in her gallery)
  const editing = it.status === 'ready' || (saved && Boolean(it.editing))
  const [err, setErr] = useState(null)
  const n = b.items.indexOf(it) + 1, total = b.items.length
  // The next photo comes up where this one's crop was: back up to it if the page was left further down
  const card = useRef(null)
  useEffect(() => {
    const el = card.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth' })
  }, [])
  const set = (patch) => { setErr(null); b.change(it.id, patch) }

  const add = (e) => {
    e.preventDefault()
    if (it.replace && !saved) { b.approve(it.id); return }
    if (!cleanTitle(it.title)) { setErr('Give it a title: a working one is fine.'); return }
    const y = cleanYear(it.year, b.thisYear)
    if (y.error) { setErr(y.error); return }
    if (saved) { setErr(null); b.saveDetails(it.id); return }
    b.approve(it.id)
  }
  const step = (d) => b.go(b.items[(b.items.indexOf(it) + d + total) % total].id)

  return (
    <article ref={card} className="card span-6 ll-up" style={{ '--tint': '#C0824F' }} aria-label={`Photo ${n} of ${total}`}>
      <div className="ll-up-head">
        <b>Photo {n} of {total}</b>
        <span className="ll-up-state">{stateWords(it)}</span>
      </div>

      {it.status === 'new' && <div className="ll-up-wait"><span className="working-dot" aria-hidden="true" />Getting it ready…</div>}
      {it.status === 'failed' && (
        <div className="ll-up-failed">
          <p className="err">{it.name}: {it.error}</p>
          <button type="button" className="btn ghost" onClick={() => { b.skip(it.id); onSkip({ id: it.id, title: it.name }) }}>Take it off the list</button>
        </div>
      )}

      {it.crop && it.status === 'ready' && (
        <>
          <CropNote it={it} />
          {it.sending && <p className="ll-up-from">Sending it to the family’s storage, so another device can pick it up. You can carry on here.</p>}
          {it.sendError && <p className="err" role="alert">It couldn’t be sent to the family’s storage: {it.sendError} <button type="button" className="ll-up-link" onClick={() => b.resend(it.id)}>Try again</button></p>}
          <Cropper src={url} W={it.W} H={it.H} crop={it.crop} auto={it.auto} onChange={(crop) => set({ crop })} shape={it.shape} onShape={(shape) => set({ shape })} />
          <From it={it} field="shape" />
          <LookAlike b={b} it={it} onSkip={onSkip} />
        </>
      )}
      {it.crop && saved && !editing && <Finished it={it} url={url} onChange={() => b.editSaved(it.id, true)} />}

      {it.crop && it.status === 'ready' && it.replace && (
        <form className="form ll-up-form" onSubmit={add}>
          <p>This photo goes in place of <b>{(b.alike[it.id] || []).find((x) => x.slug === it.replace)?.title || 'that painting'}</b>: its title, year, seasons and everything kept about it stay, and only the photo changes.</p>
          {it.saveError && <p className="err" role="alert">It couldn’t be saved: {it.saveError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn" disabled={!loaded || !url}>{it.saveError ? 'Try again' : 'Looks right: put it in'}</button>
            <button type="button" className="btn ghost" onClick={() => b.dupChoice(it.id, {})}>Don’t replace it</button>
          </div>
        </form>
      )}

      {it.crop && editing && !(it.status === 'ready' && it.replace) && (
        <form className="form ll-up-form" onSubmit={add}>
          <label>Its title
            <input maxLength={200} value={it.title} placeholder={it.read === 'reading' || it.read === 'waiting' ? 'Claude is suggesting one…' : 'A working title'} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <From it={it} field="title" />
          <label className="ll-up-check small"><input type="checkbox" checked={!it.named} onChange={(e) => set({ named: !e.target.checked })} /><span>A working title, until Laurie names it</span></label>
          <div className="form-row ll-up-ym">
            <label>Year<input inputMode="numeric" maxLength={4} value={it.year} placeholder={it.read === 'reading' || it.read === 'waiting' ? 'Reading…' : ''} onChange={(e) => set({ year: e.target.value.replace(/\D/g, ''), yearFrom: null })} /></label>
            <label>Month (if she wrote one)<select value={it.year && it.month ? String(it.month) : ''} disabled={!it.year} onChange={(e) => set({ month: e.target.value ? Number(e.target.value) : null, monthFrom: null })}>
              <option value="">No month</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select></label>
          </div>
          <label>Medium<input maxLength={80} value={it.medium} placeholder={it.read === 'reading' || it.read === 'waiting' ? 'Looking…' : 'Watercolor on paper'} onChange={(e) => set({ medium: e.target.value, mediumFrom: null })} /></label>
          <From it={it} field="year" />
          <From it={it} field="month" />
          <From it={it} field="medium" />
          <fieldset className="choice-row ll-up-seasons"><legend>Its seasons (it hangs on Home then)</legend>
            {SEASON_ORDER.map((k) => <button key={k} type="button" aria-pressed={it.seasons.includes(k)} onClick={() => set({ seasons: it.seasons.includes(k) ? it.seasons.filter((x) => x !== k) : [...it.seasons, k], seasonsFrom: null })}>{SEASONS[k].label}</button>)}
          </fieldset>
          <From it={it} field="seasons" />
          <Looks looks={it.looks} onChange={(looks) => set({ looks })} />
          {it.read === 'failed' && <p className="ll-up-from">Claude couldn’t read it: {it.readError} <button type="button" className="ll-up-link" onClick={() => b.readAgain(it.id)}>Read it again</button></p>}
          {it.read === 'done' && it.touched && it.touched.crop && <p className="ll-up-from">Cropped differently since Claude read it? <button type="button" className="ll-up-link" onClick={() => b.readAgain(it.id)}>Read it again</button></p>}
          {it.saveError && <p className="err" role="alert">It couldn’t be saved: {it.saveError}</p>}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="form-actions">
            {saved
              ? <><button type="submit" className="btn" disabled={!loaded}>Save changes</button><button type="button" className="btn ghost" onClick={() => { setErr(null); b.editSaved(it.id, false) }}>Done</button></>
              : <><button type="submit" className="btn" disabled={!loaded || !url}>{it.saveError ? 'Try saving again' : 'Looks right: add it'}</button>
                <button type="button" className="btn ghost" onClick={() => { b.skip(it.id); onSkip({ id: it.id, title: cleanTitle(it.title) }) }}>Leave this one out</button></>}
          </div>
        </form>
      )}

      {total > 1 && (
        <nav className="ll-up-step" aria-label="The other photos">
          <button type="button" className="ll-up-link" onClick={() => step(-1)}>‹ Previous</button>
          <button type="button" className="ll-up-link" onClick={() => step(1)}>Next ›</button>
        </nav>
      )}
    </article>
  )
}

const stateWords = (it) => ({ new: 'Getting ready', ready: it.saveError ? 'Not saved yet' : 'To check', saving: 'Saving…', added: 'In her gallery', skipped: 'Left out', failed: 'Couldn’t open it' })[it.status] || ''

/** What the auto-crop made of it, when it wasn't sure. */
function CropNote({ it }) {
  if (it.sure || (it.touched && it.touched.crop)) return <p className="ll-up-from">Straightened and cropped by itself. Fix it if it’s off.</p>
  const words = it.kind === 'whole' ? 'This photo looks like it’s all painting already. Check its edges.'
    : it.kind === 'none' ? 'It couldn’t find the painting’s edges: drag them in, or tap its corners.'
      : 'It wasn’t sure of this crop. Check the edges.'
  return <p className="ll-up-flag" role="status">{words}</p>
}

/** Where a title, year, medium or seasons came from, in a line under it. */
function From({ it, field }) {
  const r = it.reading || {}, waiting = it.read === 'waiting' || it.read === 'reading'
  const touched = it.touched && it.touched[field]
  let words = null
  if (waiting && !touched && field === 'year') words = 'Reading her signature…'
  else if (it.read !== 'done' || touched) words = null
  else if (field === 'title') words = it.named ? null : 'Claude’s working title, from what it shows.'
  else if (field === 'year') {
    words = it.yearFrom === 'signature' ? `From her signature: “${r.written || r.signature}”.`
      : it.yearFrom === 'unsure' ? `Hard to read by her signature (“${r.written || r.signature}”): check it.`
        : r.signature ? `Her signature (“${r.signature}”) has no year by it.` : 'No signature or year found.'
  } else if (field === 'medium') words = it.mediumFrom === 'claude' ? 'Claude’s guess from the photo: check it.' : null
  else if (field === 'seasons') words = it.seasonsFrom !== 'claude' ? null : it.seasons.length ? 'Claude’s pick, from what it shows.' : 'Claude thought it suits any time of year.'
  else if (field === 'month') words = it.month && it.monthFrom === 'signature' ? `The month by her signature: “${r.written}”.` : it.month && it.monthFrom === 'unsure' ? `A month by her signature, hard to read (“${r.written}”): check it.` : null
  else if (field === 'shape') words = it.shape && it.shapeFrom === 'claude' ? `Claude thinks its canvas is ${shapeName(it.shape).toLowerCase()}: check its outline fits.` : null
  if (!words) return null
  return <p className={'ll-up-from' + ((field === 'year' && it.yearFrom === 'unsure') || (field === 'month' && it.monthFrom === 'unsure') ? ' ll-up-flag' : '')}>{words}</p>
}

/**
 * What Claude saw in it, kept with it for the gallery's filters and featured walls once this is saved: each word can be
 * taken off with a tap (Claude's words are only ever suggestions until someone keeps them).
 */
function Looks({ looks, onChange }) {
  if (!looks) return null
  const words = [
    ...(looks.subjects || []).map((w) => ['subjects', w, w]),
    ...(looks.moods || []).map((w) => ['moods', w, (MOODS[w] || w).toLowerCase()]),
    ...(looks.style ? [['style', looks.style, (STYLES[looks.style] || looks.style).toLowerCase()]] : []),
    ...(looks.weather ? [['weather', looks.weather, (WEATHERS[looks.weather] || looks.weather).toLowerCase()]] : []),
  ]
  if (!words.length) return null
  const drop = (k, w) => {
    const next = { ...looks, [k]: Array.isArray(looks[k]) ? looks[k].filter((x) => x !== w) : '' }
    onChange(next.subjects.length || next.moods.length || next.style || next.weather ? next : null)
  }
  return (
    <div className="ll-looks">
      <span className="ll-looks-head">What Claude sees in it, for finding it in her gallery (tap one that’s wrong):</span>
      <span className="ll-looks-row">{words.map(([k, w, label]) => <button key={k + w} type="button" className="ll-look" onClick={() => drop(k, w)} aria-label={`Take “${label}” off`}>{label} <span aria-hidden="true">×</span></button>)}</span>
    </div>
  )
}

/** It looks like a painting already in her gallery, or another photo here: leave it out, add it anyway, or put it in that one's place. */
function LookAlike({ b, it, onSkip }) {
  const hits = b.alike[it.id]
  if (!hits || !hits.length || it.dupOk || it.replace) return it.dupOk && hits && hits.length ? <p className="ll-up-from">Adding it even though it looks like {hits[0].title}. <button type="button" className="ll-up-link" onClick={() => b.dupChoice(it.id, {})}>Undo</button></p> : null
  const top = hits[0]
  return (
    <div className="ll-dup" role="status">
      {top.small && <span className="ll-up-mini"><img src={top.small} alt="" /></span>}
      <div>
        <p className="ll-up-flag">{top.where === 'gallery' ? <>This looks like <b>{top.title}</b>, already in her gallery.</> : <>This looks like photo {top.n} in this batch{top.title && !/^Photo \d/.test(top.title) ? <> (<b>{top.title}</b>)</> : ''}.</>}</p>
        <div className="ll-dup-acts">
          <button type="button" className="ll-up-link" onClick={() => { b.skip(it.id); onSkip({ id: it.id, title: cleanTitle(it.title) }) }}>Leave this one out</button>
          {top.where === 'gallery' && !top.flyer && <button type="button" className="ll-up-link" onClick={() => b.dupChoice(it.id, { replace: top.slug })}>Put this photo in its place</button>}
          <button type="button" className="ll-up-link" onClick={() => b.dupChoice(it.id, { ok: true })}>It’s a different one: add it</button>
        </div>
        {top.where === 'gallery' && top.flyer && <p className="ll-up-from">Its bird flies from the photo it has now, so it can’t be replaced here.</p>}
      </div>
    </div>
  )
}

/** A photo already saved or saving: shown as it will hang. */
function Finished({ it, url, onChange }) {
  return (
    <div className="ll-up-done">
      {url && <span className="ll-up-mini"><img src={url} alt="" /></span>}
      <p><b>{it.replace ? 'The new photo' : it.title}</b>{!it.replace && it.year ? `, ${it.year}` : ''}{it.status === 'added' ? (it.replace ? ' is in her gallery, in place of the old one.' : ' is in her gallery.') : ' is being saved.'}</p>
      {it.status === 'added' && it.slug && <Link to={'/lifelist/paintings/' + it.slug}>See it</Link>}
      {it.status === 'added' && !it.replace && <button type="button" className="ll-up-link" onClick={onChange}>Change its details</button>}
    </div>
  )
}

/** Every photo in the batch, small, to jump to; each says where it stands. */
function Strip({ b }) {
  return (
    <nav className="ll-up-strip span-6" aria-label="The photos in this batch">
      {b.items.map((x, i) => (
        <button key={x.id} type="button" className={'ll-up-thumb ' + x.status + (x.status === 'ready' && x.sure === false && !(x.touched && x.touched.crop) ? ' unsure' : '') + (b.current && b.current.id === x.id ? ' on' : '')}
          aria-label={`Photo ${i + 1}: ${x.title || x.name}, ${stateWords(x).toLowerCase()}`} aria-current={b.current && b.current.id === x.id ? 'true' : undefined} onClick={() => b.go(x.id)}>
          <Thumb id={x.status === 'new' || x.status === 'failed' ? null : x.id} />
          <span className="ll-up-badge" aria-hidden="true">{x.status === 'added' ? '✓' : x.status === 'failed' ? '!' : x.status === 'skipped' ? '–' : ''}</span>
        </button>
      ))}
    </nav>
  )
}

function Thumb({ id }) {
  const url = usePhotoUrl(id ? id + ':thumb' : null)
  return url ? <img src={url} alt="" /> : <span className="ll-up-blank" />
}

/** One of a photo's pictures in the family's storage ("<id>:view"), as an address an <img> can show. */
function usePhotoUrl(key) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let live = true
    setUrl(null)
    if (!key) return undefined
    const [id, name] = key.split(':')
    inboxUrl(id, name).then((u) => { if (live) setUrl(u) }, () => {})
    return () => { live = false }
  }, [key])
  return url
}
