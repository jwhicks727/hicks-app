import { useMemo } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Link } from '../../shell/Link.jsx'
import { useSightings, useOutings, useParkMarks } from '../../lib/useLife.js'
import { newBirds, onThisDay, totals } from '../../lib/life/birdStats.js'
import { KINDS, sorted, tally, whenWords, datesWords, celebrate } from '../../lib/life/trips.js'
import { parkProgress } from '../../lib/life/parks.js'
import { subjectOf } from '../../lib/life/subjects.js'
import { LifeTabs, LifeArt, LifePicture, Stat, shortDay } from './LifeBits.jsx'
import { useLifeContext } from './useLifeContext.js'

// /lifelist: what's new first. Laurie's newest birds, the next outing and the
// last, how far along the parks are, her newest paintings, and the birds she
// saw on this day in other years. Everything on it opens.
const DAYS = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() - n); return t.toISOString().slice(0, 10) }

export default function Recent() {
  const c = useLifeContext()
  const birds = useSightings(c.session, c.parent)
  const outings = useOutings(c.session), marks = useParkMarks(c.session)
  const rows = birds.rows
  const fresh = useMemo(() => newBirds(rows, DAYS(c.today, 60)).slice(0, 6), [rows, c.today])
  const tot = useMemo(() => totals(rows), [rows])
  const back = useMemo(() => onThisDay(rows, c.today), [rows, c.today])
  const { ahead, done } = sorted(outings.rows, c.today), tl = tally(outings.rows, c.today)
  const progress = parkProgress(marks.rows)
  const newest = c.paintings.slice().sort((a, b) => (a.added < b.added ? 1 : -1)).slice(0, 4)
  const nextOuting = ahead[0] || null, lastOuting = done[0] || null
  const C = 2 * Math.PI * 40
  return (
    <>
      <header className="hero span-6"><span className="kicker">Everything we’ve seen and done</span><h1 className="greet">Life List</h1></header>
      <LifeTabs on="" />

      {c.parent && (
        <Card tint="#5F8A4A" label="New birds" glyph="bird" tag={tot.species ? `${tot.species} on her life list` : undefined} className="span-3">
          {!birds.loaded && <p className="muted">Looking through her sightings…</p>}
          {birds.loaded && !rows.length && (
            <>
              <p>Laurie’s birds aren’t here yet. Bring in the file eBird gives her and her whole list, her best days and her favourite places open up here.</p>
              <Link className="btn ui-btn-shine shine" to="/lifelist/birds/import">Bring in her eBird data</Link>
            </>
          )}
          {rows.length > 0 && (fresh.length ? (
            <ul className="ll-list">{fresh.map((b) => (
              <li key={b.key}><Link className="ll-row" to={`/lifelist/birds/species/${b.key}`} style={{ '--c': '#5F8A4A' }}>
                <LifePicture subject={subjectOf('bird', b.species)} art="bird" colour="#5F8A4A" paintings={c.paintings} size={44} label={b.species} />
                <span><b>{b.species}</b><small>First seen {shortDay(b.first.date)}{b.first.location ? `, ${b.first.location}` : ''}</small></span><em>New</em>
              </Link></li>
            ))}</ul>
          ) : <p className="muted">No new birds in the last two months. Her latest sighting was {shortDay(tot.last)}.</p>)}
          {rows.length > 0 && <Link className="btn ghost ll-more" to="/lifelist/birds">All her birds ›</Link>}
        </Card>
      )}

      <Card tint="#E0662F" label={nextOuting ? 'Next up' : 'Outings and trips'} glyph="calendar" className="span-3">
        {!outings.loaded && <p className="muted">Looking…</p>}
        {outings.loaded && !outings.rows.length && <p>No outings kept yet. Camping trips and Disneyland trips are celebrated here.</p>}
        {[nextOuting, lastOuting].filter(Boolean).map((o, i) => (
          <Link key={o.id} to={`/lifelist/trips/${o.id}`} className={'ll-trip' + (KINDS[o.kind].celebrate ? ' ll-celebrate' : '')} style={{ '--c': KINDS[o.kind].colour }}>
            <LifeArt art={KINDS[o.kind].art} colour={KINDS[o.kind].colour} size={48} />
            <span style={{ display: 'grid' }}><small>{i === 0 && nextOuting ? 'Coming up' : 'Last time'} · {whenWords(o, c.today)}</small><b>{o.title}</b><small>{datesWords(o, c.today)}{o.place ? ` · ${o.place}` : ''}</small></span>
            {celebrate(o, outings.rows, c.today) && <p>{celebrate(o, outings.rows, c.today)}</p>}
          </Link>
        ))}
        {outings.rows.length > 0 && (
          <div className="ll-stats">
            <Stat n={tl.byKind.camping.trips} label="camping trips" to="/lifelist/trips" /><Stat n={tl.byKind.disneyland.trips} label="Disneyland trips" to="/lifelist/trips" /><Stat n={tl.nights} label="nights away" to="/lifelist/trips" />
          </div>
        )}
        {c.parent && <Link className="btn ghost ll-more" to="/lifelist/trips/new">Add an outing</Link>}
      </Card>

      <Card tint="#3E7A4C" label="The national parks" glyph="star" tag={`${progress.been} of ${progress.total}`} className="span-3">
        <div className="ll-row" style={{ '--c': '#3E7A4C', background: 'transparent', padding: 0, borderLeft: 0 }}>
          <svg className="ll-ring" viewBox="0 0 100 100" role="img" aria-label={`${progress.been} of ${progress.total} national parks`}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" strokeWidth="10" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#3E7A4C" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(C * progress.been) / progress.total} ${C}`} transform="rotate(-90 50 50)" />
            <text x="50" y="58" textAnchor="middle">{progress.been}</text>
          </svg>
          <span><b>{progress.left} still to see</b>{progress.next && <small>{progress.next.want ? 'Next on the list' : 'Nearest to see'}: {progress.next.name}</small>}</span>
        </div>
        <Link className="btn ghost ll-more" to="/lifelist/parks">The checklist ›</Link>
      </Card>

      <Card tint="#C0824F" label="Newest paintings" glyph="star" className="span-3">
        {c.paintings.length === 0 && <p className="muted">Laurie’s paintings will hang here once they’re moved in.</p>}
        <ul className="ll-list">{newest.map((p) => (
          <li key={p.slug}><Link className="ll-row" to={`/lifelist/paintings/${p.slug}`} style={{ '--c': '#C0824F' }}>
            <span className="ll-painted" style={{ width: 52, height: 52 }}><img src={p.small} alt="" loading="lazy" width="52" height="52" /></span>
            <span><b>{p.title}</b><small>Added {shortDay(p.added)}{p.named ? '' : ' · a working title'}</small></span>
          </Link></li>
        ))}</ul>
        <Link className="btn ghost ll-more" to="/lifelist/paintings">Laurie’s gallery ›</Link>
      </Card>

      {c.parent && back.length > 0 && (
        <Card tint="#6C7FB8" label="On this day" glyph="calendar" className="span-6">
          <ul className="ll-list">{back.slice(0, 4).map((y) => (
            <li key={y.year}><Link className="ll-row" to={`/lifelist/birds/days/${y.year}-${c.today.slice(5)}`} style={{ '--c': '#6C7FB8' }}><span><b>{y.year}</b><small>{y.species.slice(0, 8).join(', ')}{y.species.length > 8 ? ` and ${y.species.length - 8} more` : ''}</small></span></Link></li>
          ))}</ul>
        </Card>
      )}
    </>
  )
}
