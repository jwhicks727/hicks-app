import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useSession, signOut } from '../lib/auth.js'
import { Card } from '../ui/Card.jsx'
import PasswordForm from './PasswordForm.jsx'
import { Link } from '../shell/Link.jsx'
import { usePrefs, useSeasonTry } from '../lib/prefs.js'
import { GROUPS } from '../lib/cal/observances.js'
import { seasonFor, SEASONS, SEASON_ORDER } from '../lib/seasons.js'
import { showFor } from '../lib/seasonShows.js'
import { usePaintings } from '../parts/PaintingsProvider.jsx'
import { todayAt } from '../lib/cal/dates.js'
import { navigate } from '../lib/router.js'
import { useFamily } from '../lib/useCalendar.js'
import { reminderOn } from '../lib/sitReminder.js'

export default function Settings() {
  const session = useSession()
  const family = useFamily(session)
  const myEmail = session && session.user.email ? session.user.email.toLowerCase() : null
  const meHere = myEmail ? family.members.find((m) => (m.email || '').toLowerCase() === myEmail) : null
  const [prefs, update] = usePrefs()
  const [tryKey, setTry] = useSeasonTry()
  const { list: paintings } = usePaintings()

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
            <p className="muted small">This copy of the app: {import.meta.env.VITE_APP_BUILD || 'development'}</p>
            <PasswordForm email={session.user.email} />
          </>
        )}
      </Card>

      <Card tint="#4A7FD6" label="Reading, light and motion" glyph="sunmoon" className="span-3">
        <fieldset className="choice-row"><legend>Text size</legend>
          {[['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={(prefs.textSize || 'normal') === k} onClick={() => update({ textSize: k })}>{l}</button>
          ))}
        </fieldset>
        <fieldset className="choice-row"><legend>Light or dark</legend>
          {[['device', 'Like this device'], ['light', 'Light'], ['dark', 'Dark']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={(prefs.theme || 'device') === k} onClick={() => update({ theme: k })}>{l}</button>
          ))}
        </fieldset>
        <fieldset className="choice-row"><legend>Motion</legend>
          {[['device', 'Like this device'], ['less', 'Less motion']].map(([k, l]) => (
            <button key={k} type="button" aria-pressed={(prefs.motion || 'device') === k} onClick={() => update({ motion: k })}>{l}</button>
          ))}
        </fieldset>
        <div className="switch-row">
          <span><b>The season’s show</b><span>{(() => { const sh = showFor(seasonFor(todayAt()).key, paintings); return sh ? `Now, ${seasonFor(todayAt()).label}: ${sh.what}` : `${seasonFor(todayAt()).label} has none of Laurie’s paintings yet` })()}</span></span>
          <button type="button" className="switch" role="switch" aria-checked={prefs.seasonal !== false} aria-label="The season’s show" onClick={() => update({ seasonal: prefs.seasonal === false })}><i /></button>
        </div>
        {prefs.seasonal !== false && (
          <div className="form season-try">
            <label htmlFor="season-try"><b>Try another season</b><span>Its show and its painting on Home, until the app is closed</span></label>
            <div className="season-try-row">
              <select id="season-try" value={tryKey} onChange={(e) => setTry(e.target.value)}>
                <option value="">Today’s: {seasonFor(todayAt()).label}</option>
                {SEASON_ORDER.filter((k) => showFor(k, paintings)).map((k) => <option key={k} value={k}>{SEASONS[k].label}</option>)}
              </select>
              <button type="button" className="btn ghost" disabled={!showFor(tryKey || seasonFor(todayAt()).key, paintings)} onClick={() => window.dispatchEvent(new CustomEvent('hicks:show', { detail: { key: tryKey || seasonFor(todayAt()).key } }))}>Play it</button>
            </div>
          </div>
        )}
        <div className="switch-row">
          <span><b>Home’s opening</b><span>The crow and the leaves play once a day on each device. Play today’s again, from the top of Home.</span></span>
          <button type="button" className="btn ghost" onClick={() => {
            try { localStorage.removeItem('teamhicks.flights'); localStorage.removeItem('teamhicks.shows') } catch { /* nothing kept */ }
            navigate('/')
            setTimeout(() => window.dispatchEvent(new CustomEvent('hicks:show')), 1400)
          }}>Play it again</button>
        </div>
        <div className="switch-row">
          <span><b>A mindful moment on Home</b><span>A line from the teaching each day, a word on it on Sundays, and the morning sit</span></span>
          <button type="button" className="switch" role="switch" aria-checked={prefs.mindful !== false} aria-label="A mindful moment on Home" onClick={() => update({ mindful: prefs.mindful === false })}><i /></button>
        </div>
        <div className="switch-row">
          <span><b>Remind me to sit</b><span>First on Home each day, until today’s sit is done or skipped</span></span>
          <button type="button" className="switch" role="switch" aria-checked={reminderOn(prefs, meHere)} aria-label="Remind me to sit" onClick={() => update({ sitReminder: !reminderOn(prefs, meHere) })}><i /></button>
        </div>
        <div className="switch-row">
          <span><b>Sounds on the lists</b><span>A soft note for each tick, climbing as the list goes, and a little tune when it’s done</span></span>
          <button type="button" className="switch" role="switch" aria-checked={prefs.listSounds !== false} aria-label="Sounds on the lists" onClick={() => update({ listSounds: prefs.listSounds === false })}><i /></button>
        </div>
        <div className="switch-row">
          <span><b>The bowl</b><span>A struck bowl begins and ends a sit</span></span>
          <button type="button" className="switch" role="switch" aria-checked={prefs.bell !== false} aria-label="The bowl" onClick={() => update({ bell: prefs.bell === false })}><i /></button>
        </div>
        <div className="switch-row">
          <span><b>From the sit to the journal</b><span>When a sit ends, “On to your journal” (until today’s page is written)</span></span>
          <button type="button" className="switch" role="switch" aria-checked={prefs.sitJournal !== false} aria-label="From the sit to the journal" onClick={() => update({ sitJournal: prefs.sitJournal === false })}><i /></button>
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
          <Link to="/admin"><b>Admin</b><span>Every outside source the app reads, pasted in once and kept fresh</span></Link>
          <Link to="/reports"><b>Reports</b><span>What’s in the app, at a glance</span></Link>
        </nav>
      </Card>
    </>
  )
}
