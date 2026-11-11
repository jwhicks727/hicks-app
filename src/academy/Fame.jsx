import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb } from '../shell/Link.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import Dropzone from '../ui/Dropzone.jsx'
import { useDraft } from '../lib/useDraft.js'
import { addCheer, removeCheer, addAsset, saveAsset, removeAsset, useAssetUrls } from './useAcademy.js'
import { ASSET_WAYS } from './life.js'
import { itemSrc } from './items.js'
import { fame, CHEER_ICONS } from './school.js'

// The Hall of Fame: every trophy (a goal reached), medal or ribbon (a grade
// worth cheering) and cheer, newest first. Anyone in the family can cheer
// Anna for anything at all; she can cheer herself too.

export function FamePage({ a, me, anna, today, celebrate, parent }) {
  const [cheering, setCheering] = useState(false)
  const names = Object.fromEntries((a.cheers || []).map((c) => [c.id, c.from_member]))
  const prizes = fame(a)
  const count = (k) => prizes.filter((p) => p.kind === k).length
  return (
    <>
      <header className="hero span-6"><Crumb to="/academy">The Academy</Crumb><span className="kicker">Hall of Fame</span><h1 className="greet">All things {anna.name}</h1></header>
      <section className="ac-fame-top span-6">
        <div><b>{count('goal')}</b><span>goals reached</span></div>
        <div><b>{count('grade')}</b><span>grades cheered</span></div>
        <div><b>{count('cheer')}</b><span>cheers</span></div>
        <button type="button" className="btn ac-gleam" onClick={() => setCheering(true)}>Cheer {anna.name}</button>
      </section>
      <Card tint="#C9A227" label="The Hall" glyph="star" className="span-6">
        {prizes.length ? (
          <ul className="ac-hall">
            {prizes.map((p) => {
              const cheer = p.kind === 'cheer' && a.cheers.find((c) => 'c' + c.id === p.key)
              const mine = cheer && (parent || names[cheer.id] === (me && me.id))
              return (
                <li key={p.key} className={'k-' + p.kind}>
                  <img src={itemSrc(p.prize)} alt="" width="56" height="56" />
                  <b>{p.title}</b>
                  <small>{p.kind === 'goal' ? 'Goal reached' : p.kind === 'grade' ? 'Report card' : 'A cheer'} · {p.on}</small>
                  {cheer && cheer.note && <span>{cheer.note}</span>}
                  {mine && <button type="button" className="ac-x" aria-label="Take this cheer down" onClick={async () => { await removeCheer(cheer.id); a.reload() }}>✕</button>}
                </li>
              )
            })}
          </ul>
        ) : <p className="muted">Nothing yet. Reach a goal, bring home a great grade, or be cheered for anything at all, and it shows up here.</p>}
      </Card>
      {cheering && <CheerSheet a={a} me={me} anna={anna} today={today} celebrate={celebrate} onClose={() => setCheering(false)} />}
    </>
  )
}

/** Cheer Anna: for anything at all. */
export function CheerSheet({ a, me, anna, today, celebrate, onClose }) {
  const [f, setF, clear] = useDraft('academy.cheer', { title: '', note: '', icon: 'glowing-star' })
  const [busy, setBusy] = useState(null)
  const self = me && me.role === 'child'
  async function send() {
    setBusy('Sending…')
    const { error } = await addCheer({ title: f.title.trim(), note: f.note.trim() || null, icon: f.icon, on_date: today })
    if (error) { setBusy(error.message); return }
    clear(); a.reload(); onClose()
    celebrate({ title: f.title.trim(), line: self ? 'Into the Hall of Fame. Proud of you!' : `Three cheers for ${anna.name}! It’s in the Hall of Fame now.`, prize: f.icon, big: true, long: true })
  }
  return (
    <Sheet title={self ? 'Cheer yourself' : `Cheer ${anna.name}`} onClose={onClose}>
      <div className="form">
        <label>For what?<input maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={self ? 'I was brave at the dentist' : 'So kind to the new girl at school'} /></label>
        <label>A note, if you like<textarea rows={3} maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <fieldset className="choice-row ac-icons"><legend>Its picture</legend>{CHEER_ICONS.map((k) => <button key={k} type="button" aria-pressed={f.icon === k} aria-label={k} onClick={() => setF({ ...f, icon: k })}><img src={itemSrc(k)} alt="" width="28" height="28" /></button>)}</fieldset>
        <div className="form-actions"><button type="button" className="btn ac-gleam" disabled={!f.title.trim() || busy === 'Sending…'} onClick={send}>Cheer!</button></div>
        {busy && busy !== 'Sending…' && <p className="err" role="alert">{busy}</p>}
      </div>
    </Sheet>
  )
}

