import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { fetchAll } from './useCalendar.js'
import { clampSpot } from './garden.js'

// The garden's rows, read and saved as the signed-in member (the family
// gardens together; only the parents remove an area or a spot). Photos are
// in the private `garden` bucket and shown through signed links, kept a few
// days so the browser's cache can serve them.

/** Everything in the garden, with each spot knowing whether its area is indoors. */
export function useGarden(session) {
  const [state, setState] = useState({ areas: [], spots: [], plants: [], log: [], photos: [], loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState((s) => ({ ...s, loaded: Boolean(supabase && session === null) })); return undefined }
    const since = new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10)
    Promise.all([
      supabase.from('garden_areas').select('*').order('sort').order('created_at'),
      fetchAll(() => supabase.from('garden_spots').select('*').order('created_at').order('id')),
      fetchAll(() => supabase.from('garden_plants').select('*').order('created_at').order('id')),
      fetchAll(() => supabase.from('garden_log').select('*').gte('on_date', since).order('on_date', { ascending: false }).order('id')),
      fetchAll(() => supabase.from('garden_photos').select('*').order('taken_on', { ascending: false }).order('id')),
    ]).then(([a, s, p, l, ph]) => {
      if (!live) return
      const areas = a.data || []
      const spots = (s.data || []).map((x) => ({ ...x, indoor: Boolean((areas.find((ar) => ar.id === x.area_id) || {}).indoor) }))
      setState({ areas, spots, plants: p.data || [], log: l.data || [], photos: ph.data || [], loaded: true, error: (a.error || s.error || p.error || l.error || ph.error || {}).message || null })
    })
    return () => { live = false }
  }, [session, n])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

export const addArea = (row) => supabase.from('garden_areas').insert(row).select().single()
export const saveArea = (id, patch) => supabase.from('garden_areas').update(patch).eq('id', id)
export const removeArea = (id) => supabase.from('garden_areas').delete().eq('id', id)
export const addSpot = (row) => supabase.from('garden_spots').insert(clampSpot(row)).select().single()
export const saveSpot = (id, patch) => supabase.from('garden_spots').update(patch.x != null || patch.w != null ? clampSpot(patch) : patch).eq('id', id)
export const removeSpot = (id) => supabase.from('garden_spots').delete().eq('id', id)
export const addPlant = (row) => supabase.from('garden_plants').insert(row).select().single()
export const savePlant = (id, patch) => supabase.from('garden_plants').update(patch).eq('id', id)
export const removePlant = (id) => supabase.from('garden_plants').delete().eq('id', id)
export const logCare = (row) => supabase.from('garden_log').insert(row)
export const unlog = (id) => supabase.from('garden_log').delete().eq('id', id)

/** A photo for a spot: the picture and a 400px thumbnail into the bucket, then its row. */
export async function addPhoto({ spotId, full, thumb, takenOn, me }) {
  const id = crypto.randomUUID(), path = `${spotId}/${id}.jpg`, thumbPath = `${spotId}/${id}.thumb.jpg`
  const up1 = await supabase.storage.from('garden').upload(path, full, { contentType: 'image/jpeg', upsert: false })
  if (up1.error) return { error: up1.error }
  const up2 = await supabase.storage.from('garden').upload(thumbPath, thumb, { contentType: 'image/jpeg', upsert: false })
  return supabase.from('garden_photos').insert({ spot_id: spotId, path, thumb_path: up2.error ? null : thumbPath, taken_on: takenOn, created_by: me ? me.id : null }).select().single()
}
export async function removePhoto(photo) {
  await supabase.storage.from('garden').remove([photo.path, photo.thumb_path].filter(Boolean))
  return supabase.from('garden_photos').delete().eq('id', photo.id)
}
export const saveAnalysis = (id, analysis) => supabase.from('garden_photos').update({ analysis, analysed_at: new Date().toISOString() }).eq('id', id)

// Signed links, a few days long and remembered for that long, asked for in batches
const KEEP = 4 * 864e5, cache = new Map()
export function useSignedUrls(paths) {
  const key = paths.filter(Boolean).join('|')
  const [urls, setUrls] = useState({})
  useEffect(() => {
    let live = true
    const want = key ? key.split('|') : []
    const now = Date.now(), have = {}, missing = []
    for (const p of want) { const c = cache.get(p); if (c && c.until > now) have[p] = c.url; else missing.push(p) }
    setUrls(have)
    if (!missing.length || !supabase) return undefined
    supabase.storage.from('garden').createSignedUrls(missing, 5 * 86400).then(({ data }) => {
      for (const d of data || []) if (d.signedUrl) cache.set(d.path, { url: d.signedUrl, until: now + KEEP })
      if (live) setUrls((u) => ({ ...u, ...Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])) }))
    })
    return () => { live = false }
  }, [key])
  return urls
}
