import SunCalc from 'suncalc'
import { Card } from '../ui/Card.jsx'
import { Link } from '../shell/Link.jsx'
import { navigate } from '../lib/router.js'
import { useAround } from '../lib/useAround.js'
import { useHereForecast } from '../lib/useWeather.js'
import { cellIdOf, sectionOrder, ordered } from '../lib/around.js'
import { placeWords, clockIn, hourIn } from '../lib/here.js'
import { useNow } from '../lib/useNow.js'
import { AroundHero, ItemTile, usePlacePainting, WHAT_WAS_SENT } from './AroundBits.jsx'
import '../places/world/around.css'

/** The area the phone is in, as the guide functions are told it. */
export function aroundPlace(here) {
  if (!here || !here.point) return null
  return { cell: cellIdOf(here.point), town: (here.town && here.town.town) || (here.place && here.place.town) || '', region: (here.town && here.town.region) || '', cc: (here.town && here.town.cc) || (here.place ? 'US' : '') }
}

/**
 * "What's around here?" on Home. Away, it appears by itself and the guide writes
 * itself (no button); its first sections come in the moment's order, each a row of
 * photo cards, and everything opens the full guide. Out and about, a small card
 * that offers the guide.
 */
export default function AroundCard({ here }) {
  const now = useNow()
  const away = here && here.tier === 'away' && here.point
  const near = here && here.tier === 'near' && here.point
  const place = away || near ? aroundPlace(here) : null
  const { map, guide, building, error } = useAround(away ? place : null, { auto: true })
  const { forecast: f, tz, elevation } = useHereForecast(away ? here.point : null)
  const where = placeWords(here && here.town) || (place && place.town) || 'here'
  const painting = usePlacePainting(place && place.town, here && here.place)
  if (!place) return null
  if (near) {
    return (
      <Card tint="#B5658F" label={`What’s around ${where}?`} glyph="star" className="span-3 ar-card">
        <p>A guide to {where}: hikes, coffee roasters, brewpubs, the local food, things for Anna, records and books.</p>
        <Link className="btn ghost" to="/world/around">Show me ›</Link>
      </Card>
    )
  }
  const hour = hourIn(now, tz || 'America/Los_Angeles')
  const rainy = Boolean(f && ['rain', 'drizzle', 'thunder', 'snow'].includes(f.now.pic))
  const weekday = new Date(now.toLocaleString('en-US', { timeZone: tz || 'America/Los_Angeles' })).getDay()
  const sections = guide ? ordered(guide.sections, sectionOrder({ hour, rainy, weekday })).slice(0, 3) : []
  const sun = SunCalc.getTimes(now, here.point.lat, here.point.lng)
  const facts = [elevation != null ? `${Math.round(elevation * 3.281).toLocaleString('en-US')} ft` : null, f ? `${f.now.temp}° ${f.now.words.toLowerCase()}` : null, now < sun.sunset ? `sunset ${clockIn(sun.sunset, tz || 'America/Los_Angeles')}` : null].filter(Boolean).join(' · ')
  const photo = (map && map.hero && map.hero.photo) || (map && (map.sights || []).find((s) => s.photo) || {}).photo || null
  return (
    <Card tint="#B5658F" label="What’s around here?" glyph="star" className="span-6 ar-card">
      <AroundHero painting={painting} photo={photo} title={where} />
      <div className="ar-head">
        <h2 className="ar-town">{where}</h2>
        {facts && <p className="ar-facts">{facts}</p>}
        {guide && guide.intro && <p>{guide.intro}</p>}
        {!guide && map && map.hero && map.hero.extract && <p>{map.hero.extract}</p>}
      </div>
      {building && <p className="ar-working" role="status"><span aria-hidden="true" className="ar-dots" /> Writing your guide to {where}: hikes, roasters, brewpubs and the rest. It takes about a minute, and it’ll be here for the whole family after.</p>}
      {!building && !guide && error && <p className="muted" role="status">{error}</p>}
      {sections.map((s) => (
        <section key={s.key} className="ar-rail-wrap" aria-label={s.title}>
          <h3>{s.title}</h3>
          <div className="ar-rail">{s.items.slice(0, 5).map((it) => <ItemTile key={it.name} item={it} section={s.key} onOpen={() => navigate('/world/around')} />)}</div>
        </section>
      ))}
      {!guide && map && (map.sights || []).length > 0 && (
        <section className="ar-rail-wrap" aria-label="Near here">
          <h3>Near here</h3>
          <div className="ar-rail">{map.sights.slice(0, 6).map((s) => <ItemTile key={s.title} item={{ name: s.title, why: s.extract, photo: s.photo }} section="village" onOpen={() => navigate('/world/around')} />)}</div>
        </section>
      )}
      <Link className="btn" to="/world/around">{guide ? 'The whole guide ›' : 'What’s around here ›'}</Link>
      <p className="ar-note">{WHAT_WAS_SENT} Places from © OpenStreetMap contributors and Wikipedia.</p>
    </Card>
  )
}
