import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { reducedMotion } from '../lib/motion.js'
import './glow.css'

// The swirling light, after the glow that wraps a phone's edges when its
// assistant listens: colour chasing round the edge of the screen, in the
// occasion's own colours (src/lib/occasions.js). No blur filter (iPhones
// repaint one slowly): soft edges come from masks, motion from transforms.
// It never takes a tap.

const SEEN = 'teamhicks.glow'
const seenToday = (day, key) => { try { return (JSON.parse(localStorage.getItem(SEEN)) || {})[day]?.includes(key) } catch { return false } }
const markSeen = (day, key) => { try { const s = JSON.parse(localStorage.getItem(SEEN)) || {}; localStorage.setItem(SEEN, JSON.stringify({ [day]: [...(s[day] || []), key] })) } catch { /* fine */ } }

const conic = (cs, from = 0) => `conic-gradient(from ${from}deg, ${[...cs, cs[0]].join(', ')})`
const rand = (i, n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1

function Particles({ kind }) {
  const n = kind === 'flutter' ? 28 : kind === 'rise' ? 22 : 18
  return (
    <div className={'glow-particles ' + kind}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ '--x': `${(rand(i, 1) * 100).toFixed(1)}%`, '--y': `${(rand(i, 2) * 100).toFixed(1)}%`, '--d': `${(rand(i, 3) * 4).toFixed(2)}s`, '--t': `${(3 + rand(i, 4) * 4).toFixed(2)}s`, '--s': (0.5 + rand(i, 5)).toFixed(2), '--w': `${(rand(i, 6) * 60 - 30).toFixed(0)}px` }} />
      ))}
    </div>
  )
}

/** Plays the occasion's light once; `play` changing plays it again. */
export function Glow({ occasion, play, seconds = 7, onDone }) {
  const [phase, setPhase] = useState(null)
  const timers = useRef([])
  const done = useRef(onDone)
  done.current = onDone
  const key = occasion ? occasion.key : null // the occasion is rebuilt on each render; its key is what matters
  useEffect(() => {
    if (!key || !play) return undefined
    const calm = reducedMotion()
    setPhase('in')
    timers.current = [setTimeout(() => setPhase('out'), (calm ? 2.5 : seconds) * 1000), setTimeout(() => { setPhase(null); if (done.current) done.current() }, (calm ? 4 : seconds + 2.6) * 1000)]
    return () => timers.current.forEach(clearTimeout)
  }, [key, play, seconds])
  const cs = occasion ? occasion.colours : []
  const layers = useMemo(() => cs.length ? { a: conic(cs, 0), b: conic([...cs].reverse(), 90), c: conic([...cs.slice(2), ...cs.slice(0, 2)], 200) } : null, [cs])
  if (!phase || !occasion) return null
  return createPortal(
    <div className={`glow mode-${occasion.mode} glow-${phase}${reducedMotion() ? ' calm' : ''}`} aria-hidden="true">
      <div className="glow-frame">
        <div className="glow-spin a" style={{ background: layers.a }} />
        <div className="glow-spin b" style={{ background: layers.b }} />
        {occasion.mode === 'liquid' && (
          <>
            <div className="glow-spin c" style={{ background: layers.c }} />
            {cs.slice(0, 6).map((c, i) => <i key={i} className={'blob blob-' + i} style={{ background: `radial-gradient(circle, ${c} 0 32%, transparent 70%)` }} />)}
          </>
        )}
      </div>
      <div className="glow-rim"><div className="glow-spin rim" style={{ background: layers.a }} /></div>
      {occasion.extra && <Particles kind={occasion.extra} />}
    </div>,
    document.body,
  )
}

/**
 * An occasion's chip: its name in its colours. Tapping it plays the light;
 * the light also plays by itself the first time it's seen on `day`.
 */
export function OccasionChip({ occasion, day, className = '' }) {
  const [play, setPlay] = useState(0)
  const key = occasion ? occasion.key : null
  useEffect(() => {
    if (!key || seenToday(day, key)) return undefined
    const t = setTimeout(() => { markSeen(day, key); setPlay((n) => n + 1) }, 500)
    return () => clearTimeout(t)
  }, [key, day])
  if (!occasion) return null
  return (
    <>
      <button type="button" className={'occasion-chip ' + className} style={{ '--chip': conic(occasion.colours, 0) }} onClick={() => setPlay((n) => n + 1)} aria-label={`${occasion.name}: play the light`}>
        <span className="occasion-dot" aria-hidden="true" />{occasion.name}
      </button>
      <Glow occasion={occasion} play={play} />
    </>
  )
}
