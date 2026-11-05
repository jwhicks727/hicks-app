import { lazy, Suspense } from 'react'
import { parsePath, usePath } from './lib/router.js'
import Sky from './shell/Sky.jsx'
import Gate from './shell/Gate.jsx'
import { useGate } from './lib/useGate.js'
import SeasonShow from './shell/SeasonShow.jsx'
import { PaintingsProvider } from './parts/PaintingsProvider.jsx'
import TabBar from './shell/TabBar.jsx'
import Home from './places/Home.jsx'
import World from './places/World.jsx'
import Calendar from './places/Calendar.jsx'
import Kitchen from './places/Kitchen.jsx'
import LifeList from './places/LifeList.jsx'
import Jams from './places/Jams.jsx'
import Drawings from './places/Drawings.jsx'
import Pets from './places/pets/Pets.jsx'
import Journal from './places/journal/Journal.jsx'
import Garden from './places/garden/Garden.jsx'
import Settings from './consoles/Settings.jsx'
import Setup from './consoles/Setup.jsx'
import Reports from './consoles/Reports.jsx'
// Anna's academy loads when it's opened: its rooms and pictures are only for there
const Academy = lazy(() => import('./academy/Academy.jsx'))

const SCREENS = { home: Home, world: World, calendar: Calendar, kitchen: Kitchen, journal: Journal, garden: Garden, lifelist: LifeList, jams: Jams, drawings: Drawings, pets: Pets, academy: Academy, settings: Settings, admin: Setup, reports: Reports }

// Nothing shows until someone has signed in and is on the family list
// (src/lib/gate.js): not the tab bar, not a place, not a card.
export default function App() {
  const gate = useGate()
  if (gate.state !== 'open') return <Gate gate={gate} />
  return <Inside />
}

function Inside() {
  const path = usePath()
  const { place, rest } = parsePath(path)
  const Screen = SCREENS[place]
  return (
    <PaintingsProvider>
      <>
        <Sky />
        <SeasonShow />
        <div className="app">
          <TabBar current={place} />
          <main className="screen" key={place}>
            <Suspense fallback={null}><Screen rest={rest} /></Suspense>
          </main>
        </div>
      </>
    </PaintingsProvider>
  )
}
