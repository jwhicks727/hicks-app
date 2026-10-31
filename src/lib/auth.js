import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

/** The signed-in session, or null; `undefined` while it's still being read. */
export function useSession() {
  const [session, setSession] = useState(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

/** Email a sign-in link. Only the family's addresses can see anything once in. */
export function sendSignInLink(email) {
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/settings' } })
}

export function signOut() {
  return supabase.auth.signOut()
}
