import { useSession } from '../lib/auth.js'
import { useSources, todayAtHome } from '../lib/useSources.js'
import { staleness, SOURCE_KINDS } from '../lib/sources.js'
import { REGISTRY } from '../registry.js'
import { useFamily } from '../lib/useCalendar.js'
import { upcoming } from '../lib/cal/family.js'
import { useCookbook } from '../lib/useKitchen.js'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { supabase } from '../lib/supabase.js'
import { fetchAll } from '../lib/useCalendar.js'
import { useEffect, useState } from 'react'
import { addDays } from '../lib/cal/dates.js'
import { listDay, streakShown, namesFor, noun } from '../lib/routines.js'
import { teamDayToday } from '../parts/ListsCard.jsx'
import { familiesOf, FAMILIES } from '../lib/artColour.js'
import { isShaped } from '../lib/shapes.js'

function SourcesReport({ session }) {
  const { rows, error } = useSources(session)
  if (!session) return <p><Link to="/settings">Sign in</Link> to see it.</p>
  if (error) return <p className="err">{error}</p>
  if (!rows) return <p className="muted">Loading…</p>
  const today = todayAtHome()
  const byState = rows.reduce((a, s) => { const st = staleness(s, today).state; a[st] = (a[st] || 0) + 1; return a }, {})
  const byKind = rows.reduce((a, s) => { a[s.kind] = (a[s.kind] || 0) + 1; return a }, {})
  return (
    <div className="report">
      <div className="figures">
        <div><b>{rows.length}</b><span>sources</span></div>
        <div><b>{byState.stale || 0}</b><span>need rolling over</span></div>
        <div><b>{byState.soon || 0}</b><span>run out soon</span></div>
      </div>
      <table className="table">
        <thead><tr><th>Kind</th><th className="num">Sources</th></tr></thead>
        <tbody>{SOURCE_KINDS.filter(([k]) => byKind[k]).map(([k, n]) => <tr key={k}><td>{n}</td><td className="num">{byKind[k]}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
function FamilyDaysReport({ session }) {
  const family = useFamily(session)
  if (!session) return <p><Link to="/settings">Sign in</Link> to see it.</p>
  if (family.error) return <p className="err">{family.error}</p>
  if (!family.loaded) return <p className="muted">Loading…</p>
  const next = upcoming(todayAtHome(), family.days, 3)
  return (
    <div className="report">
      <div className="figures">
        <div><b>{family.days.filter((d) => d.kind !== 'remember').length}</b><span>to celebrate</span></div>
        <div><b>{family.days.filter((d) => d.kind === 'remember').length}</b><span>to remember</span></div>
      </div>
      {next.length > 0 && (
        <table className="table">
          <thead><tr><th>Next</th><th className="num">In</th></tr></thead>
          <tbody>{next.map((d) => <tr key={d.id}><td>{d.title}{d.line ? ` · ${d.line}` : ''}</td><td className="num">{d.inDays === 0 ? 'today' : `${d.inDays} days`}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  )
}
function CookbookReport({ session }) {
  const book = useCookbook(session)
  if (!session) return <p><Link to="/settings">Sign in</Link> to see it.</p>
  if (book.error) return <p className="err">{book.error}</p>
  if (!book.loaded) return <p className="muted">Loading…</p>
  const avg = book.recipes.map((r) => { const rs = book.ratings.filter((x) => x.recipe_id === r.id); return { r, n: rs.length, avg: rs.length ? rs.reduce((a, x) => a + x.stars, 0) / rs.length : null } })
  const top = avg.filter((x) => x.avg != null).sort((a, b) => b.avg - a.avg || b.n - a.n).slice(0, 3)
  return (
    <div className="report">
      <div className="figures">
        <div><b>{book.recipes.length}</b><span>recipes</span></div>
        <div><b>{avg.filter((x) => x.n).length}</b><span>rated</span></div>
        <div><b>{book.fridge.filter((f) => f.bought_on).length}</b><span>in the fridge</span></div>
        <div><b>{book.fridge.filter((f) => !f.bought_on).length}</b><span>to shop for</span></div>
      </div>
      {top.length > 0 && (
        <table className="table">
          <thead><tr><th>Favourites</th><th className="num">Average</th></tr></thead>
          <tbody>{top.map((x) => <tr key={x.r.id}><td><Link to={`/kitchen/recipe/${x.r.slug}`}>{x.r.title}</Link></td><td className="num">{x.avg.toFixed(1)} of 5</td></tr>)}</tbody>
        </table>
      )}
    </div>
  )
}
function ListsReport({ session }) {
  const family = useFamily(session)
  const [d, setD] = useState(null)
  const today = listDay()
  useEffect(() => {
    let live = true
    if (!supabase || !session) return undefined
    Promise.all([
      fetchAll(() => supabase.from('routine_days').select('member_id, on_date, part, status, total, done, streak, best').gte('on_date', addDays(today, -62)).order('on_date').order('member_id').order('part')),
      supabase.from('challenge_runs').select('status'),
      supabase.from('routine_settings').select('names').eq('id', true).maybeSingle(),
    ]).then(([a, b, c]) => { if (live) setD({ rows: a.data || [], runs: b.data || [], names: (c.data || {}).names, error: (a.error || b.error || {}).message || null }) })
    return () => { live = false }
  }, [session, today])
  if (!session) return <p><Link to="/settings">Sign in</Link> to see it.</p>
  if (!d || !family.loaded) return <p className="muted">Loading…</p>
  if (d.error) return <p className="err">{/does not exist|schema cache|Could not find/i.test(d.error) ? 'The lists’ tables aren’t in the database yet.' : d.error}</p>
  const names = namesFor(d.names)
  const month = today.slice(0, 7)
  const finished = d.rows.filter((r) => r.status === 'done' && r.on_date.startsWith(month)).length
  let team = 0
  for (let x = month + '-01'; x <= today; x = addDays(x, 1)) if (teamDayToday(d.rows, x)) team++
  const people = family.people.filter((p) => d.rows.some((r) => r.member_id === p.id))
  const best = (p, part) => Math.max(0, ...d.rows.filter((r) => r.member_id === p.id && r.part === part).map((r) => r.best || 0))
  return (
    <div className="report">
      <div className="figures">
        <div><b>{finished}</b><span>lists finished this month</span></div>
        <div><b>{team}</b><span>Team Hicks days</span></div>
        <div><b>{d.runs.filter((r) => r.status === 'won').length}</b><span>challenges won</span></div>
      </div>
      {people.length > 0 && (
        <table className="table">
          <thead><tr><th>In a row now</th><th className="num">{names.morning}</th><th className="num">{names.evening}</th></tr></thead>
          <tbody>{people.map((p) => <tr key={p.id}><td>{p.name}</td>{['morning', 'evening'].map((part) => { const n = streakShown(d.rows.filter((r) => r.member_id === p.id), part, today); const b = best(p, part); return <td key={part} className="num">{n} {noun(part, n)}{b > n ? ` (best ${b})` : ''}</td> })}</tr>)}</tbody>
        </table>
      )}
      <p className="muted"><Link to="/home/lists/family">The family’s page ›</Link></p>
    </div>
  )
}
/** Guides written, and what Claude cost for them: counts only, never which places (where anyone has been stays off Reports). */
function GuidesReport({ session }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    let live = true
    if (!supabase || !session) return undefined
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0)
    Promise.all([
      supabase.from('area_guides').select('id', { count: 'exact', head: true }).eq('kind', 'guide').eq('status', 'ready').gte('fetched_at', since),
      supabase.from('ai_usage').select('cost_cents').eq('task', 'around-here').gte('created_at', month.toISOString()).limit(1000),
    ]).then(([g, u]) => { if (live) setD({ guides: g.count ?? 0, cents: (u.data || []).reduce((a, r) => a + Number(r.cost_cents || 0), 0), calls: (u.data || []).length }) })
    return () => { live = false }
  }, [session])
  if (!d) return <p className="muted">Counting…</p>
  return (
    <div>
      <table className="table"><tbody>
        <tr><td>Guides written in the last 30 days</td><td className="num">{d.guides}</td></tr>
        <tr><td>Claude’s cost for them this month</td><td className="num">${(d.cents / 100).toFixed(2)}</td></tr>
      </tbody></table>
      <p className="muted small">Which places stays off Reports. The cost includes each web search, estimated at a cent a search.</p>
    </div>
  )
}
/** The travel app in numbers: trips kept, postcards, hikes and their miles. Counts only, never where. */
function TripsReport({ session }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    let live = true
    if (!supabase || !session) return undefined
    const year = `${new Date().getFullYear()}-01-01`
    Promise.all([
      supabase.from('outings').select('id', { count: 'exact', head: true }).gte('starts_on', year),
      supabase.from('postcards').select('id', { count: 'exact', head: true }).gte('on_date', year),
      supabase.from('trip_hikes').select('miles').gte('on_date', year).limit(1000),
    ]).then(([o, p, h]) => { if (live) setD({ trips: o.count ?? 0, cards: p.count ?? 0, hikes: (h.data || []).length, miles: Math.round((h.data || []).reduce((a, r) => a + Number(r.miles || 0), 0) * 10) / 10 }) })
    return () => { live = false }
  }, [session])
  if (!d) return <p className="muted">Counting…</p>
  return (
    <table className="table"><tbody>
      <tr><td>Trips kept this year</td><td className="num">{d.trips}</td></tr>
      <tr><td>Postcards sent</td><td className="num">{d.cards}</td></tr>
      <tr><td>Hikes ticked off</td><td className="num">{d.hikes} ({d.miles} mi)</td></tr>
    </tbody></table>
  )
}
/** Her gallery in numbers: paintings, the years they span, how many have a month or a shape, colours, the featured walls and their cost. */
function GalleryReport({ session }) {
  const [d, setD] = useState(null)
  useEffect(() => {
    let live = true
    if (!supabase || !session) return undefined
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0)
    Promise.all([
      supabase.from('paintings').select('*').limit(1000),
      supabase.from('gallery_features').select('id', { count: 'exact', head: true }),
      supabase.from('ai_usage').select('cost_cents, task').in('task', ['feature-paintings', 'look-painting', 'read-painting']).gte('created_at', month.toISOString()).limit(1000),
    ]).then(([p, f, u]) => {
      if (!live) return
      const rows = p.data || [], years = rows.map((r) => r.year).filter(Boolean)
      const top = {}
      for (const r of rows) for (const k of familiesOf(r.palette)) top[k] = (top[k] || 0) + 1
      const colour = Object.entries(top).sort((a, b) => b[1] - a[1])[0]
      setD({
        n: rows.length, from: years.length ? Math.min(...years) : null, to: years.length ? Math.max(...years) : null,
        months: rows.filter((r) => r.month).length, shaped: rows.filter((r) => isShaped(r.shape)).length, looked: rows.filter((r) => r.looks).length,
        colour: colour ? FAMILIES[colour[0]].label.toLowerCase() : null, walls: f.error ? null : f.count ?? 0,
        cents: (u.data || []).reduce((a, r) => a + Number(r.cost_cents || 0), 0),
      })
    })
    return () => { live = false }
  }, [session])
  if (!d) return <p className="muted">Counting…</p>
  return (
    <table className="table"><tbody>
      <tr><td>Her paintings</td><td className="num">{d.n}</td></tr>
      {d.from && <tr><td>Painted from</td><td className="num">{d.from === d.to ? d.from : `${d.from}–${d.to}`}</td></tr>}
      <tr><td>With a month by her signature</td><td className="num">{d.months}</td></tr>
      <tr><td>On a canvas that isn’t a rectangle</td><td className="num">{d.shaped}</td></tr>
      <tr><td>Looked at by Claude, words kept</td><td className="num">{d.looked}</td></tr>
      {d.colour && <tr><td>Her commonest colour</td><td className="num">{d.colour}</td></tr>}
      {d.walls !== null && <tr><td>Featured walls hung by Claude</td><td className="num">{d.walls}</td></tr>}
      <tr><td>Claude’s cost for her gallery this month</td><td className="num">${(d.cents / 100).toFixed(2)}</td></tr>
    </tbody></table>
  )
}
const BUILT = { 'lifelist/gallery': GalleryReport, 'yonder/trips': TripsReport, 'world/guides': GuidesReport, 'home/lists': ListsReport, 'calendar/sources': SourcesReport, 'calendar/family-days': FamilyDaysReport, 'kitchen/cookbook': CookbookReport }

export default function Reports() {
  const session = useSession()
  const ready = REGISTRY.flatMap((p) => p.reports.filter((r) => r.ready).map((r) => ({ ...r, place: p })))
  const coming = REGISTRY.filter((p) => !p.reports.some((r) => r.ready))
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Team Hicks</span>
        <h1 className="greet">Reports</h1>
        <span className="sub">Each place adds its own as it’s built.</span>
      </header>
      {ready.map((r) => {
        const Body = BUILT[r.place.key + '/' + r.key]
        return (
          <Card key={r.place.key + r.key} tint={r.place.colour} glyph="calendar" label={r.title} tag={r.place.name} className="span-3">
            <p className="muted">{r.blurb}</p>
            {Body && <Body session={session} />}
          </Card>
        )
      })}
      <Card tint="#8A5BC4" glyph="star" label="Coming with each place" className="span-3">
        <ul className="coming">{coming.map((p) => <li key={p.key}>{p.name}</li>)}</ul>
      </Card>
    </>
  )
}
