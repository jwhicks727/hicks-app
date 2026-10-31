import SkyToday from '../parts/SkyToday.jsx'
import Coming from '../parts/Coming.jsx'
import { WeatherNow, WeatherWeek } from '../parts/WeatherCard.jsx'

export default function World() {
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Our world · Fontana</span>
        <h1 className="greet">World</h1>
      </header>
      <WeatherNow more={false} />
      <WeatherWeek />
      <SkyToday />
      <Coming tint="#3BA3A8" glyph="weather" title="Weather in depth, next" items={[
        'Home and each school from its own station, through Synoptic',
        'Wound back to what happened as well as forward',
        'A page for each school: right now, the last 24 hours against home, recess flags',
        'One other place a day, in its own sky, with all our places a tap away',
        'Alerts for each school as well as home',
      ]} />
    </>
  )
}
