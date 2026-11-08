import { Card } from '../../ui/Card.jsx'
import { Crumb } from '../../shell/Link.jsx'
import { navigate } from '../../lib/router.js'
import { useLifeContext } from './useLifeContext.js'
import PaintingEdit from './PaintingEdit.jsx'
import PaintingFrame, { Framed } from '../../parts/PaintingFrame.jsx'
import AutumnLeaves from './AutumnLeaves.jsx'
import { paintedWords } from '../../lib/paintingBatch.js'
import { isShaped, shapeName } from '../../lib/shapes.js'
import { MOODS, STYLES, WEATHERS } from '../../lib/gallery.js'
import { familiesOf, FAMILIES } from '../../lib/artColour.js'
import { wallOrder } from '../../parts/ArtFinder.jsx'
import { paintingBySlug } from '../../lib/paintings.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'
import { SEASONS, windowsOf } from '../../lib/seasons.js'
import { showFor } from '../../lib/seasonShows.js'
import PaintingSubjects from './PaintingSubjects.jsx'
import '../../parts/paintings.css'

// /lifelist/paintings/<slug>: one painting, hung large and whole, in a frame of its canvas's shape. Its bird
// flies from the small button. Next and previous replace the address, and follow the gallery's order as it
// was last shown (its filters and sort), else the gallery's own.
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
const said = (d) => dayFmt.format(new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))))

export default function PaintingPage({ slug }) {
  const { list: PAINTINGS, loaded } = usePaintings()
  const c = useLifeContext()
  const p = paintingBySlug(slug, PAINTINGS)
  if (!p) {
    if (!loaded) return <header className="hero span-6"><Crumb to="/lifelist/paintings">Laurie’s Gallery</Crumb><h1 className="greet">…</h1></header>
    return (
      <header className="hero span-6">
        <Crumb to="/lifelist/paintings">Laurie’s Gallery</Crumb>
        <h1 className="greet">Not one of her paintings</h1>
      </header>
    )
  }
  // The order the gallery showed, while this painting is in it; else every painting, newest in first
  let seq = PAINTINGS
  const o = wallOrder('paintings', p.slug)
  if (o) { const ps = o.map((sl) => paintingBySlug(sl, PAINTINGS)).filter(Boolean); if (ps.length > 1) seq = ps }
  const i = seq.indexOf(p), others = seq.length > 1
  const prev = seq[(i + seq.length - 1) % seq.length], next = seq[(i + 1) % seq.length]
  const looks = p.looks || {}
  const colours = familiesOf(p.palette).map((k) => FAMILIES[k].label.toLowerCase())
  const step = (q) => (e) => { e.preventDefault(); navigate('/lifelist/paintings/' + q.slug, { replace: true }) }
  const y = new Date().getFullYear()
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/lifelist/paintings">Laurie’s Gallery</Crumb>
        <span className="kicker">Painted by Laurie</span>
        <h1 className="greet">{p.title}</h1>
        {!p.named && <span className="eyebrow">A working title, until Laurie names it</span>}
      </header>
      <div className="painting-hang span-6">
        <Framed shape={p.shape}>
          <PaintingFrame painting={p} label={`${p.title}, a painting by Laurie`} style={{ aspectRatio: `${p.w} / ${p.h}` }} />
        </Framed>
      </div>
      <PaintingSubjects painting={p} />
      {c.parent && c.paintingsStored && <PaintingEdit painting={p} onSaved={c.reloadPaintings} />}
      {c.parent && c.paintingsStored && <AutumnLeaves painting={p} onSaved={c.reloadPaintings} />}
      <Card className="span-6" tint="#C0824F" label="About it" glyph="star">
        <dl className="painting-facts">
          {p.year && <div><dt>Painted</dt><dd>{paintedWords(p.year, p.month)}</dd></div>}
          {p.medium && <div><dt>Medium</dt><dd>{p.medium}</dd></div>}
          {p.size && <div><dt>Size</dt><dd>{p.size}</dd></div>}
          {isShaped(p.shape) && <div><dt>Its canvas</dt><dd>{shapeName(p.shape)}</dd></div>}
          {colours.length > 0 && <div><dt>Its colours</dt><dd>{colours.join(', ')}{p.palette && p.palette.swatches && p.palette.swatches.length ? <span className="painting-swatches" aria-hidden="true">{p.palette.swatches.map((c) => <i key={c} style={{ background: c }} />)}</span> : null}</dd></div>}
          {(looks.subjects?.length > 0 || looks.moods?.length > 0) && <div><dt>What Claude sees</dt><dd>{[...(looks.subjects || []), ...(looks.moods || []).map((m) => (MOODS[m] || m).toLowerCase()), looks.style && (STYLES[looks.style] || '').toLowerCase(), looks.weather && (WEATHERS[looks.weather] || '').toLowerCase()].filter(Boolean).join(', ')}</dd></div>}
          {p.seasons.map((s) => (
            <div key={s}><dt>Its season</dt><dd>{SEASONS[s].label}, {windowsOf(s, y).map((w) => `${said(w.from)} to ${said(w.to)}`).join(' and ')}: it hangs on Home{showFor(s, PAINTINGS) && showFor(s, PAINTINGS).painting.slug === p.slug ? `, and ${showFor(s, PAINTINGS).what}` : ''}</dd></div>
          ))}
          {p.flyer && <div><dt>Look closer</dt><dd>Tap the little bird and {p.flyer.name} takes a turn round the screen</dd></div>}
        </dl>
        {others && (
          <nav className="place-step" aria-label="Her other paintings">
            <a href={'/lifelist/paintings/' + prev.slug} onClick={step(prev)}>‹ {prev.title}</a>
            <a href={'/lifelist/paintings/' + next.slug} onClick={step(next)}>{next.title} ›</a>
          </nav>
        )}
      </Card>
    </>
  )
}
