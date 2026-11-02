import SunCalc from 'suncalc'
import { Link } from '../../shell/Link.jsx'
import { usePlaceForecast, useWeather } from '../../lib/useWeather.js'
import { placeOfDay, distanceWords, aheadWords, milesBetween, minutesAhead } from '../../lib/places.js'
import { placeStory, compassFrom } from '../../lib/placeStory.js'
import { HOME_TOWN } from '../../lib/sky.js'
import WeatherIcon from '../../parts/WeatherIcon.jsx'
import { Credit } from '../../parts/WeatherCard.jsx'
import Scene, { placeSky } from './Scene.jsx'

// World's main weather: one of our places each day, in turn, in its own sky.
// Only places from an hour away outward take a turn (src/lib/places.js), the
// same one on every phone. Home's own weather sits below it.

const fmt = (tz, o) => new Intl.DateTimeFormat('en-US', { timeZone: tz, ...o })

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
        <Credit />
      </article>
    </>
  )
}
