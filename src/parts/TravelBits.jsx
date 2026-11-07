import { useEffect, useState } from 'react'
import SunCalc from 'suncalc'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { Toast } from '../ui/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { useDraft } from '../lib/useDraft.js'
import { useAround } from '../lib/useAround.js'
import { useHereForecast } from '../lib/useWeather.js'
import { useBirdsNear } from '../lib/useOutside.js'
import { usePostcards, sendPostcard, removePostcard } from '../lib/useYonder.js'
import { useOutings } from '../lib/useLife.js'
import { reducedMotion } from '../lib/motion.js'
import { PRAYERS } from '../lib/cal/prayers.js'
import { HOME_TOWN, SKIES, phaseOf, skyGradient } from '../lib/sky.js'
import { placeWords, clockIn } from '../lib/here.js'
import { ABROAD, fxUrl, shapeFx, onThisDayTrips, zoneShiftWords, offsetMin, stampKind } from '../lib/yonder.js'
import { aroundPlace } from './AroundCard.jsx'
import { usePlacePainting } from './AroundBits.jsx'
import PaintingFrame from './PaintingFrame.jsx'
import Stamp from '../places/yonder/Stamp.jsx'
import '../places/yonder/yonder.css'

// The travel app's touches on Home: the postcard, a trip quest for Anna, a prayer
// for the road, two skies, abroad, snow where we are, crossing a time zone, and a
// year ago today. Each shows only when it has something real to say.

