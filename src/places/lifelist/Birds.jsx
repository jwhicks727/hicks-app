import { useMemo, useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Confirm } from '../../ui/Confirm.jsx'
import Dropzone from '../../ui/Dropzone.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { useSightings, importSightings, clearSightings, useBirdSync, sayYesToSync, takeBackSyncYes } from '../../lib/useLife.js'
import { parseEbird } from '../../lib/life/ebird.js'
import { lifeList, byDay, dayList, byMonth, monthList, byPlace, placeList, speciesStory, totals, monthName, checklistUrl } from '../../lib/life/birdStats.js'
import { subjectOf } from '../../lib/life/subjects.js'
import { LifeTabs, LifePicture, LifeArt, Stat, shortDay } from './LifeBits.jsx'
import { useLifeContext } from './useLifeContext.js'

// /lifelist/birds                 her life list, every bird she has seen
// /lifelist/birds/days            each day she birded     /days/<date>   one day
// /lifelist/birds/months          the months, any year    /months/<1-12> one month
// /lifelist/birds/places          where she has birded    /places/<key>  one place
// /lifelist/birds/species/<key>   one bird's story
// /lifelist/birds/import          bring in the file eBird gives her
// Parents only: where she walks says where she is.

const TABS = [['', 'Birds'], ['days', 'Days'], ['months', 'Months'], ['places', 'Places']]
const MONTH_RE = /^(0?[1-9]|1[0-2])$/

export default function Birds({ rest = [] }) {
  const c = useLifeContext()
  const birds = useSightings(c.session, c.parent)
  const rows = birds.rows
  if (!c.parent) return <><header className="hero span-6"><Crumb to="/lifelist">Life List</Crumb><h1 className="greet">Laurie’s birds</h1></header><Card tint="#5F8A4A" label="Her birds" glyph="bird" className="span-6"><p>Her sightings are kept for Jason and Laurie.</p></Card></>
  const [tab, id] = rest
  if (tab === 'import') return <Import c={c} birds={birds} />
  if (tab === 'species' && id) return <Species c={c} rows={rows} loaded={birds.loaded} id={id} />
  const Head = ({ sub }) => (<><header className="hero span-6"><Crumb to={sub ? '/lifelist/birds' : '/lifelist'}>{sub ? 'Laurie’s birds' : 'Life List'}</Crumb><span className="kicker">From eBird{rows.length ? ` · ${shortDay(totals(rows).first)} to ${shortDay(totals(rows).last)}` : ''}</span><h1 className="greet">{sub || 'Laurie’s birds'}</h1></header>{!sub && <LifeTabs on="birds" />}</>)
  if (birds.loaded && !rows.length) return <><Head /><Card tint="#5F8A4A" label="Not here yet" glyph="bird" className="span-6"><p>Bring in the file eBird gives Laurie and her whole life list opens up here.</p><Link className="btn ui-btn-shine shine" to="/lifelist/birds/import">Bring in her eBird data</Link></Card></>
  if (tab === 'days' && id) return <DayView c={c} rows={rows} date={id} Head={Head} />
  if (tab === 'months' && id && MONTH_RE.test(id)) return <MonthView c={c} rows={rows} month={Number(id)} Head={Head} />
  if (tab === 'places' && id) return <PlaceView c={c} rows={rows} id={id} Head={Head} />
  return (
    <>
      <Head />
      <BirdTabs on={tab || ''} />
      {!birds.loaded && <Card tint="#5F8A4A" label="Her birds" glyph="bird" className="span-6"><p className="muted">Looking through her sightings…</p></Card>}
      {birds.loaded && (tab === 'days' ? <Days rows={rows} /> : tab === 'months' ? <Months rows={rows} /> : tab === 'places' ? <Places rows={rows} /> : <LifeListView c={c} rows={rows} />)}
    </>
  )
}

function BirdTabs({ on }) {
  return <nav className="ll-seg span-6" aria-label="How to look at her birds">{TABS.map(([k, n]) => <Link key={k} to={`/lifelist/birds${k ? '/' + k : ''}`} aria-current={k === on ? 'page' : undefined} className={'btn ghost' + (k === on ? ' on' : '')} style={k === on ? { background: 'var(--ink)', color: 'var(--card)' } : undefined}>{n}</Link>)}<Link to="/lifelist/birds/import" className="btn ghost">Bring in more</Link></nav>
}

