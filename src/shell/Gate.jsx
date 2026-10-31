import { useEffect, useState } from 'react'
import { supabaseHost } from '../lib/supabase.js'
import { sendSignInLink, signInWithCode, signOut } from '../lib/auth.js'
import { signInProblem, codeOf } from '../lib/gate.js'
import { useDraft } from '../lib/useDraft.js'
import Sky from './Sky.jsx'
import './gate.css'

/**
 * What stands in front of the app until someone has signed in and is on the
 * family list: the wordmark, and the one thing to do. No tab bar, no places,
 * nothing from the database. The sign-in link and the code come to the same
 * email; the code is for the installed app, where a link would open the
 * browser (and sign it in there) instead.
 */
export default function Gate({ gate }) {
  const { state, session, retry } = gate
  return (
    <>
      <Sky />
      <main className="gate">
        <span className="gate-brand">Team Hicks</span>
        {state === 'loading' && <p className="gate-quiet" role="status">One moment…</p>}
        {state === 'signin' && <SignIn />}
        {state === 'notfamily' && (
          <section className="gate-card">
            <h1>Not on the family list</h1>
            <p><b>{session.user.email}</b> is signed in, but isn’t one of ours. Jason or Laurie can add an address.</p>
            <button type="button" className="btn" onClick={() => signOut()}>Sign out</button>
          </section>
        )}
        {state === 'trouble' && (
          <section className="gate-card">
            <h1>Couldn’t check the family list</h1>
            <p>The database didn’t answer just now.</p>
            <div className="gate-row">
              <button type="button" className="btn" onClick={retry}>Try again</button>
              <button type="button" className="btn ghost" onClick={() => signOut()}>Sign out</button>
            </div>
          </section>
        )}
        {state === 'unconfigured' && (
          <section className="gate-card">
            <h1>Not connected yet</h1>
            <p>This copy of the app was built without the database’s address (docs/MORNING.md, step 8).</p>
          </section>
        )}
      </main>
    </>
  )
}

function SignIn() {
  const [draft, setDraft] = useDraft('signin.email', { email: '' })
  const [step, setStep] = useState('email') // email, then code
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [note, setNote] = useState(null) // { ok, text }
  const email = draft.email.trim()
  useEffect(() => { setNote(null) }, [step])

  const send = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await sendSignInLink(email).catch((x) => ({ error: x }))
    setBusy(false)
    if (error) { setNote({ ok: false, text: signInProblem(error.message, supabaseHost) }); return }
    setStep('code')
  }
  const verify = async (e) => {
    e.preventDefault()
    const token = codeOf(code)
    if (!token) { setNote({ ok: false, text: 'The code is the digits in the email.' }); return }
    setBusy(true)
    const { error } = await signInWithCode(email, token).catch((x) => ({ error: x }))
    setBusy(false)
    if (error) setNote({ ok: false, text: signInProblem(error.message, supabaseHost) })
  }

  if (step === 'code') {
    return (
      <section className="gate-card">
        <h1>Check your email</h1>
        <p>We sent a sign-in link to <b>{email}</b>. Open it on this device. If you’re using the installed app, type the code from the same email instead.</p>
        <form className="form" onSubmit={verify}>
          <label>The code<input inputMode="numeric" autoComplete="one-time-code" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} placeholder="Digits from the email" /></label>
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
          {note && <p className={note.ok ? 'ok' : 'err'} role="status">{note.text}</p>}
        </form>
        <div className="gate-row">
          <button type="button" className="gate-link" onClick={() => { setCode(''); setStep('email') }}>Use another address, or send it again</button>
        </div>
      </section>
    )
  }
  return (
    <section className="gate-card">
      <h1>Just for the family</h1>
      <p>Sign in with your email and we’ll send you a link.</p>
      <form className="form" onSubmit={send}>
        <label>Your email<input type="email" required autoComplete="email" autoCapitalize="none" spellCheck="false" value={draft.email} onChange={(e) => setDraft({ email: e.target.value })} /></label>
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
        {note && <p className={note.ok ? 'ok' : 'err'} role="status">{note.text}</p>}
      </form>
    </section>
  )
}
