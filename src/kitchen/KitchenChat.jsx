import { useEffect, useRef, useState } from 'react'
import { Sheet } from '../ui/Sheet.jsx'
import { Link } from '../shell/Link.jsx'
import { useDraft } from '../lib/useDraft.js'
import { askClaude, prepareUpload } from '../lib/claude.js'
import { lite } from '../lib/kitchen/plan.js'
import { savePreferences, saveFoodRules, savePlan, fetchOpenPlan } from '../lib/useKitchenPlan.js'
import { saveRecipes } from '../lib/useKitchen.js'
import { supabase } from '../lib/supabase.js'
import { weekOf, mergeIdeas, mergeOnHand } from '../lib/kitchen/plan.js'
import { forClaude, MAX_PHOTOS, DEFAULT_WORDS } from '../lib/kitchen/chatPhotos.js'
import { lineDiff, changesOnly, diffWords } from '../lib/kitchen/diff.js'
import { withLauriePlate, tidyProposed } from '../lib/kitchen/recipe.js'

// Talk to Claude about cooking from anywhere in the Kitchen: a recipe, a
// swap, what to do with the scallions, a change to the preferences or
// Laurie's rules, fixing a recipe in the cookbook. It can open any recipe to
// read it. Whatever it suggests saving comes as a card to confirm, a change
// shown against what's saved now; nothing changes until someone says so. The conversation stays on this
// device (cleared on sign-out); "New" starts again. Photos of what's on hand
// can be attached: Claude reads them once (the packages' names and weights),
// proposes what's on hand for the week, and Plan the week cooks around it
// once a parent says yes. A picture is never kept: the saved conversation holds
// only how many photos a message had.

const SUGGEST = ['What can I make with what’s in the fridge? (Attach a photo of it, if you like.)', 'Swap for the sore-hands week?', 'Add to my preferences: no more cauliflower rice']

// "Bring it home" (a trip's scrapbook) leaves its ask here: the chat opens with it typed, for a parent to send
const takeAsk = () => { try { const v = sessionStorage.getItem('teamhicks.kitchen.ask'); if (v) sessionStorage.removeItem('teamhicks.kitchen.ask'); return v || '' } catch { return '' } }

export default function KitchenChat({ me, parent, members, slug, today }) {
  const [ask] = useState(() => (parent ? takeAsk() : ''))
  const [open, setOpen] = useState(Boolean(ask))
  return (
    <>
      <button type="button" className="kchat-fab" onClick={() => setOpen(true)} aria-label="Ask Claude about cooking">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        <span>Ask</span>
      </button>
      {open && <Sheet title="Ask about cooking" side onClose={() => setOpen(false)}><Chat me={me} parent={parent} members={members} slug={slug} today={today} start={ask} /></Sheet>}
    </>
  )
}

