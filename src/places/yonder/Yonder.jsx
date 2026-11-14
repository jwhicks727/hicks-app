import { useEffect, useMemo, useState } from 'react'
import SunCalc from 'suncalc'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { Toast } from '../../ui/Toast.jsx'
import { navigate } from '../../lib/router.js'
import { useSession } from '../../lib/auth.js'
import { useFamily, useEvents, useTripEvents } from '../../lib/useCalendar.js'
import { dedupeEvents } from '../../lib/cal/tidy.js'
import { useNow } from '../../lib/useNow.js'
import { useHere } from '../../lib/useHere.js'
import { useAround, useTravelSettings } from '../../lib/useAround.js'
import { useOutings, useSightings } from '../../lib/useLife.js'
import { useCookbook } from '../../lib/useKitchen.js'
import { useHereForecast } from '../../lib/useWeather.js'
import { usePostcards, useHikes, useSomeday, unheart, heart, useTripRecipes, usePacking, addPacking, tickPacking, removePacking } from '../../lib/useYonder.js'
import { useDraft } from '../../lib/useDraft.js'
import { todayAt, addDays } from '../../lib/cal/dates.js'
import { HOME_TOWN, SKIES, phaseOf, skyGradient } from '../../lib/sky.js'
import { clockIn, hourIn } from '../../lib/here.js'
import { cellIdOf, mapsSearch, hikeWords } from '../../lib/around.js'
import { currentTrip, plannedTrips, milestoneTrip, waitWords, sleepsWords, visitsWords, packingSuggestions, stampKind, hikeTotals, tripLifers, dayPlan, inOrder, moveStop, coreTonight, showsUrl, shapeShows } from '../../lib/yonder.js'
import { aroundPlace } from '../../parts/AroundCard.jsx'
import { usePlacePainting, SECTION_COLOURS } from '../../parts/AroundBits.jsx'
import { useTripDays } from '../../parts/HereCards.jsx'
import { PostcardForm, PostcardFront, TripQuest } from '../../parts/TravelBits.jsx'
import Stamp from './Stamp.jsx'
import { CountdownList } from './Countdown.jsx'
import PhotoReel from '../../parts/PhotoReel.jsx'
import { BeenTownPage, BeenTownsCard } from './Been.jsx'
import { StartRecap } from './Recap.jsx'
import { useBeen } from '../../lib/useBeen.js'
import { withVisits, visitedBetween, norm as beenNorm, KINDS as BEEN_KINDS } from '../../lib/been.js'
import './yonder.css'

// /yonder: the travel app (its name chosen in Admin: Yonder unless changed).
// /yonder/day: today as a plan. /yonder/trip/<outing id>: a kept trip's scrapbook.
// /yonder/passport: a stamp for every trip kept.

export default function Yonder({ rest = [] }) {
  if (rest[0] === 'day') return <OurDay />
  if (rest[0] === 'trip') return <Scrapbook id={rest[1]} />
  if (rest[0] === 'passport') return <Passport />
  if (rest[0] === 'town') return <BeenTownPage id={rest[1]} />
  return <YonderHome />
}

function useCtx() {
  const session = useSession()
  const family = useFamily(session)
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) || null : null
  const here = useHere()
  const travel = useTravelSettings()
  const outings = useOutings(session)
  const { events } = useEvents(session, addDays(today, -10), addDays(today, 60))
  const planned = useTripEvents(session, today) // every trip still to come, however far off
  return { session, family, me, parent: Boolean(me && me.role === 'parent'), now, today, here, travel, outings, events, planned }
}
const range = (a, b) => { const f = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); return a === b ? f(a) : `${f(a)} to ${f(b)}` }

