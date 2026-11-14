import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { saveOuting } from './useLife.js'

// ============================================
// useYonder -- the travel app's own rows: postcards, packing, hikes, Someday, trip recipes
// ============================================
// Everything here is something one of us chose to keep (docs/DATABASE.md, the
// travel app). The family reads it all; each adds their own; the policies say
// who may remove what. Never anything made from where a phone has been.

function useRows(session, fetcher, deps = [], enabled = true) {
  const [state, setState] = useState({ rows: [], loaded: false })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session || !enabled) { setState({ rows: [], loaded: true }); return undefined }
    fetcher().then(({ data }) => { if (live) setState({ rows: data || [], loaded: true }) }, () => { if (live) setState({ rows: [], loaded: true }) })
    return () => { live = false }
  }, [session, enabled, n, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

export const usePostcards = (session, since) => useRows(session, () => supabase.from('postcards').select('*').gte('on_date', since).order('created_at', { ascending: false }).limit(200), [since])
export const sendPostcard = (row) => supabase.from('postcards').insert(row).select('id').single()
export const removePostcard = (id) => supabase.from('postcards').delete().eq('id', id)

// A planned trip's page: where we're staying and our plans (src/lib/tripPlan.js checks each row first)
export const useTripStays = (session, eventId) => useRows(session, () => supabase.from('trip_stays').select('*').eq('event_id', eventId).order('from_date', { nullsFirst: true }).order('created_at'), [eventId], Boolean(eventId))
export const addStay = (row) => supabase.from('trip_stays').insert(row).select('id').single()
export const updateStay = (id, row) => supabase.from('trip_stays').update(row).eq('id', id)
export const removeStay = (id) => supabase.from('trip_stays').delete().eq('id', id)
export const useTripPlans = (session, eventId) => useRows(session, () => supabase.from('trip_plans').select('*').eq('event_id', eventId).order('on_date', { nullsFirst: false }).order('at_time', { nullsFirst: false }).order('created_at').limit(500), [eventId], Boolean(eventId))
export const addPlan = (row) => supabase.from('trip_plans').insert(row).select('id').single()
export const updatePlan = (id, row) => supabase.from('trip_plans').update(row).eq('id', id)
export const removePlan = (id) => supabase.from('trip_plans').delete().eq('id', id)

export const usePacking = (session, eventId) => useRows(session, () => supabase.from('packing_items').select('*').eq('event_id', eventId).order('suggested').order('created_at'), [eventId], Boolean(eventId))
export const addPacking = (eventId, title, suggested = false) => supabase.from('packing_items').insert({ event_id: eventId, title: String(title).slice(0, 120), suggested }).select('id').single()
export const tickPacking = (id, done) => supabase.from('packing_items').update({ done }).eq('id', id)
export const removePacking = (id) => supabase.from('packing_items').delete().eq('id', id)

export const useHikes = (session) => useRows(session, () => supabase.from('trip_hikes').select('*').order('on_date', { ascending: false }).limit(1000))
export const tickHike = (row) => supabase.from('trip_hikes').insert(row).select('id').single()
export const untickHike = (id) => supabase.from('trip_hikes').delete().eq('id', id)

export const useSomeday = (session) => useRows(session, () => supabase.from('someday').select('*').order('created_at', { ascending: false }).limit(500))
export const heart = (row) => supabase.from('someday').insert(row).select('id').single()
export const unheart = (id) => supabase.from('someday').delete().eq('id', id)

export const useTripRecipes = (session) => useRows(session, () => supabase.from('trip_recipes').select('outing_id, recipe_id, how, added_at').limit(1000))
export const tagRecipe = (outingId, recipeId, how = 'found') => supabase.from('trip_recipes').upsert({ outing_id: outingId, recipe_id: recipeId, how }, { onConflict: 'outing_id,recipe_id,how', ignoreDuplicates: true })
export const untagRecipe = (outingId, recipeId, how) => supabase.from('trip_recipes').delete().eq('outing_id', outingId).eq('recipe_id', recipeId).eq('how', how)

/** The trip as an outing: the one already kept, or kept now (ticking "from our trip" says so). Returns its id or null. */
export async function ensureOuting(trip, me) {
  if (!trip) return null
  if (trip.outing_id) return trip.outing_id
  const row = { kind: 'trip', title: String(trip.title).slice(0, 120), starts_on: trip.starts_on, ends_on: trip.ends_on, place: trip.place ? String(trip.place).slice(0, 200) : null, ...(trip.event_id ? { event_id: trip.event_id } : {}) }
  const { data, error } = await saveOuting(row, null, me)
  if (!error && data) return data.id
  if (trip.event_id) { // kept a moment ago on another phone
    const { data: kept } = await supabase.from('outings').select('id').eq('event_id', trip.event_id).maybeSingle()
    return kept ? kept.id : null
  }
  return null
}
