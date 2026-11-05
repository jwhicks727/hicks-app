// ============================================
// google.js -- the writer's own Google sign-in, for their journal's Doc
// ============================================
// Only the journal's Doc sync uses this (src/lib/journalDoc.js). It asks
// Google for one permission, drive.file: the app may open only the files the
// person picks for it (or makes with it), never the rest of their Drive.
// Google hands the browser a key that lasts an hour; it's kept on this device
// until then and forgotten on sign-out. No server sees it.
//
// Signing in goes to Google and comes back to /google-return.html, a page
// with no words on it that keeps the key and returns to the journal. It is
// its own page, not the app, because the app's database client would take a
// key arriving in the address for one of its own.

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
export const GOOGLE = { clientId: env.VITE_GOOGLE_CLIENT_ID || '', apiKey: env.VITE_GOOGLE_API_KEY || '', appId: env.VITE_GOOGLE_APP_ID || '' }
export const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const TOKEN = 'teamhicks.google'
const PENDING = 'teamhicks.google.pending'
const ERROR = 'teamhicks.google.error'

/** Whether this copy of the app was built with the Google settings (docs/SECRETS.md). */
export const googleReady = () => Boolean(GOOGLE.clientId && GOOGLE.apiKey && GOOGLE.appId)

/** Google only lets sign-in come back to addresses listed for the app: the app's own and a computer's localhost. */
export const allowedHere = (host) => host === 'hicks.web.app' || host === 'localhost' || host === '127.0.0.1'

/** Google's sign-in address: an hour's key for drive.file, coming back to the return page. */
export function authUrl({ clientId, redirectUri, state, hint }) {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'token', scope: SCOPE, include_granted_scopes: 'true', state })
  if (hint) q.set('login_hint', hint)
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

/** Only a path inside the app to come back to, never another site. */
export const safeBack = (p) => (typeof p === 'string' && /^\/[a-z]/.test(p) && !p.startsWith('//') ? p : '/journal')

/** The key Google sent back to the return page, checked against the sign-in this device started; null if anything is off. */
export function readReturn(hash, pending, now = Date.now()) {
  const q = new URLSearchParams(String(hash || '').replace(/^#/, ''))
  if (!pending || !pending.state || q.get('state') !== pending.state || !q.get('access_token')) return null
  if (!String(q.get('scope') || '').split(' ').includes(SCOPE)) return null
  const secs = Math.max(0, Math.min(3600, parseInt(q.get('expires_in') || '0', 10) || 0))
  return { token: q.get('access_token'), expires: now + secs * 1000 }
}

const store = () => { try { return window.localStorage } catch { return null } }
const getJson = (k) => { try { return JSON.parse(store().getItem(k)) } catch { return null } }

/** The key, while it has at least a minute left; else null. */
export function googleToken(now = Date.now()) {
  const t = getJson(TOKEN)
  return t && t.token && t.expires - 60000 > now ? t.token : null
}
export function forgetGoogle() { try { store().removeItem(TOKEN); store().removeItem(PENDING); store().removeItem(ERROR) } catch { /* nothing kept */ } }
/** Why the last sign-in didn't finish, once (Google's own word: access_denied when someone said no). */
export function googleError() { try { const e = store().getItem(ERROR); store().removeItem(ERROR); return e } catch { return null } }

/** Off to Google to sign in, coming back to `back`. */
export function signInWithGoogle(back, hint) {
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  const state = [...a].map((x) => x.toString(16).padStart(2, '0')).join('')
  store().setItem(PENDING, JSON.stringify({ state, back: safeBack(back) }))
  window.location.assign(authUrl({ clientId: GOOGLE.clientId, redirectUri: `${window.location.origin}/google-return.html`, state, hint }))
}

// ---- The Docs API, with the key --------------------------------------------------------------------

export class GoogleError extends Error {
  constructor(message, kind) { super(message); this.kind = kind }
}

async function call(url, token, init = {}) {
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
  if (r.status === 401) { forgetGoogle(); throw new GoogleError('Google asked to sign in again.', 'signin') }
  if (r.status === 403 || r.status === 404) throw new GoogleError('The app can’t open that Doc any more. Choose it again.', 'access')
  const body = await r.json().catch(() => ({}))
  if (r.status === 400 && /revision/i.test((body.error && body.error.message) || '')) throw new GoogleError('The Doc changed while the app was writing.', 'moved')
  if (!r.ok) throw new GoogleError((body.error && body.error.message) || `Google said ${r.status}.`, 'other')
  return body
}

export const getDoc = (id, token) => call(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}`, token)
/** Edit the Doc, but only if nobody has changed it since it was read. */
export const editDoc = (id, token, requests, revisionId) => call(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(id)}:batchUpdate`, token, {
  method: 'POST', body: JSON.stringify({ requests, writeControl: { requiredRevisionId: revisionId } }),
})

// ---- Google's own file picker ----------------------------------------------------------------------

let picker = null
function pickerLoaded() {
  if (picker) return picker
  picker = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://apis.google.com/js/api.js'
    s.async = true
    s.onload = () => window.gapi.load('picker', { callback: resolve, onerror: () => reject(new GoogleError('Google’s file picker didn’t load.', 'other')) })
    s.onerror = () => { picker = null; reject(new GoogleError('Google’s file picker didn’t load.', 'other')) }
    document.head.appendChild(s)
  })
  return picker
}

/** The person picks their journal's Doc: { id, title }, or null if they closed the picker. */
export async function pickDoc(token) {
  await pickerLoaded()
  const P = window.google.picker
  return new Promise((resolve) => {
    const view = new P.DocsView(P.ViewId.DOCUMENTS).setMode(P.DocsViewMode.LIST).setSelectFolderEnabled(false)
    new P.PickerBuilder()
      .addView(view).setOAuthToken(token).setDeveloperKey(GOOGLE.apiKey).setAppId(GOOGLE.appId).setTitle('Choose your journal')
      .setCallback((d) => {
        if (d.action === P.Action.PICKED && d.docs && d.docs[0]) resolve({ id: d.docs[0].id, title: d.docs[0].name || 'Your journal' })
        else if (d.action === P.Action.CANCEL) resolve(null)
      })
      .build().setVisible(true)
  })
}
