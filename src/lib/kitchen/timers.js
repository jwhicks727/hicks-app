import { useEffect, useMemo, useState } from 'react'
import { timerStates, KEEP_MS } from './stepTimers.js'

// Kitchen timers, kept on the device as their end times, so a timer started
// before the phone closed the app is still right when it opens again. One
// counts down wherever in the app the cook goes (the dock is in the shell),
// and an ended one rings until someone stops it (src/kitchen/Timers.jsx).
const KEY = 'teamhicks.timers'
const EVENT = 'teamhicks:timers'
const read = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list.filter((t) => t && Number.isFinite(t.ends) && Date.now() - t.ends < KEEP_MS) : []
  } catch { return [] }
}
const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* kept for now */ } window.dispatchEvent(new Event(EVENT)) }
const keyOf = (t) => t.key || t.id

/** Start (or start again) one of a step's timers: `key` is timerKey(recipe, step, i). */
export function startTimer({ key, label, title, minutes, upTo, perSide, recipe }) {
  primeSound()
  const now = Date.now()
  const list = read().filter((t) => keyOf(t) !== key)
  write([...list, { id: `${now}-${Math.random().toString(36).slice(2, 7)}`, key, label, title, recipe, minutes, upTo: upTo || null, perSide: Boolean(perSide), started: now, ends: now + minutes * 60000 }])
}
export const stopTimer = (id) => write(read().filter((t) => t.id !== id))
export const stopTimers = (ids) => write(read().filter((t) => !ids.includes(t.id)))
/** Undo a stop: the timer comes back exactly as it was, still counting from when it started. */
export const putBack = (timer) => write([...read().filter((t) => t.id !== timer.id), timer])
/** More time: on a running timer it is added to the end; on one that has ended it counts again from now. */
export function addTime(id, minutes, extra = {}) {
  primeSound()
  const now = Date.now()
  write(read().map((t) => {
    if (t.id !== id) return t
    if (t.ends > now) return { ...t, ends: t.ends + minutes * 60000, ...extra }
    return { ...t, started: now, ends: now + minutes * 60000, minutes, upTo: null, ...extra }
  }))
}

// ---- Sound ----
// Phones (iPhones above all) let a page make a sound only once a tap has
// woken its audio, so every tap that starts or extends a timer wakes it, and
// so does any tap while one is running (the phone may have put it to sleep).
let ctx = null
function audio() {
  try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)() } catch { ctx = null }
  return ctx
}
export function primeSound() {
  const a = audio(); if (!a) return
  if (a.state !== 'running') a.resume().catch(() => {})
  try { const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(0) } catch { /* no sound here */ }
}
// While an alarm rings, an iPhone is asked to treat it as playback, as its own
// Clock does, so the ring switch on silent doesn't swallow it. Back to normal after.
function session(type) { try { if (navigator.audioSession) navigator.audioSession.type = type } catch { /* not on this phone */ } }

/** One burst of the alarm: four sharp beeps, twice, the sound of a kitchen timer. */
function beep() {
  const a = audio(); if (!a) return
  if (a.state !== 'running') a.resume().catch(() => {})
  try {
    const t0 = a.currentTime + 0.03
    for (let k = 0; k < 8; k++) {
      const at = t0 + k * 0.14 + (k >= 4 ? 0.28 : 0)
      const o = a.createOscillator(), g = a.createGain()
      o.type = 'square'; o.frequency.value = 2093
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(0.32, at + 0.008)
      g.gain.setValueAtTime(0.32, at + 0.07)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09)
      o.connect(g).connect(a.destination); o.start(at); o.stop(at + 0.1)
    }
  } catch { /* no sound on this device */ }
  try { if (navigator.vibrate) navigator.vibrate([250, 90, 250, 90, 250, 90, 500]) } catch { /* no buzz here */ }
}

/** Rings every two seconds while `on`, with the tab's title saying so; stops the moment it's off. */
export function useAlarm(on, words) {
  useEffect(() => {
    if (!on) return undefined
    session('playback')
    beep()
    const t = setInterval(beep, 2000)
    const title = document.title
    let flip = false
    const blink = setInterval(() => { flip = !flip; document.title = flip ? `⏰ ${words}` : title }, 1000)
    return () => { clearInterval(t); clearInterval(blink); document.title = title; session('auto'); try { if (navigator.vibrate) navigator.vibrate(0) } catch { /* fine */ } }
  }, [on, words])
}

/** Keeps the screen awake while `on`, so the phone doesn't sleep through a timer. */
export function useAwake(on) {
  useEffect(() => {
    if (!on) return undefined
    let lock = null, live = true
    const ask = async () => { try { if (live && navigator.wakeLock && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen') } catch { /* not here */ } }
    ask()
    document.addEventListener('visibilitychange', ask)
    return () => { live = false; document.removeEventListener('visibilitychange', ask); if (lock) lock.release().catch(() => {}) }
  }, [on])
}

/** The kept timers, ticking each second while there are any: { running, ringing, quiet }. */
export function useTimers() {
  const [list, setList] = useState(read)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const on = () => { setList(read()); setNow(Date.now()) }
    window.addEventListener(EVENT, on)
    window.addEventListener('storage', on)
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on) }
  }, [])
  const any = list.length > 0
  useEffect(() => {
    if (!any) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    window.addEventListener('pointerdown', primeSound, { passive: true })
    return () => { clearInterval(t); window.removeEventListener('pointerdown', primeSound) }
  }, [any])
  return useMemo(() => timerStates(list, now), [list, now])
}
