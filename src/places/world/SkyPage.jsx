import { useMemo, useRef, useState } from 'react'
import SunCalc from 'suncalc'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { navigate } from '../../lib/router.js'
import { useNow } from '../../lib/useNow.js'
import { useWeather, useAir } from '../../lib/useWeather.js'
import { todayAt, WEEKDAYS } from '../../lib/cal/dates.js'
import { HOME_TOWN, COMPASS, moonLitPath, moonName, FULL_MOON_NAMES } from '../../lib/sky.js'
import { SKY_KEYS, yearSeries, seasonMarks, skyValue, clockWords, lengthWordsMin, shadowWords, shadowThroughDay, moonMonth, nextMoons, lightBands, noonOf } from '../../lib/skyYear.js'
import { AQI_BANDS, aqiBand, stargazing } from '../../lib/weather.js'

// /world/sky/<key>: a figure from the sky card opened up: its story through
// the whole year as a graph to touch, today against yesterday, and what it
// means. All of it worked out on the device from home's town position.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (date) => `${MON[+date.slice(5, 7) - 1]} ${+date.slice(8, 10)}`
const longDate = (date) => { const d = new Date(date + 'T12:00:00Z'); return `${WEEKDAYS[d.getUTCDay()].slice(0, 3)}, ${shortDate(date)}` }
const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const TABS = ['sunrise', 'golden', 'sunset', 'lastlight', 'daylight', 'shadow', 'moon', 'air']
const AIR = { name: 'Air quality', colour: '#3E9B5A', blurb: 'What’s in the air we’re breathing' }

export default function SkyPage({ k }) {
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const meta = k === 'air' ? AIR : SKY_KEYS[k]
  if (!meta) return <header className="hero span-6"><Crumb to="/world">World</Crumb><h1 className="greet">Not in the sky</h1></header>
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/world">World</Crumb>
        <span className="kicker">The sky · {meta.blurb}</span>
        <h1 className="greet">{meta.name}</h1>
        <nav className="sk-tabs" aria-label="The sky">
          {TABS.map((t) => <Link key={t} to={`/world/sky/${t}`} aria-current={t === k ? 'page' : undefined} style={{ '--c': (t === 'air' ? AIR : SKY_KEYS[t]).colour }}>{(t === 'air' ? AIR : SKY_KEYS[t]).name}</Link>)}
        </nav>
      </header>
      <LightBar today={today} now={now} />
      {k === 'moon' ? <MoonPage today={today} now={now} /> : k === 'air' ? <AirPage /> : <YearPage k={k} meta={meta} today={today} now={now} />}
    </>
  )
}

/** Today's light as one coloured bar, night to night, with the hour you're in marked. */
function LightBar({ today, now }) {
  const bands = lightBands(today)
  const mins = useMemo(() => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value])); return +p.hour * 60 + +p.minute }, [now])
  if (!bands.length) return null
  return (
    <Card tint="#F2A33A" label="Today’s light" glyph="sunmoon" className="span-6">
      <div className="lb" role="img" aria-label="Today's light, from night to night">
        {bands.map((b) => <i key={b.key} style={{ left: `${(b.from / 1440) * 100}%`, width: `${((b.to - b.from) / 1440) * 100}%`, background: b.colour }} title={`${b.name}: ${clockWords(b.from)} to ${clockWords(b.to)}`} />)}
        <b className="lb-now" style={{ left: `${(mins / 1440) * 100}%` }} />
      </div>
      <ul className="lb-key">{bands.filter((b, i) => b.name !== 'Night' || i === 0).map((b) => <li key={b.key}><i style={{ background: b.colour }} />{b.name} <span className="fig">{clockWords(b.from)}</span></li>)}</ul>
    </Card>
  )
}

