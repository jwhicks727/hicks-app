import SunCalc from 'suncalc'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { navigate } from '../../lib/router.js'
import { useNow } from '../../lib/useNow.js'
import { usePlaceWeather } from '../../lib/useWeather.js'
import { PLACES, placeBySlug, mapsLinks, distanceWords, aheadWords, milesBetween } from '../../lib/places.js'
import { HOME_TOWN } from '../../lib/sky.js'
import WeatherIcon from '../../parts/WeatherIcon.jsx'
import Scene, { placeSky } from './Scene.jsx'
import StationCard from '../../parts/StationCard.jsx'
import SchoolPanel from './SchoolPanel.jsx'

// /world/place/<slug>: one of our places in its own sky right now, how far it
// is and what time it is there, and the way to it in this phone's maps app.
// Stepping to the next place replaces the address rather than adding a step.

const fmt = (tz, o) => new Intl.DateTimeFormat('en-US', { timeZone: tz, ...o })

export default function PlacePage({ slug }) {
  const now = useNow()
  const place = placeBySlug(slug)
  const wx = usePlaceWeather(place)
  if (!place) {
    return (
      <header className="hero span-6">
        <Crumb to="/world">World</Crumb>
        <h1 className="greet">Not one of our places</h1>
        <p className="eyebrow">This address doesn’t name a place on the map.</p>
      </header>
    )
  }
  const i = PLACES.indexOf(place), prev = PLACES[(i + PLACES.length - 1) % PLACES.length], next = PLACES[(i + 1) % PLACES.length]
  const links = mapsLinks(place, typeof navigator === 'undefined' ? '' : navigator.userAgent)
  const t = SunCalc.getTimes(now, place.lat, place.lng)
  const { dark } = placeSky(place, now)
  const hm = fmt(place.tz, { hour: 'numeric', minute: '2-digit' })
  const away = place.tz !== HOME_TOWN.tz
  const w = wx.now
  const ext = (href) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/world">World</Crumb>
        <span className="kicker">{place.region || place.town}</span>
        <h1 className="greet">{place.name}</h1>
      </header>
      <article className="card span-6 place-card" style={{ '--tint': place.colour }}>
        <Scene place={place} now={now} pic={w && w.pic} />
        <div className={'place-now' + (dark ? ' dark' : '')}>
          <span className="place-clock fig">{hm.format(now)}</span>
          <span className="place-day">{fmt(place.tz, { weekday: 'long' }).format(now)}{away || place.home ? '' : ', the same as home'}</span>
          {w && <span className="place-wx"><WeatherIcon pic={w.pic} size={26} /><span className="fig">{w.temp}°</span> {w.words}</span>}
        </div>
      </article>
      <Card className="span-3" tint={place.colour} label="There and back" glyph="star">
        <p className="place-line">{place.line}</p>
        <dl className="place-facts">
          {!place.home && <div><dt>How far</dt><dd>{distanceWords(place)}</dd></div>}
          {away && <div><dt>The time</dt><dd>{aheadWords(place.tz, now)}</dd></div>}
          <div><dt>Sunrise</dt><dd className="fig">{hm.format(t.sunrise)}</dd></div>
          <div><dt>Sunset</dt><dd className="fig">{hm.format(t.sunset)}</dd></div>
          {w && w.high != null && <div><dt>Today there</dt><dd><span className="fig">{w.high}°</span> and <span className="fig">{w.low}°</span></dd></div>}
          {!w && wx.error && <div><dt>Weather</dt><dd className="muted">{wx.error}</dd></div>}
        </dl>
        {links && (
          <div className="place-go">
            <a className="btn" href={links.open} {...ext(links.open)}>Open in {links.app}</a>
            <a className="btn ghost" href={links.directions} {...ext(links.directions)}>Directions</a>
          </div>
        )}
      </Card>
      {['kordyak', 'ruble', 'soar'].includes(place.slug) && <SchoolPanel place={place} />}
      {['kordyak', 'ruble', 'soar'].includes(place.slug) && <StationCard place={place} />}
      {place.home ? <FromHome now={now} /> : (
        <Card className="span-3" tint={place.colour} label="Our other places" glyph="star">
          <nav className="place-step" aria-label="Our other places">
            <a href={'/world/place/' + prev.slug} onClick={(e) => { e.preventDefault(); navigate('/world/place/' + prev.slug, { replace: true }) }}><i style={{ background: prev.colour }} />‹ {prev.name}</a>
            <a href={'/world/place/' + next.slug} onClick={(e) => { e.preventDefault(); navigate('/world/place/' + next.slug, { replace: true }) }}>{next.name} ›<i style={{ background: next.colour }} /></a>
          </nav>
          <Link className="place-all" to="/world">All our places on the map</Link>
        </Card>
      )}
    </>
  )
}

/** Home's own card: everywhere else, measured from here. */
function FromHome({ now }) {
  const rest = PLACES.filter((p) => !p.home).map((p) => ({ p, mi: p.town === 'Fontana' ? 0 : milesBetween(HOME_TOWN, p) })).sort((a, b) => a.mi - b.mi)
  return (
    <Card className="span-3" tint="#D4553A" label="From home" glyph="star">
      <ul className="pm-list">
        {rest.map(({ p, mi }) => (
          <li key={p.slug}>
            <a href={'/world/place/' + p.slug} onClick={(e) => { e.preventDefault(); navigate('/world/place/' + p.slug, { replace: true }) }}>
              <i style={{ background: p.colour }} />
              <span><b>{p.name}</b><small>{p.tz === HOME_TOWN.tz ? (p.town !== p.name ? p.town : p.region) : fmt(p.tz, { hour: 'numeric', minute: '2-digit' }).format(now) + ' there'}</small></span>
              <em className="fig">{mi ? `${(mi < 100 ? Math.round(mi) : Math.round(mi / 10) * 10).toLocaleString('en-US')} mi` : 'In town'}</em>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  )
}
