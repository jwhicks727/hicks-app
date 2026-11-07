import { useCurrentTrip, tagToTrip } from './TripTag.jsx'
import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { navigate } from '../lib/router.js'
import { useDraft } from '../lib/useDraft.js'
import { parseRecipe, withLauriePlate } from '../lib/kitchen/recipe.js'
import { saveRecipes } from '../lib/useKitchen.js'
import { timeWords } from './art.js'
import KitchenMenu from './KitchenMenu.jsx'

// A recipe in Jason's format, written or changed by hand (parents). The same Markdown the app reads
// everywhere, with a live "this is how it reads" under it so a slip shows before saving.
const TEMPLATE = `# Recipe name

**Ratings —** L: /5 · J: /5 · A: /5

**Total time:** 45 min (20 min hands-on) · **Serves:** 4

## Ingredients
- 1 lb thing
- 2 Tbsp another thing

- 1 cup something from the pantry

## Steps
**1. (10 min)** What to do first.
**2. (35 min)** What to do next.

**Laurie’s plate**
Say what is on her plate, and what it leaves out.
`

/** /kitchen/write (a new recipe) and /kitchen/recipe/<slug>/edit (this one, changed). */
export default function RecipeEditor({ slug, data, parent }) {
  const start = slug ? (data && data.recipe ? withLauriePlate(data.recipe.body, data.laurie) : null) : TEMPLATE
  const [draft, setDraft, clear] = useDraft(`recipe.edit.${slug || 'new'}`, { text: null })
  const [busy, setBusy] = useState(false), [err, setErr] = useState(null)
  const back = slug ? `/kitchen/recipe/${slug}` : '/kitchen'
  // On a trip, a new recipe is tagged to it unless unticked (Jason's ask: the scrapbook keeps it)
  const { trip } = useCurrentTrip()
  const [fromTrip, setFromTrip] = useState(true)
  if (!parent) return <><header className="hero span-6"><KitchenMenu current="cookbook" parent={parent} /></header><Card tint="#C42D20" label="Recipes" glyph="pot" className="span-6"><p>Only a parent can write or change a recipe.</p></Card></>
  if (slug && (!data || !data.loaded)) return <p className="muted span-6">Opening the recipe…</p>
  if (slug && start == null) return <><header className="hero span-6"><KitchenMenu current="cookbook" parent={parent} /></header><Card tint="#C42D20" label="Not found" glyph="pot" className="span-6"><p>No recipe at this address.</p></Card></>
  const text = draft.text == null ? start : draft.text
  const r = parseRecipe(text)
  const count = r.groups.reduce((n, g) => n + g.length, 0)
  async function save() {
    setBusy(true); setErr(null)
    const [res] = await saveRecipes([slug ? { md: text, slug } : text])
    setBusy(false)
    if (!res || res.error) { setErr(res ? res.error : 'Nothing was saved.'); return }
    if (!slug && trip && fromTrip && res.id) await tagToTrip(trip, res.id, null, 'found')
    clear(); navigate(`/kitchen/recipe/${res.slug}`, { replace: true })
  }
  return (
    <>
      <header className="hero span-6"><span className="kicker">Kitchen</span><h1 className="greet">{slug ? 'Edit recipe' : 'Write a recipe'}</h1><KitchenMenu current="cookbook" parent={parent} /></header>
      <Card tint="#E0662F" label="The recipe" glyph="pot" className="span-3 re-card">
        <label className="re-label">Its text, in the Kitchen’s format
          <textarea className="re-text" value={text} spellCheck="true" onChange={(e) => setDraft({ text: e.target.value })} aria-describedby="re-help" />
        </label>
        <p id="re-help" className="muted small">One ingredient a line, starting with “- ”; a blank line between groups; steps like “**1. (10 min)** …”. Laurie’s plate is kept private and only the parents see it.</p>
      </Card>
      <Card tint="#3E7A4C" label="How it reads" glyph="star" className="span-3">
        <dl className="place-facts">
          <div><dt>Name</dt><dd>{r.title}</dd></div>
          <div><dt>Time</dt><dd>{r.total != null ? timeWords(r.total) : 'not said'}{r.handsOn != null ? ` (${timeWords(r.handsOn)} hands-on)` : ''}</dd></div>
          <div><dt>Serves</dt><dd className="fig">{r.serves || 'not said'}</dd></div>
          <div><dt>Ingredients</dt><dd className="fig">{count} in {r.groups.length} {r.groups.length === 1 ? 'group' : 'groups'}</dd></div>
          <div><dt>Steps</dt><dd className="fig">{r.steps.length}</dd></div>
          <div><dt>Laurie’s plate</dt><dd>{r.laurie ? 'written' : 'none yet'}</dd></div>
        </dl>
        {r.warnings.length > 0 && <ul className="re-warn">{r.warnings.slice(0, 6).map((w, i) => <li key={i}>{w}</li>)}</ul>}
      </Card>
      {!slug && trip && <label className="span-6 kt-tick"><input type="checkbox" checked={fromTrip} onChange={(e) => setFromTrip(e.target.checked)} /> From our trip to {trip.town}: it goes in the trip’s scrapbook</label>}
      <div className="span-6 form-actions">
        <button type="button" className="btn" disabled={busy || !text.trim()} onClick={save}>{busy ? 'Saving…' : 'Save the recipe'}</button>
        <button type="button" className="btn ghost" onClick={() => { clear(); navigate(back) }}>Cancel</button>
      </div>
      {err && <p className="err span-6" role="alert">{err}</p>}
    </>
  )
}
