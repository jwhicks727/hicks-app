// ============================================
// photoStore.js -- photos waiting on this phone until they're saved
// ============================================
// A batch of Laurie's paintings takes a while to check, and iOS closes the
// installed app in the background, so each photo is kept on the device
// (IndexedDB: localStorage is far too small for pictures) until its painting is
// in her gallery or the batch is put away (CLAUDE.md, "Half-done work survives
// interruption"). Signing out forgets them all, like every other draft. A
// browser without IndexedDB (some private windows) keeps them in memory only.

const NAME = 'teamhicks-photos', STORE = 'photos'
const memory = new Map()
let opening = null

function db() {
  if (!opening) {
    opening = new Promise((ok, no) => {
      if (typeof indexedDB === 'undefined') { no(new Error('no IndexedDB')); return }
      const r = indexedDB.open(NAME, 1)
      r.onupgradeneeded = () => r.result.createObjectStore(STORE)
      r.onsuccess = () => ok(r.result)
      r.onerror = () => no(r.error)
    })
    opening.catch(() => {})
  }
  return opening
}

async function run(mode, act, fallback) {
  let d
  try { d = await db() } catch { return fallback() }
  return new Promise((ok, no) => {
    const tx = d.transaction(STORE, mode), req = act(tx.objectStore(STORE))
    tx.oncomplete = () => ok(req ? req.result : undefined)
    tx.onerror = () => no(tx.error)
    tx.onabort = () => no(tx.error || new Error('The phone ran out of room for photos'))
  })
}

/** Keep a picture under a key ("<photo id>:kept", ":view", ":thumb"). */
export const putPhoto = (key, blob) => run('readwrite', (s) => s.put(blob, key), () => { memory.set(key, blob) })
/** The picture under a key, or undefined. */
export const getPhoto = (key) => run('readonly', (s) => s.get(key), () => memory.get(key))
/** Forget every picture of one photo. */
export const dropPhoto = (id) => run('readwrite', (s) => s.delete(IDBKeyRange.bound(id + ':', id + ':￿')), () => { for (const k of [...memory.keys()]) if (k.startsWith(id + ':')) memory.delete(k) })
/** Forget some of a photo's pictures (the big ones, once its painting is saved; the thumbnail stays for the batch's strip). */
export const dropKeys = (keys) => run('readwrite', (s) => { keys.forEach((k) => s.delete(k)) }, () => { keys.forEach((k) => memory.delete(k)) })
/** Forget them all (a batch put away). */
export const dropAllPhotos = () => run('readwrite', (s) => s.clear(), () => { memory.clear() })

/** On signing out: the whole store goes, closed first so the deletion isn't held up. */
export function forgetPhotos() {
  memory.clear()
  const was = opening
  opening = null
  const wipe = () => { try { indexedDB.deleteDatabase(NAME) } catch { /* nothing kept */ } }
  if (was) was.then((d) => { d.close(); wipe() }, wipe)
  else if (typeof indexedDB !== 'undefined') wipe()
}
