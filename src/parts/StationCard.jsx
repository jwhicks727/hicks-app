import { Card } from '../ui/Card.jsx'
import { useStations } from '../lib/useOutside.js'
import { besideHome, readAgo, seriesRange, mesowestUrl } from '../lib/stationWords.js'
import { fromDirection } from '../lib/weather.js'

const hm = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric' })
const W = 320, H = 120, PAD = 22

/** The day's temperatures at a school and at home, side by side (a viewBox chart, width 100%). */
function DayChart({ school, home, colour }) {
  const lists = [school, home].filter((l) => l && l.length > 1)
  if (!lists.length) return null
  const [lo, hi] = seriesRange(lists)
  const t0 = Math.min(...lists.map((l) => l[0].at)), t1 = Math.max(...lists.map((l) => l[l.length - 1].at))
  const x = (at) => PAD + ((at - t0) / Math.max(1, t1 - t0)) * (W - PAD - 8), y = (t) => 8 + (1 - (t - lo) / Math.max(1, hi - lo)) * (H - 26)
  const line = (l) => l.map((p, i) => `${i ? 'L' : 'M'}${x(p.at).toFixed(1)} ${y(p.temp).toFixed(1)}`).join('')
  const ticks = [0, 1, 2, 3].map((k) => t0 + (k * (t1 - t0)) / 3)
  return (
    <figure className="st-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" role="img" aria-label="The last day’s temperatures, here and at home">
        {[lo, hi].map((t) => <g key={t}><line x1={PAD} x2={W - 8} y1={y(t)} y2={y(t)} className="st-grid" /><text x={PAD - 4} y={y(t) + 3.5} className="st-axis" textAnchor="end">{t}°</text></g>)}
        {ticks.map((at) => <text key={at} x={x(at)} y={H - 4} className="st-axis" textAnchor="middle">{hm.format(new Date(at))}</text>)}
        {home && home.length > 1 && <path d={line(home)} className="st-home" />}
        {school && school.length > 1 && <path d={line(school)} className="st-school" style={{ stroke: colour }} />}
      </svg>
      <figcaption><i style={{ background: colour }} /> Here <i className="st-home-key" /> Home</figcaption>
    </figure>
  )
}

/** A school's own station, right now and over the last day, beside home's. */
export default function StationCard({ place }) {
  const st = useStations()
  if (!st) return null
  if (st.error) {
    return (
      <Card className="span-3" tint={place.colour} label="Its own station" glyph="weather">
        <p className="muted">{st.error === 'setup' ? 'The school’s own weather station shows here once Synoptic’s token is in (docs/MORNING.md).' : 'The stations couldn’t be reached just now.'}</p>
      </Card>
    )
  }
  const p = st.places && st.places[place.slug], home = st.places && st.places.home
  if (!p || !p.latest) {
    return (
      <Card className="span-3" tint={place.colour} label="Its own station" glyph="weather">
        <p className="muted">Its station hasn’t reported today, and neither has the airport that stands in for it.</p>
      </Card>
    )
  }
  const l = p.latest, now = Date.now()
  return (
    <Card className="span-3 station-card" tint={place.colour} label="Its own station" glyph="weather" tag={p.stid}>
      <div className="st-now">
        <b className="st-temp fig">{Math.round(l.temp)}°</b>
        <span>{home && home.latest ? besideHome(l.temp, home.latest.temp) : ''}<small>{readAgo(l.at, now)}</small></span>
      </div>
      {p.source === 'fallback' && <p className="nudge">{p.ownMissing ? 'Its own station isn’t open to us' : 'Its own station has gone quiet'}, so this is {p.name}.</p>}
      <dl className="place-facts">
        {l.humidity != null && <div><dt>Humidity</dt><dd className="fig">{Math.round(l.humidity)}%</dd></div>}
        {l.wind != null && <div><dt>Wind</dt><dd><span className="fig">{Math.round(l.wind)} mph</span>{l.dir != null && ` from the ${fromDirection(l.dir)}`}{l.gust ? <>, gusts <span className="fig">{Math.round(l.gust)}</span></> : ''}</dd></div>}
        {l.rainToday != null && <div><dt>Rain today</dt><dd className="fig">{l.rainToday.toFixed(2)} in</dd></div>}
      </dl>
      <DayChart school={p.series} home={home && home.series} colour={place.colour} />
      <p className="wx-credit">{p.name} · <a href={mesowestUrl(p.stid)} target="_blank" rel="noopener noreferrer">its page on MesoWest</a> · through <a href="https://synopticdata.com/" target="_blank" rel="noopener noreferrer">Synoptic Data</a></p>
    </Card>
  )
}
