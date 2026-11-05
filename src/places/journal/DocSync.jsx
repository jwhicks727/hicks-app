import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { Confirm } from '../../ui/Confirm.jsx'
import { Working } from '../../ui/Toast.jsx'
import { useDraft } from '../../lib/useDraft.js'
import { longDate } from '../../lib/journal.js'
import { docDays, guessStop, stopChoices, beginsAhead, hasWords } from '../../lib/journalDoc.js'
import { googleReady, allowedHere, googleToken, googleError, signInWithGoogle, forgetGoogle, pickDoc } from '../../lib/google.js'
import { readDoc, lookAt, carryOut, waiting, SAVED } from '../../lib/docSync.js'
import { saveDocLink, forgetFingerprints } from '../../lib/useJournal.js'

// A journal kept in step with its writer's own Google Doc (src/lib/journalDoc.js says how). Everything here runs
// in the writer's browser with their own Google sign-in; no server reads the Doc or the journal.

let lastRun = 0
const days = (n) => <><b>{n}</b> {n === 1 ? 'day' : 'days'}</>
const agoText = (iso) => {
  if (!iso) return null
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`
}

/** Why the Doc sync can't run on this copy of the app, or null when it can. */
function blocked() {
  if (!googleReady()) return 'The Doc sync needs its one-time Google setup first (README, “Journal and Google Docs”).'
  if (!allowedHere(window.location.hostname)) return 'Google only lets the app sign in from its own address, so the Doc sync is off on preview links. It works at hicks.web.app.'
  return null
}

/** One sync at a time: read, compare, carry out (after the writer says yes, the first time). */
function useDocSync(j, me, today) {
  const s = j.settings || {}
  const [st, setSt] = useState({ step: null, look: null, err: null, kind: null, result: null })
  const busy = useRef(false)
  const run = useCallback(async ({ choices = {}, first = false } = {}) => {
    if (busy.current || !s.doc_id || blocked()) return
    if (!googleToken()) { setSt((x) => ({ ...x, err: null, kind: 'signin' })); return }
    busy.current = true
    lastRun = Date.now()
    try {
      setSt((x) => ({ ...x, step: 'Reading your Doc…', err: null, kind: null }))
      let look = await lookAt(j)
      if (!s.doc_synced_at && !first) { setSt({ step: null, look, err: null, kind: 'first', result: null }); return }
      const step = (t) => setSt((x) => ({ ...x, step: t }))
      let result
      try { result = await carryOut(j, me, look, choices, step, today) } catch (e) {
        if (e.kind !== 'moved') throw e
        look = await lookAt(j) // the Doc changed as the app wrote: read it again and try once more
        result = await carryOut(j, me, look, choices, step, today)
      }
      setSt({ step: null, look, err: null, kind: null, result, choices })
      j.reload()
    } catch (e) {
      setSt((x) => ({ ...x, step: null, err: e.message || 'The sync didn’t finish.', kind: e.kind || 'other' }))
    } finally { busy.current = false }
  }, [j, me, today, s.doc_id, s.doc_synced_at])
  return [st, run]
}

/** The journal's line about its Doc: in step, syncing, or something waiting. */
export function DocBar({ j, me, today }) {
  const s = j.settings || {}
  const [st, run] = useDocSync(j, me, today)
  const want = useRef(false)
  // Opening the journal with a key in hand syncs, at most once a minute
  useEffect(() => { if (j.loaded && s.doc_id && s.doc_synced_at && googleToken() && Date.now() - lastRun > 60000) run() }, [j.loaded, s.doc_id]) // eslint-disable-line react-hooks/exhaustive-deps
  // A page saved here goes to the Doc once the journal has reloaded
  useEffect(() => { const on = () => { want.current = true }; window.addEventListener(SAVED, on); return () => window.removeEventListener(SAVED, on) }, [])
  useEffect(() => { if (want.current && googleToken()) { want.current = false; run() } }, [j.entries]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!s.doc_id) return null
  const why = blocked()
  const left = st.look ? waiting(st.look.plan, st.choices).length : 0
  return (
    <section className="jr-docbar span-6" aria-label="Your Google Doc">
      {st.step && <Working>{st.step}</Working>}
      {left > 0 ? (
        <Link className="shine jr-docshine" to="/journal/doc"><b>{left}</b> {left === 1 ? 'day differs' : 'days differ'} from your Doc ›</Link>
      ) : (
        <span className="jr-docline">
          <b>{s.doc_title || 'Your Doc'}</b>
          <span>{why ? 'Doc sync off here' : st.err ? st.err : s.doc_synced_at ? `In step ${agoText(s.doc_synced_at)}` : 'Not synced yet'}</span>
        </span>
      )}
      {!why && (googleToken()
        ? <button type="button" className="btn ghost" disabled={Boolean(st.step)} onClick={() => run()}>Sync now</button>
        : <button type="button" className="btn ghost" onClick={() => signInWithGoogle(window.location.pathname)}>Sync with Google</button>)}
      <Link className="jr-doclink" to="/journal/doc">Doc settings</Link>
    </section>
  )
}

/** A day as it reads, for comparing the Doc's with the one here. */
function DayWords({ e }) {
  const body = [e.answer, e.reflection].filter(Boolean).join('\n\n').split(/\n\n+/).filter(Boolean)
  const grats = (e.gratitudes || []).filter(Boolean)
  return (
    <div className="jr-text">
      {e.prompt && <p className="jr-tq"><b>{e.prompt_title}</b> {e.prompt}</p>}
      {body.map((p, i) => <p key={i}>{p}</p>)}
      {grats.length > 0 && <ol className="jr-tg">{grats.map((g, i) => <li key={i}>{g}</li>)}</ol>}
      {!body.length && !grats.length && !e.prompt && <p className="muted">Nothing written.</p>}
    </div>
  )
}

/** /journal/doc: link a Doc, say where its days stop, sync, and settle what differs. */
export default function DocPage({ j, me, today }) {
  const s = j.settings || {}
  const why = blocked()
  const [st, run] = useDocSync(j, me, today)
  const [pick, setPick, clearPick] = useDraft('journal.doc-link', null) // { id, title, stop }: survives the app being closed mid-way
  const [cand, setCand] = useState(null) // the picked Doc, read: { paras }
  const [msg, setMsg] = useState(() => { const e = googleError(); return e === 'access_denied' ? 'Google sign-in was cancelled, so nothing was linked.' : e ? 'Google sign-in didn’t finish. Try again.' : null })
  const [ask, setAsk] = useState(null) // { item, choice } waiting on a yes
  const [unlink, setUnlink] = useState(false)
  const [restop, setRestop] = useState(null)
  const token = googleToken()

  useEffect(() => { if (j.loaded && s.doc_id && token && !why && !st.look && !st.step) run() }, [j.loaded, s.doc_id]) // eslint-disable-line react-hooks/exhaustive-deps
  // A pick in progress when the app was closed: read that Doc again
  useEffect(() => {
    if (!pick || cand || !token || why) return
    readDoc(pick.id, null, token).then((r) => setCand({ paras: r.paras })).catch((e) => setMsg(e.message))
  }, [pick && pick.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function choose() {
    setMsg(null)
    try {
      const picked = await pickDoc(token)
      if (!picked) return
      const r = await readDoc(picked.id, null, token)
      setCand({ paras: r.paras })
      setPick({ id: picked.id, title: picked.title, stop: guessStop(r.paras) })
    } catch (e) { setMsg(e.message) }
  }
  async function link() {
    const changed = s.doc_id !== pick.id
    if (changed) { const { error } = await forgetFingerprints(); if (error) { setMsg(error.message); return } }
    const ahead = beginsAhead(docDays(cand.paras, pick.stop || null).days) // the Doc already has tomorrow begun: keep doing it
    const { error } = await saveDocLink({ doc_id: pick.id, doc_title: pick.title.slice(0, 300), doc_stop: pick.stop || null, ...(changed ? { doc_synced_at: null, doc_removed: [], doc_ahead: ahead } : {}) }, me)
    if (error) { setMsg(error.message); return }
    clearPick(); setCand(null); j.reload()
  }
  async function dropLink() {
    const a = await forgetFingerprints()
    const b = await saveDocLink({ doc_id: null, doc_title: null, doc_stop: null, doc_synced_at: null, doc_removed: [] }, me)
    forgetGoogle()
    setUnlink(false)
    if (a.error || b.error) setMsg((a.error || b.error).message)
    j.reload()
  }
  async function saveStop(stop) {
    const { error } = await saveDocLink({ doc_stop: stop }, me)
    setRestop(null)
    if (error) setMsg(error.message); else { j.reload(); setMsg('Saved. The next sync reads your days up to there.') }
  }
  async function startRestop() {
    try { const r = await readDoc(s.doc_id, null, token); setRestop({ paras: r.paras, stop: s.doc_stop }) } catch (e) { setMsg(e.message) }
  }

  const plan = st.look && st.look.plan
  const items = st.kind === 'first' ? [] : waiting(plan, st.choices)
  const decide = (item, choice) => (choice === 'remove' || (choice === 'doc' && item.empty) ? setAsk({ item, choice }) : run({ choices: { ...(st.choices || {}), [item.date]: choice } }))
  const ahead = async () => { const { error } = await saveDocLink({ doc_ahead: !s.doc_ahead }, me); if (error) setMsg(error.message); else j.reload() }

  return (
    <>
      <header className="hero span-6">
        <Crumb to="/journal">Journal</Crumb>
        <span className="kicker">Only you can read this</span>
        <h1 className="greet">Your Google Doc</h1>
      </header>
      {st.step && <Working>{st.step}</Working>}

      {(why || (!s.doc_id && !(pick && cand))) && (
        <Card tint="#7A5C9E" label="Keep your journal in step with a Google Doc" glyph="star" className="span-6">
          <div className="jr-docabout">
            <p>Write here or in your Doc, whichever is nearer. A day written in one turns up in the other: here as soon as you save, in the Doc the next time you open the journal.</p>
            <p className="muted">Your browser talks to Google directly with your own sign-in. The app can open only the one Doc you pick, never the rest of your Drive, and no server, Edge Function or Claude reads your journal or your Doc. A day that differs in both places is shown to you, both ways, to choose; nothing is ever removed without asking.</p>
          </div>
          {why ? <p className="jr-docwhy">{why}</p> : !token ? (
            <button type="button" className="btn" onClick={() => signInWithGoogle('/journal/doc')}>Sign in with Google</button>
          ) : !pick ? (
            <button type="button" className="btn" onClick={choose}>Choose your journal’s Doc</button>
          ) : null}
        </Card>
      )}

      {pick && cand && !why && (
        <Card tint="#5F8A4A" label={pick.title} glyph="calendar" className="span-6">
          <StopPicker paras={cand.paras} stop={pick.stop} onStop={(stop) => setPick({ ...pick, stop })} />
          <div className="form-actions">
            <button type="button" className="btn" onClick={link}>Link this Doc</button>
            <button type="button" className="btn ghost" onClick={() => { clearPick(); setCand(null) }}>Cancel</button>
          </div>
        </Card>
      )}

      {s.doc_id && !why && (
        <Card tint="#7A5C9E" label={s.doc_title || 'Your Doc'} glyph="star" className="span-6">
          {!token && <><p>Sign in with Google to bring your Doc and your journal into step.</p><button type="button" className="btn" onClick={() => signInWithGoogle('/journal/doc')}>Sign in with Google</button></>}
          {token && st.kind === 'first' && plan && (
            <div className="jr-docfirst">
              <p><b>The first sync.</b> Here’s what it would do:</p>
              <ul className="jr-docsum">
                <li>{days(plan.mark.length + plan.same)} already {plan.mark.length + plan.same === 1 ? 'says' : 'say'} the same in both</li>
                <li>{days(plan.pull.length)} {plan.pull.length === 1 ? 'comes' : 'come'} from the Doc into your journal</li>
                <li>{days(plan.add.length + plan.push.length)} written here {plan.add.length + plan.push.length === 1 ? 'goes' : 'go'} into the Doc</li>
                <li>{days(plan.conflicts.length)} {plan.conflicts.length === 1 ? 'says' : 'say'} different things in each: you’ll choose, once this is done</li>
                {plan.stuck.length > 0 && <li>{days(plan.stuck.length)} {plan.stuck.length === 1 ? 'is' : 'are'} longer than the app keeps, so {plan.stuck.length === 1 ? 'it stays' : 'they stay'} only in the Doc</li>}
              </ul>
              <button type="button" className="btn" onClick={() => run({ first: true })}>Bring them into step</button>
            </div>
          )}
          {token && st.kind !== 'first' && (
            <div className="jr-docstat">
              <p>{st.err ? <span className="err" role="alert">{st.err}</span> : s.doc_synced_at || st.result ? <>In step {st.result ? 'just now' : agoText(s.doc_synced_at)}.{st.result && (st.result.toDoc || st.result.here || st.result.removed || st.result.begun) ? ` ${[st.result.toDoc && `${st.result.toDoc} to the Doc`, st.result.here && `${st.result.here} from the Doc`, st.result.removed && `${st.result.removed} removed`, st.result.begun && 'tomorrow begun'].filter(Boolean).join(', ')}.` : ''}</> : 'Not synced yet.'}</p>
              {st.kind === 'stop' && <button type="button" className="btn" onClick={startRestop}>Choose where your days stop</button>}
              <button type="button" className="btn ghost" disabled={Boolean(st.step)} onClick={() => run({ choices: st.choices || {} })}>Sync now</button>
            </div>
          )}
          {plan && plan.stuck.length > 0 && st.kind !== 'first' && <p className="muted">{plan.stuck.length === 1 ? 'One day is' : `${plan.stuck.length} days are`} longer than the app keeps, so {plan.stuck.length === 1 ? 'it stays' : 'they stay'} only in the Doc: {plan.stuck.map((x) => longDate(x.day.date)).join('; ')}.</p>}
          <div className="jr-docahead">
            <span><b>Begin tomorrow’s page</b><small>Once today has words, tomorrow’s date and an empty Gratitudes go in the Doc, ready for the morning</small></span>
            <button type="button" className="switch" role="switch" aria-checked={Boolean(s.doc_ahead)} aria-label="Begin tomorrow’s page in the Doc" onClick={ahead}><i /></button>
          </div>
          <div className="jr-docmore">
            <span>{s.doc_stop ? <>Your days stop above “{s.doc_stop}”.</> : 'Your days run to the end of the Doc.'}</span>
            {token && <button type="button" className="jr-skip" onClick={startRestop}>Change</button>}
            {token && <button type="button" className="jr-skip" onClick={choose}>Link a different Doc</button>}
            <button type="button" className="jr-skip" onClick={() => setUnlink(true)}>Stop syncing</button>
          </div>
        </Card>
      )}

      {restop && (
        <Card tint="#5F8A4A" label="Where your days stop" glyph="calendar" className="span-6">
          <StopPicker paras={restop.paras} stop={restop.stop} onStop={(stop) => setRestop({ ...restop, stop })} />
          <div className="form-actions"><button type="button" className="btn" onClick={() => saveStop(restop.stop)}>Save</button><button type="button" className="btn ghost" onClick={() => setRestop(null)}>Cancel</button></div>
        </Card>
      )}

      {items.map((it) => (
        <Card key={it.kind + it.date} tint="#C0824F" label={longDate(it.date)} glyph="calendar" className="span-6 jr-differ">
          {it.kind === 'differ' && (
            <>
              <p className="jr-differ-why">{it.empty ? 'Emptied in your Doc since they last agreed; it still has words here.' : it.entry.doc_hash ? 'Changed in both places since they last agreed.' : 'Written in both places, and they say different things.'}</p>
              <div className="jr-both">
                <section><h3>In your Doc</h3><DayWords e={it.day.entry} /></section>
                <section><h3>Here</h3><DayWords e={it.entry} /></section>
              </div>
              <div className="form-actions">
                {!it.long && <button type="button" className={it.empty ? 'btn ghost' : 'btn'} onClick={() => decide(it, 'doc')}>{it.empty ? 'Remove it here too' : 'Keep the Doc’s'}</button>}
                {!it.unsafe && <button type="button" className="btn ghost" onClick={() => decide(it, 'here')}>Keep this one</button>}
              </div>
              {it.unsafe && <p className="muted">That day has a picture, chip or table in your Doc, so it’s only ever changed there.</p>}
              {it.long && <p className="muted">That day is longer in your Doc than the app keeps, so the Doc’s can’t come across.</p>}
            </>
          )}
          {it.kind === 'goneFromDoc' && (
            <>
              <p className="jr-differ-why">This day was in your Doc, and now it isn’t.</p>
              <DayWords e={it.entry} />
              <div className="form-actions">
                <button type="button" className="btn ghost" onClick={() => decide(it, 'remove')}>Remove it here too</button>
                <button type="button" className="btn" onClick={() => decide(it, 'restore')}>Put it back in the Doc</button>
              </div>
            </>
          )}
          {it.kind === 'removedHere' && (
            <>
              <p className="jr-differ-why">You removed this day here; your Doc still has it.</p>
              <DayWords e={it.day.entry} />
              <div className="form-actions">
                {it.day.plain && <button type="button" className="btn ghost" onClick={() => decide(it, 'remove')}>Remove it from the Doc too</button>}
                <button type="button" className="btn" onClick={() => decide(it, 'restore')}>Bring it back here</button>
              </div>
            </>
          )}
        </Card>
      ))}

      {msg && <p className="span-6 jr-docmsg" role="status">{msg}</p>}
      {ask && (
        <Confirm title={ask.item.kind === 'removedHere' ? 'Remove this day from your Doc?' : 'Remove this page here?'} yes="Remove it" danger onNo={() => setAsk(null)}
          onYes={() => { const { item, choice } = ask; setAsk(null); run({ choices: { ...(st.choices || {}), [item.date]: choice } }) }}>
          {longDate(ask.item.date)} goes for good {ask.item.kind === 'removedHere' ? 'from your Doc (its version history in Google Docs still has it)' : 'from your journal here'}.
        </Confirm>
      )}
      {unlink && (
        <Confirm title="Stop syncing with this Doc?" yes="Stop syncing" onNo={() => setUnlink(false)} onYes={dropLink}>
          Your Doc and your journal both stay exactly as they are; they just stop updating each other. You can link a Doc again any time.
        </Confirm>
      )}
    </>
  )
}

/** Where the days stop: the app's guess, and the lines it could be, to tap. */
function StopPicker({ paras, stop, onStop }) {
  const { days } = docDays(paras, stop)
  const written = days.filter((d) => hasWords(d.entry))
  const begun = days.length && !hasWords(days[days.length - 1].entry) ? days[days.length - 1] : null
  const choices = stopChoices(paras).slice(-40)
  return (
    <div className="jr-stop">
      <p>{written.length ? <><b>{written.length} {written.length === 1 ? 'day' : 'days'}</b> written, {longDate(written[0].date)} to {longDate(written[written.length - 1].date)}{begun ? <>, and {longDate(begun.date)} begun ahead</> : null}.</> : 'No written days found above that line.'}</p>
      <fieldset className="jr-stoplist">
        <legend>New days go at the bottom of your days, above:</legend>
        {choices.map((c) => (
          <label key={c.i} className="check-row"><input type="radio" name="jr-stop" checked={stop === c.text} onChange={() => onStop(c.text)} /> <span className={c.heading ? 'jr-stoph' : ''}>{c.text.length > 90 ? `${c.text.slice(0, 90)}…` : c.text}</span></label>
        ))}
        <label className="check-row"><input type="radio" name="jr-stop" checked={!stop} onChange={() => onStop(null)} /> <span>Nothing: my days run to the end of the Doc</span></label>
      </fieldset>
    </div>
  )
}
