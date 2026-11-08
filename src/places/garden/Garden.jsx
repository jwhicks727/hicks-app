import { SeenPlantsCard } from '../../parts/PhotoBits.jsx'
import { useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Crumb, Link } from '../../shell/Link.jsx'
import { navigate } from '../../lib/router.js'
import { Sheet } from '../../ui/Sheet.jsx'
import { Confirm } from '../../ui/Confirm.jsx'
import Dropzone from '../../ui/Dropzone.jsx'
import { useSession } from '../../lib/auth.js'
import { useFamily } from '../../lib/useCalendar.js'
import { useWeather } from '../../lib/useWeather.js'
import { useDraft } from '../../lib/useDraft.js'
import { askClaude, prepareUpload } from '../../lib/claude.js'
import { todayAt } from '../../lib/cal/dates.js'
import { HOME_TOWN } from '../../lib/sky.js'
import { SPOT_KINDS, SUN, ROOM_LIGHT, careToday, plantingIn, newSpot, daysBetween, PLANT_FORMS, PLANT_SIZES, POTS, formFor, sizeFor } from '../../lib/garden.js'
import { useGarden, addArea, saveArea, removeArea, addSpot, saveSpot, removeSpot, addPlant, savePlant, removePlant, logCare, addPhoto, removePhoto, saveAnalysis, useSignedUrls } from '../../lib/useGarden.js'
import GardenMap from './GardenMap.jsx'
import PotLineup from './PotLineup.jsx'
import PlantArt from './PlantArt.jsx'
import './garden.css'

// /garden                 the garden: today's care, every area's map, what to plant now
// /garden/area/<id>       one area: its map, to arrange, and its spots
// /garden/spot/<id>       one bed, pot or tree: its plants, photos and care
export default function Garden({ rest = [] }) {
  const session = useSession()
  const family = useFamily(session)
  const g = useGarden(session)
  const { forecast } = useWeather()
  const today = todayAt(HOME_TOWN.tz, new Date())
  const email = session && session.user.email ? session.user.email.toLowerCase() : null
  const me = email ? family.members.find((m) => (m.email || '').toLowerCase() === email) : null
  const parent = Boolean(me && me.role === 'parent')
  if (!session) {
    return (
      <>
        <header className="hero span-6"><span className="kicker">Yard and rooms</span><h1 className="greet">The Garden</h1></header>
        <Card tint="#5F8A4A" label="Not connected" glyph="star" className="span-6"><p>The Garden is kept in the database, and the database isn’t connected on this copy of the app.</p></Card>
      </>
    )
  }
  const props = { g, me, parent, today, forecast }
  if (rest[0] === 'area') return <AreaPage id={rest[1]} {...props} />
  if (rest[0] === 'spot') return <SpotPage id={rest[1]} {...props} />
  return <GardenHome {...props} />
}

