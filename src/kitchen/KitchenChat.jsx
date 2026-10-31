import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../ui/Sheet.jsx'
import { Link } from '../shell/Link.jsx'
import { useDraft } from '../lib/useDraft.js'
import { askClaude } from '../lib/claude.js'
import { lite } from '../lib/kitchen/plan.js'
import { savePreferences, saveFoodRules, savePlan } from '../lib/useKitchenPlan.js'
import { saveRecipes } from '../lib/useKitchen.js'
import { supabase } from '../lib/supabase.js'
import { weekOf, mergeIdeas } from '../lib/kitchen/plan.js'

// Talk to Claude about cooking from anywhere in the Kitchen: a recipe, a
// swap, what to do with the scallions, a change to the preferences or
// Laurie's rules. Whatever it suggests saving comes as a card to confirm;
// nothing changes until someone says so. The conversation stays on this
// device (cleared on sign-out); "New" starts again.

const SUGGEST = ['What can I make with what’s in the fridge?', 'Swap for the sore-hands week?', 'Add to my preferences: no more cauliflower rice']

export default function KitchenChat({ me, parent, members, slug, today }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="kchat-fab" onClick={() => setOpen(true)} aria-label="Ask Claude about cooking">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        <span>Ask</span>
      </button>
      {open && <Sheet title="Ask about cooking" side onClose={() => setOpen(false)}><Chat me={me} parent={parent} members={members} slug={slug} today={today} /></Sheet>}
    </>
  )
}

function Chat({ me, parent, members, slug, today }) {
  const [c, setC, clear] = useDraft('kitchen.chat', { messages: [], done: {} })
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(null)
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [c.messages.length, busy])

  async function send(words) {
    const t = (words ?? text).trim()
    if (!t || busy) return
    const messages = [...c.messages, { role: 'user', content: t }]
    setC({ ...c, messages }); setText(''); setBusy(true); setErr(null)
    const res = await askClaude('kitchen-chat', { messages, page: slug ? { slug } : undefined })
    setBusy(false)
    if (res.error) { setErr(res.error); return }
    setC({ ...c, messages: [...messages, ...(res.turns || [])] })
  }
  const mark = (id, how) => setC({ ...c, done: { ...c.done, [id]: how } })

  return (
    <div className="kchat">
      <p className="kchat-says">Talks with Claude (Anthropic). It sees what you type here, the kitchen’s preferences, the cookbook’s titles and ratings{slug ? ', the recipe you’re on' : ''}, and Laurie’s food rules only if she has said yes. Nothing is saved without you.</p>
      {c.messages.length === 0 && (
        <div className="kchat-try">{SUGGEST.map((s) => <button key={s} type="button" className="btn ghost" onClick={() => send(s)}>{s}</button>)}</div>
      )}
      <div className="kchat-log" aria-live="polite">
        {c.messages.map((m, i) => <Turn key={i} m={m} done={c.done} onDone={mark} me={me} parent={parent} members={members} today={today} />)}
        {busy && <p className="kchat-busy"><span className="plan-dot" aria-hidden="true" />Thinking…</p>}
        {err && <p className="err" role="alert">{err}</p>}
        <div ref={end} />
      </div>
      <form className="kchat-in" onSubmit={(e) => { e.preventDefault(); send() }}>
        <textarea rows={2} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Ask anything about cooking…" aria-label="Your message" />
        <div className="kchat-b">
          <button type="submit" className="btn" disabled={busy || !text.trim()}>Send</button>
          {c.messages.length > 0 && <button type="button" className="btn ghost" onClick={() => { clear(); setErr(null) }}>New</button>}
        </div>
      </form>
    </div>
  )
}

/** One turn: your words, Claude's words, and a card for anything it proposes. Tool results stay unseen. */
function Turn({ m, done, onDone, me, parent, members, today }) {
  if (m.role === 'user') {
    if (typeof m.content === 'string') return <div className="kchat-me">{m.content}</div>
    const t = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
    return t ? <div className="kchat-me">{t}</div> : null
  }
  const blocks = Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content) }]
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'text' && b.text) return <div key={i} className="kchat-them"><Lite text={b.text} /></div>
        if (b.type === 'tool_use') return <Proposal key={i} use={b} state={done[b.id]} onDone={(how) => onDone(b.id, how)} me={me} parent={parent} members={members} today={today} />
        return null
      })}
    </>
  )
}

function Lite({ text }) {
  const run = (rs) => rs.map((r, k) => (r.b ? <b key={k}>{r.t}</b> : <span key={k}>{r.t}</span>))
  return lite(text).map((b, i) => (b.type === 'ul' ? <ul key={i}>{b.items.map((it, k) => <li key={k}>{run(it)}</li>)}</ul> : b.type === 'h' ? <h3 key={i}>{run(b.runs)}</h3> : <p key={i}>{run(b.runs)}</p>))
}

/** Something Claude would like saved: shown, then saved only on a yes. */
function Proposal({ use, state, onDone, me, parent, members, today }) {
  const [err, setErr] = useState(null), [result, setResult] = useState(null)
  const x = use.input || {}
  const what = {
    propose_preferences: { title: 'Change the kitchen’s preferences', line: x.summary, body: x.text, parentOnly: true },
    propose_food_rules: { title: 'Change Laurie’s food rules', line: x.summary, body: x.text, parentOnly: true },
    propose_recipe: { title: `Add “${x.title}” to the cookbook`, body: x.body, parentOnly: true },
    add_ideas: { title: `Add ${(x.ideas || []).length} ${(x.ideas || []).length === 1 ? 'idea' : 'ideas'} to this week`, line: (x.ideas || []).map((i) => i.title).join(' · '), parentOnly: true },
  }[use.name]
  if (!what) return null
  async function yes() {
    setErr(null)
    let r = { error: null }
    if (use.name === 'propose_preferences') r = await savePreferences(x.text, x.summary, me)
    if (use.name === 'propose_food_rules') { const laurie = members.find((m) => m.name === 'Laurie'); r = await saveFoodRules((laurie || me).id, x.text, x.summary, me) }
    if (use.name === 'propose_recipe') { const [s] = await saveRecipes([x.body]); r = s.ok ? { error: null } : { error: { message: s.error } }; if (s.ok) setResult(s) }
    if (use.name === 'add_ideas') {
      const week = weekOf(today)
      const { data } = await supabase.from('week_plans').select('*').eq('week_of', week).order('created_at', { ascending: false }).limit(1)
      const plan = data && data[0]
      r = await savePlan(plan, { ideas: mergeIdeas(plan ? plan.ideas : [], x.ideas || []) }, week, me)
    }
    if (r.error) setErr(r.error.message); else onDone('saved')
  }
  return (
    <div className={'kchat-prop ' + (state || '')}>
      <b>{what.title}</b>
      {what.line && <span>{what.line}</span>}
      {what.body && <details><summary>See it</summary><pre className="plan-md">{what.body}</pre></details>}
      {!state && (what.parentOnly && !parent
        ? <span className="muted small">Jason or Laurie can save this.</span>
        : <div className="form-actions"><button type="button" className="btn" onClick={yes}>Save it</button><button type="button" className="btn ghost" onClick={() => onDone('no')}>Not now</button></div>)}
      {state === 'saved' && <span className="kchat-ok">Saved{result ? <> · <Link to={`/kitchen/recipe/${result.slug}`}>open it</Link></> : ''}</span>}
      {state === 'no' && <span className="muted small">Left as it was.</span>}
      {err && <span className="err">{err}</span>}
    </div>
  )
}
