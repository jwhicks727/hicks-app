import { Card } from '../../ui/Card.jsx'
import Coming from '../../parts/Coming.jsx'
import { Link } from '../../shell/Link.jsx'
import PetsLaunch from './PetsLaunch.jsx'

const TINT = '#8A5A33'

// /pets: coming soon. The launch scene is the first thing here (PetsLaunch.jsx); what the app will
// hold is honest about being unbuilt. Who lives here, for the record: Zappa, a giant white
// husky/Malinois, and three cats, drawn by Anna.
export default function Pets() {
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Coming soon</span>
        <h1 className="greet">Pets</h1>
      </header>
      <PetsLaunch />
      <Coming tint={TINT} glyph="star" className="span-3" title="What it will hold" items={[
        'A page for each of them: a photo or one of Anna’s drawings, birthday or gotcha day, and weight over time',
        'Vet visits, shots and medicines, with reminders on the calendar',
        'Feeding and walks, so everyone can see who did what today and nobody is fed twice',
        'Zappa’s walks and runs, with the weather for them',
      ]} />
      <Card tint={TINT} glyph="star" label="Who lives here" className="span-3">
        <ul className="pt-roll">
          <li><b>Zappa</b><span>a giant white husky/Malinois</span></li>
          <li><b>Three cats</b><span>drawn by Anna</span></li>
        </ul>
        <p className="muted small"><Link to="/drawings">Anna’s Gallery</Link> keeps her drawings of them.</p>
      </Card>
    </>
  )
}
