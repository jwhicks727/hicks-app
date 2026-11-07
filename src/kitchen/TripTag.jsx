import { useState } from 'react'
import { Link } from '../shell/Link.jsx'
import { Toast } from '../ui/Toast.jsx'
import { useSession } from '../lib/auth.js'
import { useEvents } from '../lib/useCalendar.js'
import { useOutings } from '../lib/useLife.js'
import { useHere } from '../lib/useHere.js'
import { useNow } from '../lib/useNow.js'
import { useTripRecipes, tagRecipe, untagRecipe, ensureOuting } from '../lib/useYonder.js'
import { useHereForecast } from '../lib/useWeather.js'
import { currentTrip, altitudeWords } from '../lib/yonder.js'
import { todayAt } from '../lib/cal/dates.js'
import { HOME_TOWN } from '../lib/sky.js'

// Recipes and trips (issue #19, Jason's ask): a recipe written while we're away is
// tagged to the trip, a recipe cooked there can say so, and any recipe's page can add
// it to a kept trip, so the scrapbooks and memories hold them. Parents only, as
// recipes are. Ticking "from our trip" keeps the trip if nobody had yet.

/** The trip we're on today, if any (a calendar trip, a kept one, or today away). */
export function useCurrentTrip() {
  const session = useSession()
  const now = useNow()
  const today = todayAt(HOME_TOWN.tz, now)
  const here = useHere()
  const { events } = useEvents(session, today, today)
  const outings = useOutings(session)
  return { trip: currentTrip({ events, outings: outings.rows, here, today, home: HOME_TOWN }), today, reloadOutings: outings.reload }
}

const HOW = { found: 'Found there', cooked: 'Cooked there', 'brought-home': 'Brought home' }

/** The recipe page's trips: which kept trips it belongs to, and a parent can add or remove one. */
export function TripTags({ recipeId, parent, me }) {
  const session = useSession()
  const tags = useTripRecipes(session)
  const outings = useOutings(session)
  const [pick, setPick] = useState(''), [how, setHow] = useState('found')
  const [toast, setToast] = useState(null)
  const [pending, setPending] = useState(() => { try { return JSON.parse(sessionStorage.getItem('teamhicks.trip-tag')) } catch { return null } })
  const mine = (tags.rows || []).filter((t) => t.recipe_id === recipeId)
  const tripOf = (id) => (outings.rows || []).find((o) => o.id === id)
  if (!recipeId || (!mine.length && !parent)) return null
  const add = async (outingId, h) => {
    const { error } = await tagRecipe(outingId, recipeId, h)
    if (error) { setToast({ text: 'It couldn’t be added just now.', undo: () => setToast(null) }); return }
    tags.reload()
    setToast({ text: `Added to ${(tripOf(outingId) || {}).title || 'the trip'}.`, undo: async () => { await untagRecipe(outingId, recipeId, h); tags.reload(); setToast(null) } })
  }
  return (
    <div className="kt-trips">
      {mine.length > 0 && <p className="muted small">From our trips: {mine.map((t, i) => { const o = tripOf(t.outing_id); return o ? <span key={t.outing_id + t.how}>{i ? ' · ' : ''}<Link to={`/yonder/trip/${o.id}`}>{o.title}</Link> ({HOW[t.how].toLowerCase()})</span> : null })}</p>}
      {parent && pending && (
        <p className="nudge">Add this to the trip to {pending.title}, as brought home?{' '}
          <button type="button" className="btn ghost" onClick={async () => { await add(pending.outing_id, pending.how || 'brought-home'); try { sessionStorage.removeItem('teamhicks.trip-tag') } catch { /* fine */ } setPending(null) }}>Add it</button>{' '}
          <button type="button" className="btn ghost" onClick={() => { try { sessionStorage.removeItem('teamhicks.trip-tag') } catch { /* fine */ } setPending(null) }}>Not this one</button>
        </p>
      )}
      {parent && (outings.rows || []).length > 0 && (
        <form className="kt-add" onSubmit={(e) => { e.preventDefault(); if (pick) add(pick, how) }}>
          <label>Add to a trip
            <select value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Choose a trip…</option>
              {(outings.rows || []).slice(0, 60).map((o) => <option key={o.id} value={o.id}>{o.title} ({o.starts_on.slice(0, 7)})</option>)}
            </select>
          </label>
          <select value={how} onChange={(e) => setHow(e.target.value)} aria-label="How it belongs to the trip">
            {Object.entries(HOW).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="btn ghost" disabled={!pick}>Add</button>
        </form>
      )}
      {toast && <Toast action="Undo" onAction={toast.undo} onClose={() => setToast(null)}>{toast.text}</Toast>}
    </div>
  )
}

/** For the editor: tag the new recipe to today's trip once it's saved (keeping the trip if needed). */
export async function tagToTrip(trip, recipeId, me, how = 'found') {
  const outingId = await ensureOuting(trip, me)
  if (!outingId || !recipeId) return false
  const { error } = await tagRecipe(outingId, recipeId, how)
  return !error
}

/** Cook mode, at height: a word on cooking up here, from the forecast's height for where we are. */
export function AltitudeNote() {
  const here = useHere()
  const away = here.tier === 'away' ? here.point : null
  const { elevation } = useHereForecast(away)
  const words = elevation != null ? altitudeWords(elevation * 3.281) : ''
  return words ? <p className="cm-altitude" role="note">{words}</p> : null
}

/** Cook mode's end, on a trip: "Cooked on our trip to Big Bear" (a parent's tap). */
export function CookedOnTrip({ recipeId, parent, me = null }) {
  const { trip } = useCurrentTrip()
  const session = useSession()
  const [done, setDone] = useState(false)
  if (!parent || !trip || !session || !recipeId) return null
  return done
    ? <p className="nudge">In the trip’s scrapbook: cooked in {trip.town}.</p>
    : <button type="button" className="btn ghost" onClick={async () => { if (await tagToTrip(trip, recipeId, me, 'cooked')) setDone(true) }}>Cooked on our trip to {trip.town}</button>
}
