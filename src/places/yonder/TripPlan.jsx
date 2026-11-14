import { useState } from 'react'
import SunCalc from 'suncalc'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { Toast } from '../../ui/Toast.jsx'
import { useSession } from '../../lib/auth.js'
import { useFamily, useEvent } from '../../lib/useCalendar.js'
import { useNow } from '../../lib/useNow.js'
import { useAround, useTravelSettings } from '../../lib/useAround.js'
import { useDraft, hasDraft } from '../../lib/useDraft.js'
import { useHikes, useSomeday, useTripStays, addStay, updateStay, removeStay, useTripPlans, addPlan, updatePlan, removePlan } from '../../lib/useYonder.js'
import { todayAt, diffDays } from '../../lib/cal/dates.js'
import { HOME_TOWN, SKIES, phaseOf, skyGradient } from '../../lib/sky.js'
import { OSM_CREDIT } from '../../lib/here.js'
import { mapsSearch } from '../../lib/around.js'
import { datesWords } from '../../lib/life/trips.js'
import { sleepsWords, sleepsFigure, waitWords, stampKind, MILESTONES } from '../../lib/yonder.js'
import { tripDays, dayWords, timeWords, stayRow, planRow, planDays, guideAreas, fromStayWords, byNearness, staySearchUrl, shapeStays, planFromPlace } from '../../lib/tripPlan.js'
import { DEFAULT_INTERESTS } from '../../../supabase/functions/_shared/around.js'
import { AroundHero, ItemTile, usePlacePainting } from '../../parts/AroundBits.jsx'
import { ItemSheet } from '../world/AroundPage.jsx'
import { useTripDays } from '../../parts/HereCards.jsx'
import Stamp from './Stamp.jsx'
import { Packing } from './Yonder.jsx'
import '../world/around.css'
import './yonder.css'

// /yonder/plan/<event id>: a planned trip's own page, opened from its countdown
// (Home, the travel app). The countdown over the sky there; where we're staying;
// our plans by day; and a guide to the area around each stay (or the trip's own
// place), written by Claude from its own searches for what we like, with photos.
// The guide is asked by area (a tenth of a degree, the town and its region):
// a stay's name never goes to Claude, and its distances are worked out here.

const firstPart = (s) => String(s || '').split(',')[0].trim()

