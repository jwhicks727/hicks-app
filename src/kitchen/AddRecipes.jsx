import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { useDraft } from '../lib/useDraft.js'
import { parseRecipe } from '../lib/kitchen/recipe.js'
import { saveRecipes } from '../lib/useKitchen.js'
import { timeWords } from './art.js'
import { Sheet } from '../ui/Sheet.jsx'
import Dropzone from '../ui/Dropzone.jsx'
import { askClaude, prepareUpload } from '../lib/claude.js'
import KitchenMenu from './KitchenMenu.jsx'

const TEXT = /\.(md|markdown|txt)$/i

/**
 * Adding recipes, every way they come: the week's files from Obsidian (open
 * or drop several), one pasted in, or a photo or screenshot of a recipe,
 * which Claude rewrites in Jason's format. A photographed recipe is never
 * saved on Claude's word: it is shown beside its picture with what to check
 * (conflicts with Laurie's rules, anything guessed), can be edited, and is
 * saved only once it has been approved.
 */
export default function AddRecipes({ parent, onSaved }) {
  const [draft, setDraft, clearDraft] = useDraft('kitchen.paste', { text: '' })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState(null)
  const all = [...files, ...(draft.text.trim() ? [{ name: 'Pasted', text: draft.text }] : [])]
  const previews = all.map((f) => ({ ...f, r: parseRecipe(f.text) }))
  const [reading, setReading] = useState(null), [zoom, setZoom] = useState(null)
  const unapproved = files.filter((f) => f.photo && !f.approved).length
  const edit = (i, patch) => setFiles((old) => old.map((f, k) => (k === i ? { ...f, ...patch } : f)))
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
      setFiles((old) => [...old, ...res.recipes.map((r) => ({ name: `From ${pic.name || 'a picture'}`, text: r.body, photo: true, approved: false, checks: r.checks || [], preview: up.preview }))])
    }
    setReading(null)
  }
  async function save() {
    if (unapproved) return
    setSaving(true)
    const res = await saveRecipes(all.map((f) => f.text))
    setSaving(false); setResults(res)
    if (res.every((r) => r.ok)) { clearDraft(); setFiles([]); onSaved() }
  }
  if (!parent) return <Card tint="#C42D20" label="Adding recipes" glyph="pot" className="span-6"><p>Jason and Laurie add recipes.</p></Card>
  return (
    <>
      <header className="hero span-6"><Crumb to="/kitchen">Kitchen</Crumb><span className="kicker">Kitchen</span><h1 className="greet">Add recipes</h1><KitchenMenu current="cookbook" parent={parent} /></header>
      <Card tint="#C42D20" label="Recipes in" glyph="pot" className="span-6">
        <p>The week’s files from Obsidian (several at once), a recipe pasted below, or a photo or screenshot of one. A recipe with the same title replaces the old one. “Laurie’s plate” is kept where only the two of you can read it.</p>
        <Dropzone accept=".md,.markdown,.txt,text/markdown,text/plain,image/*" multiple label="Recipe files, or a photo of a recipe" hint="Drop files here, paste a screenshot, or choose them." onFiles={take} onText={(t) => setDraft({ text: t })} disabled={Boolean(reading && reading.endsWith('…'))} />
        <p className="muted small">A photo or screenshot goes to Claude (Anthropic) to be rewritten in your format, with Laurie’s food rules and the kitchen’s preferences, so her plate is checked against them. You read it and approve it before anything is saved. Files and pasted text stay in the app.</p>
        {reading && <p className="muted" role="status">{reading}</p>}
        <div className="form"><label>Or paste a recipe<textarea rows={8} value={draft.text} onChange={(e) => setDraft({ text: e.target.value })} placeholder={'# The dish\n\n**Ratings —** L: /5 · J: /5 · A: /5\n…'} /></label></div>
      </Card>
      {files.some((f) => f.photo) && (
        <Card tint="#E0662F" label="Check what Claude read" glyph="star" className="span-6">
          <p className="muted small">Read it against the picture. Fix anything in the text, then approve it. Nothing is saved until every one is approved.</p>
          {files.map((f, i) => f.photo && (
            <div key={i} className={'rv' + (f.approved ? ' ok' : '')}>
              <div className="rv-head">
                {f.preview && <button type="button" className="rv-pic" aria-label="Show the picture larger" onClick={() => setZoom(f.preview)} style={{ backgroundImage: `url(${f.preview})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
                <b>{parseRecipe(f.text).title}</b>
              </div>
              {f.checks.length > 0 ? <><b>Look at these</b><ul className="rv-checks warn">{f.checks.map((c, k) => <li key={k}>{c}</li>)}</ul></> : <span className="muted small">Claude found nothing to flag. Still read it against the picture.</span>}
              <label>The recipe, as it will be saved<textarea value={f.text} onChange={(e) => edit(i, { text: e.target.value, approved: false })} spellCheck="false" /></label>
              <span className="muted small">After saving, open it and tap Ask: Claude can check it against Laurie’s rules and propose changes you confirm.</span>
              <label className="check-row"><input type="checkbox" checked={f.approved} onChange={(e) => edit(i, { approved: e.target.checked })} /> This matches the picture, and I’ve read the flags</label>
              <button type="button" className="btn ghost" onClick={() => setFiles((old) => old.filter((_, k) => k !== i))}>Not this one</button>
            </div>
          ))}
        </Card>
      )}
      {zoom && <Sheet title="The picture" onClose={() => setZoom(null)}><img src={zoom} alt="The photographed recipe" style={{ width: '100%', borderRadius: 4 }} /></Sheet>}
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
          <button type="button" className="btn" disabled={saving || unapproved > 0} onClick={save}>{saving ? 'Saving…' : unapproved ? `Approve ${unapproved === 1 ? 'the photographed recipe' : `the ${unapproved} photographed recipes`} first` : `Save ${previews.length === 1 ? 'it' : `all ${previews.length}`}`}</button>
          {results && <ul className="coming">{results.map((r, i) => <li key={i}>{r.ok ? <Link to={`/kitchen/recipe/${r.slug}`}>{r.title}</Link> : <span className="err">{r.title}: {r.error}</span>}</li>)}</ul>}
        </Card>
      )}
    </>
  )
}
