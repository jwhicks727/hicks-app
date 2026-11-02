import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { useBirds } from '../lib/useOutside.js'
import { outsideWords } from '../lib/outsideErrors.js'
import { useSession } from '../lib/auth.js'
import { seenWhen, ebirdSpeciesUrl, ebirdChecklistUrl } from '../lib/birdWords.js'
import { todayAtHome } from '../lib/useSources.js'
import { mostSeen, reportsWords } from '../lib/birdPage.js'
import BirdHighlights from './BirdHighlights.jsx'
import { Link } from '../shell/Link.jsx'
import './birdlists.css'

const Thumb = ({ s }) => (s.photo ? <img className="bp-thumb" src={s.photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="bp-thumb bp-none" aria-hidden="true" />)

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
      {b && b.error && <p className="muted" role="status">{outsideWords('birds', b)}</p>}
      {list.length > 0 && (
        <div className="bd-snap">
          <section aria-label="Most reported this week">
            <h3>Most reported this week</h3>
            <ol className="bp-list">{mostSeen(list, 5).map((s, i) => <li key={s.code}><button type="button" onClick={() => setOpen(s)}><span className="bp-rank fig">{i + 1}</span><Thumb s={s} /><b>{s.name}</b><small className="fig">{reportsWords(s)}</small></button></li>)}</ol>
          </section>
          <BirdHighlights list={list} today={today} onOpen={setOpen} />
          <Link className="btn ghost" to="/world/birds">More about birds near us ›</Link>
        </div>
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
            {open.reports > 0 && <div><dt>Recent checklists</dt><dd className="fig">{open.reports} of {open.sample}</dd></div>}
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
