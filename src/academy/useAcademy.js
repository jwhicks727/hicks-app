import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchAll } from '../lib/useCalendar.js'

// Everything at Anna's academy, read as the signed-in member (the family
// builds it together; the database keeps it to the three of us). Pictures
// the family added are shown through signed links from the private bucket.

export function useAcademy(session) {
  const [state, setState] = useState({ settings: null, rooms: [], tasks: [], goals: [], grades: [], cheers: [], assets: [], loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState((s) => ({ ...s, loaded: Boolean(supabase && session === null) })); return undefined }
    const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10)
    Promise.all([
      supabase.from('academy_settings').select('*').maybeSingle(),
      supabase.from('academy_rooms').select('*').order('sort').order('created_at'),
      fetchAll(() => supabase.from('academy_tasks').select('*').or(`done_on.is.null,done_on.gte.${since}`).order('created_at').order('id')),
      supabase.from('academy_goals').select('*').order('created_at'),
      fetchAll(() => supabase.from('academy_grades').select('*').order('on_date').order('id')),
      fetchAll(() => supabase.from('academy_cheers').select('*').order('on_date', { ascending: false }).order('id')),
      supabase.from('academy_assets').select('*').order('created_at'),
    ]).then((rs) => {
      if (!live) return
      const [st, ro, ta, go, gr, ch, as] = rs
      setState({ settings: st.data || null, rooms: ro.data || [], tasks: ta.data || [], goals: go.data || [], grades: gr.data || [], cheers: ch.data || [], assets: as.data || [], loaded: true, error: (rs.find((r) => r.error) || {}).error?.message || null })
    })
    return () => { live = false }
  }, [session, n])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

export const saveSettings = (patch) => supabase.from('academy_settings').upsert({ id: true, ...patch }, { onConflict: 'id' })
export const addRooms = (rows) => supabase.from('academy_rooms').insert(rows).select()
export const saveRoom = (id, patch) => supabase.from('academy_rooms').update(patch).eq('id', id)
export const removeRoom = (id) => supabase.from('academy_rooms').delete().eq('id', id)
export const addTask = (row) => supabase.from('academy_tasks').insert(row).select().single()
export const saveTask = (id, patch) => supabase.from('academy_tasks').update(patch).eq('id', id)
export const removeTask = (id) => supabase.from('academy_tasks').delete().eq('id', id)
export const addGoal = (row) => supabase.from('academy_goals').insert(row).select().single()
export const saveGoal = (id, patch) => supabase.from('academy_goals').update(patch).eq('id', id)
export const removeGoal = (id) => supabase.from('academy_goals').delete().eq('id', id)
export const addGrade = (row) => supabase.from('academy_grades').insert(row).select().single()
export const removeGrade = (id) => supabase.from('academy_grades').delete().eq('id', id)
export const addCheer = (row) => supabase.from('academy_cheers').insert(row).select().single()
export const removeCheer = (id) => supabase.from('academy_cheers').delete().eq('id', id)

/** A picture the family adds: into the bucket, then its row with its licence. */
export async function addAsset({ file, name, cat, licence, source }) {
  const id = crypto.randomUUID(), ext = file.type === 'image/webp' ? 'webp' : 'png', path = `${id}.${ext}`
  const up = await supabase.storage.from('academy').upload(path, file, { contentType: file.type, upsert: false })
  if (up.error) return { error: up.error }
  return supabase.from('academy_assets').insert({ name, cat, path, licence, source: source || null }).select().single()
}
/** What one of the family's pictures does in a room (src/academy/life.js ASSET_WAYS), kept in its category. */
export const saveAsset = (id, patch) => supabase.from('academy_assets').update(patch).eq('id', id)
export async function removeAsset(a) {
  await supabase.storage.from('academy').remove([a.path])
  return supabase.from('academy_assets').delete().eq('id', a.id)
}

// Signed links for the family's own pictures, kept a few days
const KEEP = 4 * 864e5, cache = new Map()
export function useAssetUrls(assets) {
  const key = assets.map((a) => a.path).join('|')
  const [urls, setUrls] = useState({})
  useEffect(() => {
    let live = true
    const want = key ? key.split('|') : [], now = Date.now(), have = {}, missing = []
    for (const p of want) { const c = cache.get(p); if (c && c.until > now) have[p] = c.url; else missing.push(p) }
    setUrls(have)
    if (!missing.length || !supabase) return undefined
    supabase.storage.from('academy').createSignedUrls(missing, 5 * 86400).then(({ data }) => {
      for (const d of data || []) if (d.signedUrl) cache.set(d.path, { url: d.signedUrl, until: now + KEEP })
      if (live) setUrls((u) => ({ ...u, ...Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])) }))
    })
    return () => { live = false }
  }, [key])
  return urls
}
