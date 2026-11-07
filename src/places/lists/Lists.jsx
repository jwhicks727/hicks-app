import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useSession } from '../../lib/auth.js'
import { useFamily, useEvents } from '../../lib/useCalendar.js'
import { useNow } from '../../lib/useNow.js'
import { useLists } from '../../lib/useLists.js'
import { addDays, diffDays, dow, todayAt, WEEKDAYS } from '../../lib/cal/dates.js'
import { SCHOOLS } from '../../lib/cal/schools.js'
import {
  listDay, dayList, tickFor, dayMarks, streakFrom, runsFrom, recordsFrom, perfectWeeks, perksFor, PERKS, goldenKey,
  namesFor, noun, clockWords, ruleWords, schoolDayFrom, entryKey,
} from '../../lib/routines.js'
import { sunriseAt } from '../../lib/challenges.js'
import { navigate } from '../../lib/router.js'
import { Card } from '../../ui/Card.jsx'
import { Toast } from '../../ui/Toast.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { RoutineList } from './RoutineList.jsx'
import { ItemSheet } from './ItemSheet.jsx'
import { Hummingbird, Owl } from './Birds.jsx'
import { ItemIcon, SunIcon, MoonIcon, Flame } from './icons.jsx'
import { tickSound, untickSound, doneSound } from './sounds.js'
import Family from './Family.jsx'
import './lists.css'

// /home/lists: the lists' own page. Your morning and evening lists for today
// (tick from here too), a day that's different (skip something, add
// something, rest), the lists themselves (add, change, reorder, take off with
// an Undo), the week ahead as the rules work it out, and your streaks and
// records. /home/lists/<id> is the same for Anna, for Jason and Laurie;
// /home/lists/family is the family's page (src/places/lists/Family.jsx).

const isAnna = (p) => /^anna$/i.test((p && p.name) || '')
const SHORT_DAY = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })

export default function Lists({ rest = [] }) {
  const session = useSession()
  const family = useFamily(session)
  const now = useNow()
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email && family.members.find((m) => (m.email || '').toLowerCase() === email)
  if (rest[0] === 'family') return <Family session={session} family={family} me={me} now={now} />
  if (!supabase || session === null) return <Hero title="Lists" sub="The database isn’t connected on this copy of the app." />
  if (!family.loaded || !me) return <Hero title="Lists" sub={family.loaded ? 'You’re not on the family list.' : 'Loading…'} />
  const mine = family.canon(me.id)
  const want = rest[0] ? family.canon(rest[0]) : mine
  const person = family.people.find((p) => p.id === want)
  const child = person && family.members.some((m) => m.id === person.id && m.role === 'child')
  if (!person || (want !== mine && !(me.role === 'parent' && child))) {
    return <Hero title="Lists" sub={person ? `These are ${person.name}’s lists, and only ${person.name} sees them.` : 'There’s nobody here by that address.'} />
  }
  return <PersonLists session={session} family={family} me={me} person={person} self={want === mine} now={now} />
}

function Hero({ title, sub, kicker = 'Team Hicks', children }) {
  return (
    <header className="hero span-6">
      <Crumb to="/">Home</Crumb>
      <span className="kicker">{kicker}</span>
      <h1 className="greet">{title}</h1>
      {sub && <span className="sub">{sub}</span>}
      {children}
    </header>
  )
}

