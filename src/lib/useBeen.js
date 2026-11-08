import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { fetchAll } from './useCalendar.js'
import { cleanPlace } from './been.js'

// ============================================
// useBeen -- our list for each town, as the family has it
// ============================================
// The towns, their places and the days we went (docs/DATABASE.md). Every
// screen that shows the list hears when any of them changes it, so a place
// added from the guide appears on Home at once.

const EVENT = 'teamhicks:been'
const changed = () => { try { window.dispatchEvent(new Event(EVENT)) } catch { /* not in a browser */ } }

/** { towns, places, visits, loaded, reload }: the whole list (it stays small; paged anyway). */
export function useBeen(session) {
  const [state, setState] = useState({ towns: [], places: [], visits: [], loaded: false })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ towns: [], places: [], visits: [], loaded: true }); return undefined }
    Promise.all([
      fetchAll(() => supabase.from('been_towns').select('id, town, region, cc').order('town').order('id')),
      fetchAll(() => supabase.from('been_places').select('id, town_id, name, kind, rating, note, website, added_by, updated_at').order('name').order('id')),
      fetchAll(() => supabase.from('been_visits').select('id, place_id, on_date, member_id').order('on_date', { ascending: false }).order('id')),
    ]).then(([t, p, v]) => { if (live) setState({ towns: t.data || [], places: p.data || [], visits: v.data || [], loaded: true }) })
    return () => { live = false }
  }, [session, n])
  useEffect(() => {
    const on = () => setN((x) => x + 1)
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

/** The town's row, found or added (one per town and state). */
export async function ensureTown(t) {
  const { data: found } = await supabase.from('been_towns').select('id, town, region').ilike('town', t.town).limit(10)
  const same = (found || []).find((x) => String(x.region || '').toLowerCase() === String(t.region || '').toLowerCase())
  if (same) return same.id
  const { data, error } = await supabase.from('been_towns').insert({ town: t.town, region: t.region || null, cc: t.cc || null }).select('id').single()
  if (!error && data) return data.id
  const { data: again } = await supabase.from('been_towns').select('id, region').ilike('town', t.town).limit(10) // added a moment ago on another phone
  const hit = (again || []).find((x) => String(x.region || '').toLowerCase() === String(t.region || '').toLowerCase())
  return hit ? hit.id : null
}

/**
 * Add a place we went (or find it, if it's on the list already) and mark today as a
 * visit. Returns { id, created, error }.
 */
export async function addBeen(t, place, today) {
  const p = cleanPlace(place)
  if (!p || !t) return { id: null, error: 'A name, please' }
  const townId = await ensureTown(t)
  if (!townId) return { id: null, error: 'The town couldn’t be added just now' }
  let id = null, created = false
  const { data, error } = await supabase.from('been_places').insert({ town_id: townId, ...p }).select('id').single()
  if (!error && data) { id = data.id; created = true } else {
    const { data: rows } = await supabase.from('been_places').select('id, name').eq('town_id', townId).ilike('name', p.name).limit(1)
    if (rows && rows[0]) {
      id = rows[0].id
      const patch = Object.fromEntries(Object.entries({ rating: p.rating, note: p.note, website: p.website }).filter(([, v]) => v))
      if (Object.keys(patch).length) await supabase.from('been_places').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    }
  }
  if (!id) return { id: null, error: 'It couldn’t be added just now' }
  if (today) await supabase.from('been_visits').upsert({ place_id: id, on_date: today }, { onConflict: 'place_id,on_date', ignoreDuplicates: true })
  changed()
  return { id, created, error: null }
}

/** We went again today. */
export async function wentAgain(placeId, today) {
  const { error } = await supabase.from('been_visits').upsert({ place_id: placeId, on_date: today }, { onConflict: 'place_id,on_date', ignoreDuplicates: true })
  changed()
  return error ? error.message : null
}
/** Take back today's visit (the Undo). */
export async function undoVisit(placeId, today) {
  await supabase.from('been_visits').delete().eq('place_id', placeId).eq('on_date', today)
  changed()
}
/** Change what we thought, or the note. */
export async function updateBeen(id, patch) {
  const p = {}
  if ('rating' in patch) p.rating = patch.rating || null
  if ('note' in patch) p.note = patch.note ? String(patch.note).slice(0, 500) : null
  if ('kind' in patch) p.kind = patch.kind
  const { error } = await supabase.from('been_places').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id)
  changed()
  return error ? error.message : null
}
/** Take a just-added place off again (the Undo after adding). */
export async function dropBeen(id) {
  await supabase.from('been_places').delete().eq('id', id)
  changed()
}
/** Take a place off the list, returning what's needed to put it back (the Undo). */
export async function removeBeen(place, visits) {
  const snapshot = { place: { id: place.id, town_id: place.town_id, name: place.name, kind: place.kind, rating: place.rating, note: place.note, website: place.website }, days: (visits || []).filter((v) => v.place_id === place.id).map((v) => v.on_date) }
  const { error } = await supabase.from('been_places').delete().eq('id', place.id)
  changed()
  return { error: error ? error.message : null, snapshot }
}
export async function restoreBeen(snapshot) {
  const { error } = await supabase.from('been_places').insert(snapshot.place)
  if (!error && snapshot.days.length) await supabase.from('been_visits').insert(snapshot.days.map((d) => ({ place_id: snapshot.place.id, on_date: d })))
  changed()
}
