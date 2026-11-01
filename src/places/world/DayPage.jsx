import { useMemo, useRef } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { navigate } from '../../lib/router.js'
import { useWeather, useDayWeather, useAir } from '../../lib/useWeather.js'
import { useNow } from '../../lib/useNow.js'
import { todayAt, WEEKDAYS } from '../../lib/cal/dates.js'
import { HOME_TOWN } from '../../lib/sky.js'
import { inchWords, recessFlag, aqiBand, fromDirection } from '../../lib/weather.js'
import { clockWords } from '../../lib/skyYear.js'
import WeatherIcon from '../../parts/WeatherIcon.jsx'
import { WindArrow } from '../../parts/WxStrips.jsx'
import { tempColour } from '../../lib/tempColour.js'
import { Credit } from '../../parts/WeatherCard.jsx'

// /world/day/<date>[/<hh>]: one day at home, hour by hour, with its graphs.
// Past days come from what was kept (the forecast's three weeks, then the
// archive, as far back as you like); coming days from the forecast, sixteen
// ahead. Touch or hover the graph, or tap an hour, to read it.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const longDate = (date) => { const d = new Date(date + 'T12:00:00Z'); return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}` }
const shift = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const hh = (h) => String(h).padStart(2, '0')
const W = 360, X0 = 30, X1 = 348
const xOf = (hour) => X0 + (hour / 23) * (X1 - X0)

export function relativeDay(date, today) {
  const n = Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 864e5)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  return n > 0 ? `In ${n} days` : `${-n} days ago`
}

