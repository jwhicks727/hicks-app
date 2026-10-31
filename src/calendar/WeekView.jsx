import { Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { calPath, stepDate } from '../lib/cal/paths.js'
import { dayView } from '../lib/cal/day.js'
import { parishDay, massWords } from '../lib/cal/sacredHeart.js'
import { useParish } from '../lib/useParish.js'
import { liturgicalDay } from '../lib/cal/liturgy.js'
import { addDays, parts, WEEKDAYS } from '../lib/cal/dates.js'
import { itemsOf, isCelebration } from './items.js'
import { Glyph, MoonGlyph } from './Glyph.jsx'
import { useSwipe } from './useSwipe.js'

// Under a column already headed "Tue", "Tuesday of the 31st Week in Ordinary Time" says only the week.
const weekWords = (name) => name.replace(/^[A-Z][a-z]+day of (the )?/, '').replace(/^[A-Z][a-z]+day (after|in) /, (m, w) => `${w} `).replace(/^./, (c) => c.toUpperCase())

export default function WeekView({ date, today, data }) {
  const days = Array.from({ length: 7 }, (_, i) => dayView(addDays(date, i), data))
  const [read] = useParish()
  const swipe = useSwipe(() => navigate(calPath('week', stepDate('week', date, 1)), { replace: true }), () => navigate(calPath('week', stepDate('week', date, -1)), { replace: true }))
  return (
    <section className="week span-6" aria-label="The week" key={date} {...swipe}>
      {days.map((dv) => {
        const [, , d] = parts(dv.date), wd = WEEKDAYS[new Date(Date.UTC(...parts(dv.date).map((v, i) => (i === 1 ? v - 1 : v)))).getUTCDay()]
        const its = itemsOf(dv, { withChurch: false })
        const parish = parishDay(dv.date, dv.lit, liturgicalDay(addDays(dv.date, 1)), read && read.schedule)
        const fam = dv.family.some((f) => f.kind !== 'remember')
        return (
          <article key={dv.date} className={'dblock' + (dv.date === today ? ' today' : '') + (fam ? ' celebrate-day' : '')} style={{ '--lc': dv.lit.colourHex }}>
            <Link to={calPath('day', dv.date)} className="dblock-head">
              <span className="dnum"><small>{dv.date === today ? 'Today' : wd.slice(0, 3)}</small><b>{d}</b></span>
              <span className="dtitle">{isCelebration(dv.lit) || dv.lit.rank === 'sunday' ? <b>{dv.lit.name}</b> : <span className="plain">{weekWords(dv.lit.name)}</span>}{dv.lit.optional && <span>or {dv.lit.optional}</span>}</span>
            </Link>
            {its.length > 0 && (
              <ul className="items">
                {its.map((it) => (
                  <li key={it.key} className={'item k-' + it.kind + (it.rainbow ? ' rainbow' : '')} style={{ '--c': it.colour }}>
                    <span className="ml-g">{it.moon ? <MoonGlyph phase={it.moon} size={18} /> : <Glyph name={it.glyph} />}</span>
                    <span><b>{it.label}</b>{it.sub && <span className="ml-sub"> · {it.sub}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mass-line"><b>{parish.mass.length && parish.mass.every((m) => m.daily) ? 'Daily Mass' : 'Mass'}</b> {parish.mass.map((m, i) => { const what = parish.mass.every((x) => x.daily) ? massWords({ ...m, daily: false }) : massWords(m); return <span key={m.time}>{i > 0 && ' · '}<span className="nw">{m.time}</span>{what && ` ${what}`}</span> })}{parish.confession && <> · <b>Confession</b> <span className="nw">{parish.confession}</span></>}</p>
          </article>
        )
      })}
    </section>
  )
}
