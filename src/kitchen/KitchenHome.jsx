import { useState } from 'react'
import { Link } from '../shell/Link.jsx'
import { Card } from '../ui/Card.jsx'
import { RecipeArt } from './FoodIcon.jsx'
import { timeWords, PEOPLE } from './art.js'
import { usePrefs } from '../lib/prefs.js'

function Stars({ ratings, recipeId, members }) {
  const mine = ratings.filter((r) => r.recipe_id === recipeId)
  if (!mine.length) return null
  return (
    <span className="mini-ratings">
      {mine.map((r) => { const m = members.find((x) => x.id === r.member_id); const k = m ? m.name[0] : '?'; return <span key={r.member_id} style={{ '--p': (PEOPLE[k] || {}).colour }}>{k} {r.stars}</span> })}
    </span>
  )
}

function RecipeTile({ r, ratings, members, note }) {
  return (
    <Link to={`/kitchen/recipe/${r.slug}`} className="recipe-tile">
      <RecipeArt names={r.art || []} size="small" />
      <span className="rt-t"><b>{r.title}</b>
        <span className="rt-m">{[timeWords(r.total_minutes), r.tags?.includes('easy-on-hands') && 'easy on the hands', note].filter(Boolean).join(' · ')}</span>
        <Stars ratings={ratings} recipeId={r.id} members={members} />
      </span>
    </Link>
  )
}

/** The Kitchen: what's in the fridge this week, and the cookbook. */
export default function KitchenHome({ book, family, signedIn, parent, today }) {
  const [q, setQ] = useState('')
  const [prefs, update] = usePrefs()
  const easy = Boolean(prefs.easyOnHands)
  const inFridge = book.fridge.map((f) => ({ f, r: book.recipes.find((r) => r.id === f.recipe_id) })).filter((x) => x.r)
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const list = book.recipes.filter((r) => (!easy || r.tags?.includes('easy-on-hands')) && words.every((w) => r.title.toLowerCase().includes(w)))
  const days = (d) => Math.round((Date.parse(today) - Date.parse(d)) / 864e5)
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Kitchen</span>
        <h1 className="greet">What’s cooking</h1>
      </header>
      {!signedIn && <Card tint="#C42D20" label="The cookbook" glyph="pot" className="span-6"><p>Sign in on the <Link to="/settings">Settings</Link> page to see our recipes.</p></Card>}
      {signedIn && (
        <>
          <Card tint="#C42D20" label="In the fridge this week" glyph="pot" tag={inFridge.length ? `${inFridge.length} to cook` : undefined} className="span-6 fridge-card">
            {inFridge.length === 0 && <p className="muted">Nothing waiting. Open a recipe and add it to this week when you shop for it.</p>}
            <div className="tiles">
              {inFridge.map(({ f, r }) => <RecipeTile key={f.id} r={r} ratings={book.ratings} members={family.members} note={days(f.added_on) <= 0 ? 'bought today' : `bought ${days(f.added_on)} ${days(f.added_on) === 1 ? 'day' : 'days'} ago`} />)}
            </div>
          </Card>
          <Card tint="#E0662F" label="The cookbook" glyph="pot" tag={book.loaded ? `${book.recipes.length} recipes` : undefined} className="span-6">
            <div className="book-tools">
              <input type="search" className="book-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a recipe" aria-label="Find a recipe" />
              <button type="button" className="easy-toggle" aria-pressed={easy} onClick={() => update({ easyOnHands: !easy })}>Easy on the hands</button>
            </div>
            {book.loaded && book.recipes.length === 0 && <p className="muted">No recipes yet.{parent ? ' Add the week’s from Obsidian: paste a file or open several at once.' : ''}</p>}
            {book.recipes.length > 0 && list.length === 0 && <p className="muted">Nothing matches.</p>}
            <div className="tiles">{list.map((r) => <RecipeTile key={r.id} r={r} ratings={book.ratings} members={family.members} />)}</div>
            {parent && <Link className="btn" to="/kitchen/add">Add recipes</Link>}
          </Card>
        </>
      )}
    </>
  )
}
