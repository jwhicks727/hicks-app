import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSession, sendSignInLink, signOut } from '../lib/auth.js'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { usePrefs, useSeasonTry } from '../lib/prefs.js'
import { GROUPS } from '../lib/cal/observances.js'
import { seasonFor, SEASONS, SEASON_ORDER, SEASON_ART } from '../lib/seasons.js'
import { todayAt } from '../lib/cal/dates.js'

export default function Settings() {
  const session = useSession()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [prefs, update] = usePrefs()
  const [tryKey, setTry] = useSeasonTry()

  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Team Hicks</span>
        <h1 className="greet">Settings</h1>
      </header>

      <Card tint="#453644" label="You" glyph="star" className="span-3">
        {!supabase && <p>The database isn’t connected on this copy of the app.</p>}
        {supabase && session === undefined && <p className="muted">Checking…</p>}
        {supabase && session && (
          <>
            <p>Signed in as <b>{session.user.email}</b>.</p>
            <button type="button" className="btn ghost" onClick={() => signOut()}>Sign out</button>
          </>
        )}
        {supabase && session === null && (
          <form className="form" onSubmit={async (e) => {
            e.preventDefault()
            const { error } = await sendSignInLink(email.trim())
            setSent(error ? { ok: false, text: error.message } : { ok: true, text: 'Check your email for a sign-in link.' })
          }}>
            <label>Your email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <button type="submit" className="btn">Email me a sign-in link</button>
            {sent && <p className={sent.ok ? 'ok' : 'err'} role="status">{sent.text}</p>}
          </form>
        )}
      </Card>

      <Card tint="#4A7FD6" label="Reading and motion" glyph="sunmoon" className="span-3">
        <fieldset className="choice-row"><legend>Text size</legend>
          {[['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={(prefs.textSize || 'normal') === k} onClick={() => update({ textSize: k })}>{l}</button>
          ))}
        </fieldset>
        <fieldset className="choice-row"><legend>Motion</legend>
          {[['device', 'Like this device'], ['less', 'Less motion']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={(prefs.motion || 'device') === k} onClick={() => update({ motion: k })}>{l}</button>
          ))}
        </fieldset>
        <div className="switch-row">
          <span><b>The season’s colours</b><span>Now: {seasonFor(todayAt()).label}. A light wash over the sky, after the Church year and the holidays</span></span>
          <button type="button" className="switch" role="switch" aria-checked={prefs.seasonal !== false} aria-label="The season’s colours" onClick={() => update({ seasonal: prefs.seasonal === false })}><i /></button>
        </div>
        {prefs.seasonal !== false && (
          <label className="form season-try">
            <span><b>Try on another season</b><span>Until the app is closed, then it’s back to today’s</span></span>
            <select value={tryKey} onChange={(e) => setTry(e.target.value)}>
              <option value="">Today’s: {seasonFor(todayAt()).label}</option>
              {SEASON_ORDER.map((k) => <option key={k} value={k}>{SEASONS[k].label}{SEASON_ART[k] ? ', with Laurie’s painting' : ''}</option>)}
            </select>
          </label>
        )}
        <div className="switch-row">
          <span><b>A mindful moment on Home</b><span>A line from Thich Nhat Hanh each day, and a pause to breathe</span></span>
          <button type="button" className="switch" role="switch" aria-checked={prefs.mindful !== false} aria-label="A mindful moment on Home" onClick={() => update({ mindful: prefs.mindful === false })}><i /></button>
        </div>
        <div className="switch-row">
          <span><b>The bowl</b><span>A struck bowl starts and ends a breathing pause</span></span>
          <button type="button" className="switch" role="switch" aria-checked={prefs.bell !== false} aria-label="The bowl" onClick={() => update({ bell: prefs.bell === false })}><i /></button>
        </div>
        <p className="muted">These stay on this device.</p>
      </Card>

      <Card tint="#3E7A4C" label="What the calendar shows" glyph="calendar" className="span-6">
        <p>The Church’s days are always there. Each of these can be switched off on this device.</p>
        <ul className="switches">
          {Object.entries(GROUPS).map(([k, g]) => {
            const on = (prefs.calendarGroups || {})[k] !== false
            return (
              <li key={k}>
                <span><b>{g.name}</b><span>{g.word}</span></span>
                <button type="button" className="switch" role="switch" aria-checked={on} aria-label={g.name}
                  onClick={() => update({ calendarGroups: { ...(prefs.calendarGroups || {}), [k]: !on } })}><i /></button>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card tint="#8A5BC4" label="More" glyph="calendar" className="span-6">
        <nav className="console-links">
          <Link to="/setup"><b>Setup</b><span>Every outside source the app reads, pasted in once and kept fresh</span></Link>
          <Link to="/reports"><b>Reports</b><span>What’s in the app, at a glance</span></Link>
        </nav>
      </Card>
    </>
  )
}
