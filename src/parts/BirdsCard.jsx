import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Sheet } from '../ui/Sheet.jsx'
import { useBirds, useBirdsNear } from '../lib/useOutside.js'
import { useFamily } from '../lib/useCalendar.js'
import { useSightings } from '../lib/useLife.js'
import { possibleLifers } from '../lib/life/lifers.js'
import { placeWords } from '../lib/here.js'
import { outsideWords } from '../lib/outsideErrors.js'
import { useSession } from '../lib/auth.js'
import { seenWhen, ebirdSpeciesUrl, ebirdChecklistUrl } from '../lib/birdWords.js'
import { todayAtHome } from '../lib/useSources.js'
import { mostSeen, reportsWords } from '../lib/birdPage.js'
import BirdHighlights from './BirdHighlights.jsx'
import { Link } from '../shell/Link.jsx'
import './birdlists.css'

const Thumb = ({ s }) => (s.photo ? <img className="bp-thumb" src={s.photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="bp-thumb bp-none" aria-hidden="true" />)

/** For Jason and Laurie: birds reported here this week that aren't on her life list (worked out on this phone). */
export function LiferLine({ list, session, onOpen }) {
  const family = useFamily(session)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  const { rows } = useSightings(session, parent && list.length > 0)
  const lifers = parent ? possibleLifers(list, rows, 6) : []
  if (!lifers.length) return null
  return (
    <section className="bd-lifers" aria-label="Could be a lifer for Laurie">
      <h3>Could be a lifer for Laurie</h3>
      <ul className="bp-chips">{lifers.map((s) => <li key={s.code}><button type="button" onClick={() => onOpen(s)}>{s.name}</button></li>)}</ul>
      <p className="muted small">Reported near here this week and not on her life list. Worked out on this phone from her own sightings, which only you two see.</p>
    </section>
  )
}

/**
 * "Birds around us": what birders have seen within a few miles of town this
 * week (eBird), the notable ones first in green, each with a licensed photo
 * where iNaturalist has one. A tap opens the bird: when and where it was last
 * seen, how many, and its pages. Nothing until eBird answers. Away from home
 * (src/lib/useHere.js), it's the birds around where we are instead, with
 * the ones that could be new to Laurie.
 */
export default function BirdsCard({ className = 'span-3', here = null }) {
  const session = useSession()
  const away = Boolean(here && here.tier === 'away' && here.point)
  const atHome = useBirds()
  const near = useBirdsNear(away ? here.point : null)
  const [open, setOpen] = useState(null)
  if (!session) return null
  const b = away && !(near && near.home) ? near : atHome
  const where = away ? placeWords(here.town) || (here.place ? here.place.town : '') : ''
  const today = todayAtHome()
  const list = b && b.species ? b.species : []
  return (
    <Card tint="#2E7F86" label={away ? `Birds around ${where || 'here'}` : 'Birds around us'} glyph="bird" tag={list.length ? `${list.length} this week` : undefined} className={className + ' birds-card'}>
      {!b && <p className="muted">Looking at this week’s sightings…</p>}
      {b && b.error && <p className="muted" role="status">{outsideWords('birds', b)}</p>}
      {list.length > 0 && (
        <div className="bd-snap">
          <section aria-label="Most reported this week">
            <h3>Most reported this week</h3>
            <ol className="bp-list">{mostSeen(list, 5).map((s, i) => <li key={s.code}><button type="button" onClick={() => setOpen(s)}><span className="bp-rank fig">{i + 1}</span><Thumb s={s} /><b>{s.name}</b><small className="fig">{reportsWords(s)}</small></button></li>)}</ol>
          </section>
          {away && <LiferLine list={list} session={session} onOpen={setOpen} />}
          <BirdHighlights list={list} today={today} onOpen={setOpen} />
          <Link className="btn ghost" to="/world/birds">{away ? 'More about the birds here ›' : 'More about birds near us ›'}</Link>
        </div>
      )}
      {b && b.at && <p className="wx-credit">Sightings from <a href="https://ebird.org/" target="_blank" rel="noopener noreferrer">eBird</a> (Cornell Lab of Ornithology), within about ten miles of {away ? 'here' : 'town'} · photos from iNaturalist, credited{away ? ' · the app tells eBird only the area, to about ten kilometres' : ''}</p>}
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
