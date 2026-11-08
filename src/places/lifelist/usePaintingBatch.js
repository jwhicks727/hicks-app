import { useCallback, useEffect, useRef, useState } from 'react'
import { useDraft } from '../../lib/useDraft.js'
import { askClaude } from '../../lib/claude.js'
import { supabase } from '../../lib/supabase.js'
import { todayAtHome } from '../../lib/useSources.js'
import { putPhoto, getPhoto, dropPhoto, dropKeys, dropAllPhotos } from '../../lib/photoStore.js'
import { findPainting } from '../../lib/autocrop.js'
import { fromFound, wholeCrop, applyReading, slugFor, takenSlugs, cleanTitle, cleanYear, cleanMedium, cleanSeasons, tally, nextToCheck, DONE } from '../../lib/paintingBatch.js'
import { FILES, PAINTINGS } from '../../lib/paintings.js'
import { preparePhoto, readingFiles, paintingFiles, oneAtATime } from './paintingPhotos.js'

// The batch of photos being added to Laurie's gallery, kept on the phone until
// it's done (the details as a draft, the pictures in src/lib/photoStore.js).
// Three queues run by themselves while the screen is open: each photo is got
// ready and auto-cropped, one at a time; Claude reads its signature, two at a
// time, if the parent left that on; and each one the parent says looks right
// is saved to the private bucket and the table, one at a time, while they go
// on to the next.
const BLANK = { read: true, at: null, items: [] }
const READ_AT_ONCE = 2

