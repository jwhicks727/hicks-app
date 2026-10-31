import { useState } from 'react'
import { Card } from '../ui/Card.jsx'
import { Crumb, Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { Confirm } from '../ui/Confirm.jsx'
import { useDraft } from '../lib/useDraft.js'
import { addDays } from '../lib/cal/dates.js'
import { addTask, saveTask, removeTask, addGoal, saveGoal, removeGoal, addGrade, removeGrade } from './useAcademy.js'
import { itemSrc } from './items.js'
import { taskDay, dueWords, goalProgress, gradeCheer, latestByClass, starsThisMonth, GOAL_ICONS, lastDays } from './school.js'

// Tasks (each one done lights a star), goals (steps to a trophy) and grades
// (an A, or a better grade than last time, gets a medal or a ribbon).

const Head = ({ kicker, title }) => <header className="hero span-6"><Crumb to="/academy">The Academy</Crumb><span className="kicker">{kicker}</span><h1 className="greet">{title}</h1></header>

export function TasksPage({ a, today, celebrate }) {
  const day = taskDay(a.tasks, today)
  const [f, setF, clear] = useDraft('academy.task', { title: '', subject: '', due: 'today', date: '' })
  const stars = starsThisMonth(a.tasks, today)
  const week = lastDays(today, 7).map((d) => ({ d, n: a.tasks.filter((t) => t.done_on === d).length }))
  const due = f.due === 'today' ? today : f.due === 'tomorrow' ? addDays(today, 1) : f.due === 'none' ? null : f.date || null
  async function add(e) {
    e.preventDefault()
    if (!f.title.trim()) return
    await addTask({ title: f.title.trim(), subject: f.subject.trim() || null, due_on: due })
    clear(); a.reload()
  }
  async function tick(t) {
    await saveTask(t.id, { done_on: today }); a.reload()
    celebrate({ title: 'A star for you!', line: `${stars + 1} this month`, prize: 'glowing-star' })
  }
  const Row = ({ t, done }) => (
    <li className={done ? 'done' : ''}>
      {done ? <button type="button" className="ac-check on" aria-label={`Not done yet: ${t.title}`} onClick={async () => { await saveTask(t.id, { done_on: null }); a.reload() }}>★</button> : <button type="button" className="ac-check" aria-label={`Done: ${t.title}`} onClick={() => tick(t)} />}
      <span><b>{t.title}</b><small className={!done && t.due_on && t.due_on < today ? 'late' : ''}>{[t.subject, done ? 'Done' : dueWords(t.due_on, today)].filter(Boolean).join(' · ')}</small></span>
      <button type="button" className="ac-x" aria-label={`Remove ${t.title}`} onClick={async () => { await removeTask(t.id); a.reload() }}>✕</button>
    </li>
  )
  return (
    <>
      <Head kicker="Tasks" title="Things to do" />
      <Card tint="#F2C14E" label="This week’s stars" glyph="star" tag={`${stars} this month`} className="span-6">
        <div className="ac-week">{week.map(({ d, n }) => <span key={d} className={n ? 'lit' : ''}><b>{n ? '★'.repeat(Math.min(n, 5)) : '·'}</b><small>{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][new Date(d + 'T12:00:00Z').getUTCDay()]}</small></span>)}</div>
      </Card>
      <Card tint="#F2C14E" label="Add a task" glyph="calendar" className="span-2">
        <form className="form" onSubmit={add}>
          <label>What<input maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Math worksheet p. 42" /></label>
          <label>Class or kind (if any)<input maxLength={60} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="Math, chores, Girl Scouts…" list="ac-subjects" /></label>
          <datalist id="ac-subjects">{[...new Set(a.tasks.map((t) => t.subject).filter(Boolean))].map((s) => <option key={s} value={s} />)}</datalist>
          <fieldset className="choice-row"><legend>When</legend>{[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['date', 'A day'], ['none', 'Someday']].map(([k, l]) => <button key={k} type="button" aria-pressed={f.due === k} onClick={() => setF({ ...f, due: k })}>{l}</button>)}</fieldset>
          {f.due === 'date' && <label>The day<input type="date" value={f.date} min={today} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>}
          <div className="form-actions"><button type="submit" className="btn" disabled={!f.title.trim()}>Add it</button></div>
        </form>
      </Card>
      <Card tint="#F2C14E" label="To do" glyph="calendar" tag={`${day.late.length + day.today.length + day.coming.length}`} className="span-4">
        {day.late.length > 0 && <><h3 className="ac-h">From before</h3><ul className="ac-tasks">{day.late.map((t) => <Row key={t.id} t={t} />)}</ul></>}
        <h3 className="ac-h">Today</h3>
        <ul className="ac-tasks">{day.today.map((t) => <Row key={t.id} t={t} />)}{day.done.map((t) => <Row key={t.id} t={t} done />)}</ul>
        {!day.today.length && !day.done.length && <p className="muted">Nothing today.</p>}
        {day.coming.length > 0 && <><h3 className="ac-h">Coming up</h3><ul className="ac-tasks">{day.coming.map((t) => <Row key={t.id} t={t} />)}</ul></>}
      </Card>
    </>
  )
}

