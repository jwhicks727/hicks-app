import { useEffect, useState } from 'react'
import { Link } from '../shell/Link.jsx'
import { calPath, monthGrid } from '../lib/cal/paths.js'
import { liturgicalDay, COLOURS } from '../lib/cal/liturgy.js'
import { familyOn } from '../lib/cal/family.js'
import { forWho } from '../lib/cal/day.js'
import { ds, parts, MONTHS, WEEKDAYS } from '../lib/cal/dates.js'
import { SCHOOLS, noSchoolDays, schoolsWithCalendars } from '../lib/cal/schools.js'
import { isCelebration } from './items.js'
import { Card } from '../ui/Card.jsx'
import { usePrefs } from '../lib/prefs.js'

/** A phone can't hit a 24px day reliably: there, a whole small month opens that month. */
function useCoarse() {
  const q = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: coarse)') : null
  const [coarse, setCoarse] = useState(q ? q.matches : false)
  useEffect(() => { if (!q) return undefined; const on = () => setCoarse(q.matches); q.addEventListener('change', on); return () => q.removeEventListener('change', on) }, [q])
  return coarse
}

export default function YearView({ date, today, data, signedIn, family }) {
  const y = parts(date)[0]
  const [prefs, update] = usePrefs()
  const layer = prefs.yearLayer === 'church' ? 'church' : 'schools'
  const coarse = useCoarse()
  const off = noSchoolDays(data.events, family.sources, family.members)
  const withCal = schoolsWithCalendars(family.sources, family.members)
  const famDays = data.familyDays.filter(forWho(data.who))
  return (
    <>
      <div className="year-bar span-6">
        <div className="choice-row" role="group" aria-label="What the year shows">
          {[['schools', 'School calendars'], ['church', 'The Church year']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={layer === k} onClick={() => update({ yearLayer: k })}>{l}</button>
          ))}
        </div>
        {layer === 'schools' && (
          <ul className="lanes-legend" aria-label="The schools">
            {SCHOOLS.map((s) => <li key={s.key} style={{ '--c': s.colour }}><i />{s.name}<span> · {s.person}</span></li>)}
          </ul>
        )}
      </div>
      {layer === 'schools' && withCal.length < SCHOOLS.length && (
        <Card tint="#D9A520" label="The school calendars" glyph="calendar" className="span-6">
          <p>{!signedIn
            ? 'Sign in to see the school calendars side by side.'
            : withCal.length === 0
              ? 'None yet. Paste each school’s calendar into Admin (a link, a PDF or a photo of the printed one), marked as Laurie’s, Anna’s or Jason’s, and its days off line up here.'
              : `Still to add: ${SCHOOLS.filter((s) => !withCal.includes(s)).map((s) => `${s.name} (${s.person}’s)`).join(' and ')}.`}</p>
          {signedIn && <Link className="btn ghost" to="/admin">Open Admin</Link>}
        </Card>
      )}
      <div className={'year-grid span-6 layer-' + layer} key={y}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const first = ds(y, m, 1)
          const cells = monthGrid(first)
          const title = <h2 className="mini-t">{MONTHS[m - 1]}</h2>
          const grid = (
              <div className="mini" aria-hidden={coarse || undefined}>
                {WEEKDAYS.map((w) => <span key={w} className="mini-h">{w[0]}</span>)}
                {cells.map((d) => {
                  const [, dm, dd] = parts(d)
                  if (dm !== m) return <span key={d} className="mini-d out" />
                  const lit = liturgicalDay(d)
                  const fam = famDays.length > 0 && familyOn(d, famDays).some((f) => f.kind !== 'remember')
                  const lanes = off[d]
                  const cls = ['mini-d', d === today && 'today', fam && 'fam', isCelebration(lit) && 'feast', lit.season === 'ordinary' && 'ot'].filter(Boolean).join(' ')
                  const inner = (
                    <>
                      {dd}
                      {layer === 'schools' && lanes && <span className="lanes">{SCHOOLS.map((s) => <i key={s.key} style={{ '--c': lanes.has(s.key) ? s.colour : 'transparent' }} />)}</span>}
                    </>
                  )
                  const style = { '--lc': COLOURS[lit.colour] }
                  const label = `${MONTHS[m - 1]} ${dd}${lanes ? ': no school at ' + SCHOOLS.filter((s) => lanes.has(s.key)).map((s) => s.name).join(', ') : ''}`
                  return coarse
                    ? <span key={d} className={cls} style={style}>{inner}</span>
                    : <Link key={d} to={calPath('day', d)} className={cls} style={style} aria-label={label}>{inner}</Link>
                })}
              </div>
          )
          return coarse
            ? <Link key={m} to={calPath('month', first)} className="mini-month" aria-label={`${MONTHS[m - 1]} ${y}`}>{title}{grid}</Link>
            : <section key={m} className="mini-month"><Link to={calPath('month', first)} className="mini-link">{title}</Link>{grid}</section>
        })}
      </div>
    </>
  )
}
