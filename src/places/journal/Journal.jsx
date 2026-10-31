import { useMemo, useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { navigate } from '../../lib/router.js'
import { Sheet } from '../../ui/Sheet.jsx'
import { Confirm } from '../../ui/Confirm.jsx'
import Dropzone from '../../ui/Dropzone.jsx'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { useDraft } from '../../lib/useDraft.js'
import { todayAt, parts, MONTHS } from '../../lib/cal/dates.js'
import { HOME_TOWN } from '../../lib/sky.js'
import { PROMPT_SETS, SET_CHOICES, LATER, promptFor, seasonSet, longDate, blankEntry, parseJournalText, readImport, onThisDay, journalBirthday, gratitudeWords, entriesWithWord, openDate, notesDue, agoWords } from '../../lib/journal.js'
import { useJournal, saveEntry, removeEntry, addNote, openNote, removeNote, saveSettings, importEntries } from '../../lib/useJournal.js'
import './journal.css'

// /journal               today's page, a note from your past self, this day in other years
// /journal/<yyyy-mm-dd>   one day's page
// /journal/look-back      every page, newest first, with a search
// /journal/grateful       what comes up most in the gratitudes
// /journal/notes          notes to your future self
// /journal/settings       the questions, your outlets, bringing a journal in
// Only its writer can read a journal: the database returns no one else's rows.
const DAY = /^\d{4}-\d{2}-\d{2}$/
const PRIVATE = 'Only you can read this: not the rest of the family, and not Claude.'
const YEARS = ['', 'A year', 'Two years', 'Three years', 'Four years', 'Five years', 'Six years', 'Seven years', 'Eight years', 'Nine years', 'Ten years']

export default function Journal({ rest = [] }) {
  const session = useSession()
  const family = useFamily(session)
  const j = useJournal(session)
  const today = todayAt(HOME_TOWN.tz, new Date())
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  if (!session || (family.loaded && !me)) {
    return (
      <>
        <header className="hero span-6"><span className="kicker">Only yours</span><h1 className="greet">Journal</h1></header>
        <Card tint="#7A5C9E" label="Sign in first" glyph="star" className="span-6"><p>Each of us has a journal only they can read. <Link to="/settings">Sign in from Settings</Link> to open yours.</p></Card>
      </>
    )
  }
  const props = { j, me, today }
  if (DAY.test(rest[0] || '')) return <DayPage date={rest[0]} {...props} />
  if (rest[0] === 'look-back') return <LookBack {...props} />
  if (rest[0] === 'grateful') return <Grateful {...props} />
  if (rest[0] === 'notes') return <Notes {...props} />
  if (rest[0] === 'settings') return <JournalSettings {...props} />
  return <JournalHome {...props} />
}

const Head = ({ title, crumb = null }) => (
  <header className="hero span-6">
    {crumb && <Crumb to={crumb[0]}>{crumb[1]}</Crumb>}
    <span className="kicker">Only you can read this</span>
    <h1 className="greet">{title}</h1>
  </header>
)
const short = (d) => { const [y, m, dd] = parts(d); return `${MONTHS[m - 1].slice(0, 3)} ${dd}, ${y}` }
// A child's journal starts with gratitudes only; the questions are a grown-up's week
const defaultSet = (me) => (me && me.role === 'child' ? 'none' : 'season')
const questionFor = (j, date, me) => promptFor(date, (j.settings && j.settings.prompt_set) || defaultSet(me), j.settings && j.settings.prompts)

function JournalHome({ j, me, today }) {
  const entry = j.entries.find((e) => e.on_date === today)
  const due = notesDue(j.notes, today)
  const back = onThisDay(j.entries, today)
  const birthday = journalBirthday(j.entries, today)
  const [outlets, setOutlets] = useState(false)
  const grats = j.entries.reduce((n, e) => n + (e.gratitudes || []).length, 0)
  const first = j.entries.length ? j.entries[j.entries.length - 1].on_date : null
  return (
    <>
      <Head title="Journal" />
      {birthday > 0 && (
        <section className="jr-birthday span-6" aria-label="The journal’s birthday">
          <b>{YEARS[birthday] || `${birthday} years`} of journaling today.</b>
          <span>Your first page was {longDate(first)}. Since then: {j.entries.length} pages and {grats} things you were grateful for.</span>
        </section>
      )}
      {due.map((n) => <NoteFromPast key={n.id} note={n} me={me} today={today} onOpen={j.reload} />)}
      <Card tint="#7A5C9E" label={longDate(today)} glyph="star" className="span-4 jr-today">
        {j.loaded ? <Entry j={j} me={me} date={today} entry={entry} /> : <p className="muted">Opening your journal…</p>}
      </Card>
      <div className="span-2 jr-side">
        {back.length > 0 && (
          <Card tint="#C0824F" label="On this day" glyph="calendar">
            {back.map(({ years, entry: e }) => (
              <details key={e.on_date} className="jr-otd">
                <summary><b>{years === 1 ? 'A year ago' : `${years} years ago`}</b><span>{longDate(e.on_date)}</span></summary>
                <EntryText e={e} />
                <Link to={`/journal/${e.on_date}`} className="jr-more">Open that day ›</Link>
              </details>
            ))}
          </Card>
        )}
        <Card tint="#5F8A4A" label="Your journal" glyph="pot">
          {j.entries.length > 0 && <div className="figures"><div><b>{j.entries.length}</b><span>pages</span></div><div><b>{grats}</b><span>gratitudes</span></div></div>}
          <nav className="jr-links" aria-label="Your journal">
            <Link to="/journal/look-back">Look back<span>Every page, and a search</span></Link>
            <Link to="/journal/grateful">What you’re grateful for<span>What comes up most</span></Link>
            <Link to="/journal/notes">Notes to Future {me ? me.name : 'you'}<span>Written now, opened on their day</span></Link>
            <Link to="/journal/settings">Questions, outlets, bringing a journal in<span>How your journal works</span></Link>
          </nav>
          <button type="button" className="btn ghost" onClick={() => setOutlets(true)}>Need an outlet?</button>
        </Card>
      </div>
      {outlets && <Sheet title="Your outlets" onClose={() => setOutlets(false)}><Outlets list={(j.settings && j.settings.outlets) || []} /></Sheet>}
    </>
  )
}

/** A note from the past, sealed until opened. */
function NoteFromPast({ note, me, today, onOpen }) {
  const [open, setOpen] = useState(false)
  return (
    <section className={'jr-note span-6' + (open ? ' open' : '')} aria-label="A note from your past self">
      <span className="jr-note-k">A note from Past {me ? me.name : 'you'}, written {agoWords(note.written_on, today)}</span>
      {open ? <p className="jr-note-b">{note.body}</p> : <button type="button" className="btn" onClick={async () => { setOpen(true); await openNote(note.id) }}>Open it</button>}
      {open && <button type="button" className="btn ghost" onClick={onOpen}>Put it away</button>}
    </section>
  )
}

/** A day's page: written, it reads; tapped, it opens to edit. */
function Entry({ j, me, date, entry }) {
  const [editing, setEditing] = useState(!entry)
  if (entry && !editing) {
    return (
      <div className="jr-read">
        <EntryText e={entry} />
        <button type="button" className="btn ghost" onClick={() => setEditing(true)}>Add to it</button>
      </div>
    )
  }
  return <Editor j={j} me={me} date={date} entry={entry} onDone={() => setEditing(false)} />
}

function Editor({ j, me, date, entry, onDone }) {
  const q = entry ? (entry.prompt ? { title: entry.prompt_title, prompt: entry.prompt } : null) : questionFor(j, date, me)
  const start = entry ? { ...entry, answer: entry.answer || '', reflection: entry.reflection || '', gratitudes: [...(entry.gratitudes || []), '', '', ''].slice(0, Math.max(3, (entry.gratitudes || []).length)) } : blankEntry(date, q)
  const [f, setF, clear] = useDraft(`journal.${date}`, start)
  const [busy, setBusy] = useState(null)
  const set = (k, v) => setF({ ...f, [k]: v })
  const setG = (i, v) => { const g = [...f.gratitudes]; g[i] = v; set('gratitudes', g) }
  async function save() {
    setBusy('Saving…')
    const { error } = await saveEntry(f, entry && entry.id)
    if (error) { setBusy(error.message); return }
    clear(); setBusy(null); j.reload(); onDone()
  }
  return (
    <div className="form jr-form">
      {f.prompt && (
        <label className="jr-q">
          <span><b>{f.prompt_title}</b> {f.prompt}</span>
          <textarea rows={3} value={f.answer} onChange={(e) => set('answer', e.target.value)} />
          <button type="button" className="jr-skip" onClick={() => setF({ ...f, prompt: null, prompt_title: null, answer: '' })}>Skip today’s question</button>
        </label>
      )}
      <label>Anything else on your mind<textarea rows={f.reflection ? 4 : 2} value={f.reflection} onChange={(e) => set('reflection', e.target.value)} /></label>
      <fieldset className="jr-grat">
        <legend>Gratitudes</legend>
        <ol>
          {f.gratitudes.map((g, i) => (
            <li key={i}><textarea rows={1} value={g} placeholder={i === 0 ? 'I am grateful for…' : ''} aria-label={`Gratitude ${i + 1}`} onChange={(e) => setG(i, e.target.value)} /></li>
          ))}
        </ol>
        {f.gratitudes.length < 12 && <button type="button" className="jr-skip" onClick={() => set('gratitudes', [...f.gratitudes, ''])}>+ Another</button>}
      </fieldset>
      <div className="form-actions">
        <button type="button" className="btn" disabled={busy === 'Saving…'} onClick={save}>Save</button>
        {entry && <button type="button" className="btn ghost" onClick={() => { clear(); onDone() }}>Cancel</button>}
      </div>
      {busy && busy !== 'Saving…' && <p className="err" role="alert">{busy}</p>}
    </div>
  )
}

/** A page as it reads: the question and its answer, anything else, the gratitudes numbered. */
function EntryText({ e, mark }) {
  const hi = (t) => (mark ? t.split(new RegExp(`(\\b${mark}\\w*)`, 'i')).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p)) : t)
  return (
    <div className="jr-text">
      {e.prompt && <p className="jr-tq"><b>{e.prompt_title}</b> {e.prompt}</p>}
      {e.answer && e.answer.split(/\n\n+/).map((p, i) => <p key={'a' + i}>{p}</p>)}
      {e.reflection && e.reflection.split(/\n\n+/).map((p, i) => <p key={'r' + i}>{p}</p>)}
      {(e.gratitudes || []).length > 0 && (
        <>
          <p className="jr-th">Gratitudes</p>
          <ol className="jr-tg">{e.gratitudes.map((g, i) => <li key={i}>{hi(g)}</li>)}</ol>
        </>
      )}
    </div>
  )
}

