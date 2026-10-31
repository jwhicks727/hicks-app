import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { wordsFor } from '../lib/mindful.js'

/** Home: a line for the day, and a pause to breathe. Quiet; switched off in Settings. */
export default function MindfulCard({ today }) {
  const [text, who, where] = wordsFor(today)
  return (
    <Card tint="#C98AB5" label="A mindful moment" glyph="sunmoon" className="span-3 mindful-card">
      <blockquote className="mindful-q">“{text}”<span>{who}{where ? `, ${where}` : ''}</span></blockquote>
      <Link className="btn ghost" to="/home/breathe">Breathe ›</Link>
    </Card>
  )
}
