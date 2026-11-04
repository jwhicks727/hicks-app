import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from '../shell/Link.jsx'
import WeatherIcon from './WeatherIcon.jsx'
import { inchWords, windTurn } from '../lib/weather.js'
import { WEEKDAYS } from '../lib/cal/dates.js'
import { graphScale, hoursByDate, dayLine, linePath, rainPath, nightBands } from '../lib/dayGraph.js'
import './wxs.css'

// The weather as a weather app draws it: every hour, and every day, in a strip
// to scroll as far as the forecast goes ahead and as far back as it was kept.
// Each cell says what is coming (the chance of rain, the inches, the wind) and
// opens that hour's or day's own page. The hour strip draws only the cells
// near the screen, so three weeks of hours stay light.

const CELL = 68
const dayName = (date, long = false) => { const d = WEEKDAYS[new Date(date + 'T12:00:00Z').getUTCDay()]; return long ? d : d.slice(0, 3) }
const md = (date) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
const hh = (h) => String(h).padStart(2, '0')

/** A little arrow turned the way the wind blows (it comes from `dir` degrees). */
export function WindArrow({ dir, size = 12 }) {
  if (dir == null) return null
  return <svg className="wxs-arrow" viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" style={{ transform: `rotate(${windTurn(dir)}deg)` }}><path d="M6 1.5v9M6 1.5L3 4.8M6 1.5l3 3.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

/** Rain and wind lines under a cell: "40%", "0.03 in", "9 mph ↑". `quiet` (the hours) leaves the rain out when there is none. */
export function RainWind({ rain, inches, wind, gusts, dir, compact = false, quiet = false }) {
  const someRain = rain != null && Math.round(rain) > 0, someInches = Boolean(inchWords(inches))
  return (
    <>
      {(!quiet || someRain) ? <span className="wxs-rain" title="Chance of rain">{rain != null ? `${Math.round(rain)}%` : '–'}</span> : <span className="wxs-rain" aria-hidden="true">{' '}</span>}
      {(!quiet || someInches) ? <span className="wxs-in" title="Rain expected">{inchWords(inches) || (compact ? ' ' : '0 in')}</span> : <span className="wxs-in" aria-hidden="true">{' '}</span>}
      <span className="wxs-wind" title={gusts ? `Wind, gusting to ${Math.round(gusts)} mph` : 'Wind'}><WindArrow dir={dir} />{wind != null ? `${Math.round(wind)}` : '–'}<small> mph</small></span>
    </>
  )
}

/** Every hour of the timeline, scrolling as far as it goes both ways. */
export function HourStrip({ timeline, nowIndex = 0 }) {
  const box = useRef(null), raf = useRef(0)
  const [view, setView] = useState({ from: Math.max(0, nowIndex - 6), to: nowIndex + 30, first: nowIndex })
  const n = timeline.length
  const read = useCallback(() => {
    const el = box.current
    if (!el) return
    const first = Math.min(n - 1, Math.max(0, Math.round(el.scrollLeft / CELL))), fit = Math.ceil(el.clientWidth / CELL)
    setView({ from: Math.max(0, first - 18), to: Math.min(n, first + fit + 18), first })
  }, [n])
  useLayoutEffect(() => { if (box.current) { box.current.scrollLeft = Math.max(0, nowIndex * CELL - 4); read() } }, [nowIndex, n, read])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const onScroll = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(read) }
  const jump = (i) => { if (box.current) box.current.scrollTo({ left: Math.max(0, i * CELL - 4), behavior: 'smooth' }) }
  const lead = timeline[view.first]
  const cells = []
  for (let i = view.from; i < view.to; i++) {
    const h = timeline[i]
    cells.push(
      <li key={h.time} style={{ left: i * CELL }} className={(h.past ? 'past ' : '') + (h.now ? 'now ' : '') + (h.hour === 0 ? 'midnight' : '')}>
        <Link to={`/world/day/${h.date}/${hh(h.hour)}`} aria-label={`${dayName(h.date, true)} ${h.label}: ${h.temp} degrees, ${h.words}, ${h.rain ?? 0} percent chance of rain, wind ${h.wind ?? 0} miles an hour`}>
          <span className="wxs-h">{h.now ? 'Now' : h.label}{h.hour === 0 || i === 0 ? <em>{dayName(h.date)} {md(h.date)}</em> : null}</span>
          <WeatherIcon pic={h.pic} size={28} />
          <b className="wxs-t">{Math.round(h.temp)}°</b>
          <RainWind rain={h.rain} inches={h.inches} wind={h.wind} gusts={h.gusts} dir={h.dir} quiet />
        </Link>
      </li>,
    )
  }
  return (
    <div className="wxs">
      <div className="wxs-head">
        <b>{lead ? `${dayName(lead.date, true)}, ${md(lead.date)}` : ''}{lead && lead.past ? ' · what happened' : ''}</b>
        <span className="wxs-jumps">
          <button type="button" onClick={() => jump(Math.max(0, nowIndex - 24))} aria-label="A day back">‹ Day</button>
          <button type="button" onClick={() => jump(nowIndex)}>Now</button>
          <button type="button" onClick={() => jump(Math.min(n - 1, nowIndex + 24))} aria-label="A day ahead">Day ›</button>
        </span>
      </div>
      <div className="wxs-scroll" ref={box} onScroll={onScroll} tabIndex={0} role="region" aria-label="Hour by hour: scroll sideways for the days before and after">
        <ol style={{ width: n * CELL }}>{cells}</ol>
      </div>
    </div>
  )
}

