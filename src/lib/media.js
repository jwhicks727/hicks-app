// ============================================
// media.js -- the family's pictures, wherever they're kept: Cloudflare R2 through the `media` function
// ============================================
// `media.from(area)` has the same shape as `supabase.storage.from(bucket)` (upload,
// createSignedUrl(s), download, remove), so every screen reads and writes pictures
// the same way it always has. Underneath, it asks the `media` function
// (supabase/functions/media) for short-lived signed links to the family's private
// R2 bucket; the app never holds R2's keys. Until that function is deployed and
// R2 is set up (it says so), everything goes to Supabase's storage exactly as
// before, so the app works in any order of setting up (docs/R2-SETUP.md).
// Areas are the old bucket names: paintings, drawings, trips, garden, academy.
import { supabase } from './supabase.js'

let mode = null // 'r2' once the function answers; 'supabase' when it isn't deployed or R2 isn't set up
const CHUNK = 200
// Whether this device has ever had an answer from R2. Before it has, a function that can't be reached
// counts as not there yet (one that isn't deployed can fail the browser's CORS check instead of saying
// 404). After, a failure is a failure, shown in words, so nothing is quietly saved in the wrong place.
const SEEN = 'hicks:media-r2-seen'
const seenR2 = () => { try { return localStorage.getItem(SEEN) === '1' } catch { return false } }
const noteR2 = (yes) => { try { if (yes) localStorage.setItem(SEEN, '1'); else localStorage.removeItem(SEEN) } catch { /* a private window */ } }

/** The function's answers for these operations, or null when pictures still live in Supabase's storage. */
async function ask(ops) {
  if (mode === 'supabase' || !supabase) return null
  const { data, error } = await supabase.functions.invoke('media', { body: { ops } })
  if (error) {
    const status = error.context && error.context.status
    if (status === 404) { mode = 'supabase'; return null } // not deployed yet: the old way
    if (mode === null && !seenR2() && (!status || status === 401 || status >= 500)) { mode = 'supabase'; return null } // not reachable yet, and never has been here
    let why = ''
    try { why = (await error.context.json()).error } catch { /* no body */ }
    throw new Error(why || 'The picture store couldn’t be reached just now')
  }
  if (data && data.notSetUp) { mode = 'supabase'; noteR2(false); return null }
  if (mode !== 'r2') noteR2(true)
  mode = 'r2'
  return (data && data.results) || []
}

/** Where pictures are kept for this visit: 'r2', 'supabase', or null before the first ask. */
export const mediaMode = () => mode
/** Ask once, to know where pictures are kept ('r2' or 'supabase'). */
export async function whereKept() {
  if (mode) return mode
  try { await ask([{ op: 'head', area: 'paintings', path: 'probe.jpg' }]) } catch { return null }
  return mode
}

const fail = (message, statusCode = '400') => ({ data: null, error: { message, statusCode: String(statusCode) } })

/** One area's pictures, shaped like Supabase's storage client. */
export function from(area) {
  const old = () => supabase.storage.from(area)

  async function createSignedUrls(paths, seconds = 3600) {
    const out = []
    for (let i = 0; i < paths.length; i += CHUNK) {
      const part = paths.slice(i, i + CHUNK)
      let r
      try { r = await ask(part.map((path) => ({ op: 'get', area, path, expires: seconds }))) } catch (e) { return { data: null, error: { message: e.message } } }
      if (!r) return old().createSignedUrls(paths, seconds)
      part.forEach((path, k) => out.push({ path, signedUrl: (r[k] && r[k].url) || null, error: r[k] && r[k].error ? r[k].error : null }))
    }
    return { data: out, error: null }
  }

  async function createSignedUrl(path, seconds = 3600) {
    const { data, error } = await createSignedUrls([path], seconds)
    if (error) return { data: null, error }
    const one = data && data[0]
    return one && one.signedUrl ? { data: { signedUrl: one.signedUrl }, error: null } : { data: null, error: { message: (one && one.error) || 'Object not found', statusCode: '404' } }
  }

  return {
    createSignedUrls,
    createSignedUrl,
    /** Stores a picture: a signed link from the function, then the picture straight to R2. */
    async upload(path, blob, opts = {}) {
      let r
      const op = { op: 'put', area, path, type: opts.contentType || blob.type, size: blob.size, upsert: Boolean(opts.upsert) }
      if (opts.owner) op.owner = opts.owner // a parent moving a drawing over keeps who added it
      try { r = await ask([op]) } catch (e) { return fail(e.message, 502) }
      if (!r) return old().upload(path, blob, opts)
      const x = r[0] || {}
      if (x.error) return fail(x.error, x.status || 400)
      let res
      try { res = await fetch(x.url, { method: 'PUT', headers: x.headers || {}, body: blob }) } catch { return fail('The picture couldn’t be sent just now', 502) }
      if (!res.ok) return fail(`The picture couldn’t be stored (R2 answered ${res.status})`, res.status)
      return { data: { path }, error: null }
    },
    /** A picture as a blob (to crop again, or to send to Claude). */
    async download(path) {
      if (mode === 'supabase') return old().download(path)
      const { data, error } = await createSignedUrl(path, 600)
      if (!data) return mode === 'supabase' ? old().download(path) : { data: null, error }
      try {
        const res = await fetch(data.signedUrl)
        if (!res.ok) return fail('Object not found', res.status)
        return { data: await res.blob(), error: null }
      } catch { return fail('The picture couldn’t be fetched just now', 502) }
    },
    /** Takes pictures away (each as this person may: the function checks). */
    async remove(paths) {
      const want = (paths || []).filter(Boolean)
      if (!want.length) return { data: [], error: null }
      let r
      try { r = await ask(want.map((path) => ({ op: 'delete', area, path }))) } catch (e) { return fail(e.message, 502) }
      if (!r) return old().remove(want)
      const bad = r.find((x) => x && x.error)
      return bad ? fail(bad.error, bad.status || 400) : { data: want.map((name) => ({ name })), error: null }
    },
    /** Whether R2 has each of these, and how big (null when pictures still live in Supabase's storage). */
    async heads(paths) {
      const out = []
      for (let i = 0; i < paths.length; i += CHUNK) {
        const part = paths.slice(i, i + CHUNK)
        const r = await ask(part.map((path) => ({ op: 'head', area, path })))
        if (!r) return null
        part.forEach((path, k) => out.push({ path, exists: Boolean(r[k] && r[k].exists), size: (r[k] && r[k].size) || 0, error: r[k] && r[k].error }))
      }
      return out
    },
  }
}

export const media = { from }