function YonderHome() {
  const c = useCtx()
  const trip = currentTrip({ events: c.events, outings: c.outings.rows, here: c.here, today: c.today, home: HOME_TOWN })
  const planned = plannedTrips(dedupeEvents(c.planned.events), c.today, HOME_TOWN)
  const next = planned[0] || null, ahead = planned.slice(1)
  const shining = milestoneTrip(planned) // one gleam at a time, on a milestone day
  const kept = (c.outings.rows || []).filter((o) => o.kind !== 'outing').slice().sort((a, b) => (a.starts_on < b.starts_on ? 1 : -1))
  return (
    <>
      <header className="hero span-6"><span className="kicker">Trips and postcards</span><h1 className="greet">{c.travel.appName}</h1></header>
      {trip && <NowCard c={c} trip={trip} />}
      {next && <NextCard c={c} next={next} gleam={shining === next} />}
      {ahead.length > 0 && (
        <Card tint="#2F7D7A" label="Trips ahead" glyph="calendar" tag={`${ahead.length}`} className="span-3 yo-ahead">
          <CountdownList trips={ahead} today={c.today} members={c.family.members} shining={shining} />
          <p className="muted small">Every trip on the calendar with its place, however far off. From two months out it counts down on Home too.</p>
        </Card>
      )}
      {!trip && !next && c.planned.loaded && (
        <Card tint="#2F7D7A" label="The next trip" glyph="calendar" className="span-6">
          <p>Put a trip on the calendar with its place found on the map (camping, a weekend away, a day out), however far off, and it counts down here, with its packing list, its weather, and a guide written two days before. From two months out it counts down on Home too.</p>
          <Link className="btn ghost" to="/calendar">The calendar ›</Link>
        </Card>
      )}
      <Card tint="#C9863F" label="Trips we’ve kept" glyph="star" className="span-3">
        {!kept.length && <p className="muted">Kept trips land here, each with its scrapbook: the hikes, recipes, birds, drawings and postcards from those days. Home asks “Keep this trip?” after one ends.</p>}
        <ul className="yo-trips">{kept.slice(0, 12).map((o) => <li key={o.id}><Link to={`/yonder/trip/${o.id}`}><Stamp kind={stampKind(o)} name={o.title} date={o.starts_on} size={46} /><span><b>{o.title}</b><small>{range(o.starts_on, o.ends_on)}</small></span></Link></li>)}</ul>
      </Card>
      <Card tint="#5A4E8A" label="The passport" glyph="star" tag={kept.length ? `${kept.length} ${kept.length === 1 ? 'stamp' : 'stamps'}` : undefined} className="span-3">
        {kept.length ? <div className="yo-stamp-row">{kept.slice(0, 4).map((o, i) => <Stamp key={o.id} kind={stampKind(o)} name={o.title} date={o.starts_on} size={70} tilt={[-6, 4, -2, 7][i]} />)}</div> : <p className="muted">A stamp for every trip we keep, drawn for its kind of place.</p>}
        <Link className="btn ghost" to="/yonder/passport">Open the passport ›</Link>
      </Card>
      <BeenTownsCard />
      <Card tint="#C9863F" label="A recent trip" glyph="calendar" className="span-3"><p>Went somewhere the app didn’t see? Start its recap to add the places and photos, within the week.</p><StartRecap /></Card>
      <SomedayCard c={c} />
    </>
  )
}

function NowCard({ c, trip }) {
  const away = c.here.tier === 'away' && c.here.point
  const place = away ? aroundPlace(c.here) : null
  const { guide } = useAround(place)
  return (
    <Card tint="#2F7D7A" label={`Now: ${trip.town}`} glyph="star" className="span-6 yo-now">
      <p className="yo-visit">{visitsWords(c.outings.rows, trip.town, c.today, trip.outing_id)}</p>
      <div className="form-actions">
        {away && <Link className="btn" to="/world/around">What’s around here ›</Link>}
        {away && guide && <Link className="btn ghost" to="/yonder/day">Our day ›</Link>}
        {trip.outing_id && <Link className="btn ghost" to={`/yonder/trip/${trip.outing_id}`}>The scrapbook so far ›</Link>}
      </div>
      {away && <PostcardForm here={c.here} me={c.me} today={c.today} />}
      {away && <TripQuest here={c.here} trip={trip} guide={guide} />}
      <JamHistory town={trip.town} region={(c.here.town && c.here.town.region) || String(trip.place || '').split(',')[1]?.trim() || ''} />
    </Card>
  )
}