function Chat({ me, parent, members, slug, today, start = '' }) {
  const [c, setC, clear] = useDraft('kitchen.chat', { messages: [], done: {} })
  const [text, setText] = useState(start), [busy, setBusy] = useState(false), [err, setErr] = useState(null)
  const end = useRef(null), pick = useRef(null)
  // Photos waiting to be sent, and the ones already sent by their place in the conversation: in memory only, never kept
  const [pics, setPics] = useState([]), [shots, setShots] = useState({}), [reading, setReading] = useState(false)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [c.messages.length, busy])

  async function attach(files) {
    const room = MAX_PHOTOS - pics.length
    const chosen = [...files].filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, room))
    if (!chosen.length) { setErr(room <= 0 ? `Up to ${MAX_PHOTOS} photos at a time.` : 'Those need to be pictures.'); return }
    setReading(true); setErr(null)
    try {
      const ready = []
      for (const f of chosen) ready.push(await prepareUpload(f, { max: 1280, quality: 0.8 }))
      setPics((p) => [...p, ...ready].slice(0, MAX_PHOTOS))
    } catch { setErr('One of those pictures couldn’t be read. Try another, or a screenshot of it.') }
    setReading(false)
  }

  async function send(words) {
    const typed = (words ?? text).trim()
    const t = typed || (pics.length ? DEFAULT_WORDS : '')
    if (!t || busy || reading) return
    const mine = words ? [] : pics
    const messages = [...c.messages, mine.length ? { role: 'user', content: t, photos: mine.length } : { role: 'user', content: t }]
    const kept = mine.length ? { ...shots, [messages.length - 1]: mine.map(({ data, media_type }) => ({ data, media_type })) } : shots
    mine.forEach((p) => URL.revokeObjectURL(p.preview))
    if (mine.length) setShots(kept)
    setC({ ...c, messages }); setText(''); setPics([]); setBusy(true); setErr(null)
    const res = await askClaude('kitchen-chat', { messages: forClaude(messages, kept), page: slug ? { slug } : undefined })
    setBusy(false)
    if (res.error) { setErr(res.error); return }
    setC({ ...c, messages: [...messages, ...(res.turns || [])] })
  }
  const mark = (id, how) => setC({ ...c, done: { ...c.done, [id]: how } })

  return (
    <div className="kchat">
      <p className="kchat-says">Talks with Claude (Anthropic). It sees what you type here, any photos you attach (read once, never kept), the kitchen’s preferences, the cookbook’s titles and ratings and any recipe it opens, what the garden gave lately{slug ? ', the recipe you’re on' : ''}{parent ? ', and Laurie’s food rules' : ''}. Nothing is saved without you.</p>
      {c.messages.length === 0 && (
        <div className="kchat-try">{[...(slug && parent ? ['Check this one against Laurie’s rules'] : []), ...SUGGEST].map((s) => <button key={s} type="button" className="btn ghost" onClick={() => send(s)}>{s}</button>)}</div>
      )}
      <div className="kchat-log" aria-live="polite">
        {c.messages.map((m, i) => <Turn key={i} m={m} shots={shots[i]} done={c.done} onDone={mark} me={me} parent={parent} members={members} today={today} />)}
        {busy && <p className="kchat-busy"><span className="plan-dot" aria-hidden="true" />Thinking…</p>}
        {err && <p className="err" role="alert">{err}</p>}
        <div ref={end} />
      </div>
      <form className="kchat-in" onSubmit={(e) => { e.preventDefault(); send() }}>
        {(pics.length > 0 || reading) && (
          <div className="kchat-pics" aria-label="Photos to send">
            {pics.map((p, i) => (
              <span key={p.preview} className="kchat-pic"><img src={p.preview} alt={`Photo ${i + 1} to send`} /><button type="button" aria-label={`Take photo ${i + 1} out`} onClick={() => { URL.revokeObjectURL(p.preview); setPics(pics.filter((_, k) => k !== i)) }}>✕</button></span>
            ))}
            {reading && <span className="kchat-busy"><span className="plan-dot" aria-hidden="true" />Getting the photo ready…</span>}
          </div>
        )}
        <textarea rows={2} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={pics.length ? 'Say what to do with these (or just send)…' : 'Ask anything about cooking…'} aria-label="Your message" />
        <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => { attach(e.target.files); e.target.value = '' }} />
        <div className="kchat-b">
          <button type="submit" className="btn" disabled={busy || reading || (!text.trim() && !pics.length)}>Send</button>
          <button type="button" className="btn ghost" disabled={busy || reading || pics.length >= MAX_PHOTOS} onClick={() => pick.current && pick.current.click()}>Add photos</button>
          {c.messages.length > 0 && <button type="button" className="btn ghost" onClick={() => { clear(); setErr(null) }}>New</button>}
        </div>
      </form>
    </div>
  )
}

/** One turn: your words, Claude's words, and a card for anything it proposes. Tool results stay unseen. */
function Turn({ m, shots, done, onDone, me, parent, members, today }) {
  if (m.role === 'user') {
    if (typeof m.content === 'string') return <div className="kchat-me">{m.photos ? <Sent n={m.photos} shots={shots} /> : null}{m.content}</div>
    const t = m.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
    return t ? <div className="kchat-me">{t}</div> : null
  }
  const blocks = Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content) }]
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'text' && b.text) return <div key={i} className="kchat-them"><Lite text={b.text} /></div>
        if (b.type === 'tool_use' && b.name === 'read_recipe') return <p key={i} className="kchat-read">Opened “{String((b.input && b.input.title) || '')}”</p>
        if (b.type === 'tool_use') return <Proposal key={i} use={b} state={done[b.id]} onDone={(how) => onDone(b.id, how)} me={me} parent={parent} members={members} today={today} />
        return null
      })}
    </>
  )
}

