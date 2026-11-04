import { useSession } from '../lib/auth.js'
import { useFamily } from '../lib/useCalendar.js'
import { useCookbook, useRecipe } from '../lib/useKitchen.js'
import { useNow } from '../lib/useNow.js'
import { todayAt } from '../lib/cal/dates.js'
import KitchenHome from '../kitchen/KitchenHome.jsx'
import Cookbook from '../kitchen/Cookbook.jsx'
import RecipePage from '../kitchen/RecipePage.jsx'
import CookMode from '../kitchen/CookMode.jsx'
import AddRecipes from '../kitchen/AddRecipes.jsx'
import PlanWeek from '../kitchen/PlanWeek.jsx'
import Rules from '../kitchen/Rules.jsx'
import RecipeEditor from '../kitchen/RecipeEditor.jsx'
import KitchenChat from '../kitchen/KitchenChat.jsx'
import { navigate } from '../lib/router.js'
import '../kitchen/kitchen.css'

// /kitchen                      this week: the fridge and its lists; the menu leads on
// /kitchen/cookbook             every recipe, searchable
// /kitchen/recipe/<slug>        a recipe
// /kitchen/recipe/<slug>/cook   cook mode (Back leaves it)
// /kitchen/add                  adding recipes (parents)
// /kitchen/write                writing a recipe by hand (parents)
// /kitchen/recipe/<slug>/edit   changing a recipe by hand (parents)
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
  const book = useCookbook(!view || view === 'cookbook' ? session : null)
  const one = useRecipe(view === 'recipe' ? session : null, view === 'recipe' ? slug : null)
  const screen = view === 'recipe' && sub === 'edit' ? <RecipeEditor slug={slug} data={one} parent={parent} />
    : view === 'write' ? <RecipeEditor slug={null} parent={parent} />
    : view === 'recipe' && sub === 'cook' ? <CookMode data={one} slug={slug} parent={parent} />
    : view === 'recipe' ? <RecipePage data={one} slug={slug} me={me} members={family.members} parent={parent} today={today} onChanged={one.reload} />
      : view === 'add' ? <AddRecipes parent={parent} onSaved={() => navigate('/kitchen', { replace: true })} />
        : view === 'plan' ? <PlanWeek parent={parent} me={me} members={family.members} today={today} />
          : view === 'rules' ? <Rules parent={parent} me={me} members={family.members} />
            : view === 'cookbook' ? <Cookbook book={book} family={family} parent={parent} />
              : <KitchenHome book={book} family={family} session={session} me={me} parent={parent} today={today} />
  return (
    <>
      {screen}
      {me && <KitchenChat me={me} parent={parent} members={family.members} slug={view === 'recipe' ? slug : null} today={today} />}
    </>
  )
}
