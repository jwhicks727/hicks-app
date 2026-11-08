import { Card } from '../../ui/Card.jsx'
import { Crumb } from '../../shell/Link.jsx'
import { navigate } from '../../lib/router.js'
import { useLifeContext } from './useLifeContext.js'
import PaintingEdit from './PaintingEdit.jsx'
import PaintingFrame from '../../parts/PaintingFrame.jsx'
import { paintingBySlug } from '../../lib/paintings.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'
import { SEASONS, windowsOf } from '../../lib/seasons.js'
import { showFor } from '../../lib/seasonShows.js'
import PaintingSubjects from './PaintingSubjects.jsx'
import '../../parts/paintings.css'

// /lifelist/paintings/<slug>: one painting, hung large and whole. Its bird
// flies from the small button. Next and previous replace the address.
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
  const i = PAINTINGS.indexOf(p), others = PAINTINGS.length > 1
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
        <div className="gallery-frame">
          <PaintingFrame painting={p} label={`${p.title}, a painting by Laurie`} style={{ aspectRatio: `${p.w} / ${p.h}` }} />
        </div>
      </div>
      <PaintingSubjects painting={p} />
      {c.parent && c.paintingsStored && <PaintingEdit painting={p} onSaved={c.reloadPaintings} />}
      <Card className="span-6" tint="#C0824F" label="About it" glyph="star">
        <dl className="painting-facts">
          {p.year && <div><dt>Painted</dt><dd>{p.year}</dd></div>}
          {p.medium && <div><dt>Medium</dt><dd>{p.medium}</dd></div>}
          {p.size && <div><dt>Size</dt><dd>{p.size}</dd></div>}
          {p.seasons.map((s) => (
            <div key={s}><dt>Its season</dt><dd>{SEASONS[s].label}, {windowsOf(s, y).map((w) => `${said(w.from)} to ${said(w.to)}`).join(' and ')}: it hangs on Home{showFor(s, PAINTINGS) && showFor(s, PAINTINGS).painting.slug === p.slug ? `, and ${showFor(s, PAINTINGS).what}` : ''}</dd></div>
          ))}
          {p.flyer && <div><dt>Look closer</dt><dd>Tap the little bird and {p.flyer.name} takes a turn round the screen</dd></div>}
        </dl>
        {others && (
          <nav className="place-step" aria-label="Her other paintings">
            <a href={'/lifelist/paintings/' + PAINTINGS[(i + PAINTINGS.length - 1) % PAINTINGS.length].slug} onClick={step(PAINTINGS[(i + PAINTINGS.length - 1) % PAINTINGS.length])}>‹ {PAINTINGS[(i + PAINTINGS.length - 1) % PAINTINGS.length].title}</a>
            <a href={'/lifelist/paintings/' + PAINTINGS[(i + 1) % PAINTINGS.length].slug} onClick={step(PAINTINGS[(i + 1) % PAINTINGS.length])}>{PAINTINGS[(i + 1) % PAINTINGS.length].title} ›</a>
          </nav>
        )}
      </Card>
    </>
  )
}