/** The photos a message carried: small pictures while this device still has them, otherwise just how many. */
function Sent({ n, shots }) {
  return shots && shots.length
    ? <span className="kchat-sent">{shots.map((f, i) => <img key={i} alt={`Photo ${i + 1} you sent`} src={`data:${f.media_type};base64,${f.data}`} />)}</span>
    : <span className="kchat-sent-n">{n} {n === 1 ? 'photo' : 'photos'} sent</span>
}

function Lite({ text }) {
  const run = (rs) => rs.map((r, k) => (r.b ? <b key={k}>{r.t}</b> : <span key={k}>{r.t}</span>))
  return lite(text).map((b, i) => (b.type === 'ul' ? <ul key={i}>{b.items.map((it, k) => <li key={k}>{run(it)}</li>)}</ul> : b.type === 'h' ? <h3 key={i}>{run(b.runs)}</h3> : <p key={i}>{run(b.runs)}</p>))
}

/** Something Claude would like saved: shown, then saved only on a yes. */
function Proposal({ use, state, onDone, me, parent, members, today }) {
  const [err, setErr] = useState(null), [result, setResult] = useState(null)
  const x = use.input || {}
  const before = useBefore(use.name, x, parent && !state)
  const what = {
    propose_preferences: { title: 'Change the kitchen’s preferences', line: x.summary, body: x.text, parentOnly: true },
    propose_food_rules: { title: 'Change Laurie’s food rules', line: x.summary, body: x.text, parentOnly: true },
    propose_recipe: { title: `Add “${x.title}” to the cookbook`, body: x.body, parentOnly: true },
    propose_recipe_change: { title: 'Change a recipe', line: x.summary, parentOnly: true, compare: true },
    note_on_hand: { title: `Remember ${(x.items || []).length} ${(x.items || []).length === 1 ? 'thing' : 'things'} on hand this week`, line: (x.items || []).map((i) => i.name).join(' · '), body: (x.items || []).map((i) => `${i.name}${i.amount ? `, ${i.amount}` : ''} (${i.where})${i.note ? ` — ${i.note}` : ''}`).join('\n'), parentOnly: true },
    add_ideas: { title: `Add ${(x.ideas || []).length} ${(x.ideas || []).length === 1 ? 'idea' : 'ideas'} to this week`, line: (x.ideas || []).map((i) => i.title).join(' · '), parentOnly: true },
  }[use.name]
  if (!what) return null
  async function yes() {
    setErr(null)
    let r = { error: null }
    if (use.name === 'propose_preferences') r = await savePreferences(x.text, x.summary, me)
    if (use.name === 'propose_food_rules') { const laurie = members.find((m) => m.name === 'Laurie'); r = await saveFoodRules((laurie || me).id, x.text, x.summary, me) }
    if (use.name === 'propose_recipe') { const [s] = await saveRecipes([x.body]); r = s.ok ? { error: null } : { error: { message: s.error } }; if (s.ok) setResult(s) }
    if (use.name === 'propose_recipe_change') {
      if (!before || !before.found) { setErr('That recipe isn’t in the cookbook any more.'); return }
      const [s] = await saveRecipes([{ md: tidyProposed(x.body), slug: before.slug }]); r = s.ok ? { error: null } : { error: { message: s.error } }; if (s.ok) setResult(s)
    }
    if (use.name === 'note_on_hand') {
      const plan = await fetchOpenPlan()
      r = await savePlan(plan, { on_hand: mergeOnHand(plan ? plan.on_hand : [], x.items || []) }, weekOf(today), me)
    }
    if (use.name === 'add_ideas') {
      const week = weekOf(today)
      const plan = await fetchOpenPlan()
      r = await savePlan(plan, { ideas: mergeIdeas(plan ? plan.ideas : [], x.ideas || []) }, week, me)
    }
    if (r.error) setErr(r.error.message); else onDone('saved')
  }
  return (
    <div className={'kchat-prop ' + (state || '')}>
      <b>{what.title}</b>
      {what.line && <span>{what.line}</span>}
      {(what.compare || (what.body && before && before.text)) && <Compare before={before} after={use.name === 'propose_recipe_change' ? tidyProposed(x.body) : what.body} name={use.name === 'propose_recipe_change' && before && before.title} />}
      {what.body && !(before && before.text) && <details><summary>See it</summary><pre className="plan-md">{what.body}</pre></details>}
      {!state && (what.parentOnly && !parent
        ? <span className="muted small">Jason or Laurie can save this.</span>
        : <div className="form-actions"><button type="button" className="btn" onClick={yes}>Save it</button><button type="button" className="btn ghost" onClick={() => onDone('no')}>Not now</button></div>)}
      {state === 'saved' && <span className="kchat-ok">Saved{result ? <> · <Link to={`/kitchen/recipe/${result.slug}`}>open it</Link></> : ''}{use.name === 'note_on_hand' ? <> · <Link to="/kitchen/plan">Plan the week</Link> cooks around it</> : ''}</span>}
      {state === 'no' && <span className="muted small">Left as it was.</span>}
      {err && <span className="err">{err}</span>}
    </div>
  )
}

