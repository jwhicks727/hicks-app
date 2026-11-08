import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '../shell/Link.jsx'
import { Card } from '../ui/Card.jsx'
import { Toast } from '../ui/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { useSession } from '../lib/auth.js'
import { useEvents } from '../lib/useCalendar.js'
import { useWeather } from '../lib/useWeather.js'
import { askClaude } from '../lib/claude.js'
import { todayAtHome } from '../lib/useSources.js'
import { addDays } from '../lib/cal/dates.js'
import { FAMILIES } from '../lib/artColour.js'
import { SEASONS } from '../lib/seasons.js'
import { FACETS, sortsFor, facetsOf, applyFilters, filterCount, sortPaintings, appFeature, claudeFeature, catalogOf, seasonsOn, weatherLine, comingFor } from '../lib/gallery.js'
import './paintings.css'

// The tools both artists' walls share: Laurie's Gallery (src/places/lifelist/Gallery.jsx) and Anna's Art
// (src/places/Drawings.jsx). The featured wall is a few pieces that hang together for a few days, chosen by
// Claude from their facts (never the pictures) with the weather at home, the season and the coming week's
// concerts, or by the app from their own facts until it can; the finder narrows the wall by colour, mood,
// what it shows and the rest, and sorts it. What each kind of wall says, and which Claude task it asks, is
// in COLLECTIONS. Filters and sorts are kept for the visit (never in the address), and the order shown is
// kept too, so a piece's page steps through the same order.
export const COLLECTIONS = {
  paintings: {
    task: 'feature-paintings', who: 'Laurie', verb: 'painted', her: 'her paintings', tint: '#C0824F', asked: 'teamhicks.gallery.asked',
    view: 'teamhicks.gallery.view', order: 'teamhicks.gallery.order', find: 'Find one: a cat, the sea, 2019…',
    sends: 'Claude is sent her paintings’ titles, years, mediums, seasons, colours and the words kept about each (never the pictures), today’s weather at home, the season and the coming week’s concerts on the calendar.',
  },
  drawings: {
    task: 'feature-drawings', who: 'Anna', verb: 'made', her: 'her pieces', tint: '#D9739B', asked: 'teamhicks.annasart.asked',
    view: 'teamhicks.annasart.view', order: 'teamhicks.annasart.order', find: 'Find one: the cats, a rainbow, 2025…',
    sends: 'Claude is sent her pieces’ titles, the days she made them, their mediums, colours, what they’re about and the words kept about each (never the pictures, and never her own words), today’s weather at home, the season and the coming week’s concerts on the calendar.',
  },
}
const BLANK = { sort: 'added', seed: 1, open: false, f: {} }

/** The wall's filters and sort for this visit, and the pieces in the order shown (kept for the pieces' own pages). */
export function useWallView(list, collection) {
  const c = COLLECTIONS[collection]
  const [view, setViewState] = useState(() => { try { return { ...BLANK, ...(JSON.parse(sessionStorage.getItem(c.view)) || {}) } } catch { return BLANK } })
  const setView = (v) => { setViewState(v); try { sessionStorage.setItem(c.view, JSON.stringify(v)) } catch { /* kept for this screen only */ } }
  const shown = useMemo(() => sortPaintings(applyFilters(list, view.f), view.sort, view.seed), [list, view.f, view.sort, view.seed])
  const order = shown.map((p) => p.slug).join('|')
  useEffect(() => { try { sessionStorage.setItem(c.order, JSON.stringify(order ? order.split('|') : [])) } catch { /* next and previous go by the wall's own order */ } }, [order, c.order])
  return { view, setView, shown, n: filterCount(view.f) }
}

/** The order the wall last showed, while `id` is in it: a piece's page steps through it. Null when there's none. */
export function wallOrder(collection, id) {
  try {
    const o = JSON.parse(sessionStorage.getItem(COLLECTIONS[collection].order) || '[]')
    return Array.isArray(o) && o.length > 1 && o.includes(id) ? o : null
  } catch { return null }
}

// ---- The featured wall ------------------------------------------------------------------
const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' })
const untilWords = (d, today) => (d === today ? 'today' : d === addDays(today, 1) ? 'tomorrow' : dayName.format(new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)))))
const missingColumn = (e) => Boolean(e && (e.code === 'PGRST204' || e.code === '42703' || /column .*does not exist|could not find/i.test(e.message || '')))

/**
 * The wall up now: Claude's, when one is up (asked for by itself, at most once a day on a device, when none is), else the
 * app's own from the pieces' facts.
 */
function useFeature(list, collection) {
  const c = COLLECTIONS[collection]
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
    const q = () => supabase.from('gallery_features').select('*').order('created_at', { ascending: false }).limit(12)
    ;(async () => {
      let { data, error } = await q().eq('collection', collection)
      // Before the step that tells the two walls apart is run, every wall kept is Laurie's
      if (error && missingColumn(error) && collection === 'paintings') ({ data, error } = await q())
      if (!live) return
      if (error) { setMissing(true); setRows([]) } else setRows(data || [])
    })()
    return () => { live = false }
  }, [session, collection])
  const ask = useCallback(async (again = false) => {
    const x = ctx.current
    setBusy(true); setNote(null)
    const res = await askClaude(c.task, {
      catalog: catalogOf(x.list), again,
      context: { today: x.today, seasons: seasonsOn(x.today).map((k) => SEASONS[k].label), weather: x.weather, coming: x.coming },
    })
    setBusy(false)
    if (res && res.feature) setRows((r) => [res.feature, ...(r || []).filter((y) => y.id !== res.feature.id)])
    if (res && res.error) setNote(/unknown task/i.test(res.error) ? 'Claude’s walls start once the claude function is deployed again; until then the app hangs its own.' : res.error)
  }, [c.task])
  const claude = rows ? claudeFeature(rows, list, today) : null
  // None of Claude's up: ask for one, once a day on this device, a moment after the weather has had time to arrive
  useEffect(() => {
    if (!rows || missing || claude || list.length < 6) return undefined
    try { if (localStorage.getItem(c.asked) === today) return undefined } catch { return undefined }
    const t = setTimeout(() => { try { localStorage.setItem(c.asked, today) } catch { /* asked anyway */ } ask(false) }, 2500)
    return () => clearTimeout(t)
  }, [rows, missing, Boolean(claude), list.length > 5]) // eslint-disable-line react-hooks/exhaustive-deps -- once, when what's kept is known
  const takeDown = async (id) => {
    const { error } = await supabase.from('gallery_features').delete().eq('id', id)
    if (error) { setNote(error.message); return }
    setRows((r) => (r || []).filter((x) => x.id !== id))
  }
  return { feature: claude || appFeature(list, today, { who: c.who, verb: c.verb }), today, busy, note, missing, again: () => ask(true), takeDown }
}

