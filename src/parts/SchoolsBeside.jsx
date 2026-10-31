import { Link } from '../shell/Link.jsx'
import { useStations } from '../lib/useOutside.js'
import { besideHome, readAgo } from '../lib/stationWords.js'

const SCHOOLS = [['kordyak', 'Kordyak', 'Laurie'], ['ruble', 'Wayne Ruble', 'Anna'], ['soar', 'SOAR', 'Jason']]

/**
 * Kordyak, Wayne Ruble and SOAR beside home, right now, from our chosen
 * stations. Home is home's own station when Admin has one, else the
 * forecast's now. Nothing until the stations answer: no stand-in numbers.
 */
export default function SchoolsBeside({ homeTemp }) {
  const st = useStations()
  if (!st || st.error) {
    if (st && st.error === 'setup') return <p className="muted small wx-schools-note">The schools’ own stations appear here once Synoptic’s token is in (docs/MORNING.md).</p>
    return null
  }
  const places = st.places || {}
  const home = places.home && places.home.latest ? places.home.latest.temp : homeTemp
  const now = Date.now()
  const shown = SCHOOLS.filter(([k]) => places[k] && places[k].latest)
  if (!shown.length) return null
  return (
    <div className="wx-schools">
      <span className="wx-schools-h">At the schools</span>
      <ul>
        {shown.map(([k, name, who]) => {
          const p = places[k], t = Math.round(p.latest.temp)
          return (
            <li key={k}>
              <Link to={`/world/place/${k}`} className="wx-school">
                <span className="ws-name"><b>{name}</b><small>{who}’s</small></span>
                <b className="ws-temp fig">{t}°</b>
                <small className="ws-vs">{besideHome(p.latest.temp, home)}</small>
                <small className="ws-when">{p.source === 'fallback' ? `${p.stid} airport, its own is quiet` : readAgo(p.latest.at, now)}</small>
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="wx-credit">Stations through <a href="https://synopticdata.com/" target="_blank" rel="noopener noreferrer">Synoptic Data</a></p>
    </div>
  )
}
