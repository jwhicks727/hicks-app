import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSession } from './auth.js'

// Sacred Heart's week as last read from its website (public.parish_schedules),
// shared by every screen that shows Mass times. When the reading is more than
// a day old, the `parish` function is asked once this visit to read the page
// again (it reads at most once a day itself). Signed out, there is none, and
// the screens use the diocese's listing and say so.

const DAY_MS = 24 * 3600e3
let kept = null // { schedule, url, read_at, checked_at, error }
let asked = false
const subs = new Set()
const tell = (v) => { kept = v; subs.forEach((f) => f(v)) }

async function refresh(force = false) {
  const { data, error } = await supabase.functions.invoke('parish', { body: force ? { force: true } : {} })
  if (error) { tell({ ...(kept || {}), error: error.context?.status === 404 ? 'The parish reader isn’t set up yet.' : 'The parish’s site couldn’t be read just now.' }); return }
  if (data && data.schedule) tell({ schedule: data.schedule, url: data.url, read_at: data.read_at, checked_at: data.checked_at, error: data.error || null, changed: Boolean(data.changed) })
  else if (data && data.error) tell({ ...(kept || {}), error: data.error })
}

async function load() {
  const { data } = await supabase.from('parish_schedules').select('url, schedule, read_at, checked_at').order('read_at', { ascending: false }).limit(1).maybeSingle()
  if (data) tell({ ...data, error: null })
  if (!asked && (!data || Date.now() - Date.parse(data.checked_at) > DAY_MS)) { asked = true; refresh() }
}

/** { schedule, url, read_at, checked_at, error } or null; and readAgain() for a parent in Admin. */
export function useParish() {
  const session = useSession()
  const [v, setV] = useState(kept)
  useEffect(() => {
    subs.add(setV)
    if (supabase && session && !kept) load()
    return () => { subs.delete(setV) }
  }, [session])
  return [session ? v : null, () => refresh(true)]
}
