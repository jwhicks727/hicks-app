import { useState } from 'react'
import SunCalc from 'suncalc'
import { Card } from '../../ui/Card.jsx'
import { Sheet } from '../../ui/Sheet.jsx'
import { Crumb } from '../../shell/Link.jsx'
import { useHere } from '../../lib/useHere.js'
import { useAround, useGuideById } from '../../lib/useAround.js'
import { useHereForecast } from '../../lib/useWeather.js'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { askClaude } from '../../lib/claude.js'
import { useNow } from '../../lib/useNow.js'
import { placeWords, hourIn, clockIn } from '../../lib/here.js'
import { sectionOrder, ordered, awayWords, hikeWords, startBy, alsoOnTheMap, MAP_KIND_WORDS, mapsSearch } from '../../lib/around.js'
import { aroundPlace } from '../../parts/AroundCard.jsx'
import { AroundHero, ItemTile, usePlacePainting, SECTION_COLOURS, SECTION_GLYPHS, WHAT_WAS_SENT } from '../../parts/AroundBits.jsx'
import { useHikes, tickHike, untickHike, useSomeday, heart, unheart } from '../../lib/useYonder.js'
import { longestYet } from '../../lib/yonder.js'
import { todayAt } from '../../lib/cal/dates.js'
import { HOME_TOWN } from '../../lib/sky.js'
import { Toast } from '../../ui/Toast.jsx'
import { Link } from '../../shell/Link.jsx'
import { BeenBadge, BeenButton, useTownList } from '../yonder/Been.jsx'
import { addBeenOrQueue } from '../../lib/useStay.js'
import { matchBeen } from '../../lib/been.js'
import './around.css'

// /world/around: the guide to where the phone is (away, it writes itself; out and
// about, it's written when this page is opened). /world/around/<id>: a guide we
// kept, opened from a trip, wherever we are now.

export default function AroundPage({ id }) {
  return id ? <KeptGuide id={id} /> : <GuideHere />
}

function GuideHere() {
  const here = useHere()
  const out = here.point && (here.tier === 'away' || here.tier === 'near')
  const place = out ? aroundPlace(here) : null
  const { map, guide, building, error } = useAround(place, { auto: true })
  const where = placeWords(here.town) || (place && place.town) || 'here'
  if (!out) {
    return (
      <>
        <header className="hero span-6"><Crumb to="/world">World</Crumb><h1 className="greet">What’s around here?</h1></header>
        <Card tint="#B5658F" label="What’s around here?" glyph="star" className="span-6">
          <p>{here.status === 'off' ? 'Switch on Settings › Notice where I am, and away from home this page is a guide to wherever you are: hikes, coffee roasters, brewpubs, the local food, things for Anna, records and books.' : here.tier === 'home' ? 'You’re on home ground. Away from home, this is a guide to wherever you are, written by itself.' : 'Waiting for the phone to say where it is…'}</p>
        </Card>
      </>
    )
  }
  return <Guide where={where} here={here} place={place} map={map} guide={guide} building={building} error={error} />
}

function KeptGuide({ id }) {
  const { row, loaded } = useGuideById(id)
  const here = useHere()
  if (!loaded) return <><header className="hero span-6"><Crumb to="/world">World</Crumb><h1 className="greet">The guide</h1></header><Card tint="#B5658F" label="The guide" glyph="star" className="span-6"><p className="muted">Opening it…</p></Card></>
  if (!row || row.status !== 'ready') return <><header className="hero span-6"><Crumb to="/world">World</Crumb><h1 className="greet">The guide</h1></header><Card tint="#B5658F" label="The guide" glyph="star" className="span-6"><p className="muted">That guide isn’t here (or is still being written).</p></Card></>
  const guide = { id: row.id, fetched_at: row.fetched_at, ...row.data }
  return <Guide where={row.town || 'there'} here={here} place={{ cell: row.cell, town: row.town }} map={null} guide={guide} building={false} error={null} kept />
}

