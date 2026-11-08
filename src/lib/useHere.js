import { useEffect, useSyncExternalStore } from 'react'
import { readPrefs } from './prefs.js'
import { clearStays } from './stayStore.js'
import { READ_EVERY_MS, KEEP_MS, roundPoint, cellOf, validPoint, tierFor, ourPlaceAt, townUrl, shapeTown, deviceZone } from './here.js'

// ============================================
// useHere -- where this phone is, when its owner has switched it on
// ============================================
// Settings › "Notice where I am" (prefs.here, on this device). The phone is
// asked only while the app is open: once on opening and again on coming back
// to it, at most every ten minutes, at low accuracy, never watched. The
// reading is rounded to about a kilometre straight away (here.js) and kept on
// this device only, one at a time: it ages out after six hours and goes on
// sign-out. Nothing is written to the database. The town's name comes from
// OpenStreetMap, kept a month per cell so the same place isn't asked again.

const KEY = 'teamhicks.here'
const TOWNS = 'teamhicks.here.towns'
const TOWN_KEEP_MS = 30 * 864e5
const EVENT = 'teamhicks:prefs'

const blank = { status: 'off', point: null, tier: null, tz: null, town: null, place: null, at: 0 }
let state = blank
const subs = new Set()
const emit = () => subs.forEach((f) => f())
const set = (patch) => { state = { ...state, ...patch }; emit() }

const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* private window: kept for now */ } }

/** Everything this device holds about where it's been: gone on sign-out, or when switched off. */
export function forgetHere() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(TOWNS) } catch { /* nothing kept */ }
  state = { ...blank, status: state.status === 'off' ? 'off' : 'waiting' }
  emit()
}

const isOn = () => readPrefs().here === true

function fromReading(r, status = 'ready') {
  const tz = r.tz || null
  const tier = tierFor(r, tz)
  return { status, point: { lat: r.lat, lng: r.lng }, tier, tz, place: tier === 'home' ? null : ourPlaceAt(r), at: r.at, town: townFor(r) }
}

function townFor(point) {
  const kept = read(TOWNS) || {}
  const t = kept[cellOf(point)]
  return t && Date.now() - t.at < TOWN_KEEP_MS ? t.town : null
}

let asking = null
async function lookUpTown(point) {
  const cell = cellOf(point)
  if (townFor(point) || asking === cell) return
  asking = cell
  try {
    const res = await fetch(townUrl(point), { headers: { Accept: 'application/json' } })
    if (!res.ok) return
    const town = shapeTown(await res.json())
    if (!town) return
    const kept = read(TOWNS) || {}
    for (const [k, v] of Object.entries(kept)) if (!v || Date.now() - v.at > TOWN_KEEP_MS) delete kept[k]
    kept[cell] = { town, at: Date.now() }
    write(TOWNS, kept)
    if (state.point && cellOf(state.point) === cell) set({ town })
  } catch { /* the town's name waits for the next reading */ } finally { asking = null }
}

/**
 * Ask the phone once, only while switched on. iOS's own question first comes
 * when the switch is turned on in Settings, beside the words saying what it does.
 */
export function readHere() {
  if (!isOn()) return
  if (typeof navigator === 'undefined' || !navigator.geolocation) { set({ status: 'unavailable' }); return }
  if (state.status !== 'ready') set({ status: 'asking' })
  navigator.geolocation.getCurrentPosition((pos) => {
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    if (!validPoint(p)) return
    const r = { ...roundPoint(p), tz: deviceZone(), at: Date.now() }
    const before = state.tz || (read(KEY) || {}).tz || null
    write(KEY, r)
    set(fromReading(r))
    // Crossing a time zone gets a word on Home ("You just gained an hour")
    if (before && r.tz && before !== r.tz) set({ shift: { from: before, to: r.tz, at: Date.now() } })
    if (state.tier && state.tier !== 'home') lookUpTown(r)
  }, (err) => {
    if (err && err.code === 1) { try { localStorage.removeItem(KEY) } catch { /* fine */ } set({ ...blank, status: 'denied' }) }
    else if (state.status === 'asking') set({ status: state.point ? 'ready' : 'unavailable' })
  }, { enableHighAccuracy: false, maximumAge: READ_EVERY_MS, timeout: 20000 })
}

let users = 0
let stopAll = null
const switchedOff = () => { try { localStorage.removeItem(KEY); localStorage.removeItem(TOWNS) } catch { /* fine */ } clearStays(); state = blank; emit() }
function sync() {
  if (!isOn()) { if (state.status !== 'off' || read(KEY)) switchedOff(); return }
  if (state.status === 'denied') return // the phone said no: asked again only from Settings, or after switching off and on
  const kept = read(KEY)
  const fresh = kept && validPoint(kept) && Date.now() - kept.at < KEEP_MS
  if (fresh && state.at !== kept.at) { set(fromReading(kept)); if (state.tier !== 'home' && !state.town) lookUpTown(kept) }
  if (!fresh && state.point) set({ ...blank, status: 'waiting' })
  if (!fresh || Date.now() - kept.at > READ_EVERY_MS) readHere()
}
/** Listening starts with the first screen that follows here and stops with the last (signing out unmounts them all). */
function start() {
  users += 1
  if (users === 1 && typeof window !== 'undefined') {
    const onShow = () => { if (document.visibilityState === 'visible') sync() }
    window.addEventListener(EVENT, sync)
    document.addEventListener('visibilitychange', onShow)
    const timer = setInterval(onShow, READ_EVERY_MS)
    stopAll = () => { window.removeEventListener(EVENT, sync); document.removeEventListener('visibilitychange', onShow); clearInterval(timer) }
    sync()
  }
  return () => { users -= 1; if (users === 0 && stopAll) { stopAll(); stopAll = null } }
}

const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
const snapshot = () => state

/**
 * Where this phone is: { status, point, tier, tz, town, place, at }.
 * status: off, waiting, asking, ready, denied or unavailable. tier: home,
 * near or away (null until a reading). `follow: false` only reads what's
 * already known and never asks the phone (the sky behind the sign-in screen).
 */
export function useHere({ follow = true } = {}) {
  useEffect(() => (follow ? start() : undefined), [follow])
  const s = useSyncExternalStore(subscribe, snapshot, snapshot)
  return follow ? s : blank
}
