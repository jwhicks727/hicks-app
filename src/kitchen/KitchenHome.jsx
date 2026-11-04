import { Link } from '../shell/Link.jsx'
import { Card } from '../ui/Card.jsx'
import { useRecipeBodies } from '../lib/useKitchen.js'
import { makeItAgain } from '../lib/kitchen/week.js'
import { UnicornHorn } from './Unicorn.jsx'
import RecipeTile from './RecipeTile.jsx'
import KitchenMenu from './KitchenMenu.jsx'
import RateNudge from './RateNudge.jsx'
import WeekLists from './WeekLists.jsx'

/** The Kitchen: what's in the fridge this week; the menu above leads to the cookbook, planning and the rest. */
export default function KitchenHome({ book, family, session, me, parent, today }) {
  const signedIn = Boolean(session)
  const bodies = useRecipeBodies(session, book.fridge.map((f) => f.recipe_id))
  const lastCooked = {}
  for (const c of book.cooked) if (!lastCooked[c.recipe_id] || c.done_on > lastCooked[c.recipe_id]) lastCooked[c.recipe_id] = c.done_on
  const again = makeItAgain(book.recipes, book.ratings, family.members, lastCooked, today).filter((x) => !book.fridge.some((f) => f.recipe_id === x.r.id))
  const weekOf = book.fridge.length ? book.fridge.map((f) => f.added_on).sort()[0] : today
  const inFridge = book.fridge.map((f) => ({ f, r: book.recipes.find((r) => r.id === f.recipe_id) })).filter((x) => x.r)
  const days = (d) => Math.round((Date.parse(today) - Date.parse(d)) / 864e5)
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Kitchen</span>
        <h1 className="sr">What’s cooking: the Kitchen this week</h1>
        {signedIn ? <KitchenMenu current="" parent={parent} big /> : <p className="greet" aria-hidden="true">What’s cooking</p>}
      </header>
      {!signedIn && <Card tint="#C42D20" label="The cookbook" glyph="pot" className="span-6"><p>Sign in on the <Link to="/settings">Settings</Link> page to see our recipes.</p></Card>}
      {signedIn && (
        <>
          <RateNudge book={book} me={me} today={today} />
          <Card tint="#C42D20" label="In the fridge this week" glyph="pot" tag={inFridge.length ? `${inFridge.length} to cook` : undefined} className="span-6 fridge-card">
            {inFridge.length === 0 && <p className="muted">Nothing waiting. Open a recipe and add it to this week when you shop for it.</p>}
            <div className="tiles">
              {inFridge.map(({ f, r }) => <RecipeTile key={f.id} r={r} ratings={book.ratings} members={family.members} note={days(f.added_on) <= 0 ? 'bought today' : `bought ${days(f.added_on)} ${days(f.added_on) === 1 ? 'day' : 'days'} ago`} />)}
            </div>
          </Card>
          <WeekLists bodies={bodies} weekOf={weekOf} />
          {again.length > 0 && (
            <Card tint="#D9A520" label="Make it again" glyph="star" tag={again.some((x) => x.unicorn) ? 'unicorns first' : 'keepers'} className="span-6 again-card">
              <p className="muted">Everyone gave these 4s and 5s, and they haven’t been cooked in three weeks.</p>
              <div className="tiles">
                {again.slice(0, 6).map((x) => <RecipeTile key={x.r.id} r={x.r} ratings={book.ratings} members={family.members} note={x.last ? `last cooked ${x.last.slice(5).replace('-', '/')}` : 'not cooked lately'} />)}
              </div>
              {again.some((x) => x.unicorn) && <p className="unicorn-note"><UnicornHorn size={20} /> Three 5s from the three of us is a unicorn.</p>}
            </Card>
          )}
        </>
      )}
    </>
  )
}
