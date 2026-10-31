import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { clearDrafts } from './useDraft.js'

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
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/' } })
}

/** Sign in with an email and a password: it works in the installed app, and costs no email. */
export function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

/** Set, or change, the signed-in person's password. */
export function setPassword(password) {
  return supabase.auth.updateUser({ password })
}

/** Sign in with the code from the email: it works inside the installed app, where a link would open the browser instead. */
export function signInWithCode(email, token) {
  return supabase.auth.verifyOtp({ email, token, type: 'email' })
}

/** Signing out also forgets anything half-typed on this device. */
export function signOut() {
  clearDrafts()
  return supabase.auth.signOut()
}
