import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { useDraft } from '../lib/useDraft.js'
import { parseRecipe } from '../lib/kitchen/recipe.js'
import { saveRecipes } from '../lib/useKitchen.js'
import { timeWords } from './art.js'
import Dropzone from '../ui/Dropzone.jsx'
import { askClaude, prepareUpload } from '../lib/claude.js'

const TEXT = /\.(md|markdown|txt)$/i

/**
 * Adding recipes, every way they come: the week's files from Obsidian (open
 * or drop several), one pasted in, or a photo or screenshot of a recipe,
 * which Claude rewrites in Jason's format for him to check before saving.
 */
export default function AddRecipes({ parent, onSaved }) {
  const [draft, setDraft, clearDraft] = useDraft('kitchen.paste', { text: '' })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState(null)
  const all = [...files, ...(draft.text.trim() ? [{ name: 'Pasted', text: draft.text }] : [])]
  const previews = all.map((f) => ({ ...f, r: parseRecipe(f.text) }))
  const [reading, setReading] = useState(null)
  async function take(list) {
    const texts = list.filter((f) => TEXT.test(f.name) || f.type.startsWith('text/')).filter((f) => f.size < 200000).slice(0, 30)
    const pictures = list.filter((f) => f.type.startsWith('image/')).slice(0, 4)
    const read = await Promise.all(texts.map(async (f) => ({ name: f.name, text: await f.text() })))
    setFiles((old) => [...old, ...read])
    for (const pic of pictures) {
      setReading(`Reading ${pic.name || 'the picture'}…`)
      const up = await prepareUpload(pic, { max: 2000 })
      const res = await askClaude('recipe-from-image', { file: { data: up.data, media_type: up.media_type } })
      if (res.error) { setReading(res.error); return }
      if (!res.recipes || !res.recipes.length) { setReading('Claude didn’t find a recipe in that picture.'); return }
      setFiles((old) => [...old, ...res.recipes.map((r) => ({ name: `From ${pic.name || 'a picture'}`, text: r.body }))])
    }
    setReading(null)
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
      <Card tint="#C42D20" label="Recipes in" glyph="pot" className="span-6">
        <p>The week’s files from Obsidian (several at once), a recipe pasted below, or a photo or screenshot of one. A recipe with the same title replaces the old one. “Laurie’s plate” is kept where only the two of you can read it.</p>
        <Dropzone accept=".md,.markdown,.txt,text/markdown,text/plain,image/*" multiple label="Recipe files, or a photo of a recipe" hint="Drop files here, paste a screenshot, or choose them." onFiles={take} onText={(t) => setDraft({ text: t })} disabled={Boolean(reading && reading.endsWith('…'))} />
        <p className="muted small">A photo or screenshot goes to Claude (Anthropic) to be rewritten in your format; files and pasted text stay in the app.</p>
        {reading && <p className="muted" role="status">{reading}</p>}
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
