import SkyToday from '../parts/SkyToday.jsx'
import Coming from '../parts/Coming.jsx'
import { WeatherNow, WeatherWeek } from '../parts/WeatherCard.jsx'
import WildNow from '../parts/WildNow.jsx'
import { useNow } from '../lib/useNow.js'
import { todayAt } from '../lib/cal/dates.js'
import PlaceOfDay from './world/PlaceOfDay.jsx'
import PlacesMap from './world/PlacesMap.jsx'
import PlacePage from './world/PlacePage.jsx'
import './world/world.css'

// /world                 today's place and its weather, home's weather, the sky, and all our places on a map (last)
// /world/place/<slug>    one of our places (src/lib/places.js)
export default function World({ rest = [] }) {
  const now = useNow()
  const today = todayAt('America/Los_Angeles', now)
  if (rest[0] === 'place') return <PlacePage slug={rest[1]} />
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Our world · Fontana</span>
        <h1 className="greet">World</h1>
      </header>
      <PlaceOfDay today={today} now={now} />
      <WeatherNow more={false} />
      <WeatherWeek />
      <SkyToday />
      <WildNow date={today} />
      <Coming tint="#3BA3A8" glyph="weather" title="Weather in depth, next" items={[
        'Home and each school from its own station, through Synoptic',
        'Wound back to what happened as well as forward',
        'A page for each school: right now, the last 24 hours against home, recess flags',
        'Alerts for each school as well as home',
      ]} />
      <PlacesMap />
    </>
  )
}
