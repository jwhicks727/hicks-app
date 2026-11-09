import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Crumb } from '../../shell/Link.jsx'
import { Card } from '../../ui/Card.jsx'
import { Toast } from '../../ui/Toast.jsx'
import { supabase } from '../../lib/supabase.js'
import { useSession } from '../../lib/auth.js'
import { useFamily, useEvents } from '../../lib/useCalendar.js'
import { useWeather } from '../../lib/useWeather.js'
import { askClaude } from '../../lib/claude.js'
import { todayAtHome } from '../../lib/useSources.js'
import { addDays } from '../../lib/cal/dates.js'
import { loadInbox } from '../../lib/inboxStore.js'
import { PAINTINGS, toRow, storedPaths } from '../../lib/paintings.js'
import { tally, paintedWords } from '../../lib/paintingBatch.js'
import { FAMILIES } from '../../lib/artColour.js'
import { SEASONS } from '../../lib/seasons.js'
import { FACETS, SORTS, facetsOf, applyFilters, filterCount, sortPaintings, appFeature, claudeFeature, catalogOf, seasonsOn, weatherLine, comingFor } from '../../lib/gallery.js'
import { usePaintings } from '../../parts/PaintingsProvider.jsx'
import { Framed } from '../../parts/PaintingFrame.jsx'
import '../../parts/paintings.css'

// /lifelist/paintings: Laurie's gallery, framed and hung. At the top, for Jason or Laurie, adding
// her paintings (or the photos waiting to be checked); then the featured wall, a few of her
// paintings that hang together for a few days, chosen by Claude from their facts (the weather at
// home, a concert coming, the season) or, until it can, by the app; then finding her paintings by
// colour, mood, what they show, year, season, medium or shape, and sorting them, a rainbow
// included. Filters and sorts stay out of the address (CLAUDE.md) and are kept for this visit, so
// a painting's page and Back find them as they were; its next and previous follow the order shown.
// Behind sign-in: the paintings live in the private `paintings` bucket.
const TINT = '#C0824F'
const VIEW = 'teamhicks.gallery.view'
export const ORDER = 'teamhicks.gallery.order'
const BLANK = { sort: 'added', seed: 1, open: false, f: {} }
const readView = () => { try { return { ...BLANK, ...(JSON.parse(sessionStorage.getItem(VIEW)) || {}) } } catch { return BLANK } }

export default function Gallery() {
  const session = useSession()
  const family = useFamily(session)
  const { list, stored, loaded, reload } = usePaintings()
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  const [view, setViewState] = useState(readView)
  const setView = (v) => { setViewState(v); try { sessionStorage.setItem(VIEW, JSON.stringify(v)) } catch { /* kept for this screen only */ } }
  const shown = useMemo(() => sortPaintings(applyFilters(list, view.f), view.sort, view.seed), [list, view.f, view.sort, view.seed])
  const order = shown.map((p) => p.slug).join('|')
  useEffect(() => { try { sessionStorage.setItem(ORDER, JSON.stringify(order ? order.split('|') : [])) } catch { /* next and previous go by the gallery's own order */ } }, [order])
  const n = filterCount(view.f)
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/lifelist">Life List</Crumb>
        <span className="kicker">Painted by Laurie</span>
        <h1 className="greet">Laurie’s Gallery</h1>
      </header>
      {parent && supabase && <AddPaintingsLink />}
      {loaded && !list.length && (
        <Card tint={TINT} label={supabase ? 'Not moved in yet' : 'Not connected'} glyph="star" className="span-6">
          <p>{supabase
            ? 'Laurie’s paintings are kept in the family’s private storage, and none have been moved in yet. A parent does that once, from the development copy on a computer (npm run dev): this page then has a “Move them now” button (docs/MORNING.md, step 7).'
            : 'Laurie’s paintings are only for us, kept behind sign-in, and the database isn’t connected on this copy of the app.'}</p>
        </Card>
      )}
      {list.length >= 4 && <Featured list={list} parent={parent} />}
      {list.length > 1 && <Finder list={list} view={view} setView={setView} count={shown.length} />}
      <section className="gallery-wall span-6" aria-label="Laurie’s paintings">
        {shown.map((p) => (
          <Link key={p.slug} className="gallery-piece" to={'/lifelist/paintings/' + p.slug}>
            <Framed shape={p.shape}>{p.small ? <img src={p.small} alt={`${p.title}, a painting by Laurie`} width={p.w} height={p.h} loading="lazy" /> : <span className="gallery-blank" />}</Framed>
            <b>{p.title}</b>
            <small>{[paintedWords(p.year, p.month), p.medium].filter(Boolean).join(' · ') || (p.named ? 'By Laurie' : 'A working title, until Laurie names it')}</small>
          </Link>
        ))}
      </section>
      {list.length > 0 && !shown.length && (
        <Card tint={TINT} label="None of them" glyph="star" className="span-6">
          <p>None of her paintings match all of that.</p>
          <button type="button" className="btn ghost" onClick={() => setView({ ...view, f: {} })}>Show them all</button>
        </Card>
      )}
      {list.length > 0 && <p className="gallery-note span-6">{n ? `${shown.length} of her ${list.length} paintings.` : list.length === 1 ? 'The first of her paintings here.' : `${list.length} of her paintings so far.`} More as each one is photographed.</p>}
      {parent && stored && <p className="gallery-note span-6"><Link to="/lifelist/paintings/look-again">Look over her gallery again ›</Link> Months by her signature, the shapes of her canvases, her colours, and what Claude sees in each, for the paintings added before they were kept.</p>}
      {parent && import.meta.env.DEV && <MoveIn have={stored ? list.map((x) => x.slug) : []} onDone={reload} />}
      {parent && supabase && list.length > 8 && <div className="span-6"><Link to="/lifelist/paintings/add" className="btn ghost">Add her paintings</Link></div>}
    </>
  )
}

