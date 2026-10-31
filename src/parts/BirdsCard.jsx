import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { useBirds } from '../lib/useOutside.js'
import { useSession } from '../lib/auth.js'
import { seenWhen, ebirdSpeciesUrl, ebirdChecklistUrl } from '../lib/birdWords.js'
import { todayAtHome } from '../lib/useSources.js'

/**
 * "Birds around us": what birders have seen within a few miles of town this
 * week (eBird), the notable ones first in green, each with a licensed photo
 * where iNaturalist has one. A tap opens the bird: when and where it was last
 * seen, how many, and its pages. Nothing until eBird answers.
 */
export default function BirdsCard({ className = 'span-3' }) {
  const session = useSession()
  const b = useBirds()
  const [open, setOpen] = useState(null)
  if (!session) return null
  const today = todayAtHome()
  const list = b && b.species ? b.species : []
  return (
    <Card tint="#2E7F86" label="Birds around us" glyph="bird" tag={list.length ? `${list.length} this week` : undefined} className={className + ' birds-card'}>
      {!b && <p className="muted">Looking at this week’s sightings…</p>}
      {b && b.error && <p className="muted">{b.error === 'setup' ? 'This week’s birds round town appear here once the eBird key is in (docs/MORNING.md).' : 'eBird couldn’t be reached just now.'}</p>}
      {list.length > 0 && (
        <>
          <ul className="bd-grid">
            {list.slice(0, 9).map((s) => (
              <li key={s.code}>
                <button type="button" className={'bd-bird' + (s.notable ? ' notable' : '')} onClick={() => setOpen(s)}>
                  {s.photo ? <img src={s.photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="bd-nophoto" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 15c3 0 5-2 6-5s3-5 6-5c2 0 3 1 3 3l2.5 1-2.5 1c0 4-3 7-8 7h-4z" /><path d="M9 20l1-3M12 20l1-3" /><circle cx="15.6" cy="7.8" r=".5" /></svg></span>}
                  <b>{s.name}</b>
                  <small>{s.notable ? 'Notable · ' : ''}{seenWhen(s.last, today)}</small>
                </button>
              </li>
            ))}
          </ul>
          {list.length > 9 && <p className="muted small">And {list.length - 9} more: {list.slice(9, 15).map((s) => s.name).join(', ')}{list.length > 15 ? '…' : ''}</p>}
        </>
      )}
      {b && b.at && <p className="wx-credit">Sightings from <a href="https://ebird.org/" target="_blank" rel="noopener noreferrer">eBird</a> (Cornell Lab of Ornithology), within about ten miles of town · photos from iNaturalist, credited</p>}
      {open && (
        <Sheet title={open.name} onClose={() => setOpen(null)} className="bd-sheet">
          {open.photo && (
            <figure className="bd-photo">
              <img src={open.photo.url} alt={open.name} referrerPolicy="no-referrer" />
              <figcaption>{open.photo.credit}</figcaption>
            </figure>
          )}
          <p className="bd-sci">{open.sci}</p>
          {open.notable && <p className="nudge">Notable: rare round here, or here at an unusual time of year.</p>}
          <dl className="place-facts">
            <div><dt>Last seen</dt><dd>{seenWhen(open.last, today)}{open.where ? `, at ${open.where}` : ', at a private spot'}</dd></div>
            {open.count > 0 && <div><dt>As many as</dt><dd className="fig">{open.count}</dd></div>}
            {open.sightings > 0 && <div><dt>Reports this week</dt><dd className="fig">{open.sightings}</dd></div>}
          </dl>
          <div className="place-go">
            <a className="btn" href={ebirdSpeciesUrl(open.code)} target="_blank" rel="noopener noreferrer">About this bird</a>
            {open.checklist && <a className="btn ghost" href={ebirdChecklistUrl(open.checklist)} target="_blank" rel="noopener noreferrer">The sighting</a>}
          </div>
        </Sheet>
      )}
    </Card>
  )
}
