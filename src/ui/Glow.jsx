import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '../shell/Link.jsx'
import { reducedMotion } from '../lib/motion.js'
import './glow.css'

// The swirling light, after the glow round a phone assistant's text field:
// colour chasing round the edge of the occasion's own card, never the whole
// screen, in the occasion's colours (src/lib/occasions.js). No blur filter
// (iPhones repaint one slowly): soft edges come from masks, motion from
// transforms. It never takes a tap.

const SEEN = 'teamhicks.glow'
const seenToday = (day, key) => { try { return (JSON.parse(localStorage.getItem(SEEN)) || {})[day]?.includes(key) } catch { return false } }
const markSeen = (day, key) => { try { const s = JSON.parse(localStorage.getItem(SEEN)) || {}; localStorage.setItem(SEEN, JSON.stringify({ [day]: [...(s[day] || []), key] })) } catch { /* fine */ } }

export const conic = (cs, from = 0) => `conic-gradient(from ${from}deg, ${[...cs, cs[0]].join(', ')})`
const rand = (i, n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1

function Particles({ kind }) {
  const n = kind === 'flutter' ? 22 : kind === 'rise' ? 18 : 14
  return (
    <div className={'glow-particles ' + kind} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ '--x': `${(rand(i, 1) * 100).toFixed(1)}%`, '--y': `${(rand(i, 2) * 100).toFixed(1)}%`, '--d': `${(rand(i, 3) * 3).toFixed(2)}s`, '--t': `${(2.5 + rand(i, 4) * 3).toFixed(2)}s`, '--s': (0.5 + rand(i, 5)).toFixed(2), '--w': `${(rand(i, 6) * 40 - 20).toFixed(0)}px` }} />
      ))}
    </div>
  )
}

/** Plays once a day by itself, and again on `replay()`: [playing, replay]. */
function usePlay(occasion, day, seconds = 7) {
  const [phase, setPhase] = useState(null) // 'in' | 'out' | null
  const timers = useRef([])
  const key = occasion ? occasion.key : null // rebuilt on each render; its key is what matters
  const play = () => {
    timers.current.forEach(clearTimeout)
    const calm = reducedMotion()
    setPhase('in')
    timers.current = [setTimeout(() => setPhase('out'), (calm ? 2.5 : seconds) * 1000), setTimeout(() => setPhase(null), (calm ? 4 : seconds + 2.2) * 1000)]
  }
  useEffect(() => {
    if (!key || seenToday(day, key)) return undefined
    const t = setTimeout(() => { markSeen(day, key); play() }, 450)
    return () => clearTimeout(t)
  }, [key, day]) // eslint-disable-line react-hooks/exhaustive-deps -- play reads only refs and setters
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  return [phase, play]
}

/**
 * Wraps one card in its occasion's light: a halo just outside its edge and a
 * bright rim on it while it plays, a still rim after; snow, sparks or a light
 * show inside. `children` is the card.
 */
export function GlowWrap({ occasion, day, className = '', replayAt = 'bottom', children }) {
  const [phase, play] = usePlay(occasion, day)
  const cs = occasion ? occasion.colours : []
  const layers = useMemo(() => (cs.length ? { a: conic(cs, 0), b: conic([...cs].reverse(), 120) } : null), [cs])
  if (!occasion) return children
  return (
    <div className={`glow-wrap mode-${occasion.mode}${phase ? ' playing glow-' + phase : ''}${reducedMotion() ? ' calm' : ''} ${className}`} style={{ '--glow': layers.a }}>
      <div className="glow-halo" aria-hidden="true">
        <div className="glow-spin a" style={{ background: layers.a }} />
        <div className="glow-spin b" style={{ background: layers.b }} />
        {occasion.mode === 'liquid' && cs.slice(0, 5).map((c, i) => <i key={i} className={'blob blob-' + i} style={{ background: `radial-gradient(circle, ${c} 0 30%, transparent 68%)` }} />)}
      </div>
      {children}
      <div className="glow-rim" aria-hidden="true"><div className="glow-spin rim" style={{ background: layers.a }} /></div>
      {phase && (
        <div className="glow-inside" aria-hidden="true">
          {occasion.mode === 'liquid' && cs.slice(0, 5).map((c, i) => <i key={i} className={'blob blob-' + i} style={{ background: `radial-gradient(circle, ${c} 0 30%, transparent 68%)` }} />)}
          {occasion.extra && <Particles kind={occasion.extra} />}
        </div>
      )}
      <button type="button" className={'glow-replay at-' + replayAt} onClick={play} aria-label={`${occasion.name}: play the light again`} title="Play the light again"><span className="occasion-dot" /><svg className="glow-replay-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.1-5" /><path d="M5 4.5V8h3.5" /></svg></button>
    </div>
  )
}

/** A day's occasion as its own card, wrapped in its light: a concert, a feast, a holiday. */
export function OccasionCard({ occasion, day, className = '' }) {
  if (!occasion) return null
  return (
    <GlowWrap occasion={occasion} day={day} className={className} replayAt="top">
      <article className="occasion-card">
        <span className="oc-kicker">{occasion.key === 'show' ? 'Tonight’s show' : 'Today'}</span>
        <b className="oc-name">{occasion.name}</b>
        {occasion.sub && <span className="oc-sub">{occasion.sub}</span>}
        {occasion.href && <Link className="oc-more" to={occasion.href}>The details ›</Link>}
      </article>
    </GlowWrap>
  )
}
