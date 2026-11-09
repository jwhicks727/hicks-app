// ============================================
// inboxStore.js -- a batch waiting in the family's storage (Laurie's paintings, Anna's drawings)
// ============================================
// Each photo waiting to be checked is a row in an inbox table and three files in a
// private bucket under `inbox/<id>/`: `kept` (the photo, 3600 px at most), `view`
// (1600 px, for the crop screen) and `thumb`. So a set sent from a phone can be
// cropped on a computer, or left half done and picked up on another device.
//   Laurie's paintings: `painting_inbox` (parents only) and the `paintings` bucket
//     (supabase/migrations/20261108120000_painting_inbox.sql)
//   Anna's drawings: `drawing_inbox` (whoever sent them, and the parents) and the
//     `drawings` bucket (supabase/migrations/20261108150000_drawing_inbox.sql)
// The pure parts (what a row holds, how two copies merge) are in
// src/lib/paintingBatch.js, where `npm test` can run them.
import { supabase } from './supabase.js'
import { media } from './media.js'
import { inboxData, inboxPath } from './paintingBatch.js'

export const INBOX_NAMES = ['kept', 'view', 'thumb']

/**
 * One kind of batch's storage calls. `upsert: false` for a bucket whose files may be added but not written over
 * (a file already there, from a try that got part way, counts as sent); `keys` is what a row keeps of a photo; `rowExtra`
 * adds columns a row has besides its data, and `itemExtra` reads them back.
 */
export function makeInbox({ table, bucket, upsert = true, keys, columns = 'id, data', rowExtra = () => ({}), itemExtra = () => ({}) }) {
  const signed = new Map() // path -> { url, until }
  // A photo just prepared on this device is held here while it's sent up in the background, so it can be shown,
  // cropped and read at once, and a slow or failed upload never holds anything up. Dropped once it's in storage.
  const here = new Map() // `${id}:${name}` -> { blob, url }
  const holdHere = (id, name, blob) => { here.set(`${id}:${name}`, { blob, url: URL.createObjectURL(blob) }) }
  const hereBlob = (id, name) => (here.get(`${id}:${name}`) || {}).blob
  /** Lets go of a photo's blobs (the addresses already handed to the screen stay good until the page closes). */
  const releaseHere = (id) => { for (const n of INBOX_NAMES) here.delete(`${id}:${n}`) }

  /** A link to one of a photo's pictures that's good for an hour (kept a little under that). */
  async function inboxUrl(id, name) {
    const mine = here.get(`${id}:${name}`)
    if (mine) return mine.url
    const path = inboxPath(id, name), hit = signed.get(path)
    if (hit && hit.until > Date.now()) return hit.url
    const { data, error } = await media.from(bucket).createSignedUrl(path, 3600)
    if (error || !data || !data.signedUrl) throw new Error((error && error.message) || 'That picture couldn’t be found in the family’s storage.')
    signed.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60 * 1000 })
    return data.signedUrl
  }

  /** One of a photo's pictures, as a blob (the kept copy, to crop or to read). */
  async function inboxBlob(id, name = 'kept') {
    if (here.has(`${id}:${name}`)) return here.get(`${id}:${name}`).blob
    const { data, error } = await media.from(bucket).download(inboxPath(id, name))
    if (error || !data) throw new Error('The photo isn’t in the family’s storage any more.')
    return data
  }

  /** Sends one of a photo's pictures up. */
  async function putInboxFile(id, name, blob) {
    const res = await media.from(bucket).upload(inboxPath(id, name), blob, { contentType: 'image/jpeg', upsert })
    if (res.error && !upsert && (String(res.error.statusCode) === '409' || /already exists|duplicate/i.test(res.error.message || ''))) return { error: null }
    return res
  }

  /** Takes pictures away: all three of each photo by default. */
  async function dropInboxFiles(ids, names = INBOX_NAMES) {
    const paths = ids.flatMap((id) => names.map((n) => inboxPath(id, n)))
    if (paths.length) await media.from(bucket).remove(paths)
    paths.forEach((p) => signed.delete(p))
  }

  /** Every photo waiting that this person may see, as the items the batch screen works with. (A batch is a few dozen at most, far under the 1000-row limit.) */
  async function loadInbox() {
    // A request that never answers mustn't hold the screen up for ever
    const asked = supabase.from(table).select(columns).limit(1000)
    const { data, error } = await Promise.race([asked, new Promise((ok) => setTimeout(() => ok({ error: { message: 'The family’s storage didn’t answer.' } }), 15000))])
    if (error) throw new Error(error.message)
    return (data || []).map((r) => ({ ...r.data, id: r.id, ...itemExtra(r) }))
  }

  /** Writes a photo's state (its row is made the first time). */
  const saveInboxRow = (item) => supabase.from(table).upsert({ id: item.id, data: inboxData(item, keys), ...rowExtra(item) }, { onConflict: 'id' })

  /** Takes photos' rows away. */
  const dropInboxRows = (ids) => (ids.length ? supabase.from(table).delete().in('id', ids) : Promise.resolve({ error: null }))

  return { inboxUrl, inboxBlob, putInboxFile, dropInboxFiles, loadInbox, saveInboxRow, dropInboxRows, holdHere, hereBlob, releaseHere }
}

// Laurie's paintings: parents only, in the `paintings` bucket
export const paintingsInbox = makeInbox({ table: 'painting_inbox', bucket: 'paintings' })
export const { inboxUrl, inboxBlob, putInboxFile, dropInboxFiles, loadInbox, saveInboxRow, dropInboxRows, holdHere, hereBlob, releaseHere } = paintingsInbox
