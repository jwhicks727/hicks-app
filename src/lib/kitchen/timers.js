import { useEffect, useState } from 'react'

// Kitchen timers, kept on the device as their end times, so a timer started
// before the phone closed the app is still right when it opens again.
const KEY = 'teamhicks.timers'
const EVENT = 'teamhicks:timers'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
const write = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* kept for now */ } window.dispatchEvent(new Event(EVENT)) }

export function startTimer({ label, minutes, recipe }) {
  const list = read().filter((t) => !(t.recipe === recipe && t.label === label))
  write([...list, { id: `${Date.now()}`, label, recipe, ends: Date.now() + minutes * 60000, minutes }])
}
export const stopTimer = (id) => write(read().filter((t) => t.id !== id))

let audio
function chime() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.35, 0.7].forEach((at, i) => {
      const o = audio.createOscillator(), g = audio.createGain()
      o.frequency.value = [880, 1175, 1568][i]; o.type = 'sine'
      g.gain.setValueAtTime(0.0001, audio.currentTime + at); g.gain.exponentialRampToValueAtTime(0.3, audio.currentTime + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + at + 0.6)
      o.connect(g).connect(audio.destination); o.start(audio.currentTime + at); o.stop(audio.currentTime + at + 0.65)
    })
  } catch { /* no sound on this device */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400])
}

/** The running timers, ticking each second; each chimes once when it ends. */
export function useTimers() {
  const [list, setList] = useState(read)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const on = () => setList(read())
    window.addEventListener(EVENT, on)
    const t = setInterval(() => {
      setNow(Date.now())
      const l = read(); let changed = false
      for (const x of l) if (!x.rang && x.ends <= Date.now()) { x.rang = true; changed = true; if (Date.now() - x.ends < 60000) chime() }
      if (changed) write(l)
    }, 1000)
    return () => { window.removeEventListener(EVENT, on); clearInterval(t) }
  }, [])
  return list.map((t) => ({ ...t, left: Math.max(0, Math.round((t.ends - now) / 1000)) }))
}

export const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
