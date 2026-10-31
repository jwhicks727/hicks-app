import SunCalc from 'suncalc'
import { HOME_TOWN, greeting } from '../lib/sky.js'
import { useNow } from '../lib/useNow.js'
import SkyToday from '../parts/SkyToday.jsx'
import Coming from '../parts/Coming.jsx'
import RolloverShine from '../parts/RolloverShine.jsx'
import { Link } from '../shell/Link.jsx'

const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, weekday: 'long', month: 'long', day: 'numeric' })
const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', hourCycle: 'h23' })
const hm = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: '2-digit' })

export default function Home() {
  const now = useNow()
  const t = SunCalc.getTimes(now, HOME_TOWN.lat, HOME_TOWN.lng)
  const sun = now < t.sunset ? `sunset ${hm.format(t.sunset)}` : `sunrise ${hm.format(SunCalc.getTimes(new Date(now.getTime() + 864e5), HOME_TOWN.lat, HOME_TOWN.lng).sunrise)}`
  return (
    <>
      <header className="hero span-6">
        <div className="hero-top"><span className="kicker">{dateFmt.format(now)}</span><Link to="/settings" className="icon-btn" aria-label="Settings, Setup and Reports"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></Link></div>
        <span className="eyebrow">{sun}</span>
        {/* Each of you by name once sign-in is in (phase one); the wall greets Team Hicks. */}
        <h1 className="greet">{greeting(+hourFmt.format(now))}</h1>
      </header>
      <RolloverShine />
      <SkyToday />
      <Coming tint="#3BA3A8" glyph="weather" title="Our world, next" items={[
        'Weather at home and at Kordyak, Wayne Ruble and SOAR, from our chosen stations (SE685, 980SE, NGC08)',
        'Birds around us, straight after the weather',
        'A celebration banner before each family day',
      ]} />
    </>
  )
}
