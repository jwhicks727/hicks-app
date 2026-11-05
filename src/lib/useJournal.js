import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { fetchAll } from './useCalendar.js'
import { cleanEntry } from './journal.js'

// The signed-in person's own journal. The database returns only the
// writer's rows (journal migration), so a screen can't show anyone else's
// even by mistake. Nothing here goes to Claude.

export function useJournal(session) {
  const [state, setState] = useState({ entries: [], notes: [], settings: null, loaded: false, error: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState((s) => ({ ...s, loaded: Boolean(supabase && session === null) })); return undefined }
    Promise.all([
      fetchAll(() => supabase.from('journal_entries').select('id, on_date, prompt_title, prompt, answer, reflection, gratitudes, imported, doc_hash, app_hash').order('on_date', { ascending: false }).order('id')),
      supabase.from('journal_notes').select('*').order('open_on'),
      supabase.from('journal_settings').select('*').maybeSingle(),
    ]).then(([e, no, st]) => {
      if (!live) return
      setState({ entries: e.data || [], notes: no.data || [], settings: st.data || null, loaded: true, error: (e.error || no.error || st.error || {}).message || null })
    })
    return () => { live = false }
  }, [session, n])
  return { ...state, reload: useCallback(() => setN((x) => x + 1), []) }
}

/** Save a day's entry (one a day each); an emptied one is removed. */
export async function saveEntry(entry, existingId) {
  const row = cleanEntry(entry)
  if (!row) return existingId ? supabase.from('journal_entries').delete().eq('id', existingId) : { error: null }
  return supabase.from('journal_entries').upsert(row, { onConflict: 'member_id,on_date' })
}
export const removeEntry = (id) => supabase.from('journal_entries').delete().eq('id', id)

/**
 * A page removed here that was in step with the writer's Google Doc: remembered, so the next sync asks whether
 * to remove it from the Doc too, rather than bringing it back (src/lib/journalDoc.js).
 */
export async function rememberRemoved(j, me, entry) {
  const s = j.settings
  if (!entry || !entry.doc_hash || !s || !s.doc_id) return { error: null }
  const removed = [...new Set([...(s.doc_removed || []), entry.on_date])].slice(-500)
  return supabase.from('journal_settings').update({ doc_removed: removed }).eq('member_id', me.id)
}

/** The Doc sync's writes, a couple of hundred at a time. Rows of one shape per call: whole days, or fingerprints only. */
export async function saveSynced(rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from('journal_entries').upsert(rows.slice(i, i + 200), { onConflict: 'member_id,on_date' })
    if (error) return { error }
  }
  return { error: null }
}

/** A new Doc, or none: every page's fingerprints from the old one are forgotten, so nothing is taken as already in step. */
export const forgetFingerprints = () => supabase.from('journal_entries').update({ doc_hash: null, app_hash: null }).not('doc_hash', 'is', null)

/** The journal's link to its Doc: which one, where its days stop, when they last agreed, days removed since. */
export const saveDocLink = (patch, me) => supabase.from('journal_settings').upsert({ member_id: me.id, ...patch }, { onConflict: 'member_id' })

export const addNote = (row) => supabase.from('journal_notes').insert(row)
export const openNote = (id) => supabase.from('journal_notes').update({ opened_at: new Date().toISOString() }).eq('id', id)
export const removeNote = (id) => supabase.from('journal_notes').delete().eq('id', id)

/** Settings, made on first save. */
export const saveSettings = (patch, me) => supabase.from('journal_settings').upsert({ member_id: me.id, ...patch }, { onConflict: 'member_id' })

/** A journal kept elsewhere, brought in a few hundred days at a time; days already written here are left alone. */
export async function importEntries(entries, onProgress) {
  let done = 0
  for (let i = 0; i < entries.length; i += 200) {
    const batch = entries.slice(i, i + 200).map((e) => ({ ...e, imported: true }))
    const { error } = await supabase.from('journal_entries').upsert(batch, { onConflict: 'member_id,on_date', ignoreDuplicates: true })
    if (error) return { error, done }
    done += batch.length
    onProgress?.(done)
  }
  return { error: null, done }
}
