import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { Toast } from '../ui/Toast.jsx'
import { useLists } from '../lib/useLists.js'
import { reducedMotion } from '../lib/motion.js'
import { addDays, diffDays, todayAt } from '../lib/cal/dates.js'
import {
  listDay, partForHour, dayList, tickFor, dayMarks, streakFrom, runsFrom, recordsFrom, milestoneAt, perkAt, perksFor,
  mournWords, progressWords, doneWords, goldenKey, minutesAtHome, namesFor, noun, schoolDayFrom,
} from '../lib/routines.js'
import { standing, keepsOf, sunriseAt, endWords } from '../lib/challenges.js'
import { RoutineList } from '../places/lists/RoutineList.jsx'
import { DayTools } from '../places/lists/DayTools.jsx'
import { Hummingbird, Owl, Feather, Trophy } from '../places/lists/Birds.jsx'
import { Flight, TeamFlight, Joy } from '../places/lists/Moments.jsx'
import { SunIcon, MoonIcon, Flame } from '../places/lists/icons.jsx'
import { tickSound, untickSound, doneSound, goldSound, zipSound, hootSound, fanfare, buzz } from '../places/lists/sounds.js'
import { seen, markSeen } from '../places/lists/seen.js'
import '../places/lists/lists.css'

// Home's first card: the signed-in person's morning list (Early Bird) or
// evening list (Night Owl), whichever the hour asks for, a tap from the other.
// Everything about ticking is in RoutineList; around it: the companion (a
// hummingbird, an owl), streaks on the tabs, a gentle word when a streak
// ends, the family's progress as rings (counts, never their words), the
// family challenge's ribbon, and the surprises (a golden feather, beating the
// sun, a birthday's party ticks, a Team Hicks day). docs/DECISIONS-LOG.md,
// 2026-11-07.

export const PART_COLOURS = { morning: '#E38B2C', evening: '#4B5BA6' }
const hourAt = (now) => +new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(now)
const isAnna = (p) => /^anna$/i.test((p && p.name) || '')

export default function ListsCard(props) {
  const { session, family, me } = props
  if (!supabase || !session || !me || !family.loaded) return null
  return <ListsHome {...props} />
}

/** Team Hicks day: two or more of us keep lists, and every one of us has finished (or rested) every list today. */
export function teamDayToday(rows, today) {
  const keeps = keepsOf(rows, today)
  const people = Object.keys(keeps)
  if (people.length < 2) return false
  const at = (p, part) => rows.find((r) => r.member_id === p && r.on_date === today && r.part === part)
  let any = false
  for (const p of people) for (const part of keeps[p]) {
    const r = at(p, part)
    if (!r || (r.status !== 'done' && r.status !== 'rest')) return false
    if (r.status === 'done') any = true
  }
  return any
}

