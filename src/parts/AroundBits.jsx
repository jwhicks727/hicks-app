import { usePaintings } from './PaintingsProvider.jsx'
import PaintingFrame from './PaintingFrame.jsx'
import { paintingOf, subjectOf } from '../lib/life/subjects.js'
import { hikeWords } from '../lib/around.js'

// The pieces "What's around here?" shares between Home's card and its page.

export const SECTION_COLOURS = {
  hikes: '#4E6C3D', village: '#B5658F', coffee: '#8A5A33', brewpubs: '#C9863F', 'local-food': '#D4553A',
  anna: '#C14D83', 'books-records': '#5A4E8A', art: '#3F6FCB', mass: '#B3263A', sky: '#2F3F7A',
}

/** Each section's little picture on its card's label (the card glyphs). */
export const SECTION_GLYPHS = { hikes: 'sunmoon', village: 'star', coffee: 'pot', brewpubs: 'pot', 'local-food': 'pot', anna: 'star', 'books-records': 'music', art: 'star', mass: 'candle', sky: 'sunmoon' }

/** Laurie's painting of this place, where a parent has said one shows it (never guessed). */
export function usePlacePainting(town, ourPlace) {
  const { list } = usePaintings()
  const keys = [town && subjectOf('place', town), ourPlace && `place:${ourPlace.slug}`, ourPlace && subjectOf('place', ourPlace.name)].filter(Boolean)
  for (const k of keys) { const p = paintingOf(list, k); if (p && p.src) return p }
  return null
}

/** The place's picture: Laurie's painting first, else the best openly licensed photo, with its credit. */
export function AroundHero({ painting, photo, title }) {
  if (painting) return <PaintingFrame painting={painting} label={`${painting.title}, a painting by Laurie`} linkTo="/lifelist/paintings" className="ar-hero-art" style={{ aspectRatio: `${painting.w || 4} / ${painting.h || 3}` }} />
  if (!photo) return null
  return (
    <figure className="ar-hero">
      <img src={photo.url} alt={title || ''} loading="lazy" referrerPolicy="no-referrer" width={photo.width || undefined} height={photo.height || undefined} />
      <figcaption>{photo.page ? <a href={photo.page} target="_blank" rel="noopener noreferrer">{photo.credit}</a> : photo.credit}</figcaption>
    </figure>
  )
}

/** One place in a rail: its photo (or a tile drawn in its section's colour), name, and a line. */
export function ItemTile({ item, section, onOpen, as = 'button', to, badge = null }) {
  const colour = SECTION_COLOURS[section] || '#5F8A4A'
  const line = item.hike ? hikeWords(item.hike) : item.why
  const inner = (
    <>
      {item.photo
        ? <img className="ar-tile-pic" src={item.photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
        : <span className="ar-tile-pic ar-tile-drawn" style={{ '--c': colour }} aria-hidden="true"><b>{item.name.charAt(0)}</b></span>}
      {badge && <span className="ar-tile-badge">{badge}</span>}
      <b className="ar-tile-name">{item.name}</b>
      {line && <small>{line}</small>}
    </>
  )
  if (as === 'a') return <a className="ar-tile" href={to}>{inner}</a>
  return <button type="button" className="ar-tile" style={{ '--c': colour }} onClick={() => onOpen && onOpen(item, section)}>{inner}</button>
}

export const WHAT_WAS_SENT = 'Written by Claude from its own web searches: it was sent the town, the area to about ten kilometres and the family’s interests from Admin, never who is here. Every place lists its sources.'
