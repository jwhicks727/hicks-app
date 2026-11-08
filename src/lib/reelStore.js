import { useEffect, useState, useSyncExternalStore } from 'react'
import { supabase } from './supabase.js'
import { askClaude, prepareUpload } from './claude.js'
import { photoPaths, takenOn, suggestionRows, handTag, MAX_PER_BATCH } from './photos.js'

// ============================================
// reelStore -- the trip photo reel, shared by every screen that shows a photo
// ============================================
// One copy of the photos and their tags in memory, loaded once and refreshed when
// something changes, so a recipe page, a bird's page and the Garden don't each ask.
// The files are in the private `trips` bucket and are read through signed links.
// This module imports nothing from the hooks, so signing out can empty it.

let state = { photos: [], tags: [], loaded: false }
let loading = null
const subs = new Set()
const emit = () => subs.forEach((f) => f())
const set = (patch) => { state = { ...state, ...patch }; emit() }

async function all(build) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) return { data: null, error }
    out.push(...data)
    if (data.length < 1000) return { data: out, error: null }
  }
}

/** Read the photos and tags again (after a change, or the first time). */
export function refreshPhotos() {
  if (!supabase) { set({ loaded: true }); return Promise.resolve() }
  if (loading) return loading
  loading = Promise.all([
    all(() => supabase.from('trip_photos').select('id, town, region, taken_on, path, thumb_path, width, height, caption, read_at, added_by, created_at').order('taken_on', { ascending: false }).order('id')),
    all(() => supabase.from('photo_tags').select('id, photo_id, kind, name, sci, confidence, status, ref_kind, ref_id, by_ai').order('created_at').order('id')),
  ]).then(([p, t]) => { if (!p.error && !t.error) set({ photos: p.data, tags: t.data, loaded: true }); else set({ loaded: true }) }).finally(() => { loading = null })
  return loading
}
/** Signing out empties it. */
export function resetPhotos() { state = { photos: [], tags: [], loaded: false }; urls.clear(); emit() }

const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
/** { photos, tags, loaded }: loaded the first time a screen asks (and only when signed in). */
export function usePhotoStore(session) {
  const s = useSyncExternalStore(subscribe, () => state, () => state)
  useEffect(() => { if (session && !state.loaded) refreshPhotos() }, [session])
  return s
}

// ---- Signed links, a few days long, remembered for that long ----------------------------
const KEEP = 4 * 864e5, urls = new Map()
export async function signedUrls(paths) {
  const now = Date.now(), want = [...new Set((paths || []).filter(Boolean))], out = {}, missing = []
  for (const p of want) { const c = urls.get(p); if (c && c.until > now) out[p] = c.url; else missing.push(p) }
  if (missing.length && supabase) {
    const { data } = await supabase.storage.from('trips').createSignedUrls(missing, 5 * 86400)
    for (const d of data || []) if (d.signedUrl) { urls.set(d.path, { url: d.signedUrl, until: now + KEEP }); out[d.path] = d.signedUrl }
  }
  return out
}
/** The links for these paths, filled in as they arrive. */
export function useTripUrls(paths) {
  const key = (paths || []).filter(Boolean).join('|')
  const [found, setFound] = useState({})
  useEffect(() => {
    let live = true
    signedUrls(key ? key.split('|') : []).then((u) => { if (live) setFound(u) })
    return () => { live = false }
  }, [key])
  return found
}

// ---- Adding photos ---------------------------------------------------------------------------
/**
 * Add photos to a stay, one at a time (a phone has little memory for big pictures): each is shrunk,
 * sent to the private bucket, and recorded; then, if asked, Claude looks at it and its tags are kept
 * as suggestions. `onStage(text)` says what's happening; returns { added, failed: [{ name, why }] }.
 * ctx: { town, region, from, last, recipes: [{ id, title }], places: [{ id, name }], read: boolean }.
 */
