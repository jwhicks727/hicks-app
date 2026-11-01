import { useMemo, useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { useParkMarks, useOutings, saveParkMark } from '../../lib/useLife.js'
import { withMarks, parkProgress, findParks, parkBySlug, REGIONS } from '../../lib/life/parks.js'
import { KINDS, datesWords, whenWords } from '../../lib/life/trips.js'
import { subjectOf } from '../../lib/life/subjects.js'
import { LifeTabs, LifePicture, shortDay } from './LifeBits.jsx'
import { useLifeContext } from './useLifeContext.js'

// /lifelist/parks         the sixty-three national parks, checked off as we go
// /lifelist/parks/<slug>  one park: when we went, whether it's next, our notes, the trips there

export default function Parks({ rest = [] }) {
  const c = useLifeContext()
  const marks = useParkMarks(c.session)
  return rest[0] ? <One c={c} marks={marks} slug={rest[0]} /> : <All c={c} marks={marks} />
}

function All({ c, marks }) {
  const [q, setQ] = useState(''), [show, setShow] = useState('all')
  const all = useMemo(() => withMarks(marks.rows), [marks.rows]), pr = parkProgress(marks.rows)
  const names = new Set(findParks(q).map((p) => p.slug))
  const keep = (p) => names.has(p.slug) && (show === 'all' || (show === 'been' && p.visited) || (show === 'left' && !p.visited) || (show === 'want' && p.want && !p.visited))
  const C = 2 * Math.PI * 40
  return (
    <>
      <header className="hero span-6"><Crumb to="/lifelist">Life List</Crumb><span className="kicker">The ones we want to see</span><h1 className="greet">National parks</h1></header>
      <LifeTabs on="parks" />
      <Card tint="#3E7A4C" label="How far along" glyph="star" className="span-6">
        <div className="ll-row" style={{ '--c': '#3E7A4C', background: 'transparent', padding: 0, borderLeft: 0 }}>
          <svg className="ll-ring" viewBox="0 0 100 100" role="img" aria-label={`${pr.been} of ${pr.total}`}><circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" strokeWidth="10" /><circle cx="50" cy="50" r="40" fill="none" stroke="#3E7A4C" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(C * pr.been) / pr.total} ${C}`} transform="rotate(-90 50 50)" /><text x="50" y="58" textAnchor="middle">{pr.been}</text></svg>
          <span><b>{pr.been} of {pr.total} parks</b><small>{pr.percent}% · {pr.left} still to see{pr.next ? ` · ${pr.next.want ? 'Next' : 'Nearest'}: ${pr.next.name}` : ''}</small>{pr.next && <Link to={`/lifelist/parks/${pr.next.slug}`}>{pr.next.name} ›</Link>}</span>
        </div>
        <div className="ll-search"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a park or a state" aria-label="Find a park or a state" /></div>
        <div className="ll-seg" role="group" aria-label="Show">{[['all', 'All'], ['been', 'Been'], ['left', 'Still to see'], ['want', 'Starred']].map(([k, n]) => <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)}>{n}</button>)}</div>
      </Card>
      {REGIONS.map((r) => {
        const list = all.filter((p) => p.region === r && keep(p))
        if (!list.length) return null
        return (
          <Card key={r} tint="#3E7A4C" label={r} glyph="star" tag={`${list.filter((p) => p.visited).length} of ${list.length}`} className="span-6">
            <ul className="ll-parks">{list.map((p) => (
              <li key={p.slug}><Link to={`/lifelist/parks/${p.slug}`} className={'ll-park' + (p.visited ? ' been' : '') + (p.want && !p.visited ? ' want' : '')}>
                <b>{p.name}</b><small>{p.states}{p.visited ? ` · ${shortDay(p.visited)}` : p.want ? ' · starred' : ''}</small>{p.visited && <span className="tick" aria-label="Been">✓</span>}
              </Link></li>
            ))}</ul>
          </Card>
        )
      })}
    </>
  )
}