/** A postcard's front: Laurie's painting or the place's credited photo, the stamp, the words, who from. */
export function PostcardFront({ card, from, photo = null, painting = null }) {
  return (
    <figure className="yo-postcard">
      <div className="yo-pc-front">
        {painting ? <PaintingFrame painting={painting} label={`${painting.title}, a painting by Laurie`} style={{ aspectRatio: '3 / 2' }} />
          : photo ? <img src={photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
          : <span className="yo-pc-drawn" aria-hidden="true">{card.town}</span>}
      </div>
      <figcaption className="yo-pc-back">
        <Stamp kind={stampKind({ title: card.town, place: card.region || '' })} name={card.town} date={card.on_date} size={48} tilt={6} />
        <p className="yo-pc-words">{card.words || `Greetings from ${card.town}.`}</p>
        <p className="yo-pc-from">{from ? `${from}, ` : ''}{placeWords({ town: card.town, region: card.region || '', cc: card.cc || '' })}</p>
        {photo && !painting && <small className="yo-pc-credit">{photo.credit}</small>}
      </figcaption>
    </figure>
  )
}

/**
 * Write a postcard to the family from where you are: the front is Laurie's painting
 * of the place where she painted it, else the place's photo. It keeps the town and the
 * day (never a point) and lands on the others' Home. Kept until sent; an Undo after.
 */
export function PostcardForm({ here, me, today }) {
  const place = aroundPlace(here)
  const { map } = useAround(place)
  const town = (here.town && here.town.town) || (here.place && here.place.town) || ''
  const painting = usePlacePainting(town, here.place)
  const photo = (map && map.hero && map.hero.photo) || (map && (map.sights || []).find((s) => s.photo) || {}).photo || null
  const [draft, setDraft, clear] = useDraft(`postcard.${today}.${town}`, { words: '' })
  const cards = usePostcards(me ? true : null, today)
  const mine = (cards.rows || []).filter((c) => me && c.member_id === me.id && c.town === town)
  const [toast, setToast] = useState(null)
  if (!town || !me) return null
  const send = async () => {
    const row = { on_date: today, town: town.slice(0, 120), region: (here.town && here.town.region) || null, cc: (here.town && /^[A-Z]{2}$/.test(here.town.cc || '') ? here.town.cc : null), words: draft.words.trim().slice(0, 280) }
    const { data, error } = await sendPostcard(row)
    if (error) { setToast({ text: 'It couldn’t be sent just now.', undo: () => setToast(null) }); return }
    clear(); cards.reload()
    setToast({ text: 'Sent to the family.', undo: async () => { await removePostcard(data.id); cards.reload(); setToast(null) } })
  }
  return (
    <section className="yo-pc-write" aria-label="A postcard">
      <h3>A postcard from {town}</h3>
      {mine.length > 0 ? <PostcardFront card={mine[0]} from={me.name} photo={photo} painting={painting} /> : (
        <>
          <PostcardFront card={{ town, region: here.town && here.town.region, cc: here.town && here.town.cc, on_date: today, words: draft.words }} from={me.name} photo={photo} painting={painting} />
          <textarea id="pc-words" aria-label="Your words on the postcard" rows={3} maxLength={280} value={draft.words} placeholder={`Greetings from ${town}…`} onChange={(e) => setDraft({ words: e.target.value })} />
          <div className="form-actions"><button type="button" className="btn" onClick={send}>Send it to the family</button></div>
          <p className="muted small">The family sees it on Home with the town and the day; it goes in this trip’s scrapbook.</p>
        </>
      )}
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </section>
  )
}

/**
 * A trip quest for Anna, from real things here: a bird reported this week, the
 * guide's first thing for her, the local food. Each becomes a task in her academy
 * (a star when it's done). Anyone in the family can start it; an Undo after.
 */
export function TripQuest({ here, trip, guide }) {
  const near = useBirdsNear(here && here.point)
  const [toast, setToast] = useState(null)
  const bird = near && near.species ? near.species.find((b) => !b.notable && b.photo) || near.species[0] : null
  const sec = (k) => guide && (guide.sections || []).find((s) => s.key === k)
  const items = [
    bird && `Spot a ${bird.name}`,
    sec('anna') && sec('anna').items[0] && `Visit ${sec('anna').items[0].name}`,
    sec('local-food') && sec('local-food').items[0] && `Try ${sec('local-food').items[0].name}`,
    sec('hikes') && sec('hikes').items[0] && `Hike ${sec('hikes').items[0].name}`,
  ].filter(Boolean).slice(0, 4)
  if (!supabase || items.length < 2) return null
  const start = async () => {
    const { data, error } = await supabase.from('academy_tasks').insert(items.map((t) => ({ title: t.slice(0, 200), subject: 'Trip quest', due_on: trip.ends_on }))).select('id')
    if (error) { setToast({ text: 'The quest couldn’t be made just now.', undo: () => setToast(null) }); return }
    setToast({ text: `Anna’s trip quest is in her academy: ${items.length} things, a star for each.`, undo: async () => { await supabase.from('academy_tasks').delete().in('id', (data || []).map((r) => r.id)); setToast(null) } })
  }
  return (
    <section className="yo-quest" aria-label="A trip quest for Anna">
      <h3>A trip quest for Anna</h3>
      <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
      <button type="button" className="btn ghost" onClick={start}>Put it in her academy</button>
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </section>
  )
}

/** Home, on the morning a calendar trip begins: a prayer for the road, with the app's usual invitation. */
export function PrayerForTheRoad({ trip, hour }) {
  if (!trip || trip.inDays !== 0 || hour >= 13) return null
  return (
    <Card tint="#B3263A" label="For the road" glyph="candle" className="span-3">
      <p>Before you set off for {String(trip.place || trip.title).split(',')[0]}, a moment to pray together, if you’d like.</p>
      <blockquote className="yo-prayer">I have lifted up my eyes to the mountains, from whence help shall come to me. My help is from the Lord, who made heaven and earth.<cite>Psalm 120 (121), Douay-Rheims</cite></blockquote>
      <blockquote className="yo-prayer">{PRAYERS.guardianAngel.text}<cite>{PRAYERS.guardianAngel.name}</cite></blockquote>
      <p className="yo-prayer-end">Saint Raphael, patron of travellers, pray for us.</p>
    </Card>
  )
}

/** In another time zone: the sky here and the sky at home, side by side, with both clocks. */
export function TwoSkies({ here, now }) {
  if (!here.point || !here.tz || here.tz === HOME_TOWN.tz) return null
  const k1 = phaseOf(now, SunCalc.getTimes(now, here.point.lat, here.point.lng)), k2 = phaseOf(now, SunCalc.getTimes(now, HOME_TOWN.lat, HOME_TOWN.lng))
  const where = placeWords(here.town) || 'Here'
  return (
    <Card tint="#2F3F7A" label="Two skies" glyph="sunmoon" className="span-3 yo-two">
      <div className="yo-two-skies">
        <div className={SKIES[k1].dark ? 'dark' : ''} style={{ background: skyGradient(k1) }}><b className="fig">{clockIn(now, here.tz)}</b><span>{SKIES[k1].name} in {where}</span></div>
        <div className={SKIES[k2].dark ? 'dark' : ''} style={{ background: skyGradient(k2) }}><b className="fig">{clockIn(now, HOME_TOWN.tz)}</b><span>{SKIES[k2].name} at home</span></div>
      </div>
    </Card>
  )
}

/** Abroad: a few words, the money, the plugs and the emergency number (to check before going). */
export function AbroadCard({ here }) {
  const cc = here.town && here.town.cc
  const facts = cc && cc !== 'US' ? ABROAD[cc] : null
  const url = facts ? fxUrl(facts.money) : null
  const [fx, setFx] = useState(null)
  useEffect(() => {
    let live = true
    if (!url) return undefined
    fetch(url).then((r) => (r.ok ? r.json() : null)).then((j) => { if (live) setFx(shapeFx(j, facts.money)) }).catch(() => {})
    return () => { live = false }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!cc || cc === 'US') return null
  const country = (here.town && here.town.country) || cc
  return (
    <Card tint="#5A6B7A" label={`In ${country}`} glyph="star" className="span-3">
      {!facts && <p className="muted">Nothing kept for {country} yet: its words, plugs and emergency number to come.</p>}
      {facts && (
        <dl className="place-facts">
          {facts.words.length > 0 && <div><dt>Words</dt><dd>{facts.words.map(([en, w]) => `${en}: ${w}`).join(' · ')}</dd></div>}
          <div><dt>Money</dt><dd>{facts.money}{fx ? ` · $1 is about ${fx.rate} (${fx.date})` : ''}</dd></div>
          <div><dt>Plugs</dt><dd>{facts.plugs}</dd></div>
          <div><dt>Emergency</dt><dd className="fig">{facts.call}</dd></div>
        </dl>
      )}
      <p className="muted small">Worth checking before you go. The rate is the European Central Bank’s, through Frankfurter.</p>
    </Card>
  )
}

/** Snow where we are: if it's really snowing here, a few flakes drift over the page for half a minute. Drawn in code; never under less motion. */
export function SnowHere({ here }) {
  const { forecast: f } = useHereForecast(here.tier === 'away' ? here.point : null)
  const snowing = Boolean(f && f.now.pic === 'snow')
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!snowing || reducedMotion()) return undefined
    setOn(true)
    const t = setTimeout(() => setOn(false), 30000)
    return () => clearTimeout(t)
  }, [snowing])
  if (!on) return null
  return <div className="yo-snow" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.9}s`, animationDuration: `${7 + (i % 5)}s`, '--s': 0.5 + ((i * 13) % 10) / 12 }} />)}</div>
}

/** "You just gained an hour", the first time the app opens after crossing a time zone. */
export function ZoneShift({ here }) {
  if (!here.shift || Date.now() - here.shift.at > 3 * 3600e3) return null
  const words = zoneShiftWords(offsetMin(here.shift.from), offsetMin(here.shift.to))
  if (!words) return null
  return <p className="yo-zone span-6" role="status">{words}</p>
}

/** A year ago today (or more): a trip kept that began on this day, with its postcard. */
export function YearAgoTrips({ session, today }) {
  const outings = useOutings(session)
  const found = onThisDayTrips(outings.rows, today)[0]
  if (!found) return null
  const o = found.outing
  return (
    <Card tint="#C9863F" label={found.years === 1 ? 'A year ago today' : `${found.years} years ago today`} glyph="star" className="span-3">
      <Link className="yo-ago" to={`/yonder/trip/${o.id}`}>
        <Stamp kind={stampKind(o)} name={String(o.place || o.title).split(',')[0]} date={o.starts_on} size={58} tilt={-4} />
        <span><b>{o.title}</b><small>Its scrapbook: the hikes, recipes, birds and postcards ›</small></span>
      </Link>
    </Card>
  )
}
