import { useSession } from '../lib/auth.js'
import { useSources, todayAtHome } from '../lib/useSources.js'
import { staleness, SOURCE_KINDS } from '../lib/sources.js'
import { REGISTRY } from '../registry.js'
import { useFamily } from '../lib/useCalendar.js'
import { upcoming } from '../lib/cal/family.js'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'

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
const BUILT = { 'calendar/sources': SourcesReport, 'calendar/family-days': FamilyDaysReport }

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
