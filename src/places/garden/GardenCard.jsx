import { Card } from '../../ui/Card.jsx'
import { Link } from '../../shell/Link.jsx'
import { useSession } from '../../lib/auth.js'
import { useWeather } from '../../lib/useWeather.js'
import { useGarden } from '../../lib/useGarden.js'
import { careToday } from '../../lib/garden.js'
import { CareList } from './Garden.jsx'

/** Home: the garden's jobs today, a tap from being done, and the way in. */
export default function GardenCard({ today, me }) {
  const session = useSession()
  const g = useGarden(session)
  const { forecast } = useWeather()
  if (!session || !g.loaded) return null
  const care = careToday({ spots: g.spots, plants: g.plants, log: g.log, forecast, today })
  return (
    <Card tint="#5F8A4A" label="The Garden" glyph="star" tag={care.length ? `${care.length} today` : undefined} className="span-3 gcard-care">
      {g.areas.length ? <CareList care={care} today={today} me={me} onDone={g.reload} limit={3} /> : <p>Map the yard’s beds, boxes and pots, and the plants inside room by room: what to water when, and a look at any photo.</p>}
      <Link className="btn ghost" to="/garden">{g.areas.length ? 'Open the Garden ›' : 'Start the Garden ›'}</Link>
    </Card>
  )
}