/** "4 sleeps until Big Bear", drawn over the sky there right now, with the trip's packing list. However far off. */
function NextCard({ c, next, gleam = false }) {
  const t = SunCalc.getTimes(c.now, next.lat, next.lng)
  const key = phaseOf(c.now, t)
  const { days } = useTripDays({ ...next, inDays: next.sleeps }, c.today)
  const kind = stampKind({ title: next.title, place: next.place })
  const wait = waitWords(c.today, next.starts_on)
  const who = next.for_whom ? c.family.members.find((m) => m.id === next.for_whom) : null
  return (
    <>
      <Card tint="#2F7D7A" label="The next trip" glyph="calendar" className="span-3 yo-next">
        <div className={'yo-sky' + (SKIES[key].dark ? ' dark' : '') + (gleam ? ' yo-gleaming' : '')} style={{ background: skyGradient(key) }}>
          <b className="yo-sleeps">{next.sleeps <= 0 ? `Today: ${next.town}` : sleepsWords(next)}</b>
          {wait && <span>{wait} to go</span>}
          <span>{SKIES[key].name.toLowerCase()} there now</span>
          <Stamp kind={kind} name={next.town} date={next.starts_on} size={64} tilt={-6} />
          {gleam && <i className="yo-gleam" aria-hidden="true" />}
        </div>
        <p><b>{next.title}</b> <span className="muted">{range(next.starts_on, next.ends_on)}{who ? ` · ${who.name}’s trip` : ''}</span></p>
        <p className="muted">{visitsWords(c.outings.rows, next.town, c.today)}</p>
        <Link className="btn ghost" to={`/calendar/event/${next.id}`}>The trip on the calendar ›</Link>
      </Card>
      {next.sleeps <= 14 && <Packing c={c} trip={next} days={days || []} />}
    </>
  )
}

/** The trip's packing list: our own items first, suggestions from the forecast and the plan one tap away. */
function Packing({ c, trip, days }) {
  const p = usePacking(c.session, trip.id)
  const [draft, setDraft, clear] = useDraft(`packing.${trip.id}`, { title: '' })
  const [toast, setToast] = useState(null)
  const have = new Set((p.rows || []).map((i) => i.title.toLowerCase()))
  const ideas = packingSuggestions({ days, hikes: true, words: `${trip.title} ${trip.notes || ''}`, forWhom: trip.for_whom || null }).filter((x) => !have.has(x.toLowerCase()))
  const own = (p.rows || []).filter((i) => !i.suggested), suggested = (p.rows || []).filter((i) => i.suggested)
  const done = (p.rows || []).filter((i) => i.done).length
  const add = async (title, suggestedItem = false) => { const t = String(title).trim(); if (!t) return; const { error } = await addPacking(trip.id, t, suggestedItem); if (!error) p.reload() }
  return (
    <Card tint="#8A5A33" label="Packing" glyph="star" tag={p.rows.length ? `${done} of ${p.rows.length}` : undefined} className="span-3 yo-pack">
      <ul className="yo-pack-list">
        {[...own, ...suggested].map((i) => (
          <li key={i.id} className={i.done ? 'done' : ''}>
            <label><input type="checkbox" checked={i.done} onChange={async () => { await tickPacking(i.id, !i.done); p.reload() }} /><span>{i.title}</span></label>
            <button type="button" className="icon-btn" aria-label={`Take ${i.title} off`} onClick={async () => { await removePacking(i.id); p.reload(); setToast({ text: `Took “${i.title}” off.`, undo: async () => { await addPacking(trip.id, i.title, i.suggested); p.reload(); setToast(null) } }) }}>✕</button>
          </li>
        ))}
      </ul>
      <form className="yo-pack-add" onSubmit={async (e) => { e.preventDefault(); await add(draft.title); clear() }}>
        <input value={draft.title} onChange={(e) => setDraft({ title: e.target.value })} placeholder="Add something to pack" aria-label="Add something to pack" maxLength={120} />
        <button type="submit" className="btn ghost" disabled={!draft.title.trim()}>Add</button>
      </form>
      {ideas.length > 0 && <><p className="muted small">From the forecast and the trip:</p><ul className="bp-chips">{ideas.map((x) => <li key={x}><button type="button" onClick={() => add(x, true)}>+ {x}</button></li>)}</ul></>}
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </Card>
  )
}

