import { Card } from '../../ui/Card.jsx'
import Coming from '../../parts/Coming.jsx'
import { Link } from '../../shell/Link.jsx'
import PetsLaunch from './PetsLaunch.jsx'

const TINT = '#8A5A33'

// /pets: coming soon. The launch scene is the first thing here (PetsLaunch.jsx); what the app will
// hold is honest about being unbuilt. Who lives here, for the record: Appa, a giant white
// husky and Belgian Malinois mix, and three cats, Kona, Portia and Goldie, drawn by Anna.
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
        'Appa’s walks and runs, with the weather for them',
      ]} />
      <Card tint={TINT} glyph="star" label="Who lives here" className="span-3">
        <ul className="pt-roll">
          <li><b>Appa</b><span>a giant white husky and Belgian Malinois mix</span></li>
          <li><b>Kona</b><span>a white cat with blue eyes and one calico splotch on her head</span></li>
          <li><b>Portia</b><span>a mostly black tuxedo cat</span></li>
          <li><b>Goldie</b><span>a calico cat</span></li>
        </ul>
        <p className="muted small">The cats are in Anna’s drawing above. <Link to="/drawings">Anna’s Art</Link> keeps her drawings of all of them.</p>
      </Card>
    </>
  )
}