/** The featured wall: `Thumb` draws one piece as its wall does (a frame for Laurie's, taped paper for Anna's); `to` is its page. */
export function Featured({ list, parent, collection, Thumb, to }) {
  const c = COLLECTIONS[collection]
  const w = useFeature(list, collection)
  const [down, setDown] = useState(null)
  const f = w.feature
  if (!f) return null
  const ps = f.slugs.map((s) => list.find((p) => p.slug === s)).filter(Boolean)
  if (ps.length < 3) return null
  return (
    <Card tint={c.tint} label="Featuring" glyph="star" className="span-6 gf" aria-label={`Featuring: ${f.title}`}>
      <h2 className="gf-title">{f.title}</h2>
      {f.line && <p className="gf-line">{f.line}</p>}
      <div className="gf-row" role="list">
        {ps.map((p) => (
          <Link key={p.slug} role="listitem" className="gf-piece" to={to(p)}>
            <Thumb p={p} />
            <b>{p.title}</b>
          </Link>
        ))}
      </div>
      <p className="muted small gf-by">
        {f.by === 'claude'
          ? <>Chosen by Claude{f.why ? `: ${f.why.replace(/\.$/, '')}` : ''}. Up until {untilWords(f.until, w.today)}.</>
          : <>Hung by the app from {c.her}’ own facts, until {untilWords(f.until, w.today)}.{w.busy ? ' Claude is choosing one…' : ''}</>}
      </p>
      {w.note && <p className="muted small" role="status">{w.note}</p>}
      {parent && !w.missing && (
        <div className="form-actions">
          <button type="button" className="btn ghost" disabled={w.busy} onClick={w.again}>{w.busy ? 'Choosing…' : 'Another wall'}</button>
          {f.by === 'claude' && <button type="button" className="btn ghost" onClick={() => setDown(f)}>Take this one down</button>}
        </div>
      )}
      <p className="muted small">{c.sends}</p>
      {down && <Toast action="Undo" onAction={() => setDown(null)} onClose={() => { w.takeDown(down.id); setDown(null) }}>Taking down “{down.title}”.</Toast>}
    </Card>
  )
}

// ---- Finding pieces on the wall -------------------------------------------------------------
export function Finder({ list, view, setView, count, collection }) {
  const c = COLLECTIONS[collection]
  const facets = useMemo(() => facetsOf(list), [list])
  const f = view.f || {}
  const set = (k, v) => setView({ ...view, f: { ...f, [k]: f[k] === v ? null : v } })
  const n = filterCount(f)
  const chosen = Object.keys(FACETS).filter((k) => f[k])
  const sorts = sortsFor(c.verb)
  return (
    <section className="gfind span-6" aria-label="Find a piece">
      <div className="gfind-bar">
        <input className="gfind-q" type="search" aria-label="Find a piece" value={f.q || ''} placeholder={c.find} onChange={(e) => setView({ ...view, f: { ...f, q: e.target.value } })} />
        <label className="gfind-sort"><span>Sort</span>
          <select value={view.sort} onChange={(e) => setView({ ...view, sort: e.target.value, seed: e.target.value === 'shuffle' ? Math.floor(Math.random() * 1e9) : view.seed })}>
            {Object.entries(sorts).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        {view.sort === 'shuffle' && <button type="button" className="btn ghost" onClick={() => setView({ ...view, seed: Math.floor(Math.random() * 1e9) })}>Shuffle again</button>}
        {Object.keys(facets).length > 0 && <button type="button" className="btn ghost" aria-expanded={view.open} onClick={() => setView({ ...view, open: !view.open })}>{view.open ? 'Fewer filters' : 'Filters'}{n ? ` · ${n}` : ''}</button>}
      </div>
      {facets.colour && (
        <div className="gfind-swatches" role="group" aria-label="By colour">
          {facets.colour.map((x) => (
            <button key={x.key} type="button" className="gfind-sw" aria-pressed={f.colour === x.key} onClick={() => set('colour', x.key)} title={`${x.label}: ${x.n}`} aria-label={`${x.label}, ${x.n}`}>
              <i style={{ background: FAMILIES[x.key].chip }} />
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
                {choices.map((x) => <button key={x.key} type="button" className="gfind-chip" aria-pressed={f[k] === x.key} onClick={() => set(k, x.key)}>{x.label} <small>{x.n}</small></button>)}
              </div>
            </fieldset>
          ))}
          {!facets.mood && !facets.subject && <p className="muted small">Moods and what each shows come once Claude has looked at {c.her}: as they’re added, or for the ones already here, from “Look over” at the foot of the wall.</p>}
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
