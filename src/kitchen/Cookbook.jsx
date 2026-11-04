import { useMemo, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { usePrefs } from '../lib/prefs.js'
import { useSession } from '../lib/auth.js'
import { useWeather } from '../lib/useWeather.js'
import { useAllBodies, useLaurieWritten } from '../lib/useKitchen.js'
import { shelvesFor, sortRecipes, searchRecipes, makeWith, weatherPick, cookedStats, recipeText, surprise } from '../lib/kitchen/cookbook.js'
import { readRecent } from '../lib/kitchen/recent.js'
import { parsed } from './art.js'
import RecipeTile from './RecipeTile.jsx'
import KitchenMenu from './KitchenMenu.jsx'

const SORTS = [['az', 'A–Z'], ['newest', 'Newest'], ['rated', 'Top rated'], ['quick', 'Quickest'], ['cooked', 'Most cooked'], ['lately', 'Not lately']]
const md = (d) => d.slice(5).replace('-', '/')

/**
 * /kitchen/cookbook: every recipe. Shelves the app works out from each recipe (what it is, what it's built
 * on, how it's cooked, who loved it, what hasn't been cooked lately), sorts, search by name or ingredient,
 * "what can I make with", a pick for tonight's weather, the recipes opened lately on this phone, and
 * a surprise. Shelves, sorts and searches stay out of the address.
 */
export default function Cookbook({ book, family, parent, today }) {
  const session = useSession()
  const [prefs, update] = usePrefs()
  const [q, setQ] = useState(''), [shelf, setShelf] = useState(''), [have, setHave] = useState('')
  const bodies = useAllBodies(session, book.loaded && book.recipes.length > 0)
  const laurieWritten = useLaurieWritten(session, parent)
  const { forecast } = useWeather()
  const sort = prefs.cookbookSort || 'az', compact = prefs.cookbookView === 'list'
  const texts = useMemo(() => Object.fromEntries(book.recipes.map((r) => [r.id, recipeText(r, bodies[r.id] ? parsed(bodies[r.id]) : null)])), [book.recipes, bodies])
  const stats = useMemo(() => cookedStats(book.cooked), [book.cooked])
  const shelves = useMemo(() => shelvesFor(book.recipes, { texts, stats, ratings: book.ratings, members: family.members, today, laurieWritten }), [book.recipes, texts, stats, book.ratings, family.members, today, laurieWritten])
  const onShelf = shelf ? new Set((shelves.find((s) => s.key === shelf) || { ids: [] }).ids) : null
  const list = sortRecipes(searchRecipes(book.recipes.filter((r) => !onShelf || onShelf.has(r.id)), q, texts), sort, { ratings: book.ratings, stats })
  const pick = weatherPick(forecast), pickShelf = pick && shelves.find((s) => s.key === pick.shelf)
  const recent = readRecent().map((s) => book.recipes.find((r) => r.slug === s)).filter(Boolean).slice(0, 4)
  const made = makeWith(book.recipes, have, texts).slice(0, 8)
  const note = (r) => (stats[r.id] ? `cooked ${stats[r.id].count}× · last ${md(stats[r.id].last)}` : undefined)
  const tile = (r, n) => <RecipeTile key={r.id} r={r} ratings={book.ratings} members={family.members} note={n === undefined ? note(r) : n} />
  const go = () => { const r = surprise(list.length ? list : book.recipes); if (r) navigate(`/kitchen/recipe/${r.slug}`) }
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Kitchen</span>
        <h1 className="sr">Cookbook</h1>
        <KitchenMenu current="cookbook" parent={parent} big />
      </header>

      <Card tint="#E0662F" label="Find a recipe" glyph="pot" tag={book.loaded ? `${book.recipes.length} recipes` : undefined} className="span-6">
        <input type="search" className="book-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="A dish or an ingredient: “halibut”, “tempeh”…" aria-label="Find a recipe by name or ingredient" />
        <div className="cb-acts">
          <button type="button" className="btn ghost" onClick={go} disabled={!book.recipes.length}>Surprise me</button>
          {parent && <Link className="btn ghost" to="/kitchen/add">Add recipes</Link>}
          {parent && <Link className="btn ghost" to="/kitchen/write">Write one</Link>}
        </div>
      </Card>

      {pick && pickShelf && !q && !shelf && (
        <Card tint="#2F7F9A" label="For tonight" glyph="weather" className="span-6">
          <p>{pick.why}.</p>
          <div className="tiles">{sortRecipes(book.recipes.filter((r) => pickShelf.ids.includes(r.id)), 'rated', { ratings: book.ratings, stats }).slice(0, 3).map((r) => tile(r))}</div>
          <button type="button" className="btn ghost" onClick={() => setShelf(pickShelf.key)}>All {pickShelf.ids.length} {pickShelf.name.toLowerCase()} ›</button>
        </Card>
      )}

      {recent.length > 0 && !q && !shelf && (
        <Card tint="#8A5BC4" label="Opened lately" glyph="calendar" className="span-6">
          <div className="tiles">{recent.map((r) => tile(r))}</div>
        </Card>
      )}

      <Card tint="#C42D20" label={shelf ? (shelves.find((s) => s.key === shelf) || {}).name || 'Shelf' : q ? 'Found' : 'Every recipe'} glyph="pot" tag={book.loaded ? `${list.length}` : undefined} className="span-6">
        <div className="cb-shelves" role="group" aria-label="Shelves">
          <button type="button" aria-pressed={!shelf} onClick={() => setShelf('')}>All <small>{book.recipes.length}</small></button>
          {shelves.map((s) => <button key={s.key} type="button" aria-pressed={shelf === s.key} onClick={() => setShelf(shelf === s.key ? '' : s.key)}>{s.name} <small>{s.ids.length}</small></button>)}
        </div>
        <div className="cb-bar">
          <div className="cb-sorts" role="group" aria-label="Sort">{SORTS.map(([k, n]) => <button key={k} type="button" aria-pressed={sort === k} onClick={() => update({ cookbookSort: k })}>{n}</button>)}</div>
          <button type="button" className="cb-view" aria-pressed={compact} onClick={() => update({ cookbookView: compact ? 'tiles' : 'list' })}>{compact ? 'Pictures' : 'Short list'}</button>
        </div>
        {book.loaded && book.recipes.length === 0 && <p className="muted">No recipes yet.{parent ? ' Add the week’s from Obsidian, or write one.' : ''}</p>}
        {book.recipes.length > 0 && list.length === 0 && <p className="muted">Nothing matches{shelf ? ' on this shelf' : ''}.</p>}
        <div className={'tiles' + (compact ? ' compact' : '')}>{list.map((r) => tile(r))}</div>
      </Card>

      <Card tint="#3E7A4C" label="What can I make with…" glyph="star" className="span-6">
        <input type="text" className="book-search" value={have} onChange={(e) => setHave(e.target.value)} placeholder="What you have, with commas: tempeh, spinach, coconut milk" aria-label="Ingredients you have" />
        {have.trim() && !made.length && <p className="muted">Nothing in the cookbook uses those.</p>}
        <div className="tiles">{made.map((x) => tile(x.r, `uses ${x.hits} of ${x.of}`))}</div>
      </Card>
    </>
  )
}
