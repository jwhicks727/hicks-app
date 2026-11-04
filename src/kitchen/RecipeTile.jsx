import { Link } from '../shell/Link.jsx'
import { RecipeArt } from './FoodIcon.jsx'
import { timeWords, PEOPLE } from './art.js'
import { standing } from '../lib/kitchen/week.js'
import { StandingBadge } from './Unicorn.jsx'
import { artFromTitle } from '../lib/kitchen/food.js'

function Stars({ ratings, recipeId, members }) {
  const mine = ratings.filter((r) => r.recipe_id === recipeId)
  if (!mine.length) return null
  return (
    <span className="mini-ratings">
      {mine.map((r) => { const m = members.find((x) => x.id === r.member_id); const k = m ? m.name[0] : '?'; return <span key={r.member_id} style={{ '--p': (PEOPLE[k] || {}).colour }}>{k} {r.stars}</span> })}
    </span>
  )
}

export default function RecipeTile({ r, ratings, members, note }) {
  const st = standing(ratings.filter((x) => x.recipe_id === r.id), members)
  return (
    <Link to={`/kitchen/recipe/${r.slug}`} className={'recipe-tile' + (st.unicorn ? ' is-unicorn' : st.keeper ? ' is-keeper' : '')}>
      <RecipeArt names={artFromTitle(r.title)} size="small" />
      <span className="rt-t"><b>{r.title}</b>
        <span className="rt-m">{[timeWords(r.total_minutes), r.tags?.includes('easy-on-hands') && 'easy on the hands', note].filter(Boolean).join(' · ')}</span>
        <Stars ratings={ratings} recipeId={r.id} members={members} />
        <StandingBadge standing={st} />
      </span>
    </Link>
  )
}

