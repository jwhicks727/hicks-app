import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useSession } from './auth.js'
import { gateState } from './gate.js'

/**
 * What the app shows first: { state, session, retry }. Signed in isn't
 * enough: the database is asked whether the address is on the family list
 * (`is_family()`, the same check every table's policy makes), so a stranger
 * who got a sign-in link sees nothing either.
 */
export function useGate() {
  const session = useSession()
  const [family, setFamily] = useState(undefined)
  const [again, setAgain] = useState(0)
  const id = session ? session.user.id : null
  useEffect(() => {
    if (!supabase || !id) { setFamily(undefined); return undefined }
    let live = true
    setFamily(undefined)
    supabase.rpc('is_family').then(({ data, error }) => { if (live) setFamily(error ? null : data === true) }, () => { if (live) setFamily(null) })
    return () => { live = false }
  }, [id, again])
  const retry = useCallback(() => setAgain((n) => n + 1), [])
  return { state: gateState({ configured: Boolean(supabase), dev: import.meta.env.DEV, session, family }), session, retry }
}
