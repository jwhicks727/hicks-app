import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { useJournalGlance } from '../lib/useJournalGlance.js'

// Home's door to your journal. It says only whether today's page is
// written, that a note or an earlier year is waiting: never what's in them.
export default function JournalCard({ session, me, today }) {
  const g = useJournalGlance(session, today, Boolean(session && me), Boolean(me && me.role === 'child'))
  if (!session || !me || !g.loaded) return null
  return (
    <Card tint="#7A5C9E" label="Journal" glyph="star" tag="Only you" className="span-2 journal-card">
      {g.notes > 0 && <p className="jc-note">{g.notes === 1 ? 'A note from Past ' + me.name + ' is waiting.' : `${g.notes} notes from Past ${me.name} are waiting.`}</p>}
      {g.written ? <p>Today’s page is written.</p> : <p>{g.question ? <><b>{g.question.title}</b> {g.question.prompt}</> : 'Three gratitudes, whenever you’re ready.'}</p>}
      {g.years.length > 0 && <p className="muted">You wrote on this day {g.years.map((n) => (n === 1 ? 'a year ago' : `${n} years ago`)).join(' and ')}.</p>}
      <Link to="/us/journal" className="btn">{g.written ? 'Open your journal' : 'Write today’s page'}</Link>
    </Card>
  )
}
