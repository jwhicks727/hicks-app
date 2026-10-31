import { parsePath, usePath } from './lib/router.js'
import Sky from './shell/Sky.jsx'
import SeasonShow from './shell/SeasonShow.jsx'
import TabBar from './shell/TabBar.jsx'
import Home from './places/Home.jsx'
import World from './places/World.jsx'
import Calendar from './places/Calendar.jsx'
import Kitchen from './places/Kitchen.jsx'
import LifeList from './places/LifeList.jsx'
import Jams from './places/Jams.jsx'
import Settings from './consoles/Settings.jsx'
import Setup from './consoles/Setup.jsx'
import Reports from './consoles/Reports.jsx'

const SCREENS = { home: Home, world: World, calendar: Calendar, kitchen: Kitchen, lifelist: LifeList, jams: Jams, settings: Settings, setup: Setup, reports: Reports }

export default function App() {
  const path = usePath()
  const { place, rest } = parsePath(path)
  const Screen = SCREENS[place]
  return (
    <>
      <Sky />
      <SeasonShow />
      <div className="app">
        <TabBar current={place} />
        <main className="screen" key={place}>
          <Screen rest={rest} />
        </main>
      </div>
    </>
  )
}
