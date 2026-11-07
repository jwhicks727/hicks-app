import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../ui/Card.jsx'
import { Sheet } from '../../ui/Sheet.jsx'
import { Crumb } from '../../shell/Link.jsx'
import { useBirds, useBirdsMore, askNearest, useBirdsNear } from '../../lib/useOutside.js'
import { useSession } from '../../lib/auth.js'
import { useHere } from '../../lib/useHere.js'
import { placeWords, round2 } from '../../lib/here.js'
import { sightingsUrl, shapeSightings } from '../../lib/outdoors.js'
import { LiferLine } from '../../parts/BirdsCard.jsx'
import { useWeather } from '../../lib/useWeather.js'
import { outsideWords } from '../../lib/outsideErrors.js'
import { seenWhen, ebirdSpeciesUrl, ebirdChecklistUrl } from '../../lib/birdWords.js'
import { reportsWords, highlights, mostSeen, rareOnes, bingoCard, bingoLines, birdingLine, findBirds, weekStart } from '../../lib/birdPage.js'
import { todayAtHome } from '../../lib/useSources.js'
import '../../parts/birdlists.css'
import BirdHighlights from '../../parts/BirdHighlights.jsx'

// /world/birds: the birds around us, in full. What is most reported and what is rare this week,
// where the birding places are, today's weather for it, what else is about this month, where a
// bird was last seen, the county's day in numbers, and a bingo card for Anna.
// All from eBird's official API (the `birds` function); photos from iNaturalist, credited.
// Other birders are never named.

const MILES = (km) => `${Math.round(km * 0.621 * 10) / 10} mi`
const mapsUrl = (name) => `https://maps.google.com/?q=${encodeURIComponent(name + ' Fontana CA')}`

const readTicks = (week) => { try { return JSON.parse(window.localStorage.getItem('bingo.' + week) || '[]') } catch { return [] } }
const saveTicks = (week, v) => { try { window.localStorage.setItem('bingo.' + week, JSON.stringify(v)) } catch { /* it just won't be remembered */ } }

