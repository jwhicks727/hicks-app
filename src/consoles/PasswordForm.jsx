import { useState } from 'react'
import { setPassword } from '../lib/auth.js'
import { passwordIssue, passwordProblem, MIN_PASSWORD } from '../lib/gate.js'

/**
 * Set or change your password, so signing in doesn't cost an email (the
 * built-in sender allows only a few an hour) and works in the installed
 * app. The password goes to Supabase and nowhere else; this device keeps
 * none of it, and a password manager can offer to remember it.
 */
export default function PasswordForm({ email }) {
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  async function save(e) {
    e.preventDefault()
    const issue = passwordIssue(pw, again, email)
    if (issue) { setNote({ ok: false, text: issue }); return }
    setBusy(true)
    const { error } = await setPassword(pw).catch((x) => ({ error: x }))
    setBusy(false)
    if (error) { setNote({ ok: false, text: passwordProblem(error.message) }); return }
    setPw(''); setAgain('')
    setNote({ ok: true, text: 'Saved. Next time, sign in with your email and this password.' })
  }
  return (
    <form className="form pw-form" onSubmit={save}>
      <b>Your password</b>
      <span className="muted small">Sign in with your email and a password, and keep the emailed link as the backup. At least {MIN_PASSWORD} characters, of any kind.</span>
      <input type="email" autoComplete="username" value={email} readOnly tabIndex={-1} aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <label>New password<input type="password" required autoComplete="new-password" minLength={MIN_PASSWORD} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <label>The same again<input type="password" required autoComplete="new-password" minLength={MIN_PASSWORD} value={again} onChange={(e) => setAgain(e.target.value)} /></label>
      <button type="submit" className="btn ghost" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      {note && <p className={note.ok ? 'ok' : 'err'} role="status">{note.text}</p>}
    </form>
  )
}
