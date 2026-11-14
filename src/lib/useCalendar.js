import { onePerPerson, sameDaysOnce } from './cal/people.js'
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/** Every row of a query, a thousand at a time: Supabase stops at 1000 without saying. */
export async function fetchAll(build, size = 1000) {
  const out = []
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1)
    if (error) return { data: null, error }
    out.push(...data)
    if (data.length < size) return { data: out, error: null }
  }
}

/** The family, their days, and the calendar sources (which school is whose), once per sign-in. */
export function useFamily(session) {
  const [state, setState] = useState({ members: [], people: [], canon: (id) => id, days: [], sources: [], loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ members: [], people: [], canon: (id) => id, days: [], sources: [], loaded: Boolean(supabase && session === null), error: null }); return undefined }
    Promise.all([
      supabase.from('family_members').select('id, name, email, role, colour').order('name'),
      fetchAll(() => supabase.from('family_days').select('id, title, month, day, year, kind, for_whom, note').order('month').order('day')),
      supabase.from('sources').select('id, title, kind, purpose, for_whom').eq('purpose', 'calendar'),
    ]).then(([m, d, s]) => {
      if (!live) return
      const error = (m.error || d.error || s.error || {}).message || null
      const members = m.data || [], { people, canon } = onePerPerson(members)
      setState({ members, people, canon, days: sameDaysOnce((d.data || []).map((x) => ({ ...x, for_whom: canon(x.for_whom) }))), sources: (s.data || []).map((x) => ({ ...x, for_whom: canon(x.for_whom) })), loaded: true, error })
    })
    return () => { live = false }
  }, [session, n])
  return { ...state, reload: () => setN((x) => x + 1) }
}

/** Approved events that touch the days from `from` to `to`. */
export function useEvents(session, from, to) {
  const [state, setState] = useState({ events: [], error: null })
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ events: [], error: null }); return undefined }
    fetchAll(() => supabase.from('calendar_events')
      .select('id, source_id, title, starts_on, ends_on, starts_at, ends_at, kind, for_whom, notes, place, lat, lng, outdoors')
      .eq('status', 'approved').lte('starts_on', to).gte('ends_on', from)
      .order('starts_on').order('id'))
      .then(({ data, error }) => { if (live) setState({ events: data || [], error: error ? error.message : null }) })
    return () => { live = false }
  }, [session, from, to])
  return state
}

/**
 * Approved events with a place on the map that start after `today`, however far
 * off: the trips still to come (plannedTrips in src/lib/yonder.js picks the ones
 * away from home). A place-less event is never a trip, so the query stays small.
 */
export function useTripEvents(session, today) {
  const [state, setState] = useState({ events: [], loaded: false, error: null })
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ events: [], loaded: Boolean(session === null), error: null }); return undefined }
    fetchAll(() => supabase.from('calendar_events')
      .select('id, source_id, title, starts_on, ends_on, starts_at, ends_at, kind, for_whom, notes, place, lat, lng, outdoors')
      .eq('status', 'approved').gt('starts_on', today).not('lat', 'is', null).not('lng', 'is', null)
      .order('starts_on').order('id'))
      .then(({ data, error }) => { if (live) setState({ events: data || [], loaded: true, error: error ? error.message : null }) })
    return () => { live = false }
  }, [session, today])
  return state
}

/** One event, by id. */
export function useEvent(session, id) {
  const [state, setState] = useState({ event: null, loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session || !id) { setState({ event: null, loaded: Boolean(session === null), error: null }); return undefined }
    supabase.from('calendar_events').select('*').eq('id', id).maybeSingle()
      .then(({ data, error }) => { if (live) setState({ event: data || null, loaded: true, error: error ? error.message : null }) })
    return () => { live = false }
  }, [session, id, n])
  return { ...state, reload: () => setN((x) => x + 1) }
}

/** Add or change an event the family made (not one read from a feed). */
export async function saveEvent(row, id) {
  return id ? supabase.from('calendar_events').update(row).eq('id', id).is('source_id', null).select('id').single()
    : supabase.from('calendar_events').insert({ ...row, status: 'approved' }).select('id').single()
}
export async function deleteEvent(id) { return supabase.from('calendar_events').delete().eq('id', id) }