const COL = 104, GRAPH_H = 96

/**
 * Every day the forecast holds, back to what was kept and ahead to what's promised, drawn as a weather site
 * draws it: each day's column with its day and night pictures, high and low and chance of rain, and under
 * them one temperature line running through every hour (grey for what has happened), its highs and lows
 * marked, night shaded, and the rain as a filled blue band. A column opens that day's page.
 */
export function DayStrip({ days, timeline = [] }) {
  const box = useRef(null)
  const todayAt = Math.max(0, days.findIndex((d) => d.today))
  // The "Earlier" cell comes first, so today is column todayAt + 1: it sits at the left edge, as Now does in the hours
  useLayoutEffect(() => { if (box.current) box.current.scrollLeft = Math.max(0, (todayAt + 1) * COL) }, [todayAt, days.length])
  const jump = (i) => box.current && box.current.scrollTo({ left: Math.max(0, i * COL), behavior: 'smooth' })
  const byDate = useMemo(() => hoursByDate(timeline), [timeline])
  const scale = useMemo(() => graphScale(days), [days])
  if (!days.length) return null
  const earlier = (() => { const d = new Date(days[0].date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) })()
  const shift = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return byDate[d.toISOString().slice(0, 10)] }
  const next = (date) => shift(date, 1)
  return (
    <div className="wxs wxs-days">
      <div className="wxs-head">
        <b>Day by day</b>
        <span className="wxs-jumps">
          <button type="button" onClick={() => jump(0)}>‹ Back</button>
          <button type="button" onClick={() => jump(todayAt + 1)}>Today</button>
          <button type="button" onClick={() => jump(days.length)}>Ahead ›</button>
        </span>
      </div>
      <div className="wxs-scroll" ref={box} tabIndex={0} role="region" aria-label="Day by day: scroll sideways for the weeks before and after">
        <ol className="wxd">
          <li className="wxs-more"><Link to={`/world/day/${earlier}`}>Earlier<small>any date back ›</small></Link></li>
          {days.map((d) => {
            const hours = byDate[d.date] || []
            const night = hours.find((h) => h.hour === 21) || hours[hours.length - 1]
            const g = dayLine(hours, next(d.date), scale, { W: COL, H: GRAPH_H, prev: shift(d.date, -1) })
            const wet = g && rainPath(g.rain, { H: GRAPH_H, band: GRAPH_H - 10 })
            return (
              <li key={d.date} className={(d.past ? 'past ' : '') + (d.today ? 'now' : '')}>
                <Link to={`/world/day/${d.date}`} aria-label={`${dayName(d.date, true)} ${md(d.date)}: high ${d.high}, low ${d.low}, ${d.words}, ${d.rain ?? 0} percent chance of rain`}>
                  <span className="wxd-h">{d.today ? 'Today' : `${dayName(d.date)} ${Number(d.date.slice(8, 10))}`}</span>
                  <span className="wxd-pics"><WeatherIcon pic={d.pic} size={30} />{night && <WeatherIcon pic={night.pic} size={22} />}</span>
                  <b className="wxd-t fig">{Math.round(d.high)}°<i> | </i><small>{Math.round(d.low)}°</small></b>
                  <span className="wxd-rain fig"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M5 1C3.5 4 2 5.6 2 7.6A3 3 0 0 0 8 7.6C8 5.6 6.5 4 5 1z" /></svg>{d.rain != null ? `${Math.round(d.rain)}%` : '–'}</span>
                  <svg className="wxd-graph" viewBox={`0 0 ${COL} ${GRAPH_H}`} width={COL} height={GRAPH_H} aria-hidden="true">
                    {nightBands(d, COL).map(([a, b], i) => <rect key={i} className="wxd-night" x={a} y="0" width={Math.max(0, b - a)} height={GRAPH_H} />)}
                    {[0.25, 0.5, 0.75].map((f) => <line key={f} className="wxd-grid" x1="0" x2={COL} y1={10 + f * (GRAPH_H - 34)} y2={10 + f * (GRAPH_H - 34)} />)}
                    <line className="wxd-sep" x1="0.5" x2="0.5" y1="0" y2={GRAPH_H} />
                    <line className="wxd-base" x1="0" x2={COL} y1={GRAPH_H - 0.75} y2={GRAPH_H - 0.75} />
                    {wet && <path className="wxd-wet" d={wet} />}
                    {g && g.past.length > 1 && <path className="wxd-line was" d={linePath(g.past)} />}
                    {g && g.future.length > 1 && <path className="wxd-line" d={linePath(g.future)} />}
                    {g && [g.high, g.low].map((p, i) => <circle key={i} className={'wxd-dot' + (p.past ? ' was' : '')} cx={Math.min(COL - 4, Math.max(4, p.x))} cy={p.y} r="3.4" />)} {/* kept inside the column, even at midnight */}
                  </svg>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
