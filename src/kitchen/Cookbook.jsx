import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { usePrefs } from '../lib/prefs.js'
import RecipeTile from './RecipeTile.jsx'
import KitchenMenu from './KitchenMenu.jsx'

/** /kitchen/cookbook: every recipe we have, searchable, one tap from the Kitchen's menu. */
export default function Cookbook({ book, family, parent }) {
  const [q, setQ] = useState('')
  const [prefs, update] = usePrefs()
  const easy = Boolean(prefs.easyOnHands)
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const list = book.recipes.filter((r) => (!easy || r.tags?.includes('easy-on-hands')) && words.every((w) => r.title.toLowerCase().includes(w)))
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Kitchen</span>
        <h1 className="greet">Cookbook</h1>
        <KitchenMenu current="cookbook" parent={parent} />
      </header>
      <Card tint="#E0662F" label="Every recipe" glyph="pot" tag={book.loaded ? `${book.recipes.length} recipes` : undefined} className="span-6">
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
  )
}