export default function TripPlan({ id }) {
  const session = useSession()
  const family = useFamily(session)
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const travel = useTravelSettings()
  const { event, loaded } = useEvent(session, id)
  const eventId = event && event.lat != null ? event.id : null
  const stays = useTripStays(session, eventId)
  const plans = useTripPlans(session, eventId)
  const hikes = useHikes(session), someday = useSomeday(session)
  const trip = event ? { ...event, town: firstPart(event.place) || event.title, sleeps: diffDays(today, event.starts_on) } : null
  const areas = trip ? guideAreas(trip, stays.rows) : []
  const first = useAround(areas[0] || null, { auto: Boolean(trip && trip.ends_on >= today) })
  const head = (kicker, title) => <header className="hero span-6"><Crumb to="/yonder">{travel.appName}</Crumb><span className="kicker">{kicker}</span><h1 className="greet">{title}</h1></header>
  if (!loaded) return <>{head('The trip', 'Opening it…')}</>
  if (!event || event.lat == null) {
    return (
      <>
        {head('The trip', 'Not found')}
        <Card tint="#2F7D7A" label="The trip" glyph="calendar" className="span-6">
          <p>{event ? 'This event has no place on the map yet. Give it one on the calendar (“Find it”) and it becomes a trip with its own page.' : 'That trip isn’t on the calendar any more.'}</p>
          <div className="form-actions">{event && <Link className="btn ghost" to={`/calendar/event/${event.id}/edit`}>Give it a place ›</Link>}<Link className="btn ghost" to="/yonder">Every trip ahead ›</Link></div>
        </Card>
      </>
    )
  }
  const over = trip.ends_on < today, on = !over && trip.sleeps <= 0
  const day = 1 - trip.sleeps, length = diffDays(trip.starts_on, trip.ends_on) + 1
  const kicker = over ? 'A trip we took' : on ? `Day ${day} of ${length}` : `${sleepsFigure(trip.sleeps)} to go`
  const ctx = { trip, today, now, session, members: family.members, hikes, someday, plans }
  return (
    <>
      {head(kicker, trip.title)}
      <TripHero c={ctx} over={over} on={on} day={day} length={length} photo={heroPhoto(first.map)} />
      <StaysCard c={ctx} stays={stays} />
      <PlansCard c={ctx} />
      {areas.map((a, i) => (i === 0
        ? <AreaGuide key={a.cell} c={ctx} area={a} data={first} />
        : <AreaGuideFor key={a.cell} c={ctx} area={a} auto={!over} />))}
      {!over && trip.sleeps <= 14 && <TripPacking c={ctx} />}
      <Card tint="#8A5A33" label="About these guides" glyph="star" className="span-6">
        <p className="ar-note">Written by Claude (Anthropic) from its own web searches, for what we like: {travel.interests || DEFAULT_INTERESTS} {travel.loaded && <Link to="/admin">Change it in Admin</Link>}.</p>
        <p className="ar-note">For each guide it’s sent the town, the area to about ten kilometres and those words, never where we’re staying or who’s going; how far each place is from where we’re staying is worked out on this phone. A guide is written by itself when this page opens and the area has none from this month, and it’s there for the whole family after. Photos are from Wikimedia Commons, each credited, or a place’s own website; Laurie’s painting leads wherever she has painted the place. Places from {OSM_CREDIT}.</p>
      </Card>
    </>
  )
}

const heroPhoto = (map) => (map && map.hero && map.hero.photo) || (map && (map.sights || []).find((s) => s.photo) || {}).photo || null

/** The trip at a glance: Laurie's painting or the place's photo, the countdown over the sky there now, the dates. */
function TripHero({ c, over, on, day, length, photo }) {
  const { trip, today, now, members } = c
  const painting = usePlacePainting(trip.town, null)
  const t = SunCalc.getTimes(now, trip.lat, trip.lng)
  const key = phaseOf(now, t)
  const wait = !over && !on ? waitWords(today, trip.starts_on) : ''
  const who = trip.for_whom ? members.find((m) => m.id === trip.for_whom) : null
  const gleam = !over && !on && MILESTONES.includes(trip.sleeps)
  const big = over ? `We went to ${trip.town}` : on ? `Day ${day} of ${length} in ${trip.town}` : sleepsWords(trip)
  return (
    <Card tint="#2F7D7A" label="The trip" glyph="calendar" className="span-6 yo-next yo-plan-hero">
      <AroundHero painting={painting} photo={photo} title={trip.town} />
      <div className={'yo-sky' + (SKIES[key].dark ? ' dark' : '') + (gleam ? ' yo-gleaming' : '')} style={{ background: skyGradient(key) }}>
        <b className="yo-sleeps">{big}</b>
        {wait && <span>{wait} to go</span>}
        <span>{SKIES[key].name.toLowerCase()} there now</span>
        <Stamp kind={stampKind(trip)} name={trip.town} date={trip.starts_on} size={64} tilt={-6} />
        {gleam && <i className="yo-gleam" aria-hidden="true" />}
      </div>
      <p><b>{datesWords(trip, today)}</b>{trip.place && trip.place !== trip.title ? ` · ${trip.place}` : ''}{who ? ` · ${who.name}’s trip` : ''}</p>
      <div className="form-actions"><Link className="btn ghost" to={`/calendar/event/${trip.id}`}>The trip on the calendar ›</Link></div>
    </Card>
  )
}

// ---- Where we're staying ------------------------------------------------------------