function DayPage({ j, me, date, today }) {
  const entry = j.entries.find((e) => e.on_date === date)
  const idx = j.entries.findIndex((e) => e.on_date === date)
  const newer = idx > 0 ? j.entries[idx - 1] : null, older = idx >= 0 ? j.entries[idx + 1] : null
  const [gone, setGone] = useState(false)
  return (
    <>
      <Head title={longDate(date)} crumb={['/journal', 'Journal']} />
      <Card tint="#7A5C9E" label={date === today ? 'Today' : agoWords(date, today).replace(/^./, (c) => c.toUpperCase())} glyph="star" className="span-6">
        {!j.loaded ? <p className="muted">Opening…</p> : (entry || date <= today) ? <Entry key={date + (entry ? entry.id : '')} j={j} me={me} date={date} entry={entry} /> : <p className="muted">That day hasn’t come yet.</p>}
        {entry && <button type="button" className="jr-skip" onClick={() => setGone(true)}>Remove this page</button>}
      </Card>
      <nav className="jr-pn span-6" aria-label="Other pages">
        {older ? <Link to={`/journal/${older.on_date}`}>‹ {short(older.on_date)}</Link> : <span />}
        {newer ? <Link to={`/journal/${newer.on_date}`}>{short(newer.on_date)} ›</Link> : <span />}
      </nav>
      {gone && <Confirm title="Remove this page?" yes="Remove it" danger onNo={() => setGone(false)} onYes={async () => { await removeEntry(entry.id); setGone(false); j.reload(); navigate('/journal', { replace: true }) }}>{longDate(date)} goes for good. Nobody else could see it, and nobody can bring it back.</Confirm>}
    </>
  )
}