export function GoalsPage({ a, today }) {
  const open = a.goals.filter((g) => !g.done_on), reached = a.goals.filter((g) => g.done_on).sort((x, y) => (x.done_on < y.done_on ? 1 : -1))
  const [f, setF, clear] = useDraft('academy.goal', { title: '', why: '', icon: 'rocket', due_on: '', steps: '' })
  const [busy, setBusy] = useState(null)
  async function add() {
    setBusy('Saving…')
    const steps = f.steps.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 30).map((t) => ({ t: t.slice(0, 160), done: false }))
    const { data, error } = await addGoal({ title: f.title.trim(), why: f.why.trim() || null, icon: f.icon, due_on: f.due_on || null, steps })
    if (error) { setBusy(error.message); return }
    clear(); setBusy(null); a.reload(); navigate(`/academy/goal/${data.id}`)
  }
  return (
    <>
      <Head kicker="Goals" title="Dream it, do it" />
      <Card tint="#8A5BC4" label="A new goal" glyph="star" className="span-3">
        <div className="form">
          <label>What do you want to do?<input maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Sell 200 boxes of cookies" /></label>
          <label>Why it matters to you<textarea rows={2} maxLength={1000} value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} /></label>
          <fieldset className="choice-row ac-icons"><legend>Its picture</legend>{GOAL_ICONS.map((k) => <button key={k} type="button" aria-pressed={f.icon === k} aria-label={k} onClick={() => setF({ ...f, icon: k })}><img src={itemSrc(k)} alt="" width="28" height="28" /></button>)}</fieldset>
          <label>The steps, one on each line<textarea rows={4} value={f.steps} onChange={(e) => setF({ ...f, steps: e.target.value })} placeholder={'Make a poster\nAsk the neighbours\nA booth at church'} /></label>
          <label>By when (if there’s a day)<input type="date" min={today} value={f.due_on} onChange={(e) => setF({ ...f, due_on: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="btn" disabled={!f.title.trim() || busy === 'Saving…'} onClick={add}>Set this goal</button></div>
          {busy && busy !== 'Saving…' && <p className="err" role="alert">{busy}</p>}
        </div>
      </Card>
      <Card tint="#8A5BC4" label="Going for it" glyph="star" tag={`${open.length}`} className="span-3">
        {open.length ? <ul className="ac-goals">{open.map((g) => { const p = goalProgress(g); return <li key={g.id}><Link to={`/academy/goal/${g.id}`}><img src={itemSrc(g.icon || 'rocket')} alt="" width="34" height="34" /><span><b>{g.title}</b><i className="ac-bar"><i style={{ width: `${Math.round(p.ratio * 100)}%` }} /></i><small>{p.total ? `${p.done} of ${p.total} steps` : 'No steps yet'}{g.due_on ? ` · ${dueWords(g.due_on, today).replace('Due', 'by').replace('Was due', 'was due')}` : ''}</small></span></Link></li> })}</ul> : <p className="muted">No goals yet. What would you love to do?</p>}
        {reached.length > 0 && <><h3 className="ac-h">Reached</h3><ul className="ac-goals reached">{reached.map((g) => <li key={g.id}><Link to={`/academy/goal/${g.id}`}><img src={itemSrc('trophy')} alt="A trophy" width="34" height="34" /><span><b>{g.title}</b><small>Reached {g.done_on}</small></span></Link></li>)}</ul></>}
      </Card>
    </>
  )
}

export function GoalPage({ id, a, today, celebrate, anna }) {
  const g = a.goals.find((x) => x.id === id)
  const [step, setStep] = useState(''), [gone, setGone] = useState(false)
  if (!g) return <><Head kicker="Goals" title="Not found" /><Card tint="#8A5BC4" label="This goal isn’t here" glyph="star" className="span-6"><Link to="/academy/goals">All goals</Link></Card></>
  const p = goalProgress(g)
  const steps = Array.isArray(g.steps) ? g.steps : []
  const setSteps = async (next) => { await saveGoal(g.id, { steps: next }); a.reload() }
  async function toggle(k) {
    const next = steps.map((s, n) => (n === k ? { ...s, done: !s.done } : s))
    await setSteps(next)
    if (!steps[k].done) {
      const left = next.filter((s) => !s.done).length
      celebrate(left ? { title: 'One step closer!', line: `${left} to go`, prize: 'sparkles' } : { title: 'Every step done!', line: 'Mark the goal reached for its trophy.', prize: 'party-popper' })
    }
  }
  async function reach() {
    await saveGoal(g.id, { done_on: today }); a.reload()
    celebrate({ title: `Goal reached: ${g.title}!`, line: `A trophy for the Hall of Fame. Way to go, ${anna.name}!`, prize: 'trophy', big: true, long: true })
  }
  return (
    <>
      <header className="hero span-6"><Crumb to="/academy/goals">Goals</Crumb><span className="kicker">{g.done_on ? 'Reached!' : 'A goal'}</span><h1 className="greet">{g.title}</h1></header>
      <Card tint="#8A5BC4" label={g.done_on ? `Reached ${g.done_on}` : `${Math.round(p.ratio * 100)}% of the way`} glyph="star" className="span-4">
        <div className="ac-goal-top"><img src={itemSrc(g.done_on ? 'trophy' : g.icon || 'rocket')} alt="" width="64" height="64" /><span>{g.why && <p>{g.why}</p>}{g.due_on && <small className="muted">{dueWords(g.due_on, today)}</small>}</span></div>
        <i className="ac-bar big"><i style={{ width: `${Math.round(p.ratio * 100)}%` }} /></i>
        <ul className="ac-steps">{steps.map((s, k) => <li key={k} className={s.done ? 'done' : ''}><button type="button" className={'ac-check' + (s.done ? ' on' : '')} aria-pressed={s.done} aria-label={s.t} onClick={() => toggle(k)}>{s.done ? '✓' : ''}</button><span>{s.t}</span><button type="button" className="ac-x" aria-label={`Remove ${s.t}`} onClick={() => setSteps(steps.filter((_, n) => n !== k))}>✕</button></li>)}</ul>
        <form className="ac-quick" onSubmit={(e) => { e.preventDefault(); if (step.trim()) { setSteps([...steps, { t: step.trim().slice(0, 160), done: false }].slice(0, 30)); setStep('') } }}><input value={step} onChange={(e) => setStep(e.target.value)} placeholder="Add a step" aria-label="Add a step" /><button type="submit" className="btn" disabled={!step.trim()}>Add</button></form>
        <div className="form-actions">
          {!g.done_on ? <button type="button" className="btn ac-gleam" onClick={reach}>I did it!</button> : <button type="button" className="btn ghost" onClick={async () => { await saveGoal(g.id, { done_on: null }); a.reload() }}>Not quite yet</button>}
          <button type="button" className="btn ghost danger-t" onClick={() => setGone(true)}>Remove</button>
        </div>
      </Card>
      {gone && <Confirm title="Remove this goal?" yes="Remove it" danger onNo={() => setGone(false)} onYes={async () => { await removeGoal(g.id); a.reload(); navigate('/academy/goals', { replace: true }) }}>{g.done_on ? 'Its trophy leaves the Hall of Fame too.' : 'Its steps go with it.'}</Confirm>}
    </>
  )
}

export function GradesPage({ a, today, celebrate, parent, anna }) {
  const [f, setF, clear] = useDraft('academy.grade', { class_name: '', mark: '', percent: '', term: '', on_date: today, note: '' })
  const [busy, setBusy] = useState(null)
  const latest = latestByClass(a.grades)
  const classes = [...new Set(a.grades.map((g) => g.class_name))].sort()
  async function add() {
    setBusy('Saving…')
    const row = { class_name: f.class_name.trim(), mark: f.mark.trim().toUpperCase().slice(0, 8) || null, percent: f.percent === '' ? null : Number(f.percent), term: f.term.trim() || null, on_date: f.on_date || today, note: f.note.trim() || null }
    const { data, error } = await addGrade(row)
    if (error) { setBusy(error.message); return }
    clear(); setBusy(null); a.reload()
    const c = gradeCheer(data, [...a.grades, data])
    if (c) celebrate({ title: c.title, line: `Off to the Hall of Fame. So proud of you, ${anna.name}!`, prize: c.prize, big: true, long: true })
  }
  return (
    <>
      <Head kicker="Grades" title="Report card" />
      <Card tint="#4A7FD6" label="Each class, latest" glyph="calendar" className="span-4">
        {latest.length ? <div className="ac-report">{latest.map((g) => { const c = gradeCheer(g, a.grades); const hist = a.grades.filter((x) => x.class_name === g.class_name); return (
          <div key={g.class_name} className={'ac-rc' + (c ? ' cheer' : '')}>
            <span className="ac-rc-m">{g.mark || `${g.percent}%`}</span>
            <span className="ac-rc-c"><b>{g.class_name}</b><small>{[g.term, g.percent != null && g.mark ? `${g.percent}%` : null, g.on_date].filter(Boolean).join(' · ')}</small>{hist.length > 1 && <small className="ac-hist">{hist.map((x) => x.mark || `${x.percent}%`).join(' → ')}</small>}</span>
            {c && <img src={itemSrc(c.prize)} alt={c.title} title={c.title} width="32" height="32" />}
          </div>) })}</div> : <p className="muted">No grades yet. Add one when it comes home.</p>}
        <p className="muted small">Only the three of us see these. An A, or going up in a class, is cheered; nothing here ever says a word about a dip.</p>
      </Card>
      <Card tint="#4A7FD6" label="Add a grade" glyph="star" className="span-2">
        <div className="form">
          <label>Class<input maxLength={60} value={f.class_name} onChange={(e) => setF({ ...f, class_name: e.target.value })} list="ac-classes" placeholder="Science" /></label>
          <datalist id="ac-classes">{classes.map((c) => <option key={c} value={c} />)}</datalist>
          <div className="form-row"><label>Grade<input maxLength={3} value={f.mark} onChange={(e) => setF({ ...f, mark: e.target.value })} placeholder="A-" /></label><label>Percent<input inputMode="decimal" maxLength={6} value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value.replace(/[^\d.]/g, '') })} placeholder="92" /></label></div>
          <div className="form-row"><label>Term<input maxLength={40} value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })} placeholder="Q1" /></label><label>Date<input type="date" value={f.on_date} max={today} onChange={(e) => setF({ ...f, on_date: e.target.value })} /></label></div>
          <div className="form-actions"><button type="button" className="btn" disabled={!f.class_name.trim() || (!f.mark.trim() && f.percent === '') || busy === 'Saving…'} onClick={add}>Add it</button></div>
          {busy && busy !== 'Saving…' && <p className="err" role="alert">{busy}</p>}
        </div>
      </Card>
      {parent && a.grades.length > 0 && (
        <Card tint="#4A7FD6" label="Every grade" glyph="calendar" className="span-6">
          <ul className="ac-allgrades">{[...a.grades].reverse().map((g) => <li key={g.id}><b>{g.mark || `${g.percent}%`}</b><span>{g.class_name}{g.term ? ` · ${g.term}` : ''} · {g.on_date}</span><button type="button" className="ac-x" aria-label="Remove this grade" onClick={async () => { await removeGrade(g.id); a.reload() }}>✕</button></li>)}</ul>
        </Card>
      )}
    </>
  )
}
