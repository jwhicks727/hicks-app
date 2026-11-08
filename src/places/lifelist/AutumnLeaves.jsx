import { useEffect, useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Working } from '../../ui/Toast.jsx'
import { supabase } from '../../lib/supabase.js'
import { todayAtHome } from '../../lib/useSources.js'
import { FILES } from '../../lib/paintings.js'
import { cutLeaves, leavesRow, LEAF_WORK } from '../../lib/leafCut.js'
import { originsOf, WIND_SEASONS } from '../../lib/seasonShows.js'
import { openPicture, shrink, oneAtATime } from './paintingPhotos.js'
import '../../parts/paintings.css'

// On a painting's page, for Jason or Laurie: autumn's wind (src/shell/WindShow.jsx) lifts leaves out
// of her autumn paintings from the very places she painted them. The leaves were first cut on a
// computer with a script; this cuts them here, from the painting as it is in her gallery, so a new
// photo of an autumn painting (or any autumn painting at all) gets the show back with a tap. The
// leaves are copies of her own brushwork, cut out whole with a soft edge (src/lib/leafCut.js); her
// painting is never changed. The sheet goes to `<slug>/leaves.png` and where each leaf came from to
// the painting's row, and the wind takes it from there.
const TINT = '#C0824F'

export default function AutumnLeaves({ painting: p, onSaved }) {
  const [st, setSt] = useState({ phase: 'idle' })
  const has = originsOf(p)
  const autumn = (p.seasons || []).some((k) => WIND_SEASONS.includes(k))
  useEffect(() => () => { if (st.preview) URL.revokeObjectURL(st.preview) }, [st.preview])

  async function cut(seed = 5) {
    setSt({ phase: 'cutting' })
    try {
      if (!p.src) throw new Error('Her painting couldn’t be found in the family’s storage.')
      const res = await fetch(p.src)
      if (!res.ok) throw new Error('Her painting couldn’t be loaded just now. Try again.')
      const blob = await res.blob()
      const made = await oneAtATime(async () => {
        const pic = await openPicture(blob)
        let c
        try {
          c = shrink(pic.img, pic.width, pic.height, LEAF_WORK)
          const px = c.getContext('2d').getImageData(0, 0, c.width, c.height)
          // Let the screen show "Cutting…" before the sums start
          await new Promise((ok) => setTimeout(ok, 30))
          const out = cutLeaves(px, { count: 20, seed })
          if (out.boxes.length < 6) return { few: out.boxes.length }
          const sheet = document.createElement('canvas')
          sheet.width = out.sheet.width; sheet.height = out.sheet.height
          sheet.getContext('2d').putImageData(new ImageData(out.sheet.data, out.sheet.width, out.sheet.height), 0, 0)
          const png = await new Promise((ok, no) => sheet.toBlob((b) => (b ? ok(b) : no(new Error('The leaves couldn’t be made into a picture.'))), 'image/png'))
          sheet.width = 0; sheet.height = 0
          return { png, row: leavesRow(out, { workWidth: c.width, workHeight: c.height, paintingWidth: p.w, today: todayAtHome(), seed }), n: out.boxes.length }
        } finally {
          if (c) { c.width = 0; c.height = 0 }
          pic.close()
        }
      })
      if (made.few !== undefined) { setSt({ phase: 'error', msg: made.few ? `Only ${made.few} leaves could be cut: there isn’t much warm, brushy foliage in it. The wind needs a painting full of autumn colour.` : 'No leaves could be cut: there isn’t warm, brushy foliage in it (reds, oranges and yellows).' }); return }
      setSt({ phase: 'preview', ...made, seed, preview: URL.createObjectURL(made.png) })
    } catch (e) {
      setSt({ phase: 'error', msg: (e && e.message) || 'The leaves couldn’t be cut.' })
    }
  }

  async function keep() {
    const { png, row } = st
    setSt((s) => ({ ...s, phase: 'saving' }))
    const up = await supabase.storage.from('paintings').upload(`${p.slug}/${FILES.sheet}`, png, { contentType: 'image/png', upsert: true })
    if (up.error) { setSt((s) => ({ ...s, phase: 'preview', msg: up.error.message })); return }
    const { error } = await supabase.from('paintings').update({ leaves: row }).eq('slug', p.slug)
    if (error) { setSt((s) => ({ ...s, phase: 'preview', msg: error.message })); return }
    setSt({ phase: 'done', n: st.n })
    onSaved()
  }

  return (
    <Card tint={TINT} label="Autumn’s wind" glyph="star" className="span-6 ll-leaves">
      {st.phase === 'cutting' && <Working>Cutting leaves from her painting…</Working>}
      <p>{has
        ? `The wind at home lifts ${has.origins.length} leaves out of this painting in autumn, each from the place she painted it.`
        : 'In autumn, the wind at home lifts leaves out of her autumn paintings, from the places she painted them, and blows them across the page. This one has none cut yet.'}
        {' '}They’re copies of her own brushwork, cut out whole; the painting itself is never changed.</p>
      {!autumn && <p className="muted">Give it Fall or Thanksgiving as a season (in “Change it”) and the wind will take leaves from it.</p>}
      {(st.phase === 'idle' || st.phase === 'done' || st.phase === 'error') && (
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => cut(5)}>{has ? 'Cut its leaves again' : 'Cut leaves from it for the wind'}</button>
        </div>
      )}
      {st.phase === 'done' && <p className="muted" role="status">Kept: {st.n} leaves. The wind takes them from here.</p>}
      {st.phase === 'error' && <p className="err" role="alert">{st.msg}</p>}
      {(st.phase === 'preview' || st.phase === 'saving') && (
        <>
          <div className="ll-leaves-sheet"><img src={st.preview} alt={`${st.n} leaves cut from her painting`} /></div>
          <p className="muted">{st.n} leaves from her reds, oranges and yellows.</p>
          {st.msg && <p className="err" role="alert">{st.msg}</p>}
          <div className="form-actions">
            <button type="button" className="btn" disabled={st.phase === 'saving'} onClick={keep}>{st.phase === 'saving' ? 'Keeping them…' : 'Keep these'}</button>
            <button type="button" className="btn ghost" disabled={st.phase === 'saving'} onClick={() => cut(st.seed + 1)}>Cut a different set</button>
            <button type="button" className="btn ghost" disabled={st.phase === 'saving'} onClick={() => setSt({ phase: 'idle' })}>Cancel</button>
          </div>
        </>
      )}
    </Card>
  )
}