export function usePaintingBatch({ gallery, onSaved }) {
  const [batch, setBatch, clearBatch] = useDraft('paintings.batch', BLANK)
  const items = batch.items || []
  const latest = useRef(items)
  latest.current = items
  const files = useRef(new Map()) // id -> the File, until its photo is ready
  const busy = useRef(new Set()) // "<id>:prep", "<id>:read", "<id>:save"
  const [pause, setPause] = useState(null) // why reading has stopped for now
  const [lost, setLost] = useState(0) // photos the app closed on before they were ready
  const thisYear = Number(todayAtHome().slice(0, 4))

  const update = useCallback((id, fn) => setBatch((b) => ({ ...b, items: (b.items || []).map((x) => (x.id === id ? fn(x) : x)) })), [setBatch])

  // Back after the app was closed: a photo that wasn't ready yet has to be added again; a reading under way starts again
  useEffect(() => {
    const gone = (latest.current || []).filter((x) => x.status === 'new')
    if (gone.length) { setLost(gone.length); gone.forEach((x) => dropPhoto(x.id).catch(() => {})) }
    setBatch((b) => ({ ...b, items: (b.items || []).filter((x) => x.status !== 'new').map((x) => (x.read === 'reading' ? { ...x, read: 'waiting' } : x)) }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, on opening

  // 1. Ready, one at a time: kept on the phone, and the auto-crop's go at it
  useEffect(() => {
    if ([...busy.current].some((k) => k.endsWith(':prep'))) return
    const it = items.find((x) => x.status === 'new' && files.current.has(x.id))
    if (!it) return
    const key = it.id + ':prep'
    busy.current.add(key)
    oneAtATime(async () => {
      const p = await preparePhoto(files.current.get(it.id))
      await putPhoto(it.id + ':kept', p.kept)
      await putPhoto(it.id + ':view', p.view)
      await putPhoto(it.id + ':thumb', p.thumb)
      const found = findPainting(p.look)
      const crop = found.kind === 'found' ? fromFound(found, p.W, p.H, p.look.width, p.look.height) : wholeCrop(p.W, p.H)
      return { W: p.W, H: p.H, crop, auto: crop, sure: found.sure, kind: found.kind }
    }).then(
      (r) => { files.current.delete(it.id); busy.current.delete(key); update(it.id, (x) => ({ ...x, ...r, status: 'ready' })) },
      (e) => { files.current.delete(it.id); busy.current.delete(key); dropPhoto(it.id).catch(() => {}); update(it.id, (x) => ({ ...x, status: 'failed', error: (e && e.message) || 'That photo couldn’t be opened.' })) },
    )
  }, [items, update])

  // 2. Claude reads the signature and suggests a working title, a couple at a time
  useEffect(() => {
    if (pause) return
    const under = items.filter((x) => busy.current.has(x.id + ':read')).length
    const waiting = items.filter((x) => x.status === 'ready' && x.read === 'waiting' && !busy.current.has(x.id + ':read'))
    for (const it of waiting.slice(0, Math.max(0, READ_AT_ONCE - under))) {
      const key = it.id + ':read'
      busy.current.add(key)
      update(it.id, (x) => ({ ...x, read: 'reading', readError: null }))
      ;(async () => {
        const kept = await getPhoto(it.id + ':kept')
        if (!kept) throw new Error('The photo isn’t on this phone any more.')
        const sent = await oneAtATime(() => readingFiles(kept, it.crop))
        const titles = [...gallery.map((p) => p.title), ...latest.current.filter((x) => x.id !== it.id && x.title && x.status !== 'skipped').map((x) => x.title)]
        return askClaude('read-painting', { files: sent, titles })
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
  }, [items, pause, gallery, update, thisYear])

  // 3. Saved, one at a time: the two files into the private bucket, then its row
  useEffect(() => {
    if ([...busy.current].some((k) => k.endsWith(':save'))) return
    const it = items.find((x) => x.status === 'saving')
    if (!it) return
    const key = it.id + ':save'
    busy.current.add(key)
    ;(async () => {
      const kept = await getPhoto(it.id + ':kept')
      if (!kept) throw new Error('The photo isn’t on this phone any more.')
      const f = await oneAtATime(() => paintingFiles(kept, it.crop))
      // The original (the kept copy, 3600 px at most) goes up too, so the painting can be re-cropped from her gallery later
      for (const [name, blob] of [[FILES.src, f.full], [FILES.small, f.small], [FILES.original, kept]]) {
        const { error } = await supabase.storage.from('paintings').upload(`${it.slug}/${name}`, blob, { contentType: 'image/jpeg', upsert: true })
        if (error) throw error
      }
      // Upsert: the slug was free when it was chosen, so a second go after an interruption only meets its own row
      const { error } = await supabase.from('paintings').upsert({
        slug: it.slug, title: it.title, named: Boolean(it.named), year: cleanYear(it.year, thisYear).year ?? null,
        medium: cleanMedium(it.medium) || null, w: f.w, h: f.h,
        seasons: cleanSeasons(it.seasons), added: todayAtHome(), focus: [0, 0, 1, 1],
        original: true, crop: { ...it.crop, W: it.W, H: it.H },
      }, { onConflict: 'slug' })
      if (error) throw error
    })().then(() => {
      busy.current.delete(key)
      dropKeys([it.id + ':kept', it.id + ':view']).catch(() => {})
      update(it.id, (x) => ({ ...x, status: 'added', saveError: null }))
      if (!latest.current.some((x) => x.id !== it.id && x.status === 'saving')) onSaved()
    }, (e) => {
      busy.current.delete(key)
      update(it.id, (x) => ({ ...x, status: 'ready', saveError: (e && e.message) || 'It couldn’t be saved.' }))
    })
  }, [items, update, onSaved, thisYear])

  const current = items.find((x) => x.id === batch.at) || items.find((x) => !DONE.includes(x.status)) || null

  return {
    items, current, tally: tally(items), read: batch.read, pause, lost, thisYear,
    /** New photos into the batch; the first to check stays where it was. */
    add(list) {
      const stamp = Date.now().toString(36)
      const fresh = list.map((f, i) => {
        const id = `p${stamp}${i}${Math.random().toString(36).slice(2, 6)}`
        files.current.set(id, f)
        return { id, name: f.name || 'A photo', status: 'new', read: batch.read ? 'waiting' : 'off', title: '', named: false, year: '', yearFrom: null, medium: '', mediumFrom: null, seasons: [], seasonsFrom: null, touched: {} }
      })
      setLost(0)
      setBatch((b) => {
        const keep = (b.items || []).some((x) => x.id === b.at && !DONE.includes(x.status))
        return { ...b, at: keep ? b.at : fresh[0].id, items: [...(b.items || []), ...fresh] }
      })
    },
    /** Change a photo's crop or details; whatever a person changes, Claude's reading leaves alone. */
    change(id, patch) {
      update(id, (x) => ({ ...x, ...patch, touched: { ...x.touched, ...Object.fromEntries(Object.keys(patch).map((k) => [k === 'named' ? 'title' : k, true])) } }))
    },
    go(id) { setBatch((b) => ({ ...b, at: id })) },
    /** It looks right: its slug is chosen now, it saves in the background, and the next photo comes up. */
    approve(id) {
      setBatch((b) => {
        const list = b.items || [], it = list.find((x) => x.id === id)
        if (!it) return b
        const title = cleanTitle(it.title)
        const slug = it.slug || slugFor(title, takenSlugs(gallery, PAINTINGS, list, id))
        const next = list.map((x) => (x.id === id ? { ...x, title, slug, status: 'saving', saveError: null } : x))
        return { ...b, items: next, at: nextToCheck(next, id) || id }
      })
    },
    /** A saved photo's details can be changed again (its crop stays as saved: the files are already in her gallery). */
    editSaved(id, on) { update(id, (x) => ({ ...x, editing: on, saveError: null })) },
    /** Saves a saved photo's details to its row; nothing else of it is touched. */
    async saveDetails(id) {
      const it = latest.current.find((x) => x.id === id)
      if (!it || !it.slug) return
      const { error } = await supabase.from('paintings').update({
        title: cleanTitle(it.title), named: Boolean(it.named), year: cleanYear(it.year, thisYear).year ?? null,
        medium: cleanMedium(it.medium) || null, seasons: cleanSeasons(it.seasons),
      }).eq('slug', it.slug)
      if (error) { update(id, (x) => ({ ...x, saveError: error.message })); return }
      update(id, (x) => ({ ...x, editing: false, saveError: null, title: cleanTitle(x.title) }))
      onSaved()
    },
    skip(id) {
      setBatch((b) => {
        const next = (b.items || []).map((x) => (x.id === id ? { ...x, status: 'skipped' } : x))
        return { ...b, items: next, at: nextToCheck(next, id) || id }
      })
    },
    unskip(id) { setBatch((b) => ({ ...b, at: id, items: (b.items || []).map((x) => (x.id === id && x.status === 'skipped' ? { ...x, status: x.W ? 'ready' : 'failed' } : x)) })) },
    /** Reading on or off; turned on, the photos still to check are read. */
    setRead(on) {
      setPause(null)
      setBatch((b) => ({ ...b, read: on, items: (b.items || []).map((x) => (DONE.includes(x.status) || x.status === 'saving' ? x : on && x.read === 'off' ? { ...x, read: 'waiting' } : !on && x.read === 'waiting' ? { ...x, read: 'off' } : x)) }))
    },
    readAgain(id) { setPause(null); update(id, (x) => ({ ...x, read: 'waiting', readError: null })) },
    resume() { setPause(null) },
    /** The batch put away: its details and every photo kept on the phone. */
    finish() { files.current.clear(); setLost(0); clearBatch(); dropAllPhotos().catch(() => {}) },
  }
}