const stayDates = (s) => (s.from_date && s.to_date && s.from_date !== s.to_date ? `${dayWords(s.from_date)} to ${dayWords(s.to_date)}` : s.from_date ? dayWords(s.from_date) : '')
const stayForm = (s) => ({ name: s.name || '', town: s.town || '', region: s.region || '', lat: s.lat == null ? null : Number(s.lat), lng: s.lng == null ? null : Number(s.lng), from_date: s.from_date || '', to_date: s.to_date || '', note: s.note || '' })

/** The hotel, inn or campground (more than one for a trip with stops): each gets a guide to the area around it. */
function StaysCard({ c, stays }) {
  const { trip } = c
  const [editing, setEditing] = useState(() => (hasDraft(`stay.${trip.id}.new`) ? 'new' : null)) // 'new', a stay, or null
  const [toast, setToast] = useState(null)
  const remove = async (s) => {
    const { error } = await removeStay(s.id)
    if (error) { setToast({ text: 'It couldn’t be taken off just now.' }); return }
    stays.reload()
    const { id: _i, created_at: _c, added_by: _a, ...row } = s
    setToast({ text: `Took ${s.name} off.`, undo: async () => { await addStay(row); stays.reload(); setToast(null) } })
  }
  return (
    <Card tint="#5A4E8A" label="Where we’re staying" glyph="star" className="span-3 yo-stays">
      {!stays.rows.length && !editing && <p className="muted">Add the hotel, inn or campground (each one, for a trip with stops). The guide below is then written for the area around it, nearest places first.</p>}
      <ul className="yo-stay-list">
        {stays.rows.map((s) => (editing && editing.id === s.id
          ? <li key={s.id}><StayForm trip={trip} stay={s} onDone={(saved) => { setEditing(null); if (saved) stays.reload() }} /></li>
          : (
            <li key={s.id}>
              <b>{s.name}</b>
              <small>{[s.town, stayDates(s)].filter(Boolean).join(' · ')}</small>
              {s.note && <small className="yo-stay-note">{s.note}</small>}
              {s.lat == null && <small>Not found on the map, so there’s no guide for it yet: Change, then Find it.</small>}
              <div className="yo-stay-go">
                <a className="btn ghost" href={mapsSearch(s.name, s.town)} target="_blank" rel="noopener noreferrer">Directions</a>
                <button type="button" className="btn ghost" onClick={() => setEditing(s)}>Change</button>
                <button type="button" className="icon-btn" aria-label={`Take ${s.name} off`} onClick={() => remove(s)}>✕</button>
              </div>
            </li>
          )))}
      </ul>
      {editing === 'new' ? <StayForm trip={trip} onDone={(saved) => { setEditing(null); if (saved) stays.reload() }} /> : !editing && <button type="button" className="btn ghost" onClick={() => setEditing('new')}>+ Where we’re staying</button>}
      {toast && <Toast action={toast.undo ? 'Undo' : undefined} onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </Card>
  )
}

function StayForm({ trip, stay = null, onDone }) {
  const blank = stay ? stayForm(stay) : { name: '', town: firstPart(trip.place), region: '', lat: null, lng: null, from_date: trip.starts_on, to_date: trip.ends_on, note: '' }
  const [f, setF, clear] = useDraft(`stay.${trip.id}.${stay ? stay.id : 'new'}`, blank)
  const [found, setFound] = useState(null) // null, a message, or the places
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const days = tripDays(trip)
  const find = async () => {
    setFound('Looking on OpenStreetMap…')
    try {
      const r = await fetch(staySearchUrl(f.name, f.town || firstPart(trip.place)), { signal: AbortSignal.timeout(12000) })
      const places = r.ok ? shapeStays(await r.json()) : null
      setFound(places == null ? 'OpenStreetMap couldn’t be reached just now.' : places.length ? places : 'Nothing by that name there. Try its name as it writes it, or save it as it is.')
    } catch { setFound('OpenStreetMap couldn’t be reached just now.') }
  }
  const save = async (e) => {
    e.preventDefault()
    const { row, error } = stayRow(f, trip)
    if (error) { setErr(error); return }
    setBusy(true); setErr('')
    const { error: dbErr } = stay ? await updateStay(stay.id, row) : await addStay(row)
    setBusy(false)
    if (dbErr) { setErr(`It couldn’t be saved just now (${dbErr.message}). What you typed is kept.`); return }
    clear(); onDone(true)
  }
  return (
    <form className="form yo-stay-form" onSubmit={save}>
      <label>The place<span className="place-row">
        <input required maxLength={160} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, lat: null, lng: null })} placeholder="The hotel, inn or campground" />
        <button type="button" className="btn ghost" disabled={!f.name.trim()} onClick={find}>Find it</button>
      </span></label>
      {f.lat != null && <p className="ok">On the map ✓{f.town ? ` In ${f.town}.` : ''}</p>}
      {found && (Array.isArray(found)
        ? <ul className="place-picks">{found.map((p) => <li key={`${p.lat},${p.lng},${p.name}`}><button type="button" onClick={() => { setF({ ...f, name: p.name, town: p.town, region: p.region, lat: p.lat, lng: p.lng }); setFound(null) }}><b>{p.name}</b>{p.where && <span> {p.where}</span>}</button></li>)}</ul>
        : <p className="muted" role="status">{found}</p>)}
      <p className="muted small">Find it asks OpenStreetMap ({OSM_CREDIT}) with what you’ve typed and the trip’s town. Only the place’s name, its town and its spot to about a hundred metres are kept, never an address, and Claude is never told it.</p>
      <div className="form-row">
        <label>From<select value={f.from_date} onChange={(e) => setF({ ...f, from_date: e.target.value })}><option value="">Not sure</option>{days.map((d) => <option key={d} value={d}>{dayWords(d)}</option>)}</select></label>
        <label>To<select value={f.to_date} onChange={(e) => setF({ ...f, to_date: e.target.value })}><option value="">Not sure</option>{days.map((d) => <option key={d} value={d}>{dayWords(d)}</option>)}</select></label>
      </div>
      <label>A note (optional)<textarea maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Check in after 3, the room with the view…" /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn ghost" onClick={() => { clear(); onDone(false) }}>Cancel</button>
      </div>
    </form>
  )
}

