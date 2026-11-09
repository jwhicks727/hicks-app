import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDraft } from '../../lib/useDraft.js'
import { askClaude } from '../../lib/claude.js'
import { supabase } from '../../lib/supabase.js'
import { todayAtHome } from '../../lib/useSources.js'
import { findPainting } from '../../lib/autocrop.js'
import {
  fromFound, wholeCrop, applyReading, slugFor, takenSlugs, cleanTitle, cleanYear, cleanMedium, cleanSeasons, cleanMonth, tally, nextToCheck, DONE,
  inboxData, mergeInbox, newId, claimStale,
} from '../../lib/paintingBatch.js'
import { cleanShape } from '../../lib/shapes.js'
import { cleanLooks } from '../../lib/gallery.js'
import { lookAlikes } from '../../lib/artColour.js'
import { loadInbox, saveInboxRow, dropInboxRows, dropInboxFiles, putInboxFile, inboxBlob, holdHere, hereBlob, releaseHere } from '../../lib/inboxStore.js'
import { FILES, PAINTINGS } from '../../lib/paintings.js'
import { preparePhoto, readingFiles, paintingFiles, oneAtATime, printOfCrop, printFromPicture, measurePicture } from './paintingPhotos.js'

/** A crop as a short key, to tell whether a fingerprint was taken of the crop as it is now. */
export const cropKey = (c) => (c ? [c.turn, c.angle, c.cx, c.cy, c.w, c.h].map((v) => Math.round(v)).join(',') : '')
/** The columns the gallery-improvements migration adds (20261108200000): left out and tried again if it hasn't been run. */
const NEW_COLUMNS = ['month', 'shape', 'palette', 'print', 'looks']
export const missingColumn = (e) => Boolean(e && (e.code === 'PGRST204' || e.code === '42703' || /column .* (does not exist|of 'paintings')|could not find the '.*' column/i.test(e.message || '')))
/** A write to the paintings table that still works before the migration is run: without the new columns, the second time. */
export async function writePainting(run, row) {
  const first = await run(row)
  if (!first.error || !missingColumn(first.error)) return { ...first, old: false }
  const again = await run(Object.fromEntries(Object.entries(row).filter(([k]) => !NEW_COLUMNS.includes(k))))
  return { ...again, old: true }
}

// The batch of photos being added to Laurie's gallery. It lives in the family's
// storage (src/lib/inboxStore.js), not on one device, so a set sent from a phone can be
// cropped on a computer, or left half done and picked up on another device. This
// device keeps only its own small draft: whether to have Claude read, and which photo
// it was on. Three queues run by themselves while the screen is open: each new photo
// is shrunk and auto-cropped here, one at a time, so it can be checked and read at once, and
// sent up in the background (never in the queue the canvas work waits in, so a slow or
// stuck upload holds nothing up); Claude reads its signature, three at a time, the one on
// screen first; and each one the parent says looks right is saved to her gallery, one at a
// time, while they go on to the next. Changes to a photo
// are sent to storage a moment after they're made, and the screen looks again when it's
// opened or comes back into view, so two devices see each other's work.
const BLANK = { read: true, at: null }
const READ_AT_ONCE = 3
const READ_TIMEOUT_MS = 90 * 1000
const PUSH_AFTER_MS = 600

const within = (p, ms, why) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(why)), ms))])

