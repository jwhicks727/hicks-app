import { useEffect, useRef, useState } from 'react'
import { Link, Crumb } from '../shell/Link.jsx'
import { Card } from '../ui/Card.jsx'
import Dropzone from '../ui/Dropzone.jsx'
import { Toast, Working } from '../ui/Toast.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { navigate } from '../lib/router.js'
import { reducedMotion } from '../lib/motion.js'
import { cleanDrawing, TOPICS } from '../lib/drawings.js'
import { drawingsInbox } from '../lib/drawingInbox.js'
import { useDrawingBatch } from './useDrawingBatch.js'
import Cropper from './lifelist/Cropper.jsx'
import LookWords from '../parts/LookWords.jsx'
import { shapeName } from '../lib/shapes.js'
import './lifelist/addpaintings.css'

const TINT = '#D9739B'
const { inboxUrl } = drawingsInbox

// /drawings/add: many of Anna's drawings at once, for anyone in the family (Anna herself, or a parent for her).
// Each photo is straightened and cropped to the paper as it's sent up; Claude (if left on) suggests a working
// title, whether it's about the pets and any day written on it; then they go through the photos one at a time, fix
// whatever's off, and each one that looks right goes on her wall while they look at the next. The batch waits in
// the family's private storage, not on one device: Anna can send from her tablet and a parent finish at a computer.
// The parents see everyone's waiting photos; anyone else sees their own.
export default function AddDrawings({ me, members = [], g, today }) {
  const b = useDrawingBatch({ me, gallery: g.list, onSaved: g.reload })
  const names = Object.fromEntries(members.map((m) => [m.id, m.name]))
  const [toast, setToast] = useState(null), [wipe, setWipe] = useState(false)
  const t = b.tally, it = b.current
  const sending = b.items.filter((x) => x.sending).length

  const working = t.new ? `Getting ${t.new === 1 ? 'a photo' : `${t.new} photos`} ready…`
    : sending ? `Sending ${sending === 1 ? 'a photo' : `${sending} photos`} to the family’s storage…`
      : t.saving ? `Hanging ${t.saving === 1 ? 'one drawing' : `${t.saving} drawings`} on her wall…`
        : t.reading && !b.pause ? `Claude is looking at ${t.reading === 1 ? 'a drawing' : `${t.reading} drawings`}…` : null

  return (
    <>
      <header className="hero span-6">
        <Crumb to="/drawings">Anna’s Art</Crumb>
        <span className="kicker">Made by Anna</span>
        <h1 className="greet">Add her art</h1>
      </header>
      {working && <Working>{working}</Working>}
      {b.syncError && <p className="ll-up-note span-6" role="alert">The family’s storage couldn’t be reached just now, so changes may not be saved: {b.syncError} <button type="button" className="ll-up-link" onClick={b.refresh}>Try again</button></p>}
      {!b.loaded && <p className="ll-up-note span-6" role="status">Looking for photos already waiting…</p>}
      {b.pause && <p className="ll-up-note span-6" role="status">Suggestions stopped: {b.pause} <button type="button" className="ll-up-link" onClick={b.resume}>Try again</button></p>}
      {b.oldDb && <p className="ll-up-note span-6" role="status">Her art is being saved without its medium, shape, colours or fingerprint, because the database steps for them haven’t been run yet (20261108200000 and 20261108210000). Run them, and pieces added after that keep them.</p>}

      {b.loaded && !t.total && <Start read={b.read} setRead={b.setRead} add={b.add} />}

      {t.finished && (
        <Card tint={TINT} label="All done" glyph="star" className="span-6">
          <p>{t.added === 0 ? 'None were added.' : t.added === 1 ? 'Her drawing is on the wall.' : `All ${t.added} are on her wall.`}{t.skipped ? ` ${t.skipped} left out.` : ''}</p>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => { b.finish(); navigate('/drawings') }}>See her wall</button>
            <button type="button" className="btn ghost" onClick={b.finish}>Add more</button>
          </div>
        </Card>
      )}

      {it && <Review key={it.id} b={b} it={it} me={me} names={names} today={today} onSkip={(x) => setToast(x)} />}

      {t.total > 0 && <Strip b={b} />}

      {t.total > 0 && !t.finished && (
        <Card tint={TINT} label="More photos" glyph="star" className="span-6">
          <Dropzone accept="image/*" multiple label="Add more photos" hint="Choose them, take one, paste or drop them in." onFiles={b.add} />
          <ReadSwitch read={b.read} setRead={b.setRead} />
          <p className="muted">This batch waits in the family’s private storage, so you can open this page on another device and carry on from here. Jason and Laurie see everyone’s waiting photos; everyone else sees their own.</p>
          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={b.refresh}>Look for photos from another device</button>
            <button type="button" className="btn ghost" onClick={() => setWipe(true)}>Put this batch away</button>
          </div>
        </Card>
      )}

      {wipe && (
        <Confirm title="Put this batch away?" yes="Put it away" danger onNo={() => setWipe(false)} onYes={() => { b.finish(); setWipe(false) }}>
          <p>{t.added ? `The ${t.added === 1 ? 'one' : t.added} already on her wall stay${t.added === 1 ? 's' : ''}. ` : ''}The {t.toCheck + t.saving === 1 ? 'photo' : `${t.toCheck + t.saving} photos`} not yet added {t.toCheck + t.saving === 1 ? 'is' : 'are'} taken out of the family’s storage, from every device.</p>
        </Confirm>
      )}
      {toast && <Toast action="Undo" onAction={() => { b.unskip(toast.id); setToast(null) }} onClose={() => setToast(null)}>Left out {toast.title || 'that photo'}.</Toast>}
    </>
  )
}

