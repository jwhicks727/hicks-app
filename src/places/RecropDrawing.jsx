import { useEffect, useState } from 'react'
import Cropper from './lifelist/Cropper.jsx'
import { supabase } from '../lib/supabase.js'
import { drawingFiles } from '../lib/drawings.js'
import { DRAWING_KEPT, DRAWING_SAVED } from '../lib/drawingBatch.js'
import { fitInside, wholeCrop } from '../lib/paintingBatch.js'
import { preparePhoto, paintingFiles } from './lifelist/paintingPhotos.js'

// Cropping a drawing already on her wall again: its original photo (kept when it was added) comes up with the crop it
// was saved with. Saving makes two new files with names of their own, points the drawing at them, and takes the old two
// away, so a link already handed out never shows the old crop. Her drawing is only ever cropped and turned, never altered.
export default function RecropDrawing({ drawing: d, onDone, onCancel }) {
  const [st, setSt] = useState({ phase: 'loading' })
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let live = true, made = null
    ;(async () => {
      try {
        const { data, error } = await supabase.storage.from('drawings').createSignedUrl(drawingFiles(d.id).original, 600)
        if (error || !data) throw new Error('Its original photo isn’t in the family’s storage, so it can’t be cropped again.')
        const res = await fetch(data.signedUrl)
        if (!res.ok) throw new Error('Its original photo couldn’t be loaded just now. Try again.')
        const blob = await res.blob()
        const pic = await preparePhoto(blob, DRAWING_KEPT)
        made = URL.createObjectURL(pic.view)
        const c = d.crop
        const crop = c ? fitInside({ turn: c.turn, angle: c.angle, cx: c.cx, cy: c.cy, w: c.w, h: c.h }, pic.W, pic.H) : wholeCrop(pic.W, pic.H)
        if (live) setSt({ phase: 'ready', src: made, W: pic.W, H: pic.H, crop, blob })
      } catch (e) {
        if (live) setSt({ phase: 'error', msg: (e && e.message) || 'Its photo couldn’t be opened.' })
      }
    })()
    return () => { live = false; if (made) URL.revokeObjectURL(made) }
  }, [d.id]) // eslint-disable-line react-hooks/exhaustive-deps -- once per drawing

  async function save() {
    setBusy('Saving…')
    const names = drawingFiles(d.id, Date.now().toString(36))
    const old = [d.path, d.thumb_path].filter(Boolean) // noted now, before anything changes
    const added = []
    try {
      const f = await paintingFiles(st.blob, st.crop, DRAWING_SAVED)
      for (const [path, blob] of [[names.path, f.full], [names.thumb, f.small]]) {
        const { error } = await supabase.storage.from('drawings').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
        if (error) throw error
        added.push(path)
      }
      const { error } = await supabase.from('annas_drawings').update({ path: names.path, thumb_path: names.thumb, width: f.w, height: f.h, crop: { ...st.crop, W: st.W, H: st.H } }).eq('id', d.id)
      if (error) throw error
      // The old two go (if this person may remove them; if not they're only left behind, never shown)
      await supabase.storage.from('drawings').remove(old.filter((p) => !added.includes(p))).catch(() => {})
      setBusy(null)
      onDone()
    } catch (e) {
      if (added.length) await supabase.storage.from('drawings').remove(added).catch(() => {})
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
      <Cropper src={st.src} W={st.W} H={st.H} crop={st.crop} auto={null} what="drawing" onChange={(crop) => setSt((s) => ({ ...s, crop }))} />
      {busy && <p className={busy === 'Saving…' ? 'muted' : 'err'} role="status">{busy}</p>}
      <div className="form-actions">
        <button type="button" className="btn" disabled={busy === 'Saving…'} onClick={save}>Save the new crop</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
