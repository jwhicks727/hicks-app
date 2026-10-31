import { useState } from 'react'
import { Link } from '../shell/Link.jsx'
import { rate } from '../lib/useKitchen.js'
import { ratingsOwed } from '../lib/kitchen/week.js'
import { RecipeArt } from './FoodIcon.jsx'

const HIDE = 'teamhicks.rate-later'
const hidden = () => { try { return JSON.parse(localStorage.getItem(HIDE)) || [] } catch { return [] } }
const ago = (d, today) => { const n = Math.round((Date.parse(today) - Date.parse(d)) / 864e5); return n <= 0 ? 'tonight' : n === 1 ? 'last night' : `${n} days ago` }

/** A job waiting: rate what was cooked, in the hours and days after. Each of us sees our own. */
export default function RateNudge({ book, me, today, className = 'span-6' }) {
  const [later, setLater] = useState(hidden)
  const [done, setDone] = useState({})
  const owed = ratingsOwed(book.cooked, book.ratings, me, today).filter((c) => !later.includes(c.id) && !done[c.recipe_id])
  const seen = new Set()
  const list = owed.filter((c) => (seen.has(c.recipe_id) ? false : seen.add(c.recipe_id))).slice(0, 2)
  if (!list.length) return null
  return (
    <section className={'rate-nudges ' + className} aria-label="Dinners to rate">
      {list.map((c) => {
        const r = book.recipes.find((x) => x.id === c.recipe_id)
        if (!r) return null
        return (
          <div key={c.id} className="rate-nudge">
            <RecipeArt names={r.art || []} size="small" />
            <div className="rn-t">
              <span className="rn-k">Cooked {ago(c.done_on, today)} · {owed.length} to rate</span>
              <Link to={`/kitchen/recipe/${r.slug}`}><b>How was the {r.title}?</b></Link>
              <span className="stars big" role="radiogroup" aria-label={`Your rating for ${r.title}`}>
                {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked="false" aria-label={`${n} of 5`} onClick={async () => { setDone({ ...done, [c.recipe_id]: n }); await rate(r.id, me.id, n); book.reload() }}>★</button>)}
              </span>
              <button type="button" className="rn-later" onClick={() => { const next = [...later, c.id]; try { localStorage.setItem(HIDE, JSON.stringify(next.slice(-50))) } catch { /* fine */ } setLater(next) }}>Not now</button>
            </div>
          </div>
        )
      })}
    </section>
  )
}
