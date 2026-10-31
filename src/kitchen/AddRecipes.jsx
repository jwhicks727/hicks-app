import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { useDraft } from '../lib/useDraft.js'
import { parseRecipe } from '../lib/kitchen/recipe.js'
import { saveRecipes } from '../lib/useKitchen.js'
import { timeWords } from './art.js'

/** Adding recipes: paste one, or open the week's files from Obsidian at once. */
export default function AddRecipes({ parent, onSaved }) {
  const [draft, setDraft, clearDraft] = useDraft('kitchen.paste', { text: '' })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState(null)
  const all = [...files, ...(draft.text.trim() ? [{ name: 'Pasted', text: draft.text }] : [])]
  const previews = all.map((f) => ({ ...f, r: parseRecipe(f.text) }))
  async function open(e) {
    const picked = [...e.target.files].filter((f) => f.size < 200000).slice(0, 30)
    setFiles(await Promise.all(picked.map(async (f) => ({ name: f.name, text: await f.text() }))))
  }
  async function save() {
    setSaving(true)
    const res = await saveRecipes(all.map((f) => f.text))
    setSaving(false); setResults(res)
    if (res.every((r) => r.ok)) { clearDraft(); setFiles([]); onSaved() }
  }
  if (!parent) return <Card tint="#C42D20" label="Adding recipes" glyph="pot" className="span-6"><p>Jason and Laurie add recipes.</p></Card>
  return (
    <>
      <header className="hero span-6"><Crumb to="/kitchen">Kitchen</Crumb><span className="kicker">Kitchen</span><h1 className="greet">Add recipes</h1></header>
      <Card tint="#C42D20" label="From Obsidian" glyph="pot" className="span-6">
        <p>Open the week’s recipe files (you can pick several), or paste one below. A recipe with the same title replaces the old one. “Laurie’s plate” is kept where only the two of you can read it.</p>
        <label className="file-pick btn ghost">Open recipe files<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" multiple onChange={open} /></label>
        <div className="form"><label>Or paste a recipe<textarea rows={8} value={draft.text} onChange={(e) => setDraft({ text: e.target.value })} placeholder={'# The dish\n\n**Ratings —** L: /5 · J: /5 · A: /5\n…'} /></label></div>
      </Card>
      {previews.length > 0 && (
        <Card tint="#E0662F" label="Ready to save" glyph="star" tag={`${previews.length}`} className="span-6">
          <ul className="sources">
            {previews.map((p, i) => (
              <li key={i} className={'source ' + (p.r.warnings.length ? 'soon' : 'ok')}>
                <div className="source-t"><b>{p.r.title}</b><span>{p.name} · {[timeWords(p.r.total), p.r.serves && `serves ${p.r.serves}`, `${p.r.groups.flat().length} ingredients`, `${p.r.steps.length} steps`].filter(Boolean).join(' · ')}{p.r.laurie ? ' · Laurie’s plate kept private' : ''}</span>
                  {p.r.warnings.length > 0 && <span className="nudge">{p.r.warnings.join('. ')}.</span>}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="btn" disabled={saving} onClick={save}>{saving ? 'Saving…' : `Save ${previews.length === 1 ? 'it' : `all ${previews.length}`}`}</button>
          {results && <ul className="coming">{results.map((r, i) => <li key={i}>{r.ok ? <Link to={`/kitchen/recipe/${r.slug}`}>{r.title}</Link> : <span className="err">{r.title}: {r.error}</span>}</li>)}</ul>}
        </Card>
      )}
    </>
  )
}
