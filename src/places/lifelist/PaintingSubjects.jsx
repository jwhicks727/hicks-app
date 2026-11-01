import { useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { savePaintingSubjects } from '../../lib/useLife.js'
import { NATIONAL_PARKS } from '../../lib/life/parks.js'
import { SUBJECT_KINDS, subjectOf, subjectsOf, subjectWords, cleanSubjects } from '../../lib/life/subjects.js'
import { useLifeContext } from './useLifeContext.js'

/**
 * "What is it a painting of?": a parent tells a painting what it shows (a bird,
 * a national park, a place) and from then on it stands in for a photo of that
 * thing across the Life List. Never guessed from the picture.
 */
export default function PaintingSubjects({ painting }) {
  const c = useLifeContext()
  const [kind, setKind] = useState('park'), [name, setName] = useState(''), [park, setPark] = useState(''), [err, setErr] = useState(null), [busy, setBusy] = useState(false)
  const mine = subjectsOf(painting)
  if (!mine.length && !c.parent) return null
  async function put(next) {
    setErr(null); setBusy(true)
    if (!c.paintingsStored) { setBusy(false); setErr('Her paintings need moving into private storage first (Laurie’s gallery › “Move them now”).'); return }
    const { error } = await savePaintingSubjects(painting.slug, next)
    setBusy(false)
    if (error) setErr(/subjects|schema cache/i.test(error.message) ? 'The Life List migration hasn’t been run yet (docs/MORNING.md, step 12).' : error.message); else { setName(''); setPark(''); c.reloadPaintings() }
  }
  const add = (e) => {
    e.preventDefault()
    const key = kind === 'park' ? (park ? `park:${park}` : '') : name.trim() ? subjectOf(kind, name) : ''
    if (key) put(cleanSubjects([...mine, key]))
  }
  return (
    <Card className="span-6" tint="#5F8A4A" label="What it shows" glyph="bird">
      {mine.length ? <p>It stands in for a photo of: {mine.map((s, i) => <span key={s}>{i ? ', ' : ''}<b>{subjectWords(s, NATIONAL_PARKS)}</b>{c.parent && <button type="button" className="ll-x" aria-label={`Not ${subjectWords(s, NATIONAL_PARKS)}`} disabled={busy} onClick={() => put(mine.filter((x) => x !== s))}> ✕</button>}</span>)}.</p>
        : <p className="muted">It hasn’t been told what it shows. Say a bird, a national park or a place and her painting takes the place of a photo of it across the Life List.</p>}
      {c.parent && (
        <form className="ll-form" onSubmit={add}>
          <div className="two"><label>A painting of<select value={kind} onChange={(e) => setKind(e.target.value)}>{Object.entries(SUBJECT_KINDS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
            {kind === 'park' ? <label>Which park<select value={park} onChange={(e) => setPark(e.target.value)}><option value="">Choose one</option>{NATIONAL_PARKS.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>
              : <label>{kind === 'bird' ? 'Which bird (as eBird names it)' : 'Which place'}<input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={kind === 'bird' ? 'Anna’s Hummingbird' : 'Big Bear'} /></label>}
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <button type="submit" className="btn ghost" disabled={busy}>Add it</button>
        </form>
      )}
    </Card>
  )
}