function LookBack({ j, today }) {
  const [q, setQ] = useState(''), [shown, setShown] = useState(60)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return j.entries
    return j.entries.filter((e) => [e.prompt_title, e.answer, e.reflection, ...(e.gratitudes || [])].some((s) => s && s.toLowerCase().includes(t)))
  }, [q, j.entries])
  let month = ''
  return (
    <>
      <Head title="Look back" crumb={['/journal', 'Journal']} />
      <Card tint="#7A5C9E" label={q ? `${list.length} ${list.length === 1 ? 'page' : 'pages'} with “${q.trim()}”` : `${j.entries.length} pages`} glyph="calendar" className="span-6">
        <label className="jr-search"><span className="sr">Search your journal</span><input type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(60) }} placeholder="Search your journal" /></label>
        <ul className="jr-list">
          {list.slice(0, shown).map((e) => {
            const m = e.on_date.slice(0, 7), head = m !== month ? (month = m) : null
            return (
              <li key={e.on_date}>
                {head && <h3 className="jr-month">{MONTHS[+m.slice(5) - 1]} {m.slice(0, 4)}</h3>}
                <Link to={`/journal/${e.on_date}`}>
                  <b>{longDate(e.on_date)}</b>
                  <span>{e.prompt_title || (e.gratitudes && e.gratitudes[0]) || (e.reflection || '').slice(0, 90)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
        {list.length > shown && <button type="button" className="btn ghost" onClick={() => setShown(shown + 120)}>Older pages</button>}
        {!list.length && j.loaded && <p className="muted">{q ? 'Nothing matches that.' : `Nothing written yet. Today is ${longDate(today)}: a good day to start.`}</p>}
      </Card>
    </>
  )
}

function Grateful({ j }) {
  const words = useMemo(() => gratitudeWords(j.entries, 36), [j.entries])
  const [word, setWord] = useState(null)
  const max = words.length ? words[0].n : 1
  const hits = word ? entriesWithWord(j.entries, word) : []
  return (
    <>
      <Head title="What you’re grateful for" crumb={['/journal', 'Journal']} />
      <Card tint="#C0824F" label="What comes up most" glyph="star" className="span-6">
        {!words.length && <p className="muted">Once there are a few weeks of gratitudes, the ones that come back again and again show here.</p>}
        <div className="jr-cloud">
          {words.map((w) => (
            <button key={w.word} type="button" aria-pressed={word === w.word} style={{ '--s': 0.8 + 1.5 * (w.n / max) }} onClick={() => setWord(word === w.word ? null : w.word)}>
              {w.shown}<small>{w.n}</small>
            </button>
          ))}
        </div>
      </Card>
      {word && (
        <Card tint="#7A5C9E" label={`“${word}”: ${hits.length} ${hits.length === 1 ? 'day' : 'days'}`} glyph="calendar" className="span-6">
          <ul className="jr-hits">
            {hits.slice(0, 80).map((e) => (
              <li key={e.on_date}>
                <Link to={`/journal/${e.on_date}`}><b>{longDate(e.on_date)}</b></Link>
                <ul>{e.gratitudes.filter((g) => entriesWithWord([{ gratitudes: [g] }], word).length).map((g, i) => <li key={i}>{g}</li>)}</ul>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function Notes({ j, me, today }) {
  const [f, setF, clear] = useDraft('journal.note', { body: '', when: 'surprise' })
  const [busy, setBusy] = useState(null)
  const sealed = j.notes.filter((n) => !n.opened_at && n.open_on > today)
  const read = j.notes.filter((n) => n.opened_at).sort((a, b) => (a.opened_at < b.opened_at ? 1 : -1))
  async function seal() {
    setBusy('Sealing…')
    const { error } = await addNote({ written_on: today, open_on: openDate(today, f.when), surprise: f.when === 'surprise', body: f.body.trim().slice(0, 4000) })
    if (error) { setBusy(error.message); return }
    clear(); setBusy('Sealed. It’ll be waiting for you after a morning sit.'); j.reload()
  }
  return (
    <>
      <Head title={`Notes to Future ${me ? me.name : 'you'}`} crumb={['/journal', 'Journal']} />
      <Card tint="#7A5C9E" label="Write one" glyph="star" className="span-4">
        <p className="muted">Write to yourself now; it stays sealed until its day, then waits for you at the end of a morning sit and at the top of your journal.</p>
        <div className="form">
          <label>The note<textarea rows={5} maxLength={4000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
          <fieldset className="choice-row"><legend>When it opens</legend>
            {LATER.map(([k, label]) => <button key={k} type="button" aria-pressed={f.when === k} onClick={() => setF({ ...f, when: k })}>{label}</button>)}
          </fieldset>
          <div className="form-actions"><button type="button" className="btn" disabled={!f.body.trim() || busy === 'Sealing…'} onClick={seal}>Seal it</button></div>
          {busy && <p className="muted" role="status">{busy}</p>}
        </div>
      </Card>
      <Card tint="#5F8A4A" label="Sealed" glyph="calendar" className="span-2">
        {!sealed.length && <p className="muted">None waiting.</p>}
        <ul className="jr-sealed">{sealed.map((n) => <li key={n.id}><span>Written {short(n.written_on)}</span><b>{n.surprise ? 'Opens some morning' : `Opens ${short(n.open_on)}`}</b><button type="button" className="jr-skip" onClick={async () => { await removeNote(n.id); j.reload() }}>Remove</button></li>)}</ul>
      </Card>
      {read.length > 0 && (
        <Card tint="#C0824F" label="Opened" glyph="star" className="span-6">
          <ul className="jr-read-notes">{read.map((n) => <li key={n.id}><span>Written {short(n.written_on)}, opened {short(n.opened_at.slice(0, 10))}</span><p>{n.body}</p></li>)}</ul>
        </Card>
      )}
    </>
  )
}

/** Your outlets, a list at a time, and one picked for you. */
function Outlets({ list }) {
  const [pick, setPick] = useState(null)
  const all = list.flatMap((g) => g.items.map((i) => [g.title, i]))
  if (!list.length) return <p className="muted">Your outlets are the things that bring you back to yourself: reading, music, a walk. Add them in <Link to="/journal/settings">the journal’s settings</Link>.</p>
  return (
    <div className="jr-outlets">
      <button type="button" className="btn" onClick={() => setPick(all[Math.floor(Math.random() * all.length)])}>Pick one for me</button>
      {pick && <p className="jr-pick"><span>{pick[0]}</span><b>{pick[1]}</b></p>}
      {list.map((g) => <section key={g.title}><h3>{g.title}</h3><ul>{g.items.map((i) => <li key={i}>{i}</li>)}</ul></section>)}
    </div>
  )
}

function JournalSettings({ j, me, today }) {
  const s = j.settings || {}
  const choice = s.prompt_set || defaultSet(me)
  const [msg, setMsg] = useState(null)
  const save = async (patch) => { const { error } = await saveSettings({ prompt_set: choice, outlets: s.outlets || [], prompts: s.prompts || null, ...patch }, me); setMsg(error ? error.message : 'Saved.'); j.reload() }
  return (
    <>
      <Head title="How your journal works" crumb={['/journal', 'Journal']} />
      <Card tint="#7A5C9E" label="The day’s question" glyph="calendar" className="span-6">
        <fieldset className="choice-row"><legend>Which questions</legend>
          {Object.entries(SET_CHOICES).map(([k, label]) => <button key={k} type="button" aria-pressed={choice === k} onClick={() => save({ prompt_set: k })}>{label}</button>)}
          <button type="button" aria-pressed={choice === 'custom'} onClick={() => save({ prompt_set: 'custom', prompts: s.prompts || PROMPT_SETS[seasonSet(today)].days })}>My own</button>
        </fieldset>
        {choice === 'season' && <p className="muted">The school-year questions, and the summer ones from mid-June to mid-August. Today’s: {(questionFor(j, today, me) || {}).title}</p>}
        {choice === 'custom' && <CustomPrompts prompts={s.prompts || PROMPT_SETS.school.days} onSave={(prompts) => save({ prompt_set: 'custom', prompts })} />}
        {choice !== 'custom' && choice !== 'none' && (
          <ol className="jr-week">{(PROMPT_SETS[choice === 'season' ? seasonSet(today) : choice] || PROMPT_SETS.school).days.map(([t, p], i) => <li key={i}><span>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}</span><b>{t}</b> {p}</li>)}</ol>
        )}
        {msg && <p className="muted" role="status">{msg}</p>}
      </Card>
      <Card tint="#5F8A4A" label="Your outlets" glyph="pot" className="span-3">
        <OutletsEditor list={s.outlets || []} onSave={(outlets) => save({ outlets })} />
      </Card>
      <Card tint="#C0824F" label="Bring a journal in" glyph="star" className="span-3">
        <BringIn j={j} me={me} onOutlets={(outlets) => save({ outlets })} />
      </Card>
    </>
  )
}

function CustomPrompts({ prompts, onSave }) {
  const [p, setP] = useState(prompts.map((x) => [...x]))
  const set = (i, k, v) => setP(p.map((x, n) => (n === i ? (k ? [x[0], v] : [v, x[1]]) : x)))
  return (
    <div className="form">
      {p.map(([t, q], i) => (
        <div key={i} className="form-row three jr-cp">
          <label>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}<input maxLength={80} value={t} onChange={(e) => set(i, 0, e.target.value)} /></label>
          <label className="jr-cp-q">The question<input maxLength={300} value={q} onChange={(e) => set(i, 1, e.target.value)} /></label>
        </div>
      ))}
      <div className="form-actions"><button type="button" className="btn" onClick={() => onSave(p)}>Save my questions</button></div>
    </div>
  )
}

function OutletsEditor({ list, onSave }) {
  const [text, setText] = useState(() => list.map((g) => `${g.title}\n${g.items.map((i) => `- ${i}`).join('\n')}`).join('\n\n'))
  const read = () => text.split(/\n\s*\n/).map((block) => { const [title, ...rest] = block.split('\n').map((l) => l.trim()).filter(Boolean); return title ? { title: title.slice(0, 60), items: rest.map((l) => l.replace(/^[-•*●]\s*/, '').slice(0, 200)).filter(Boolean).slice(0, 40) } : null }).filter(Boolean).slice(0, 20)
  return (
    <div className="form">
      <p className="muted">The things that bring you back to yourself, in lists: a heading, then one per line. “Need an outlet?” on your journal shows them, or picks one.</p>
      <label><span className="sr">Your outlets</span><textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Music\n- Records\n- A live show\n\nNature\n- Look at the sky'} /></label>
      <div className="form-actions"><button type="button" className="btn" onClick={() => onSave(read())}>Save my outlets</button></div>
    </div>
  )
}

/** A journal kept elsewhere: the file Claude made from it, or a Google Doc downloaded as plain text. */
function BringIn({ j, onOutlets }) {
  const [found, setFound] = useState(null), [busy, setBusy] = useState(null), [keepOutlets, setKeepOutlets] = useState(true)
  async function take(files) {
    setBusy(null)
    try {
      const text = await files[0].text()
      const r = /^\s*\{/.test(text) ? readImport(text) : (() => { const p = parseJournalText(text); return readImport({ kind: 'teamhicks-journal', entries: p.entries, outlets: p.outlets }) })()
      if (!r.entries.length) { setBusy('No dated pages in that file.'); return }
      const have = new Set(j.entries.map((e) => e.on_date))
      setFound({ ...r, fresh: r.entries.filter((e) => !have.has(e.on_date)) })
    } catch (e) { setBusy(e.message || 'That file couldn’t be read.') }
  }
  async function go() {
    setBusy('Bringing them in…')
    const res = await importEntries(found.fresh, (n) => setBusy(`Bringing them in… ${n} of ${found.fresh.length}`))
    if (res.error) { setBusy(res.error.message); return }
    if (keepOutlets && found.outlets.length) await onOutlets(found.outlets)
    setBusy(`Brought in ${res.done} pages.`); setFound(null); j.reload()
  }
  const dates = found ? found.entries.map((e) => e.on_date).sort() : []
  return (
    <div className="form">
      <Dropzone accept="application/json,text/plain" camera={false} label="The journal file" hint="The file Claude made from your journal, or a Google Doc downloaded as Plain text (.txt). It’s read here on this device." onFiles={take} />
      {found && (
        <>
          <p><b>{found.entries.length} pages</b>, {short(dates[0])} to {short(dates[dates.length - 1])}. {found.fresh.length === found.entries.length ? 'All new here.' : `${found.fresh.length} are new; days already written here stay as they are.`}</p>
          {found.outlets.length > 0 && <label className="check-row"><input type="checkbox" checked={keepOutlets} onChange={(e) => setKeepOutlets(e.target.checked)} /> Use its outlets ({found.outlets.map((o) => o.title).join(', ')})</label>}
          <div className="form-actions"><button type="button" className="btn" disabled={!found.fresh.length || (busy || '').startsWith('Bringing')} onClick={go}>Bring them in</button><button type="button" className="btn ghost" onClick={() => setFound(null)}>Cancel</button></div>
        </>
      )}
      {busy && <p className="muted" role="status">{busy}</p>}
      {j.entries.length > 0 && <button type="button" className="jr-skip" onClick={() => download(j)}>Download my journal (a file only you have)</button>}
    </div>
  )
}

function download(j) {
  const data = { kind: 'teamhicks-journal', version: 1, made: new Date().toISOString().slice(0, 10), entries: j.entries.map((e) => ({ date: e.on_date, prompt_title: e.prompt_title, prompt: e.prompt, answer: e.answer, reflection: e.reflection, gratitudes: e.gratitudes })), outlets: (j.settings && j.settings.outlets) || [] }
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `journal-${data.made}.json` })
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
}