function Start({ read, setRead, add }) {
  return (
    <Card tint={TINT} label="Photos of her art" glyph="star" className="span-6">
      <p>Drawings and paintings both: choose as many as you like. Each is straightened and cropped to the paper as it’s sent up; then you go through them one at a time and fix any it got wrong, here or on another device. Her art is only ever cropped and turned, never changed.</p>
      <ReadSwitch read={read} setRead={setRead} />
      <Dropzone accept="image/*" multiple label="Photos of her drawings and paintings" hint="Take a photo of each one, flat and in good light. Choose them, take one, paste or drop them in." onFiles={add} />
      <p className="muted">They’re sent to the family’s private storage and wait until each is added, even if the app is closed. Send them from a phone and open this page on a computer to crop them, if that’s easier.</p>
    </Card>
  )
}

function ReadSwitch({ read, setRead }) {
  return (
    <label className="ll-up-check">
      <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
      <span><b>Have Claude suggest a title.</b> The cropped photo of each piece goes to Claude (Anthropic), which suggests a working title, whether it’s about the pets, any day written on it, what it’s made with, the shape of its paper, and a few words for what it shows and how it feels, for finding it on her wall. It only looks at the photo; nothing is made from her art, and you check everything before it’s saved. Her own words are never guessed: they’re only what someone types in.</span>
    </label>
  )
}

const stateWords = (it) => ({ new: 'Getting ready', ready: it.saveError ? 'Not saved yet' : 'To check', saving: 'Saving…', added: 'On her wall', skipped: 'Left out', failed: 'Couldn’t open it' })[it.status] || ''

