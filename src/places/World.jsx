import SkyToday from '../parts/SkyToday.jsx'
import Coming from '../parts/Coming.jsx'

export default function World() {
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Our world · Fontana</span>
        <h1 className="greet">World</h1>
      </header>
      <SkyToday />
      <Coming tint="#3BA3A8" glyph="weather" title="Weather in depth" items={[
        'Home and each school from its own station, through Synoptic',
        'Day by day and hour by hour, wound back to what happened as well as forward',
        'A page for each school: right now, the last 24 hours against home, recess flags',
        'One other place a day, in its own sky, with all our places a tap away',
        'Alerts from the National Weather Service for home and the three schools',
      ]} />
    </>
  )
}
