import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { prepareUpload } from './claude.js'

// A concert's ticket and scrapbook (event_keepsakes, the private `keepsakes` bucket): read as the
// signed-in member, files through signed links that last a day.

export function useKeepsakes(session, eventId) {
  const [state, setState] = useState({ rows: [], urls: {}, loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session || !eventId) { setState({ rows: [], urls: {}, loaded: true, error: null }); return undefined }
    supabase.from('event_keepsakes').select('id, kind, path, words, added_by, created_at').eq('event_id', eventId).order('created_at').then(async ({ data, error }) => {
      if (!live) return
      if (error) { setState({ rows: [], urls: {}, loaded: true, error: /relation|does not exist|schema cache/i.test(error.message) ? 'setup' : error.message }); return }
      const paths = (data || []).map((r) => r.path).filter(Boolean)
      const { data: signed } = paths.length ? await supabase.storage.from('keepsakes').createSignedUrls(paths, 86400) : { data: [] }
      if (live) setState({ rows: data || [], urls: Object.fromEntries((signed || []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl])), loaded: true, error: null })
    })
    return () => { live = false }
  }, [session, eventId, n])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

const id = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))

/** Keep a file (a ticket or a photo): a picture is made smaller first; a PDF goes as it is. */
export async function addKeepsakeFile(eventId, kind, file, memberId) {
  const pdf = file.type === 'application/pdf'
  const up = pdf ? { blob: file } : await prepareUpload(file, { max: 2000, quality: 0.86 })
  const path = `${eventId}/${id()}.${pdf ? 'pdf' : 'jpg'}`
  const { error: e1 } = await supabase.storage.from('keepsakes').upload(path, up.blob, { contentType: pdf ? 'application/pdf' : 'image/jpeg' })
  if (e1) return { error: e1.message }
  const { error: e2 } = await supabase.from('event_keepsakes').insert({ event_id: eventId, kind, path, added_by: memberId })
  if (e2) { await supabase.storage.from('keepsakes').remove([path]); return { error: e2.message } }
  return { error: null }
}

export const addKeepsakeNote = (eventId, words, memberId) => supabase.from('event_keepsakes').insert({ event_id: eventId, kind: 'note', words: words.trim().slice(0, 2000), added_by: memberId })

/** Take one away: its row, then its file. */
export async function removeKeepsake(row) {
  const { error } = await supabase.from('event_keepsakes').delete().eq('id', row.id)
  if (!error && row.path) await supabase.storage.from('keepsakes').remove([row.path])
  return { error: error ? error.message : null }
}