function Thumb({ s }) {
  return s.photo ? <img className="bp-thumb" src={s.photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="bp-thumb bp-none" aria-hidden="true" />
}

export default function BirdsPage() {
  const b = useBirds(), more = useBirdsMore(), { forecast } = useWeather()
  const here = useHere(), session = useSession()
  const away = Boolean(here.tier === 'away' && here.point)
  const nearRaw = useBirdsNear(away ? here.point : null)
  const near = nearRaw && !nearRaw.home ? nearRaw : null
  const nearList = (near && near.species) || []
  const where = away ? placeWords(here.town) || (here.place ? here.place.town : '') || 'here' : ''
  const today = todayAtHome(), week = weekStart(today)
  const list = useMemo(() => (b && b.species) || [], [b])
  const [open, setOpen] = useState(null), [q, setQ] = useState(''), [ticks, setTicks] = useState(() => readTicks(week))
  const card = useMemo(() => bingoCard(list, week), [list, week])
  const lines = bingoLines(ticks, card)
  const tick = (code) => setTicks((t) => { const n = t.includes(code) ? t.filter((x) => x !== code) : [...t, code]; saveTicks(week, n); return n })
  const found = findBirds(q, list, (more && more.possible) || [])
  const line = birdingLine(forecast)
  return (
    <>
      <header className="hero span-6"><Crumb to="/world">World</Crumb><span className="kicker">From eBird</span><h1 className="greet">{away ? `Birds around ${where}` : 'Birds around us'}</h1></header>
      {away && (
        <>
          {!near && nearRaw === null && <Card tint="#2E7F86" label={`Birds around ${where}`} glyph="bird" className="span-6"><p className="muted">Looking at this week’s sightings here…</p></Card>}
          {near && near.error && !nearList.length && <Card tint="#2E7F86" label={`Birds around ${where}`} glyph="bird" className="span-6"><p className="muted" role="status">{outsideWords('birds', near)}</p></Card>}
          {nearList.length > 0 && (
            <>
              <Card tint="#2E7F86" label="Most reported here this week" glyph="bird" tag={`${nearList.length} kinds`} className="span-3">
                <ol className="bp-list">{mostSeen(nearList, 8).map((s, i) => <li key={s.code}><button type="button" onClick={() => setOpen({ ...s, away: true })}><span className="bp-rank fig">{i + 1}</span><Thumb s={s} /><b>{s.name}</b><small className="fig">{reportsWords(s)}</small></button></li>)}</ol>
                <LiferLine list={nearList} session={session} onOpen={(s) => setOpen({ ...s, away: true })} />
              </Card>
              <Card tint="#5F8A4A" label="Rare here" glyph="star" className="span-3">
                {!rareOnes(nearList).length && <p className="muted">Nothing unusual reported here lately.</p>}
                <ol className="bp-list">{rareOnes(nearList, 8).map((s) => <li key={s.code}><button type="button" onClick={() => setOpen({ ...s, away: true })}><Thumb s={s} /><b>{s.name}</b><small>{seenWhen(s.last, today)}{s.where ? ` · ${s.where}` : ''}</small></button></li>)}</ol>
              </Card>
              <Card tint="#8A5BC4" label="Birding places here" glyph="calendar" className="span-3">
                {!(near.hotspots || []).length && <p className="muted">No public birding places reported near here.</p>}
                <ol className="bp-list">{(near.hotspots || []).map((h) => <li key={h.locId}><a className="bp-row" href={`https://maps.google.com/?q=${encodeURIComponent(`${h.name} ${here.town ? here.town.town : ''}`.trim())}`} target="_blank" rel="noopener noreferrer"><b>{h.name}</b><small className="fig">{h.species ? `${h.species} kinds this week · ` : ''}{MILES(h.km)} from the middle of the area</small></a></li>)}</ol>
              </Card>
              <SeenNearHere point={here.point} />
            </>
          )}
          {near && near.at && <p className="wx-credit span-6">Sightings here from <a href="https://ebird.org/" target="_blank" rel="noopener noreferrer">eBird</a>, asked about the area to about ten kilometres, never a closer point · photos from iNaturalist, credited. The cards after these are about home.</p>}
        </>
      )}
      {b && b.error && !list.length && <Card tint="#2E7F86" label="Birds" glyph="bird" className="span-6"><p className="muted" role="status">{outsideWords('birds', b)}</p></Card>}
      {highlights(list, today).length > 0 && <Card tint="#5F8A4A" label="Worth a look" glyph="star" className="span-6"><BirdHighlights list={list} today={today} onOpen={setOpen} titled={false} /></Card>}
      {line && <Card tint="#C0824F" label="Birding today" glyph="weather" className="span-6"><p>{line}</p><p className="muted small">From the weather at home; a guess, not a promise.</p></Card>}

      <Card tint="#2E7F86" label="Most reported this week" glyph="bird" tag={list.length ? `${list.length} kinds` : undefined} className="span-3">
        {!b && <p className="muted">Looking at this week’s sightings…</p>}
        <ol className="bp-list">{mostSeen(list, 8).map((s, i) => <li key={s.code}><button type="button" onClick={() => setOpen(s)}><span className="bp-rank fig">{i + 1}</span><Thumb s={s} /><b>{s.name}</b><small className="fig">{reportsWords(s)}</small></button></li>)}</ol>
      </Card>
      <Card tint="#5F8A4A" label="Rare near us" glyph="star" tag={rareOnes(list, 99).length ? `${rareOnes(list, 99).length} this week` : undefined} className="span-3">
        {b && !rareOnes(list).length && <p className="muted">Nothing unusual reported lately.</p>}
        <ol className="bp-list">{rareOnes(list, 8).map((s) => <li key={s.code}><button type="button" onClick={() => setOpen(s)}><Thumb s={s} /><b>{s.name}</b><small>{seenWhen(s.last, today)}{s.where ? ` · ${s.where}` : ''}</small></button></li>)}</ol>
      </Card>

      <Card tint="#8A5BC4" label="Birding places" glyph="calendar" className="span-3">
        {!more && <p className="muted">Looking for the busy spots…</p>}
        {more && more.error && <p className="muted" role="status">{outsideWords('birds', more)}</p>}
        {more && more.hotspots && !more.hotspots.length && !more.error && <p className="muted">No birding places reported near town.</p>}
        <ol className="bp-list">{((more && more.hotspots) || []).map((h) => <li key={h.locId}><a className="bp-row" href={mapsUrl(h.name)} target="_blank" rel="noopener noreferrer"><b>{h.name}</b><small className="fig">{h.species ? `${h.species} kinds this week · ` : ''}{MILES(h.km)} away</small></a></li>)}</ol>
        <p className="muted small">eBird’s public birding places, busiest first. Each opens the phone’s maps.</p>
      </Card>
      <Card tint="#2F7F9A" label="The county, yesterday" glyph="sunmoon" className="span-3">
        {more && more.county ? (
          <dl className="place-facts">
            <div><dt>Checklists</dt><dd className="fig">{more.county.checklists.toLocaleString('en-US')}</dd></div>
            <div><dt>Kinds of bird</dt><dd className="fig">{more.county.species.toLocaleString('en-US')}</dd></div>
            {more.county.contributors != null && <div><dt>People birding</dt><dd className="fig">{more.county.contributors.toLocaleString('en-US')}</dd></div>}
          </dl>
        ) : <p className="muted">{more ? 'Not available just now.' : 'Looking…'}</p>}
        <p className="muted small">San Bernardino County, as eBird counts it.</p>
      </Card>

      <Card tint="#B3263A" label="Where’s that bird?" glyph="bird" className="span-6">
        <label className="bp-find">Type a bird<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Roadrunner, hummingbird…" /></label>
        <ul className="bp-list">{found.map((s) => <li key={s.code}><button type="button" onClick={() => setOpen(s)}><b>{s.name}</b><small>{s.last ? 'seen this week' : 'reported in the county lately'}</small></button></li>)}</ul>
        {q.length >= 2 && !found.length && <p className="muted">No bird by that name in this month’s reports.</p>}
      </Card>

      <Card tint="#C0824F" label="About this month" glyph="calendar" tag={more && more.possible ? `${more.possible.length} more` : undefined} className="span-6">
        <p className="muted">Reported across the county in the last month, but not near town this week: worth watching for.</p>
        <ul className="bp-chips">{((more && more.possible) || []).slice(0, 18).map((s) => <li key={s.code}><button type="button" onClick={() => setOpen(s)}>{s.name}</button></li>)}</ul>
      </Card>

      <Card tint="#E0662F" label="Bird bingo" glyph="star" tag={lines ? `${lines} ${lines === 1 ? 'line' : 'lines'}` : undefined} className="span-6">
        {card.length < 9 ? <p className="muted">Not enough birds reported this week for a card yet.</p> : (
          <>
            <p className="muted">Nine birds that were reported near us this week. Tap each one you spot. A new card every Sunday.</p>
            <ul className="bp-bingo">{card.map((s) => <li key={s.code}><button type="button" aria-pressed={ticks.includes(s.code)} onClick={() => tick(s.code)}><Thumb s={s} /><b>{s.name}</b></button></li>)}</ul>
            {lines >= 8 && <p className="nudge">A full card. Wonderful.</p>}
          </>
        )}
      </Card>
      {b && b.at && <p className="wx-credit span-6">Sightings from <a href="https://ebird.org/" target="_blank" rel="noopener noreferrer">eBird</a> (Cornell Lab of Ornithology) within about ten miles of town · photos from iNaturalist, credited</p>}
      {open && <BirdSheet s={open} today={today} nearby={!open.away} onClose={() => setOpen(null)} />}
    </>
  )
}

/** One bird: its photo, when and where it was last seen, and the nearest recent sightings to home (asked when it opens; not for a bird seen away). */
function BirdSheet({ s, today, onClose, nearby = true }) {
  const [near, setNear] = useState(null)
  useEffect(() => { if (!nearby) return undefined; let live = true; askNearest(s.code).then((d) => { if (live) setNear(d) }); return () => { live = false } }, [s.code, nearby])
  if (!nearby) {
    return (
      <Sheet title={s.name} onClose={onClose} className="bd-sheet">
        {s.photo && <figure className="bd-photo"><img src={s.photo.url} alt={s.name} referrerPolicy="no-referrer" /><figcaption>{s.photo.credit}</figcaption></figure>}
        {s.sci && <p className="bd-sci">{s.sci}</p>}
        {s.notable && <p className="nudge">Notable: rare here, or here at an unusual time of year.</p>}
        <dl className="place-facts">
          <div><dt>Last seen</dt><dd>{seenWhen(s.last, today)}{s.where ? `, at ${s.where}` : ', at a private spot'}</dd></div>
          {s.count > 0 && <div><dt>As many as</dt><dd className="fig">{s.count}</dd></div>}
          {s.reports > 0 && <div><dt>Recent checklists</dt><dd className="fig">{s.reports} of {s.sample}</dd></div>}
        </dl>
        <div className="place-go">
          <a className="btn" href={ebirdSpeciesUrl(s.code)} target="_blank" rel="noopener noreferrer">About this bird</a>
          {s.checklist && <a className="btn ghost" href={ebirdChecklistUrl(s.checklist)} target="_blank" rel="noopener noreferrer">The sighting</a>}
        </div>
      </Sheet>
    )
  }
  return (
    <Sheet title={s.name} onClose={onClose} className="bd-sheet">
      {s.photo && <figure className="bd-photo"><img src={s.photo.url} alt={s.name} referrerPolicy="no-referrer" /><figcaption>{s.photo.credit}</figcaption></figure>}
      {s.sci && <p className="bd-sci">{s.sci}</p>}
      {s.notable && <p className="nudge">Notable: rare round here, or here at an unusual time of year.</p>}
      <h3 className="bp-h">Nearest recent sightings</h3>
      {!near && <p className="muted">Looking…</p>}
      {near && near.error && <p className="muted">Not available just now.</p>}
      {near && near.sightings && !near.sightings.length && <p className="muted">None reported within about 30 miles in the last two weeks.</p>}
      <ul className="bp-list">{((near && near.sightings) || []).map((x, i) => <li key={i}><span className="bp-row"><b>{x.where || 'A private spot'}</b><small className="fig">{seenWhen(x.when, today)} · {MILES(x.km)} away{x.count ? ` · ${x.count} seen` : ''}{x.checklist && <> · <a href={ebirdChecklistUrl(x.checklist)} target="_blank" rel="noopener noreferrer">sighting</a></>}</small></span></li>)}</ul>
      <div className="place-go"><a className="btn" href={ebirdSpeciesUrl(s.code)} target="_blank" rel="noopener noreferrer">About this bird</a></div>
    </Sheet>
  )
}

const SEEN_GROUPS = [['Mammalia', 'Mammals'], ['Plantae', 'Plants'], ['Reptilia', 'Reptiles'], ['Insecta', 'Insects']]
/** What iNaturalist's observers have seen near here this month, besides birds: asked by the phone, the place to about a kilometre. */
function SeenNearHere({ point }) {
  const [taxon, setTaxon] = useState('Mammalia')
  const [state, setState] = useState({ list: null, error: null })
  const month = new Date().getMonth() + 1
  const lat = round2(point.lat), lng = round2(point.lng)
  useEffect(() => {
    let live = true
    const key = `teamhicks.seen.${lat},${lng}.${month}.${taxon}`
    setState({ list: null, error: null })
    ;(async () => {
      try {
        let kept = null
        try { kept = JSON.parse(sessionStorage.getItem(key)) } catch { /* nothing kept */ }
        if (!kept) {
          const r = await fetch(sightingsUrl(lat, lng, month, taxon))
          if (!r.ok) throw new Error(String(r.status))
          kept = await r.json()
          try { sessionStorage.setItem(key, JSON.stringify(kept)) } catch { /* fine */ }
        }
        if (live) setState({ list: shapeSightings(kept).slice(0, 8), error: null })
      } catch { if (live) setState({ list: null, error: 'iNaturalist couldn’t be reached just now.' }) }
    })()
    return () => { live = false }
  }, [lat, lng, month, taxon])
  return (
    <Card tint="#4E6C3D" label="Also seen near here this month" glyph="star" className="span-3">
      <div className="choice-row" role="group" aria-label="What kind">{SEEN_GROUPS.map(([k, l]) => <button key={k} type="button" aria-pressed={taxon === k} onClick={() => setTaxon(k)}>{l}</button>)}</div>
      {!state.list && !state.error && <p className="muted">Looking…</p>}
      {state.error && <p className="muted">{state.error}</p>}
      {state.list && !state.list.length && <p className="muted">None recorded near here this month.</p>}
      {state.list && state.list.length > 0 && (
        <ul className="bp-seen">{state.list.map((x) => <li key={x.id}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.photo ? <img src={x.photo} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="bp-none" aria-hidden="true" />}<b>{x.name}</b><small>{x.count} {x.count === 1 ? 'observation' : 'observations'}{x.credit ? ` · photo ${x.credit}` : ''}</small></a></li>)}</ul>
      )}
      <p className="muted small">Research-grade observations on iNaturalist within about 12 km, in this month of any year.</p>
    </Card>
  )
}