// ---- The featured wall ------------------------------------------------------------------
const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })
const untilWords = (d, today) => (d === today ? 'today' : d === addDays(today, 1) ? 'tomorrow' : dayName.format(new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)))))
const ASKED = 'teamhicks.gallery.asked'

/**
 * The wall up now: Claude's, when one is up (asked for by itself, at most once a day on a device, when none is), else the
 * app's own from her paintings' facts. Claude is sent her paintings' facts (never a picture), the weather at home, the
 * season and the coming week's concerts; the card says so.
 */
function useFeature(list) {
  const session = useSession()
  const today = todayAtHome()
  const { forecast } = useWeather()
  const { events } = useEvents(session, today, addDays(today, 7))
  const [rows, setRows] = useState(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false), [note, setNote] = useState(null)
  const ctx = useRef({})
  ctx.current = { today, weather: forecast ? weatherLine(forecast.now, forecast.today) : '', coming: comingFor(events, today), list }
  useEffect(() => {
    let live = true
    if (!supabase || !session) return undefined
    supabase.from('gallery_features').select('*').order('created_at', { ascending: false }).limit(12)
      .then(({ data, error }) => { if (!live) return; if (error) { setMissing(true); setRows([]) } else setRows(data || []) })
    return () => { live = false }
  }, [session])
  const ask = useCallback(async (again = false) => {
    const c = ctx.current
    setBusy(true); setNote(null)
    const res = await askClaude('feature-paintings', {
      catalog: catalogOf(c.list), again,
      context: { today: c.today, seasons: seasonsOn(c.today).map((k) => SEASONS[k].label), weather: c.weather, coming: c.coming },
    })
    setBusy(false)
    if (res && res.feature) setRows((r) => [res.feature, ...(r || []).filter((x) => x.id !== res.feature.id)])
    if (res && res.error) setNote(/unknown task/i.test(res.error) ? 'Claude’s walls start once the claude function is deployed again; until then the app hangs its own.' : res.error)
  }, [])
  const claude = rows ? claudeFeature(rows, list, today) : null
  // None of Claude's up: ask for one, once a day on this device, a moment after the weather has had time to arrive
  useEffect(() => {
    if (!rows || missing || claude || list.length < 6) return undefined
    try { if (localStorage.getItem(ASKED) === today) return undefined } catch { return undefined }
    const t = setTimeout(() => { try { localStorage.setItem(ASKED, today) } catch { /* asked anyway */ } ask(false) }, 2500)
    return () => clearTimeout(t)
  }, [rows, missing, Boolean(claude), list.length > 5]) // eslint-disable-line react-hooks/exhaustive-deps -- once, when what's kept is known
  const takeDown = async (id) => {
    const { error } = await supabase.from('gallery_features').delete().eq('id', id)
    if (error) { setNote(error.message); return }
    setRows((r) => (r || []).filter((x) => x.id !== id))
  }
  return { feature: claude || appFeature(list, today), today, busy, note, missing, again: () => ask(true), takeDown }
}

