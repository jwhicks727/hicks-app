import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSession } from './auth.js'
import { askClaude } from './claude.js'
import { shouldAsk, GUIDE_FRESH_MS } from './around.js'
import { todayAt } from './cal/dates.js'
import { HOME_TOWN } from './sky.js'

// ============================================
// useAround -- the map layer and the guide for an area, as the family has them
// ============================================
// Reads area_guides (the family reads; only the functions write). With `auto`,
// a phone asks the `around` function for the map layer when the area has none
// from this week, and the `claude` function for a guide when it has none from
// this month: by itself, no button, once per area per day per phone (Jason's
// decision 2, issue #19). While a guide is written, it looks again every few
// seconds for up to six minutes. All that's sent is the area (a tenth of a
// degree), the town's name and its region; Settings and the card say so.

const ASKED = 'teamhicks.guide-asked'
const POLL_MS = 6000, POLL_FOR_MS = 6 * 60e3
const MAP_FRESH_MS = 7 * 864e5
const readAsked = () => { try { return JSON.parse(localStorage.getItem(ASKED)) || {} } catch { return {} } }
const markAsked = (cell, day) => { try { const m = readAsked(); for (const k of Object.keys(m)) if (m[k] !== day) delete m[k]; m[cell] = day; localStorage.setItem(ASKED, JSON.stringify(m)) } catch { /* fine */ } }

async function newest(cell, kind) {
  const { data } = await supabase.from('area_guides').select('id, cell, kind, status, town, data, fetched_at').eq('cell', cell).eq('kind', kind).order('fetched_at', { ascending: false }).limit(3)
  const rows = data || []
  return rows.find((r) => r.status === 'building') || rows.find((r) => r.status === 'ready') || rows[0] || null
}

/** One kept guide by its id (a trip's, say): { row, loaded }. */
export function useGuideById(id) {
  const session = useSession()
  const [state, setState] = useState({ row: null, loaded: false })
  useEffect(() => {
    let live = true
    if (!supabase || !session || !/^\d{1,12}$/.test(String(id || ''))) { setState({ row: null, loaded: true }); return undefined }
    supabase.from('area_guides').select('id, cell, kind, status, town, data, fetched_at').eq('id', Number(id)).maybeSingle()
      .then(({ data }) => { if (live) setState({ row: data || null, loaded: true }) })
    return () => { live = false }
  }, [session, id])
  return state
}

/**
 * The area's map layer and guide: { map, guide, building, error }. `place` is
 * { cell, town, region, cc }; `auto` lets this phone ask for what's missing.
 */
export function useAround(place, { auto = false } = {}) {
  const session = useSession()
  const cell = place && place.cell
  const [state, setState] = useState({ map: null, guide: null, building: false, error: null })
  useEffect(() => {
    let live = true, timer = null
    if (!supabase || !session || !cell) { setState({ map: null, guide: null, building: false, error: null }); return undefined }
    setState({ map: null, guide: null, building: false, error: null })
    const started = Date.now()
    const look = async () => {
      const [mapRow, guideRow] = await Promise.all([newest(cell, 'map'), newest(cell, 'guide')])
      if (!live) return
      let map = mapRow && mapRow.status === 'ready' ? { id: mapRow.id, ...mapRow.data } : null
      const mapStale = !mapRow || Date.now() - Date.parse(mapRow.fetched_at) > MAP_FRESH_MS
      if (auto && mapStale) {
        const { data } = await supabase.functions.invoke('around', { body: { cell, town: place.town || '', region: place.region || '' } }).catch(() => ({ data: null }))
        if (!live) return
        if (data && !data.error) map = data
        else if (!map) setState((s) => ({ ...s, error: (data && data.error) || 'The open map couldn’t be reached just now' }))
      }
      const today = todayAt(HOME_TOWN.tz)
      const building = Boolean(guideRow && guideRow.status === 'building')
      const ready = guideRow && guideRow.status === 'ready' ? { id: guideRow.id, fetched_at: guideRow.fetched_at, ...guideRow.data } : null
      setState((s) => ({ ...s, map, guide: ready, building }))
      if (auto && shouldAsk({ guide: guideRow, askedOn: readAsked()[cell], today })) {
        markAsked(cell, today)
        setState((s) => ({ ...s, building: true }))
        const r = await askClaude('around-here', { cell, town: place.town || '', region: place.region || '', cc: place.cc || '' })
        if (!live) return
        if (r && r.error) setState((s) => ({ ...s, building: false, error: s.error || r.error }))
        else timer = setTimeout(poll, POLL_MS)
      } else if (building) timer = setTimeout(poll, POLL_MS)
    }
    const poll = async () => {
      const row = await newest(cell, 'guide')
      if (!live) return
      if (row && row.status === 'ready' && Date.now() - Date.parse(row.fetched_at) < GUIDE_FRESH_MS) { setState((s) => ({ ...s, guide: { id: row.id, fetched_at: row.fetched_at, ...row.data }, building: false })); return }
      if (row && row.status === 'failed' && Date.parse(row.fetched_at) >= started - 60e3) { setState((s) => ({ ...s, building: false, error: s.error || (row.data && row.data.error) || 'The guide couldn’t be written just now' })); return }
      if (Date.now() - started < POLL_FOR_MS) timer = setTimeout(poll, POLL_MS)
      else setState((s) => ({ ...s, building: false }))
    }
    look()
    return () => { live = false; if (timer) clearTimeout(timer) }
  }, [session, cell, auto]) // eslint-disable-line react-hooks/exhaustive-deps
  return state
}

/** The travel settings (one row): the family's interests and the travel app's name: { interests, appName, loaded, save, saveName }. */
export function useTravelSettings() {
  const session = useSession()
  const [state, setState] = useState({ interests: '', appName: 'Yonder', loaded: false })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ interests: '', appName: 'Yonder', loaded: true }); return undefined }
    supabase.from('travel_settings').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (live) setState({ interests: data ? data.interests || '' : '', appName: (data && data.app_name) || 'Yonder', loaded: true }) })
    return () => { live = false }
  }, [session, n])
  const write = async (patch, memberId) => {
    const { error } = await supabase.from('travel_settings').upsert({ id: 1, ...patch, updated_by: memberId || null, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (!error) setN((x) => x + 1)
    return error ? error.message : null
  }
  return { ...state, save: (interests, memberId) => write({ interests: String(interests).slice(0, 1500) }, memberId), saveName: (name, memberId) => write({ app_name: name }, memberId) }
}
