import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSession } from './auth.js'
import { sortDrawings, drawingFiles, migrationMissing, withTapes } from './drawings.js'

// Anna's drawings: the table's rows (every one, paged: Supabase stops at 1000
// without saying so) and, separately, signed links to their pictures.
const PAGE = 500

export function useDrawings() {
  const session = useSession()
  const [state, setState] = useState({ list: [], loaded: false, error: null, missing: false })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ list: [], loaded: session === null, error: null, missing: false }); return undefined }
    ;(async () => {
      const rows = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase.from('annas_drawings').select('*').order('created_at', { ascending: false }).range(from, from + PAGE - 1)
        if (error) { if (live) setState({ list: [], loaded: true, error: error.message, missing: migrationMissing(error) }); return }
        rows.push(...(data || []))
        if (!data || data.length < PAGE) break
      }
      // The tape each one hangs with (src/lib/tapes.js): a separate read, so the wall still shows with the tapes'
      // one-time database step not yet run (`tapes` is false then, and the picker says so)
      const t = await loadTapes()
      if (live) setState({ list: withTapes(sortDrawings(rows), t.map), loaded: true, error: null, missing: false, tapes: t.ok, tapesMissing: t.missing })
    })()
    return () => { live = false }
  }, [session, n])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

/** Every chosen tape, { drawing id: tape id }, paged like the drawings. */
async function loadTapes() {
  const map = {}
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('drawing_tapes').select('drawing_id, tape').order('drawing_id').range(from, from + PAGE - 1)
    if (error) return { map, ok: false, missing: migrationMissing(error) }
    for (const r of data || []) map[r.drawing_id] = r.tape
    if (!data || data.length < PAGE) break
  }
  return { map, ok: true, missing: false }
}

/**
 * Choose a drawing's tape (by `me`, the family member choosing), or with no tape put back the one it always had.
 * `set_by` is sent each time: changing someone else's choice writes the row under the chooser's own name.
 */
export function saveTape(drawingId, tape, me) {
  if (!tape) return supabase.from('drawing_tapes').delete().eq('drawing_id', drawingId)
  return supabase.from('drawing_tapes').upsert({ drawing_id: drawingId, tape, set_by: me, updated_at: new Date().toISOString() }, { onConflict: 'drawing_id' })
}

export const saveDrawing = (id, fields) => supabase.from('annas_drawings').update(fields).eq('id', id)

/** A drawing down: its row, then its files. */
export async function removeDrawing(d) {
  const res = await supabase.from('annas_drawings').delete().eq('id', d.id)
  if (!res.error) await supabase.storage.from('drawings').remove([d.path, d.thumb_path, d.original ? drawingFiles(d.id).original : null].filter(Boolean))
  return res
}

// Signed links, a few days long and remembered for that long, asked for in batches
const KEEP = 4 * 864e5, cache = new Map()
export function useDrawingUrls(paths) {
  const key = paths.filter(Boolean).join('|')
  const [urls, setUrls] = useState({})
  useEffect(() => {
    let live = true
    const want = key ? key.split('|') : []
    const now = Date.now(), have = {}, missing = []
    for (const p of want) { const c = cache.get(p); if (c && c.until > now) have[p] = c.url; else missing.push(p) }
    setUrls(have)
    if (!missing.length || !supabase) return undefined
    supabase.storage.from('drawings').createSignedUrls(missing, 5 * 86400).then(({ data }) => {
      for (const d of data || []) if (d.signedUrl) cache.set(d.path, { url: d.signedUrl, until: now + KEEP })
      if (live) setUrls((u) => ({ ...u, ...Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])) }))
    })
    return () => { live = false }
  }, [key])
  return urls
}

/** One drawing's picture as it was kept, a signed link asked for when someone chooses to save or share it. */
export async function drawingUrl(path) {
  const c = cache.get(path)
  if (c && c.until > Date.now()) return c.url
  const { data } = await supabase.storage.from('drawings').createSignedUrl(path, 5 * 86400)
  if (!data || !data.signedUrl) return null
  cache.set(path, { url: data.signedUrl, until: Date.now() + KEEP })
  return data.signedUrl
}
