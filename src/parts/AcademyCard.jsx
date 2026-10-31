import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { useAcademyGlance } from '../academy/useAcademyGlance.js'

// Home: a fresh cheer for Anna, golden, for the whole family to see; and,
// when Anna is the one signed in, her academy's day at a glance.
export default function AcademyCard({ session, me, today }) {
  const anna = Boolean(me && me.role === 'child')
  const g = useAcademyGlance(session, today, anna)
  if (!session || !me || !g.loaded) return null
  return (
    <>
      {g.cheer && (
        <Link to="/academy/fame" className="home-cheer span-6">
          <img src={`/academy/items/${g.cheer.icon || 'glowing-star'}.webp`} alt="" width="48" height="48" />
          <span><small>{anna ? 'Someone cheered you' : 'Three cheers for Anna'}</small><b>{g.cheer.title}</b></span>
        </Link>
      )}
      {anna && (
        <Card tint="#3FA34D" label="Your academy" glyph="star" tag={`${g.stars} ★ this month`} className="span-3">
          <p>{g.todo ? `${g.todo} ${g.todo === 1 ? 'thing' : 'things'} to do today. Each one lights a star.` : 'Nothing due today. Go add a room!'}</p>
          <Link to="/academy" className="btn">To the academy</Link>
        </Card>
      )}
    </>
  )
}
