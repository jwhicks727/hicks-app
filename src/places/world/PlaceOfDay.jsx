import SunCalc from 'suncalc'
import { Card } from '../../ui/Card.jsx'
import { Link } from '../../shell/Link.jsx'
import { navigate } from '../../lib/router.js'
import { usePlaceForecast, useWeather } from '../../lib/useWeather.js'
import { placeOfDay, distanceWords, aheadWords, milesBetween, minutesAhead } from '../../lib/places.js'
import { placeStory, compassFrom } from '../../lib/placeStory.js'
import { HOME_TOWN } from '../../lib/sky.js'
import WeatherIcon from '../../parts/WeatherIcon.jsx'
import { HoursList, WeekList, Credit } from '../../parts/WeatherCard.jsx'
import { WEEKDAYS } from '../../lib/cal/dates.js'
import Scene, { placeSky } from './Scene.jsx'

// World's main weather: one of our places each day, in turn, in its own sky.
// Only places from an hour away outward take a turn (src/lib/places.js), the
// same one on every phone. Home's own weather sits below it.

const fmt = (tz, o) => new Intl.DateTimeFormat('en-US', { timeZone: tz, ...o })
const go = (slug) => (e) => { e.preventDefault(); navigate('/world/place/' + slug) }

export default function PlaceOfDay({ today, now }) {
  const place = placeOfDay(today)
  const { forecast: f, error } = usePlaceForecast(place)
  const { forecast: home } = useWeather()
  const { dark } = placeSky(place, now)
  const hm = fmt(place.tz, { hour: 'numeric', minute: '2-digit' })
  const away = place.tz !== HOME_TOWN.tz
  const t = SunCalc.getTimes(now, place.lat, place.lng)
  const sun = now < t.sunrise ? `Sunrise ${hm.format(t.sunrise)}` : now < t.sunset ? `Sunset ${hm.format(t.sunset)}` : `Dark since ${hm.format(t.sunset)}`
  const story = placeStory({ place, f, home, ahead: minutesAhead(place.tz, now), miles: milesBetween(HOME_TOWN, place), direction: compassFrom(HOME_TOWN, place), dark, clock: hm.format(now), sunWords: sun })
  const next = [1, 2, 3].map((n) => placeOfDay(today, n))
  const dayName = (ahead) => (ahead === 1 ? 'Tomorrow' : WEEKDAYS[new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10) + ahead, 12)).getUTCDay()])
  return (
    <>
      <article className="card span-6 place-card place-today" style={{ '--tint': place.colour }}>
        <Scene place={place} now={now} pic={f && f.now.pic} />
        <div className={'place-now' + (dark ? ' dark' : '')}>
          <span className="place-today-k">{story ? story.kicker : `${distanceWords(place)}`}</span>
          <span className="place-day">{place.name}{place.region ? ` · ${place.region}` : ''}</span>
          {f ? (
            <>
              <span className="place-big fig">{f.now.temp}°</span>
              <span className="place-wx"><WeatherIcon pic={f.now.pic} size={26} /> {f.now.words}{f.today && <> · <span className="fig">{f.today.high}°</span> / <span className="fig">{f.today.low}°</span></>}</span>
            </>
          ) : <span className="place-wx">{error || 'Looking at the sky there…'}</span>}
          <span className="place-clock-s fig">{hm.format(now)}{away ? ` · ${aheadWords(place.tz, now)}` : ''}</span>
        </div>
        {story && (
          <div className="place-tale">
            <h2 className="place-headline">{story.headline}</h2>
            {story.lines.map((l, i) => <p key={i}>{l}</p>)}
            {story.line && <p className="place-tale-line">{story.line}.</p>}
            <Link className="place-tale-go" to={'/world/place/' + place.slug}>All about {place.name} ›</Link>
          </div>
        )}
      </article>
      <Card className="span-3" tint={place.colour} label={`Hour by hour in ${place.name}`} glyph="weather">
        {f ? (
          <>
            <p className="muted">Feels like {f.now.feels}° · humidity {f.now.humidity}% · {f.now.wind.line.toLowerCase()}</p>
            <HoursList hours={f.hours} />
            <dl className="place-facts">
              <div><dt>Sunrise</dt><dd className="fig">{hm.format(t.sunrise)}</dd></div>
              <div><dt>Sunset</dt><dd className="fig">{hm.format(t.sunset)}</dd></div>
              <div><dt>How far</dt><dd>{distanceWords(place)}</dd></div>
            </dl>
          </>
        ) : <p className="muted">{error || 'Looking ahead…'}</p>}
        <Link className="btn ghost" to={'/world/place/' + place.slug}>All about {place.name} ›</Link>
      </Card>
      <Card className="span-3" tint={place.colour} label={`The week in ${place.name}`} glyph="weather">
        {f ? <WeekList days={f.days} /> : <p className="muted">{error || 'Looking ahead…'}</p>}
        <nav className="place-next" aria-label="The next places">
          <span>Up next</span>
          {next.map((p, i) => <a key={p.slug} href={'/world/place/' + p.slug} onClick={go(p.slug)}><i style={{ background: p.colour }} />{dayName(i + 1)}: {p.name}</a>)}
        </nav>
        <Credit />
      </Card>
    </>
  )
}
