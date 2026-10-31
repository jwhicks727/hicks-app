import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { useSession } from '../lib/auth.js'
import { useDraft } from '../lib/useDraft.js'
import { askClaude } from '../lib/claude.js'
import { useWeekPlan, savePlan } from '../lib/useKitchenPlan.js'
import { weekOf, mergeIdeas } from '../lib/kitchen/plan.js'
import { parseRecipe } from '../lib/kitchen/recipe.js'
import { saveRecipes, addToFridge } from '../lib/useKitchen.js'
import { timeWords } from './art.js'

const MEAL = { dinner: 'Dinner', breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dessert: 'Dessert', other: 'Other' }

/**
 * /kitchen/plan: the week, the way Jason has always run it. Ask for some
 * one-line ideas (ten unless changed, and anything added to the ask:
 * breakfasts, a slow-cooker night); pick the ones to make; Claude writes them
 * in his format; save them to the cookbook and the fridge. The ideas and
 * picks are kept with the week; the written recipes on the device until saved.
 */
export default function PlanWeek({ parent, me, today }) {
  const session = useSession()
  const week = weekOf(today)
  const plans = useWeekPlan(session, week)
  const plan = plans.rows[0] || null
  const [ask, setAsk] = useDraft('kitchen.plan.ask', { count: 10, asked: '' })
  const [written, setWritten, clearWritten] = useDraft(`kitchen.plan.written.${week}`, { recipes: [] })
  const [busy, setBusy] = useState(null), [err, setErr] = useState(null), [fridgeToo, setFridgeToo] = useState(true), [saved, setSaved] = useState(null)
  const ideas = plan ? plan.ideas : []
  const picked = plan ? plan.picked : []

  if (!parent) return <Card tint="#C42D20" label="Planning the week" glyph="pot" className="span-6"><p>Jason and Laurie plan the week.</p></Card>

  async function getIdeas(more = false) {
    setBusy(more ? 'Asking for more…' : 'Asking for ideas…'); setErr(null)
    const res = await askClaude('plan-week', { count: ask.count, asked: ask.asked + (more && ideas.length ? `\nAlready on the list (give different ones): ${ideas.map((i) => i.title).join('; ')}` : '') })
    if (res.error) { setErr(res.error); setBusy(null); return }
    const next = mergeIdeas(more ? ideas : [], res.ideas || [])
    const { error } = await savePlan(more ? plan : null, { ideas: next, picked: more ? picked : [], asked: ask.asked || null, status: 'ideas' }, week, me)
    if (error) setErr(error.message)
    setBusy(null); plans.reload()
  }
  async function toggle(i) {
    const next = picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i].sort((a, b) => a - b)
    await savePlan(plan, { picked: next, status: next.length ? 'picked' : 'ideas' }, week, me)
    plans.reload()
  }
  async function write() {
    const chosen = picked.map((i) => ideas[i]).filter(Boolean)
    setBusy(`Writing ${chosen.length} ${chosen.length === 1 ? 'recipe' : 'recipes'} in your format… a minute or two.`); setErr(null)
    const res = await askClaude('write-recipes', { ideas: chosen })
    setBusy(null)
    if (res.error) { setErr(res.error); return }
    setWritten({ recipes: (res.recipes || []).map((r) => r.body) })
  }
  async function saveAll() {
    setBusy('Saving…')
    const res = await saveRecipes(written.recipes)
    if (fridgeToo) for (const r of res) if (r.ok && r.id) await addToFridge(r.id, today)
    if (plan) await savePlan(plan, { status: 'written' }, week, me)
    setBusy(null); setSaved(res)
    if (res.every((r) => r.ok)) clearWritten()
    plans.reload()
  }

  const previews = written.recipes.map((md) => ({ md, r: parseRecipe(md) }))
  return (
    <>
      <header className="hero span-6"><Crumb to="/kitchen">Kitchen</Crumb><span className="kicker">Kitchen · week of {week.slice(5).replace('-', '/')}</span><h1 className="greet">Plan the week</h1></header>

      <Card tint="#C42D20" label="Ask" glyph="pot" className="span-3">
        <div className="form">
          <div className="plan-count" role="group" aria-label="How many ideas">
            <span>Ideas</span>
            <button type="button" className="sit-step" onClick={() => setAsk({ ...ask, count: Math.max(1, ask.count - 1) })} aria-label="One fewer">−</button>
            <b className="fig">{ask.count}</b>
            <button type="button" className="sit-step" onClick={() => setAsk({ ...ask, count: Math.min(20, ask.count + 1) })} aria-label="One more">+</button>
          </div>
          <label>Anything to add to the ask<textarea rows={3} maxLength={1500} value={ask.asked} onChange={(e) => setAsk({ ...ask, asked: e.target.value })} placeholder="Three breakfasts too · a slow-cooker night · my hands are sore this week · something Anna’s friend would eat Friday" /></label>
        </div>
        <button type="button" className="btn" disabled={Boolean(busy)} onClick={() => getIdeas(false)}>{ideas.length ? 'Start over with new ideas' : 'Get ideas'}</button>
        <p className="muted small">Sends this, the kitchen’s preferences and the cookbook’s titles to Claude (Anthropic); Laurie’s food rules too, only if she has said yes in <Link to="/kitchen/rules">Rules &amp; preferences</Link>.</p>
      </Card>

      {ideas.length > 0 && (
        <Card tint="#E0662F" label="Pick" glyph="star" tag={`${picked.length} of ${ideas.length} picked`} className="span-3">
          <ul className="ideas">
            {ideas.map((idea, i) => (
              <li key={i}>
                <button type="button" className="idea" aria-pressed={picked.includes(i)} onClick={() => toggle(i)}>
                  <span className="idea-t"><b>{idea.title}</b>{idea.line && <span>{idea.line}</span>}</span>
                  <span className="idea-tags">{idea.meal && idea.meal !== 'dinner' && <em>{MEAL[idea.meal]}</em>}{idea.again && <em className="again">Again</em>}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="form-actions">
            <button type="button" className="btn" disabled={!picked.length || Boolean(busy)} onClick={write}>Write the {picked.length || ''} picked</button>
            <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={() => getIdeas(true)}>More ideas</button>
          </div>
        </Card>
      )}

      {busy && <p className="span-6 plan-busy" role="status"><span className="plan-dot" aria-hidden="true" />{busy}</p>}
      {err && <p className="span-6 err" role="alert">{err}</p>}

      {previews.length > 0 && (
        <Card tint="#3E7A4C" label="Written" glyph="pot" tag={`${previews.length}`} className="span-6">
          <ul className="sources">
            {previews.map((p, i) => (
              <li key={i} className={'source ' + (p.r.warnings.length ? 'soon' : 'ok')}>
                <div className="source-t"><b>{p.r.title}</b><span>{[timeWords(p.r.total), p.r.serves && `serves ${p.r.serves}`, `${p.r.groups.flat().length} ingredients`, `${p.r.steps.length} steps`].filter(Boolean).join(' · ')}{p.r.laurie ? ' · Laurie’s plate kept private' : ''}</span>
                  {p.r.warnings.length > 0 && <span className="nudge">{p.r.warnings.join('. ')}.</span>}
                  <details><summary>Read it</summary><pre className="plan-md">{p.md}</pre></details>
                </div>
              </li>
            ))}
          </ul>
          <label className="check-row"><input type="checkbox" checked={fridgeToo} onChange={(e) => setFridgeToo(e.target.checked)} /> And put them in the fridge for this week</label>
          <div className="form-actions">
            <button type="button" className="btn" disabled={Boolean(busy)} onClick={saveAll}>Save to the cookbook</button>
            <button type="button" className="btn ghost" onClick={clearWritten}>Not these</button>
          </div>
        </Card>
      )}
      {saved && <Card tint="#3E7A4C" label="Saved" glyph="star" className="span-6"><ul className="coming">{saved.map((r, i) => <li key={i}>{r.ok ? <Link to={`/kitchen/recipe/${r.slug}`}>{r.title}</Link> : <span className="err">{r.title}: {r.error}</span>}</li>)}</ul></Card>}
    </>
  )
}