export function usePaintingBatch({ gallery, onSaved }) {
  const [ui, setUi, clearUi] = useDraft('paintings.inbox', BLANK)
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [pause, setPause] = useState(null) // why reading has stopped for now
  const latest = useRef(items)
  latest.current = items
  const pushed = useRef(new Map()) // id -> what storage last had (JSON), to tell what's changed here
  // id -> when this device last sent it: a look at storage that began before then may bring back the old copy, so it's kept
  const pushedAt = useRef(new Map())
  const saving = useRef(new Set()) // ids this device is saving (another device's stale save may be taken over)
  const files = useRef(new Map()) // id -> the File, until its photo is sent up
  const busy = useRef(new Set()) // "<id>:prep", "<id>:read", "<id>:save"
  const timer = useRef(null)
  const lastLook = useRef(0)
  const thisYear = Number(todayAtHome().slice(0, 4))
  // Fingerprints of her paintings already in the gallery: kept with each, and measured here for any painted before they were
  const [prints, setPrints] = useState({})
  const [oldDb, setOldDb] = useState(false) // the migration for months, shapes and fingerprints hasn't been run

  const update = useCallback((id, fn) => setItems((xs) => xs.map((x) => (x.id === id ? fn(x) : x))), [])
  const isDirty = useCallback((x) => !x.local && pushed.current.get(x.id) !== JSON.stringify(inboxData(x)), [])

  // Looks at what's in storage and brings it in; what this device has changed and not yet sent stays
  const reload = useCallback(async () => {
    lastLook.current = Date.now()
    const began = Date.now()
    let remote
    try { remote = await loadInbox() } catch (e) { setSyncError((e && e.message) || 'The family’s storage couldn’t be reached.'); setLoaded(true); return }
    setSyncError(null)
    // Changed here and not sent, or sent while this look was on its way (storage may have answered with the copy before)
    const dirty = new Set(latest.current.filter((x) => isDirty(x) || (pushedAt.current.get(x.id) || 0) > began - 2000).map((x) => x.id))
    for (const x of remote) if (!dirty.has(x.id)) pushed.current.set(x.id, JSON.stringify(inboxData(x)))
    // A reading another device began and never finished (it was closed) starts again
    const fixed = remote.map((x) => (x.read === 'reading' && claimStale(x.readAt) ? { ...x, read: 'waiting' } : x))
    setItems((local) => mergeInbox(local, fixed, dirty))
    setLoaded(true)
  }, [isDirty])

  // Sends what's changed here to storage
  const flush = useCallback(async () => {
    for (const x of latest.current) {
      if (x.local) continue
      const j = JSON.stringify(inboxData(x))
      if (pushed.current.get(x.id) === j) continue
      pushed.current.set(x.id, j)
      pushedAt.current.set(x.id, Date.now())
      const { error } = await saveInboxRow(x)
      if (error) { pushed.current.delete(x.id); setSyncError(error.message || 'Changes couldn’t be saved to the family’s storage.'); clearTimeout(timer.current); timer.current = setTimeout(flush, 5000); return }
      setSyncError(null)
    }
  }, [])

  // On opening, and whenever the screen comes back or every half a minute while it's open, look at storage; going away sends anything unsent
  useEffect(() => {
    reload()
    // An earlier version kept a batch on the device itself: that's gone now
    try { indexedDB.deleteDatabase('teamhicks-photos'); localStorage.removeItem('teamhicks.draft.paintings.batch') } catch { /* nothing kept */ }
    const look = () => { if (document.visibilityState === 'visible' && Date.now() - lastLook.current > 4000) reload() }
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); else look() }
    const every = setInterval(look, 30000)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', look)
    return () => { clearInterval(every); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', look); flush() }
  }, [reload, flush])

  // A moment after a change, send it
  useEffect(() => {
    if (!loaded) return undefined
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, PUSH_AFTER_MS)
    return () => clearTimeout(timer.current)
  }, [items, loaded, flush])

  const current = items.find((x) => x.id === ui.at) || items.find((x) => !DONE.includes(x.status)) || null
  const atId = current ? current.id : null

  // Sends a prepared photo's three pictures up, in the background, trying again a couple of times; until they're
  // in storage the photo stays `local`, so it isn't offered to other devices
  const send = useCallback(async (id) => {
    const key = id + ':send'
    if (busy.current.has(key)) return
    busy.current.add(key)
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          await Promise.all(['kept', 'view', 'thumb'].map(async (name) => {
            const blob = hereBlob(id, name)
            if (!blob) throw new Error('The photo isn’t on this device any more. Add it again.')
            const { error } = await within(putInboxFile(id, name, blob), 120000, 'Sending it took too long.')
            if (error) throw new Error(error.message || 'It couldn’t be sent to the family’s storage.')
          }))
          break
        } catch (e) {
          if (attempt >= 3) throw e
          await new Promise((ok) => setTimeout(ok, 1500 * attempt))
        }
      }
      releaseHere(id)
      update(id, (x) => ({ ...x, local: false, sending: false, sendError: null }))
    } catch (e) {
      update(id, (x) => ({ ...x, sending: false, sendError: (e && e.message) || 'It couldn’t be sent to the family’s storage.' }))
    } finally {
      busy.current.delete(key)
    }
  }, [update])

  // 1. A new photo, one at a time: shrunk and auto-cropped here, so it can be checked and read at once; then sent up in the background
  useEffect(() => {
    if ([...busy.current].some((k) => k.endsWith(':prep'))) return
    const it = items.find((x) => x.status === 'new' && x.local && files.current.has(x.id))
    if (!it) return
    const key = it.id + ':prep'
    busy.current.add(key)
    oneAtATime(async () => {
      const p = await preparePhoto(files.current.get(it.id))
      const found = findPainting(p.look)
      const crop = found.kind === 'found' ? fromFound(found, p.W, p.H, p.look.width, p.look.height) : wholeCrop(p.W, p.H)
      // Its fingerprint, by the crop, from the little copy already read: so a painting already in her gallery is noticed at once
      return { p, r: { W: p.W, H: p.H, crop, auto: crop, sure: found.sure, kind: found.kind, print: printOfCrop(p.look, crop, p.W, p.H), printOf: cropKey(crop) } }
    }).then(
      ({ p, r }) => {
        files.current.delete(it.id); busy.current.delete(key)
        holdHere(it.id, 'kept', p.kept); holdHere(it.id, 'view', p.view); holdHere(it.id, 'thumb', p.thumb)
        update(it.id, (x) => ({ ...x, ...r, status: 'ready', local: true, sending: true, sendError: null }))
        send(it.id)
      },
      (e) => { files.current.delete(it.id); busy.current.delete(key); update(it.id, (x) => ({ ...x, status: 'failed', error: (e && e.message) || 'That photo couldn’t be opened.' })) },
    )
  }, [items, update, send])

  // 2. Claude reads the signature and suggests a working title, a few at a time, the photo on screen first and then the ones after it
  useEffect(() => {
    if (pause) return
    const under = items.filter((x) => busy.current.has(x.id + ':read')).length
    const from = Math.max(0, items.findIndex((x) => x.id === atId))
    const ordered = [...items.slice(from), ...items.slice(0, from)]
    // A photo still being sent up is read from the copy held here
    const waiting = ordered.filter((x) => x.status === 'ready' && (!x.local || x.sending) && x.read === 'waiting' && !busy.current.has(x.id + ':read'))
    for (const it of waiting.slice(0, Math.max(0, READ_AT_ONCE - under))) {
      const key = it.id + ':read'
      busy.current.add(key)
      // Marked as being read, with the time, so another device doesn't read it too (until the claim goes stale)
      update(it.id, (x) => ({ ...x, read: 'reading', readAt: Date.now(), readError: null }))
      ;(async () => {
        const kept = await within(inboxBlob(it.id), 60000, 'The photo couldn’t be fetched from the family’s storage.')
        const sent = await oneAtATime(() => readingFiles(kept, it.crop))
        const titles = [...gallery.map((p) => p.title), ...latest.current.filter((x) => x.id !== it.id && x.title && x.status !== 'skipped').map((x) => x.title)]
        return within(askClaude('read-painting', { files: sent, titles }), READ_TIMEOUT_MS, 'Claude took too long over this one.')
      })().then((res) => {
        busy.current.delete(key)
        const why = res && res.error
        if (why && /budget/i.test(why)) { setPause(`${why} The rest can be read then, or typed in now.`); update(it.id, (x) => ({ ...x, read: 'waiting' })); return }
        if (why && /unknown task/i.test(why)) { setPause('Reading signatures needs the claude function deployed again (after this change is merged). Until then, type the titles and years.'); update(it.id, (x) => ({ ...x, read: 'waiting' })); return }
        if (why || !res || !res.reading) { update(it.id, (x) => ({ ...x, read: 'failed', readError: why || 'Claude didn’t read this one.' })); return }
        // Already added or left out while Claude read it: what's on screen was what they meant
        update(it.id, (x) => (x.status === 'ready' ? applyReading(x, res.reading, thisYear) : { ...x, read: 'done' }))
      }, (e) => { busy.current.delete(key); update(it.id, (x) => ({ ...x, read: 'failed', readError: (e && e.message) || 'It couldn’t be read.' })) })
    }
  }, [items, pause, atId, gallery, update, thisYear])

  // 2b. A crop changed by hand: its fingerprint is taken again from the crop screen's view, a moment after it settles
  const cur = items.find((x) => x.id === atId)
  const reprint = cur && cur.status === 'ready' && cur.crop && cur.printOf !== cropKey(cur.crop) ? cur : null
  useEffect(() => {
    if (!reprint) return undefined
    const { id, crop, W, H } = reprint, want = cropKey(crop)
    const t = setTimeout(() => {
      const blob = hereBlob(id, 'view')
      ;(blob ? Promise.resolve(blob) : inboxBlob(id, 'view'))
        .then((b) => oneAtATime(() => printFromPicture(b, crop, W, H)))
        .then((print) => update(id, (x) => (cropKey(x.crop) === want ? { ...x, print, printOf: want } : x)), () => {})
    }, 1200)
    return () => clearTimeout(t)
  }, [reprint && reprint.id, reprint && cropKey(reprint.crop)]) // eslint-disable-line react-hooks/exhaustive-deps -- by the crop's value

  // 2c. Her paintings without a fingerprint yet (added before they were kept) are measured once, from their small picture,
  // and the fingerprint and colours kept with them: one at a time, only while a batch is open
  const galleryKey = gallery.map((p) => p.slug + (p.print ? '+' : '')).join('|')
  useEffect(() => {
    if (!items.length || oldDb) return undefined
    let live = true
    const todo = gallery.filter((p) => !p.print && p.small && !prints[p.slug])
    ;(async () => {
      for (const p of todo) {
        if (!live) return
        try {
          const res = await fetch(p.small)
          if (!res.ok) continue
          const m = await oneAtATime(async () => measurePicture(await res.blob()))
          if (!live) return
          setPrints((x) => ({ ...x, [p.slug]: m.print }))
          const { error } = await supabase.from('paintings').update({ print: m.print, palette: m.palette }).eq('slug', p.slug)
          if (error && missingColumn(error)) { setOldDb(true); return }
        } catch { /* the next one */ }
      }
    })()
    return () => { live = false }
  }, [galleryKey, items.length > 0, oldDb]) // eslint-disable-line react-hooks/exhaustive-deps -- once per gallery, while a batch is open

  // Which photos look like a painting already in her gallery, or like another photo in this batch
  const alike = useMemo(() => {
    const inGallery = gallery.map((p) => ({ id: p.slug, slug: p.slug, title: p.title, small: p.small, print: p.print || prints[p.slug], flyer: Boolean(p.flyer), where: 'gallery' }))
    const out = {}
    items.forEach((x, i) => {
      if (!x.print || DONE.includes(x.status) || x.status === 'saving') return
      const others = items.map((y, j) => ({ id: y.id, title: y.title || `Photo ${j + 1}`, n: j + 1, print: y.print, where: 'batch', skip: y.id === x.id || y.status === 'skipped' || j > i }))
      const hits = lookAlikes(x.print, [...inGallery.filter((g) => g.slug !== x.replace), ...others.filter((o) => !o.skip)])
      if (hits.length) out[x.id] = hits.slice(0, 3)
    })
    return out
  }, [items, gallery, prints])

  // 3. Saved, one at a time: the pictures into the private bucket, then its row. This device saves the ones it approved;
  // one another device was saving when it closed is taken over once its claim has gone stale.
  useEffect(() => {
    if ([...busy.current].some((k) => k.endsWith(':save'))) return
    const it = items.find((x) => x.status === 'saving' && !x.local && (saving.current.has(x.id) || claimStale(x.savingAt)))
    if (!it) return
    const key = it.id + ':save'
    busy.current.add(key)
    saving.current.add(it.id)
    ;(async () => {
      const kept = await within(inboxBlob(it.id), 60000, 'The photo couldn’t be fetched from the family’s storage.')
      const f = await oneAtATime(() => paintingFiles(kept, it.crop))
      // The original (the kept copy, 3600 px at most) goes up too, so the painting can be re-cropped from her gallery later
      for (const [name, blob] of [[FILES.src, f.full], [FILES.small, f.small], [FILES.original, kept]]) {
        const { error } = await supabase.storage.from('paintings').upload(`${it.slug}/${name}`, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
      }
      const year = cleanYear(it.year, thisYear).year ?? null
      const measured = { w: f.w, h: f.h, original: true, crop: { ...it.crop, W: it.W, H: it.H }, palette: f.palette, print: f.print }
      if (it.replace) {
        // A better photo of a painting already in her gallery: its pictures and crop change; its details stay as they were
        // kept, filled in only where it had none. Leaves cut from the old photo are taken away (they'd no longer fit it):
        // they can be cut again from the new one on its page.
        const { data: old, error: readErr } = await supabase.from('paintings').select('*').eq('slug', it.slug).maybeSingle()
        if (readErr) throw readErr
        if (!old) throw new Error('That painting isn’t in her gallery any more. Add this one as a new painting instead.')
        const fill = {
          year: old.year ?? year, month: old.month ?? (old.year ? null : cleanMonth(it.month)), medium: old.medium || cleanMedium(it.medium) || null,
          shape: old.shape ?? cleanShape(it.shape), looks: old.looks ?? cleanLooks(it.looks), ...(old.leaves ? { leaves: null } : {}),
        }
        const { error, old: o } = await writePainting((row) => supabase.from('paintings').update(row).eq('slug', it.slug), { ...measured, ...fill })
        if (error) throw error
        if (o) setOldDb(true)
        if (old.leaves) await supabase.storage.from('paintings').remove([`${it.slug}/${FILES.sheet}`]).catch(() => {})
        return
      }
      // Upsert: the slug was free when it was chosen, so a second go after an interruption only meets its own row
      const { error, old: o } = await writePainting((row) => supabase.from('paintings').upsert(row, { onConflict: 'slug' }), {
        slug: it.slug, title: it.title, named: Boolean(it.named), year, month: year ? cleanMonth(it.month) : null,
        medium: cleanMedium(it.medium) || null, seasons: cleanSeasons(it.seasons), added: todayAtHome(), focus: [0, 0, 1, 1],
        shape: cleanShape(it.shape), looks: cleanLooks(it.looks), ...measured,
      })
      if (error) throw error
      if (o) setOldDb(true)
    })().then(() => {
      busy.current.delete(key); saving.current.delete(it.id)
      dropInboxFiles([it.id], ['kept', 'view']).catch(() => {}) // only its thumbnail stays, for the strip
      update(it.id, (x) => ({ ...x, status: 'added', saveError: null }))
      if (!latest.current.some((x) => x.id !== it.id && x.status === 'saving')) onSaved()
    }, (e) => {
      busy.current.delete(key); saving.current.delete(it.id)
      update(it.id, (x) => ({ ...x, status: 'ready', saveError: (e && e.message) || 'It couldn’t be saved.' }))
    })
  }, [items, update, onSaved, thisYear])

  return {
    items, current, tally: tally(items), read: ui.read, pause, loaded, syncError, thisYear, alike, oldDb,
    /** Look at the family's storage again now (a set sent from another device). */
    refresh: reload,
    /** New photos into the batch; the first to check stays where it was. */
    add(list) {
      const base = Date.now() * 1000
      const fresh = list.map((f, i) => {
        const id = newId()
        files.current.set(id, f)
        return { id, seq: base + i, local: true, name: f.name || 'A photo', status: 'new', read: ui.read ? 'waiting' : 'off', title: '', named: false, year: '', yearFrom: null, month: null, monthFrom: null, medium: '', mediumFrom: null, seasons: [], seasonsFrom: null, shape: null, shapeFrom: null, looks: null, touched: {} }
      })
      setItems((xs) => [...xs, ...fresh])
      setUi((u) => ({ ...u, at: latest.current.some((x) => x.id === u.at && !DONE.includes(x.status)) ? u.at : fresh[0].id }))
    },
    /** Change a photo's crop or details; whatever a person changes, Claude's reading leaves alone. */
    change(id, patch) {
      update(id, (x) => ({ ...x, ...patch, touched: { ...x.touched, ...Object.fromEntries(Object.keys(patch).map((k) => [k === 'named' ? 'title' : k, true])) } }))
    },
    go(id) { setUi((u) => ({ ...u, at: id })) },
    /** It looks right: its slug is chosen now, it saves in the background, and the next photo comes up. */
    approve(id) {
      const list = latest.current, it = list.find((x) => x.id === id)
      if (!it) return
      const title = cleanTitle(it.title)
      const slug = it.replace || it.slug || slugFor(title, takenSlugs(gallery, PAINTINGS, list, id))
      saving.current.add(id)
      const next = list.map((x) => (x.id === id ? { ...x, title, slug, status: 'saving', savingAt: Date.now(), saveError: null } : x))
      setItems(next)
      setUi((u) => ({ ...u, at: nextToCheck(next, id) || id }))
    },
    /** A saved photo's details can be changed again (its crop stays as saved: the files are already in her gallery). */
    editSaved(id, on) { update(id, (x) => ({ ...x, editing: on, saveError: null })) },
    /** Looks like one already in: add it anyway (`ok`), or put it in place of that one (`replace`, a slug), or neither. */
    dupChoice(id, { ok = false, replace = null } = {}) { update(id, (x) => ({ ...x, dupOk: ok, replace })) },
    /** Saves a saved photo's details to its row; nothing else of it is touched. */
    async saveDetails(id) {
      const it = latest.current.find((x) => x.id === id)
      if (!it || !it.slug) return
      const year = cleanYear(it.year, thisYear).year ?? null
      const { error } = await writePainting((row) => supabase.from('paintings').update(row).eq('slug', it.slug), {
        title: cleanTitle(it.title), named: Boolean(it.named), year, month: year ? cleanMonth(it.month) : null,
        medium: cleanMedium(it.medium) || null, seasons: cleanSeasons(it.seasons), looks: cleanLooks(it.looks),
      })
      if (error) { update(id, (x) => ({ ...x, saveError: error.message })); return }
      update(id, (x) => ({ ...x, editing: false, saveError: null, title: cleanTitle(x.title) }))
      onSaved()
    },
    skip(id) {
      const next = latest.current.map((x) => (x.id === id ? { ...x, status: 'skipped' } : x))
      setItems(next)
      setUi((u) => ({ ...u, at: nextToCheck(next, id) || id }))
    },
    unskip(id) {
      setItems((xs) => xs.map((x) => (x.id === id && x.status === 'skipped' ? { ...x, status: x.W ? 'ready' : 'failed' } : x)))
      setUi((u) => ({ ...u, at: id }))
    },
    /** Reading on or off; turned on, the photos still to check are read. */
    setRead(on) {
      setPause(null)
      setUi((u) => ({ ...u, read: on }))
      setItems((xs) => xs.map((x) => (DONE.includes(x.status) || x.status === 'saving' ? x : on && x.read === 'off' ? { ...x, read: 'waiting' } : !on && x.read === 'waiting' ? { ...x, read: 'off' } : x)))
    },
    /** Tries sending a photo up again (it couldn't be sent). */
    resend(id) { update(id, (x) => ({ ...x, sending: true, sendError: null })); send(id) },
    readAgain(id) { setPause(null); update(id, (x) => ({ ...x, read: 'waiting', readError: null })) },
    resume() { setPause(null) },
    /** The batch put away: every photo's row and pictures in the family's storage, and this device's draft. */
    async finish() {
      const ids = latest.current.filter((x) => !x.local).map((x) => x.id)
      files.current.clear(); pushed.current.clear()
      setItems([]); setPause(null); clearUi()
      if (ids.length) { await dropInboxRows(ids); await dropInboxFiles(ids) }
    },
  }
}
