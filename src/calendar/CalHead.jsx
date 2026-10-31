import { navigate } from '../lib/router.js'
import { calPath, stepDate, VIEWS } from '../lib/cal/paths.js'
import { churchYear, nextSeason, SEASON_NAMES, SEASON_COLOURS, COLOURS, liturgicalDay } from '../lib/cal/liturgy.js'
import { diffDays, parts, MONTHS, WEEKDAYS } from '../lib/cal/dates.js'

const LABELS = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' }

/** Moving between periods or views replaces the address: Back leaves the calendar rather than retracing every month. */
function go(view, date) { navigate(calPath(view, date), { replace: true }) }

/** The calendar's header: what's showing, the Church season, and the way to move. */
export function CalHead({ view, date, today, title, kicker = 'Calendar', children }) {
  return (
    <header className="cal-hero span-6">
      <div className="cal-hero-t">
        <span className="kicker">{kicker}</span>
        <h1 className="greet">{title}</h1>
        {children}
      </div>
      <div className="cal-tools">
        <nav className="seg" aria-label="Calendar view" style={{ '--i': VIEWS.indexOf(view) }}>
          <span className="seg-pill" aria-hidden="true" />
          {VIEWS.map((v) => (
            <a key={v} href={calPath(v, date)} aria-current={v === view ? 'page' : undefined}
              onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); go(v, date) }}>{LABELS[v]}</a>
          ))}
        </nav>
        <div className="cal-step">
          <a className="icon-btn" href={calPath(view, stepDate(view, date, -1))} aria-label={`Previous ${view}`}
            onClick={(e) => { e.preventDefault(); go(view, stepDate(view, date, -1)) }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
          <a className="btn ghost today-btn" href={calPath(view, today)} aria-disabled={calPath(view, today) === calPath(view, date) || undefined}
            onClick={(e) => { e.preventDefault(); go(view, today) }}>Today</a>
          <a className="icon-btn" href={calPath(view, stepDate(view, date, 1))} aria-label={`Next ${view}`}
            onClick={(e) => { e.preventDefault(); go(view, stepDate(view, date, 1)) }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>
    </header>
  )
}

/** "Ordinary Time · Advent begins Sunday, November 29", and the Church year as a ribbon. */
export function SeasonStrip({ date, today }) {
  const at = date.slice(0, 7) === today.slice(0, 7) ? today : date
  const segs = churchYear(at)
  const start = segs[0].from, total = diffDays(start, segs.at(-1).to) + 1
  const lit = liturgicalDay(at), next = nextSeason(at)
  const [, nm, nd] = parts(next.from)
  const nextWords = `${SEASON_NAMES[next.season].replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())} begins ${WEEKDAYS[new Date(Date.UTC(...dParts(next.from))).getUTCDay()]}, ${MONTHS[nm - 1]} ${nd}`
  const pos = Math.max(0, Math.min(1, (diffDays(start, at) + 0.5) / total))
  return (
    <div className="season-wrap">
      <p className="season-words"><b>{SEASON_NAMES[lit.season].replace(/^the /, 'The ')}</b> · {nextWords}</p>
      <div className="season-strip" role="img" aria-label={`The Church year from Advent to Advent, now in ${SEASON_NAMES[lit.season]}`}>
        {segs.map((s, i) => (
          <i key={i} style={{ flexGrow: diffDays(s.from, s.to) + 1, background: COLOURS[SEASON_COLOURS[s.season]] }} />
        ))}
        <b className="season-now" style={{ left: `${(pos * 100).toFixed(2)}%` }} />
      </div>
    </div>
  )
}
const dParts = (s) => { const [y, m, d] = parts(s); return [y, m - 1, d] }

/** Whose days to show: kept on this device, never in the address. */
export function WhoFilter({ members, who, onChange }) {
  if (!members.length) return null
  return (
    <div className="who-filter span-6" role="group" aria-label="Whose days to show">
      {[{ id: null, name: 'Everyone' }, ...members].map((m) => (
        <button key={m.id || 'all'} type="button" aria-pressed={who === m.id} onClick={() => onChange(m.id)}
          style={m.colour ? { '--who': m.colour } : undefined}>{m.name}</button>
      ))}
    </div>
  )
}
