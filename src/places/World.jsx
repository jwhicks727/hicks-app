import SkyToday from '../parts/SkyToday.jsx'
import Coming from '../parts/Coming.jsx'
import { WeatherNow, WeatherWeek } from '../parts/WeatherCard.jsx'
import WildNow from '../parts/WildNow.jsx'
import { useNow } from '../lib/useNow.js'
import { todayAt } from '../lib/cal/dates.js'
import PlacesMap from './world/PlacesMap.jsx'
import PlacePage from './world/PlacePage.jsx'
import './world/world.css'

// /world                 the weather, the sky and all our places on a map
// /world/place/<slug>    one of our places (src/lib/places.js)
export default function World({ rest = [] }) {
  const today = todayAt('America/Los_Angeles', useNow())
  if (rest[0] === 'place') return <PlacePage slug={rest[1]} />
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Our world · Fontana</span>
        <h1 className="greet">World</h1>
      </header>
      <PlacesMap />
      <WeatherNow more={false} />
      <WeatherWeek />
      <SkyToday />
      <WildNow date={today} />
      <Coming tint="#3BA3A8" glyph="weather" title="Weather in depth, next" items={[
        'Home and each school from its own station, through Synoptic',
        'Wound back to what happened as well as forward',
        'A page for each school: right now, the last 24 hours against home, recess flags',
        'One of our places on World each day, in turn, in its own sky',
        'Alerts for each school as well as home',
      ]} />
    </>
  )
}
