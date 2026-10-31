import { Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { calPath, monthGrid, stepDate } from '../lib/cal/paths.js'
import { dayView } from '../lib/cal/day.js'
import { parts, WEEKDAYS, MONTHS } from '../lib/cal/dates.js'
import { itemsOf } from './items.js'
import { Glyph, MoonGlyph } from './Glyph.jsx'
import { useSwipe } from './useSwipe.js'
import { Card } from '../ui/Card.jsx'

function Mark({ it }) {
  if (it.moon) return <MoonGlyph phase={it.moon} size={11} className="mark-moon" />
  return <i className={it.rainbow ? 'rainbow' : ''} style={{ '--c': it.colour }} />
}

export default function MonthView({ date, today, data }) {
  const [y, m] = parts(date)
  const days = monthGrid(date).map((d) => dayView(d, data))
  const swipe = useSwipe(() => navigate(calPath('month', stepDate('month', date, 1)), { replace: true }), () => navigate(calPath('month', stepDate('month', date, -1)), { replace: true }))
  const inMonth = days.filter((dv) => parts(dv.date)[1] === m)
  return (
    <>
      <section className="card cal-month span-6" aria-label={`${MONTHS[m - 1]} ${y}`} {...swipe}>
        <div className="wk-head" aria-hidden="true">{WEEKDAYS.map((w) => <span key={w}><b className="wide">{w.slice(0, 3)}</b><b className="narrow">{w[0]}</b></span>)}</div>
        <div className="month-grid" key={date.slice(0, 7)}>
          {days.map((dv) => {
            const its = itemsOf(dv)
            const [, dm, dd] = parts(dv.date)
            const cls = ['cell', dm !== m && 'out', dv.date === today && 'today', dv.family.some((f) => f.kind !== 'remember') && 'fam', ['solemnity', 'principal', 'triduum', 'souls'].includes(dv.lit.rank) && 'high'].filter(Boolean).join(' ')
            const label = `${WEEKDAYS[new Date(Date.UTC(y, dm - 1, dd)).getUTCDay()]}, ${MONTHS[dm - 1]} ${dd}${its.length ? ': ' + its.map((i) => i.label).join(', ') : ''}`
            return (
              <Link key={dv.date} to={calPath('day', dv.date)} className={cls} style={{ '--lc': dv.lit.colourHex }} aria-label={label}>
                <span className="n">{dd}</span>
                <span className="dots" aria-hidden="true">{its.slice(0, 5).map((it) => <Mark key={it.key} it={it} />)}</span>
                <span className="chips" aria-hidden="true">
                  {its.slice(0, 3).map((it) => <span key={it.key} className={'chip' + (it.rainbow ? ' rainbow' : '')} style={{ '--c': it.colour }}>{it.label}</span>)}
                  {its.length > 3 && <span className="more">+{its.length - 3} more</span>}
                </span>
              </Link>
            )
          })}
        </div>
      </section>
      <MonthList days={inMonth} today={today} month={MONTHS[m - 1]} />
    </>
  )
}

/** The month as a list: every day with something to it, in order. */
function MonthList({ days, today, month }) {
  const rows = days.map((dv) => ({ dv, its: itemsOf(dv) })).filter((r) => r.its.length)
  return (
    <Card tint="#3E7A4C" label={`In ${month}`} glyph="calendar" className="span-6 month-list-card">
      <ol className="month-list">
        {rows.map(({ dv, its }) => {
          const [y, m, d] = parts(dv.date)
          return (
            <li key={dv.date} className={dv.date === today ? 'today' : ''}>
              <Link to={calPath('day', dv.date)} className="ml-row">
                <span className="dnum"><small>{dv.date === today ? 'Today' : WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()].slice(0, 3)}</small><b>{d}</b></span>
                <span className="ml-items">
                  {its.map((it) => (
                    <span key={it.key} className={'ml-item' + (it.rainbow ? ' rainbow' : '')} style={{ '--c': it.colour }}>
                      <span className="ml-g">{it.moon ? <MoonGlyph phase={it.moon} size={18} /> : <Glyph name={it.glyph} />}</span>
                      <span><b>{it.label}</b>{it.sub && <span className="ml-sub"> · {it.sub}</span>}</span>
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
