import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import PaintingFrame from './PaintingFrame.jsx'
import { paintingFor } from '../lib/paintings.js'
import { usePaintings } from './PaintingsProvider.jsx'
import { showFor } from '../lib/seasonShows.js'

/**
 * "Paintings": one of Laurie's, beautifully clipped, opening her gallery.
 * The season's painting if it has one, else her newest. With `auto`, its
 * bird flies once a day when the panel comes into view. Play again sends
 * the bird again and, when the season's show is made from this painting,
 * lets its leaves fall again too.
 */
export default function PaintingsCard({ season, auto = false, className = 'span-3' }) {
  const { list } = usePaintings()
  const p = paintingFor(season, list)
  if (!p || !p.src) return null
  const n = list.length
  const show = showFor(season, list)
  const leaves = show && show.painting.slug === p.slug
  const canPlay = Boolean(p.flyer || leaves)
  const play = () => {
    if (p.flyer) window.dispatchEvent(new CustomEvent('hicks:fly', { detail: { slug: p.slug } }))
    if (leaves) window.dispatchEvent(new CustomEvent('hicks:show', { detail: { key: season } }))
  }
  return (
    <Card className={'paint-card ' + className} tint="#C0824F" label="Paintings" glyph="star">
      <PaintingFrame painting={p} focus={p.focus} auto={auto} linkTo="/lifelist/paintings" />
      <div className="paint-cap">
        <span><b>{p.title}</b> <small>by Laurie</small></span>
        <span className="paint-acts">
          {canPlay && (
            <button type="button" className="paint-play" onClick={play} aria-label={`Play again: ${[p.flyer && `${p.flyer.name} flies`, leaves && 'the leaves fall'].filter(Boolean).join(' and ')}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Play again
            </button>
          )}
          <Link to="/lifelist/paintings">Laurie’s Gallery{n > 1 ? ` · ${n}` : ''} ›</Link>
        </span>
      </div>
    </Card>
  )
}
