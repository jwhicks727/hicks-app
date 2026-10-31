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