const fmt = (d) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' })
const ago = (d, today) => { const n = daysBetween(d, today); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago` }

/** Today's jobs, each done with a tap. */
export function CareList({ care, today, me, onDone, limit }) {
  if (!care.length) return <p className="muted">Nothing needs doing today.</p>
  return (
    <ul className="gcare">
      {care.slice(0, limit || care.length).map((c) => (
        <li key={c.id} className={c.level}>
          <span><b>{c.what}</b><span>{c.why}</span></span>
          {c.spot && c.log && (
            <button type="button" className="btn ghost" onClick={async () => { await logCare({ spot_id: c.spot.id, plant_id: c.plant || null, kind: c.log, on_date: today, created_by: me ? me.id : null }); onDone() }}>Done</button>
          )}
        </li>
      ))}
    </ul>
  )
}

function GardenHome({ g, me, parent, today, forecast }) {
  const care = careToday({ spots: g.spots, plants: g.plants, log: g.log, forecast, today })
  const month = +today.slice(5, 7), now = plantingIn(month)
  const [adding, setAdding, clearAdding] = useDraft('garden.area.new', null)
  const recent = g.photos.slice(0, 8)
  const urls = useSignedUrls(recent.map((p) => p.thumb_path || p.path))
  async function create() {
    const { data, error } = await addArea({ name: adding.name.trim() || 'The yard', indoor: adding.indoor, width_ft: Number(adding.width) || 30, depth_ft: Number(adding.depth) || 20, light: adding.light || null, sort: g.areas.length })
    if (!error) { clearAdding(); g.reload(); navigate(`/garden/area/${data.id}`) }
  }
  return (
    <>
      <header className="hero span-6"><span className="kicker">Yard and rooms</span><h1 className="greet">The Garden</h1></header>
      <SeenPlantsCard />
      <Card tint="#5F8A4A" label="Today" glyph="weather" tag={care.length ? `${care.length}` : undefined} className="span-3">
        <CareList care={care} today={today} me={me} onDone={g.reload} />
      </Card>
      <Card tint="#E8892B" label={`Planting in ${new Date(Date.UTC(2026, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })}`} glyph="star" className="span-3">
        <p><b>Sow:</b> {now.sow.join(', ')}.</p>
        <p><b>Plant:</b> {now.plant.join(', ')}.</p>
        <p className="muted">{now.note} A general guide for inland Southern California; for pests and problems, the <a href="https://ipm.ucanr.edu/" target="_blank" rel="noopener noreferrer">UC IPM</a> pages are the ones to trust.</p>
      </Card>
      <section className="span-6 gareas" aria-label="The Garden’s areas">
        {g.areas.map((a) => {
          const spots = g.spots.filter((s) => s.area_id === a.id)
          const n = g.plants.filter((p) => p.status !== 'done' && spots.some((s) => s.id === p.spot_id)).length
          return (
            <Link key={a.id} to={`/garden/area/${a.id}`} className="garea">
              {a.indoor ? <PotLineup area={a} spots={spots} plants={g.plants} mini /> : <GardenMap area={a} spots={spots} plants={g.plants} className="mini" />}
              <span><b>{a.name}</b><span>{a.indoor ? ROOM_LIGHT[a.light] || 'Indoors' : 'Outdoors'} · {spots.length} {spots.length === 1 ? 'spot' : 'spots'} · {n} {n === 1 ? 'plant' : 'plants'}</span></span>
            </Link>
          )
        })}
        {!adding && <button type="button" className="garea add" onClick={() => setAdding({ name: '', indoor: false, width: 40, depth: 25, light: '' })}><b>+ An area</b><span>The back yard, the patio, a room’s plants</span></button>}
      </section>
      {adding && (
        <Card tint="#5F8A4A" label="A new area" glyph="star" className="span-6">
          <div className="form">
            <fieldset className="choice-row"><legend>Where</legend>
              <button type="button" aria-pressed={!adding.indoor} onClick={() => setAdding({ ...adding, indoor: false })}>Outdoors</button>
              <button type="button" aria-pressed={adding.indoor} onClick={() => setAdding({ ...adding, indoor: true, width: 14, depth: 12 })}>A room inside</button>
            </fieldset>
            <label>Name<input maxLength={80} value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} placeholder={adding.indoor ? 'The living room' : 'The back yard'} /></label>
            <div className="form-row">
              <label>About how wide (ft)<input type="number" min="1" max="500" value={adding.width} onChange={(e) => setAdding({ ...adding, width: e.target.value })} /></label>
              <label>About how deep (ft)<input type="number" min="1" max="500" value={adding.depth} onChange={(e) => setAdding({ ...adding, depth: e.target.value })} /></label>
            </div>
            {adding.indoor && <label>Its light<select value={adding.light} onChange={(e) => setAdding({ ...adding, light: e.target.value })}><option value="">Not sure</option>{Object.entries(ROOM_LIGHT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>}
            <div className="form-actions"><button type="button" className="btn" onClick={create}>Make its map</button><button type="button" className="btn ghost" onClick={clearAdding}>Cancel</button></div>
          </div>
        </Card>
      )}
      {recent.length > 0 && (
        <Card tint="#5F8A4A" label="Lately" glyph="star" className="span-6">
          <div className="gphotos">{recent.map((p) => <Link key={p.id} to={`/garden/spot/${p.spot_id}`} className="gphoto">{urls[p.thumb_path || p.path] ? <img src={urls[p.thumb_path || p.path]} alt={`From ${fmt(p.taken_on)}`} loading="lazy" /> : <span />}<em>{fmt(p.taken_on)}</em></Link>)}</div>
        </Card>
      )}
    </>
  )
}

function AreaPage({ id, g, me, parent, today, forecast }) {
  const area = g.areas.find((a) => a.id === id)
  const [edit, setEdit] = useState(false), [sel, setSel] = useState(null), [moving, setMoving] = useState(false), [ask, setAsk] = useState(null)
  if (!g.loaded) return <header className="hero span-6"><Crumb to="/garden">The Garden</Crumb><h1 className="greet">…</h1></header>
  if (!area) return <header className="hero span-6"><Crumb to="/garden">The Garden</Crumb><h1 className="greet">Not one of our areas</h1></header>
  const spots = g.spots.filter((s) => s.area_id === area.id)
  const chosen = spots.find((s) => s.id === sel)
  const kinds = area.indoor ? ['pot', 'plant', 'other'] : ['bed', 'box', 'pot', 'tree', 'plant', 'feeder', 'bath', 'compost', 'path']
  const care = careToday({ spots, plants: g.plants, log: g.log, forecast, today }).filter((c) => c.spot)
  const add = async (kind) => { const { data } = await addSpot(newSpot(kind, area.id, spots.filter((s) => s.kind === kind).length)); g.reload(); if (data) setSel(data.id) }
  const resize = async (k) => { const s = chosen; const w = Math.round(s.w * k * 10) / 10, h = Math.round(s.h * k * 10) / 10; await saveSpot(s.id, { x: s.x, y: s.y, w, h }); g.reload() }
  return (
    <>
      <header className="hero span-6"><Crumb to="/garden">The Garden</Crumb><span className="kicker">{area.indoor ? 'Inside' : 'Outside'} · about {Number(area.width_ft)} × {Number(area.depth_ft)} ft</span><h1 className="greet">{area.name}</h1></header>
      {area.indoor ? (
        <Card tint="#5F8A4A" label="Its plants" glyph="pot" tag={area.light ? ROOM_LIGHT[area.light] : undefined} className="span-6">
          <PotLineup area={area} spots={spots} plants={g.plants} />
          <AddPot area={area} count={spots.length} onAdded={(sid) => { g.reload(); navigate(`/garden/spot/${sid}`) }} />
        </Card>
      ) : (
      <Card tint="#5F8A4A" label={edit ? 'Arranging' : 'The map'} glyph="star" className="span-6 gmap-card">
        <GardenMap area={area} spots={spots} plants={g.plants} edit={edit} selected={sel} moving={moving}
          onSelect={(x) => { setSel(x); setMoving(false) }} onOpen={(x) => navigate(`/garden/spot/${x}`)}
          onMove={async (sid, p) => { const s = spots.find((x) => x.id === sid); await saveSpot(sid, { ...s, ...p, x: p.x, y: p.y, w: s.w, h: s.h }); setMoving(false); g.reload() }} />
        {!edit && <p className="muted small">Tap a spot to open it.</p>}
        {edit && (
          <div className="gtools">
            {chosen ? (
              <>
                <b>{chosen.name}</b>
                <div className="gtools-b">
                  <button type="button" className="btn ghost" aria-pressed={moving} onClick={() => setMoving(!moving)}>{moving ? 'Now tap where it goes' : 'Move'}</button>
                  <button type="button" className="btn ghost" onClick={() => resize(1.2)} aria-label="Bigger">Bigger</button>
                  <button type="button" className="btn ghost" onClick={() => resize(1 / 1.2)} aria-label="Smaller">Smaller</button>
                  <Link className="btn ghost" to={`/garden/spot/${chosen.id}`}>Open</Link>
                  {parent && <button type="button" className="btn ghost danger-t" onClick={() => setAsk('spot')}>Remove</button>}
                </div>
                <p className="muted small">Drag it, or tap Move and then the map.</p>
              </>
            ) : <p className="muted small">Tap a spot to choose it, or add one:</p>}
            <div className="gtools-add">{kinds.map((k) => <button key={k} type="button" className="btn ghost" onClick={() => add(k)}>+ {SPOT_KINDS[k].name}</button>)}</div>
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => { setEdit(!edit); setSel(null); setMoving(false) }}>{edit ? 'Done arranging' : 'Arrange'}</button>
        </div>
      </Card>
      )}
      {care.length > 0 && <Card tint="#5F8A4A" label="Today here" glyph="weather" className="span-3"><CareList care={care} today={today} me={me} onDone={g.reload} /></Card>}
      <Card tint="#8A9A3B" label="Its spots" glyph="star" className="span-3">
        <ul className="gspots">
          {spots.map((s) => {
            const n = g.plants.filter((p) => p.spot_id === s.id && p.status !== 'done')
            return <li key={s.id}><Link to={`/garden/spot/${s.id}`}><i style={{ background: (SPOT_KINDS[s.kind] || SPOT_KINDS.other).colour }} /><span><b>{s.name}</b><span>{SPOT_KINDS[s.kind].name}{n.length ? ` · ${n.map((p) => p.name).join(', ')}` : ''}</span></span><em>›</em></Link></li>
          })}
          {!spots.length && <li className="muted">Nothing on the map yet: tap Arrange, then add a bed, a pot or a tree.</li>}
        </ul>
        {parent && <button type="button" className="btn ghost danger-t" onClick={() => setAsk('area')}>Remove this area</button>}
      </Card>
      {ask && <Confirm title={ask === 'area' ? `Remove ${area.name}?` : `Remove ${chosen ? chosen.name : 'it'}?`} yes="Remove" danger onNo={() => setAsk(null)}
        onYes={async () => { if (ask === 'area') { await removeArea(area.id); navigate('/garden', { replace: true }) } else { await removeSpot(chosen.id); setSel(null) } setAsk(null); g.reload() }}>
        <p>{ask === 'area' ? 'Its map, its spots, their plants, photos and care log all go.' : 'Its plants, photos and care log go with it.'}</p>
      </Confirm>}
    </>
  )
}

const CARE = [['water', 'Watered'], ['feed', 'Fed'], ['prune', 'Pruned'], ['harvest', 'Picked'], ['treat', 'Treated'], ['note', 'A note']]
const CARE_WORD = { water: 'Watered', feed: 'Fed', prune: 'Pruned', plant: 'Planted', harvest: 'Picked', treat: 'Treated', refill: 'Refilled', note: 'Note' }

function SpotPage({ id, g, me, parent, today }) {
  const spot = g.spots.find((s) => s.id === id)
  const area = spot ? g.areas.find((a) => a.id === spot.area_id) : null
  const [plantForm, setPlantForm, clearPlant] = useDraft(`garden.plant.${id}`, null)
  const [note, setNote] = useState(''), [busy, setBusy] = useState(null), [open, setOpen] = useState(null)
  const photos = g.photos.filter((p) => p.spot_id === id)
  const urls = useSignedUrls(photos.map((p) => p.thumb_path || p.path))
  if (!g.loaded) return <header className="hero span-6"><Crumb to="/garden">The Garden</Crumb><h1 className="greet">…</h1></header>
  if (!spot) return <header className="hero span-6"><Crumb to="/garden">The Garden</Crumb><h1 className="greet">Not one of our spots</h1></header>
  const plants = g.plants.filter((p) => p.spot_id === id)
  const log = g.log.filter((l) => l.spot_id === id).slice(0, 20)
  const quick = spot.kind === 'feeder' || spot.kind === 'bath' ? [['refill', spot.kind === 'feeder' ? 'Fresh nectar' : 'Fresh water'], ['note', 'A note']] : CARE
  const doCare = async (kind) => { await logCare({ spot_id: id, kind, on_date: today, note: kind === 'note' || kind === 'harvest' ? note.trim() || null : null, created_by: me ? me.id : null }); setNote(''); g.reload() }
  async function upload(files) {
    setBusy('Saving the photo…')
    for (const f of files.slice(0, 6)) {
      const full = await prepareUpload(f, { max: 1800 }), thumb = await prepareUpload(f, { max: 400, quality: 0.8 })
      const { error } = await addPhoto({ spotId: id, full: full.blob, thumb: thumb.blob, takenOn: today, me })
      if (error) { setBusy(error.message); return }
    }
    setBusy(null); g.reload()
  }
  return (
    <>
      <header className="hero span-6"><Crumb to={area ? `/garden/area/${area.id}` : '/garden'}>{area ? area.name : 'The Garden'}</Crumb><span className="kicker">{SPOT_KINDS[spot.kind].name}{spot.sun ? ` · ${SUN[spot.sun] || ROOM_LIGHT[spot.sun]}` : ''}</span><h1 className="greet">{spot.name}</h1></header>
      {area && area.indoor && <PotLook spot={spot} plant={g.plants.find((p) => p.spot_id === id && p.status !== 'done')} onSave={async (patch) => { await saveSpot(spot.id, patch); g.reload() }} />}
      <Card tint="#5F8A4A" label="What grows here" glyph="star" className="span-3">
        <ul className="gplants">
          {plants.map((p) => (
            <li key={p.id} className={p.status}>
              <span><b>{p.name}</b>{p.variety && <span> · {p.variety}</span>}<span className="muted small">{[p.planted_on && `planted ${fmt(p.planted_on)}`, p.water_days && `water every ${p.water_days} ${p.water_days === 1 ? 'day' : 'days'}`].filter(Boolean).join(' · ')}</span></span>
              <button type="button" className="btn ghost" onClick={async () => { await savePlant(p.id, { status: p.status === 'done' ? 'growing' : 'done' }); g.reload() }}>{p.status === 'done' ? 'Growing again' : 'Done for the season'}</button>
              {p.status === 'done' && <button type="button" className="btn ghost danger-t" onClick={async () => { await removePlant(p.id); g.reload() }}>Remove</button>}
            </li>
          ))}
          {!plants.length && <li className="muted">Nothing yet.</li>}
        </ul>
        {plantForm ? (
          <div className="form">
            <div className="form-row"><label>Plant<input maxLength={80} value={plantForm.name} onChange={(e) => setPlantForm({ ...plantForm, name: e.target.value })} placeholder="Cherry tomatoes" /></label><label>Variety<input maxLength={80} value={plantForm.variety} onChange={(e) => setPlantForm({ ...plantForm, variety: e.target.value })} placeholder="Sungold" /></label></div>
            <div className="form-row"><label>Planted<input type="date" value={plantForm.planted_on} onChange={(e) => setPlantForm({ ...plantForm, planted_on: e.target.value })} /></label><label>Water every (days)<input type="number" min="1" max="60" value={plantForm.water_days} onChange={(e) => setPlantForm({ ...plantForm, water_days: e.target.value })} /></label></div>
            <div className="form-actions"><button type="button" className="btn" disabled={!plantForm.name.trim()} onClick={async () => { await addPlant({ spot_id: id, name: plantForm.name.trim(), variety: plantForm.variety.trim() || null, planted_on: plantForm.planted_on || null, water_days: Number(plantForm.water_days) || null }); clearPlant(); g.reload() }}>Add it</button><button type="button" className="btn ghost" onClick={clearPlant}>Cancel</button></div>
          </div>
        ) : <button type="button" className="btn ghost" onClick={() => setPlantForm({ name: '', variety: '', planted_on: today, water_days: spot.kind === 'pot' ? 3 : spot.indoor ? 7 : 2 })}>+ A plant</button>}
        <div className="form"><label>Sun here<select value={spot.sun || ''} onChange={async (e) => { await saveSpot(id, { sun: e.target.value || null }); g.reload() }}><option value="">Not sure</option>{Object.entries(spot.indoor ? ROOM_LIGHT : SUN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label></div>
      </Card>
      <Card tint="#E8892B" label="Care" glyph="weather" className="span-3">
        <div className="gquick">{quick.map(([k, l]) => <button key={k} type="button" className="btn ghost" onClick={() => doCare(k)}>{l}</button>)}</div>
        <div className="form"><label>With a note (for a note or a pick)<input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A big bowl of tomatoes" /></label></div>
        <ul className="glog">{log.map((l) => <li key={l.id}><b>{CARE_WORD[l.kind]}</b> {ago(l.on_date, today)}{l.note ? ` · ${l.note}` : ''}</li>)}{!log.length && <li className="muted">Nothing logged yet.</li>}</ul>
      </Card>
      <Card tint="#5F8A4A" label="Photos" glyph="star" tag={photos.length ? `${photos.length}` : undefined} className="span-6">
        <Dropzone accept="image/*" multiple label="A photo of it" hint="Take one, paste one, or drop it here." onFiles={upload} disabled={busy === 'Saving the photo…'} />
        {busy && <p className="muted" role="status">{busy}</p>}
        <div className="gphotos">{photos.map((p) => <button key={p.id} type="button" className="gphoto" onClick={() => setOpen(p)}>{urls[p.thumb_path || p.path] ? <img src={urls[p.thumb_path || p.path]} alt={`From ${fmt(p.taken_on)}`} loading="lazy" /> : <span />}<em>{fmt(p.taken_on)}{p.analysis ? ` · ${p.analysis.health}` : ''}</em></button>)}</div>
        <p className="muted small">Photos stay in the family’s own storage. One goes to Claude (Anthropic) only when you tap “Have Claude look”.</p>
      </Card>
      {open && <PhotoSheet photo={open} spot={spot} area={area} plants={plants} onClose={() => setOpen(null)} onChanged={g.reload} />}
    </>
  )
}

const HEALTH = { thriving: 'Thriving', fine: 'Doing fine', watch: 'Worth watching', trouble: 'In trouble', unsure: 'Hard to tell' }

/** One photo, large, and what Claude saw in it when asked. */
function PhotoSheet({ photo, spot, area, plants, onClose, onChanged }) {
  const urls = useSignedUrls([photo.path])
  const [q, setQ] = useState(''), [busy, setBusy] = useState(null), [analysis, setAnalysis] = useState(photo.analysis), [ask, setAsk] = useState(false)
  async function look() {
    setBusy('Claude is looking…')
    try {
      const blob = await (await fetch(urls[photo.path])).blob()
      const up = await prepareUpload(new File([blob], 'photo.jpg', { type: 'image/jpeg' }), { max: 1600 })
      const res = await askClaude('garden-photo', { file: { data: up.data, media_type: up.media_type }, spot: `${spot.name}${area ? `, in ${area.name}` : ''}`, plants: plants.filter((p) => p.status !== 'done').map((p) => p.name + (p.variety ? ` (${p.variety})` : '')), indoor: Boolean(area && area.indoor), question: q })
      if (res.error) { setBusy(res.error); return }
      if (res.analysis) { setAnalysis(res.analysis); await saveAnalysis(photo.id, res.analysis); onChanged() }
      setBusy(null)
    } catch { setBusy('The photo couldn’t be read just now.') }
  }
  return (
    <Sheet title={`${spot.name}, ${fmt(photo.taken_on)}`} onClose={onClose}>
      {urls[photo.path] ? <img className="gbig" src={urls[photo.path]} alt={`${spot.name} on ${fmt(photo.taken_on)}`} /> : <div className="gbig" />}
      {analysis && (
        <div className={'glook ' + analysis.health}>
          <span className="glook-h">{HEALTH[analysis.health] || analysis.health}</span>
          {analysis.plants && analysis.plants.length > 0 && <p><b>Sees:</b> {analysis.plants.map((p) => p.name + (p.confidence === 'low' ? ' (perhaps)' : '')).join(', ')}</p>}
          <p>{analysis.summary}</p>
          {analysis.findings && analysis.findings.length > 0 && <ul>{analysis.findings.map((f, i) => <li key={i}>{f}</li>)}</ul>}
          {analysis.care && analysis.care.length > 0 && <><b>What to do</b><ul>{analysis.care.map((f, i) => <li key={i}>{f}</li>)}</ul></>}
          {analysis.water && <p><b>Water:</b> {analysis.water}</p>}
          {analysis.harvest && <p><b>Picking:</b> {analysis.harvest}</p>}
          {analysis.next_look && <p className="muted">{analysis.next_look}</p>}
        </div>
      )}
      <div className="form"><label>Anything to ask about it<input maxLength={600} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Why are the lower leaves yellow?" /></label></div>
      <div className="form-actions">
        <button type="button" className="btn" disabled={!urls[photo.path] || busy === 'Claude is looking…'} onClick={look}>{analysis ? 'Look again' : 'Have Claude look'}</button>
        <button type="button" className="btn ghost danger-t" onClick={() => setAsk(true)}>Remove the photo</button>
      </div>
      <p className="muted small">Sends this photo, the spot’s name and its plants to Claude (Anthropic).</p>
      {busy && <p className="muted" role="status">{busy}</p>}
      {ask && <Confirm title="Remove this photo?" yes="Remove" danger onNo={() => setAsk(false)} onYes={async () => { await removePhoto(photo); setAsk(false); onChanged(); onClose() }}><p>It goes from the family’s storage, with what Claude said about it.</p></Confirm>}
    </Sheet>
  )
}

/** A new pot for a room: its name, its type and size, its pot. */
function AddPot({ area, count, onAdded }) {
  const [f, setF, clear] = useDraft(`garden.pot.${area.id}`, null)
  if (!f) return <div className="form-actions"><button type="button" className="btn" onClick={() => setF({ name: '', form: 'bushy', size: 'medium', pot: 'terracotta' })}>Add a plant</button></div>
  async function add() {
    const { data, error } = await addSpot({ ...newSpot('pot', area.id, count), name: f.name.trim() || PLANT_FORMS[f.form].name.split(' (')[0], form: f.form, size: f.size, pot: f.pot })
    if (!error) { clear(); onAdded(data.id) }
  }
  return (
    <div className="form pot-form">
      <PotChoices f={f} setF={setF} />
      <label>Its name<input maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="The big fiddle-leaf fig" /></label>
      <div className="form-actions"><button type="button" className="btn" onClick={add}>Add it</button><button type="button" className="btn ghost" onClick={clear}>Cancel</button></div>
    </div>
  )
}

/** Type, size and pot, each with its picture. */
function PotChoices({ f, setF, name }) {
  return (
    <>
      <div className="pot-preview"><PlantArt form={f.form} size={f.size} pot={f.pot} seed={name || 'new'} title="How it will look" /></div>
      <fieldset className="choice-row pot-forms"><legend>What kind of plant</legend>
        {Object.entries(PLANT_FORMS).map(([k, x]) => <button key={k} type="button" aria-pressed={f.form === k} onClick={() => setF({ ...f, form: k })}><PlantArt form={k} size="small" pot={f.pot} seed={k} title="" /><span>{x.name}</span></button>)}
      </fieldset>
      <fieldset className="choice-row"><legend>How big</legend>{Object.entries(PLANT_SIZES).map(([k, x]) => <button key={k} type="button" aria-pressed={f.size === k} onClick={() => setF({ ...f, size: k })}>{x.name}</button>)}</fieldset>
      <fieldset className="choice-row"><legend>Its pot</legend>{Object.entries(POTS).map(([k, x]) => <button key={k} type="button" aria-pressed={f.pot === k} onClick={() => setF({ ...f, pot: k })}><i className="pot-swatch" style={{ background: x.colour }} />{x.name}</button>)}</fieldset>
    </>
  )
}

/** An indoor pot's look, changed on its own page. */
function PotLook({ spot, plant, onSave }) {
  const start = { form: formFor(spot, plant ? plant.name : ''), size: sizeFor(spot), pot: spot.pot || 'terracotta' }
  const [f, setF] = useState(start)
  const changed = f.form !== start.form || f.size !== start.size || f.pot !== start.pot
  return (
    <Card tint="#8A9A3B" label="How it looks" glyph="pot" className="span-3">
      <div className="form pot-form">
        <PotChoices f={f} setF={setF} name={spot.id} />
        <div className="form-actions"><button type="button" className="btn" disabled={!changed} onClick={() => onSave(f)}>Save</button></div>
      </div>
    </Card>
  )
}