/** Places hearted for someday, by town: the next time we're near, they come first in the guide. */
function SomedayCard({ c }) {
  const s = useSomeday(c.session)
  const [toast, setToast] = useState(null)
  const byTown = useMemo(() => { const m = new Map(); for (const r of s.rows) m.set(r.town || 'Somewhere', [...(m.get(r.town || 'Somewhere') || []), r]); return [...m.entries()] }, [s.rows])
  return (
    <Card tint="#C14D83" label="Someday" glyph="star" tag={s.rows.length ? `${s.rows.length} hearted` : undefined} className="span-6">
      {!s.rows.length && <p className="muted">A heart on anything in a guide saves it here for next time we’re near.</p>}
      {byTown.map(([town, list]) => (
        <section key={town} className="yo-someday">
          <h3>{town}</h3>
          <ul className="yo-hearts">{list.map((r) => (
            <li key={r.id}>
              <a href={mapsSearch(r.name, r.town)} target="_blank" rel="noopener noreferrer"><b>{r.name}</b>{r.why && <small>{r.why}</small>}</a>
              {(c.parent || (c.me && r.added_by === c.me.id)) && <button type="button" className="icon-btn" aria-label={`Take ${r.name} off Someday`} onClick={async () => { await unheart(r.id); s.reload(); setToast({ text: `Took ${r.name} off Someday.`, undo: async () => { const { id: _i, created_at: _c, added_by: _a, ...row } = r; await heart(row); s.reload(); setToast(null) } }) }}>✕</button>}
            </li>
          ))}</ul>
        </section>
      ))}
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </Card>
  )
}

/** Shows taped in the town (the Live Music Archive), a tap from playing. Asked by the phone; unverified until it answers. */
function JamHistory({ town, region }) {
  const url = showsUrl(town, region)
  const [shows, setShows] = useState(null)
  useEffect(() => {
    let live = true
    if (!url) { setShows(null); return undefined }
    const key = 'teamhicks.jams.' + url
    try { const k = JSON.parse(sessionStorage.getItem(key)); if (k) { setShows(k); return undefined } } catch { /* nothing kept */ }
    fetch(url).then((r) => (r.ok ? r.json() : null)).then((j) => { const s = shapeShows(j); if (live) setShows(s); try { sessionStorage.setItem(key, JSON.stringify(s)) } catch { /* fine */ } }).catch(() => { if (live) setShows([]) })
    return () => { live = false }
  }, [url])
  if (!shows || !shows.length) return null
  return (
    <section className="yo-jams" aria-label="This place in jam history">
      <h3>This place in jam history</h3>
      <ul className="ar-list">{shows.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer"><b>{s.creator || s.title}</b><small>{[s.year, s.title !== s.creator ? s.title : null].filter(Boolean).join(' · ')}</small></a></li>)}</ul>
      <p className="muted small">Shows taped in {town}, from the Internet Archive’s Live Music Archive.</p>
    </section>
  )
}

// ---- Our day ----------------------------------------------------------------------
function OurDay() {
  const c = useCtx()
  const out = c.here.point && (c.here.tier === 'away' || c.here.tier === 'near')
  const place = out ? aroundPlace(c.here) : null
  const { map, guide } = useAround(place)
  const { forecast: f, tz } = useHereForecast(out ? c.here.point : null)
  const zone = tz || HOME_TOWN.tz
  const key = `teamhicks.day.${c.today}.${place ? place.cell : ''}`
  const [order, setOrder] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } })
  if (!out) return <><header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><h1 className="greet">Our day</h1></header><Card tint="#2F7D7A" label="Our day" glyph="sunmoon" className="span-6"><p>Away from home, today is stitched together here from the guide, the weather and the sun.</p></Card></>
  const p = c.here.point
  const t = SunCalc.getTimes(c.now, p.lat, p.lng), t2 = SunCalc.getTimes(new Date(c.now.getTime() + 864e5), p.lat, p.lng)
  const rainy = Boolean(f && ['rain', 'drizzle', 'thunder', 'snow'].includes(f.now.pic))
  const weekday = new Date(c.now.toLocaleString('en-US', { timeZone: zone })).getDay()
  const stops = inOrder(dayPlan({ guide, map, now: c.now, sunset: t.sunset, golden: t.goldenHour, rainy, weekday, core: coreTonight(p.lat, p.lng, t.night, t2.nightEnd), moon: SunCalc.getMoonIllumination(c.now).fraction }), order)
  const move = (k, by) => { const next = moveStop(stops.map((s) => s.key), k, by); setOrder(next); try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* fine */ } }
  const hour = hourIn(c.now, zone)
  return (
    <>
      <header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><span className="kicker">{place.town}</span><h1 className="greet">Our day</h1></header>
      <Card tint="#2F7D7A" label="Today, as a plan" glyph="sunmoon" className="span-6">
        {!guide && <p>The guide to {place.town} isn’t written yet. <Link to="/world/around">What’s around here</Link> writes it by itself; the day appears here when it’s done.</p>}
        {rainy && <p className="muted small">Rain here now, so the hike waits and the afternoon is indoors.</p>}
        <ol className="yo-day">{stops.map((s, i) => (
          <li key={s.key} className={s.time && s.time.getTime() < c.now.getTime() - 3600e3 && hour > 5 ? 'past' : ''} style={{ '--c': SECTION_COLOURS[s.item.section] || '#2F7D7A' }}>
            <span className="yo-time fig">{s.time ? `about ${clockIn(s.time, zone)}` : 'any time'}</span>
            <button type="button" className="yo-stop" onClick={() => navigate('/world/around')}><small>{s.label}</small><b>{s.item.name}</b>{s.item.hike ? <small>{hikeWords(s.item.hike)}</small> : s.item.why ? <small>{s.item.why}</small> : null}</button>
            <span className="yo-move">
              <button type="button" className="icon-btn" disabled={i === 0} aria-label={`Move ${s.label} earlier`} onClick={() => move(s.key, -1)}>↑</button>
              <button type="button" className="icon-btn" disabled={i === stops.length - 1} aria-label={`Move ${s.label} later`} onClick={() => move(s.key, 1)}>↓</button>
            </span>
          </li>
        ))}</ol>
        <p className="muted small">Worked out on this phone from the guide, the weather and the sun here; times are suggestions. The Milky Way appears only in its season, on darker nights.</p>
      </Card>
    </>
  )
}

