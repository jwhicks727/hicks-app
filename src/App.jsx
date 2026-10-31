import { parsePath, usePath } from './lib/router.js'
import Sky from './shell/Sky.jsx'
import TabBar from './shell/TabBar.jsx'
import Home from './places/Home.jsx'
import World from './places/World.jsx'
import Calendar from './places/Calendar.jsx'
import Kitchen from './places/Kitchen.jsx'
import LifeList from './places/LifeList.jsx'
import Music from './places/Music.jsx'

const SCREENS = { home: Home, world: World, calendar: Calendar, kitchen: Kitchen, lifelist: LifeList, music: Music }

export default function App() {
  const path = usePath()
  const { place, rest } = parsePath(path)
  const Screen = SCREENS[place]
  return (
    <>
      <Sky />
      <div className="app">
        <TabBar current={place} />
        <main className="screen" key={place}>
          <Screen rest={rest} />
        </main>
      </div>
    </>
  )
}