function Featured({ list, parent }) {
  const w = useFeature(list)
  const [down, setDown] = useState(null)
  const f = w.feature
  if (!f) return null
  const ps = f.slugs.map((s) => list.find((p) => p.slug === s)).filter(Boolean)
  if (ps.length < 3) return null
  return (
    <Card tint={TINT} label="Featuring" glyph="star" className="span-6 gf" aria-label={`Featuring: ${f.title}`}>
      <h2 className="gf-title">{f.title}</h2>
      {f.line && <p className="gf-line">{f.line}</p>}
      <div className="gf-row" role="list">
        {ps.map((p) => (
          <Link key={p.slug} role="listitem" className="gf-piece" to={'/lifelist/paintings/' + p.slug}>
            <Framed shape={p.shape}>{p.small ? <img src={p.small} alt={`${p.title}, a painting by Laurie`} width={p.w} height={p.h} loading="lazy" /> : <span className="gallery-blank" />}</Framed>
            <b>{p.title}</b>
          </Link>
        ))}
      </div>
      <p className="muted small gf-by">
        {f.by === 'claude'
          ? <>Chosen by Claude{f.why ? `: ${f.why.replace(/\.$/, '')}` : ''}. Up until {untilWords(f.until, w.today)}.</>
          : <>Hung by the app from her paintings’ own facts, until {untilWords(f.until, w.today)}.{w.busy ? ' Claude is choosing one…' : ''}</>}
      </p>
      {w.note && <p className="muted small" role="status">{w.note}</p>}
      {parent && !w.missing && (
        <div className="form-actions">
          <button type="button" className="btn ghost" disabled={w.busy} onClick={w.again}>{w.busy ? 'Choosing…' : 'Another wall'}</button>
          {f.by === 'claude' && <button type="button" className="btn ghost" onClick={() => setDown(f)}>Take this one down</button>}
        </div>
      )}
      <p className="muted small">Claude is sent her paintings’ titles, years, mediums, seasons, colours and the words kept about each (never the pictures), today’s weather at home, the season and the coming week’s concerts on the calendar.</p>
      {down && <Toast action="Undo" onAction={() => setDown(null)} onClose={() => { w.takeDown(down.id); setDown(null) }}>Taking down “{down.title}”.</Toast>}
    </Card>
  )
}

