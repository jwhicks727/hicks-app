import { useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Confirm } from '../../ui/Confirm.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { navigate, goBack } from '../../lib/router.js'
import { useDraft } from '../../lib/useDraft.js'
import { useOutings, useParkMarks, saveOuting, deleteOuting, saveParkMark } from '../../lib/useLife.js'
import { KINDS, KIND_ORDER, sorted, tally, whenWords, datesWords, nightsOf, celebrate, checkOuting, whereIs } from '../../lib/life/trips.js'
import { NATIONAL_PARKS, parkBySlug } from '../../lib/life/parks.js'
import { subjectOf } from '../../lib/life/subjects.js'
import { LifeTabs, LifeArt, LifePicture, Stat } from './LifeBits.jsx'
import { useLifeContext } from './useLifeContext.js'

// /lifelist/trips            camping, Disneyland and the other outings: coming up, and been
// /lifelist/trips/new        add one (parents)
// /lifelist/trips/<id>       one outing, celebrated if it's camping or Disneyland
// /lifelist/trips/<id>/edit  change it (parents)

export default function Trips({ rest = [] }) {
  const c = useLifeContext()
  const outings = useOutings(c.session), marks = useParkMarks(c.session)
  const [a, b] = rest
  if (a === 'new') return <Form c={c} outings={outings} marks={marks} />
  if (a && b === 'edit') return <Form c={c} outings={outings} marks={marks} id={a} />
  if (a) return <One c={c} outings={outings} id={a} />
  const { ahead, done } = sorted(outings.rows, c.today), t = tally(outings.rows, c.today)
  return (
    <>
      <header className="hero span-6"><Crumb to="/lifelist">Life List</Crumb><span className="kicker">Where we’ve been, and where we’re going</span><h1 className="greet">Trips</h1></header>
      <LifeTabs on="trips" />
      <Card tint="#E0662F" label="Our tally" glyph="star" className="span-6">
        <div className="ll-stats">{KIND_ORDER.map((k) => <Stat key={k} n={t.byKind[k].trips} label={t.byKind[k].trips === 1 ? KINDS[k].plural.replace(/s$/, '') : KINDS[k].plural} />)}<Stat n={t.nights} label="nights away" /><Stat n={t.thisYear} label="this year" /></div>
        {c.parent && <Link className="btn" to="/lifelist/trips/new">Add an outing</Link>}
      </Card>
      {!outings.loaded && <Card tint="#E0662F" label="Trips" glyph="calendar" className="span-6"><p className="muted">Looking…</p></Card>}
      {outings.loaded && !outings.rows.length && <Card tint="#E0662F" label="None yet" glyph="calendar" className="span-6"><p>No outings kept yet. Add the camping trips and Disneyland trips we’ve taken, and the ones coming up: they’re celebrated here.</p></Card>}
      {ahead.length > 0 && <Card tint="#3E7A4C" label="Coming up" glyph="calendar" tag={`${ahead.length}`} className="span-3"><Cards list={ahead} all={outings.rows} c={c} /></Card>}
      {done.length > 0 && <Card tint="#6C7FB8" label="Been" glyph="star" tag={`${done.length}`} className="span-3"><Cards list={done} all={outings.rows} c={c} /></Card>}
    </>
  )
}

function Cards({ list, all, c }) {
  return (
    <ul className="ll-list">{list.map((o) => {
      const k = KINDS[o.kind], say = celebrate(o, all, c.today)
      return (
        <li key={o.id}><Link className={'ll-trip' + (k.celebrate ? ' ll-celebrate' : '')} to={`/lifelist/trips/${o.id}`} style={{ '--c': k.colour }}>
          <LifePicture subject={o.park ? subjectOf('park', o.park) : null} art={k.art} colour={k.colour} paintings={c.paintings} size={56} label={o.title} />
          <span style={{ display: 'grid' }}><b>{o.title}</b><small>{whenWords(o, c.today)} · {datesWords(o, c.today)}{o.place ? ` · ${o.place}` : ''}</small></span>
          {say && <p>{say}</p>}
        </Link></li>
      )
    })}</ul>
  )
}

function One({ c, outings, id }) {
  const o = outings.rows.find((x) => x.id === id)
  const [asking, setAsking] = useState(false), [err, setErr] = useState(null)
  if (!o) return <header className="hero span-6"><Crumb to="/lifelist/trips">Trips</Crumb><h1 className="greet">{outings.loaded ? 'Not one of ours' : '…'}</h1></header>
  const k = KINDS[o.kind], say = celebrate(o, outings.rows, c.today), park = o.park ? parkBySlug(o.park) : null, w = whereIs(o, c.today)
  async function remove() { setAsking(false); const { error } = await deleteOuting(o.id); if (error) setErr(error.message); else { outings.reload(); navigate('/lifelist/trips', { replace: true }) } }
  return (
    <>
      <header className="hero span-6"><Crumb to="/lifelist/trips">Trips</Crumb><span className="kicker">{k.name} · {whenWords(o, c.today)}</span><h1 className="greet">{o.title}</h1></header>
      <Card tint={k.colour} label={say ? 'Celebrate' : 'The outing'} glyph="star" className={'span-6' + (k.celebrate ? ' ll-celebrate' : '')}>
        <div className="ll-row" style={{ '--c': k.colour, background: 'transparent', padding: 0, borderLeft: 0 }}>
          <LifePicture subject={o.park ? subjectOf('park', o.park) : null} art={k.art} colour={k.colour} paintings={c.paintings} size={96} label={o.title} />
          <span><b>{datesWords(o, c.today)}</b><small>{nightsOf(o) ? `${nightsOf(o)} ${nightsOf(o) === 1 ? 'night' : 'nights'}` : 'A day'}{o.place ? ` · ${o.place}` : ''}{o.with_whom ? ` · with ${o.with_whom}` : ''}</small>{say && <b>{say}</b>}</span>
        </div>
        {park && <Link className="btn ghost ll-more" to={`/lifelist/parks/${park.slug}`}>{park.name} National Park ›</Link>}
        {o.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{o.notes}</p>}
        {w.state !== 'done' && o.place && <Link className="btn ghost ll-more" to="/world">Its weather, on World ›</Link>}
        {err && <p className="err" role="alert">{err}</p>}
        {c.parent && <div className="form-actions"><Link className="btn ghost" to={`/lifelist/trips/${o.id}/edit`}>Change it</Link><button type="button" className="btn ghost" onClick={() => setAsking(true)}>Remove it</button></div>}
      </Card>
      {asking && <Confirm title="Remove this outing?" yes="Remove it" danger onYes={remove} onNo={() => setAsking(false)}><p>“{o.title}” leaves the Life List and the tally.</p></Confirm>}
    </>
  )
}

