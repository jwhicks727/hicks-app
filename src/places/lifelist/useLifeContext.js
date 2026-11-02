import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { useNow } from '../../lib/useNow.js'
import { todayAt } from '../../lib/cal/dates.js'
import { HOME_TOWN } from '../../lib/sky.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'

/** Who is looking, what day it is, and her paintings: what every Life List screen needs. */
export function useLifeContext() {
  const session = useSession()
  const family = useFamily(session)
  const now = useNow()
  const { list: paintings, stored, loaded, reload } = usePaintings()
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) || null : null
  return {
    session, members: family.members, me, parent: Boolean(me && me.role === 'parent'), laurie: family.people.find((m) => m.name === 'Laurie') || null,
    today: todayAt(HOME_TOWN.tz, now), paintings, paintingsStored: stored, paintingsLoaded: loaded, reloadPaintings: reload,
  }
}
