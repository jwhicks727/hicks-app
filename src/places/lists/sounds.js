// The lists' sounds, made by the phone itself (no recording to license), like
// the sit's bowl: a soft pluck for each tick, climbing a scale as the list
// goes, a little rising run when a list is done (a hoot for the owl), and a
// shimmer for a golden feather. Settings can switch them off ("Sounds on the
// lists", kept on the device).
import { readPrefs } from '../../lib/prefs.js'

let ctx = null
function audio() {
  if (readPrefs().listSounds === false) return null
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

// C major pentatonic, two octaves: every step sounds right after the last
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760]

function note(c, freq, at, { dur = 0.45, vol = 0.12, type = 'triangle', glide = 0 } = {}) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (glide) o.frequency.exponentialRampToValueAtTime(freq * glide, at + dur * 0.6)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(c.destination)
  o.start(at); o.stop(at + dur + 0.05)
}

/** A tick: the nth thing done today, one step up the scale. */
export function tickSound(step = 0) {
  const c = audio(); if (!c) return
  const t = c.currentTime, f = SCALE[Math.min(step, SCALE.length - 1)]
  note(c, f, t, { vol: 0.11 })
  note(c, f * 2, t, { vol: 0.03, type: 'sine', dur: 0.25 })
}

/** Unticking: a soft step down. */
export function untickSound() {
  const c = audio(); if (!c) return
  note(c, 392, c.currentTime, { vol: 0.06, dur: 0.25, glide: 0.8 })
}

/** A list finished: a bright run for the morning, a soft hoot and a low chord for the night. */
export function doneSound(part) {
  const c = audio(); if (!c) return
  const t = c.currentTime
  if (part === 'evening') {
    note(c, 392, t, { type: 'sine', vol: 0.12, dur: 0.5, glide: 0.94 }) // hoo
    note(c, 392, t + 0.55, { type: 'sine', vol: 0.12, dur: 0.7, glide: 0.92 }) // hoo
    ;[261.63, 329.63, 392, 523.25].forEach((f) => note(c, f, t + 1.2, { type: 'sine', vol: 0.05, dur: 1.6 }))
    return
  }
  ;[523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => note(c, f, t + i * 0.09, { vol: 0.1, dur: 0.6 }))
}

/** A golden feather: a shimmer of high notes. */
export function goldSound() {
  const c = audio(); if (!c) return
  const t = c.currentTime
  ;[1567.98, 2093, 1760, 2349.32, 2637.02].forEach((f, i) => note(c, f, t + 0.06 + i * 0.05, { type: 'sine', vol: 0.05, dur: 0.5 }))
}

/** A hummingbird zipping off: a quick rising chirp. */
export function zipSound() {
  const c = audio(); if (!c) return
  note(c, 1800, c.currentTime, { type: 'sine', vol: 0.04, dur: 0.18, glide: 1.6 })
}

/** The owl, tapped: one soft hoo. */
export function hootSound() {
  const c = audio(); if (!c) return
  note(c, 370, c.currentTime, { type: 'sine', vol: 0.09, dur: 0.45, glide: 0.93 })
}

/** A family challenge won: a fanfare of three. */
export function fanfare() {
  const c = audio(); if (!c) return
  const t = c.currentTime
  ;[[523.25, 0], [659.25, 0.12], [783.99, 0.24], [1046.5, 0.42]].forEach(([f, d]) => note(c, f, t + d, { vol: 0.1, dur: d === 0.42 ? 1 : 0.3 }))
}

/** A tiny buzz on phones that allow it (not iPhones). */
export function buzz(ms = 12) { try { navigator.vibrate?.(ms) } catch { /* not allowed */ } }
