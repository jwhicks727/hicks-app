import { useEffect, useState } from 'react'
import Cropper from './Cropper.jsx'
import { supabase } from '../../lib/supabase.js'
import { FILES } from '../../lib/paintings.js'
import { fitInside, wholeCrop } from '../../lib/paintingBatch.js'
import { preparePhoto, paintingFiles } from './paintingPhotos.js'

// Re-cropping a painting already in her gallery: its original photo (kept in the
// bucket when it was added) comes up with the crop it was saved with. Saving
// writes the two gallery files again and the crop; her painting is only ever
// cropped and turned, never altered (CLAUDE.md, "Laurie's paintings are shown as
// she painted them").
export default function RecropPainting({ painting: p, onDone, onCancel }) {
  const [st, setSt] = useState({ phase: 'loading' })
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let live = true, made = null
    ;(async () => {
      try {
        if (!p.originalUrl) throw new Error('Its original photo isn’t in the family’s storage, so it can’t be cropped again.')
        const res = await fetch(p.originalUrl)
        if (!res.ok) throw new Error('Its original photo couldn’t be loaded just now. Try again.')
        const blob = await res.blob()
        const pic = await preparePhoto(blob)
        made = URL.createObjectURL(pic.view)
        const saved = p.crop
        const crop = saved ? fitInside({ turn: saved.turn, angle: saved.angle, cx: saved.cx, cy: saved.cy, w: saved.w, h: saved.h }, pic.W, pic.H) : wholeCrop(pic.W, pic.H)
        if (live) setSt({ phase: 'ready', src: made, W: pic.W, H: pic.H, crop, blob })
      } catch (e) {
        if (live) setSt({ phase: 'error', msg: (e && e.message) || 'Its photo couldn’t be opened.' })
      }
    })()
    return () => { live = false; if (made) URL.revokeObjectURL(made) }
  }, [p.slug]) // eslint-disable-line react-hooks/exhaustive-deps -- once per painting

  async function save() {
    setBusy('Saving…')
    try {
      const f = await paintingFiles(st.blob, st.crop)
      for (const [name, blob] of [[FILES.src, f.full], [FILES.small, f.small]]) {
        const { error } = await supabase.storage.from('paintings').upload(`${p.slug}/${name}`, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
      }
      const { error } = await supabase.from('paintings').update({ w: f.w, h: f.h, crop: { ...st.crop, W: st.W, H: st.H } }).eq('slug', p.slug)
      if (error) throw error
      setBusy(null)
      onDone()
    } catch (e) {
      setBusy((e && e.message) || 'It couldn’t be saved. Try again.')
    }
  }

  if (st.phase === 'loading') return <p className="muted" role="status">Loading her original photo…</p>
  if (st.phase === 'error') return (
    <div className="ll-up-failed">
      <p className="err" role="alert">{st.msg}</p>
      <button type="button" className="btn ghost" onClick={onCancel}>Close</button>
    </div>
  )
  return (
    <div className="ll-recrop">
      <Cropper src={st.src} W={st.W} H={st.H} crop={st.crop} auto={null} onChange={(crop) => setSt((s) => ({ ...s, crop }))} />
      {busy && <p className={busy === 'Saving…' ? 'muted' : 'err'} role="status">{busy}</p>}
      <div className="form-actions">
        <button type="button" className="btn" disabled={busy === 'Saving…'} onClick={save}>Save the new crop</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
