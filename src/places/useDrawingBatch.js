import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDraft } from '../lib/useDraft.js'
import { askClaude } from '../lib/claude.js'
import { supabase } from '../lib/supabase.js'
import { todayAtHome } from '../lib/useSources.js'
import { findPainting } from '../lib/autocrop.js'
import { fromFound, wholeCrop, tally, nextToCheck, DONE, mergeInbox, newId, claimStale } from '../lib/paintingBatch.js'
import { drawingInboxData, applyDrawingReading, DRAWING_KEPT, DRAWING_SAVED } from '../lib/drawingBatch.js'
import { cleanDrawing, drawingFiles } from '../lib/drawings.js'
import { saveDrawing } from '../lib/useDrawings.js'
import { drawingsInbox } from '../lib/drawingInbox.js'
import { preparePhoto, readingFiles, paintingFiles, oneAtATime, printOfCrop, printFromPicture, measurePicture } from './lifelist/paintingPhotos.js'
import { cropKey, missingColumn } from './lifelist/usePaintingBatch.js'
import { lookAlikes } from '../lib/artColour.js'

// The batch of photos being added to Anna's Art. Like Laurie's (src/places/lifelist/usePaintingBatch.js) it
// waits in the family's storage, not on one device: anyone in the family can send photos from one device and
// go through them on another, and the parents see everyone's. A device keeps only a small draft of its own (whether
// to have Claude look, and which photo it was on). Three queues run while the screen is open: each new photo is
// shrunk and auto-cropped here, one at a time, then sent up in the background; Claude looks at each, three at a
// time, the one on screen first, for a working title, the topic and any day written on it (never her words);
// and each one that looks right is saved to her wall while the next comes up.
const BLANK = { read: true, at: null }
const READ_AT_ONCE = 3
const READ_TIMEOUT_MS = 90 * 1000
const PUSH_AFTER_MS = 600

const within = (p, ms, why) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(why)), ms))])
const { loadInbox, saveInboxRow, dropInboxRows, dropInboxFiles, putInboxFile, inboxBlob, holdHere, hereBlob, releaseHere } = drawingsInbox

/** A file into the drawings bucket, which takes files added but not written over: one already there is fine. */
async function putDrawingFile(path, blob) {
  const res = await supabase.storage.from('drawings').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (res.error && (String(res.error.statusCode) === '409' || /already exists|duplicate/i.test(res.error.message || ''))) return
  if (res.error) throw res.error
}