function Form({ c, outings, marks, id }) {
  const old = id ? outings.rows.find((x) => x.id === id) : null
  const blank = { kind: 'camping', title: '', starts_on: c.today, ends_on: '', place: '', with_whom: '', park: '', notes: '' }
  const [draft, setDraft, clearDraft] = useDraft(id ? `life.outing.${id}` : 'life.outing.new', blank)
  const f = id && old && JSON.stringify(draft) === JSON.stringify(blank) ? { ...blank, ...old, park: old.park || '', place: old.place || '', with_whom: old.with_whom || '', notes: old.notes || '', ends_on: old.ends_on === old.starts_on ? '' : old.ends_on } : draft
  const [err, setErr] = useState(null), [saving, setSaving] = useState(false)
  if (!c.parent) return <><header className="hero span-6"><Crumb to="/lifelist/trips">Trips</Crumb><h1 className="greet">Add an outing</h1></header><Card tint="#E0662F" label="Outings" glyph="calendar" className="span-6"><p>Jason and Laurie add the outings.</p></Card></>
  if (id && !old) return <header className="hero span-6"><Crumb to="/lifelist/trips">Trips</Crumb><h1 className="greet">{outings.loaded ? 'Not one of ours' : '…'}</h1></header>
  const set = (patch) => setDraft({ ...f, ...patch })
  async function save(e) {
    e.preventDefault()
    const r = checkOuting(f)
    if (r.error) { setErr(r.error); return }
    setSaving(true); setErr(null)
    const { data, error } = await saveOuting(r.row, id, c.me)
    if (error) { setSaving(false); setErr(/relation|does not exist|schema cache/i.test(error.message) ? 'The Life List migration hasn’t been run yet (docs/MORNING.md, step 12).' : error.message); return }
    // A park trip that's over marks the park as been to, unless it already is
    const mark = r.row.park && r.row.ends_on <= c.today && !marks.rows.some((m) => m.slug === r.row.park && m.visited_on)
    if (mark) await saveParkMark(r.row.park, { visited_on: r.row.starts_on })
    clearDraft(); outings.reload(); if (mark) marks.reload()
    navigate(`/lifelist/trips/${data.id}`, { replace: true })
  }
  return (
    <>
      <header className="hero span-6"><Crumb to="/lifelist/trips">Trips</Crumb><h1 className="greet">{id ? 'Change it' : 'Add an outing'}</h1></header>
      <Card tint="#E0662F" label="The outing" glyph="calendar" className="span-6">
        <form className="ll-form" onSubmit={save}>
          <label>What kind<select value={f.kind} onChange={(e) => set({ kind: e.target.value })}>{KIND_ORDER.map((k) => <option key={k} value={k}>{KINDS[k].name}{KINDS[k].celebrate ? ' (celebrated)' : ''}</option>)}</select></label>
          <label>Its name<input value={f.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} placeholder="Wrightwood campout · Disneyland with Anna" /></label>
          <div className="two"><label>It starts<input type="date" value={f.starts_on} onChange={(e) => set({ starts_on: e.target.value })} /></label><label>It ends (blank: one day)<input type="date" value={f.ends_on} min={f.starts_on} onChange={(e) => set({ ends_on: e.target.value })} /></label></div>
          <label>Where<input value={f.place} maxLength={200} onChange={(e) => set({ place: e.target.value })} placeholder="A town, a campground, a park" /></label>
          <label>Who came<input value={f.with_whom} maxLength={200} onChange={(e) => set({ with_whom: e.target.value })} placeholder="All of us · Anna’s troop" /></label>
          <label>A national park, if it was one<select value={f.park} onChange={(e) => set({ park: e.target.value })}><option value="">Not a national park</option>{NATIONAL_PARKS.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>
          <label>Notes<textarea rows={4} maxLength={2000} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="What we ate, what we saw, what to remember" /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <div className="form-actions"><button type="submit" className="btn" disabled={saving}>{saving ? 'Saving…' : id ? 'Save' : 'Add it'}</button><button type="button" className="btn ghost" onClick={() => { clearDraft(); goBack('/lifelist/trips') }}>Cancel</button></div>
          <p className="muted small">When a park trip is over, the park is checked off the national parks list for you.</p>
        </form>
      </Card>
    </>
  )
}
