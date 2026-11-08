import { useCallback, useEffect, useState } from 'react'
import { addBeen } from './useBeen.js'
import { readStays, writeStays, readOutbox, writeOutbox, STAY_EVENT } from './stayStore.js'
import { updateStays, setDismissed, enqueue, dequeue, retryable } from './stay.js'

// ============================================
// useStay -- the recap of a stay away, and places waiting to be sent
// ============================================
// Device storage (src/lib/stayStore.js), the pure rules in src/lib/stay.js.

/** { stays, outbox, dismiss, restore }: both lists as this phone has them, kept in step across screens. */
export function useStay() {
  const [state, setState] = useState(() => ({ stays: readStays(), outbox: readOutbox() }))
  useEffect(() => {
    const on = () => setState({ stays: readStays(), outbox: readOutbox() })
    window.addEventListener(STAY_EVENT, on)
    return () => window.removeEventListener(STAY_EVENT, on)
  }, [])
  return {
    ...state,
    dismiss: useCallback((id) => writeStays(setDismissed(readStays(), id, true)), []),
    restore: useCallback((id) => writeStays(setDismissed(readStays(), id, false)), []),
  }
}

/** Away in a town, today joins its stay (or starts one): the town and the day only, never a point. */
export function useRememberStay(here, today) {
  const town = here && here.tier === 'away' ? ((here.town && here.town.town) || (here.place && here.place.town) || '') : ''
  const tier = here && here.tier
  useEffect(() => {
    if (!tier) return
    const before = readStays()
    const after = updateStays(before, here, today)
    if (JSON.stringify(before) !== JSON.stringify(after)) writeStays(after)
  }, [tier, town, today]) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Add a place we went; if it can't be saved just now (no signal, a hiccup), it waits on the
 * phone and is sent again: { id, created, queued, error }. A bad entry (no name) is never queued.
 */
export async function addBeenOrQueue(t, place, day) {
  let r
  try { r = await addBeen(t, place, day) } catch { r = { id: null, error: 'It couldn’t be reached just now' } }
  if (!r.error) return { ...r, queued: false }
  if (!retryable(r.error)) return { ...r, queued: false }
  writeOutbox(enqueue(readOutbox(), { town: t, place, day }))
  return { id: null, created: false, queued: true, error: null }
}

let flushing = false
/** Send what's waiting, oldest first, stopping at the first that still can't go. Returns how many were sent. */
export async function flushOutbox() {
  if (flushing) return 0
  flushing = true
  let sent = 0
  try {
    for (const q of readOutbox()) {
      let r
      try { r = await addBeen(q.town, q.place, q.day) } catch { break }
      if (r.error && retryable(r.error)) break
      writeOutbox(dequeue(readOutbox(), q.id))
      if (!r.error) sent += 1
    }
  } finally { flushing = false }
  return sent
}

/** Home sends what's waiting when it opens, when the phone comes back online, and every few minutes. */
export function useOutboxFlush(session) {
  useEffect(() => {
    if (!session) return undefined
    const go = () => { if (readOutbox().length && navigator.onLine !== false) flushOutbox() }
    go()
    window.addEventListener('online', go)
    const t = setInterval(go, 3 * 60e3)
    return () => { window.removeEventListener('online', go); clearInterval(t) }
  }, [session])
}
