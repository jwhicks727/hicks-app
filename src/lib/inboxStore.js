// ============================================
// inboxStore.js -- a batch of Laurie's paintings, waiting in the family's storage
// ============================================
// Each photo waiting to be checked is a row in `painting_inbox` (parents only) and
// three files in the private `paintings` bucket under `inbox/<id>/`: `kept` (the
// photo, 3600 px at most), `view` (1600 px, for the crop screen) and `thumb`. So a
// set sent from a phone can be cropped on a computer, or left half done and picked
// up on another device (supabase/migrations/20261108120000_painting_inbox.sql).
// The pure parts (what a row holds, how two copies merge) are in
// src/lib/paintingBatch.js, where `npm test` can run them.
import { supabase } from './supabase.js'
import { inboxData, inboxPath } from './paintingBatch.js'

const BUCKET = 'paintings'
export const INBOX_NAMES = ['kept', 'view', 'thumb']

const signed = new Map() // path -> { url, until }
// A photo just prepared on this device is held here while it's sent up in the background, so it can be shown,
// cropped and read at once, and a slow or failed upload never holds anything up. Dropped once it's in storage.
const here = new Map() // `${id}:${name}` -> { blob, url }
export function holdHere(id, name, blob) { here.set(`${id}:${name}`, { blob, url: URL.createObjectURL(blob) }) }
export const hereBlob = (id, name) => (here.get(`${id}:${name}`) || {}).blob
/** Lets go of a photo's blobs (the addresses already handed to the screen stay good until the page closes). */
export function releaseHere(id) { for (const n of INBOX_NAMES) here.delete(`${id}:${n}`) }

/** A link to one of a photo's pictures that's good for an hour (kept a little under that). */
export async function inboxUrl(id, name) {
  const mine = here.get(`${id}:${name}`)
  if (mine) return mine.url
  const path = inboxPath(id, name), hit = signed.get(path)
  if (hit && hit.until > Date.now()) return hit.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error || !data || !data.signedUrl) throw new Error((error && error.message) || 'That picture couldn’t be found in the family’s storage.')
  signed.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60 * 1000 })
  return data.signedUrl
}

/** One of a photo's pictures, as a blob (the kept copy, to crop or to read). */
export async function inboxBlob(id, name = 'kept') {
  if (here.has(`${id}:${name}`)) return here.get(`${id}:${name}`).blob
  const { data, error } = await supabase.storage.from(BUCKET).download(inboxPath(id, name))
  if (error || !data) throw new Error('The photo isn’t in the family’s storage any more.')
  return data
}

/** Sends one of a photo's pictures up. */
export const putInboxFile = (id, name, blob) => supabase.storage.from(BUCKET).upload(inboxPath(id, name), blob, { contentType: 'image/jpeg', upsert: true })

/** Takes pictures away: all three of each photo by default. */
export async function dropInboxFiles(ids, names = INBOX_NAMES) {
  const paths = ids.flatMap((id) => names.map((n) => inboxPath(id, n)))
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
  paths.forEach((p) => signed.delete(p))
}

/** Every photo waiting, as the items the batch screen works with. (A batch is a few dozen at most, far under the 1000-row limit.) */
export async function loadInbox() {
  // A request that never answers mustn't hold the screen up for ever
  const asked = supabase.from('painting_inbox').select('id, data').limit(1000)
  const { data, error } = await Promise.race([asked, new Promise((ok) => setTimeout(() => ok({ error: { message: 'The family’s storage didn’t answer.' } }), 15000))])
  if (error) throw new Error(error.message)
  return (data || []).map((r) => ({ ...r.data, id: r.id }))
}

/** Writes a photo's state (its row is made the first time). */
export const saveInboxRow = (item) => supabase.from('painting_inbox').upsert({ id: item.id, data: inboxData(item) }, { onConflict: 'id' })

/** Takes photos' rows away. */
export const dropInboxRows = (ids) => (ids.length ? supabase.from('painting_inbox').delete().in('id', ids) : Promise.resolve({ error: null }))
