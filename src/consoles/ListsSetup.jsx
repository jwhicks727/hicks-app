import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchAll } from '../lib/useCalendar.js'
import { addDays } from '../lib/cal/dates.js'
import { listDay, NAMES, namesFor } from '../lib/routines.js'
import { KINDS, LEVELS, LEVEL_WORDS, catalogue, readiness, runFor, standing, planNext, GAPS } from '../lib/challenges.js'
import { useNow } from '../lib/useNow.js'
import { Card } from '../ui/Card.jsx'
import { Confirm } from '../ui/Confirm.jsx'
import { Toast } from '../ui/Toast.jsx'
import { Link } from '../shell/Link.jsx'
import '../places/lists/lists.css'

// Admin › the morning and evening lists: what they're called, whether the
// family challenges run and how often, each challenge (switch it off, change
// its words and numbers, put it back as it was, add the family's own), and
// the one under way or coming (start one now, or cancel it). Parents only:
// the database turns anyone else's changes away.

const SHORT_DAY = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
const PACE = { relaxed: 'Relaxed: about a week between', regular: 'Regular: a few days between', lively: 'Lively: a day between' }
const sorry = (m) => (/permission|policy|denied|violates row-level/i.test(m || '') ? 'Only Jason or Laurie can change this.' : m)

function useListsAdmin() {
  const [s, setS] = useState({ loaded: false, error: null, settings: null, rows: [], overrides: [], runs: [] })
  const [n, setN] = useState(0)
  const now = useNow()
  const today = listDay(now)
  useEffect(() => {
    let live = true
    if (!supabase) return undefined
    Promise.all([
      supabase.from('routine_settings').select('names, challenges_on, pace').eq('id', true).maybeSingle(),
      supabase.from('family_challenges').select('*'),
      supabase.from('challenge_runs').select('*').order('starts_on', { ascending: false }).limit(200),
      fetchAll(() => supabase.from('routine_days').select('member_id, on_date, part, status, total, done, done_at').gte('on_date', addDays(today, -60)).order('on_date').order('member_id').order('part')),
    ]).then(([a, b, c, d]) => {
      if (!live) return
      const error = [a, b, c, d].map((x) => x.error).find(Boolean)
      setS({ loaded: true, error: error ? error.message : null, missing: Boolean(error && /does not exist|schema cache|Could not find/i.test(error.message)), settings: a.data || { names: 'birds', challenges_on: true, pace: 'regular' }, overrides: b.data || [], runs: c.data || [], rows: d.data || [] })
    })
    return () => { live = false }
  }, [n, today])
  return { ...s, today, reload: () => setN((x) => x + 1) }
}

function ChallengeForm({ c, onSave, onCancel, custom = false }) {
  const [f, setF] = useState({ title: c.title || '', blurb: c.blurb || '', kind: c.kind || 'everyone', part: c.part || 'both', level: c.level || 'easy', days: c.days || 3, target: c.target || 1, by_time: c.by_time || '07:30' })
  const [err, setErr] = useState(null)
  const set = (p) => setF({ ...f, ...p })
  const unit = f.kind === 'share' ? 'percent of everything' : f.kind === 'firsts' ? '(each of us once)' : 'days'
  return (
    <form className="form dl-cform" onSubmit={async (e) => {
      e.preventDefault()
      if (!f.title.trim()) { setErr('It needs a name.'); return }
      if (f.kind !== 'share' && f.kind !== 'firsts' && +f.target > +f.days) { setErr('It can’t ask for more days than it lasts.'); return }
      const p = await onSave({ title: f.title.trim().slice(0, 80), blurb: f.blurb.trim().slice(0, 300) || null, kind: f.kind, part: f.part, level: f.level, days: Math.min(31, Math.max(1, +f.days || 1)), target: Math.min(100, Math.max(1, +f.target || 1)), by_time: f.kind === 'by-time' ? f.by_time : null })
      if (p) setErr(p)
    }}>
      <label>Name<input required maxLength={80} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Pancake Saturday" /></label>
      <label>What it asks<textarea rows={2} maxLength={300} value={f.blurb} onChange={(e) => set({ blurb: e.target.value })} placeholder="In a sentence, as the family will read it" /></label>
      {custom && (
        <div className="form-row">
          <label>Kind<select value={f.kind} onChange={(e) => set({ kind: e.target.value })}>{Object.entries(KINDS).map(([k, w]) => <option key={k} value={k}>{w}</option>)}</select></label>
          <label>Which lists<select value={f.part} onChange={(e) => set({ part: e.target.value })}><option value="both">Both</option><option value="morning">Mornings</option><option value="evening">Evenings</option></select></label>
        </div>
      )}
      <div className="form-row three">
        <label>How hard<select value={f.level} onChange={(e) => set({ level: e.target.value })}>{LEVELS.map((l) => <option key={l} value={l}>{LEVEL_WORDS[l]}</option>)}</select></label>
        <label>Lasts (days)<input type="number" min={1} max={31} value={f.days} onChange={(e) => set({ days: e.target.value })} /></label>
        <label>Asks for <span className="muted">{unit}</span><input type="number" min={1} max={100} value={f.target} onChange={(e) => set({ target: e.target.value })} /></label>
      </div>
      {f.kind === 'by-time' && <label>Finished by<input type="time" value={f.by_time} onChange={(e) => set({ by_time: e.target.value })} /></label>}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions"><button type="submit" className="btn">Save</button><button type="button" className="btn ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  )
}

