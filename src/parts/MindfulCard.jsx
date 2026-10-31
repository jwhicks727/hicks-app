import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { usePrefs } from '../lib/prefs.js'
import { wordsFor, teachingFor } from '../lib/mindful.js'

/**
 * Home: a line for the day and the morning sit. On Sundays, lightly, a
 * word on what the teaching means and one small thing to try that week.
 * Quiet; switched off in Settings.
 */
export default function MindfulCard({ today }) {
  const [prefs] = usePrefs()
  const [text, who, where] = wordsFor(today)
  const t = teachingFor(today)
  return (
    <Card tint="#C98AB5" label="A mindful moment" glyph="sunmoon" className="span-3 mindful-card">
      {t ? (
        <div className="mindful-teach">
          <span className="mindful-kicker">A word on the teaching</span>
          <b>{t.name}</b>
          <p>{t.word}</p>
          <p className="mindful-try"><span>This week, try:</span> {t.try}</p>
        </div>
      ) : <blockquote className="mindful-q">“{text}”<span>{who}{where ? `, ${where}` : ''}</span></blockquote>}
      <Link className="btn ghost" to="/home/sit">Sit · {prefs.sitMinutes || 10} min ›</Link>
    </Card>
  )
}
