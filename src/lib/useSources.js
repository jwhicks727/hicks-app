import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/** The calendar's sources, for the family when signed in. */
export function useSources(session) {
  const [state, setState] = useState({ rows: null, error: null })
  const load = useCallback(async () => {
    if (!supabase || !session) { setState({ rows: null, error: null }); return }
    const { data, error } = await supabase.from('sources').select('*').order('created_at', { ascending: true })
    setState({ rows: error ? null : data, error: error ? error.message : null })
  }, [session])
  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}

/** Today as a calendar date at home ('YYYY-MM-DD'), never parsed as UTC midnight. */
export function todayAtHome() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
}