function Guide({ where, here, place, map, guide, building, error, kept = false }) {
  const now = useNow()
  const session = useSession()
  const family = useFamily(session)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  const point = !kept && here.point ? here.point : null
  const { forecast: f, tz } = useHereForecast(point)
  const painting = usePlacePainting(place && place.town, !kept ? here.place : null)
  const [open, setOpen] = useState(null)
  const [fresh, setFresh] = useState('')
  const hikes = useHikes(session), someday = useSomeday(session)
  // Our list for this town: places we've been are marked, and each place can join it
  const beenTown = place && place.town ? { town: place.town, region: place.region || (here.town && here.town.region) || null, cc: place.cc || null } : null
  const { list: beenList } = useTownList(beenTown)
  const hearts = (someday.rows || []).filter((r) => place && r.cell === place.cell)
  const zone = tz || 'America/Los_Angeles'
  const hour = hourIn(now, zone), weekday = new Date(now.toLocaleString('en-US', { timeZone: zone })).getDay()
  const rainy = Boolean(f && ['rain', 'drizzle', 'thunder', 'snow'].includes(f.now.pic))
  const sections = guide ? ordered(guide.sections, sectionOrder({ hour, rainy, weekday })) : []
  const sunset = point ? SunCalc.getTimes(now, point.lat, point.lng).sunset : null
  const photo = (map && map.hero && map.hero.photo) || (map && (map.sights || []).find((s) => s.photo) || {}).photo || null
  const also = alsoOnTheMap(map && map.map, guide)
  const askFresh = async () => {
    setFresh('Asking for a fresh look…')
    const r = await askClaude('around-here', { cell: place.cell, town: place.town || '', region: place.region || '', cc: place.cc || '', fresh: true })
    setFresh(r && r.error ? r.error : 'A fresh guide is being written. It’ll appear here in a minute or two.')
  }
  return (
    <>
      <header className="hero span-6"><Crumb to="/world">World</Crumb><span className="kicker">What’s around here?</span><h1 className="greet">{where}</h1></header>
      <Card tint="#B5658F" label={kept ? 'A guide we kept' : 'The guide'} glyph="star" className="span-6 ar-card">
        <AroundHero painting={painting} photo={photo} title={where} />
        {guide && guide.intro && <p className="ar-intro">{guide.intro}</p>}
        {!guide && map && map.hero && map.hero.extract && <p className="ar-intro">{map.hero.extract}</p>}
        {building && <p className="ar-working" role="status"><span aria-hidden="true" className="ar-dots" /> Writing your guide to {where}. It takes about a minute, and it’ll be here for the whole family after.</p>}
        {!building && !guide && error && <p className="muted" role="status">{error}</p>}
        {rainy && guide && <p className="muted small">Rain here now, so the indoor things come first.</p>}
      </Card>

      {hearts.length > 0 && (
        <Card tint="#C14D83" label="Your hearts here" glyph="star" className="span-6">
          <ul className="ar-list">{hearts.map((r) => <li key={r.id}><a href={mapsSearch(r.name, r.town)} target="_blank" rel="noopener noreferrer"><b>{r.name}</b>{r.why && <small>{r.why}</small>}</a></li>)}</ul>
          <p className="muted small">Hearted last time; they’re on Someday too (<Link to="/yonder">the travel app</Link>).</p>
        </Card>
      )}
      {parent && guide && !kept && <EatWell place={place} />}
      {sections.map((s) => (
        <Card key={s.key} tint={SECTION_COLOURS[s.key]} label={s.title} glyph={SECTION_GLYPHS[s.key] || 'star'} className="span-6 ar-section">
          <div className="ar-rail">{s.items.map((it) => <ItemTile key={it.name} item={it} section={s.key} badge={matchBeen(it.name, beenList) ? <BeenBadge p={matchBeen(it.name, beenList)} /> : null} onOpen={(item) => setOpen({ item, section: s })} />)}</div>
        </Card>
      ))}

      {map && (map.sights || []).length > 0 && (
        <Card tint="#7A6BB0" label="Near here, from Wikipedia" glyph="star" className="span-3">
          <ul className="ar-list">{map.sights.slice(0, 10).map((s) => <li key={s.title}><a href={s.url} target="_blank" rel="noopener noreferrer"><b>{s.title}</b><small>{s.extract}</small>{s.photo && <small className="ar-credit">Photo: {s.photo.credit}</small>}</a></li>)}</ul>
        </Card>
      )}
      {also.length > 0 && (
        <Card tint="#3F6FCB" label="Also on the map nearby" glyph="calendar" className="span-3">
          <ul className="ar-list">{also.map((p) => <li key={p.id}><a href={mapsSearch(p.name, place.town)} target="_blank" rel="noopener noreferrer"><b>{p.name}</b><small className="fig">{MAP_KIND_WORDS[p.kind]} · {p.km} km from the middle of the area{p.hours ? ` · ${p.hours}` : ''}</small></a></li>)}</ul>
          <p className="muted small">From OpenStreetMap: what its mappers have added nearby. Hours may be out of date.</p>
        </Card>
      )}

      <Card tint="#8A5A33" label="About this guide" glyph="star" className="span-6">
        <p className="ar-note">{WHAT_WAS_SENT}{guide && guide.date ? ` Written ${guide.date}.` : ''} Places from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>; sights and photos from Wikipedia and Wikimedia Commons, each credited; a place’s own picture comes from its own website. Laurie’s painting leads wherever she has painted the place.</p>
        {parent && guide && !kept && <button type="button" className="btn ghost" onClick={askFresh}>A fresh look</button>}
        {fresh && <p className="muted" role="status">{fresh}</p>}
      </Card>

      {open && <ItemSheet item={open.item} section={open.section} point={point} sunset={sunset} now={now} zone={zone} town={place && place.town} place={place} hikes={hikes} someday={someday} beenTown={beenTown} beenList={beenList} onClose={() => setOpen(null)} />}
    </>
  )
}

