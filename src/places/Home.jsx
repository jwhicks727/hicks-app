import SunCalc from 'suncalc'
import ThemeToggle from '../ui/ThemeToggle.jsx'
import { HOME_TOWN, greeting } from '../lib/sky.js'
import { useNow } from '../lib/useNow.js'
import SkyToday from '../parts/SkyToday.jsx'
import RolloverShine from '../parts/RolloverShine.jsx'
import TodayCard from '../parts/TodayCard.jsx'
import FridgeCard from '../parts/FridgeCard.jsx'
import RateNudge from '../kitchen/RateNudge.jsx'
import MindfulCard from '../parts/MindfulCard.jsx'
import Sit from '../parts/Sit.jsx'
import JournalCard from '../parts/JournalCard.jsx'
import TableCard from '../parts/TableCard.jsx'
import AcademyCard from '../parts/AcademyCard.jsx'
import { atTable } from '../lib/table.js'
import GardenCard from './garden/GardenCard.jsx'
import SunsetCard from '../parts/SunsetCard.jsx'
import DaysOffCard from '../parts/DaysOffCard.jsx'
import { usePrefs, useSeasonTry } from '../lib/prefs.js'
import PaintingsCard from '../parts/PaintingsCard.jsx'
import { seasonFor } from '../lib/seasons.js'
import { useCookbook } from '../lib/useKitchen.js'
import { WeatherNow } from '../parts/WeatherCard.jsx'
import BirdsCard from '../parts/BirdsCard.jsx'
import FamilyBanner from '../parts/FamilyBanner.jsx'
import { useSession } from '../lib/auth.js'
import { useFamily, useEvents } from '../lib/useCalendar.js'
import { dayView } from '../lib/cal/day.js'
import { occasionFor } from '../lib/occasions.js'
import { dedupeEvents } from '../lib/cal/tidy.js'
import { OccasionCard, GlowWrap } from '../ui/Glow.jsx'
import { todayAt } from '../lib/cal/dates.js'
import PetsInvite from './pets/PetsInvite.jsx'
import '../calendar/calendar.css'

const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, weekday: 'long', month: 'long', day: 'numeric' })
const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', hourCycle: 'h23' })
const hm = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', minute: '2-digit' })

export default function Home({ rest = [] }) {
  if (rest[0] === 'sit' || rest[0] === 'breathe') return <Sit />
  return <HomeScreen />
}

function HomeScreen() {
  const [prefs] = usePrefs()
  const [tryKey] = useSeasonTry()
  const now = useNow()
  const session = useSession()
  const family = useFamily(session)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email && family.members.find((m) => (m.email || '').toLowerCase() === email)
  const today = todayAt(HOME_TOWN.tz, now), hour = +hourFmt.format(now)
  const { events: rawEvents } = useEvents(session, today, today)
  const events = dedupeEvents(rawEvents)
  const book = useCookbook(session)
  const occasion = occasionFor(dayView(today, { familyDays: family.days, events }))
  const t = SunCalc.getTimes(now, HOME_TOWN.lat, HOME_TOWN.lng)
  const sun = now < t.sunset ? `sunset ${hm.format(t.sunset)}` : `sunrise ${hm.format(SunCalc.getTimes(new Date(now.getTime() + 864e5), HOME_TOWN.lat, HOME_TOWN.lng).sunrise)}`
  return (
    <>
      <header className="hero span-6">
        <div className="hero-top"><span className="kicker">{dateFmt.format(now)}</span><ThemeToggle /></div>
        <span className="eyebrow">{sun}</span>
        {/* Each of us by name once signed in; the wall will greet Team Hicks. */}
        <h1 className="greet">{greeting(hour)}{me ? `, ${me.name}` : ''}</h1>
      </header>
      <RolloverShine />
      <RateNudge book={book} me={me} today={today} />
      <FamilyBanner today={today} days={family.days} occasion={occasion && occasion.key === 'family' ? occasion : null} />
      <AcademyCard session={session} me={me} today={today} />
      {occasion && occasion.on === 'event' && <OccasionCard occasion={occasion} day={today} className="span-6" />}
      <WeatherNow />
      <BirdsCard />
      <PaintingsCard season={tryKey || seasonFor(today).key} auto />
      <GlowWrap occasion={occasion && ['church', 'day', 'sky'].includes(occasion.on) ? occasion : null} day={today} className="span-3"><TodayCard today={today} hour={hour} /></GlowWrap>
      <DaysOffCard today={today} />
      <FridgeCard book={book} />
      <GardenCard today={today} me={me} />
      <SunsetCard />
      {atTable(hour) && <TableCard today={today} />}
      {prefs.mindful !== false && <MindfulCard today={today} />}
      <JournalCard session={session} me={me} today={today} />
      <SkyToday />
      <PetsInvite today={today} />
    </>
  )
}