function LifeListView({ c, rows }) {
  const [q, setQ] = useState(''), [by, setBy] = useState('order')
  const list = useMemo(() => lifeList(rows, by === 'first' ? 'first' : 'order'), [rows, by])
  const shown = q.trim() ? list.filter((b) => b.species.toLowerCase().includes(q.trim().toLowerCase())) : list
  const t = totals(rows)
  return (
    <>
      <Card tint="#5F8A4A" label="Her life list" glyph="bird" className="span-6">
        <div className="ll-stats"><Stat n={t.species} label="birds" /><Stat n={t.days} label="days birding" to="/lifelist/birds/days" /><Stat n={t.places} label="places" to="/lifelist/birds/places" /><Stat n={t.checklists} label="checklists" /><Stat n={t.years} label="years" to="/lifelist/birds/months" /></div>
      </Card>
      <Card tint="#5F8A4A" label="Every bird" glyph="bird" tag={`${shown.length}`} className="span-6">
        <div className="ll-search"><input type="search" inputMode="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a bird" aria-label="Find a bird" /></div>
        <div className="ll-seg" role="group" aria-label="Order"><button type="button" aria-pressed={by === 'order'} onClick={() => setBy('order')}>As birders keep them</button><button type="button" aria-pressed={by === 'first'} onClick={() => setBy('first')}>Newest first</button></div>
        <ul className="ll-list">
          {shown.slice(0, 200).map((b) => (
            <li key={b.key}><Link className="ll-row" to={`/lifelist/birds/species/${b.key}`} style={{ '--c': '#5F8A4A' }}>
              <LifePicture subject={subjectOf('bird', b.species)} art="bird" colour="#5F8A4A" paintings={c.paintings} size={44} label={b.species} />
              <span><b>{b.species}</b><small>{b.days} {b.days === 1 ? 'day' : 'days'} · first {shortDay(b.first.date)}{b.first.location ? `, ${b.first.location}` : ''}</small></span>
            </Link></li>
          ))}
        </ul>
        {shown.length > 200 && <p className="muted small">The first 200 of {shown.length}. Search to find the rest.</p>}
        {!shown.length && <p className="muted">No bird by that name on her list.</p>}
      </Card>
    </>
  )
}

function Days({ rows }) {
  const [n, setN] = useState(40)
  const days = useMemo(() => byDay(rows), [rows])
  return (
    <Card tint="#E0662F" label="Every day she birded" glyph="calendar" tag={`${days.length}`} className="span-6">
      <ul className="ll-list">{days.slice(0, n).map((d) => (
        <li key={d.date}><Link className="ll-row" to={`/lifelist/birds/days/${d.date}`} style={{ '--c': '#E0662F' }}>
          <span><b>{shortDay(d.date)}</b><small>{d.species} {d.species === 1 ? 'species' : 'species'} · {d.places.slice(0, 2).join(', ')}{d.places.length > 2 ? ` and ${d.places.length - 2} more` : ''}</small></span>{d.lifers > 0 && <em>{d.lifers} new</em>}
        </Link></li>
      ))}</ul>
      {days.length > n && <button type="button" className="btn ghost ll-more" onClick={() => setN(n + 60)}>Show more days</button>}
    </Card>
  )
}