// ---- Finding her paintings ---------------------------------------------------------------
function Finder({ list, view, setView, count }) {
  const facets = useMemo(() => facetsOf(list), [list])
  const f = view.f || {}
  const set = (k, v) => setView({ ...view, f: { ...f, [k]: f[k] === v ? null : v } })
  const n = filterCount(f)
  const chosen = Object.keys(FACETS).filter((k) => f[k])
  return (
    <section className="gfind span-6" aria-label="Find her paintings">
      <div className="gfind-bar">
        <input className="gfind-q" type="search" aria-label="Find a painting" value={f.q || ''} placeholder="Find one: a cat, the sea, 2019…" onChange={(e) => setView({ ...view, f: { ...f, q: e.target.value } })} />
        <label className="gfind-sort"><span>Sort</span>
          <select value={view.sort} onChange={(e) => setView({ ...view, sort: e.target.value, seed: e.target.value === 'shuffle' ? Math.floor(Math.random() * 1e9) : view.seed })}>
            {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        {view.sort === 'shuffle' && <button type="button" className="btn ghost" onClick={() => setView({ ...view, seed: Math.floor(Math.random() * 1e9) })}>Shuffle again</button>}
        {Object.keys(facets).length > 0 && <button type="button" className="btn ghost" aria-expanded={view.open} onClick={() => setView({ ...view, open: !view.open })}>{view.open ? 'Fewer filters' : 'Filters'}{n ? ` · ${n}` : ''}</button>}
      </div>
      {facets.colour && (
        <div className="gfind-swatches" role="group" aria-label="By colour">
          {facets.colour.map((c) => (
            <button key={c.key} type="button" className="gfind-sw" aria-pressed={f.colour === c.key} onClick={() => set('colour', c.key)} title={`${c.label}: ${c.n}`} aria-label={`${c.label}, ${c.n}`}>
              <i style={{ background: FAMILIES[c.key].chip }} />
            </button>
          ))}
        </div>
      )}
      {view.open && (
        <div className="gfind-panel">
          {Object.entries(facets).filter(([k]) => k !== 'colour').map(([k, choices]) => (
            <fieldset key={k} className="gfind-set">
              <legend>{FACETS[k].label}</legend>
              <div className="gfind-chips">
                {choices.map((c) => <button key={c.key} type="button" className="gfind-chip" aria-pressed={f[k] === c.key} onClick={() => set(k, c.key)}>{c.label} <small>{c.n}</small></button>)}
              </div>
            </fieldset>
          ))}
          {!facets.mood && !facets.subject && <p className="muted small">Moods and what each shows come once Claude has looked at her paintings: as they’re added, or for the ones already here, from “Look over her gallery again” below.</p>}
        </div>
      )}
      {n > 0 && (
        <div className="gfind-on">
          {chosen.map((k) => <button key={k} type="button" className="gfind-chip on" onClick={() => set(k, f[k])} aria-label={`Take off ${FACETS[k].name(f[k])}`}>{FACETS[k].name(f[k])} <span aria-hidden="true">×</span></button>)}
          {f.q && <button type="button" className="gfind-chip on" onClick={() => setView({ ...view, f: { ...f, q: '' } })} aria-label="Clear the words">“{f.q}” <span aria-hidden="true">×</span></button>}
          <button type="button" className="gfind-clear" onClick={() => setView({ ...view, f: {} })}>Clear</button>
          <span className="gfind-count">{count} of {list.length}</span>
        </div>
      )}
    </section>
  )
}

/** The paintings bundled with the code, moved into the private bucket, files and all. */
function MoveIn({ have, onDone }) {
  const [busy, setBusy] = useState(null)
  // Only the ones not already stored, so details a parent has since added (what a painting shows) are never written over.
  const todo = PAINTINGS.filter((p) => !have.includes(p.slug))
  async function move() {
    for (const p of todo) {
      setBusy(`Moving ${p.title}…`)
      const row = toRow(p), paths = storedPaths(p.slug, row)
      const local = { src: p.src, small: p.small, sprite: p.flyer && p.flyer.sprite, sky: p.flyer && p.flyer.sky, sheet: p.leaves && p.leaves.sheet }
      for (const [k, path] of Object.entries(paths)) {
        const blob = await (await fetch(local[k])).blob()
        const { error } = await supabase.storage.from('paintings').upload(path, blob, { contentType: blob.type, upsert: true })
        if (error) { setBusy(`${p.title}: ${error.message}`); return }
      }
      const { error } = await supabase.from('paintings').upsert(row, { onConflict: 'slug' })
      if (error) { setBusy(`${p.title}: ${error.message}`); return }
    }
    setBusy('Moved. They’re behind sign-in now.'); onDone()
  }
  if (!todo.length) return null
  return (
    <Card tint="#B3263A" label="Into private storage" glyph="candle" className="span-6">
      <p>{todo.map((p) => p.title).join(', ')} came in with the app’s code. Move {todo.length === 1 ? 'it' : 'them'} into the family’s private storage, so a hosted copy of the app shows them only to us, signed in.</p>
      <button type="button" className="btn" disabled={Boolean(busy && busy.endsWith('…'))} onClick={move}>Move them now</button>
      {busy && <p className="muted" role="status">{busy}</p>}
    </Card>
  )
}

/** To the batch screen, at the top: a plain button, or the shine while photos are waiting there to be checked. */
function AddPaintingsLink() {
  // Photos waiting in the family's storage (a batch sent from any device)
  const [waiting, setWaiting] = useState(null)
  useEffect(() => {
    let live = true
    loadInbox().then((items) => { if (live) setWaiting(tally(items)) }, () => {})
    return () => { live = false }
  }, [])
  // Still to check, and any the app closed on mid-save (opening the screen finishes them)
  const n = waiting ? waiting.ready + waiting.failed + waiting.saving : 0
  if (n) return <Link to="/lifelist/paintings/add" className="shine span-6">Photos of her paintings waiting<span className="n">{n}</span></Link>
  return <div className="span-6 gallery-top"><Link to="/lifelist/paintings/add" className="btn">Add her paintings</Link></div>
}