// ---- Our plans ----------------------------------------------------------------------

const planForm = (p) => ({ title: p.title || '', on_date: p.on_date || '', at_time: p.at_time ? String(p.at_time).slice(0, 5) : '', place: p.place || '', website: p.website || '', note: p.note || '' })

/** Our plans by day: reservations, a hike for the morning, the show at night. Anything in a guide can join them. */
function PlansCard({ c }) {
  const { trip, plans } = c
  const [editing, setEditing] = useState(() => (hasDraft(`plan.${trip.id}.new`) ? 'new' : null))
  const [toast, setToast] = useState(null)
  const groups = planDays(trip, plans.rows)
  const remove = async (p) => {
    const { error } = await removePlan(p.id)
    if (error) { setToast({ text: 'It couldn’t be taken off just now.' }); return }
    plans.reload()
    const { id: _i, created_at: _c, added_by: _a, ...row } = p
    setToast({ text: `Took “${p.title}” off.`, undo: async () => { await addPlan(row); plans.reload(); setToast(null) } })
  }
  return (
    <Card tint="#C9863F" label="Our plans" glyph="calendar" tag={plans.rows.length ? `${plans.rows.length}` : undefined} className="span-3 yo-plans">
      {!groups.length && editing !== 'new' && <p className="muted">Reservations, a hike for Saturday morning, the show on Friday night: add them here, or tap anything in the guide and add it to a day.</p>}
      {groups.map((g) => (
        <section key={g.date || 'any'} className="yo-plan-day" aria-label={g.words}>
          <h3>{g.words}</h3>
          <ul className="yo-plan-list">
            {g.plans.map((p) => (editing && editing.id === p.id
              ? <li key={p.id}><PlanForm trip={trip} plan={p} onDone={(saved) => { setEditing(null); if (saved) plans.reload() }} /></li>
              : (
                <li key={p.id}>
                  <button type="button" className="yo-plan" onClick={() => setEditing(p)} aria-label={`Change ${p.title}`}>
                    <span className="yo-plan-time fig">{timeWords(p.at_time)}</span>
                    <span className="yo-plan-what"><b>{p.title}</b>{p.place && p.place !== p.title && <small>{p.place}</small>}{p.note && <small>{p.note}</small>}</span>
                  </button>
                  {p.website && <a className="yo-plan-link" href={p.website} target="_blank" rel="noopener noreferrer" aria-label={`${p.title}’s website`}>↗</a>}
                  <button type="button" className="icon-btn" aria-label={`Take ${p.title} off`} onClick={() => remove(p)}>✕</button>
                </li>
              )))}
          </ul>
        </section>
      ))}
      {editing === 'new' ? <PlanForm trip={trip} onDone={(saved) => { setEditing(null); if (saved) plans.reload() }} /> : !editing && <button type="button" className="btn ghost" onClick={() => setEditing('new')}>+ Add a plan</button>}
      {toast && <Toast action={toast.undo ? 'Undo' : undefined} onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </Card>
  )
}

function PlanForm({ trip, plan = null, onDone }) {
  const blank = plan ? planForm(plan) : { title: '', on_date: '', at_time: '', place: '', website: '', note: '' }
  const [f, setF, clear] = useDraft(`plan.${trip.id}.${plan ? plan.id : 'new'}`, blank)
  const [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const days = tripDays(trip)
  const save = async (e) => {
    e.preventDefault()
    const { row, error } = planRow(f, trip)
    if (error) { setErr(error); return }
    setBusy(true); setErr('')
    const { error: dbErr } = plan ? await updatePlan(plan.id, row) : await addPlan(row)
    setBusy(false)
    if (dbErr) { setErr(`It couldn’t be saved just now (${dbErr.message}). What you typed is kept.`); return }
    clear(); onDone(true)
  }
  return (
    <form className="form yo-plan-form" onSubmit={save}>
      <label>What<input required maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Dinner at eight, the morning hike…" /></label>
      <div className="form-row">
        <label>Which day<select value={f.on_date} onChange={(e) => setF({ ...f, on_date: e.target.value })}><option value="">Any day</option>{days.map((d) => <option key={d} value={d}>{dayWords(d)}</option>)}</select></label>
        <label>Time (optional)<input type="time" value={f.at_time} onChange={(e) => setF({ ...f, at_time: e.target.value })} /></label>
      </div>
      <label>Where (optional)<input maxLength={160} value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} placeholder="The place’s name" /></label>
      <label>A link (optional)<input type="url" inputMode="url" maxLength={600} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://" /></label>
      <label>A note (optional)<textarea maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Booked for four, bring the tickets…" /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn ghost" onClick={() => { clear(); onDone(false) }}>Cancel</button>
      </div>
    </form>
  )
}

/** In a guide place's sheet: add it to our plans, on a day, in one tap. */
function AddToPlans({ c, item }) {
  const { trip, plans } = c
  const days = tripDays(trip)
  const [day, setDay] = useState('')
  const [toast, setToast] = useState(null)
  const already = (plans.rows || []).find((p) => (p.place || p.title) === item.name)
  const add = async () => {
    const { row, error } = planRow(planFromPlace(item, day), trip)
    if (error) return
    const { data, error: dbErr } = await addPlan(row)
    if (dbErr) { setToast({ text: 'It couldn’t be added just now.' }); return }
    plans.reload()
    setToast({ text: `Added to ${day ? `${dayWords(day)}’s` : 'our'} plans.`, undo: async () => { await removePlan(data.id); plans.reload(); setToast(null) } })
  }
  return (
    <div className="yo-add-plan">
      <label>Add it to our plans<select value={day} onChange={(e) => setDay(e.target.value)}><option value="">Any day</option>{days.map((d) => <option key={d} value={d}>{dayWords(d)}</option>)}</select></label>
      <button type="button" className="btn" onClick={add}>{already ? 'Add it again' : 'Add to our plans'}</button>
      {already && <p className="muted small">Already in our plans{already.on_date ? ` for ${dayWords(already.on_date)}` : ''}.</p>}
      {toast && <Toast action={toast.undo ? 'Undo' : undefined} onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </div>
  )
}

// ---- The guides ---------------------------------------------------------------------

function AreaGuideFor({ c, area, auto }) {
  const data = useAround(area, { auto })
  return <AreaGuide c={c} area={area} data={data} withPhoto />
}

/** The guide to one area, in rows of photo cards nearest the stay first; a card opens the place, which can join our plans. */
function AreaGuide({ c, area, data, withPhoto = false }) {
  const { map, guide, building, error } = data
  const [open, setOpen] = useState(null)
  const where = area.town || area.label || 'there'
  const title = area.point ? `Around ${area.label}` : `What’s around ${where}`
  const photo = withPhoto ? heroPhoto(map) : null
  const sights = !guide && map ? (map.sights || []).slice(0, 8) : []
  return (
    <Card tint="#B5658F" label={title} glyph="star" className="span-6 ar-card yo-plan-guide">
      {photo && <AroundHero painting={null} photo={photo} title={where} />}
      {guide && guide.intro && <p className="ar-intro">{guide.intro}</p>}
      {!guide && map && map.hero && map.hero.extract && <p className="ar-intro">{map.hero.extract}</p>}
      {building && <p className="ar-working" role="status"><span aria-hidden="true" className="ar-dots" /> Writing the guide to {where} for what we like: hikes, roasters, brewpubs and the rest. It takes about a minute, and it’ll be here for the whole family after.</p>}
      {!building && !guide && error && <p className="muted" role="status">{error}</p>}
      {!building && !guide && !error && c.trip.ends_on < c.today && <p className="muted">No guide was kept for this area.</p>}
      {guide && (guide.sections || []).map((s) => (
        <section key={s.key} className="ar-rail-wrap" aria-label={s.title}>
          <h3>{s.title}</h3>
          <div className="ar-rail">{byNearness(s.items, area).map((it) => <ItemTile key={it.name} item={it} section={s.key} meta={fromStayWords(it, area)} onOpen={(item) => setOpen({ item, section: s })} />)}</div>
        </section>
      ))}
      {sights.length > 0 && (
        <section className="ar-rail-wrap" aria-label="Near there, from Wikipedia">
          <h3>Near there, from Wikipedia</h3>
          <div className="ar-rail">{sights.map((s) => <ItemTile key={s.title} item={{ name: s.title, why: s.extract, photo: s.photo }} section="village" onOpen={() => s.url && window.open(s.url, '_blank', 'noopener,noreferrer')} />)}</div>
        </section>
      )}
      {guide && guide.date && <p className="ar-note">Written {guide.date}. Every place lists its sources; one the open map doesn’t have says to check before you go.</p>}
      {open && (
        <ItemSheet item={open.item} section={open.section} point={null} sunset={null} now={c.now} zone={HOME_TOWN.tz} town={where} place={{ cell: area.cell, town: area.town, region: area.region }}
          hikes={c.hikes} someday={c.someday} beenTown={null} beenList={[]} onClose={() => setOpen(null)} planning distance={fromStayWords(open.item, area) || null}>
          <AddToPlans c={c} item={open.item} />
        </ItemSheet>
      )}
    </Card>
  )
}

/** The packing list, in the last two weeks, with the forecast there once it reaches the trip. */
function TripPacking({ c }) {
  const { days } = useTripDays({ ...c.trip, inDays: c.trip.sleeps }, c.today)
  return <Packing c={{ session: c.session }} trip={c.trip} days={days || []} />
}