function DayView({ c, rows, date, Head }) {
  const list = useMemo(() => dayList(rows, date), [rows, date])
  const lifers = useMemo(() => new Set(lifeList(rows).filter((b) => b.first.date === date).map((b) => b.key)), [rows, date])
  const places = [...new Set(list.map((x) => x.location).filter(Boolean))]
  return (
    <>
      <Head sub={shortDay(date)} />
      <Card tint="#E0662F" label="That day" glyph="calendar" tag={`${new Set(list.map((x) => x.key)).size} species`} className="span-6">
        {!list.length && <p className="muted">She didn’t bird that day.</p>}
        {places.length > 0 && <p className="muted">{places.join(' · ')}</p>}
        <ul className="ll-list">{list.map((x, i) => (
          <li key={i}><Link className="ll-row" to={`/lifelist/birds/species/${x.key}`} style={{ '--c': '#E0662F' }}>
            <LifePicture subject={subjectOf('bird', x.species)} art="bird" colour="#5F8A4A" paintings={c.paintings} size={40} label={x.species} />
            <span><b>{x.species}</b><small>{x.count != null ? `${x.count} · ` : ''}{x.time ? `${x.time} · ` : ''}{x.location}{x.comments ? ` · “${x.comments}”` : ''}</small></span>{lifers.has(x.key) && <em>New</em>}
          </Link></li>
        ))}</ul>
        <nav className="place-step" aria-label="Other days"><Link to={`/lifelist/birds/days`}>All her days</Link></nav>
      </Card>
    </>
  )
}

function Months({ rows }) {
  const m = useMemo(() => byMonth(rows), [rows]), max = Math.max(1, ...m.map((x) => x.species))
  return (
    <>
      <Card tint="#6C7FB8" label="Her birds through the year" glyph="bird" className="span-6">
        <div className="ll-bars">{m.map((x) => <Link key={x.month} to={`/lifelist/birds/months/${x.month}`} aria-label={`${x.name}: ${x.species} species`}><span>{x.species || ''}</span><i style={{ height: `${Math.max(3, (x.species / max) * 74)}px` }} /><span>{x.name[0]}</span></Link>)}</div>
        <p className="muted small">Species seen in each month, across every year. Tap a month to see its birds.</p>
      </Card>
      <Card tint="#6C7FB8" label="Month by month" glyph="calendar" className="span-6">
        <ul className="ll-months">{m.map((x) => (
          <li key={x.month}><Link className="ll-month" to={`/lifelist/birds/months/${x.month}`}><b>{x.name}</b><small>{x.species} species · {x.days} {x.days === 1 ? 'day' : 'days'}{x.years ? ` · ${x.years} ${x.years === 1 ? 'year' : 'years'}` : ''}</small><span className="ll-bar"><i style={{ width: `${(x.species / max) * 100}%` }} /></span></Link></li>
        ))}</ul>
      </Card>
    </>
  )
}

function MonthView({ c, rows, month, Head }) {
  const list = useMemo(() => monthList(rows, month), [rows, month])
  return (
    <>
      <Head sub={monthName(month)} />
      <Card tint="#6C7FB8" label={`Birds of ${monthName(month)}`} glyph="bird" tag={`${list.length}`} className="span-6">
        {!list.length && <p className="muted">She hasn’t seen birds in {monthName(month)} yet.</p>}
        <ul className="ll-list">{list.map((b) => (
          <li key={b.key}><Link className="ll-row" to={`/lifelist/birds/species/${b.key}`} style={{ '--c': '#6C7FB8' }}>
            <LifePicture subject={subjectOf('bird', b.species)} art="bird" colour="#6C7FB8" paintings={c.paintings} size={40} label={b.species} />
            <span><b>{b.species}</b><small>{b.days} {b.days === 1 ? 'day' : 'days'} · last {shortDay(b.lastSeen)}</small></span>
          </Link></li>
        ))}</ul>
        <nav className="place-step" aria-label="Other months"><Link to={`/lifelist/birds/months/${month === 1 ? 12 : month - 1}`}>‹ {monthName(month === 1 ? 12 : month - 1)}</Link><Link to={`/lifelist/birds/months/${month === 12 ? 1 : month + 1}`}>{monthName(month === 12 ? 1 : month + 1)} ›</Link></nav>
      </Card>
    </>
  )
}