// ---- A kept trip's scrapbook ----------------------------------------------------------
function Scrapbook({ id }) {
  const c = useCtx()
  const o = (c.outings.rows || []).find((x) => x.id === id)
  const hikes = useHikes(c.session), recipes = useTripRecipes(c.session), book = useCookbook(c.session), someday = useSomeday(c.session)
  const postcards = usePostcards(c.session, o ? o.starts_on : c.today)
  const birds = useSightings(c.session, Boolean(c.parent && o))
  const ev = o && o.event_id ? c.events.find((e) => e.id === o.event_id) : null
  const town = o ? String(o.place || o.title).split(',')[0].trim() : ''
  const painting = usePlacePainting(town, null)
  const { guide } = useAround(ev && ev.lat != null ? { cell: cellIdOf(ev), town } : null)
  const [lifersOpen, setLifersOpen] = useState(false)
  const been = useBeen(c.session)
  if (!c.outings.loaded) return <><header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><h1 className="greet">The scrapbook</h1></header><p className="muted span-6">Opening it…</p></>
  if (!o) return <><header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><h1 className="greet">The scrapbook</h1></header><Card tint="#C9863F" label="Not found" className="span-6"><p>No kept trip at this address.</p></Card></>
  const within = (d) => d >= o.starts_on && d <= o.ends_on
  const h = (hikes.rows || []).filter((x) => within(x.on_date))
  const totals = hikeTotals(h)
  const recs = (recipes.rows || []).filter((r) => r.outing_id === o.id).map((r) => ({ ...r, recipe: (book.list || book.recipes || []).find((x) => x.id === r.recipe_id) })).filter((r) => r.recipe)
  const cards = (postcards.rows || []).filter((p) => within(p.on_date))
  const daysBirds = (birds.rows || []).filter((b) => within(b.observed_on))
  const lifers = c.parent ? tripLifers(birds.rows, o.starts_on, o.ends_on) : []
  const hearts = (someday.rows || []).filter((r) => r.town && town && r.town.toLowerCase().includes(town.toLowerCase()))
  const dishes = guide && (guide.sections || []).find((s) => s.key === 'local-food')
  const nameOf = (mid) => (c.family.members.find((m) => m.id === mid) || {}).name || 'One of us'
  // Where we went: the places on our list for this town with a visit during the trip
  const beenTowns = been.towns.filter((x) => town && beenNorm(x.town) === beenNorm(town))
  const went = visitedBetween(withVisits(been.places.filter((p) => beenTowns.some((x) => x.id === p.town_id)), been.visits), been.visits, o.starts_on, o.ends_on)
  const bring = (dish) => {
    try {
      sessionStorage.setItem('teamhicks.kitchen.ask', `Write a recipe for ${dish.name} (from our trip to ${town}, ${range(o.starts_on, o.ends_on)}) in Jason’s format, with Laurie’s plate, so we can cook it at home.`)
      sessionStorage.setItem('teamhicks.trip-tag', JSON.stringify({ outing_id: o.id, how: 'brought-home', title: o.title }))
    } catch { /* fine */ }
    navigate('/kitchen')
  }
  return (
    <>
      <header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><span className="kicker">{range(o.starts_on, o.ends_on)}</span><h1 className="greet">{o.title}</h1></header>
      <Card tint="#C9863F" label="The trip" glyph="star" className="span-6 yo-scrap">
        <div className="yo-scrap-head">
          <Stamp kind={stampKind(o)} name={town || o.title} date={o.starts_on} size={96} tilt={-5} />
          <div>
            {o.place && <p><b>{o.place}</b></p>}
            <p className="yo-totals">{[totals.count ? `${totals.count} ${totals.count === 1 ? 'hike' : 'hikes'}, ${totals.miles} miles, ${totals.climb.toLocaleString('en-US')} ft climbed` : null, recs.length ? `${recs.length} ${recs.length === 1 ? 'recipe' : 'recipes'}` : null, cards.length ? `${cards.length} ${cards.length === 1 ? 'postcard' : 'postcards'}` : null].filter(Boolean).join(' · ') || 'The scrapbook fills as we tick hikes, tag recipes and send postcards.'}</p>
            {o.notes && <p>{o.notes}</p>}
          </div>
        </div>
        {painting && <p className="muted small">Laurie painted {town}: <Link to="/lifelist/paintings">{painting.title}</Link>.</p>}
      </Card>
      <Card tint="#2F7D7A" label="The photo reel" glyph="star" className="span-6"><PhotoReel town={town || o.title} region={String(o.place || '').split(',')[1] ? String(o.place).split(',')[1].trim() : null} from={o.starts_on} last={o.ends_on} /></Card>
      {cards.length > 0 && <Card tint="#B5658F" label="Postcards" glyph="star" className="span-6"><div className="yo-cards">{cards.map((p) => <PostcardFront key={p.id} card={p} from={nameOf(p.member_id)} />)}</div></Card>}
      {went.length > 0 && (
        <Card tint="#C9863F" label="Where we went" glyph="star" className="span-3">
          <ul className="ar-list">{went.map((p) => <li key={p.id}><span className="yo-li"><b>{p.name}</b><small>{[BEEN_KINDS[p.kind], p.rating === 'loved' ? 'loved it' : p.rating === 'not-again' ? 'not again' : null, p.note ? `“${p.note}”` : null].filter(Boolean).join(' · ')}</small></span></li>)}</ul>
          {beenTowns[0] && <Link className="btn ghost" to={`/yonder/town/${beenTowns[0].id}`}>Our {town} list ›</Link>}
        </Card>
      )}
      {h.length > 0 && <Card tint="#4E6C3D" label="The hikes" glyph="sunmoon" className="span-3"><ul className="ar-list">{h.map((x) => <li key={x.id}><span className="yo-li"><b>{x.name}</b><small className="fig">{[x.miles ? `${x.miles} mi` : null, x.climb_ft ? `${x.climb_ft.toLocaleString('en-US')} ft up` : null, nameOf(x.member_id)].filter(Boolean).join(' · ')}</small></span></li>)}</ul></Card>}
      <Card tint="#D4553A" label="Recipes from the trip" glyph="pot" className="span-3">
        {!recs.length && <p className="muted">A recipe written while we’re away is tagged to the trip; any recipe’s page can add it to one.</p>}
        <ul className="ar-list">{recs.map((r) => <li key={r.recipe_id + r.how}><Link to={`/kitchen/recipe/${r.recipe.slug}`}><b>{r.recipe.title}</b><small>{{ found: 'Found there', cooked: 'Cooked there', 'brought-home': 'Brought home' }[r.how]}</small></Link></li>)}</ul>
        {c.parent && dishes && dishes.items.length > 0 && (
          <div className="yo-bring"><p className="muted small">Bring it home: Claude writes the dish as a recipe in the Kitchen (a parent’s ask, with Laurie’s plate; her rules are sent, as for any recipe).</p>
            <ul className="bp-chips">{dishes.items.slice(0, 3).map((d) => <li key={d.name}><button type="button" onClick={() => bring(d)}>Cook {d.name} at home</button></li>)}</ul>
          </div>
        )}
      </Card>
      {c.parent && daysBirds.length > 0 && (
        <Card tint="#2E7F86" label="Laurie’s birds" glyph="bird" className={'span-3' + (lifers.length ? ' tr-park tr-gleaming' : '')}>
          {lifers.length > 0 && <i className="tr-gleam" aria-hidden="true" />}
          <p>{new Set(daysBirds.map((b) => b.sci_name || b.species)).size} kinds of bird on those days.</p>
          {lifers.length > 0 && <><p><b>{lifers.length === 1 ? 'A new bird for her life list' : `${lifers.length} new birds for her life list`}:</b> {lifers.slice(0, lifersOpen ? 99 : 4).map((b) => b.species).join(', ')}{lifers.length > 4 && !lifersOpen && <> <button type="button" className="yo-linklike" onClick={() => setLifersOpen(true)}>and {lifers.length - 4} more</button></>}</p></>}
          <p className="muted small">From her own eBird file; only you two see her birds.</p>
        </Card>
      )}
      {hearts.length > 0 && <Card tint="#C14D83" label="Hearted there" glyph="star" className="span-3"><ul className="ar-list">{hearts.map((r) => <li key={r.id}><a href={mapsSearch(r.name, r.town)} target="_blank" rel="noopener noreferrer"><b>{r.name}</b>{r.why && <small>{r.why}</small>}</a></li>)}</ul></Card>}
      {guide && <Card tint="#B5658F" label="The guide we had" glyph="star" className="span-3"><p>{guide.intro}</p><Link className="btn ghost" to={`/world/around/${guide.id}`}>Open it ›</Link></Card>}
      <Card tint="#C14D83" label="Anna’s drawings" glyph="star" className="span-3"><p className="muted">Anna’s drawings from those days are in her gallery, by the day she drew them.</p><Link className="btn ghost" to="/drawings">Anna’s Art ›</Link></Card>
    </>
  )
}