/** A year of one figure as a graph to touch: its curve, the seasons marked, today's dot. */
function YearGraph({ series, colour, format, today, marks, deltaWords, unit }) {
  const svg = useRef(null)
  const idxToday = Math.max(0, series.findIndex((s) => s.date === today))
  const [i, setI] = useState(idxToday)
  const vals = series.map((s) => s.value).filter((v) => v != null)
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.12 || 1
  const W = 360, H = 190, L = 38, R = 350, T = 16, B = 164
  const x = (n) => L + (n / (series.length - 1)) * (R - L), y = (v) => B - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (B - T)
  const pts = series.map((s, n) => (s.value == null ? null : [x(n), y(s.value)])).filter(Boolean)
  const line = pts.map(([a, b], n) => `${n ? 'L' : 'M'}${a.toFixed(1)} ${b.toFixed(1)}`).join('')
  const area = `${line}L${pts[pts.length - 1][0].toFixed(1)} ${B}L${pts[0][0].toFixed(1)} ${B}Z`
  const ticks = [0, 1, 2, 3].map((q) => lo + ((hi - lo) * q) / 3)
  const read = (e) => {
    const el = svg.current; if (!el) return
    const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(el.getScreenCTM().inverse())
    setI(Math.max(0, Math.min(series.length - 1, Math.round(((p.x - L) / (R - L)) * (series.length - 1)))))
  }
  const cur = series[i], prev = series[i - 1]
  const mid = (m) => { const first = series.findIndex((s) => s.date.slice(5, 7) === String(m + 1).padStart(2, '0')); return first < 0 ? null : x(first + 14) }
  return (
    <div className="yg">
      <div className="yg-read" aria-live="polite">
        <b>{longDate(cur.date)}{cur.date === today ? ' · today' : ''}</b>
        <span className="yg-val fig" style={{ color: colour }}>{format(cur.value)}</span>
        {prev && prev.value != null && cur.value != null && <small>{deltaWords(cur.value - prev.value)}</small>}
      </div>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${unit} through the year`} className="yg-svg"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); read(e) }} onPointerMove={(e) => { if (e.buttons || e.pointerType === 'mouse') read(e) }}>
        <defs><linearGradient id="yg-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={colour} stopOpacity=".5" /><stop offset="1" stopColor={colour} stopOpacity=".05" /></linearGradient></defs>
        {ticks.map((v) => <g key={v}><line x1={L} x2={R} y1={y(v)} y2={y(v)} className="yg-grid" /><text x={L - 4} y={y(v) + 3} textAnchor="end" className="yg-lab">{format(v, true)}</text></g>)}
        {marks.map((m) => { const n = series.findIndex((s) => s.date === m.date); return n < 0 ? null : <g key={m.key}><line x1={x(n)} x2={x(n)} y1={T} y2={B} className="yg-mark" /><text x={x(n)} y={T - 4} textAnchor="middle" className="yg-lab">{m.name.replace('Spring equinox', 'Spring').replace('Autumn equinox', 'Autumn').replace('Longest day', 'Longest').replace('Shortest day', 'Shortest')}</text></g> })}
        <path d={area} fill="url(#yg-fill)" /><path d={line} fill="none" stroke={colour} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        {MON.map((m, q) => mid(q) != null && <text key={m} x={mid(q)} y="182" textAnchor="middle" className="yg-lab">{m[0]}</text>)}
        {idxToday !== i && series[idxToday].value != null && <circle cx={x(idxToday)} cy={y(series[idxToday].value)} r="3.4" fill="none" stroke={colour} strokeWidth="1.6" />}
        {cur.value != null && <g><line x1={x(i)} x2={x(i)} y1={T} y2={B} className="yg-cursor" /><circle cx={x(i)} cy={y(cur.value)} r="5.5" fill={colour} stroke="var(--card)" strokeWidth="2" /></g>}
      </svg>
      <div className="yg-step"><button type="button" onClick={() => setI(Math.max(0, i - 7))}>‹ Week</button><button type="button" onClick={() => setI(idxToday)}>Today</button><button type="button" onClick={() => setI(Math.min(series.length - 1, i + 7))}>Week ›</button></div>
    </div>
  )
}

const secWords = (min, word) => { const s = Math.round(Math.abs(min) * 60); if (s < 5) return 'About the same as yesterday'; return `${s >= 60 ? `${Math.floor(s / 60)} min ` : ''}${s % 60 ? `${s % 60} s ` : ''}${word} than yesterday`.replace('  ', ' ') }

const STORY = {
  sunrise: 'The sun rises latest in early January, not on the shortest day: the earth’s speed round the sun changes through the year, so the clock and the sun drift apart a little, and sunrise and sunset don’t turn at the same moment as the solstice.',
  sunset: 'Sunset is earliest in early December, weeks before the shortest day. The evenings start to grow back before the mornings do.',
  golden: 'Golden hour is when the sun is within about six degrees of the horizon: the light travels through more air, loses its blue and turns warm and long. Photographers and Laurie’s paintings love it.',
  lastlight: 'Last light is when the sun is six degrees below the horizon and the sky has gone from glow to dark. After it, only the brightest stars and planets come out at first.',
  daylight: 'The days are longest at the June solstice and shortest in December. At home they swing by more than four hours across the year, and change fastest around the equinoxes, in March and September.',
  shadow: 'Your noon shadow is shortest in June, when the sun stands highest, and longest in December. The shadow is always shortest at the sun’s highest, local solar noon, which at home is about 12:50 PM in the summer and 11:50 AM in winter.',
}

function YearPage({ k, meta, today, now }) {
  const year = +today.slice(0, 4)
  const series = useMemo(() => yearSeries(k, year), [k, year])
  const marks = useMemo(() => seasonMarks(year), [year])
  const unit = meta.unit
  const format = (v, short) => (v == null ? '—' : unit === 'time' ? (short ? clockWords(v).replace(':00', '').replace(' AM', 'a').replace(' PM', 'p') : clockWords(v)) : unit === 'length' ? (short ? `${Math.floor(v / 60)}h` : lengthWordsMin(v)) : short ? `${v.toFixed(1)}×` : shadowWords(v))
  const deltaWords = (d) => (unit === 'time' && Math.abs(d) > 30 ? 'The clocks changed (daylight saving), so it jumps by an hour' : unit === 'time' ? secWords(d, d > 0 ? 'later' : 'earlier') : unit === 'length' ? secWords(d, d > 0 ? 'more daylight' : 'less daylight') : Math.abs(d) < 0.005 ? 'About the same as yesterday' : `${d > 0 ? 'Longer' : 'Shorter'} than yesterday`)
  const vals = series.filter((s) => s.value != null)
  const best = (f) => vals.reduce((a, b) => (f(b.value, a.value) ? b : a))
  const early = best((a, b) => a < b), late = best((a, b) => a > b)
  const t = series.find((s) => s.date === today), y = series.find((s) => s.date === addDays(today, -1)), w = series.find((s) => s.date === addDays(today, 7))
  return (
    <>
      <Card tint={meta.colour} label={`${meta.name} through ${year}`} glyph="sunmoon" className="span-6">
        <YearGraph series={series} colour={meta.colour} format={format} today={today} marks={marks} deltaWords={deltaWords} unit={meta.name} />
        <p className="muted small">Touch or slide along the year to read any day. Dashed lines mark the equinoxes and solstices.</p>
      </Card>
      <Card tint={meta.colour} label="Today" glyph="sunmoon" className="span-3">
        <b className="sk-big fig" style={{ color: meta.colour }}>{format(t.value)}</b>
        {y && <p>{deltaWords(t.value - y.value)}{Math.abs(t.value - y.value) > 30 && unit === 'time' ? '.' : '.'}</p>}
        {w && <p className="muted">A week from now: <b className="fig">{format(w.value)}</b></p>}
        <dl className="place-facts">
          <div><dt>{unit === 'time' ? 'Earliest' : unit === 'length' ? 'Shortest' : 'Shortest'}</dt><dd><Link to={`/world/day/${early.date}`} className="dp-link">{shortDate(early.date)}</Link> · <span className="fig">{format(early.value)}</span></dd></div>
          <div><dt>{unit === 'time' ? 'Latest' : unit === 'length' ? 'Longest' : 'Longest'}</dt><dd><Link to={`/world/day/${late.date}`} className="dp-link">{shortDate(late.date)}</Link> · <span className="fig">{format(late.value)}</span></dd></div>
        </dl>
      </Card>
      <Card tint={meta.colour} label="What it means" glyph="star" className="span-3">
        <p>{STORY[k]}</p>
        {k === 'shadow' && <ShadowDay today={today} now={now} />}
        <p className="muted small">Worked out on this device from the sun’s position over Fontana (SunCalc), so it needs no connection.</p>
      </Card>
    </>
  )
}

/** Your shadow through today: its length by the hour, with the direction it points. */
function ShadowDay({ today, now }) {
  const day = useMemo(() => shadowThroughDay(today), [today])
  const [sel, setSel] = useState(null)
  const svg = useRef(null)
  if (day.length < 3) return null
  const cap = 6, W = 320, H = 120, L = 28, R = 312, T = 10, B = 100
  const x = (m) => L + ((m - day[0].minute) / (day[day.length - 1].minute - day[0].minute)) * (R - L), y = (r) => B - (Math.min(cap, r) / cap) * (B - T)
  const nowMin = (() => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now).map((q) => [q.type, q.value])); return +p.hour * 60 + +p.minute })()
  const cur = sel || day.reduce((a, b) => (Math.abs(b.minute - nowMin) < Math.abs(a.minute - nowMin) ? b : a))
  const read = (e) => { const el = svg.current; if (!el) return; const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(el.getScreenCTM().inverse()); const m = day[0].minute + ((p.x - L) / (R - L)) * (day[day.length - 1].minute - day[0].minute); setSel(day.reduce((a, b) => (Math.abs(b.minute - m) < Math.abs(a.minute - m) ? b : a))) }
  const path = day.map((d, i) => `${i ? 'L' : 'M'}${x(d.minute).toFixed(1)} ${y(d.ratio).toFixed(1)}`).join('')
  const dir = COMPASS[Math.round(cur.bearing / 45) % 8]
  return (
    <div className="sk-shadow">
      <b>Your shadow today</b>
      <p aria-live="polite">At <b className="fig">{clockWords(cur.minute)}</b> it’s <b>{shadowWords(cur.ratio)}</b>, pointing {dir}.</p>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="yg-svg" role="img" aria-label="Your shadow's length through today" onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); read(e) }} onPointerMove={(e) => { if (e.buttons || e.pointerType === 'mouse') read(e) }}>
        <line x1={L} x2={R} y1={y(1)} y2={y(1)} className="yg-mark" /><text x={L - 3} y={y(1) + 3} textAnchor="end" className="yg-lab">you</text>
        <path d={path} fill="none" stroke="#6B4A8E" strokeWidth="2.6" strokeLinecap="round" /><circle cx={x(cur.minute)} cy={y(cur.ratio)} r="5" fill="#6B4A8E" stroke="var(--card)" strokeWidth="2" />
        <text x={L} y="116" className="yg-lab">{clockWords(day[0].minute)}</text><text x={R} y="116" textAnchor="end" className="yg-lab">{clockWords(day[day.length - 1].minute)}</text>
      </svg>
    </div>
  )
}

function MoonDisc({ phase, fraction, size = 40 }) {
  return (
    <svg viewBox="-20 -20 40 40" width={size} height={size} aria-hidden="true">
      <circle r="18" fill="#3A3552" /><g transform={phase < 0.5 ? '' : 'scale(-1 1)'}><path d={moonLitPath(fraction, 18)} fill="#F2E9C9" /></g>
    </svg>
  )
}

function MoonPage({ today, now }) {
  const month = useMemo(() => moonMonth(today, 35), [today])
  const nx = useMemo(() => nextMoons(today), [today])
  const [sel, setSel] = useState(0)
  const m = month[sel]
  const { forecast: f } = useWeather()
  const nine = f && f.timeline.find((h) => h.date === today && h.hour === 21)
  const star = nine && nine.clouds ? stargazing(Math.max(nine.clouds.low, nine.clouds.mid ?? 0, nine.clouds.high ?? 0), month[0].fraction) : null
  const pos = SunCalc.getMoonPosition(now, HOME_TOWN.lat, HOME_TOWN.lng)
  const up = pos.altitude > 0.02
  const fullMonth = nx.full ? +nx.full.slice(5, 7) - 1 : null
  const W = 340, H = 90, L = 8, R = 332
  const cx = (i) => L + (i / (month.length - 1)) * (R - L), cy = (v) => 80 - v * 66
  const curve = month.map((d, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)} ${cy(d.fraction).toFixed(1)}`).join('')
  return (
    <>
      <Card tint="#6C7FB8" label="The month ahead" glyph="sunmoon" className="span-6">
        <div className="mp-now">
          <MoonDisc phase={month[0].phase} fraction={month[0].fraction} size={72} />
          <div><b>{moonName(month[0].phase)}</b><p>{Math.round(month[0].fraction * 100)}% lit · {up ? 'up now' : 'below the horizon'}</p>
            {nx.full && <p><Link to={`/world/day/${nx.full}`} className="dp-link">Full {shortDate(nx.full)}</Link>, the {FULL_MOON_NAMES[fullMonth]} Moon{nx.new ? <> · <Link to={`/world/day/${nx.new}`} className="dp-link">New {shortDate(nx.new)}</Link></> : null}</p>}</div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="yg-svg" role="img" aria-label="How much of the moon is lit, day by day">
          <defs><linearGradient id="mp-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6C7FB8" stopOpacity=".5" /><stop offset="1" stopColor="#6C7FB8" stopOpacity=".05" /></linearGradient></defs>
          <path d={`${curve}L${cx(month.length - 1)} 80L${cx(0)} 80Z`} fill="url(#mp-fill)" /><path d={curve} fill="none" stroke="#6C7FB8" strokeWidth="2.4" />
          <circle cx={cx(sel)} cy={cy(m.fraction)} r="5" fill="#6C7FB8" stroke="var(--card)" strokeWidth="2" />
        </svg>
        <ol className="mp-grid">
          {month.map((d, i) => (
            <li key={d.date}><button type="button" aria-pressed={i === sel} onClick={() => setSel(i)} aria-label={`${longDate(d.date)}: ${moonName(d.phase)}, ${Math.round(d.fraction * 100)} percent lit`}>
              <MoonDisc phase={d.phase} fraction={d.fraction} size={34} /><small>{+d.date.slice(8, 10)}</small></button></li>
          ))}
        </ol>
      </Card>
      <Card tint="#6C7FB8" label={longDate(m.date)} glyph="sunmoon" className="span-3">
        <div className="mp-now"><MoonDisc phase={m.phase} fraction={m.fraction} size={64} /><div><b>{moonName(m.phase)}</b><p>{Math.round(m.fraction * 100)}% lit</p></div></div>
        <dl className="place-facts"><div><dt>Rises</dt><dd className="fig">{clockWords(m.rise)}</dd></div><div><dt>Sets</dt><dd className="fig">{clockWords(m.set)}</dd></div></dl>
        <Link className="btn ghost" to={`/world/day/${m.date}`}>That day’s weather ›</Link>
      </Card>
      <Card tint="#6C7FB8" label="Tonight’s stars" glyph="star" className="span-3">
        {star ? <><b className="sk-big" style={{ fontSize: 26 }}>{{ dazzling: 'Dazzling', good: 'Good', 'so-so': 'Patchy', poor: 'Clouded over' }[star.grade]}</b><p>{star.words}</p></> : <p className="muted">The clouds for tonight aren’t known yet.</p>}
        <p className="muted small">From the forecast’s clouds at nine and how much of the moon is lit: a guess, not a promise.</p>
      </Card>
    </>
  )
}

