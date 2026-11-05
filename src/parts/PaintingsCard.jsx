import { useEffect, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import PaintingFrame from './PaintingFrame.jsx'
import { paintingFor } from '../lib/paintings.js'
import { usePaintings } from './PaintingsProvider.jsx'
import { showFor } from '../lib/seasonShows.js'
import { usePrefs } from '../lib/prefs.js'
import { reducedMotion } from '../lib/motion.js'
import { tilt } from '../lib/drawings.js'
import { LEAF_ORIGINS } from '../lib/leafOrigins.js'
import { useDrawings, useDrawingUrls } from '../lib/useDrawings.js'

/**
 * "Art": one of Laurie's paintings, beautifully clipped (the season's if it has one, else her newest),
 * with Anna's newest drawing taped over a corner of the frame, the way a child's drawing gets tucked
 * into a picture frame. Each opens its own gallery. The painting's bird flies once a day with `auto`.
 * In autumn the season's show is the wind (src/shell/WindShow.jsx): leaves lift out of this painting,
 * "A gust" asks for another, and every gust makes Anna's paper flutter against its tape. Both artists'
 * work is shown whole: the paper sits over a corner, it never changes either picture.
 */
export default function PaintingsCard({ season, auto = false, className = 'span-3' }) {
  const { list, loaded } = usePaintings()
  const [prefs] = usePrefs()
  const drawings = useDrawings()
  const anna = drawings.list[0] || null
  const annaUrls = useDrawingUrls(anna ? [anna.thumb_path || anna.path] : [])
  const annaSrc = anna ? annaUrls[anna.thumb_path || anna.path] : null
  // Each gust of the wind show, so her paper can flutter (a new key restarts the flutter)
  const [gust, setGust] = useState(null)
  useEffect(() => {
    const on = (e) => setGust((g) => ({ n: (g ? g.n : 0) + 1, side: (e.detail && e.detail.side) || 1, strength: (e.detail && e.detail.strength) || 1 }))
    window.addEventListener('hicks:gust', on)
    return () => window.removeEventListener('hicks:gust', on)
  }, [])
  const p = paintingFor(season, list)
  const annaLink = <Link to="/drawings">Anna’s Gallery{drawings.list.length > 1 ? ` · ${drawings.list.length}` : ''} ›</Link>
  // Never silently gone: with nothing to show, the card says why (the hosted app carries none of her paintings until a parent has moved them into private storage)
  if (!p || !p.src) {
    if (!loaded) return null
    return (
      <Card className={'paint-card ' + className} tint="#C0824F" label="Art" glyph="star">
        <p className="muted">Laurie’s paintings aren’t in the family’s private storage yet, so there’s nothing of hers to show here. A parent moves them in once: docs/MORNING.md, step 7.</p>
        {anna && <div className="paint-cap"><span /><span className="paint-acts">{annaLink}</span></div>}
      </Card>
    )
  }
  const n = list.length
  const show = prefs.seasonal === false ? null : showFor(season, list)
  const wind = Boolean(show && show.kind === 'wind' && !reducedMotion())
  const leaves = Boolean(show && show.kind !== 'wind' && show.painting.slug === p.slug)
  const canPlay = Boolean(p.flyer || leaves || wind)
  const play = () => {
    if (p.flyer) window.dispatchEvent(new CustomEvent('hicks:fly', { detail: { slug: p.slug } }))
    if (leaves) window.dispatchEvent(new CustomEvent('hicks:show', { detail: { key: season } }))
    if (wind) window.dispatchEvent(new CustomEvent('hicks:wind-gust'))
  }
  const playWords = [p.flyer && `${p.flyer.name} flies`, leaves && 'the leaves fall', wind && 'a gust of wind blows the leaves'].filter(Boolean).join(' and ')
  const corner = paperCorner(p)
  return (
    <Card className={'paint-card ' + className} tint="#C0824F" label="Art" glyph="star">
      <div className="art-stage">
        <PaintingFrame painting={p} focus={p.focus} auto={auto} linkTo="/lifelist/paintings" />
        {anna && annaSrc && (
          <Link to={`/drawings/${anna.id}`} className={'art-taped at-' + corner} data-art-cover="" style={{ '--tilt': `${(corner === 'right' ? 3 : -3) + tilt(anna.id)}deg` }} aria-label={`${anna.title}, a drawing by Anna: open it`}>
            <span className="art-tape" aria-hidden="true" />
            <span key={gust ? gust.n : 0} className={'art-flap' + (gust ? ' go' : '')} style={gust ? { '--side': gust.side, '--amp': gust.strength } : undefined}>
              <img src={annaSrc} alt="" width={anna.width || undefined} height={anna.height || undefined} />
            </span>
          </Link>
        )}
      </div>
      <div className="paint-cap">
        <span><b>{p.title}</b> <small>by Laurie</small>{anna && <small className="art-by"> and <b>{anna.title}</b> by Anna</small>}</span>
        <span className="paint-acts">
          {canPlay && (
            <button type="button" className="paint-play" onClick={play} aria-label={`${wind ? 'A gust' : 'Play again'}: ${playWords}`}>
              {wind
                ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {wind ? 'A gust' : 'Play again'}
            </button>
          )}
          <Link to="/lifelist/paintings">Laurie’s Gallery{n > 1 ? ` · ${n}` : ''} ›</Link>
          {anna && annaLink}
        </span>
      </div>
    </Card>
  )
}

/**
 * Which bottom corner Anna's paper goes in: never over the painting's bird, and otherwise over the fewer of the
 * places the wind lifts leaves from (src/lib/leafOrigins.js), so the leaves can be seen leaving the painting.
 */
function paperCorner(p) {
  if (p.flyer) {
    const [x, y, w, h] = p.flyer.at
    if (y + h / 2 > 0.5) return x + w / 2 > 0.5 ? 'left' : 'right'
  }
  const o = LEAF_ORIGINS[p.slug]
  if (!o) return 'right'
  const under = (side) => o.origins.filter(([x, y]) => y > 0.62 && (side === 'right' ? x > 0.62 : x < 0.38)).length
  return under('left') < under('right') ? 'left' : 'right'
}
