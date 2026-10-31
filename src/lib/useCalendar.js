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
  const [state, setState] = useState({ members: [], days: [], sources: [], loaded: false, error: null })
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ members: [], days: [], sources: [], loaded: Boolean(supabase && session === null), error: null }); return undefined }
    Promise.all([
      supabase.from('family_members').select('id, name, email, role, colour').order('name'),
      fetchAll(() => supabase.from('family_days').select('id, title, month, day, year, kind, for_whom, note').order('month').order('day')),
      supabase.from('sources').select('id, title, kind, purpose, for_whom').eq('purpose', 'calendar'),
    ]).then(([m, d, s]) => {
      if (!live) return
      const error = (m.error || d.error || s.error || {}).message || null
      setState({ members: m.data || [], days: d.data || [], sources: s.data || [], loaded: true, error })
    })
    return () => { live = false }
  }, [session])
  return state
}

/** Approved events that touch the days from `from` to `to`. */
export function useEvents(session, from, to) {
  const [state, setState] = useState({ events: [], error: null })
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ events: [], error: null }); return undefined }
    fetchAll(() => supabase.from('calendar_events')
      .select('id, source_id, title, starts_on, ends_on, starts_at, ends_at, kind, for_whom, notes')
      .eq('status', 'approved').lte('starts_on', to).gte('ends_on', from)
      .order('starts_on').order('id'))
      .then(({ data, error }) => { if (live) setState({ events: data || [], error: error ? error.message : null }) })
    return () => { live = false }
  }, [session, from, to])
  return state
}