/**
 * What a proposal would replace, read as the person looking (row-level
 * security decides): the recipe with Laurie's plate back in its place, or the
 * latest rules or preferences. { text, found, slug, title } once read.
 */
function useBefore(tool, x, live) {
  const [before, setBefore] = useState(null)
  const slug = tool === 'propose_recipe_change' ? String(x.slug || '') : ''
  useEffect(() => {
    if (!live || !supabase) return undefined
    let on = true
    const done = (b) => { if (on) setBefore(b) }
    if (tool === 'propose_recipe_change') {
      if (!/^[a-z0-9-]{1,80}$/.test(slug)) { done({ found: false }); return undefined }
      supabase.from('recipes').select('id, slug, title, body').eq('slug', slug).maybeSingle().then(async ({ data }) => {
        if (!data) return done({ found: false })
        const { data: p } = await supabase.from('recipe_private').select('laurie_plate').eq('recipe_id', data.id).maybeSingle()
        done({ found: true, slug: data.slug, title: data.title, text: withLauriePlate(data.body, p && p.laurie_plate) })
      })
    } else if (tool === 'propose_food_rules' || tool === 'propose_preferences') {
      supabase.from(tool === 'propose_food_rules' ? 'food_rules' : 'kitchen_preferences').select('body').order('created_at', { ascending: false }).limit(1)
        .then(({ data }) => done({ found: true, text: data && data[0] ? data[0].body : '' }))
    }
    return () => { on = false }
  }, [tool, slug, live])
  return before
}

/** The change itself: lines taken out and added, a line of what's around each, the rest folded away. */
function Compare({ before, after, name }) {
  if (!before) return <span className="muted small">Reading what’s saved now…</span>
  if (!before.found) return <span className="err">That recipe isn’t in the cookbook, so there’s nothing to change.</span>
  const diff = lineDiff(before.text, after || '')
  const shown = changesOnly(diff)
  return (
    <div className="kdiff">
      <span className="muted small">{name ? <>“{name}”: </> : null}{diffWords(diff)}</span>
      <div className="kdiff-lines" role="list">
        {shown.map((d, i) => (d.t === 'gap'
          ? <div key={i} className="kdiff-gap" role="listitem">{d.count} {d.count === 1 ? 'line' : 'lines'} the same</div>
          : <div key={i} className={'kdiff-' + d.t} role="listitem"><span className="kdiff-sign" aria-label={d.t === 'add' ? 'Added' : d.t === 'del' ? 'Taken out' : 'Unchanged'}>{d.t === 'add' ? '+' : d.t === 'del' ? '−' : ''}</span>{d.line || '\u00a0'}</div>))}
      </div>
      <details><summary>See the whole new version</summary><pre className="plan-md">{after}</pre></details>
    </div>
  )
}