/** One photo: its crop, and what it'll be called. */
function Review({ b, it, me, names, today, onSkip }) {
  const saved = it.status === 'added'
  const locked = it.status === 'saving' || saved
  // Once saved, only its thumbnail is still kept
  const url = usePhotoUrl(it.status === 'new' || it.status === 'failed' ? null : it.id + (locked ? ':thumb' : ':view'))
  const editing = it.status === 'ready' || (saved && Boolean(it.editing))
  const [err, setErr] = useState(null)
  const n = b.items.indexOf(it) + 1, total = b.items.length
  const card = useRef(null)
  useEffect(() => {
    const el = card.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth' })
  }, [])
  const set = (patch) => { setErr(null); b.change(it.id, patch) }
  const waiting = it.read === 'reading' || it.read === 'waiting'
  const sentBy = it.addedBy && me && it.addedBy !== me.id ? (names[it.addedBy] || 'someone else') : null

  const add = (e) => {
    e.preventDefault()
    if (it.replace && !saved) { b.approve(it.id); return }
    const fields = cleanDrawing({ title: it.title, madeOn: it.madeOn, words: it.words, topic: it.topic }, today)
    if (fields.error) { setErr(fields.error); return }
    if (saved) { setErr(null); b.saveDetails(it.id); return }
    b.approve(it.id)
  }
  const step = (d) => b.go(b.items[(b.items.indexOf(it) + d + total) % total].id)
  const from = (field, words) => (it.read === 'done' && it[field] === 'claude' && !(it.touched && it.touched[field.replace('From', '')]) ? <p className="ll-up-from">{words}</p> : null)

  return (
    <article ref={card} className="card span-6 ll-up" style={{ '--tint': TINT }} aria-label={`Photo ${n} of ${total}`}>
      <div className="ll-up-head">
        <b>Photo {n} of {total}</b>
        <span className="ll-up-state">{stateWords(it)}</span>
      </div>
      {sentBy && <p className="ll-up-from">Sent by {sentBy}.</p>}

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
          <Cropper src={url} W={it.W} H={it.H} crop={it.crop} auto={it.auto} what="drawing" onChange={(crop) => set({ crop })} shape={it.shape} onShape={(shape) => set({ shape })} />
          {from('shapeFrom', `Claude thinks its paper is ${it.shape ? shapeName(it.shape).toLowerCase() : 'a rectangle'}: check its outline fits.`)}
          <LookAlike b={b} it={it} onSkip={onSkip} />
        </>
      )}
      {it.crop && it.status === 'ready' && it.replace && (
        <form className="form ll-up-form" onSubmit={add}>
          <p>This photo goes in place of <b>{(b.alike[it.id] || []).find((x) => x.id === it.replace)?.title || 'that one'}</b>: its title, its day, her words and everything kept about it stay, and only the photo changes.</p>
          {it.saveError && <p className="err" role="alert">It couldn’t be saved: {it.saveError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn" disabled={!url}>{it.saveError ? 'Try again' : 'Looks right: put it in'}</button>
            <button type="button" className="btn ghost" onClick={() => b.replaceWith(it.id, null)}>Don’t replace it</button>
          </div>
        </form>
      )}
      {it.crop && saved && !editing && (
        <div className="ll-up-done">
          {url && <span className="ll-up-mini"><img src={url} alt="" /></span>}
          <p><b>{it.replace ? 'The new photo' : it.title}</b> is on her wall{it.replace ? ', in place of the old one' : ''}.</p>
          <Link to={'/drawings/' + (it.replace || it.id)}>See it</Link>
          {!it.replace && <button type="button" className="ll-up-link" onClick={() => b.editSaved(it.id, true)}>Change its details</button>}
        </div>
      )}
      {it.crop && it.status === 'saving' && <div className="ll-up-done">{url && <span className="ll-up-mini"><img src={url} alt="" /></span>}<p><b>{it.title}</b> is being hung up.</p></div>}

      {it.crop && editing && !(it.status === 'ready' && it.replace) && (
        <form className="form ll-up-form" onSubmit={add}>
          <label>Its title
            <input maxLength={120} value={it.title} placeholder={waiting ? 'Claude is suggesting one…' : 'What Anna calls it'} onChange={(e) => set({ title: e.target.value, titleFrom: null })} />
          </label>
          {from('titleFrom', 'Claude’s working title, from what it shows. Change it to what Anna calls it.')}
          <div className="form-row">
            <label>The day she drew it (if you know)<input type="date" max={today} value={it.madeOn || ''} onChange={(e) => set({ madeOn: e.target.value, madeOnFrom: null })} /></label>
            <label>It’s about<select value={it.topic || ''} onChange={(e) => set({ topic: e.target.value, topicFrom: null })}>
              <option value="">No topic</option>
              {Object.entries(TOPICS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select></label>
          </div>
          {waiting && !(it.touched && (it.touched.madeOn || it.touched.topic)) && <p className="ll-up-from">Claude is looking for a day written on it and what it’s about…</p>}
          {from('madeOnFrom', `The day written on it (“${(it.reading && it.reading.written) || ''}”): check it.`)}
          {from('topicFrom', 'Claude thinks it’s about the pets.')}
          <label>Made with<input maxLength={80} value={it.medium || ''} placeholder={waiting ? 'Looking…' : 'Crayon on paper'} onChange={(e) => set({ medium: e.target.value, mediumFrom: null })} /></label>
          {from('mediumFrom', 'Claude’s guess from the photo: check it.')}
          <label>In her words (only if she said some)<textarea rows={3} maxLength={1000} value={it.words || ''} onChange={(e) => set({ words: e.target.value })} placeholder="Exactly what she said, or leave it blank" /></label>
          <LookWords looks={it.looks} onChange={(looks) => set({ looks })} what="her wall" />
          {it.read === 'failed' && <p className="ll-up-from">Claude couldn’t manage it: {it.readError} <button type="button" className="ll-up-link" onClick={() => b.readAgain(it.id)}>Try again</button></p>}
          {it.saveError && <p className="err" role="alert">It couldn’t be saved: {it.saveError}</p>}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="form-actions">
            {saved
              ? <><button type="submit" className="btn">Save changes</button><button type="button" className="btn ghost" onClick={() => { setErr(null); b.editSaved(it.id, false) }}>Done</button></>
              : <><button type="submit" className="btn" disabled={!url}>{it.saveError ? 'Try saving again' : 'Looks right: hang it up'}</button>
                <button type="button" className="btn ghost" onClick={() => { b.skip(it.id); onSkip({ id: it.id, title: it.title }) }}>Leave this one out</button></>}
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

/** It looks like art already on her wall, or another photo here: leave it out, add it anyway, or put it in that one's place. */
function LookAlike({ b, it, onSkip }) {
  const hits = b.alike[it.id]
  if (!hits || !hits.length || it.replace) return null
  if (it.dupOk) return <p className="ll-up-from">Adding it even though it looks like {hits[0].title || 'another'}. <button type="button" className="ll-up-link" onClick={() => b.dupOk(it.id, false)}>Undo</button></p>
  const top = hits[0]
  return (
    <div className="ll-dup" role="status">
      <div>
        <p className="ll-up-flag">{top.where === 'gallery' ? <>This looks like <b>{top.title}</b>, already on her wall.</> : <>This looks like photo {top.n} in this batch.</>}</p>
        <div className="ll-dup-acts">
          <button type="button" className="ll-up-link" onClick={() => { b.skip(it.id); onSkip({ id: it.id, title: it.title }) }}>Leave this one out</button>
          {top.where === 'gallery' && top.canReplace && <button type="button" className="ll-up-link" onClick={() => b.replaceWith(it.id, top.id)}>Put this photo in its place</button>}
          <button type="button" className="ll-up-link" onClick={() => b.dupOk(it.id)}>It’s a different one: add it</button>
        </div>
      </div>
    </div>
  )
}

/** What the auto-crop made of it, when it wasn't sure. */
function CropNote({ it }) {
  if (it.sure || (it.touched && it.touched.crop)) return <p className="ll-up-from">Straightened and cropped by itself. Fix it if it’s off.</p>
  const words = it.kind === 'whole' ? 'This photo looks like it’s all drawing already. Check its edges.'
    : it.kind === 'none' ? 'It couldn’t find the paper’s edges: drag them in, or tap its corners.'
      : 'It wasn’t sure of this crop. Check the edges.'
  return <p className="ll-up-flag" role="status">{words}</p>
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
