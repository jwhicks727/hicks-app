import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from '../shell/Link.jsx'
import WeatherIcon from './WeatherIcon.jsx'
import { inchWords, windTurn } from '../lib/weather.js'
import { WEEKDAYS } from '../lib/cal/dates.js'
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

/** Rain and wind lines under a cell: "40%", "0.03 in", "9 mph ↑". */
export function RainWind({ rain, inches, wind, gusts, dir, compact = false }) {
  return (
    <>
      <span className="wxs-rain" title="Chance of rain">{rain != null ? `${Math.round(rain)}%` : '–'}</span>
      <span className="wxs-in" title="Rain expected">{inchWords(inches) || (compact ? ' ' : '0 in')}</span>
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
          <RainWind rain={h.rain} inches={h.inches} wind={h.wind} gusts={h.gusts} dir={h.dir} />
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

/** Every day the forecast holds, back to what was kept and ahead to what's promised. */
export function DayStrip({ days }) {
  const box = useRef(null)
  const todayAt = Math.max(0, days.findIndex((d) => d.today))
  useLayoutEffect(() => { if (box.current) box.current.scrollLeft = Math.max(0, (todayAt + 1) * 84 - 4) }, [todayAt, days.length]) // the "Earlier" cell comes first, so today is cell todayAt + 1: it sits at the left edge, as Now does in the hours
  const jump = (i) => box.current && box.current.scrollTo({ left: Math.max(0, i * 84 - 4), behavior: 'smooth' })
  if (!days.length) return null
  const earlier = (() => { const d = new Date(days[0].date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10) })()
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
        <ol>
          <li className="wxs-more"><Link to={`/world/day/${earlier}`}>Earlier<small>any date back ›</small></Link></li>
          {days.map((d) => (
            <li key={d.date} className={(d.past ? 'past ' : '') + (d.today ? 'now' : '')}>
              <Link to={`/world/day/${d.date}`} aria-label={`${dayName(d.date, true)} ${md(d.date)}: high ${d.high}, low ${d.low}, ${d.words}, ${d.rain ?? 0} percent chance of rain, wind to ${d.wind ?? 0} miles an hour`}>
                <span className="wxs-h">{d.today ? 'Today' : dayName(d.date)}<em>{md(d.date)}</em></span>
                <WeatherIcon pic={d.pic} size={30} />
                <b className="wxs-t">{Math.round(d.high)}°<small>{Math.round(d.low)}°</small></b>
                <RainWind rain={d.rain} inches={d.inches} wind={d.wind} gusts={d.gusts} dir={d.dir} />
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
