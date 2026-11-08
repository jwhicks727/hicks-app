import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { cleanTitle, cleanYear, cleanMedium, cleanSeasons } from '../../lib/paintingBatch.js'
import { SEASONS, SEASON_ORDER } from '../../lib/seasons.js'
import { todayAtHome } from '../../lib/useSources.js'
import RecropPainting from './RecropPainting.jsx'
import { Confirm } from '../../ui/Confirm.jsx'
import { navigate } from '../../lib/router.js'
import { storedPaths } from '../../lib/paintings.js'
import './addpaintings.css'

// On a painting's own page, a parent can change its details and crop it again
// (where its original was kept). Each change is saved to its row (`.eq('slug')`):
// nothing else of it is touched. A painting added before originals were kept can
// have its details changed, but not its crop.
export default function PaintingEdit({ painting: p, onSaved }) {
  const thisYear = Number(todayAtHome().slice(0, 4))
  const start = { title: p.title || '', named: Boolean(p.named), year: p.year ? String(p.year) : '', medium: p.medium || '', seasons: p.seasons || [] }
  const [f, setF] = useState(start)
  const [err, setErr] = useState(null), [busy, setBusy] = useState(false), [recrop, setRecrop] = useState(false), [gone, setGone] = useState(false)
  const set = (patch) => { setErr(null); setF((x) => ({ ...x, ...patch })) }
  const changed = JSON.stringify(f) !== JSON.stringify(start)

  async function save(e) {
    e.preventDefault()
    const title = cleanTitle(f.title)
    if (!title) { setErr('Give it a title: a working one is fine.'); return }
    const y = cleanYear(f.year, thisYear)
    if (y.error) { setErr(y.error); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.from('paintings').update({
      title, named: Boolean(f.named), year: y.year ?? null, medium: cleanMedium(f.medium) || null, seasons: cleanSeasons(f.seasons),
    }).eq('slug', p.slug)
    setBusy(false)
    if (error) setErr(error.message); else onSaved()
  }

  // Taken out of her gallery: its files in the bucket first, then its row. If the files can't go, the row stays.
  async function remove() {
    setBusy(true); setErr(null)
    const paths = Object.values(storedPaths(p.slug, p))
    const { error: fe } = await supabase.storage.from('paintings').remove(paths)
    if (fe) { setBusy(false); setGone(false); setErr(fe.message); return }
    const { error } = await supabase.from('paintings').delete().eq('slug', p.slug)
    setBusy(false)
    if (error) { setErr(error.message); return }
    navigate('/lifelist/paintings', { replace: true })
    onSaved()
  }

  return (
    <section className="card span-6 ll-edit" style={{ '--tint': '#C0824F' }} aria-label="Change this painting">
      <span className="label"><span className="dot" style={{ '--c': '#C0824F' }} />Change it</span>
      <form className="form ll-up-form" onSubmit={save}>
        <label>Its title<input maxLength={200} value={f.title} onChange={(e) => set({ title: e.target.value })} /></label>
        <label className="ll-up-check small"><input type="checkbox" checked={!f.named} onChange={(e) => set({ named: !e.target.checked })} /><span>A working title, until Laurie names it</span></label>
        <div className="form-row ll-up-ym">
          <label>Year<input inputMode="numeric" maxLength={4} value={f.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, '') })} /></label>
          <label>Medium<input maxLength={80} value={f.medium} onChange={(e) => set({ medium: e.target.value })} placeholder="Watercolor on paper" /></label>
        </div>
        <fieldset className="choice-row ll-up-seasons"><legend>Its seasons (it hangs on Home then)</legend>
          {SEASON_ORDER.map((k) => <button key={k} type="button" aria-pressed={f.seasons.includes(k)} onClick={() => set({ seasons: f.seasons.includes(k) ? f.seasons.filter((x) => x !== k) : [...f.seasons, k] })}>{SEASONS[k].label}</button>)}
        </fieldset>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={busy || !changed}>{busy ? 'Saving…' : 'Save the details'}</button>
          {changed && <button type="button" className="btn ghost" onClick={() => { setErr(null); setF(start) }}>Undo</button>}
        </div>
      </form>

      <div className="ll-edit-crop">
        {!p.original && <p className="muted">Its original photo wasn’t kept when it was added, so its crop can’t be changed here. Its details can.</p>}
        {p.original && !recrop && <button type="button" className="btn ghost" onClick={() => setRecrop(true)}>Crop it again</button>}
        {p.original && recrop && <RecropPainting painting={p} onDone={() => { setRecrop(false); onSaved() }} onCancel={() => setRecrop(false)} />}
      </div>

      <div className="ll-edit-crop">
        <button type="button" className="btn danger" disabled={busy} onClick={() => setGone(true)}>Take it out of her gallery</button>
      </div>
      {gone && (
        <Confirm title={`Take “${p.title}” out?`} yes="Take it out" danger onNo={() => setGone(false)} onYes={remove}>
          <p>Its photos are removed from the family’s storage, and it leaves her gallery and Home. This can’t be undone; a photo would have to be added again.</p>
        </Confirm>
      )}
    </section>
  )
}