/**
 * One place from a guide, in a sheet. Also opened from a planned trip's page
 * (src/places/yonder/TripPlan.jsx) with `planning`: no "We did it" or "We went
 * here" before we've gone, `distance` from where we're staying, and the page's
 * own actions as children.
 */
export function ItemSheet({ item, section, point, sunset, now, zone, town, place, hikes, someday, beenTown, beenList, onClose, planning = false, distance = null, children = null }) {
  const away = distance ?? awayWords(item, point)
  const go = section.key === 'hikes' && !planning ? startBy(item.hike, sunset, now) : null
  const [toast, setToast] = useState(null), [gleam, setGleam] = useState(false)
  const today = todayAt(HOME_TOWN.tz, now)
  const ticked = (hikes.rows || []).find((h) => h.name === item.name && h.on_date === today)
  const hearted = (someday.rows || []).find((r) => place && r.cell === place.cell && r.name === item.name)
  const tick = async () => {
    const miles = item.hike && item.hike.miles ? item.hike.miles : null
    const best = longestYet(hikes.rows, miles)
    const { data, error } = await tickHike({ name: item.name.slice(0, 100), miles, climb_ft: item.hike && item.hike.climb ? Math.round(item.hike.climb) : null, on_date: today, town: (item.town || town || '').slice(0, 120) || null })
    if (error) { setToast({ text: 'It couldn’t be ticked just now.', undo: () => setToast(null) }); return }
    hikes.reload(); if (best) setGleam(true)
    if (beenTown && !matchBeen(item.name, beenList)) addBeenOrQueue(beenTown, { name: item.name, kind: 'hike', website: item.website || '' }, today) // a hike done joins the town's list
    setToast({ text: best ? `Ticked off: ${miles} miles, the longest hike any of us has done.` : 'Ticked off, in the trip’s scrapbook.', undo: async () => { await untickHike(data.id); hikes.reload(); setGleam(false); setToast(null) } })
  }
  const toggleHeart = async () => {
    if (hearted) { await unheart(hearted.id); someday.reload(); return }
    const { error } = await heart({ cell: place.cell, town: (place.town || item.town || '').slice(0, 120) || null, section: section.key, name: item.name.slice(0, 100), why: item.why ? item.why.slice(0, 200) : null, website: item.website || null })
    if (!error) someday.reload()
  }
  return (
    <Sheet title={item.name} onClose={onClose} className="ar-sheet">
      {item.photo && (
        <figure className="ar-sheet-pic">
          <img src={item.photo.url} alt={item.name} referrerPolicy="no-referrer" />
          <figcaption>{item.photo.page ? <a href={item.photo.page} target="_blank" rel="noopener noreferrer">{item.photo.credit}</a> : item.photo.credit}</figcaption>
        </figure>
      )}
      {item.why && <p><b>{item.why}</b></p>}
      {item.more && <p>{item.more}</p>}
      <dl className="place-facts">
        {item.hike && hikeWords(item.hike) && <div><dt>The hike</dt><dd>{hikeWords(item.hike)}{item.hike.ends ? `; at the end, ${item.hike.ends}` : ''}</dd></div>}
        {go && <div><dt>Set off by</dt><dd>{clockIn(go, zone)}, to be down before sunset with time to spare</dd></div>}
        {away && <div><dt>How far</dt><dd className="fig">{away}, as the crow flies</dd></div>}
        {item.town && <div><dt>Where</dt><dd>{item.town}</dd></div>}
        {item.hours && <div><dt>Hours</dt><dd>{item.hours} <span className="muted">(from OpenStreetMap; may be out of date)</span></dd></div>}
        {item.family !== 'unknown' && <div><dt>With Anna</dt><dd>{item.family === 'yes' ? 'Family-friendly' : 'Grown-ups only'}</dd></div>}
      </dl>
      {!item.confirmed && <p className="muted small">Not found on the open map, so check before you go.</p>}
      <div className="place-go">
        <a className="btn" href={mapsSearch(item.name, item.town || town)} target="_blank" rel="noopener noreferrer">Directions</a>
        {item.website && <a className="btn ghost" href={item.website} target="_blank" rel="noopener noreferrer">Its website</a>}
        {place && <button type="button" className="btn ghost" aria-pressed={Boolean(hearted)} onClick={toggleHeart}>{hearted ? '♥ On Someday' : '♡ Someday'}</button>}
        {section.key === 'hikes' && !planning && !ticked && <button type="button" className={'btn ar-did' + (gleam ? ' ar-gleaming' : '')} onClick={tick}>We did it</button>}
        {section.key === 'hikes' && !planning && ticked && <span className={'ar-done' + (gleam ? ' ar-gleaming' : '')}>{gleam && <i className="ar-gleam" aria-hidden="true" />}Done today ✓</span>}
      </div>
      {children}
      {!planning && <BeenButton item={item} section={section.key} t={beenTown} list={beenList} />}
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
      <p className="muted small">Sources: {item.sources.map((u, i) => <span key={u}>{i ? ' · ' : ''}<a href={u} target="_blank" rel="noopener noreferrer">{(() => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return 'link' } })()}</a></span>)}</p>
    </Sheet>
  )
}