export default function ListsSetup({ members = [] }) {
  const A = useListsAdmin()
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [asking, setAsking] = useState(null) // { kind: 'cancel' | 'start', run?, key? }
  const [startKey, setStartKey] = useState('')
  const [note, setNote] = useState(null)
  const [toast, setToast] = useState(null)
  if (!supabase) return null
  if (!A.loaded) return <Card tint="#E38B2C" label="Morning and evening lists" glyph="sunmoon" className="span-6"><p className="muted">Loading…</p></Card>
  if (A.missing) return <Card tint="#E38B2C" label="Morning and evening lists" glyph="sunmoon" className="span-6"><p>The lists’ tables aren’t in the database yet: run <code>20261107180000_morning_evening_lists.sql</code> once (docs/DATABASE.md).</p></Card>
  const names = namesFor(A.settings.names)
  const list = catalogue(A.overrides)
  const runsNow = A.runs.filter((r) => r.status === 'planned' && r.ends_on >= A.today).sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1))
  const current = runsNow[0] || null
  const st = current ? standing(current, A.rows, A.today) : null
  const ready = readiness(A.rows)
  const next = !current ? planNext({ list, runs: A.runs, rows: A.rows, today: A.today, pace: A.settings.pace, on: A.settings.challenges_on }) : null
  const child = members.find((m) => m.role === 'child')

  const setSettings = async (patch) => {
    const { error } = await supabase.from('routine_settings').update(patch).eq('id', true)
    if (error) setNote(sorry(error.message)); else { setNote(null); A.reload() }
  }
  const saveOverride = async (key, patch, custom = false) => {
    const { error } = await supabase.from('family_challenges').upsert({ key, custom, ...patch }, { onConflict: 'key' })
    if (error) return sorry(error.message)
    setEditing(null); setAdding(false); A.reload(); return null
  }
  const putBack = async (key) => {
    const old = A.overrides.find((r) => r.key === key)
    const { error } = await supabase.from('family_challenges').delete().eq('key', key)
    if (error) { setNote(sorry(error.message)); return }
    A.reload()
    if (old) setToast({ text: old.custom ? `Removed “${old.title}”.` : 'Put back as it was.', undo: async () => { await supabase.from('family_challenges').upsert(old, { onConflict: 'key' }); A.reload() } })
  }
  const startNow = async (key) => {
    setAsking(null)
    const c = list.find((x) => x.key === key)
    if (!c) return
    for (const r of runsNow) { const { error } = await supabase.from('challenge_runs').update({ status: 'cancelled' }).eq('id', r.id); if (error) { setNote(sorry(error.message)); return } }
    const run = runFor(c, A.today, A.rows, A.today)
    const { error } = await supabase.from('challenge_runs').insert({ challenge_key: run.key, spec: run.spec, starts_on: run.starts_on, ends_on: run.ends_on, status: 'planned', planned_by: 'parent' })
    if (error) setNote(sorry(error.message)); else { setNote(`“${c.title}” starts today. It’s on everyone’s Home.`); A.reload() }
  }
  const cancel = async (run) => {
    setAsking(null)
    const { error } = await supabase.from('challenge_runs').update({ status: 'cancelled' }).eq('id', run.id)
    if (error) setNote(sorry(error.message)); else { setNote(`Cancelled “${run.spec.title}”. The next is planned a few days on.`); A.reload() }
  }

  return (
    <>
      <Card tint="#E38B2C" label="Morning and evening lists" glyph="sunmoon" className="span-6">
        {A.error && <p className="err">{A.error}</p>}
        <fieldset className="dl-names"><legend>What they’re called</legend>
          {Object.entries(NAMES).map(([k, v]) => (
            <button key={k} type="button" aria-pressed={(A.settings.names || 'birds') === k} onClick={() => setSettings({ names: k })}>
              <b>{v.morning} · {v.evening}</b><span>{v.line}</span>
            </button>
          ))}
        </fieldset>
        <p className="muted">Everyone keeps their own lists from Home. {child ? <>Jason and Laurie keep <Link to={`/home/lists/${child.id}`}>{child.name}’s</Link> with her.</> : null} What’s on anyone’s list is theirs: Admin and Reports see only how each day went.</p>
        {note && <p className="muted" role="status">{note}</p>}
      </Card>

      <Card tint="#8A5BC4" label="Family challenges" glyph="star" tag={A.settings.challenges_on ? 'On' : 'Off'} className="span-6 dl-admin">
        <div className="switch-row">
          <span><b>Family challenges</b><span>They start by themselves once two of you have finished a list on three days each{ready.ready ? ' (you have)' : ''}.</span></span>
          <button type="button" className="switch" role="switch" aria-checked={A.settings.challenges_on !== false} aria-label="Family challenges" onClick={() => setSettings({ challenges_on: A.settings.challenges_on === false })}><i /></button>
        </div>
        <fieldset className="choice-row"><legend>How often</legend>
          {Object.keys(GAPS).map((k) => <button key={k} type="button" aria-pressed={(A.settings.pace || 'regular') === k} onClick={() => setSettings({ pace: k })} title={PACE[k]}>{k[0].toUpperCase() + k.slice(1)}</button>)}
        </fieldset>

        <div className="dl-now">
          {current ? (
            <>
              <p><b>{st && st.state === 'coming' ? 'Coming' : 'Under way'}: {current.spec.title}</b> · {LEVEL_WORDS[current.spec.level]} · {SHORT_DAY(current.starts_on)} to {SHORT_DAY(current.ends_on)}{st ? ` · ${st.words}` : ''}{current.planned_by === 'parent' ? ' · started by hand' : ''}</p>
              <button type="button" className="btn ghost" onClick={() => setAsking({ kind: 'cancel', run: current })}>Cancel it</button>
            </>
          ) : next ? (
            <p><b>Next:</b> {list.find((c) => c.key === next.key)?.title} would start {SHORT_DAY(next.starts_on)}. It’s planned the next time anyone opens Home.</p>
          ) : <p className="muted">{A.settings.challenges_on === false ? 'Switched off.' : ready.ready ? 'Nothing planned yet: the next comes a few days after the last.' : 'Waiting for the lists to get going.'}</p>}
          <div className="dl-start">
            <select value={startKey} onChange={(e) => setStartKey(e.target.value)} aria-label="A challenge to start now">
              <option value="">Start one now…</option>
              {list.filter((c) => c.enabled).map((c) => <option key={c.key} value={c.key}>{c.title} ({LEVEL_WORDS[c.level].toLowerCase()})</option>)}
            </select>
            <button type="button" className="btn" disabled={!startKey} onClick={() => setAsking({ kind: 'start', key: startKey })}>Start it</button>
          </div>
        </div>

        <details className="dl-how dl-cdetails">
        <summary>Change the challenges ({list.filter((c) => c.enabled).length} of {list.length} on)</summary>
        <ul className="sources dl-clist">
          {list.map((c) => (
            <li key={c.key} className={'source' + (c.enabled ? '' : ' off')}>
              {editing === c.key ? (
                <ChallengeForm c={c} custom={c.custom} onCancel={() => setEditing(null)} onSave={(p) => saveOverride(c.key, c.custom ? p : Object.fromEntries(Object.entries(p).filter(([k]) => ['title', 'blurb', 'level', 'days', 'target', 'by_time'].includes(k))), c.custom)} />
              ) : (
                <>
                  <div className="source-t">
                    <b>{c.title} <span className={'state lvl-' + c.level}>{LEVEL_WORDS[c.level]}</span></b>
                    <span>{c.blurb}</span>
                    <span>{c.days} {c.days === 1 ? 'day' : 'days'}{c.timing === 'monday' ? ' · starts on a Monday' : c.timing === 'saturday' ? ' · starts on a Saturday' : c.timing === 'full-moon' ? ' · around the full moon' : c.timing === 'late-sunrise' ? ' · only while the sun rises late' : ''}{c.custom ? ' · the family’s own' : c.changed ? ' · changed here' : ''}</span>
                  </div>
                  <div className="source-b">
                    <button type="button" className="switch" role="switch" aria-checked={c.enabled} aria-label={`${c.title}: on`} onClick={() => saveOverride(c.key, c.custom ? { ...pick(A.overrides.find((r) => r.key === c.key)), enabled: !c.enabled } : { enabled: !c.enabled }, c.custom)}><i /></button>
                    <button type="button" className="btn ghost" onClick={() => setEditing(c.key)}>Change</button>
                    {(c.changed || c.custom) && <button type="button" className="btn ghost" onClick={() => putBack(c.key)}>{c.custom ? 'Remove' : 'As it was'}</button>}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
        {adding ? (
          <ChallengeForm c={{}} custom onCancel={() => setAdding(false)} onSave={(p) => saveOverride(`own-${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'challenge'}-${Math.random().toString(36).slice(2, 6)}`, { ...p, enabled: true }, true)} />
        ) : <button type="button" className="btn" onClick={() => setAdding(true)}>Add the family’s own</button>}
        </details>

        {A.runs.some((r) => r.status !== 'planned') && (
          <details className="dl-how">
            <summary>The ones we’ve done</summary>
            <ul className="coming">
              {A.runs.filter((r) => r.status !== 'planned').slice(0, 30).map((r) => <li key={r.id}><b>{r.spec.title}</b>, {SHORT_DAY(r.starts_on)}: {r.status === 'won' ? 'won, on the shelf' : r.status === 'missed' ? `got away${r.result && r.result.words ? ` (${r.result.words})` : ''}` : 'cancelled'}</li>)}
            </ul>
          </details>
        )}
      </Card>

      {asking && asking.kind === 'cancel' && (
        <Confirm title={`Cancel “${asking.run.spec.title}”?`} yes="Cancel it" no="Keep it" danger onYes={() => cancel(asking.run)} onNo={() => setAsking(null)}>
          <p>It leaves everyone’s Home, and the next is planned a few days on.</p>
        </Confirm>
      )}
      {asking && asking.kind === 'start' && (
        <Confirm title={`Start “${list.find((c) => c.key === asking.key)?.title}” today?`} yes="Start it" onYes={() => startNow(asking.key)} onNo={() => setAsking(null)}>
          <p>{current ? `“${current.spec.title}” is ${st && st.state === 'coming' ? 'coming' : 'under way'}; it’s cancelled to make room. ` : ''}It appears on everyone’s Home at once.</p>
        </Confirm>
      )}
      {toast && <Toast action="Undo" onAction={() => { toast.undo(); setToast(null) }} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </>
  )
}

const pick = (r) => (r ? Object.fromEntries(Object.entries(r).filter(([k]) => ['title', 'blurb', 'kind', 'part', 'level', 'days', 'target', 'by_time'].includes(k))) : {})

