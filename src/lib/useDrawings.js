import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSession } from './auth.js'
import { prepareUpload } from './claude.js'
import { sortDrawings, drawingFiles, migrationMissing } from './drawings.js'

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
      if (live) setState({ list: sortDrawings(rows), loaded: true, error: null, missing: false })
    })()
    return () => { live = false }
  }, [session, n])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

/**
 * A drawing in: the picture and a small one into the private bucket, then its row. The files come out again if the
 * row can't be saved, so nothing is left in the bucket that no row points at.
 */
export async function addDrawing({ file, fields, me }) {
  const id = crypto.randomUUID(), { path, thumb } = drawingFiles(id)
  const full = await prepareUpload(file, { max: 2000, quality: 0.9 }), small = await prepareUpload(file, { max: 640, quality: 0.82 })
  const up1 = await supabase.storage.from('drawings').upload(path, full.blob, { contentType: 'image/jpeg', upsert: false })
  if (up1.error) return { error: up1.error }
  const up2 = await supabase.storage.from('drawings').upload(thumb, small.blob, { contentType: 'image/jpeg', upsert: false })
  const res = await supabase.from('annas_drawings').insert({ id, ...fields, path, thumb_path: up2.error ? null : thumb, width: full.width, height: full.height, added_by: me ? me.id : null }).select().single()
  if (res.error) await supabase.storage.from('drawings').remove([path, up2.error ? null : thumb].filter(Boolean))
  return res
}

export const saveDrawing = (id, fields) => supabase.from('annas_drawings').update(fields).eq('id', id)

/** A drawing down: its row, then its files. */
export async function removeDrawing(d) {
  const res = await supabase.from('annas_drawings').delete().eq('id', d.id)
  if (!res.error) await supabase.storage.from('drawings').remove([d.path, d.thumb_path].filter(Boolean))
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
