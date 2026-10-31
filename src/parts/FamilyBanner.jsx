import { Link } from '../shell/Link.jsx'
import { upcoming } from '../lib/cal/family.js'
import { reducedMotion } from '../lib/motion.js'

const CONFETTI = ['#F03E2F', '#F2C14E', '#5FA85A', '#4A7FD6', '#8A5BC4', '#F08A3C']

/** A family day is celebrated big: the rainbow from two days before; a gentle word on a day we remember. */
export default function FamilyBanner({ today, days }) {
  const next = upcoming(today, days, 6)
  const big = next.find((d) => d.kind !== 'remember' && d.inDays <= 2)
  const gentle = next.find((d) => d.kind === 'remember' && d.inDays === 0)
  return (
    <>
      {big && (
        <Link to={`/calendar/day/${big.date}`} className="celebrate home-celebrate span-6">
          {!reducedMotion() && <span className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--x': `${(i * 5.6 + 2).toFixed(1)}%`, '--d': `${(i % 6) * 0.7}s`, '--c': CONFETTI[i % 6] }} />)}</span>}
          <span className="cel-when">{big.inDays === 0 ? 'Today is' : big.inDays === 1 ? 'Tomorrow is' : 'In two days'}</span>
          <b className="cel-t">{big.title}</b>
          {big.line && <span className="cel-sub">{big.line}</span>}
        </Link>
      )}
      {gentle && (
        <Link to={`/calendar/day/${gentle.date}`} className="remember-banner span-6">
          <b>{gentle.title}</b>
          <span>{gentle.line}</span>
        </Link>
      )}
    </>
  )
}
