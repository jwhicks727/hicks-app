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
import SitReminder from '../parts/SitReminder.jsx'
import ListsCard from '../parts/ListsCard.jsx'
import Lists from './lists/Lists.jsx'
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
import { useHere } from '../lib/useHere.js'
import { hourIn, clockIn } from '../lib/here.js'
import { WeatherHere, HereNowLine, TripAhead, whereWords } from '../parts/HereCards.jsx'
import AroundCard from '../parts/AroundCard.jsx'
import { BeenHereCard } from './yonder/Been.jsx'
import RecapCards from './yonder/Recap.jsx'
import { useRememberStay, useOutboxFlush } from '../lib/useStay.js'
import { FamilyAway, MassNearHere, ParkNear, KeepTrip } from '../parts/FamilyTrips.jsx'
import { ShareHere } from '../lib/useWhereabouts.js'
import { PostcardForm, PrayerForTheRoad, TwoSkies, AbroadCard, SnowHere, ZoneShift, YearAgoTrips } from '../parts/TravelBits.jsx'
import { tripsAhead } from '../lib/here.js'
import { Card } from '../ui/Card.jsx'
import '../calendar/calendar.css'

const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: HOME_TOWN.tz, hour: 'numeric', hourCycle: 'h23' })
const dateIn = (now, tz) => new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' }).format(now)

export default function Home({ rest = [] }) {
  if (rest[0] === 'sit' || rest[0] === 'breathe') return <Sit />
  if (rest[0] === 'lists') return <Lists rest={rest.slice(1)} />
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
  // Away from home ground (Settings › Notice where I am), the greeting, the
  // date, the sun and the clock are where we are; the lists keep home's day.
  const here = useHere()
  useRememberStay(here, today) // the town and the days of a stay away, for the recap (this phone only)
  useOutboxFlush(session) // places that couldn't be saved yet are sent again
  const out = here.point && (here.tier === 'near' || here.tier === 'away')
  const at = out ? here.point : HOME_TOWN, tz = (out && here.tz) || HOME_TOWN.tz
  const where = out ? whereWords(here) : ''
  const t = SunCalc.getTimes(now, at.lat, at.lng)
  const sun = now < t.sunset ? `sunset ${clockIn(t.sunset, tz)}` : `sunrise ${clockIn(SunCalc.getTimes(new Date(now.getTime() + 864e5), at.lat, at.lng).sunrise, tz)}`
  const homeClock = tz !== HOME_TOWN.tz ? `${clockIn(now, HOME_TOWN.tz)} at home` : null
  return (
    <>
      <header className="hero span-6">
        <div className="hero-top"><span className="kicker">{dateIn(now, tz)}</span><ThemeToggle /></div>
        <span className="eyebrow">{[homeClock ? `${clockIn(now, tz)} here` : null, sun, homeClock].filter(Boolean).join(' · ')}</span>
        {/* Each of us by name once signed in; the wall will greet Team Hicks, and never says where anyone is. */}
        <h1 className="greet">{greeting(hourIn(now, tz))}{where ? ` from ${where}` : ''}{me ? `, ${me.name}` : ''}</h1>
      </header>
      <ListsCard session={session} family={family} me={me} now={now} events={events} />
      <SitReminder me={me} today={today} hour={hour} />
      <RolloverShine />
      <RateNudge book={book} me={me} today={today} />
      <FamilyBanner today={today} days={family.days} occasion={occasion && occasion.key === 'family' ? occasion : null} />
      <AcademyCard session={session} me={me} today={today} />
      {occasion && occasion.on === 'event' && <OccasionCard occasion={occasion} day={today} className="span-6" />}
      <ShareHere here={here} me={me} />
      <RecapCards here={here} me={me} today={today} />
      <SnowHere here={here} />
      <ZoneShift here={here} />
      <PrayerForTheRoad trip={tripsAhead(events, today, 0).find((t) => t.inDays === 0)} hour={hour} />
      <TripAhead session={session} today={today} here={here} />
      {here.tier === 'away' && <AroundCard here={here} />}
      {(here.tier === 'away' || here.tier === 'near') && <BeenHereCard here={here} />}
      {here.tier === 'away' && me && <Card tint="#B5658F" label="A postcard" glyph="star" className="span-3"><PostcardForm here={here} me={me} today={today} /></Card>}
      <FamilyAway family={family} me={me} />
      <TwoSkies here={here} now={now} />
      {here.tier === 'away' && <AbroadCard here={here} />}
      <KeepTrip here={here} session={session} me={me} today={today} />
      {here.tier === 'away' && <ParkNear here={here} session={session} me={me} today={today} />}
      {here.tier === 'away' && here.point ? <WeatherHere here={here} /> : <WeatherNow extra={here.tier === 'near' ? <HereNowLine here={here} /> : null} />}
      <BirdsCard here={here} />
      {here.tier === 'near' && <AroundCard here={here} />}
      <PaintingsCard season={tryKey || seasonFor(today).key} auto />
      <GlowWrap occasion={occasion && ['church', 'day', 'sky'].includes(occasion.on) ? occasion : null} day={today} className="span-3"><TodayCard today={today} hour={hour} /></GlowWrap>
      {here.tier === 'away' && <MassNearHere here={here} now={now} />}
      <YearAgoTrips session={session} today={today} />
      <DaysOffCard today={today} />
      <FridgeCard book={book} />
      <GardenCard today={today} me={me} away={here.tier === 'away'} />
      <SunsetCard />
      {atTable(hour) && <TableCard today={today} />}
      {prefs.mindful !== false && <MindfulCard today={today} />}
      <JournalCard session={session} me={me} today={today} />
      <SkyToday />
    </>
  )
}