function AirPage() {
  const { air, error } = useAir()
  const hours = air ? air.hours : []
  const W = 340, H = 140, L = 30, R = 332
  const max = Math.max(150, ...hours.map((h) => h.aqi))
  const x = (i) => L + (i / Math.max(1, hours.length - 1)) * (R - L), y = (v) => 118 - (v / max) * 100
  const nowAt = air && hours.findIndex((h) => h.time.slice(0, 13) === new Intl.DateTimeFormat('sv-SE', { timeZone: HOME_TOWN.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' }).format(new Date()).replace(' ', 'T'))
  return (
    <>
      <Card tint="#3E9B5A" label="The air right now" glyph="weather" className="span-3">
        {!air && <p className="muted">{error || 'Checking the air…'}</p>}
        {air && (
          <>
            <b className="sk-big fig" style={{ color: air.band.colour }}>{air.now}</b>
            <p><b>{air.band.name}</b></p>
            <div className="aq-scale" role="img" aria-label="The air quality scale">
              {AQI_BANDS.map((b, i) => <i key={b.name} style={{ background: b.colour, flex: (b.max === Infinity ? 100 : b.max) - (AQI_BANDS[i - 1] ? AQI_BANDS[i - 1].max : 0) }} title={b.name} />)}
              <b className="aq-mark" style={{ left: `${Math.min(100, (air.now / 300) * 100)}%` }} />
            </div>
            <dl className="place-facts">
              {air.pm25 != null && <div><dt>Fine dust</dt><dd className="fig">{Math.round(air.pm25)} µg/m³</dd></div>}
              {air.ozone != null && <div><dt>Ozone</dt><dd className="fig">{Math.round(air.ozone)} µg/m³</dd></div>}
            </dl>
          </>
        )}
      </Card>
      <Card tint="#3E9B5A" label="Yesterday, today and tomorrow" glyph="weather" className="span-3">
        {hours.length > 3 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="yg-svg" role="img" aria-label="Air quality by the hour">
            {AQI_BANDS.slice(0, 5).map((b, i) => { const lo = AQI_BANDS[i - 1] ? AQI_BANDS[i - 1].max : 0; return lo < max ? <rect key={b.name} x={L} width={R - L} y={y(Math.min(max, b.max))} height={y(lo) - y(Math.min(max, b.max))} fill={b.colour} opacity=".16" /> : null })}
            <path d={hours.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(h.aqi).toFixed(1)}`).join('')} fill="none" stroke="#2B2019" strokeWidth="2.2" strokeLinejoin="round" className="aq-line" />
            {nowAt >= 0 && <line x1={x(nowAt)} x2={x(nowAt)} y1="10" y2="118" className="yg-cursor" />}
            {[50, 100, 150].map((v) => <text key={v} x={L - 4} y={y(v) + 3} textAnchor="end" className="yg-lab">{v}</text>)}
          </svg>
        ) : <p className="muted">{error || '…'}</p>}
        <p className="muted small">The US Air Quality Index, by the hour. The line marks now.</p>
      </Card>
      <Card tint="#3E9B5A" label="What the numbers mean" glyph="star" className="span-6">
        <ul className="aq-list">
          {AQI_BANDS.map((b, i) => <li key={b.name} style={{ '--c': b.colour }}><b>{AQI_BANDS[i - 1] ? AQI_BANDS[i - 1].max + 1 : 0}{b.max === Infinity ? '+' : `–${b.max}`} · {b.name}</b><span>{['A good day for everything outside.', 'Fine for most; the very sensitive may notice.', 'Children, older people and anyone with asthma should take it easy outdoors: shorter recess, more rest.', 'Everyone should cut back hard exertion outside. Recess indoors.', 'Stay in; keep windows shut.', 'Stay in. An emergency level.'][i]}</span></li>)}
        </ul>
        <p className="muted small">From Open-Meteo’s air quality model (CAMS), for Fontana’s town centre. Each school’s page uses it for its recess flag.</p>
      </Card>
    </>
  )
}
