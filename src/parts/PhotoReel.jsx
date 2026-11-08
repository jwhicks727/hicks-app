import { useEffect, useState } from 'react'
import { Sheet } from '../ui/Sheet.jsx'
import Dropzone from '../ui/Dropzone.jsx'
import { Toast, Working } from '../ui/Toast.jsx'
import { useSession } from '../lib/auth.js'
import { useCookbook } from '../lib/useKitchen.js'
import { usePhotoStore, useTripUrls, addPhotos, confirmTag, confirmTags, changeTag, removeTag, restoreTag, addHandTag, setCaption, deletePhoto } from '../lib/reelStore.js'
import { KIND_ONE, KIND_ORDER, photosFor, tagsByPhoto, suggestedIn, reelWords } from '../lib/photos.js'
import { useTownList } from '../places/yonder/Been.jsx'
import { when } from './PhotoBits.jsx'
import './photos.css'

// The trip photo reel (Jason's ask): photos added by hand to a stay or a kept trip, with
// Claude tagging what's in them (a plant, a bird, a dish, a place) so nobody has to fuss.
// The pattern is the paintings uploader's: choose many at once, a plain note on what goes to
// Claude, a "working" bar, thumbnails. Claude's tags are suggestions until confirmed (one
// tap for all of them); a confirmed dish or place can be linked to a recipe or the town's
// list, and a plant, bird or animal turns up in the Garden and the Life List.
// Photos are private (the `trips` bucket, signed links). Claude is never asked about people.

const READ_KEY = 'teamhicks.reel.read'
const readPref = () => { try { return localStorage.getItem(READ_KEY) !== 'no' } catch { return true } }

function Chips({ tags, max = 4 }) {
  const list = tags.slice(0, max)
  if (!list.length) return null
  return <ul className="ph-chips">{list.map((t) => <li key={t.id} className={t.status}>{t.name}</li>)}{tags.length > max && <li className="more">+{tags.length - max}</li>}</ul>
}

/** The reel for a stay or a kept trip: the photos of `town` between `from` and `last`. */
export default function PhotoReel({ town, region, from, last }) {
  const session = useSession()
  const store = usePhotoStore(session)
  const book = useCookbook(session)
  const { list: places } = useTownList({ town, region: region || null })
  const [read, setRead] = useState(readPref)
  const [stage, setStage] = useState(null), [failed, setFailed] = useState([]), [open, setOpen] = useState(null), [toast, setToast] = useState(null)
  const [gone, setGone] = useState(null) // a photo taken off, waiting out its Undo
  const tagMap = tagsByPhoto(store.tags)
  const photos = photosFor(store.photos, { town, from, last }).filter((p) => !gone || p.id !== gone.id)
  const urls = useTripUrls(photos.map((p) => p.thumb_path || p.path))
  const waiting = photos.flatMap((p) => suggestedIn(tagMap.get(p.id)))
  const setReadPref = (v) => { setRead(v); try { localStorage.setItem(READ_KEY, v ? 'yes' : 'no') } catch { /* fine */ } }

  const add = async (files) => {
    setFailed([])
    const res = await addPhotos(files, { town, region, from, last, read, recipes: (book.recipes || []).map((r) => ({ id: r.id, title: r.title })), places: places.map((p) => ({ id: p.id, name: p.name })) }, setStage)
    setStage(null); setFailed(res.failed)
    if (res.added.length) setToast({ text: `${res.added.length === 1 ? 'A photo is' : `${res.added.length} photos are`} in the reel${read ? ', with Claude’s tags to check' : ''}.`, undo: null })
  }
  const approveAll = async () => {
    const ids = waiting.map((t) => t.id)
    const err = await confirmTags(ids)
    setToast({ text: err ? `Couldn’t confirm them: ${err}` : `${ids.length === 1 ? 'The tag is' : `All ${ids.length} tags are`} confirmed.`, undo: null })
  }
  const takeOff = (photo) => { setOpen(null); setGone(photo); setToast({ text: 'Took the photo off the reel.', undo: () => { setGone(null); setToast(null) }, finalise: photo }) }
  const closeToast = () => { if (toast && toast.finalise) deletePhoto(toast.finalise).then(() => setGone(null)); setToast(null) }

  return (
    <section className="ph-reel" aria-label="Photos from the trip">
      {stage && <Working>{stage}</Working>}
      <h3>Photos{photos.length ? <span className="ph-count"> · {reelWords(photos, tagMap)}</span> : null}</h3>
      {photos.length > 0 && (
        <ul className="ph-grid">{photos.map((p) => (
          <li key={p.id}>
            <button type="button" className="ph-tile" onClick={() => setOpen(p.id)} aria-label={`Open the photo from ${when(p.taken_on)}`}>
              {urls[p.thumb_path || p.path] ? <img src={urls[p.thumb_path || p.path]} alt={p.caption || ''} loading="lazy" referrerPolicy="no-referrer" /> : <span className="ph-blank" aria-hidden="true" />}
            </button>
            <Chips tags={tagMap.get(p.id) || []} />
          </li>
        ))}</ul>
      )}
      {waiting.length > 0 && (
        <p className="ph-check" role="status">Claude suggests {waiting.length === 1 ? 'a tag' : `${waiting.length} tags`}: they count once you say so. <button type="button" className="btn" onClick={approveAll}>Looks right</button></p>
      )}
      {failed.length > 0 && <ul className="err" role="alert">{failed.map((f, i) => <li key={i}><b>{f.name}:</b> {f.why}</li>)}</ul>}
      <Dropzone accept="image/*" multiple label="Add photos from the trip" hint="Choose them, take one, paste or drop them in." onFiles={add} disabled={Boolean(stage)} />
      <label className="ph-read">
        <input type="checkbox" checked={read} onChange={(e) => setReadPref(e.target.checked)} />
        <span><b>Have Claude look at each photo.</b> A shrunk copy of the photo, the town, and the titles of your cookbook and of the places on this town’s list go to Claude (Anthropic), which suggests what’s in it: a plant, a bird, a dish, a place named by a sign. It never names or describes a person. Nothing it suggests counts until you confirm it.</span>
      </label>
      <p className="muted small">Photos are kept in the family’s private storage, never in the app’s files. Tap one to fix its tags, add one of your own, or take it off.</p>
      {open && <Viewer id={open} recipes={book.recipes || []} places={places} onClose={() => setOpen(null)} onTakeOff={takeOff} />}
      {toast && <Toast action={toast.undo ? 'Undo' : undefined} onAction={toast.undo || undefined} onClose={closeToast}>{toast.text}</Toast>}
    </section>
  )
}