function Places({ rows }) {
  const places = useMemo(() => byPlace(rows), [rows])
  return (
    <Card tint="#3BA3A8" label="Where she has birded" glyph="star" tag={`${places.length}`} className="span-6">
      <ul className="ll-list">{places.slice(0, 120).map((p) => (
        <li key={p.key}><Link className="ll-row" to={`/lifelist/birds/places/${p.key}`} style={{ '--c': '#3BA3A8' }}>
          <LifeArt art="park" colour="#3BA3A8" size={40} />
          <span><b>{p.name}</b><small>{[p.county, p.state].filter(Boolean).join(', ')}{p.county || p.state ? ' · ' : ''}{p.species} species · {p.days} {p.days === 1 ? 'day' : 'days'} · last {shortDay(p.last)}</small></span>
        </Link></li>
      ))}</ul>
      {places.length > 120 && <p className="muted small">The 120 with the most birds of {places.length}.</p>}
    </Card>
  )
}

function PlaceView({ c, rows, id, Head }) {
  const place = useMemo(() => byPlace(rows).find((p) => p.key === id), [rows, id])
  const list = useMemo(() => placeList(rows, id), [rows, id])
  if (!place) return <><Head sub="Not a place she’s birded" /></>
  return (
    <>
      <Head sub={place.name} />
      <Card tint="#3BA3A8" label="Here" glyph="star" className="span-6">
        <div className="ll-stats"><Stat n={place.species} label="species" /><Stat n={place.days} label="days" /><Stat n={place.checklists} label="checklists" /><Stat n={place.lifers} label="first seen here" /></div>
        <ul className="ll-list">{list.map((b) => (
          <li key={b.key}><Link className="ll-row" to={`/lifelist/birds/species/${b.key}`} style={{ '--c': '#3BA3A8' }}>
            <LifePicture subject={subjectOf('bird', b.species)} art="bird" colour="#3BA3A8" paintings={c.paintings} size={40} label={b.species} />
            <span><b>{b.species}</b><small>{b.days} {b.days === 1 ? 'day' : 'days'} · last {shortDay(b.last)}</small></span>
          </Link></li>
        ))}</ul>
      </Card>
    </>
  )
}

function Species({ c, rows, loaded, id }) {
  const s = useMemo(() => speciesStory(rows, id), [rows, id])
  const max = s ? Math.max(1, ...s.months) : 1
  if (!s) return <><header className="hero span-6"><Crumb to="/lifelist/birds">Laurie’s birds</Crumb><h1 className="greet">{loaded ? 'Not on her list' : '…'}</h1></header></>
  const url = checklistUrl(s.first.submission_id)
  return (
    <>
      <header className="hero span-6"><Crumb to="/lifelist/birds">Laurie’s birds</Crumb><span className="kicker">{s.sci || 'A bird on her list'}</span><h1 className="greet">{s.species}</h1></header>
      <Card tint="#5F8A4A" label="Her first" glyph="bird" className="span-3">
        <div className="ll-row" style={{ '--c': '#5F8A4A', background: 'transparent', padding: 0, borderLeft: 0 }}>
          <LifePicture subject={subjectOf('bird', s.species)} art="bird" colour="#5F8A4A" paintings={c.paintings} size={96} label={s.species} />
          <span><b>{shortDay(s.first.observed_on)}</b><small>{s.first.location || 'A place with no name'}</small>{url && <a href={url} target="_blank" rel="noopener noreferrer">Its checklist on eBird ›</a>}</span>
        </div>
        <div className="ll-stats"><Stat n={s.days} label={s.days === 1 ? 'day' : 'days'} /><Stat n={s.best || '–'} label="most at once" /><Stat n={s.places.length} label={s.places.length === 1 ? 'place' : 'places'} /></div>
        <p className="muted small">Last seen {shortDay(s.last.observed_on)}. Her painting of it, when she’s painted one, stands in for a photo.</p>
      </Card>
      <Card tint="#6C7FB8" label="When she sees it" glyph="calendar" className="span-3">
        <div className="ll-bars">{s.months.map((n, i) => <Link key={i} to={`/lifelist/birds/months/${i + 1}`} aria-label={`${monthName(i + 1)}: ${n} ${n === 1 ? 'day' : 'days'}`}><span>{n || ''}</span><i style={{ height: `${Math.max(3, (n / max) * 74)}px`, opacity: n ? 1 : 0.25 }} /><span>{monthName(i + 1)[0]}</span></Link>)}</div>
      </Card>
      <Card tint="#3BA3A8" label="Where" glyph="star" className="span-3">
        <ul className="ll-list">{s.places.slice(0, 12).map((p) => <li key={p.key}><Link className="ll-row" to={`/lifelist/birds/places/${p.key}`} style={{ '--c': '#3BA3A8' }}><span><b>{p.name}</b><small>{p.days} {p.days === 1 ? 'day' : 'days'}</small></span></Link></li>)}</ul>
      </Card>
      <Card tint="#E0662F" label="Every time" glyph="calendar" tag={`${s.sightings.length}`} className="span-3">
        <ul className="ll-list">{s.sightings.slice(0, 40).map((x, i) => (
          <li key={i}><Link className="ll-row" to={`/lifelist/birds/days/${x.date}`} style={{ '--c': '#E0662F' }}><span><b>{shortDay(x.date)}</b><small>{x.count != null ? `${x.count} · ` : ''}{x.location}{x.comments ? ` · “${x.comments}”` : ''}</small></span></Link></li>
        ))}</ul>
        {s.sightings.length > 40 && <p className="muted small">The latest 40 of {s.sightings.length}.</p>}
      </Card>
    </>
  )
}

