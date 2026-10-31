import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { diffDays } from '../lib/cal/dates.js'

// A glance at Anna's academy for Home: the newest cheer (from the last two
// days), and, for Anna, what's on today and her stars this month. Small reads;
// the academy itself loads only when it's opened.
export function useAcademyGlance(session, today, wantTasks) {
  const [g, setG] = useState({ cheer: null, todo: 0, stars: 0, loaded: false })
  useEffect(() => {
    let live = true
    if (!supabase || !session) return undefined
    const month = today.slice(0, 7) + '-01'
    Promise.all([
      supabase.from('academy_cheers').select('title, icon, on_date').order('on_date', { ascending: false }).order('created_at', { ascending: false }).limit(1),
      wantTasks ? supabase.from('academy_tasks').select('id', { count: 'exact', head: true }).is('done_on', null).lte('due_on', today) : Promise.resolve({ count: 0 }),
      wantTasks ? supabase.from('academy_tasks').select('id', { count: 'exact', head: true }).gte('done_on', month) : Promise.resolve({ count: 0 }),
    ]).then(([c, t, s]) => {
      if (!live) return
      const cheer = c.data && c.data[0] && diffDays(c.data[0].on_date, today) <= 1 && c.data[0].on_date <= today ? c.data[0] : null
      setG({ cheer, todo: t.count || 0, stars: s.count || 0, loaded: true })
    })
    return () => { live = false }
  }, [session, today, wantTasks])
  return g
}