/** One photo, large: its caption, its tags (confirm, fix, link, remove, add), and taking it off. */
function Viewer({ id, recipes, places, onClose, onTakeOff }) {
  const session = useSession()
  const store = usePhotoStore(session)
  const p = store.photos.find((x) => x.id === id)
  const tags = tagsByPhoto(store.tags).get(id) || []
  const url = useTripUrls(p ? [p.path] : [])[p && p.path]
  const [cap, setCap] = useState(p ? p.caption || '' : ''), [kind, setKind] = useState('plant'), [name, setName] = useState(''), [err, setErr] = useState(null), [toast, setToast] = useState(null)
  useEffect(() => { if (p) setCap(p.caption || '') }, [p && p.caption]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return null
  const linkOptions = (t) => (t.kind === 'dish' ? recipes.map((r) => [r.id, r.title, 'recipe']) : t.kind === 'place' ? places.map((x) => [x.id, x.name, 'been_place']) : null)
  return (
    <Sheet title={when(p.taken_on)} onClose={onClose} className="ph-sheet">
      {url ? <img className="ph-big" src={url} alt={p.caption || 'A photo from the trip'} referrerPolicy="no-referrer" /> : <p className="muted">Opening the photo…</p>}
      <label className="yo-field">A caption<input value={cap} maxLength={300} onChange={(e) => setCap(e.target.value)} onBlur={() => { if (cap !== (p.caption || '')) setCaption(p.id, cap) }} placeholder="What was this?" /></label>
      <h3 className="ph-h">What’s in it</h3>
      {!tags.length && <p className="muted">Nothing tagged yet.</p>}
      <ul className="ph-tags">{tags.map((t) => {
        const opts = linkOptions(t)
        return (
          <li key={t.id} className={t.status}>
            <span className="ph-tag-main"><small>{KIND_ONE[t.kind]}{t.by_ai ? ' · Claude' : ''}{t.confidence && t.status === 'suggested' ? ` · ${t.confidence} confidence` : ''}</small><b>{t.name}</b>{t.sci && <i className="ph-sci">{t.sci}</i>}</span>
            {opts && opts.length > 0 && (
              <select aria-label={`Link ${t.name}`} value={t.ref_id || ''} onChange={async (e) => { const o = opts.find((x) => x[0] === e.target.value); await changeTag(t.id, o ? { ref_kind: o[2], ref_id: o[0] } : { ref_kind: null, ref_id: null }) }}>
                <option value="">{t.kind === 'dish' ? 'Not one of our recipes' : 'Not on the town’s list'}</option>
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            <span className="ph-tag-go">
              {t.status === 'suggested' && <button type="button" className="btn ghost" onClick={() => confirmTag(t.id)}>✓ Yes</button>}
              <button type="button" className="icon-btn" aria-label={`Take the tag ${t.name} off`} onClick={async () => { await removeTag(t.id); setToast({ text: `Took off the tag ${t.name}.`, undo: async () => { await restoreTag(t); setToast(null) } }) }}>✕</button>
            </span>
          </li>
        )
      })}</ul>
      <form className="ph-add" onSubmit={async (e) => { e.preventDefault(); setErr(null); const why = await addHandTag(p.id, { kind, name }); if (why) setErr(why); else setName('') }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="What kind of thing">{KIND_ORDER.map((k) => <option key={k} value={k}>{KIND_ONE[k]}</option>)}</select>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Add a tag: a plant, a bird, a dish…" aria-label="A tag to add" />
        <button type="submit" className="btn ghost" disabled={!name.trim()}>Add</button>
      </form>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions"><button type="button" className="btn ghost" onClick={() => onTakeOff(p)}>Take this photo off</button></div>
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </Sheet>
  )
}