const RUN_WORDS = { ok: 'Went well', login_rejected: 'eBird turned the sign-in down, so it is waiting a day', failed: 'Didn’t finish', skipped: 'Skipped', started: 'Started' }
const when = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** Every night a job signs in to eBird as Laurie, but only while her own yes is here; this shows the yes and the last runs. */
function NightlySync({ c, birds }) {
  const sync = useBirdSync(c.session), [busy, setBusy] = useState(false), [err, setErr] = useState(null)
  const data = sync.rows[0] || { yes: null, runs: [] }, on = Boolean(data.yes), who = (c.members.find((m) => data.yes && m.id === data.yes.said_yes_by) || {}).name
  const byLaurie = who === 'Laurie'
  async function flip() {
    setBusy(true); setErr(null)
    const { error } = on ? await takeBackSyncYes() : await sayYesToSync(c.me.id)
    setBusy(false); if (error) setErr(/relation|does not exist|schema cache/i.test(error.message) ? 'The nightly sync migration hasn’t been run yet (docs/MORNING.md, step 13).' : error.message); else { sync.reload(); birds.reload() }
  }
  const last = data.runs.find((r) => r.kind !== 'discover')
  return (
    <Card tint="#2F7F9A" label="Every night, by itself" glyph="sunmoon" className="span-6">
      <p>Each night the app can sign in to eBird as Laurie, look for checklists it hasn’t seen, and add her birds, so nobody has to bring in a file. It takes up to 150 new checklists a night, newest first, so a long history fills in over a few nights.</p>
      {on
        ? <p><b>{byLaurie ? 'Laurie has said yes.' : `${who || 'A parent'} switched this on for Laurie.`}</b> {last ? <>Last run {when(last.at)}: {RUN_WORDS[last.status] || last.status}{last.status === 'ok' ? `, ${last.checklists} new checklists` : ''}.{last.note ? ` ${last.note}` : ''}</> : 'It hasn’t run yet.'}</p>
        : <p><b>Switched off.</b> Until a parent switches it on, nothing signs in to eBird.</p>}
      <button type="button" className={on ? 'btn ghost' : 'btn'} disabled={busy} onClick={flip}>{busy ? 'One moment…' : on ? 'Switch off' : 'Switch on for Laurie'}</button>
      {err && <p className="err" role="alert">{err}</p>}
      <p className="muted small">Her eBird password is kept only where the nightly job runs, never in the app or this repository. If eBird ever turns the sign-in down, the job stops for a day rather than trying again.</p>
    </Card>
  )
}

