import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { Link } from '../shell/Link.jsx'
import { useSession } from '../lib/auth.js'
import { usePhotoStore, useTripUrls } from '../lib/reelStore.js'
import { photosAt, seenPlants } from '../lib/photos.js'
import './photos.css'

// Where a trip photo turns up outside its reel (src/parts/PhotoReel.jsx): on a recipe's page, on
// a place's row in the town's list, on a bird's page, in the Garden. Only what someone has confirmed.

export const when = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })

/**
 * Photos that belong somewhere else in the app, by what a confirmed tag says: a dish linked to this
 * recipe, a place linked to this row, a bird or plant by name. Nothing is drawn when there are none.
 * `spec` is { refKind, refId } or { kind, names }.
 */
export function TaggedPhotos({ spec, title = 'From our trips', max = 6 }) {
  const session = useSession()
  const store = usePhotoStore(session)
  const [open, setOpen] = useState(null)
  const list = photosAt(store.photos, store.tags, spec).slice(0, max)
  const urls = useTripUrls(list.map((p) => p.thumb_path || p.path))
  if (!list.length) return null
  return (
    <div className="ph-tagged">
      <small className="ph-tagged-t">{title}</small>
      <ul className="ph-strip">{list.map((p) => <li key={p.id}><button type="button" className="ph-tile small" onClick={() => setOpen(p)} aria-label={`A photo from ${p.town}, ${when(p.taken_on)}`}>{urls[p.thumb_path || p.path] ? <img src={urls[p.thumb_path || p.path]} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="ph-blank" aria-hidden="true" />}</button></li>)}</ul>
      {open && <Lightbox photo={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Lightbox({ photo, onClose }) {
  const url = useTripUrls([photo.path])[photo.path]
  return (
    <Sheet title={`${photo.town}, ${when(photo.taken_on)}`} onClose={onClose} className="ph-sheet">
      {url ? <img className="ph-big" src={url} alt={photo.caption || `A photo from ${photo.town}`} referrerPolicy="no-referrer" /> : <p className="muted">Opening the photo…</p>}
      {photo.caption && <p>{photo.caption}</p>}
    </Sheet>
  )
}

/** The Garden's "Plants we've seen": confirmed plant tags from trip photos, by name. Nothing drawn until there's one. */
export function SeenPlantsCard() {
  const session = useSession()
  const store = usePhotoStore(session)
  const [open, setOpen] = useState(null)
  const plants = seenPlants(store.photos, store.tags)
  const urls = useTripUrls(plants.flatMap((p) => p.photos.slice(0, 1).map((x) => x.thumb_path || x.path)))
  if (!plants.length) return null
  return (
    <Card tint="#4E6C3D" label="Plants we’ve seen on trips" glyph="pot" tag={`${plants.length}`} className="span-6">
      <ul className="ph-seen">{plants.map((pl) => {
        const first = pl.photos[0], u = urls[first.thumb_path || first.path]
        return (
          <li key={pl.name}>
            <button type="button" className="ph-tile small" onClick={() => setOpen(first)} aria-label={`${pl.name}: a photo from ${first.town}`}>{u ? <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="ph-blank" aria-hidden="true" />}</button>
            <span><b>{pl.name}</b>{pl.sci && <i className="ph-sci">{pl.sci}</i>}<small>{pl.towns.join(', ')}{pl.photos.length > 1 ? ` · ${pl.photos.length} photos` : ''}</small></span>
          </li>
        )
      })}</ul>
      <p className="muted small">From photos on the trip reels, once someone has confirmed what’s in them. <Link to="/yonder">Our trips ›</Link></p>
      {open && <Lightbox photo={open} onClose={() => setOpen(null)} />}
    </Card>
  )
}