// ---- The passport ------------------------------------------------------------------------
function Passport() {
  const c = useCtx()
  const kept = (c.outings.rows || []).slice().sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1))
  const parks = kept.filter((o) => o.park).length
  return (
    <>
      <header className="hero span-6"><Crumb to="/yonder">Yonder</Crumb><span className="kicker">{kept.length} {kept.length === 1 ? 'stamp' : 'stamps'}{parks ? ` · ${parks} national ${parks === 1 ? 'park' : 'parks'}` : ''}</span><h1 className="greet">The passport</h1></header>
      <Card tint="#5A4E8A" label="Our stamps" glyph="star" className="span-6 yo-passport">
        {!kept.length && <p className="muted">Each trip we keep stamps a page here: peaks for the mountains, waves for the coast, a cactus for the desert, a castle for Disneyland, a tree in a circle for a national park.</p>}
        <div className="yo-pages">{kept.map((o, i) => <Link key={o.id} to={`/yonder/trip/${o.id}`} className="yo-page" aria-label={`${o.title}: its scrapbook`}><Stamp kind={stampKind(o)} name={String(o.place || o.title).split(',')[0]} date={o.starts_on} size={o.park ? 124 : 108} tilt={((i * 37) % 15) - 7} /></Link>)}</div>
        <p className="muted small">A stamp comes only from a trip we kept, never from where a phone has been.</p>
      </Card>
    </>
  )
}
