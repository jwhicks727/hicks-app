import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { RecipeArt } from '../kitchen/FoodIcon.jsx'
import '../kitchen/kitchen.css'

/** Home: the recipes still in the fridge this week. Only while there are some. */
export default function FridgeCard({ book }) {
  const waiting = book.fridge.map((f) => book.recipes.find((r) => r.id === f.recipe_id)).filter(Boolean)
  if (!waiting.length) return null
  return (
    <Card tint="#C42D20" label="In the fridge" glyph="pot" tag={`${waiting.length} to cook`} className="span-3">
      <div className="tiles">
        {waiting.map((r) => (
          <Link key={r.id} to={`/kitchen/recipe/${r.slug}`} className="recipe-tile">
            <RecipeArt names={r.art || []} size="small" />
            <span className="rt-t"><b>{r.title}</b></span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