/** Bring in the file eBird gives her: read here in the browser, nothing leaves but the sightings. */
function Import({ c, birds }) {
  const [parsed, setParsed] = useState(null), [busy, setBusy] = useState(null), [done, setDone] = useState(null), [err, setErr] = useState(null), [clearing, setClearing] = useState(false)
  const t = useMemo(() => (parsed && parsed.rows.length ? { ...totals(parsed.rows) } : null), [parsed])
  async function take(files) {
    setErr(null); setDone(null); setParsed(null)
    const f = files.find((x) => /\.csv$/i.test(x.name) || x.type.includes('csv') || x.type.startsWith('text/'))
    if (!f) { setErr('That isn’t a CSV file. In eBird’s download, the one to choose is MyEBirdData.csv.'); return }
    if (f.size > 60e6) { setErr('That file is bigger than the app can read.'); return }
    const r = parseEbird(await f.text())
    if (r.error) setErr(r.error); else setParsed(r)
  }
  async function go() {
    if (!c.laurie) { setErr('Laurie isn’t in the family list yet.'); return }
    setBusy('Bringing them in…'); setErr(null)
    const res = await importSightings(c.laurie.id, parsed.rows, (n, of) => setBusy(`Bringing them in… ${n.toLocaleString('en-US')} of ${of.toLocaleString('en-US')}`))
    setBusy(null)
    if (res.error) { setErr(res.error); return }
    setDone(res.saved); setParsed(null); birds.reload()
  }
  async function wipe() {
    setClearing(false); setBusy('Taking them out…')
    const { error } = await clearSightings(c.laurie.id)
    setBusy(null); if (error) setErr(error.message); else { setDone(0); birds.reload() }
  }
  return (
    <>
      <header className="hero span-6"><Crumb to="/lifelist/birds">Laurie’s birds</Crumb><span className="kicker">From eBird</span><h1 className="greet">Bring in her birds</h1></header>
      <NightlySync c={c} birds={birds} />
      <Card tint="#5F8A4A" label="Or bring in a file, to catch up faster" glyph="bird" className="span-3">
        <ol className="ll-steps">
          <li>On ebird.org, signed in as Laurie: <b>My eBird</b>, then <b>Download My Data</b>.</li>
          <li>eBird emails a zip. Open it and find <b>MyEBirdData.csv</b>.</li>
          <li>Drop that file here, or choose it.</li>
        </ol>
        <p className="muted small">The file is read in this browser; this way the app never signs in to eBird. Only the birds, days and places are kept, places to about a kilometre, for Jason and Laurie to see. Birds Merlin heard or photographed reach her eBird through its checklists, so they come in with it. Bringing the same file in twice changes nothing.</p>
      </Card>
      <Card tint="#E0662F" label="Her file" glyph="calendar" className="span-3">
        <Dropzone accept=".csv,text/csv,text/plain" label="MyEBirdData.csv" hint="Drop the file here, or choose it." onFiles={take} disabled={Boolean(busy)} />
        {err && <p className="err" role="alert">{err}</p>}
        {parsed && t && (
          <div className="ll-form">
            <p><b>{parsed.rows.length.toLocaleString('en-US')} sightings</b> of <b>{t.species} birds</b> on {t.checklists.toLocaleString('en-US')} checklists, {shortDay(t.first)} to {shortDay(t.last)}.{parsed.skipped ? ` ${parsed.skipped} rows had no bird or date and were left out.` : ''}</p>
            <button type="button" className="btn" disabled={Boolean(busy)} onClick={go}>{busy || 'Bring them in'}</button>
          </div>
        )}
        {busy && !parsed && <p className="muted" role="status">{busy}</p>}
        {done != null && <p role="status"><b>{done ? `${done.toLocaleString('en-US')} sightings are in.` : 'They’re out.'}</b> <Link to="/lifelist/birds">See her birds ›</Link></p>}
      </Card>
      {birds.rows.length > 0 && (
        <Card tint="#8A5BC4" label="What’s kept" glyph="star" className="span-6">
          <p>{birds.rows.length.toLocaleString('en-US')} sightings are kept.</p>
          <button type="button" className="btn ghost" disabled={Boolean(busy)} onClick={() => setClearing(true)}>Take them all out</button>
        </Card>
      )}
      {clearing && <Confirm title="Take all her birds out?" yes="Take them out" danger onYes={wipe} onNo={() => setClearing(false)}><p>All {birds.rows.length.toLocaleString('en-US')} sightings leave the app. Her eBird isn’t touched, and the same file brings them back.</p></Confirm>}
    </>
  )
}
