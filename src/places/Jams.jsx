import Coming from '../parts/Coming.jsx'
import OnThisDay from '../parts/OnThisDay.jsx'
import { todayAt } from '../lib/cal/dates.js'
import { useNow } from '../lib/useNow.js'
import { Crumb } from '../shell/Link.jsx'

export default function Jams() {
  const today = todayAt('America/Los_Angeles', useNow())
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/us">Us</Crumb>
        <span className="kicker">Jam bands first</span>
        <h1 className="greet">Jams</h1>
      </header>
      <OnThisDay today={today} />
      <Coming tint="#8A5BC4" glyph="music" className="span-3" title="Our music" items={[
        'Jam-scene shows near us, found online and added to the calendar',
        'Free live recordings from the Internet Archive, played right here',
        'Chill and relaxing music from free sources, in the same player',
        'Jason’s jam bands, Anna’s favourite bands and Laurie’s favourite Christian artists, each celebrated',
      ]} />
    </>
  )
}
