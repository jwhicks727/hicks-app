import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { RecipeArt } from '../kitchen/FoodIcon.jsx'
import { stillToShop } from '../lib/kitchen/week.js'
import { artFromTitle } from '../lib/kitchen/food.js'
import '../kitchen/kitchen.css'

/** Home: the recipes still in the fridge this week, and how many are still to shop for. Only while there are some. */
export default function FridgeCard({ book }) {
  const waiting = book.fridge.filter((f) => !stillToShop(f)).map((f) => book.recipes.find((r) => r.id === f.recipe_id)).filter(Boolean)
  const toShop = book.fridge.filter(stillToShop).length
  if (!waiting.length && !toShop) return null
  const shopLine = toShop ? `${toShop} ${toShop === 1 ? 'dish' : 'dishes'} still to shop for` : null
  return (
    <Card tint="#C42D20" label="In the fridge" glyph="pot" tag={waiting.length ? `${waiting.length} to cook` : 'to shop for'} className="span-3">
      <div className="tiles">
        {waiting.map((r) => (
          <Link key={r.id} to={`/kitchen/recipe/${r.slug}`} className="recipe-tile">
            <RecipeArt names={artFromTitle(r.title)} size="small" />{/* from the dish's name, as on its tile in the Kitchen */}
            <span className="rt-t"><b>{r.title}</b></span>
          </Link>
        ))}
      </div>
      {shopLine && <p className="muted fridge-shop"><Link to="/kitchen">{shopLine} ›</Link></p>}
    </Card>
  )
}
