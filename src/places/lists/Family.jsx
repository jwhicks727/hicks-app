import { supabase } from '../../lib/supabase.js'
import { useLists } from '../../lib/useLists.js'
import { addDays } from '../../lib/cal/dates.js'
import { listDay, namesFor, noun, streakShown } from '../../lib/routines.js'
import { standing, readiness, keepsOf, LEVEL_WORDS, ruleLine } from '../../lib/challenges.js'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { Trophy } from './Birds.jsx'
import { Flame } from './icons.jsx'
import { teamDayToday } from '../../parts/ListsCard.jsx'

// /home/lists/family: the family's page. The challenge under way (or the next
// one coming), how the challenges work, the family shelf of trophies, and
// how each of us is going: counts and streaks, never anyone's words (a list's
// words are its keeper's, docs/DATABASE.md).

const SHORT_DAY = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })

export default function Family({ session, family, me, now }) {
  const today = listDay(now)
  const memberId = me ? family.canon(me.id) : null
  const L = useLists(session, { memberId, today, withFamily: true })
  const names = namesFor(L.settings && L.settings.names)
  const hero = (
    <header className="hero span-6">
      <Crumb to="/home/lists">Lists</Crumb>
      <span className="kicker">{names.both}</span>
      <h1 className="greet">Team Hicks</h1>
      <span className="sub">How we’re all going, and the challenges we take on together.</span>
    </header>
  )
  if (!supabase || !session || !me) return <>{hero}<Card className="span-6" tint="#8A5BC4"><p className="muted">{!supabase ? 'The database isn’t connected on this copy of the app.' : 'Loading…'}</p></Card></>
  if (!L.loaded) return <>{hero}<Card className="span-6" tint="#8A5BC4"><p className="muted">Loading…</p></Card></>
  if (L.missing) return <>{hero}<Card className="span-6" tint="#8A5BC4" label="Not set up yet" glyph="star"><p>The lists’ tables aren’t in the database yet (docs/DATABASE.md).</p></Card></>

  const rows = L.familyRows
  const person = (id) => family.people.find((p) => p.id === id)
  const active = L.runs.filter((r) => r.status === 'planned' && r.ends_on >= today).sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1))[0] || null
  const st = active ? standing(active, rows, today) : null
  const shelf = L.runs.filter((r) => r.status === 'won').sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1))
  const tried = L.runs.filter((r) => r.status === 'missed').sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1))
  const ready = readiness(rows)
  const keeps = keepsOf(rows, today)
  const people = family.people.filter((p) => keeps[p.id] || p.id === memberId)
  let teamDays = 0
  for (let d = addDays(today, -60); d <= today; d = addDays(d, 1)) if (teamDayToday(rows, d)) teamDays++
  const on = !L.settings || L.settings.challenges_on !== false

  return (
    <>
      {hero}
      <Card tint="#8A5BC4" label="The family challenge" glyph="star" tag={active ? LEVEL_WORDS[active.spec.level] : undefined} className="span-6 dl-page dl-chal">
        {active && st ? (
          <>
            <h2>{active.spec.title}</h2>
            <p>{ruleLine(active.spec)}{active.spec.moon ? ` This one is the ${active.spec.moon}.` : ''}</p>
            <p className="dl-chal-when">{st.state === 'coming' ? `${st.words}: ${SHORT_DAY(active.starts_on)} to ${SHORT_DAY(active.ends_on)}.` : st.state === 'won' ? 'Done! A trophy for the shelf.' : `${SHORT_DAY(active.starts_on)} to ${SHORT_DAY(active.ends_on)} · ${st.words}`}</p>
            <ol className="dl-chal-days">
              {st.days.map((d) => <li key={d.date} className={'d-' + d.mark + (d.date === today ? ' today' : '')}><b>{SHORT_DAY(d.date).split(',')[0]}</b><span>{d.mark === 'yes' ? '✓' : d.mark === 'no' ? '–' : d.date === today ? 'today' : ''}</span></li>)}
            </ol>
            <p className="muted">Taking part: {(active.spec.people || []).map((id) => (person(id) || {}).name).filter(Boolean).join(', ') || 'the family'}.</p>
          </>
        ) : !on ? (
          <p>The challenges are switched off in Admin.</p>
        ) : ready.ready ? (
          <p>No challenge today. The next one is planned a few days after the last ends, timed to suit it.</p>
        ) : (
          <p>The challenges begin once two of us have finished a list on three days each{ready.best.length ? ` (so far: ${ready.best.map((n) => `${n} ${n === 1 ? 'day' : 'days'}`).join(' and ')})` : ''}. Then they start by themselves.</p>
        )}
        <details className="dl-how">
          <summary>How the challenges work</summary>
          <p>Every few days the family takes one on together: some easy, some a stretch, some hard, in a pattern that starts with a welcome win. Each is timed to suit it: a weekend one starts on a Saturday, a week-long one on a Monday, the moonlit one on the full moon’s nights, and Beat the Sun only in the months when the sun comes up late. A day of rest counts as done; someone with no evening list is only asked for the morning. Jason and Laurie can switch any off, change its numbers, add the family’s own, or start one now, in Admin.</p>
        </details>
      </Card>

      <Card tint="#D9A23A" label="The family shelf" glyph="star" tag={`${shelf.length} won`} className="span-3 dl-page">
        {shelf.length === 0 ? <p className="muted">Every challenge we win puts a trophy here.</p> : (
          <ul className="dl-shelf">
            {shelf.map((r) => <li key={r.id}><Trophy className="dl-shelf-t" colour={r.spec.level === 'hard' ? '#F2C14E' : r.spec.level === 'medium' ? '#D8DEE6' : '#E3A65C'} /><b>{r.spec.title}</b><small>{SHORT_DAY(r.starts_on)} · {LEVEL_WORDS[r.spec.level] || ''}</small></li>)}
          </ul>
        )}
        {tried.length > 0 && <p className="muted small">Tried and got away: {tried.slice(0, 6).map((r) => r.spec.title).join(', ')}. Each one is a step.</p>}
      </Card>

      <Card tint="#3FA34D" label="How we’re going" glyph="star" tag={`${teamDays} Team Hicks ${teamDays === 1 ? 'day' : 'days'}`} className="span-3 dl-page">
        <p className="muted small">A Team Hicks day is one when every one of us finished every list (in the last two months: {teamDays}).</p>
        <ul className="dl-people">
          {people.map((p) => {
            const mine = rows.filter((r) => r.member_id === p.id)
            return (
              <li key={p.id} style={{ '--c': p.colour || '#6E5B4B' }}>
                <span className="dl-people-n"><i>{p.name[0]}</i><b>{p.id === memberId ? `${p.name} (you)` : p.name}</b></span>
                {['morning', 'evening'].filter((part) => (keeps[p.id] || []).includes(part)).map((part) => {
                  const today_ = mine.find((r) => r.on_date === today && r.part === part)
                  const n = streakShown(mine, part, today)
                  return <span key={part} className="dl-people-p"><span>{names[part]}</span><b>{today_ ? (today_.status === 'done' ? 'done ✓' : today_.status === 'rest' ? 'resting' : `${today_.done} of ${today_.total}`) : 'not yet'}</b>{n >= 2 && <em><Flame />{n} {noun(part, n)}</em>}</span>
                })}
              </li>
            )
          })}
        </ul>
        <p className="muted small">Counts only: what’s on each list stays with its keeper. <Link to="/home/lists">Your own lists ›</Link></p>
      </Card>
    </>
  )
}