function PersonLists({ session, family, me, person, self, now }) {
  const today = listDay(now)
  const calToday = todayAt('America/Los_Angeles', now)
  const { events } = useEvents(session, calToday, addDays(calToday, 8))
  // The school days ahead, from the school calendars (a string key keeps it steady between renders)
  const schoolKey = useMemo(() => { const f = schoolDayFrom({ name: person.name, events, sources: family.sources, members: family.members, from: addDays(calToday, -1), to: addDays(calToday, 8) }); return Array.from({ length: 10 }, (_, i) => f(addDays(calToday, i - 1))).join() }, [person.name, events, family.sources, family.members, calToday])
  const schoolDay = useMemo(() => { const v = schoolKey.split(','); return (d) => { const i = diffDays(addDays(calToday, -1), d); return i >= 0 && i < v.length ? (v[i] === 'true' ? true : v[i] === 'false' ? false : null) : null } }, [schoolKey, calToday])
  const L = useLists(session, { memberId: person.id, today, schoolDay, withFamily: false })
  const names = namesFor(L.settings && L.settings.names)
  const [sheet, setSheet] = useState(null) // { item } or { part }
  const [toast, setToast] = useState(null)
  const [day, setDay] = useState(today)
  const [extra, setExtra] = useState({ morning: '', evening: '' })
  const [showOff, setShowOff] = useState(false)
  const school = SCHOOLS.find((s) => s.person.toLowerCase() === person.name.toLowerCase())
  const parentOfAnna = me.role === 'parent' ? family.people.find((p) => p.id !== family.canon(me.id) && family.members.some((m) => m.id === p.id && m.role === 'child')) : null

  const kicker = self ? 'Team Hicks' : `${person.name}’s lists`
  const hero = (
    <Hero title={self ? names.both : `${person.name}’s ${names.both}`} kicker={kicker} sub={self ? 'Your mornings and evenings, one tick at a time.' : `Jason and Laurie keep these with ${person.name}.`}>
      {(parentOfAnna || !self) && (
        <nav className="dl-who" aria-label="Whose lists">
          <Link to="/home/lists" aria-current={self ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate('/home/lists', { replace: true }) }}>Mine</Link>
          {parentOfAnna && <Link to={`/home/lists/${parentOfAnna.id}`} aria-current={!self ? 'page' : undefined} onClick={(e) => { e.preventDefault(); navigate(`/home/lists/${parentOfAnna.id}`, { replace: true }) }}>{parentOfAnna.name}’s</Link>}
          <Link to="/home/lists/family">The family</Link>
        </nav>
      )}
      {!parentOfAnna && self && <nav className="dl-who" aria-label="More"><Link to="/home/lists/family">The family and its challenges ›</Link></nav>}
    </Hero>
  )
  if (!L.loaded) return <>{hero}<Card className="span-6" tint="#E38B2C"><p className="muted">Loading…</p></Card></>
  if (L.missing) return <>{hero}<Card className="span-6" tint="#E38B2C" label="Not set up yet" glyph="star"><p>The lists’ tables aren’t in the database yet: Jason runs the migration <code>20261107180000_morning_evening_lists.sql</code> once (docs/DATABASE.md).</p></Card></>

  const items = L.items
  const ticks = L.ticks.filter((t) => t.on_date === today)
  const lists = { morning: dayList({ items, changes: L.changes, date: today, part: 'morning', schoolDay }), evening: dayList({ items, changes: L.changes, date: today, part: 'evening', schoolDay }) }
  const save = (id) => async (row) => L.saveItem(row, id)
  const takeOff = (it) => {
    L.setArchived(it.id, today)
    setToast({ text: `Took “${it.title}” off ${names[it.part]}.`, undo: () => L.setArchived(it.id, null) })
  }

  return (
    <>
      {hero}
      {L.error && <Card className="span-6" tint="#B3401A"><p className="err" role="alert">{L.error}</p><button type="button" className="btn ghost" onClick={() => { L.clearError(); L.reload() }}>Try again</button></Card>}

      {/* Today */}
      {['morning', 'evening'].map((part) => {
        const list = lists[part]
        const total = list.entries.length, done = list.entries.filter((e) => tickFor(e, ticks)).length
        return (
          <Card key={part} tint={part === 'evening' ? '#4B5BA6' : '#E38B2C'} className={`span-3 dl-page dl-today dl-${part}`}>
            <div className="dl-today-h">
              <span className="dl-tab-i">{part === 'evening' ? <MoonIcon /> : <SunIcon />}</span>
              <h2>{names[part]}</h2>
              <span className="dl-count">{list.rest ? 'resting' : total ? (done >= total ? 'done ✓' : `${done} of ${total}`) : 'nothing today'}</span>
            </div>
            {list.rest ? <p className="muted">Resting today{list.restNote ? `: ${list.restNote.toLowerCase()}` : ''}. The streak waits.</p>
              : total ? <RoutineList part={part} list={list} ticks={ticks} golden={goldenKey(person.id, today, part, list.entries)} label={`${names[part]} today`}
                onTick={(e) => { tickSound(done); L.tick(e, part); if (done + 1 >= total) setTimeout(() => doneSound(part), 700) }}
                onUntick={(e) => { untickSound(); L.untick(e, part) }} />
                : <p className="muted">Nothing on it today. Add something below.</p>}
          </Card>
        )
      })}

      {/* A day that's different */}
      <DayChanges L={L} names={names} items={items} schoolDay={schoolDay} today={today} day={day} setDay={setDay} extra={extra} setExtra={setExtra} setToast={setToast} person={person} self={self} />

      {/* The lists themselves */}
      {['morning', 'evening'].map((part) => {
        const live = items.filter((i) => i.part === part && !i.archived_on).sort((a, b) => a.sort - b.sort || String(a.created_at).localeCompare(String(b.created_at)))
        return (
          <Card key={'edit' + part} tint={part === 'evening' ? '#4B5BA6' : '#E38B2C'} label={`The ${names[part]} list`} glyph={part === 'evening' ? 'star' : 'sunmoon'} tag={`${live.length} on it`} className={`span-3 dl-page dl-${part}`}>
            {live.length === 0 && <p className="muted">Nothing yet. {part === 'evening' ? 'Brush teeth, lay out tomorrow’s clothes, a chapter of a book…' : 'Make the bed, feed the pets, pack the backpack…'} Add the first below.</p>}
            <ul className="dl-edit">
              {live.map((it, k) => (
                <li key={it.id}>
                  <span className="dl-edit-t">{it.icon && <ItemIcon name={it.icon} />}<span><b>{it.title}</b><small>{ruleWords(it)}</small></span></span>
                  <span className="dl-edit-b">
                    <button type="button" className="dl-mini" aria-label={`Move ${it.title} up`} disabled={k === 0} onClick={() => L.move(part, it.id, -1)}>↑</button>
                    <button type="button" className="dl-mini" aria-label={`Move ${it.title} down`} disabled={k === live.length - 1} onClick={() => L.move(part, it.id, 1)}>↓</button>
                    <button type="button" className="dl-mini" onClick={() => setSheet({ item: it })}>Change</button>
                    <button type="button" className="dl-mini" aria-label={`Take ${it.title} off`} onClick={() => takeOff(it)}>✕</button>
                  </span>
                </li>
              ))}
            </ul>
            <QuickAdd part={part} names={names} onAdd={async (title) => L.saveItem({ title, part, starts_on: today, sort: (live.length + 1) * 10 + 1000 })} onMore={() => setSheet({ part })} />
          </Card>
        )
      })}
      {items.some((i) => i.archived_on) && (
        <Card tint="#8C8A86" label="Taken off" glyph="star" className="span-6 dl-page">
          <button type="button" className="dl-link" aria-expanded={showOff} onClick={() => setShowOff((x) => !x)}>{showOff ? 'Hide them' : `Show the ${items.filter((i) => i.archived_on).length} taken off`}</button>
          {showOff && (
            <ul className="dl-edit">
              {items.filter((i) => i.archived_on).map((it) => (
                <li key={it.id}><span className="dl-edit-t"><span><b>{it.title}</b><small>{names[it.part]} · off since {SHORT_DAY(it.archived_on)}</small></span></span><span className="dl-edit-b"><button type="button" className="dl-mini" onClick={() => L.setArchived(it.id, null)}>Put it back</button></span></li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <WeekAhead items={items} changes={L.changes} today={today} schoolDay={schoolDay} names={names} />

      <Records L={L} person={person} names={names} today={today} self={self} />

      {sheet && (
        <ItemSheet item={sheet.item} part={sheet.item ? sheet.item.part : sheet.part} today={today} names={names} schoolName={school ? school.name : null}
          draftKey={sheet.item ? `list.item.${sheet.item.id}` : `list.item.new.${person.id}.${sheet.part}`}
          onSave={save(sheet.item && sheet.item.id)} onClose={() => setSheet(null)} />
      )}
      {toast && <Toast action={toast.undo ? 'Undo' : undefined} onAction={() => { toast.undo(); setToast(null) }} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </>
  )
}

function QuickAdd({ part, names, onAdd, onMore }) {
  const [t, setT] = useState('')
  const [err, setErr] = useState(null)
  return (
    <form className="dl-quickadd" onSubmit={async (e) => { e.preventDefault(); const title = t.trim(); if (!title) return; const p = await onAdd(title.slice(0, 120)); if (p) setErr(p); else { setT(''); setErr(null) } }}>
      <input value={t} maxLength={120} onChange={(e) => setT(e.target.value)} placeholder={`Add to ${names[part]}`} aria-label={`Add to ${names[part]}`} />
      <button type="submit" className="btn" disabled={!t.trim()}>Add</button>
      <button type="button" className="dl-link" onClick={onMore}>Which days, turns…</button>
      {err && <p className="err" role="alert">{err}</p>}
    </form>
  )
}

const REASONS = ['Sick', 'Away', 'A holiday', 'A busy day']

function DayChanges({ L, names, items, schoolDay, today, day, setDay, extra, setExtra, setToast, person, self }) {
  const choices = [today, addDays(today, 1), addDays(today, 2)]
  const label = (d) => (d === today ? 'Today' : d === addDays(today, 1) ? 'Tomorrow' : WEEKDAYS[dow(d)])
  return (
    <Card tint="#7FC6C2" label="A day that’s different" glyph="calendar" className="span-6 dl-page dl-diff">
      <p className="muted">Skip something, add something just for the day, or give a list the day off: a day of rest holds {self ? 'your' : `${person.name}’s`} streak without breaking it.</p>
      <fieldset className="choice-row"><legend>Which day</legend>
        {choices.map((d) => <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(d)}>{label(d)}</button>)}
        <input type="date" className="dl-date" value={day} min={today} aria-label="Another day" onChange={(e) => e.target.value && setDay(e.target.value)} />
      </fieldset>
      <div className="dl-diff-cols">
        {['morning', 'evening'].map((part) => {
          const list = dayList({ items, changes: L.changes, date: day, part, schoolDay })
          const rest = L.changes.find((c) => c.on_date === day && c.part === part && c.kind === 'rest')
          return (
            <section key={part} className={'dl-' + part}>
              <h3>{names[part]} <small>{SHORT_DAY(day)}</small></h3>
              {rest ? (
                <p className="dl-rested">A day off{rest.note ? ` (${rest.note.toLowerCase()})` : ''}. <button type="button" className="dl-link" onClick={() => L.removeChange(rest.id)}>Back on</button></p>
              ) : (
                <>
                  <ul className="dl-edit compact">
                    {list.entries.map((e) => (
                      <li key={entryKey(e)}>
                        <span className="dl-edit-t"><span><b>{e.title}</b>{e.kind === 'extra' && <small>just this day</small>}{e.maybe && <small>if it’s a school day</small>}</span></span>
                        {e.kind === 'extra'
                          ? <button type="button" className="dl-mini" onClick={() => L.removeChange(e.id)}>Remove</button>
                          : <button type="button" className="dl-mini" onClick={async () => { const c = await L.addChange({ on_date: day, part, kind: 'skip', item_id: e.id }); if (c) setToast({ text: `${e.title}: not on ${label(day).toLowerCase() === 'today' ? 'today' : label(day)}.`, undo: () => L.removeChange(c.id) }) }}>Not this day</button>}
                      </li>
                    ))}
                    {list.skippedEntries.map((e) => {
                      const c = L.changes.find((x) => x.kind === 'skip' && x.item_id === e.id && x.on_date === day)
                      return <li key={entryKey(e)} className="skipped"><span className="dl-edit-t"><span><b>{e.title}</b><small>skipped this day</small></span></span>{c && <button type="button" className="dl-mini" onClick={() => L.removeChange(c.id)}>Back on</button>}</li>
                    })}
                  </ul>
                  {!list.entries.length && !list.skippedEntries.length && <p className="muted">Nothing on it that day.</p>}
                  <form className="dl-quickadd" onSubmit={async (ev) => { ev.preventDefault(); const t = extra[part].trim(); if (!t) return; const c = await L.addChange({ on_date: day, part, kind: 'add', title: t.slice(0, 120) }); if (c) setExtra({ ...extra, [part]: '' }) }}>
                    <input value={extra[part]} maxLength={120} onChange={(e) => setExtra({ ...extra, [part]: e.target.value })} placeholder="Just this day: …" aria-label={`Add to ${names[part]} just for ${label(day)}`} />
                    <button type="submit" className="btn ghost" disabled={!extra[part].trim()}>Add</button>
                  </form>
                  <div className="dl-reasons" role="group" aria-label={`Give ${names[part]} the day off`}>
                    <span>The day off:</span>
                    {REASONS.map((r) => <button key={r} type="button" className="dl-mini" onClick={async () => { const c = await L.addChange({ on_date: day, part, kind: 'rest', note: r }); if (c) setToast({ text: `${names[part]} has ${label(day).toLowerCase() === 'today' ? 'today' : label(day)} off. The streak waits.`, undo: () => L.removeChange(c.id) }) }}>{r}</button>)}
                  </div>
                </>
              )}
            </section>
          )
        })}
      </div>
    </Card>
  )
}

function WeekAhead({ items, changes, today, schoolDay, names }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  return (
    <Card tint="#3E7A4C" label="The week ahead" glyph="calendar" className="span-6 dl-page">
      <details className="dl-how">
        <summary>What comes up each day</summary>
        <p className="muted">As the rules work it out: the days each thing is on, the turns it takes, school days and days off, and anything changed for a day.</p>
      <ol className="dl-week">
        {days.map((d) => (
          <li key={d}>
            <b>{d === today ? 'Today' : SHORT_DAY(d)}</b>
            {['morning', 'evening'].map((part) => {
              const l = dayList({ items, changes, date: d, part, schoolDay })
              return (
                <span key={part} className={'dl-week-p dl-' + part}>
                  <i aria-label={names[part]}>{part === 'evening' ? <MoonIcon /> : <SunIcon />}</i>
                  {l.rest ? <em>a day off</em> : l.entries.length ? l.entries.map((e) => e.title).join(' · ') : <em>nothing</em>}
                </span>
              )
            })}
          </li>
        ))}
      </ol>
      </details>
    </Card>
  )
}

/** The last eight weeks of a list, a square a day: done, missed, a day off or nothing on it. */
function Squares({ marks, today, label }) {
  const end = addDays(today, 6 - dow(today))
  const start = addDays(end, -55)
  const cells = []
  for (let i = 0; i < 56; i++) { const d = addDays(start, i); cells.push({ d, m: d > today ? 'future' : marks.get(d) || 'none', x: Math.floor(i / 7), y: i % 7 }) }
  const done = cells.filter((c) => c.m === 'done').length
  return (
    <svg className="dl-squares" viewBox="0 0 112 98" role="img" aria-label={`${label}: ${done} done in the last eight weeks`}>
      {cells.map((c) => <rect key={c.d} x={c.x * 14 + 1} y={c.y * 14 + 1} width="12" height="12" rx="2" className={'sq-' + c.m + (c.d === today ? ' sq-today' : '')}><title>{`${SHORT_DAY(c.d)}: ${{ done: 'done', miss: 'missed', skip: 'a day off or nothing on it', pending: 'today, still going', none: 'before the list began', future: 'still to come' }[c.m]}`}</title></rect>)}
    </svg>
  )
}

function Records({ L, person, names, today, self }) {
  const m = dayMarks({ rows: L.myRows, items: L.items, part: 'morning', today })
  const e = dayMarks({ rows: L.myRows, items: L.items, part: 'evening', today })
  const parts = { morning: m, evening: e }
  const perfect = perfectWeeks(m, e, today)
  const who = self ? 'you' : person.name
  return (
    <>
      {['morning', 'evening'].map((part) => {
        const s = streakFrom(parts[part]), r = recordsFrom(L.myRows, part, { sunriseAt }), runs = runsFrom(parts[part])
        const perks = perksFor(s.best), next = PERKS.find((p) => p.at > s.best)
        const any = r.finished > 0 || s.best > 0
        return (
          <Card key={'rec' + part} tint={part === 'evening' ? '#4B5BA6' : '#E38B2C'} label={`${names[part]}: streaks and records`} glyph="star" className={`span-3 dl-page dl-records dl-${part}`}>
            <div className="dl-rec-top">
              <div className="dl-rec-bird" aria-hidden="true">{part === 'evening' ? <Owl perks={perks.map((p) => p.key)} /> : <Hummingbird throat={person.colour || '#C42D20'} annas={isAnna(person)} perks={perks.map((p) => p.key)} />}</div>
              <div className="figures">
                <div><b><Flame />{s.current}</b><span>in a row now</span></div>
                <div><b>{s.best}</b><span>longest ever</span></div>
                <div><b>{r.finished}</b><span>finished</span></div>
              </div>
            </div>
            {!any && <p className="muted">Streaks and records start with the first list finished. Every day it’s done adds one; a day off or a day with nothing on it never breaks one.</p>}
            {any && (
              <ul className="dl-recs">
                {r.earliest && <li><span>Earliest finish</span><b>{clockWords(r.earliest.minutes)}</b><small>{SHORT_DAY(r.earliest.date)}</small></li>}
                {r.quickest && <li><span>Quickest, first tick to last</span><b>{r.quickest.minutes} min</b><small>{SHORT_DAY(r.quickest.date)}</small></li>}
                {runs[1] > 0 && <li><span>Second-longest streak</span><b>{runs[1]}</b><small>{noun(part, runs[1])}</small></li>}
                <li><span>Golden feathers found</span><b>{r.golden}</b><small>one turns up now and then</small></li>
                {part === 'morning' && <li><span>Mornings done before sunrise</span><b>{r.beatSun}</b><small>beat the sun</small></li>}
                {part === 'evening' && <li><span>Perfect weeks, both lists</span><b>{perfect}</b><small>Monday to Sunday</small></li>}
              </ul>
            )}
            <Squares marks={parts[part]} today={today} label={names[part]} />
            <p className="dl-perks">{perks.length ? `${self ? 'Your' : `${person.name}’s`} ${part === 'evening' ? 'owl' : 'hummingbird'} wears ${perks.map((p) => p.name).join(', ').replace(/, ([^,]*)$/, ' and $1')}, earned for good.` : ''} {next ? `${next.name[0].toUpperCase() + next.name.slice(1)} at ${next.at} ${noun(part, next.at)} in a row${s.best ? ` (best so far: ${s.best})` : ''}.` : 'Every perk earned. Legendary.'}</p>
            {s.ended && s.current === 0 && <p className="muted">The last streak, {s.ended.length} {noun(part, s.ended.length)}, ended {SHORT_DAY(s.ended.on)}. The next one starts with {who === 'you' ? 'your' : `${person.name}’s`} next list.</p>}
          </Card>
        )
      })}
    </>
  )
}