export default function DayPage({ date, hour }) {
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const { forecast } = useWeather()
  const d = useDayWeather(date, HOME_TOWN, forecast)
  const air = useAir()
  const nowHour = +new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', hourCycle: 'h23' }).format(now)
  const wanted = /^\d\d$/.test(hour || '') ? Math.min(23, +hour) : date === today ? nowHour : 12
  const hours = d.hours || []
  const sel = hours.find((h) => h.hour === wanted) || hours.find((h) => h.hour >= wanted) || hours[hours.length - 1] || null
  const pick = (h) => navigate(`/world/day/${date}/${hh(h)}`, { replace: true })
  const day = d.day
  const flag = sel && date === today ? recessFlag(sel, air.air ? air.air.now : null) : sel ? recessFlag(sel, null) : null
  const sr = day && day.sunrise ? +day.sunrise.slice(11, 13) * 60 + +day.sunrise.slice(14, 16) : null
  const ss = day && day.sunset ? +day.sunset.slice(11, 13) * 60 + +day.sunset.slice(14, 16) : null

  if (!/^\d{4}-\d\d-\d\d$/.test(date)) return <header className="hero span-6"><Crumb to="/world">World</Crumb><h1 className="greet">Not a day</h1></header>
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/world">World</Crumb>
        <span className="kicker">{relativeDay(date, today)} · {d.source === 'archive' ? 'what happened' : date < today ? 'what happened' : 'the forecast'}</span>
        <h1 className="greet">{longDate(date)}</h1>
        <nav className="dp-step" aria-label="Other days">
          <Link to={`/world/day/${shift(date, -7)}`}>‹ Week</Link>
          <Link to={`/world/day/${shift(date, -1)}`}>‹ {longDate(shift(date, -1)).slice(0, 3)}</Link>
          {date !== today && <Link to={`/world/day/${today}`}>Today</Link>}
          <Link to={`/world/day/${shift(date, 1)}`}>{longDate(shift(date, 1)).slice(0, 3)} ›</Link>
          <Link to={`/world/day/${shift(date, 7)}`}>Week ›</Link>
        </nav>
      </header>

      {d.loading && !hours.length && <Card tint="#4A7FD6" label="The day" glyph="weather" className="span-6"><p className="muted">Looking back at the sky…</p></Card>}
      {d.error && !hours.length && <Card tint="#4A7FD6" label="The day" glyph="weather" className="span-6"><p className="muted">{d.error}</p><Link className="btn ghost" to={`/world/day/${today}`}>Back to today ›</Link></Card>}

      {day && (
        <Card tint="#4A7FD6" label={date < today ? 'That day' : 'The day'} glyph="weather" className="span-3">
          <div className="wx-now">
            <WeatherIcon pic={day.pic} size={64} label={day.words} />
            <div>
              <b className="wx-temp">{Math.round(day.high)}°<small className="dp-lo"> / {Math.round(day.low)}°</small></b>
              <p><b>{day.words}</b></p>
            </div>
          </div>
          <dl className="place-facts dp-facts">
            <div><dt>Rain</dt><dd><span className="fig">{day.rain ?? 0}%</span> chance{day.inches ? <> · <span className="fig">{inchWords(day.inches)}</span></> : ' · none expected'}</dd></div>
            <div><dt>Wind</dt><dd><WindArrow dir={day.dir} /> up to <span className="fig">{Math.round(day.wind ?? 0)} mph</span>, gusts <span className="fig">{Math.round(day.gusts ?? 0)}</span>{day.dir != null ? `, from the ${fromDirection(day.dir)}` : ''}</dd></div>
            {day.uv != null && <div><dt>UV</dt><dd><span className="fig">{Math.round(day.uv)}</span> at the strongest</dd></div>}
            {sr != null && <div><dt>Sunrise</dt><dd><Link to="/world/sky/sunrise" className="dp-link">{clockWords(sr)}</Link></dd></div>}
            {ss != null && <div><dt>Sunset</dt><dd><Link to="/world/sky/sunset" className="dp-link">{clockWords(ss)}</Link></dd></div>}
          </dl>
          <Credit />
        </Card>
      )}

      {hours.length > 1 && (
        <Card tint="#3BA3A8" label="Through the day" glyph="weather" className="span-3 dp-graph-card">
          <DayGraph hours={hours} sel={sel} onPick={pick} />
          <p className="muted small">Touch or slide along the graph to read an hour.</p>
        </Card>
      )}

      {sel && (
        <Card tint="#E0662F" label={`${sel.hour === 0 ? '12 AM' : sel.hour === 12 ? 'Noon' : sel.hour < 12 ? `${sel.hour} AM` : `${sel.hour - 12} PM`}`} glyph="weather" className="span-3">
          <div className="wx-now">
            <WeatherIcon pic={sel.pic} size={56} label={sel.words} />
            <div><b className="wx-temp" style={{ color: tempColour(sel.temp, true) }}>{Math.round(sel.temp)}°</b><p><b>{sel.words}</b>{sel.feels != null && <span className="muted"> · feels {Math.round(sel.feels)}°</span>}</p></div>
          </div>
          <dl className="place-facts dp-facts">
            <div><dt>Rain</dt><dd><span className="fig">{sel.rain ?? 0}%</span> chance{sel.inches ? <> · <span className="fig">{inchWords(sel.inches)}</span> in the hour</> : ''}</dd></div>
            <div><dt>Wind</dt><dd><WindArrow dir={sel.dir} /> <span className="fig">{Math.round(sel.wind ?? 0)} mph</span>{sel.gusts != null ? `, gusts ${Math.round(sel.gusts)}` : ''}{sel.dir != null ? `, from the ${fromDirection(sel.dir)}` : ''}</dd></div>
            {sel.humidity != null && <div><dt>Humidity</dt><dd className="fig">{Math.round(sel.humidity)}%</dd></div>}
            {sel.uv != null && <div><dt>UV</dt><dd className="fig">{sel.uv}</dd></div>}
            {sel.clouds && <div><dt>Cloud</dt><dd>low {sel.clouds.low}% · mid {sel.clouds.mid ?? '–'}% · high {sel.clouds.high ?? '–'}%</dd></div>}
          </dl>
          {flag && <RecessChip flag={flag} aqi={date === today && air.air ? air.air : null} />}
        </Card>
      )}

      {hours.length > 0 && (
        <Card tint="#4A7FD6" label="Every hour" glyph="weather" className="span-3">
          <ol className="dp-hours">
            {hours.map((h) => (
              <li key={h.time} className={(sel && sel.hour === h.hour ? 'on ' : '') + (h.now ? 'now' : '')}>
                <button type="button" onClick={() => pick(h.hour)} aria-pressed={sel && sel.hour === h.hour}>
                  <span className="dp-h">{h.hour === 0 ? '12 AM' : h.hour === 12 ? 'Noon' : h.hour < 12 ? `${h.hour} AM` : `${h.hour - 12} PM`}</span>
                  <WeatherIcon pic={h.pic} size={22} />
                  <b className="fig" style={{ color: tempColour(h.temp, true) }}>{Math.round(h.temp)}°</b>
                  <span className="dp-rain fig">{h.rain ?? 0}%</span>
                  <span className="dp-in fig">{inchWords(h.inches) || '0 in'}</span>
                  <span className="dp-wind fig"><WindArrow dir={h.dir} />{Math.round(h.wind ?? 0)} mph</span>
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  )
}

/** Can they play outside? The flag with its reasons; the air is part of it when it's today's. */
export function RecessChip({ flag, aqi, who = 'Outside play' }) {
  const label = { go: 'Good to be out', care: 'Take care', inside: 'Better inside' }[flag.level]
  const band = aqi ? aqiBand(aqi.now) : null
  return (
    <div className={'recess ' + flag.level}>
      <b>{who}: {label}</b>
      <span>{flag.reasons.join(' · ')}</span>
      {band && <Link to="/world/sky/air" className="recess-air" style={{ '--c': band.colour }}>Air {aqi.now}, {band.name.toLowerCase()} ›</Link>}
      <small>A guess from the forecast and the air. The school decides.</small>
    </div>
  )
}

/** Temperature, rain and wind across the day in one drawing; touch or slide to read an hour. */
function DayGraph({ hours, sel, onPick }) {
  const svg = useRef(null)
  const byHour = useMemo(() => hours.slice().sort((a, b) => a.hour - b.hour), [hours])
  const temps = byHour.map((h) => h.temp)
  const lo = Math.floor(Math.min(...temps) / 5) * 5, hi = Math.ceil(Math.max(...temps) / 5) * 5 + (Math.max(...temps) % 5 === 0 ? 5 : 0)
  const T0 = 14, T1 = 104, yT = (t) => T1 - ((t - lo) / Math.max(1, hi - lo)) * (T1 - T0)
  const R0 = 128, R1 = 176, maxIn = Math.max(0.2, ...byHour.map((h) => h.inches || 0))
  const M0 = 204, M1 = 252, maxW = Math.max(20, ...byHour.map((h) => h.gusts || h.wind || 0)), yW = (v) => M1 - ((v || 0) / maxW) * (M1 - M0)
  const line = byHour.map((h, i) => `${i ? 'L' : 'M'}${xOf(h.hour).toFixed(1)} ${yT(h.temp).toFixed(1)}`).join('')
  const area = `${line}L${xOf(byHour[byHour.length - 1].hour).toFixed(1)} ${T1}L${xOf(byHour[0].hour).toFixed(1)} ${T1}Z`
  const wind = byHour.map((h, i) => `${i ? 'L' : 'M'}${xOf(h.hour).toFixed(1)} ${yW(h.wind).toFixed(1)}`).join('')
  const gust = byHour.map((h, i) => `${i ? 'L' : 'M'}${xOf(h.hour).toFixed(1)} ${yW(h.gusts).toFixed(1)}`).join('')
  const read = (e) => {
    const el = svg.current
    if (!el) return
    const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(el.getScreenCTM().inverse())
    const hour = Math.round(((Math.min(X1, Math.max(X0, p.x)) - X0) / (X1 - X0)) * 23)
    const h = byHour.reduce((a, b) => (Math.abs(b.hour - hour) < Math.abs(a.hour - hour) ? b : a))
    if (!sel || h.hour !== sel.hour) onPick(h.hour)
  }
  return (
    <svg ref={svg} className="dg" viewBox={`0 0 ${W} 266`} role="img" aria-label="Temperature, chance and inches of rain, and wind through the day"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); read(e) }} onPointerMove={(e) => { if (e.buttons || e.pointerType === 'mouse') read(e) }}>
      <defs>
        <linearGradient id="dg-line" x1="0" x2="1" y1="0" y2="0">{byHour.map((h) => <stop key={h.hour} offset={`${(h.hour / 23) * 100}%`} stopColor={tempColour(h.temp)} />)}</linearGradient>
        <linearGradient id="dg-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#E0662F" stopOpacity=".28" /><stop offset="1" stopColor="#4A7FD6" stopOpacity=".04" /></linearGradient>
      </defs>
      {[0, 6, 12, 18, 23].map((h) => <g key={h}><line x1={xOf(h)} x2={xOf(h)} y1={T0 - 6} y2={M1} className="dg-grid" /><text x={xOf(h)} y="264" textAnchor="middle" className="dg-lab">{h === 0 ? '12a' : h === 12 ? '12p' : h === 23 ? '11p' : h < 12 ? `${h}a` : `${h - 12}p`}</text></g>)}
      <text x="2" y="12" className="dg-cap">Temperature</text>
      {[lo, Math.round((lo + hi) / 2), hi].map((t) => <g key={t}><line x1={X0} x2={X1} y1={yT(t)} y2={yT(t)} className="dg-grid h" /><text x={X0 - 4} y={yT(t) + 3} textAnchor="end" className="dg-lab">{t}°</text></g>)}
      <path d={area} fill="url(#dg-area)" /><path d={line} className="dg-temp" stroke="url(#dg-line)" />
      <text x="2" y={R0 - 8} className="dg-cap">Rain: chance, and inches</text>
      <line x1={X0} x2={X1} y1={R1} y2={R1} className="dg-grid h" />
      {byHour.map((h) => <g key={h.hour}><rect x={xOf(h.hour) - 4.2} width="8.4" y={R1 - ((h.rain || 0) / 100) * (R1 - R0)} height={((h.rain || 0) / 100) * (R1 - R0)} className="dg-chance" /><rect x={xOf(h.hour) - 2} width="4" y={R1 - Math.min(1, (h.inches || 0) / maxIn) * (R1 - R0)} height={Math.min(1, (h.inches || 0) / maxIn) * (R1 - R0)} className="dg-inch" /></g>)}
      <text x={X0 - 4} y={R0 + 3} textAnchor="end" className="dg-lab">100%</text><text x={X0 - 4} y={R1 + 3} textAnchor="end" className="dg-lab">0</text>
      <text x={X1} y={R0 - 8} textAnchor="end" className="dg-lab">up to {maxIn.toFixed(2)} in</text>
      <text x="2" y={M0 - 8} className="dg-cap">Wind and gusts (mph)</text>
      <line x1={X0} x2={X1} y1={M1} y2={M1} className="dg-grid h" /><line x1={X0} x2={X1} y1={M0} y2={M0} className="dg-grid h" />
      <text x={X0 - 4} y={M0 + 3} textAnchor="end" className="dg-lab">{Math.round(maxW)}</text><text x={X0 - 4} y={M1 + 3} textAnchor="end" className="dg-lab">0</text>
      <path d={gust} className="dg-gust" /><path d={wind} className="dg-wind" />
      {sel && <g><line x1={xOf(sel.hour)} x2={xOf(sel.hour)} y1={T0 - 6} y2={M1} className="dg-cursor" /><circle cx={xOf(sel.hour)} cy={yT(sel.temp)} r="5" fill={tempColour(sel.temp)} className="dg-dot" /><circle cx={xOf(sel.hour)} cy={yW(sel.wind)} r="4" className="dg-wdot" /></g>}
    </svg>
  )
}
