import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import PaintingFrame from './PaintingFrame.jsx'
import { PAINTINGS, paintingFor } from '../lib/paintings.js'

/**
 * "Paintings": one of Laurie's, beautifully clipped, opening her gallery.
 * The season's painting if it has one, else her newest. With `auto`, its
 * bird flies once a day when the panel comes into view.
 */
export default function PaintingsCard({ season, auto = false, className = 'span-3' }) {
  const p = paintingFor(season)
  if (!p) return null
  const n = PAINTINGS.length
  return (
    <Card className={'paint-card ' + className} tint="#C0824F" label="Paintings" glyph="star">
      <PaintingFrame painting={p} focus={p.focus} auto={auto} linkTo="/lifelist/paintings" />
      <div className="paint-cap">
        <span><b>{p.title}</b> <small>by Laurie</small></span>
        <Link to="/lifelist/paintings">Laurie’s gallery{n > 1 ? ` · ${n}` : ''} ›</Link>
      </div>
    </Card>
  )
}
