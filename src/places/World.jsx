import SkyToday from '../parts/SkyToday.jsx'
import { WeatherNow, WeatherWeek } from '../parts/WeatherCard.jsx'
import WildNow from '../parts/WildNow.jsx'
import { useNow } from '../lib/useNow.js'
import { todayAt } from '../lib/cal/dates.js'
import PlaceOfDay from './world/PlaceOfDay.jsx'
import OurPlaces from '../parts/OurPlaces.jsx'
import PlacesMap from './world/PlacesMap.jsx'
import PlacePage from './world/PlacePage.jsx'
import DayPage from './world/DayPage.jsx'
import SkyPage from './world/SkyPage.jsx'
import './world/world.css'

// /world                 today's place and its weather, home's weather, the sky, and all our places on a map (last)
// /world/place/<slug>    one of our places (src/lib/places.js)
export default function World({ rest = [] }) {
  const now = useNow()
  const today = todayAt('America/Los_Angeles', now)
  if (rest[0] === 'place') return <PlacePage slug={rest[1]} />
  if (rest[0] === 'sky') return <SkyPage k={rest[1] || 'sunrise'} />
  if (rest[0] === 'day') return <DayPage date={rest[1] || today} hour={rest[2]} />
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Our world · Fontana</span>
        <h1 className="greet">World</h1>
      </header>
      <WeatherNow more={false} schools={false} />
      <OurPlaces />
      <PlaceOfDay today={today} now={now} />
      <WeatherWeek />
      <SkyToday />
      <WildNow date={today} />
      <PlacesMap />
    </>
  )
}
