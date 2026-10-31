import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import IconTile from '../ui/IconTile.jsx'
import { US_PLACES } from '../ui/usPlaces.jsx'
import { useSession } from '../lib/auth.js'
import Journal from './us/Journal.jsx'
import Garden from './us/Garden.jsx'

// /us                 everything that's ours, beyond the four shared tabs
// /us/journal         each person's journal (only its writer reads it)
// /us/garden          the yard and the rooms' plants
// The academy, Life List and Jams keep their own addresses (/academy,
// /lifelist, /jams); the tab bar lights Us while you're in any of them.
// Each has its own line icon and colour (src/ui/usPlaces.jsx).

export default function Us({ rest = [] }) {
  if (rest[0] === 'journal') return <Journal rest={rest.slice(1)} />
  if (rest[0] === 'garden') return <Garden rest={rest.slice(1)} />
  return <UsHome />
}

function UsHome() {
  const session = useSession()
  return (
    <>
      <header className="hero span-6"><span className="kicker">Team Hicks</span><h1 className="greet">Us</h1></header>
      <Card tint="#C0824F" label={session ? 'Everything that’s ours' : 'Sign in to open most of these'} glyph="star" className="span-6">
        <nav className="ours" aria-label="Our places">
          {US_PLACES.filter((p) => !p.signedIn || session).map((p) => (
            <Link key={p.to} to={p.to} className="ours-tile" style={{ '--k1': p.colours[0], '--k2': p.colours[1] }}>
              <IconTile colours={p.colours} size={64}><svg viewBox="0 0 24 24">{p.icon}</svg></IconTile>
              <b>{p.name}</b>
              <span>{p.sub}</span>
            </Link>
          ))}
        </nav>
      </Card>
    </>
  )
}