/**
 * For Jason and Laurie: where Laurie can eat well near here. Claude reads menus near
 * the town against her food rules (a parent's ask, as for any recipe); the answer is
 * shown here and never kept in the family's shared guide.
 */
function EatWell({ place }) {
  const [state, setState] = useState({ busy: false, places: null, error: null })
  const ask = async () => {
    setState({ busy: true, places: null, error: null })
    const r = await askClaude('eat-well', { cell: place.cell, town: place.town || '', region: place.region || '', cc: place.cc || '' })
    setState({ busy: false, places: r && r.places ? r.places : null, error: r && r.error ? r.error : (!r || !r.places ? 'Nothing came back just now.' : null) })
  }
  return (
    <Card tint="#D4553A" label="Where Laurie can eat well" glyph="pot" className="span-6">
      {!state.places && <p>Claude looks at menus near {place.town || 'here'} against Laurie’s food rules. It sends her rules, the town and the area to about ten kilometres; the answer is for you two and isn’t kept.</p>}
      {!state.places && <button type="button" className="btn ghost" disabled={state.busy} onClick={ask}>{state.busy ? 'Looking at menus…' : 'Look for us'}</button>}
      {state.error && <p className="muted" role="status">{state.error}</p>}
      {state.places && !state.places.length && <p className="muted">Nothing found that clearly fits; worth asking at the table.</p>}
      {state.places && state.places.length > 0 && <ul className="ar-list">{state.places.map((p) => <li key={p.name}><span className="ar-eat"><b>{p.name}</b><small>{p.why}</small><small>{p.sources.map((u, i) => <span key={u}>{i ? ' · ' : ''}<a href={u} target="_blank" rel="noopener noreferrer">{(() => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return 'link' } })()}</a></span>)}</small></span></li>)}</ul>}
    </Card>
  )
}

