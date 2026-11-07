import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSession } from './auth.js'
import { whereaboutsRow, shouldShare } from './trips.js'

// ============================================
// useWhereabouts -- which town each of us is in while away (issue #19, "full transparency")
// ============================================
// This phone writes its owner's one row while away (the town and a tenth of a
// degree, lapsing in twelve hours) and removes it back on home ground or when
// Notice where I am is switched off. The family reads the rows. Never a log:
// the row is overwritten. Never on the wall or in Reports.

const LAST = 'teamhicks.shared'
const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST)) } catch { return null } }
const writeLast = (v) => { try { if (v) localStorage.setItem(LAST, JSON.stringify(v)); else localStorage.removeItem(LAST) } catch { /* fine */ } }

/** Take this phone's owner's town away at once (switched off, signed out, home again). */
export async function unshareHere() {
  writeLast(null)
  if (!supabase) return
  try { await supabase.from('member_whereabouts').delete().not('member_id', 'is', null) } catch { /* the row lapses by itself in twelve hours */ }
}

/** Share while away, take it away at home: an effect for Home, drawing nothing. */
export function ShareHere({ here, me }) {
  const tier = here && here.tier
  const row = whereaboutsRow(here, me && me.id)
  const key = row ? `${row.town}|${row.lat}|${row.lng}` : tier || ''
  useEffect(() => {
    if (!supabase || !me) return
    const last = readLast()
    if (row && shouldShare(row, last)) {
      supabase.from('member_whereabouts').upsert(row, { onConflict: 'member_id' }).then(({ error }) => { if (!error) writeLast(row) })
    } else if (!row && last && (tier === 'home' || tier === 'near' || here.status === 'off')) unshareHere()
  }, [key, me && me.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/** Everyone's rows (the family reads them): { rows }, looked at again every five minutes. */
export function useWhereabouts() {
  const session = useSession()
  const [rows, setRows] = useState([])
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setRows([]); return undefined }
    const look = () => supabase.from('member_whereabouts').select('member_id, town, region, cc, lat, lng, updated_at, expires_at').gt('expires_at', new Date().toISOString()).limit(20)
      .then(({ data }) => { if (live) setRows(data || []) })
    look()
    const t = setInterval(look, 5 * 60e3)
    return () => { live = false; clearInterval(t) }
  }, [session])
  return rows
}
