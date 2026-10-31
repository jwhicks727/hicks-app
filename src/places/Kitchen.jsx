import { useSession } from '../lib/auth.js'
import { useFamily } from '../lib/useCalendar.js'
import { useCookbook, useRecipe } from '../lib/useKitchen.js'
import { useNow } from '../lib/useNow.js'
import { todayAt } from '../lib/cal/dates.js'
import KitchenHome from '../kitchen/KitchenHome.jsx'
import RecipePage from '../kitchen/RecipePage.jsx'
import CookMode from '../kitchen/CookMode.jsx'
import AddRecipes from '../kitchen/AddRecipes.jsx'
import PlanWeek from '../kitchen/PlanWeek.jsx'
import Rules from '../kitchen/Rules.jsx'
import KitchenChat from '../kitchen/KitchenChat.jsx'
import { navigate } from '../lib/router.js'
import '../kitchen/kitchen.css'

// /kitchen                      the fridge and the cookbook
// /kitchen/recipe/<slug>        a recipe
// /kitchen/recipe/<slug>/cook   cook mode (Back leaves it)
// /kitchen/add                  adding recipes (parents)
// /kitchen/plan                 planning the week (parents)
// /kitchen/rules                the preferences, and Laurie's food rules (parents)
// Everywhere in the Kitchen, once signed in: the Ask button, to talk with Claude
export default function Kitchen({ rest }) {
  const now = useNow()
  const today = todayAt('America/Los_Angeles', now)
  const session = useSession()
  const family = useFamily(session)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  const [view, slug, sub] = rest
  const book = useCookbook(view ? null : session)
  const one = useRecipe(view === 'recipe' ? session : null, view === 'recipe' ? slug : null)
  const screen = view === 'recipe' && sub === 'cook' ? <CookMode data={one} slug={slug} parent={parent} />
    : view === 'recipe' ? <RecipePage data={one} slug={slug} me={me} members={family.members} parent={parent} today={today} onChanged={one.reload} />
      : view === 'add' ? <AddRecipes parent={parent} onSaved={() => navigate('/kitchen', { replace: true })} />
        : view === 'plan' ? <PlanWeek parent={parent} me={me} members={family.members} today={today} />
          : view === 'rules' ? <Rules parent={parent} me={me} members={family.members} />
            : <KitchenHome book={book} family={family} session={session} me={me} parent={parent} today={today} />
  return (
    <>
      {screen}
      {me && <KitchenChat me={me} parent={parent} members={family.members} slug={view === 'recipe' ? slug : null} today={today} />}
    </>
  )
}
