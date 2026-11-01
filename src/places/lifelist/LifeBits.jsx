import { Link } from '../../shell/Link.jsx'
import { paintingOf } from '../../lib/life/subjects.js'
import './life.css'

// The little shared parts of the Life List screens.

const TABS = [['/lifelist', 'Recent', ''], ['/lifelist/birds', 'Birds', 'birds'], ['/lifelist/trips', 'Trips', 'trips'], ['/lifelist/parks', 'Parks', 'parks'], ['/lifelist/paintings', 'Paintings', 'paintings']]
/** The tab row under the title: where in the Life List we are. */
export function LifeTabs({ on = '' }) {
  return (
    <nav className="ll-tabs span-6" aria-label="Life List">
      {TABS.map(([to, name, key]) => <Link key={key || 'recent'} to={to} aria-current={key === on ? 'page' : undefined}>{name}</Link>)}
    </nav>
  )
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ART = {
  bird: <g {...S}><path d="M3.5 15c3 0 5-2 6-5s3-5 6-5c2 0 3 1 3 3l2.5 1-2.5 1c0 4-3 7-8 7h-4z" /><path d="M9 20l1-3M12 20l1-3" /></g>,
  tent: <g {...S}><path d="M3 20L12 5l9 15z" /><path d="M12 5v15M9 20l3-6 3 6" /></g>,
  castle: <g {...S}><path d="M4 20V10l2-2 2 2v3h3V6l1-2 1 2v7h3v-3l2-2 2 2v10z" /><path d="M10 20v-4h4v4M12 4V2" /></g>,
  plane: <g {...S}><path d="M21 4L3 11l6 2.5L11 20l2.6-5.2L19 12z" /><path d="M9 13.5L21 4" /></g>,
  sun: <g {...S}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></g>,
  park: <g {...S}><path d="M2.5 19.5L9 8l4 6 2-3 6.5 8.5z" /><path d="M7.4 11.2l1.6 1.2 1.4-1" /></g>,
  star: <path {...S} d="M12 3.5l2.5 5.2 5.6.8-4 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4-4 5.6-.8z" />,
}
/** A line drawing on a tile of the thing's own colour: the picture when she hasn't painted it. */
export function LifeArt({ art = 'star', colour = '#5F8A4A', size = 56, className = '' }) {
  return <span className={'ll-art ' + className} style={{ '--c': colour, width: size, height: size }} aria-hidden="true"><svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6}>{ART[art] || ART.star}</svg></span>
}

/**
 * Her painting of a thing where she has painted it (a bird, a park, a place),
 * else the thing's drawing: `subject` is a key like park:joshua-tree. Her
 * paintings are shown whole and as she painted them, cropped to a square.
 */
export function LifePicture({ subject, art, colour, paintings, size = 72, label }) {
  const p = subject ? paintingOf(paintings, subject) : null
  if (!p) return <LifeArt art={art} colour={colour} size={size} />
  return (
    <Link to={`/lifelist/paintings/${p.slug}`} className="ll-painted" style={{ width: size, height: size }} aria-label={`${label || 'It'}, painted by Laurie: ${p.title}`}>
      <img src={p.small} alt="" loading="lazy" width={size} height={size} />
    </Link>
  )
}

/** A figure with its label under it, for the dashboard's numbers. */
export function Stat({ n, label, to }) {
  const inner = <><b className="ll-n fig">{n}</b><span>{label}</span></>
  return to ? <Link to={to} className="ll-stat">{inner}</Link> : <div className="ll-stat">{inner}</div>
}

export const shortDay = (d) => { const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return d ? `${M[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}, ${d.slice(0, 4)}` : '' }