/** Pictures the family adds (a pack bought for her, one of her drawings), each with its licence. */
export function PicturesPage({ a, parent }) {
  const urls = useAssetUrls(a.assets)
  const [f, setF, clear] = useDraft('academy.picture', { name: '', cat: 'Ours', licence: '', source: '' })
  const [file, setFile] = useState(null), [busy, setBusy] = useState(null)
  async function save() {
    setBusy('Adding…')
    const { error } = await addAsset({ file, name: f.name.trim(), cat: f.cat.trim() || 'Ours', licence: f.licence.trim(), source: f.source.trim() })
    if (error) { setBusy(error.message); return }
    clear(); setFile(null); setBusy('Added. It’s in every room’s “Add something”, under Ours.'); a.reload()
  }
  return (
    <>
      <header className="hero span-6"><Crumb to="/academy">The Academy</Crumb><span className="kicker">Pictures</span><h1 className="greet">Our own pictures</h1></header>
      {parent && (
        <Card tint="#3FA34D" label="Add a picture" glyph="star" className="span-3">
          <p className="muted">A PNG or WebP with a clear background works best: one thing from an isometric pack you’ve bought, or a drawing of Anna’s. Each needs its licence written down, so we always know it’s ours to use. docs/ACADEMY-ART.md lists packs that fit.</p>
          <Dropzone accept="image/png,image/webp" camera={false} label="The picture" hint="Drop it, paste it, or choose it. Up to 2 MB." onFiles={(fs) => setFile(fs[0])} />
          {file && <p className="muted">{file.name} is ready.</p>}
          <div className="form">
            <label>Its name<input maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Blue armchair" /></label>
            <label>Its licence<input maxLength={300} value={f.licence} onChange={(e) => setF({ ...f, licence: e.target.value })} placeholder="CC0 (Kenney), bought for personal use, or Drawn by Anna" /></label>
            <label>Where it came from<input maxLength={500} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="The pack’s page, or the artist" /></label>
            <fieldset className="choice-row"><legend>What it does in a room</legend>
              {ASSET_WAYS.map(([k, label, about]) => <button key={k} type="button" aria-pressed={(f.cat || 'Ours') === k} title={about} onClick={() => setF({ ...f, cat: k })}>{label}</button>)}
            </fieldset>
            <p className="muted small">{(ASSET_WAYS.find(([k]) => k === (f.cat || 'Ours')) || ASSET_WAYS[0])[2]}.</p>
            <div className="form-actions"><button type="button" className="btn" disabled={!file || !f.name.trim() || f.licence.trim().length < 3 || busy === 'Adding…' || file.size > 2097152} onClick={save}>Add it</button></div>
            {file && file.size > 2097152 && <p className="err">That one is over 2 MB.</p>}
            {busy && <p className="muted" role="status">{busy}</p>}
          </div>
        </Card>
      )}
      <Card tint="#3FA34D" label={`${a.assets.length} of our own`} glyph="star" className={parent ? 'span-3' : 'span-6'}>
        {a.assets.length ? (
          <ul className="ac-assets">{a.assets.map((x) => <li key={x.id}>{urls[x.path] ? <img src={urls[x.path]} alt="" width="56" height="56" /> : <span className="ac-blank" />}<span><b>{x.name}</b><small>{x.licence}</small>{x.source && <small>{x.source}</small>}
            {parent
              ? <label className="ac-way"><select aria-label={`What ${x.name} does in a room`} value={ASSET_WAYS.some(([k]) => k === x.cat) ? x.cat : 'Ours'} onChange={async (e) => { const { error } = await saveAsset(x.id, { cat: e.target.value }); setBusy(error ? error.message : null); a.reload() }}>{ASSET_WAYS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></label>
              : x.cat !== 'Ours' && ASSET_WAYS.some(([k]) => k === x.cat) && <small>{ASSET_WAYS.find(([k]) => k === x.cat)[1]}</small>}
          </span>{parent && <button type="button" className="ac-x" aria-label={`Remove ${x.name}`} onClick={async () => { await removeAsset(x); a.reload() }}>✕</button>}</li>)}</ul>
        ) : <p className="muted">None yet. Everything in the rooms so far is from Fluent Emoji by Microsoft (MIT licence).</p>}
      </Card>
    </>
  )
}