function One({ c, marks, slug }) {
  const park = parkBySlug(slug), outings = useOutings(c.session)
  const m = withMarks(marks.rows).find((p) => p.slug === slug)
  const [note, setNote] = useState(null), [err, setErr] = useState(null)
  if (!park) return <header className="hero span-6"><Crumb to="/lifelist/parks">National parks</Crumb><h1 className="greet">Not a national park</h1></header>
  const trips = outings.rows.filter((o) => o.park === slug)
  const save = async (patch) => { setErr(null); const { error } = await saveParkMark(slug, { visited_on: m.visited, want: m.want, note: m.note || null, ...patch }); if (error) setErr(/relation|does not exist|schema cache/i.test(error.message) ? 'The Life List migration hasn’t been run yet (docs/MORNING.md, step 12).' : error.message); else marks.reload() }
  return (
    <>
      <header className="hero span-6"><Crumb to="/lifelist/parks">National parks</Crumb><span className="kicker">{park.states} · {park.region}</span><h1 className="greet">{park.name}</h1></header>
      <Card tint="#3E7A4C" label={m.visited ? 'We’ve been' : m.want ? 'Next on the list' : 'Still to see'} glyph="star" className="span-3">
        <div className="ll-row" style={{ '--c': '#3E7A4C', background: 'transparent', padding: 0, borderLeft: 0 }}>
          <LifePicture subject={subjectOf('park', slug)} art="park" colour="#3E7A4C" paintings={c.paintings} size={96} label={park.name} />
          <span><b>{m.visited ? `We went ${shortDay(m.visited)}` : 'Not yet'}</b><small>{m.visited ? 'Checked off' : m.want ? 'Starred: the one we most want to see next' : 'On the list of sixty-three'}</small></span>
        </div>
        {c.parent ? (
          <div className="ll-form">
            <label>The day we went<input type="date" value={m.visited || ''} max={c.today} onChange={(e) => save({ visited_on: e.target.value || null })} /></label>
            <div className="form-actions">
              {!m.visited && <button type="button" className="btn" onClick={() => save({ visited_on: c.today })}>We’re here today</button>}
              {m.visited && <button type="button" className="btn ghost" onClick={() => save({ visited_on: null })}>Not yet after all</button>}
              <button type="button" className="btn ghost" aria-pressed={m.want} onClick={() => save({ want: !m.want })}>{m.want ? 'Unstar it' : 'Star it: next'}</button>
            </div>
            <label>Our notes<textarea rows={3} maxLength={500} value={note ?? m.note} onChange={(e) => setNote(e.target.value)} onBlur={() => { if (note != null && note !== m.note) save({ note: note || null }) }} placeholder="What to see, what we loved, when to go" /></label>
          </div>
        ) : m.note && <p>{m.note}</p>}
        {err && <p className="err" role="alert">{err}</p>}
        <a className="ll-more" href={`https://www.nps.gov/search/?query=${encodeURIComponent(park.name)}`} target="_blank" rel="noopener noreferrer">Its page at the National Park Service ›</a>
      </Card>
      <Card tint="#E0662F" label="Our trips there" glyph="calendar" tag={trips.length ? `${trips.length}` : undefined} className="span-3">
        {!trips.length && <p className="muted">No outings kept here yet. Add one and choose this park, and it’s checked off when the trip is over.</p>}
        <ul className="ll-list">{trips.map((o) => <li key={o.id}><Link className="ll-row" to={`/lifelist/trips/${o.id}`} style={{ '--c': KINDS[o.kind].colour }}><span><b>{o.title}</b><small>{whenWords(o, c.today)} · {datesWords(o, c.today)}</small></span></Link></li>)}</ul>
        {c.parent && <Link className="btn ghost ll-more" to="/lifelist/trips/new">Add an outing</Link>}
      </Card>
    </>
  )
}