export async function addPhotos(files, ctx, onStage = () => {}) {
  const added = [], failed = []
  const list = [...files].slice(0, MAX_PER_BATCH)
  for (const [i, f] of list.entries()) {
    const of = list.length > 1 ? ` (${i + 1} of ${list.length})` : ''
    try {
      onStage(`Getting a photo ready${of}…`)
      const full = await prepareUpload(f, { max: 2000, quality: 0.85 })
      const thumb = await prepareUpload(f, { max: 420, quality: 0.8 })
      const id = crypto.randomUUID(), paths = photoPaths(id)
      onStage(`Sending it to the family’s storage${of}…`)
      const up1 = await supabase.storage.from('trips').upload(paths.path, full.blob, { contentType: 'image/jpeg', upsert: false })
      if (up1.error) throw new Error(up1.error.message)
      const up2 = await supabase.storage.from('trips').upload(paths.thumb_path, thumb.blob, { contentType: 'image/jpeg', upsert: false })
      const day = takenOn(f.lastModified, ctx.from, ctx.last)
      const { data: row, error } = await supabase.from('trip_photos').insert({ id, town: ctx.town, region: ctx.region || null, taken_on: day, path: paths.path, thumb_path: up2.error ? null : paths.thumb_path, width: full.width, height: full.height }).select('id').single()
      if (error) { await supabase.storage.from('trips').remove([paths.path, paths.thumb_path]); throw new Error(error.message) }
      added.push(row.id)
      await refreshPhotos()
      if (ctx.read) {
        onStage(`Claude is looking at it${of}…`)
        const small = await prepareUpload(f, { max: 1280, quality: 0.82 })
        const answer = await askClaude('photo-tags', { file: { data: small.data, media_type: small.media_type }, town: ctx.town, date: day, recipes: (ctx.recipes || []).map((r) => r.title), places: (ctx.places || []).map((p) => p.name) })
        if (answer && !answer.error) {
          const rows = suggestionRows(row.id, answer, ctx)
          if (rows.length) await supabase.from('photo_tags').upsert(rows, { onConflict: 'photo_id,kind,name', ignoreDuplicates: true })
          await supabase.from('trip_photos').update({ caption: answer.caption ? answer.caption.slice(0, 300) : null, read_at: new Date().toISOString() }).eq('id', row.id)
          await refreshPhotos()
        } else if (answer && answer.error) failed.push({ name: f.name || 'A photo', why: `Saved, but Claude couldn’t look at it: ${answer.error}` })
      }
    } catch (e) {
      failed.push({ name: f.name || 'A photo', why: String((e && e.message) || e) })
    }
  }
  return { added, failed }
}

// ---- Changing what's there ---------------------------------------------------------------------
const done = async (p) => { const r = await p; await refreshPhotos(); return r.error ? r.error.message : null }
export const confirmTag = (id) => done(supabase.from('photo_tags').update({ status: 'confirmed' }).eq('id', id))
export const confirmTags = (ids) => (ids.length ? done(supabase.from('photo_tags').update({ status: 'confirmed' }).in('id', ids)) : Promise.resolve(null))
export const changeTag = (id, patch) => done(supabase.from('photo_tags').update(patch).eq('id', id))
export const removeTag = (id) => done(supabase.from('photo_tags').delete().eq('id', id))
export const restoreTag = (tag) => done(supabase.from('photo_tags').insert({ id: tag.id, photo_id: tag.photo_id, kind: tag.kind, name: tag.name, sci: tag.sci, confidence: tag.confidence, status: tag.status, ref_kind: tag.ref_kind, ref_id: tag.ref_id, by_ai: tag.by_ai }))
export async function addHandTag(photoId, spec) {
  const row = handTag(photoId, spec)
  if (!row) return 'A name, please'
  return done(supabase.from('photo_tags').upsert(row, { onConflict: 'photo_id,kind,name' }))
}
export const setCaption = (id, caption) => done(supabase.from('trip_photos').update({ caption: caption ? String(caption).slice(0, 300) : null }).eq('id', id))
/** Takes a photo away for good: its files, then its row (its tags go with it). */
export async function deletePhoto(photo) {
  await supabase.storage.from('trips').remove([photo.path, photo.thumb_path].filter(Boolean))
  return done(supabase.from('trip_photos').delete().eq('id', photo.id))
}
