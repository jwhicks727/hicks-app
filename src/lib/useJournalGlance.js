import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { parts, ds } from './cal/dates.js'
import { promptFor } from './journal.js'

// A glance at your own journal for Home and the end of a sit: whether
// today's page is written, how many notes from your past self are waiting,
// and which earlier years wrote on this day. Counts and dates only, never a
// word of what's in it, so nothing private shows on a shared screen.
export function useJournalGlance(session, today, enabled = true, child = false) {
  const [g, setG] = useState({ written: false, notes: 0, years: [], question: null, loaded: false })
  useEffect(() => {
    let live = true
    if (!supabase || !session || !enabled) return undefined
    const [y, m, d] = parts(today)
    const earlier = Array.from({ length: 12 }, (_, i) => ds(y - 1 - i, m, d)).filter((x) => x.slice(5) === today.slice(5))
    Promise.all([
      supabase.from('journal_entries').select('on_date').in('on_date', [today, ...earlier]),
      supabase.from('journal_notes').select('id', { count: 'exact', head: true }).lte('open_on', today).is('opened_at', null),
      supabase.from('journal_settings').select('prompt_set, prompts').maybeSingle(),
    ]).then(([e, n, s]) => {
      if (!live) return
      const dates = (e.data || []).map((r) => r.on_date)
      setG({ written: dates.includes(today), notes: n.count || 0, years: dates.filter((x) => x !== today).map((x) => y - +x.slice(0, 4)).sort((a, b) => a - b), question: promptFor(today, (s.data && s.data.prompt_set) || (child ? 'none' : 'season'), s.data && s.data.prompts), loaded: true })
    })
    return () => { live = false }
  }, [session, today, enabled, child])
  return g
}
