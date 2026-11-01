import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { fetchAll } from './useCalendar.js'
import { cleanSubjects } from './life/subjects.js'

// Life List's data, read and saved as the signed-in member: row-level security
// decides (Laurie's birds: parents only; outings and parks: the family reads,
// the parents write). Anything that can grow is paged (Supabase stops at 1000
// rows without saying so).

function useRows(session, fetcher, enabled = true) {
  const [state, setState] = useState({ rows: [], loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session || !enabled) { setState({ rows: [], loaded: Boolean(supabase && session === null) || !enabled, error: null }); return undefined }
    fetcher().then(({ data, error }) => { if (live) setState({ rows: data || [], loaded: true, error: error ? error.message : null }) })
    return () => { live = false }
  }, [session, enabled, n]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

const SIGHTING_COLS = 'id, submission_id, species, sci_name, taxon_order, count, observed_on, observed_time, state, county, location, location_id, lat, lng, protocol, duration_min, distance_km, observers, has_media, comments, source'
/** Laurie's sightings, all of them (parents only: others get none). */
export const useSightings = (session, enabled) => useRows(session, () => fetchAll(() => supabase.from('bird_sightings').select(SIGHTING_COLS).order('observed_on', { ascending: false }).order('id')), enabled)
export const useOutings = (session) => useRows(session, () => supabase.from('outings').select('*').order('starts_on', { ascending: false }).limit(500))
export const useParkMarks = (session) => useRows(session, () => supabase.from('park_marks').select('slug, visited_on, want, note'))

/** Bring sightings in, a few hundred at a time; a re-import of the same file changes nothing. Returns { error, saved }. */
export async function importSightings(memberId, rows, onProgress) {
  let saved = 0
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400).map((r) => ({ ...r, member_id: memberId }))
    const { error } = await supabase.from('bird_sightings').upsert(chunk, { onConflict: 'member_id,submission_id,sci_name,species', ignoreDuplicates: false })
    if (error) return { error: /relation|does not exist|schema cache/i.test(error.message) ? 'The Life List migration hasn’t been run yet (docs/MORNING.md, step 12).' : error.message, saved }
    saved += chunk.length
    if (onProgress) onProgress(saved, rows.length)
  }
  return { error: null, saved }
}
/** Take every sighting of Laurie's out again (a parent's choice, asked first). */
export const clearSightings = (memberId) => supabase.from('bird_sightings').delete().eq('member_id', memberId)

export const saveOuting = (row, id, me) => (id
  ? supabase.from('outings').update(row).eq('id', id).select('id').single()
  : supabase.from('outings').insert({ ...row, created_by: me ? me.id : null }).select('id').single())
export const deleteOuting = (id) => supabase.from('outings').delete().eq('id', id)
export const saveParkMark = (slug, patch) => supabase.from('park_marks').upsert({ slug, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'slug' })
/** What a painting shows, so it can stand in for a photo (a parent's job; stored paintings only). */
export const savePaintingSubjects = (slug, subjects) => supabase.from('paintings').update({ subjects: cleanSubjects(subjects) }).eq('slug', slug)

/** The nightly eBird sync: Laurie's own yes, and the last few runs (parents read both). */
export function useBirdSync(session) {
  return useRows(session, async () => {
    const [yes, runs] = await Promise.all([
      supabase.from('sync_consents').select('source, said_yes_by, said_at').eq('source', 'ebird').maybeSingle(),
      supabase.from('bird_sync_runs').select('id, at, kind, status, checklists, sightings, note, finished_at').order('at', { ascending: false }).limit(5),
    ])
    const error = yes.error || runs.error
    return { data: error ? [] : [{ yes: yes.data || null, runs: runs.data || [] }], error }
  })
}
/** Only Laurie's own sign-in can say yes (the database refuses anyone else's). */
export const sayYesToSync = (memberId) => supabase.from('sync_consents').upsert({ source: 'ebird', said_yes_by: memberId, said_at: new Date().toISOString() }, { onConflict: 'source' })
export const takeBackSyncYes = (memberId) => supabase.from('sync_consents').delete().eq('source', 'ebird').eq('said_yes_by', memberId)