function ListsHome({ session, family, me, now, events = [] }) {
  const memberId = family.canon(me.id)
  const person = family.people.find((p) => p.id === memberId) || me
  const today = listDay(now)
  const hour = hourAt(now)
  const calToday = todayAt('America/Los_Angeles', now)
  const schoolToday = schoolDayFrom({ name: person.name, events, sources: family.sources, members: family.members, from: calToday, to: calToday })(today)
  const schoolDay = useMemo(() => (d) => (d === today ? schoolToday : null), [today, schoolToday])
  const L = useLists(session, { memberId, today, schoolDay })
  const names = namesFor(L.settings && L.settings.names)

  const [choice, setChoice] = useState(null)
  const [finishing, setFinishing] = useState(null)
  const [flight, setFlight] = useState(null)
  const [settle, setSettle] = useState(false)
  const [joy, setJoy] = useState(null)
  const [team, setTeam] = useState(false)
  const [note, setNote] = useState(null)
  const [gleam, setGleam] = useState(false)
  const [bubble, setBubble] = useState(null)
  const [turn, setTurn] = useState(false)
  const [zip, setZip] = useState(false)
  const [toast, setToast] = useState(null)
  const [, bump] = useState(0)
  const taps = useRef([])
  const birdRef = useRef(null)

  const lists = useMemo(() => ({
    morning: dayList({ items: L.items, changes: L.changes, date: today, part: 'morning', schoolDay }),
    evening: dayList({ items: L.items, changes: L.changes, date: today, part: 'evening', schoolDay }),
  }), [L.items, L.changes, today, schoolDay])
  const ticks = L.ticks.filter((t) => t.on_date === today)
  // Last night's evening list is still open for a tick (the day turns over at 3am)
  const lastLeft = (() => { const y = addDays(today, -1), tk = L.ticks.filter((t) => t.on_date === y); return dayList({ items: L.items, changes: L.changes, date: y, part: 'evening', schoolDay }).entries.filter((e) => !tickFor(e, tk)).length })()
  const marks = useMemo(() => ({
    morning: dayMarks({ rows: L.myRows, items: L.items, part: 'morning', today }),
    evening: dayMarks({ rows: L.myRows, items: L.items, part: 'evening', today }),
  }), [L.myRows, L.items, today])
  const streaks = { morning: streakFrom(marks.morning), evening: streakFrom(marks.evening) }
  const runs = { morning: runsFrom(marks.morning), evening: runsFrom(marks.evening) }
  const has = (p) => lists[p].entries.length > 0 || lists[p].rest
  const allDone = (p) => lists[p].entries.length > 0 && lists[p].entries.every((e) => tickFor(e, ticks))
  const auto = (() => { const p = partForHour(hour), o = p === 'morning' ? 'evening' : 'morning'; return !has(p) && has(o) ? o : p })()
  const part = choice || auto
  const other = part === 'morning' ? 'evening' : 'morning'
  const list = lists[part]
  const golden = goldenKey(memberId, today, part, list.entries)
  const birthday = family.days.some((d) => d.kind !== 'remember' && d.for_whom === memberId && `${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` === today.slice(5))

  // A Team Hicks day, on whichever phone sees it first (and each phone once)
  useEffect(() => {
    if (L.loaded && teamDayToday(L.familyRows, today) && !seen('team:' + today)) { markSeen('team:' + today); setTeam(true) }
  }, [L.loaded, L.familyRows, today])

  // A first hello from the companion, once per device and list
  useEffect(() => {
    if (!L.loaded || !has(part) || bubble) return
    const k = `hello:${memberId}:${part}`
    if (seen(k)) return
    const t = setTimeout(() => setBubble({ key: k, text: part === 'evening'
      ? `Hoo! I’m a western screech-owl, and I live round here all year. I’ll keep you company on your ${names.evening} list.`
      : isAnna(person) ? `Hi Anna! I’m an Anna’s hummingbird: the bird that shares your name. We live round here all year. Tick things off and watch me go!`
        : `Hi! I’m a hummingbird, and I’m always up early. Tick things off your ${names.morning} list and watch me go.` }), 900)
    return () => clearTimeout(t)
  }, [L.loaded, part, memberId]) // eslint-disable-line react-hooks/exhaustive-deps

  // The challenge: under way, coming, or just decided
  const active = L.runs.filter((r) => r.status === 'planned' && r.ends_on >= today).sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1))[0] || null
  const st = active ? standing(active, L.familyRows, today) : null
  const decided = L.runs.filter((r) => (r.status === 'won' || r.status === 'missed') && r.decided_at && diffDays(r.decided_at.slice(0, 10), today) <= 3).sort((a, b) => (a.decided_at < b.decided_at ? 1 : -1))[0] || null
  const justWon = st && st.state === 'won' ? active : decided && decided.status === 'won' ? decided : null
  const missed = decided && decided.status === 'missed' && !seen(`run:${decided.id}:missed`) ? decided : null
  useEffect(() => {
    if (!justWon || seen(`run:${justWon.id}:won`)) return
    markSeen(`run:${justWon.id}:won`)
    const w = endWords(justWon, { state: 'won' })
    fanfare()
    setJoy({ trophy: true, title: w.title, line: w.line, big: true, long: true, colours: family.people.map((p) => p.colour).filter(Boolean) })
  }, [justWon && justWon.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const unfurl = active && st && st.state === 'on' && !seen(`run:${active.id}:start`)
  useEffect(() => { if (unfurl) { const t = setTimeout(() => markSeen(`run:${active.id}:start`), 2500); return () => clearTimeout(t) } return undefined }, [unfurl]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!L.loaded || L.missing) return null
  if (L.error && !L.items.length) return <Card tint={PART_COLOURS.morning} label={names.both} className="span-6 dl-card"><p className="err">{L.error}</p></Card>

  const anyItems = L.items.some((i) => !i.archived_on)
  const parentOfAnna = me.role === 'parent' ? family.people.find((p) => p.id !== memberId && family.members.some((m) => m.id === p.id && m.role === 'child')) : null
  if (!anyItems) {
    return (
      <Card tint={PART_COLOURS.morning} label={names.both} glyph="sunmoon" className="span-6 dl-card dl-empty">
        <div className="dl-empty-art" aria-hidden="true"><Hummingbird throat={person.colour || '#C42D20'} annas={isAnna(person)} /><Owl /></div>
        <h2>Your mornings and evenings, one tick at a time</h2>
        <p>Make a {names.morning} list for the morning and a {names.evening} list for the evening: different on different days if you like, taking turns, and changed for a day that’s different. A hummingbird and an owl keep you company, your streaks grow, and once two of you are going, the family challenges begin.</p>
        <div className="dl-foot">
          <Link className="btn" to="/home/lists">Make my lists</Link>
          {parentOfAnna && <Link className="btn ghost" to={`/home/lists/${parentOfAnna.id}`}>Make {parentOfAnna.name}’s</Link>}
        </div>
      </Card>
    )
  }

  const streak = streaks[part]
  const dayRow = (p, pt) => L.familyRows.find((r) => r.member_id === p && r.on_date === today && r.part === pt)
  const myRow = dayRow(memberId, part)
  const doneCount = list.entries.filter((e) => tickFor(e, ticks)).length
  const showDone = allDone(part) && finishing !== part
  const perks = perksFor(streak.best)

  // The family's rings: whoever has kept a list lately, me first
  const keeps = keepsOf(L.familyRows, today)
  const ring = family.people.filter((p) => p.id === memberId || (keeps[p.id] || []).includes(part)).sort((a, b) => (a.id === memberId ? -1 : b.id === memberId ? 1 : a.name.localeCompare(b.name)))

  // A streak that ended lately, once per device
  const ended = streak.ended && streak.ended.length >= 3 && diffDays(streak.ended.on, today) <= 3 ? streak.ended : null
  const mournKey = ended ? `mourn:${memberId}:${part}:${ended.on}` : null
  const mourn = ended && !seen(mournKey) ? mournWords({ ...ended, part, runs: runs[part], today, seed: memberId }) : null

  const onTick = (entry, { golden: gold }) => {
    const before = lists[part].entries.filter((e) => tickFor(e, ticks)).length
    const finishingNow = before + 1 >= lists[part].entries.length
    const s0 = streaks[part], r0 = runs[part]
    buzz()
    tickSound(before)
    if (gold) {
      setTimeout(goldSound, 120)
      const found = recordsFrom(L.myRows, part).golden + 1
      setNote({ gold: true, text: found === 1 ? 'You found a golden feather! One turns up on a list now and then.' : `A golden feather! That’s ${found} you’ve found.` })
      setTimeout(() => setNote(null), 5200)
    }
    L.tick(entry, part)
    if (!finishingNow) return
    setFinishing(part)
    setTimeout(() => {
      setFinishing(null)
      doneSound(part)
      const streakNow = s0.doneToday ? s0.current : s0.current + 1
      const prevBest = s0.doneToday ? (r0[1] || 0) : s0.best
      const ms = milestoneAt(streakNow, part)
      const perk = streakNow > prevBest ? perkAt(streakNow) : null
      if (part === 'morning' && birdRef.current && !reducedMotion()) { setFlight(birdRef.current.getBoundingClientRect()); zipSound() }
      if (part === 'evening') { setSettle(true); setTimeout(() => setSettle(false), 3400) }
      if (ms || perk || (streakNow > prevBest && streakNow >= 5 && prevBest >= 3)) {
        setGleam(true); setTimeout(() => setGleam(false), 2800)
        setTimeout(() => setJoy({
          title: ms ? ms.title : 'Your longest streak yet!',
          line: perk ? `Your ${part === 'evening' ? 'owl' : 'hummingbird'} earned ${perk.name}, to keep for good.` : `${streakNow} ${noun(part, streakNow)} in a row.`,
          art: part === 'evening' ? <Owl perks={perksFor(Math.max(prevBest, streakNow)).map((p) => p.key)} /> : <Hummingbird throat={person.colour} annas={isAnna(person)} perks={perksFor(Math.max(prevBest, streakNow)).map((p) => p.key)} still />,
          big: streakNow >= 30,
        }), part === 'morning' && !reducedMotion() ? 2700 : 600)
      }
    }, reducedMotion() ? 250 : 760)
  }
  const onUntick = (entry) => { untickSound(); L.untick(entry, part) }

  const tapBird = () => {
    if (bubble) { markSeen(bubble.key); setBubble(null); return }
    if (part === 'evening') {
      const t = Date.now()
      taps.current = [...taps.current.filter((x) => t - x < 1400), t]
      if (taps.current.length >= 3) {
        taps.current = []
        setTurn(true); setTimeout(() => setTurn(false), 2200)
        setBubble({ key: 'owl-turn', text: 'Owls can turn their heads about three-quarters of the way round. Please don’t try it.' })
      } else hootSound()
      return
    }
    zipSound(); setZip(true); setTimeout(() => setZip(false), 700)
  }

  const takeDayOff = async () => {
    const made = []
    for (const p of ['morning', 'evening']) if (has(p) && !allDone(p) && !lists[p].rest) { const c = await L.addChange({ on_date: today, part: p, kind: 'rest', note: 'Birthday' }); if (c) made.push(c.id) }
    if (made.length) setToast({ text: 'The rest of today is off. Happy birthday!', undo: () => made.forEach((id) => L.removeChange(id)) })
  }
  const restId = list.rest ? (L.changes.find((c) => c.on_date === today && c.part === part && c.kind === 'rest') || {}).id : null

  const doneMin = myRow && myRow.done_at ? minutesAtHome(myRow.done_at) : null
  const sunrise = sunriseAt(today)
  const beatBy = part === 'morning' && myRow && myRow.done_at ? Math.round((sunrise.getTime() - Date.parse(myRow.done_at)) / 60000) : 0
  const prevBest = streak.doneToday ? (runs[part].filter((n, i) => i !== runs[part].indexOf(streak.current))[0] || 0) : streak.best
  const dw = doneWords({ part, streak: streak.current, best: streak.best, previousBest: prevBest, minutes: doneMin, beatSunBy: beatBy > 0 ? beatBy : 0 })
  const atRisk = part === 'evening' && hour >= 19 && !showDone && streak.current >= 3 && !streak.doneToday

  const bird = part === 'evening'
    ? <Owl perks={perks.map((p) => p.key)} asleep={showDone && !settle} className={(turn ? 'turn ' : '') + (settle ? 'settle ' : '')} />
    : <Hummingbird throat={person.colour || '#C42D20'} annas={isAnna(person)} perks={perks.map((p) => p.key)} still={showDone} />

  return (
    <Card tint={PART_COLOURS[part]} className={`span-6 dl-card dl-${part}${showDone ? ' is-done' : ''}${gleam ? ' dl-gleaming' : ''}${birthday ? ' dl-bday' : ''}`} aria-label={`${names[part]} list`}>
      {gleam && <i className="dl-gleam" aria-hidden="true" />}
      {part === 'evening' && <div className="dl-night" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 92 + 4}%`, top: `${(i * 23) % 70 + 8}px`, animationDelay: `${(i * 0.43) % 3}s` }} />)}</div>}
      <div className="dl-head">
        <div className="dl-tabs" role="group" aria-label="Which list">
          {['morning', 'evening'].map((p) => (
            <button key={p} type="button" className={'dl-tab dl-tab-' + p} aria-pressed={p === part} onClick={() => setChoice(p)}>
              <span className="dl-tab-i">{p === 'morning' ? <SunIcon /> : <MoonIcon />}</span>
              <span className="dl-tab-t"><b>{names[p]}</b>
                <small>{lists[p].rest ? 'resting' : allDone(p) ? 'done ✓' : lists[p].entries.length ? `${lists[p].entries.length - lists[p].entries.filter((e) => tickFor(e, ticks)).length} left` : 'nothing today'}</small>
              </span>
              {streaks[p].current >= 2 && <span className="dl-streak" title={`${streaks[p].current} ${noun(p, streaks[p].current)} in a row`}><Flame />{streaks[p].current}</span>}
            </button>
          ))}
        </div>
        <div className="dl-stage">
          <div className="dl-status">
            {list.rest ? (
              <>
                <b className="dl-headline">Resting this {part === 'evening' ? 'evening' : 'morning'}</b>
                <small>{list.restNote ? `${list.restNote}. ` : ''}Your streak waits for you, safe and sound.{restId && <> <button type="button" className="dl-link" onClick={() => L.removeChange(restId)}>I’m back on</button></>}</small>
              </>
            ) : !list.entries.length ? (
              <>
                <b className="dl-headline">Nothing on today’s {names[part]}</b>
                <small><Link to="/home/lists">Add something</Link></small>
              </>
            ) : showDone ? (
              <div className="dl-donep">
                <span className="dl-stamp" aria-hidden="true">✓</span>
                <b className="dl-done-h">{part === 'evening' ? 'Sleep tight.' : 'Off you go!'}</b>
                <span className="dl-fig">{dw.head}</span>
                {dw.line && <span>{dw.line.replace(/^./, (c) => c.toUpperCase())}</span>}
                {has(other) && !allDone(other) && !lists[other].rest && <button type="button" className="dl-link dl-next" onClick={() => setChoice(other)}>{names[other]}: {lists[other].entries.length - lists[other].entries.filter((e) => tickFor(e, ticks)).length} {other === 'evening' ? 'for tonight' : 'still to do'} ›</button>}
              </div>
            ) : (
              <>
                <b className="dl-headline">{progressWords(doneCount, list.entries.length, today + part + doneCount)}</b>
                <span className="dl-bar" role="progressbar" aria-valuemin={0} aria-valuemax={list.entries.length} aria-valuenow={doneCount} aria-label={`${doneCount} of ${list.entries.length} done`}><i style={{ '--p': doneCount / list.entries.length }} /></span>
                {atRisk && <small>Keep your {streak.current}-evening streak going tonight.</small>}
              </>
            )}
          </div>
          <button type="button" ref={birdRef} className={'dl-buddy' + (flight ? ' away' : '') + (zip ? ' zip' : '')} onClick={tapBird} aria-label={part === 'evening' ? 'The owl' : isAnna(person) ? 'Your Anna’s hummingbird' : 'The hummingbird'}>
            {bird}
          </button>
        </div>
        {bubble && <button type="button" className="dl-bubble" onClick={() => { markSeen(bubble.key); setBubble(null) }}>{bubble.text}<small>Tap to close</small></button>}
      </div>

      {birthday && (
        <div className="dl-bday-line">
          <b>Happy birthday, {person.name}!</b> Every tick is a party today.
          {(has('morning') && !allDone('morning')) || (has('evening') && !allDone('evening')) ? <button type="button" className="dl-link" onClick={takeDayOff}>Take the day off</button> : null}
        </div>
      )}

      {mourn && (
        <div className="dl-mourn" role="status">
          <span className="dl-mourn-f" aria-hidden="true"><Feather colour={PART_COLOURS[part]} /></span>
          <div><b>{mourn.title}</b><p>{mourn.line}</p><p className="dl-cheer">{mourn.cheer}</p></div>
          <button type="button" className="btn ghost" onClick={() => { markSeen(mournKey); bump((x) => x + 1) }}>Day one. Let’s go</button>
        </div>
      )}

      {!list.rest && (() => {
        const tools = <DayTools key={'tools' + part} L={L} memberId={memberId} part={part} name={names[part]} today={today} canSkip={list.entries.length > 0 && !allDone(part)} onToast={setToast} />
        return list.entries.length > 0
          ? <RoutineList key={part} part={part} list={list} ticks={ticks} golden={golden} birthday={birthday} onTick={onTick} onUntick={onUntick} label={`${names[part]}: what’s left`} tools={tools} />
          : <div className="dl-pile-row">{tools}</div>
      })()}
      {note && <p className={'dl-note' + (note.gold ? ' gold' : '')} role="status">{note.text}</p>}
      {L.error && <p className="err" role="alert">Something didn’t save: {L.error} <button type="button" className="dl-link" onClick={() => { L.clearError(); L.reload() }}>Try again</button></p>}

      <div className="dl-side">
        {ring.length > 1 && (
          <div className="dl-fam" aria-label={`The family ${part === 'evening' ? 'tonight' : 'this morning'}`}>
            <span className="dl-fam-h">{part === 'evening' ? 'Tonight' : 'This morning'}</span>
            {ring.map((p) => {
              const r = dayRow(p.id, part)
              const pct = r && r.status === 'done' ? 1 : r && r.total ? r.done / r.total : 0
              const words = !r ? 'not started' : r.status === 'rest' ? 'resting' : r.status === 'done' ? 'done' : `${r.done} of ${r.total}`
              return (
                <Link key={p.id} to="/home/lists/family" className={'dl-ring' + (r && r.status === 'done' ? ' done' : '') + (r && r.status === 'rest' ? ' rest' : '')} style={{ '--c': p.colour || '#6E5B4B' }} aria-label={`${p.id === memberId ? 'You' : p.name}: ${words}`} title={`${p.name}: ${words}`}>
                  <svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" className="dl-ring-bg" /><circle cx="18" cy="18" r="15" className="dl-ring-fg" style={{ strokeDashoffset: 94.25 * (1 - pct) }} /></svg>
                  <span>{r && r.status === 'done' ? '✓' : (p.name || '?')[0]}</span>
                </Link>
              )
            })}
          </div>
        )}

        {active && st && (
          <Link to="/home/lists/challenges" className={'dl-ribbon ' + st.state + (unfurl ? ' unfurl' : '')}>
            <span className="dl-ribbon-k">{st.state === 'coming' ? `Family challenge · ${st.words}` : st.state === 'won' ? 'Challenge won!' : `Family challenge · ${st.words}`}</span>
            <b>{active.spec.title}</b>
            {st.state !== 'coming' && (
              <span className="dl-pips" aria-label={st.words}>
                {active.spec.kind === 'share' || active.spec.kind === 'firsts' ? <em>{st.words}</em> : Array.from({ length: st.need }, (_, i) => <i key={i} className={i < st.have ? 'on' : ''} />)}
              </span>
            )}
          </Link>
        )}
        {!active && justWon && <Link to="/home/lists/challenges" className="dl-ribbon won"><Trophy className="dl-ribbon-t" /><span className="dl-ribbon-k">Challenge won!</span><b>{justWon.spec.title}</b></Link>}
        {missed && (
          <div className="dl-missed">
            <span>{endWords(missed, { state: 'missed', words: (missed.result && missed.result.words) || 'Not this time' }).title}. {(missed.result && missed.result.words) || ''}. The next one is only a few days off.</span>
            <button type="button" className="dl-link" onClick={() => { markSeen(`run:${missed.id}:missed`); bump((x) => x + 1) }}>Okay</button>
          </div>
        )}

        <div className="dl-foot">
          {lastLeft > 0 && <Link to="/home/lists" className="dl-more">Last night’s {names.evening}: {lastLeft} still to tick ›</Link>}
          <Link to="/home/lists" className="dl-more">Your lists, streaks and records ›</Link>
          {parentOfAnna && <Link to={`/home/lists/${parentOfAnna.id}`} className="dl-more">{parentOfAnna.name}’s ›</Link>}
        </div>
      </div>

      {flight && <Flight from={flight} bird={<Hummingbird throat={person.colour || '#C42D20'} annas={isAnna(person)} perks={perks.map((p) => p.key)} />} onDone={() => setFlight(null)} />}
      {team && <TeamFlight people={ring} onDone={() => setTeam(false)} />}
      {joy && <Joy moment={joy} onDone={() => setJoy(null)} />}
      {toast && <Toast action="Undo" onAction={() => { toast.undo(); setToast(null) }} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </Card>
  )
}
