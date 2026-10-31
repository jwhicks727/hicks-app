import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import PaintingFrame from './PaintingFrame.jsx'
import { paintingFor } from '../lib/paintings.js'
import { usePaintings } from './PaintingsProvider.jsx'

/**
 * "Paintings": one of Laurie's, beautifully clipped, opening her gallery.
 * The season's painting if it has one, else her newest. With `auto`, its
 * bird flies once a day when the panel comes into view.
 */
export default function PaintingsCard({ season, auto = false, className = 'span-3' }) {
  const { list } = usePaintings()
  const p = paintingFor(season, list)
  if (!p || !p.src) return null
  const n = list.length
  return (
    <Card className={'paint-card ' + className} tint="#C0824F" label="Paintings" glyph="star">
      <PaintingFrame painting={p} focus={p.focus} auto={auto} linkTo="/lifelist/paintings" />
      <div className="paint-cap">
        <span><b>{p.title}</b> <small>by Laurie</small></span>
        <Link to="/lifelist/paintings">Laurie’s Gallery{n > 1 ? ` · ${n}` : ''} ›</Link>
      </div>
    </Card>
  )
}
