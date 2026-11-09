import { useEffect, useRef, useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { Toast, Working } from '../ui/Toast.jsx'
import KitchenMenu from './KitchenMenu.jsx'
import { Link } from '../shell/Link.jsx'
import { useSession } from '../lib/auth.js'
import { useDraft } from '../lib/useDraft.js'
import { askClaude } from '../lib/claude.js'
import { usePlans, savePlan, dismissPlan } from '../lib/useKitchenPlan.js'
import { usePlanWritten } from '../lib/usePlanWritten.js'
import { weekOf, mergeIdeas, removeIdea, restoreIdea, refreshIdeas, notPicked, openPlan, planAge } from '../lib/kitchen/plan.js'
import { parseRecipe } from '../lib/kitchen/recipe.js'
import { saveRecipes, addToFridge } from '../lib/useKitchen.js'
import { timeWords } from './art.js'
import { useMemberPhones } from '../lib/useMemberPhones.js'
import { listText, smsLink, normalizePhone, picksFromReply } from '../lib/kitchen/text.js'

const MEAL = { dinner: 'Dinner', breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dessert: 'Dessert', other: 'Other' }
const statusOf = (picked) => (picked.length ? 'picked' : 'ideas')

/**
 * /kitchen/plan: the week, the way Jason has always run it. Ask for some
 * one-line ideas (ten unless changed, and anything added to the ask:
 * breakfasts, a slow-cooker night); pick the ones to make; Claude writes them
 * in his format; save them to the cookbook and the fridge. The ideas and
 * picks are kept with the plan, and so are the written recipes (here and in
 * the database) until they're saved to the cookbook or put away. A plan is
 * never looked up by the calendar week: a list waiting on Laurie's answer is
 * still here a week later, until someone puts it away.
 * The ideas are numbered, so the list can be texted to Laurie in one tap and
 * she can answer "1, 3, 8", which Jason types back to pick those.
 *
 * The list is tended a little at a time: add one more idea, refresh the ones
 * not picked, or take one off with its ✕ (an Undo, never a question). Only
 * starting over, which wipes the list, asks first.
 */
export default function PlanWeek({ parent, me, members = [], today }) {
  const session = useSession()
  const week = weekOf(today)
  const plans = usePlans(session)
  const plan = openPlan(plans.rows)
  const [ask, setAsk] = useDraft('kitchen.plan.ask', { count: 10, asked: '' })
  const [writtenRecipes, setWrittenRecipes, clearWritten] = usePlanWritten(plan)
  const written = { recipes: writtenRecipes }
  const setWritten = (v) => setWrittenRecipes(v.recipes)
  const [putAway, setPutAway] = useState(false)
  const [busy, setBusy] = useState(null), [err, setErr] = useState(null), [fridgeToo, setFridgeToo] = useState(true), [saved, setSaved] = useState(null)
  // Who the list can be texted to: each remembered by number (Anna's is her Apple Watch's)
  const people = ['Laurie', 'Anna'].map((n) => members.find((m) => m.name === n)).filter(Boolean)
  const phones = useMemberPhones(session, parent)
  const [reply, setReply] = useState(''), [replyNote, setReplyNote] = useState(null), [copied, setCopied] = useState(false)
  const [clearing, setClearing] = useState(false), [wiping, setWiping] = useState(false), [undo, setUndo] = useState(null), [arrived, setArrived] = useState([])
  // Titles taken off the list or swapped out on this visit, so a new idea doesn't bring one back
  const [setAside, setSetAside] = useState([])

  // The list as just changed here, shown at once and built on by the next tap,
  // until the saved copy has been read back. Saves go one after another.
  const [view, setView] = useState(null)
  const pending = useRef(null), row = useRef(null), inFlight = useRef(0), queue = useRef(Promise.resolve(true))
  useEffect(() => { if (!inFlight.current) { setView(null); pending.current = null; row.current = null } }, [plans.rows])
  useEffect(() => { if (!arrived.length) return undefined; const t = setTimeout(() => setArrived([]), 1600); return () => clearTimeout(t) }, [arrived])
  const shown = view || (plan ? { ideas: plan.ideas || [], picked: plan.picked || [] } : { ideas: [], picked: [] })
  const { ideas, picked } = shown
  const spare = notPicked(ideas, picked)

  if (!parent) return <Card tint="#C42D20" label="Planning the week" glyph="pot" className="span-6"><p>Jason and Laurie plan the week.</p></Card>

  const now = () => pending.current || shown
  const aside = (titles) => setSetAside((s) => [...s, ...titles].slice(-40))
  const skipFor = (list) => [...list.map((i) => i.title), ...setAside]

  /** Show a change at once and save it after any save still going; true once saved. */
  function change(next, { fresh = false, ...extra } = {}) {
    pending.current = next; setView(next); inFlight.current += 1
    const job = queue.current.then(async () => {
      const { data, error } = await savePlan(fresh ? null : row.current || plan, { ideas: next.ideas, picked: next.picked, status: statusOf(next.picked), ...extra }, week, me)
      if (error) { setErr(error.message); return false }
      if (data) row.current = data
      return true
    })
    queue.current = job.catch(() => false)
    return job.catch(() => false).finally(() => { inFlight.current -= 1; if (!inFlight.current) plans.reload() })
  }

  async function startOver() {
    const old = now().ideas
    setWiping(false); setUndo(null); setErr(null)
    setBusy(old.length ? `Starting over with ${ask.count} new ideas…` : `Asking for ${ask.count} ideas…`)
    const res = await askClaude('plan-week', { count: ask.count, asked: ask.asked, skip: skipFor(old) })
    if (res.error) { setErr(res.error); setBusy(null); return }
    const next = mergeIdeas([], res.ideas || [])
    if (!next.length) { setErr('No ideas came back. Try again in a moment.'); setBusy(null); return }
    aside(old.map((i) => i.title))
    const was = row.current || plan
    await change({ ideas: next, picked: [] }, { fresh: true, asked: ask.asked || null })
    if (was && was.id) { await dismissPlan(was); clearWritten() }
    setBusy(null)
  }
  async function addOne() {
    const cur = now()
    if (undo && undo.kind === 'refresh') setUndo(null)
    setBusy('Thinking of one more…'); setErr(null)
    const res = await askClaude('plan-week', { count: 1, asked: ask.asked, skip: skipFor(cur.ideas) })
    if (res.error) { setErr(res.error); setBusy(null); return }
    const next = mergeIdeas(cur.ideas, res.ideas || []).slice(0, cur.ideas.length + 1)
    if (next.length === cur.ideas.length) { setErr(cur.ideas.length >= 40 ? 'The list holds 40 at most.' : 'That one was already on the list. Try again?'); setBusy(null); return }
    setArrived([next[next.length - 1].title])
    await change({ ideas: next, picked: cur.picked })
    setBusy(null)
  }
  async function refresh() {
    const cur = now(), n = notPicked(cur.ideas, cur.picked)
    if (!n) return
    setUndo(null); setErr(null)
    setBusy(cur.picked.length ? `Swapping the ${n} not picked…` : `Swapping all ${n}…`)
    const res = await askClaude('plan-week', { count: Math.min(20, n), asked: ask.asked, skip: skipFor(cur.ideas) })
    if (res.error) { setErr(res.error); setBusy(null); return }
    const r = refreshIdeas(cur.ideas, cur.picked, res.ideas || [])
    if (!r.swapped) { setErr('No new ideas came back. Try again in a moment.'); setBusy(null); return }
    aside(cur.ideas.filter((_, i) => !cur.picked.includes(i)).map((i) => i.title))
    setArrived(r.ideas.filter((_, i) => !r.picked.includes(i)).map((i) => i.title))
    if (await change({ ideas: r.ideas, picked: r.picked })) setUndo({ id: Date.now(), kind: 'refresh', text: `Swapped ${r.swapped} ${r.swapped === 1 ? 'idea' : 'ideas'}.`, before: cur })
    setBusy(null)
  }
  function remove(i) {
    const cur = now(), r = removeIdea(cur.ideas, cur.picked, i)
    if (!r.removed) return
    aside([r.removed.idea.title])
    setUndo({ id: Date.now(), kind: 'remove', text: `Took “${r.removed.idea.title}” off the list.`, removed: r.removed })
    change({ ideas: r.ideas, picked: r.picked })
  }
  function undoIt() {
    const u = undo
    setUndo(null)
    if (!u) return
    const cur = now()
    const back = u.kind === 'remove' ? restoreIdea(cur.ideas, cur.picked, u.removed) : u.before
    setSetAside((s) => s.filter((t) => !back.ideas.some((i) => i.title === t)))
    change(back)
  }
  function toggle(i) {
    const cur = now()
    if (undo && undo.kind === 'refresh') setUndo(null)
    const next = cur.picked.includes(i) ? cur.picked.filter((x) => x !== i) : [...cur.picked, i].sort((a, b) => a - b)
    change({ ideas: cur.ideas, picked: next })
  }
  async function pickFromReply(e) {
    e.preventDefault()
    const cur = now(), next = picksFromReply(reply, cur.ideas.length)
    if (!next.length) { setReplyNote(`No numbers from 1 to ${cur.ideas.length} in that.`); return }
    if (undo && undo.kind === 'refresh') setUndo(null)
    change({ ideas: cur.ideas, picked: next })
    setReplyNote(`Picked ${next.map((i) => i + 1).join(', ')}.`); setReply('')
  }
  async function putListAway() {
    setPutAway(false); setUndo(null); setErr(null); setReplyNote(null)
    const was = row.current || plan
    if (!was) return
    const { error } = await dismissPlan(was)
    if (error) { setErr(/dismissed_at|schema cache/i.test(error.message) ? 'The newest migration hasn’t been run yet (docs/MORNING.md, step 11).' : error.message); return }
    clearWritten(); setView(null); pending.current = null; row.current = null; plans.reload()
  }
  async function clearList() {
    const cur = now()
    setClearing(false); setUndo(null); setErr(null); setReplyNote(null)
    aside(cur.ideas.map((i) => i.title))
    await change({ ideas: [], picked: [] })
  }
  async function copyList() {
    try { await navigator.clipboard.writeText(listText(ideas, week)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setCopied(false) }
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
      <header className="hero span-6"><span className="kicker">Kitchen · week of {(plan ? plan.week_of : week).slice(5).replace('-', '/')}</span><h1 className="greet">Weekly planner</h1><KitchenMenu current="plan" parent={parent} /></header>

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
        <button type="button" className="btn" disabled={Boolean(busy)} onClick={() => (ideas.length ? setWiping(true) : startOver())}>{ideas.length ? 'Start over with new ideas' : 'Get ideas'}</button>
        <p className="muted small">Sends this, the kitchen’s preferences and the cookbook’s titles to Claude (Anthropic), and Laurie’s food rules too, from <Link to="/kitchen/rules">Rules &amp; preferences</Link>.</p>
      </Card>

 {planAge(plan, week) && ideas.length > 0 && <p className="span-6 plan-old" role="status">This list is from {planAge(plan, week)}. It stays here, with its picks and any recipes written from it, until you put it away.</p>}
      {ideas.length > 0 && (
        <Card tint="#E0662F" label="Pick" glyph="star" tag={`${picked.length} of ${ideas.length} picked`} className="span-3">
          <ul className="ideas">
            {ideas.map((idea, i) => (
              <li key={idea.title} className={'idea-row' + (arrived.includes(idea.title) ? ' idea-new' : '')}>
                <button type="button" className="idea" aria-pressed={picked.includes(i)} disabled={Boolean(busy)} onClick={() => toggle(i)}>
                  <span className="idea-n fig" aria-hidden="true">{i + 1}</span>
                  <span className="idea-t"><b>{idea.title}</b>{idea.line && <span>{idea.line}</span>}</span>
                  <span className="idea-tags">{idea.meal && idea.meal !== 'dinner' && <em>{MEAL[idea.meal]}</em>}{idea.again && <em className="again">Again</em>}</span>
                </button>
                <button type="button" className="idea-x" disabled={Boolean(busy)} aria-label={`Take “${idea.title}” off the list`} onClick={() => remove(i)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </button>
              </li>
            ))}
          </ul>
          <div className="plan-text">
            <b>{people.length ? 'Let the family choose' : 'Send the list'}</b>
            <div className="form-actions">
              {people.map((m) => <a key={m.id} className="btn ghost" href={smsLink(phones.phones[m.id], listText(ideas, week))}>{phones.phones[m.id] ? `Text the list to ${m.name}` : `Text the list (${m.name})`}</a>)}
              {!people.length && <a className="btn ghost" href={smsLink(null, listText(ideas, week))}>Text the list</a>}
              <button type="button" className="btn ghost" onClick={copyList}>{copied ? 'Copied' : 'Copy the list'}</button>
            </div>
            <span className="muted small">Opens your Messages with the numbered list; the message goes from your phone, not through this app.</span>
            <form className="plan-reply" onSubmit={pickFromReply}>
              <label>Their reply<input inputMode="text" autoComplete="off" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="1, 3, 8" /></label>
              <button type="submit" className="btn ghost" disabled={!reply.trim()}>Pick those</button>
            </form>
            {replyNote && <span className="muted small" role="status">{replyNote}</span>}
            {people.map((m) => <PhoneRow key={m.id} person={m} phone={phones.phones[m.id] || null} save={phones.save} />)}
          </div>
          <div className="form-actions">
            <button type="button" className="btn" disabled={!picked.length || Boolean(busy)} onClick={write}>Write the {picked.length || ''} picked</button>
            <button type="button" className="btn ghost" disabled={Boolean(busy) || ideas.length >= 40} onClick={addOne}>Add an idea</button>
            <button type="button" className="btn ghost" disabled={Boolean(busy) || !spare} onClick={refresh}>Refresh the list</button>
            <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={() => setClearing(true)}>Clear list</button>
            <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={() => setPutAway(true)}>Put this list away</button>
          </div>
          <p className="muted small">{picked.length ? (spare ? `Refresh keeps the ${picked.length} picked and swaps the other ${spare}.` : 'Everything on the list is picked, so there’s nothing to refresh.') : 'Refresh swaps every idea on the list; pick the ones to keep first.'}</p>
        </Card>
      )}

      {busy && <Working>{busy}</Working>}
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
          <label className="check-row"><input type="checkbox" checked={fridgeToo} onChange={(e) => setFridgeToo(e.target.checked)} /> And add them to this week: on the Hunt & gather list until they’re shopped for</label>
          <div className="form-actions">
            <button type="button" className="btn" disabled={Boolean(busy)} onClick={saveAll}>Save to the cookbook</button>
            <button type="button" className="btn ghost" onClick={clearWritten}>Not these</button>
          </div>
        </Card>
      )}
      {wiping && (
        <Confirm title="Start over?" yes="Wipe the list" danger onYes={startOver} onNo={() => setWiping(false)}>
          <p>The {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'} on the list now go{picked.length ? `, with the ${picked.length} picked` : ''}, and Claude suggests {ask.count} new ones.</p>
          {picked.length > 0 && <p className="muted small">To keep the picked ones, use Refresh the list instead.</p>}
        </Confirm>
      )}
      {putAway && (
        <Confirm title="Put this list away?" yes="Put it away" danger onYes={putListAway} onNo={() => setPutAway(false)}>
          <p>The list, what’s picked{written.recipes.length ? ` and the ${written.recipes.length} written ${written.recipes.length === 1 ? 'recipe' : 'recipes'}` : ''} leave this screen. Nothing already saved to the cookbook changes.</p>
          {written.recipes.length > 0 && <p className="muted small">The written recipes aren’t in the cookbook yet. Save them first if you want them.</p>}
        </Confirm>
      )}
      {clearing && (
        <Confirm title="Clear the list?" yes="Clear it" danger onYes={clearList} onNo={() => setClearing(false)}>
          <p>All {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'} come off the list{picked.length ? `, including the ${picked.length} picked` : ''}. Nothing new is asked for.</p>
        </Confirm>
      )}
      {undo && <Toast key={undo.id} action="Undo" onAction={undoIt} onClose={() => setUndo(null)}>{undo.text}</Toast>}
      {saved && <Card tint="#3E7A4C" label="Saved" glyph="star" className="span-6"><ul className="coming">{saved.map((r, i) => <li key={i}>{r.ok ? <Link to={`/kitchen/recipe/${r.slug}`}>{r.title}</Link> : <span className="err">{r.title}: {r.error}</span>}</li>)}</ul></Card>}
    </>
  )
}

/** One person's number, so the list can be texted to them in a tap. Kept in the database, parents only. */
function PhoneRow({ person, phone, save }) {
  const [number, setNumber] = useState(''), [note, setNote] = useState(null)
  const anna = person.name === 'Anna'
  async function submit(e) {
    e.preventDefault()
    const p = normalizePhone(number)
    if (!p) { setNote('A phone number with its area code, like (909) 555-1234.'); return }
    const { error } = await save(person.id, p)
    if (error) setNote(/relation|does not exist|schema cache/i.test(error.message) ? 'The newest migration hasn’t been run yet (docs/MORNING.md, step 10).' : error.message)
    else { setNumber(''); setNote(`Saved. The button now opens ${anna ? 'a message to her' : 'her message'}.`) }
  }
  return (
    <details className="plan-phone" open={!phone && Boolean(note)}>
      <summary>{phone ? `Change ${person.name}’s number` : `Add ${person.name}’s number${anna ? ' (her Apple Watch’s)' : ''}, so one tap opens her message`}</summary>
      <form className="plan-reply" onSubmit={submit}>
        <label>{anna ? 'Her watch number' : 'Her number'}<input type="tel" inputMode="tel" autoComplete="off" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="(909) 555-1234" /></label>
        <button type="submit" className="btn ghost" disabled={!number.trim()}>Save</button>
      </form>
      <span className="muted small">Kept in the family’s database, readable by Jason and Laurie only.</span>
      {note && <span className="muted small" role="status">{note}</span>}
    </details>
  )
}