export function useDrawingBatch({ me, gallery, onSaved }) {
  const [ui, setUi, clearUi] = useDraft('drawings.inbox', BLANK)
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [pause, setPause] = useState(null)
  const latest = useRef(items)
  latest.current = items
  const pushed = useRef(new Map())
  // id -> when this device last sent it: a look at storage that began before then may bring back the old copy, so it's kept
  const pushedAt = useRef(new Map())
  const saving = useRef(new Set())
  const files = useRef(new Map())
  const busy = useRef(new Set())
  const timer = useRef(null)
  const lastLook = useRef(0)
  const today = todayAtHome()
  // Fingerprints of her art already on the wall: kept with each, and measured here for any added before they were
  const [prints, setPrints] = useState({})
  const [noPrints, setNoPrints] = useState(false) // the migration that keeps them hasn't been run

  const update = useCallback((id, fn) => setItems((xs) => xs.map((x) => (x.id === id ? fn(x) : x))), [])
  const isDirty = useCallback((x) => !x.local && pushed.current.get(x.id) !== JSON.stringify(drawingInboxData(x)), [])

  // Looks at what's in storage and brings it in; what this device has changed and not yet sent stays
  const reload = useCallback(async () => {
    lastLook.current = Date.now()
    const began = Date.now()
    let remote
    try { remote = await loadInbox() } catch (e) { setSyncError((e && e.message) || 'The family’s storage couldn’t be reached.'); setLoaded(true); return }
    setSyncError(null)
    // Changed here and not sent, or sent while this look was on its way (storage may have answered with the copy before)
    const dirty = new Set(latest.current.filter((x) => isDirty(x) || (pushedAt.current.get(x.id) || 0) > began - 2000).map((x) => x.id))
    for (const x of remote) if (!dirty.has(x.id)) pushed.current.set(x.id, JSON.stringify(drawingInboxData(x)))
    const fixed = remote.map((x) => (x.read === 'reading' && claimStale(x.readAt) ? { ...x, read: 'waiting' } : x))
    setItems((local) => mergeInbox(local, fixed, dirty))
    setLoaded(true)
  }, [isDirty])

  // Sends what's changed here to storage
  const flush = useCallback(async () => {
    for (const x of latest.current) {
      if (x.local) continue
      const j = JSON.stringify(drawingInboxData(x))
      if (pushed.current.get(x.id) === j) continue
      pushed.current.set(x.id, j)
      pushedAt.current.set(x.id, Date.now())
      const { error } = await saveInboxRow(x)
      if (error) { pushed.current.delete(x.id); setSyncError(error.message || 'Changes couldn’t be saved to the family’s storage.'); clearTimeout(timer.current); timer.current = setTimeout(flush, 5000); return }
      setSyncError(null)
    }
  }, [])

  useEffect(() => {
    reload()
    const look = () => { if (document.visibilityState === 'visible' && Date.now() - lastLook.current > 4000) reload() }
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); else look() }
    const every = setInterval(look, 30000)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', look)
    return () => { clearInterval(every); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', look); flush() }
  }, [reload, flush])

  useEffect(() => {
    if (!loaded) return undefined
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, PUSH_AFTER_MS)
    return () => clearTimeout(timer.current)
  }, [items, loaded, flush])

  const current = items.find((x) => x.id === ui.at) || items.find((x) => !DONE.includes(x.status)) || null
  const atId = current ? current.id : null

  // Sends a prepared photo's three pictures up in the background, trying again a couple of times; until they're in
  // storage the photo stays `local`, so it isn't offered to other devices
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

  // 1. A new photo, one at a time: shrunk and auto-cropped here, so it can be checked and looked at at once; then sent up
  useEffect(() => {
    if ([...busy.current].some((k) => k.endsWith(':prep'))) return
    const it = items.find((x) => x.status === 'new' && x.local && files.current.has(x.id))
    if (!it) return
    const key = it.id + ':prep'
    busy.current.add(key)
    oneAtATime(async () => {
      const p = await preparePhoto(files.current.get(it.id), DRAWING_KEPT)
      const found = findPainting(p.look)
      const crop = found.kind === 'found' ? fromFound(found, p.W, p.H, p.look.width, p.look.height) : wholeCrop(p.W, p.H)
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

  // 2. Claude looks at the drawing and suggests a working title, the topic and any day written on it
  useEffect(() => {
    if (pause) return
    const under = items.filter((x) => busy.current.has(x.id + ':read')).length
    const from = Math.max(0, items.findIndex((x) => x.id === atId))
    const ordered = [...items.slice(from), ...items.slice(0, from)]
    const waiting = ordered.filter((x) => x.status === 'ready' && (!x.local || x.sending) && x.read === 'waiting' && !busy.current.has(x.id + ':read'))
    for (const it of waiting.slice(0, Math.max(0, READ_AT_ONCE - under))) {
      const key = it.id + ':read'
      busy.current.add(key)
      update(it.id, (x) => ({ ...x, read: 'reading', readAt: Date.now(), readError: null }))
      ;(async () => {
        const kept = await within(inboxBlob(it.id), 60000, 'The photo couldn’t be fetched from the family’s storage.')
        const [sent] = await oneAtATime(() => readingFiles(kept, it.crop, { corners: false }))
        const titles = [...gallery.map((d) => d.title), ...latest.current.filter((x) => x.id !== it.id && x.title && x.status !== 'skipped').map((x) => x.title)]
        return within(askClaude('read-drawing', { file: sent, titles }), READ_TIMEOUT_MS, 'Claude took too long over this one.')
      })().then((res) => {
        busy.current.delete(key)
        const why = res && res.error
        if (why && /budget/i.test(why)) { setPause(`${why} The rest can be looked at then, or typed in now.`); update(it.id, (x) => ({ ...x, read: 'waiting' })); return }
        if (why && /unknown task/i.test(why)) { setPause('Suggesting titles needs the claude function deployed again. Until then, type the titles.'); update(it.id, (x) => ({ ...x, read: 'waiting' })); return }
        if (why || !res || !res.reading) { update(it.id, (x) => ({ ...x, read: 'failed', readError: why || 'Claude didn’t manage this one.' })); return }
        update(it.id, (x) => (x.status === 'ready' ? applyDrawingReading(x, res.reading, today) : { ...x, read: 'done' }))
      }, (e) => { busy.current.delete(key); update(it.id, (x) => ({ ...x, read: 'failed', readError: (e && e.message) || 'It couldn’t be looked at.' })) })
    }
  }, [items, pause, atId, gallery, update, today])

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

  // 2c. Her art without a fingerprint yet is measured once, from its small picture, while a batch is open; kept with it
  // where this person may change it (their own, or any for a parent), and remembered here either way
  const galleryKey = gallery.map((d) => d.id + (d.print ? '+' : '')).join('|')
  useEffect(() => {
    if (!items.length || !supabase) return undefined
    let live = true
    const todo = gallery.filter((d) => !d.print && (d.thumb_path || d.path) && !prints[d.id])
    ;(async () => {
      for (let i = 0; i < todo.length && live; i += 20) {
        const part = todo.slice(i, i + 20)
        const { data } = await supabase.storage.from('drawings').createSignedUrls(part.map((d) => d.thumb_path || d.path), 600)
        for (const [k, d] of part.entries()) {
          const url = data && data[k] && data[k].signedUrl
          if (!url || !live) continue
          try {
            const res = await fetch(url)
            if (!res.ok) continue
            const m = await oneAtATime(async () => measurePicture(await res.blob()))
            if (!live) return
            setPrints((x) => ({ ...x, [d.id]: m.print }))
            if (!noPrints) { const { error } = await supabase.from('annas_drawings').update({ print: m.print }).eq('id', d.id); if (error && missingColumn(error)) setNoPrints(true) }
          } catch { /* the next one */ }
        }
      }
    })()
    return () => { live = false }
  }, [galleryKey, items.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps -- once per wall, while a batch is open

  // Which photos look like art already on her wall, or like another photo in this batch
  const alike = useMemo(() => {
    const onWall = gallery.map((d) => ({ id: d.id, title: d.title, print: d.print || prints[d.id], where: 'gallery' }))
    const out = {}
    items.forEach((x, i) => {
      if (!x.print || DONE.includes(x.status) || x.status === 'saving') return
      const earlier = items.slice(0, i).filter((y) => y.status !== 'skipped').map((y) => ({ id: y.id, title: y.title || '', n: items.indexOf(y) + 1, print: y.print, where: 'batch' }))
      const hits = lookAlikes(x.print, [...onWall, ...earlier])
      if (hits.length) out[x.id] = hits.slice(0, 3)
    })
    return out
  }, [items, gallery, prints])

  // 3. Saved, one at a time: the pictures into the private bucket, then its row, under whoever sent it
  useEffect(() => {
    if ([...busy.current].some((k) => k.endsWith(':save'))) return
    const it = items.find((x) => x.status === 'saving' && !x.local && (saving.current.has(x.id) || claimStale(x.savingAt)))
    if (!it) return
    const key = it.id + ':save'
    busy.current.add(key)
    saving.current.add(it.id)
    ;(async () => {
      const fields = cleanDrawing({ title: it.title, madeOn: it.madeOn, words: it.words, topic: it.topic }, today)
      if (fields.error) throw new Error(fields.error)
      const kept = await within(inboxBlob(it.id), 60000, 'The photo couldn’t be fetched from the family’s storage.')
      const f = await oneAtATime(() => paintingFiles(kept, it.crop, DRAWING_SAVED))
      const names = drawingFiles(it.id)
      // The original (the kept copy) goes up too, so the drawing can be cropped again later
      await putDrawingFile(names.path, f.full); await putDrawingFile(names.thumb, f.small); await putDrawingFile(names.original, kept)
      // Upsert: the id was made when the photo was, so a second go after an interruption only meets its own row
      const row = {
        id: it.id, ...fields, path: names.path, thumb_path: names.thumb, width: f.w, height: f.h,
        added_by: it.addedBy || (me ? me.id : null), original: true, crop: { ...it.crop, W: it.W, H: it.H }, print: f.print,
      }
      let { error } = await supabase.from('annas_drawings').upsert(row, { onConflict: 'id' })
      // Before the migration that keeps fingerprints is run, it's saved without one
      if (error && missingColumn(error)) { const { print: _p, ...plain } = row; ({ error } = await supabase.from('annas_drawings').upsert(plain, { onConflict: 'id' })) }
      if (error) throw error
    })().then(() => {
      busy.current.delete(key); saving.current.delete(it.id)
      dropInboxFiles([it.id], ['kept', 'view']).catch(() => {}) // only its thumbnail stays, for the strip
      update(it.id, (x) => ({ ...x, status: 'added', saveError: null }))
      if (!latest.current.some((x) => x.id !== it.id && x.status === 'saving')) onSaved()
    }, (e) => {
      busy.current.delete(key); saving.current.delete(it.id)
      update(it.id, (x) => ({ ...x, status: 'ready', saveError: (e && e.message) || 'It couldn’t be saved.' }))
    })
  }, [items, update, onSaved, today, me])

  return {
    items, current, tally: tally(items), read: ui.read, pause, loaded, syncError, today, alike,
    /** Looks like one already on her wall, but it's a different one: add it anyway. */
    dupOk(id, ok = true) { update(id, (x) => ({ ...x, dupOk: ok })) },
    refresh: reload,
    /** New photos into the batch, under whoever sent them; the first to check stays where it was. */
    add(list) {
      const base = Date.now() * 1000
      const fresh = list.map((f, i) => {
        const id = newId()
        files.current.set(id, f)
        return { id, seq: base + i, local: true, name: f.name || 'A photo', addedBy: me ? me.id : null, status: 'new', read: ui.read ? 'waiting' : 'off', title: '', titleFrom: null, madeOn: '', madeOnFrom: null, topic: '', topicFrom: null, words: '', touched: {} }
      })
      setItems((xs) => [...xs, ...fresh])
      setUi((u) => ({ ...u, at: latest.current.some((x) => x.id === u.at && !DONE.includes(x.status)) ? u.at : fresh[0].id }))
    },
    /** Change a photo's crop or details; whatever a person changes, Claude's suggestions leave alone. */
    change(id, patch) {
      update(id, (x) => ({ ...x, ...patch, touched: { ...x.touched, ...Object.fromEntries(Object.keys(patch).map((k) => [k, true])) } }))
    },
    go(id) { setUi((u) => ({ ...u, at: id })) },
    /** It looks right: it saves in the background, and the next photo comes up. */
    approve(id) {
      const list = latest.current
      if (!list.some((x) => x.id === id)) return
      saving.current.add(id)
      const next = list.map((x) => (x.id === id ? { ...x, status: 'saving', savingAt: Date.now(), saveError: null } : x))
      setItems(next)
      setUi((u) => ({ ...u, at: nextToCheck(next, id) || id }))
    },
    /** A saved photo's details can be changed again (its crop stays as saved: the files are already on her wall). */
    editSaved(id, on) { update(id, (x) => ({ ...x, editing: on, saveError: null })) },
    /** Saves a saved photo's details to its row; nothing else of it is touched. */
    async saveDetails(id) {
      const it = latest.current.find((x) => x.id === id)
      if (!it) return
      const fields = cleanDrawing({ title: it.title, madeOn: it.madeOn, words: it.words, topic: it.topic }, today)
      if (fields.error) { update(id, (x) => ({ ...x, saveError: fields.error })); return }
      const { error } = await saveDrawing(it.id, fields)
      if (error) { update(id, (x) => ({ ...x, saveError: error.message })); return }
      update(id, (x) => ({ ...x, editing: false, saveError: null, title: fields.title }))
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
    /** Claude's suggestions on or off; turned on, the photos still to check are looked at. */
    setRead(on) {
      setPause(null)
      setUi((u) => ({ ...u, read: on }))
      setItems((xs) => xs.map((x) => (DONE.includes(x.status) || x.status === 'saving' ? x : on && x.read === 'off' ? { ...x, read: 'waiting' } : !on && x.read === 'waiting' ? { ...x, read: 'off' } : x)))
    },
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
