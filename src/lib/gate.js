// ============================================
// gate.js -- nothing in the app shows until someone has signed in
// ============================================
// Pure, so tests run it in Node. The screens that act on it are
// src/shell/Gate.jsx and src/shell/SignIn.jsx.

/**
 * What the app shows first:
 * - 'open'         the app itself
 * - 'signin'       the sign-in screen, and nothing else
 * - 'loading'      still finding out (the saved session, or whether it's family)
 * - 'notfamily'    signed in, but the address isn't on the family list
 * - 'trouble'      signed in, but the family list couldn't be asked
 * - 'unconfigured' a hosted copy built without the database's address
 * `configured`: the database's address and key were built in. `dev`: the
 * development server, where a copy with no database still shows the app, so
 * it can be looked at before anything is set up. `family`: undefined while
 * asking, true or false once answered, null if it couldn't be asked.
 */
export function gateState({ configured, dev = false, session, family }) {
  if (!configured) return dev ? 'open' : 'unconfigured'
  if (session === undefined) return 'loading'
  if (!session) return 'signin'
  if (family === undefined) return 'loading'
  if (family === null) return 'trouble'
  return family ? 'open' : 'notfamily'
}

/** A sign-in problem in words a person can act on. `host` is the database's address the app was built with. */
export function signInProblem(message, host = '') {
  const m = String(message || '')
  if (/invalid login credentials/i.test(m)) return 'That email and password don’t match. No password yet? Email yourself a sign-in link, then set one in Settings.'
  if (/rate limit|too many/i.test(m)) return 'Too many emails just now. Wait a few minutes and try again.'
  if (/failed to fetch|load failed|networkerror|network request/i.test(m)) {
    return `Couldn’t reach the database${host ? ` at ${host}` : ''}. Check the connection. If this is the first time, the address the app was built with may be wrong: it should be the project’s own address, https://<project>.supabase.co.`
  }
  if (/signups? not allowed|not allowed/i.test(m)) return 'That address isn’t on the family list.'
  if (/expired|invalid|token/i.test(m)) return 'That code didn’t work. It may have expired: ask for a new one.'
  return m || 'That didn’t work. Try again.'
}

/** The code from the email: digits only, 6 to 10 of them, or null. */
export function codeOf(text) {
  const d = String(text || '').replace(/\D/g, '')
  return d.length >= 6 && d.length <= 10 ? d : null
}

export const MIN_PASSWORD = 10

/** What is wrong with a new password and its repeat, or null. */
export function passwordIssue(password, again, email = '') {
  const p = String(password || '')
  if (p.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters. A few words in a row is easy to remember and hard to guess.`
  if (p !== String(again || '')) return 'The two don’t match.'
  if (email && p.toLowerCase() === String(email).toLowerCase()) return 'The password can’t be your email address.'
  return null
}

/** Why Supabase refused a new password, in words a person can act on. */
export function passwordProblem(message) {
  const m = String(message || '')
  if (/same password|different from the old/i.test(m)) return 'That’s already your password.'
  if (/reauthentic|recent|log(ged)? in again/i.test(m)) return 'Sign out and sign in again, then try once more: changing a password needs a recent sign-in.'
  if (/at least|too short|weak|pwned|leaked|characters/i.test(m)) return m
  if (/rate limit|too many/i.test(m)) return 'Too many tries just now. Wait a few minutes.'
  return m || 'That didn’t work. Try again.'
}
