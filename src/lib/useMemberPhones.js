import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/**
 * Phone numbers by family member (public.member_phones: parents only, so a
 * child's account gets nothing). { phones: { [member id]: '+1909…' }, error,
 * loaded, save(memberId, e164), reload }. `error` says when the table isn't
 * there yet (its migration hasn't been run).
 */
export function useMemberPhones(session, enabled = true) {
  const [state, setState] = useState({ phones: {}, error: null, loaded: false })
  const load = useCallback(async () => {
    if (!supabase || !session || !enabled) return
    const { data, error } = await supabase.from('member_phones').select('member_id, phone')
    setState({ phones: Object.fromEntries((data || []).map((r) => [r.member_id, r.phone])), error: error ? error.message : null, loaded: true })
  }, [session, enabled])
  useEffect(() => { load() }, [load])
  const save = async (memberId, phone) => {
    const { error } = await supabase.from('member_phones').upsert({ member_id: memberId, phone, updated_at: new Date().toISOString() }, { onConflict: 'member_id' })
    if (!error) await load()
    return { error }
  }
  return { ...state, save, reload: load }
}
