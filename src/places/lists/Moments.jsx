import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { reducedMotion } from '../../lib/motion.js'
import { Hummingbird, Feather, Trophy } from './Birds.jsx'

// The lists' big moments, drawn over the page (portals, so no card's
// entrance animation pins them): the hummingbird's flight round the screen
// when a morning list is done, three of them flying together on a Team Hicks
// day, and the celebration card for a milestone or a challenge won. All
// transforms and opacity; none of them plays under less motion (the card's
// words say it all).

/** The hummingbird leaves its perch (`from`, a DOMRect), loops round the screen and comes home. */
export function Flight({ from, bird, onDone }) {
  const el = useRef(null)
  useEffect(() => {
    if (!el.current || reducedMotion() || !el.current.animate) { onDone(); return undefined }
    const W = window.innerWidth, H = window.innerHeight
    const x0 = from.left, toLeft = -(x0 - 24), dip = Math.min(140, H * 0.2)
    const a = el.current.animate([
      { transform: 'translate(0,0) scaleX(1) rotate(0)' },
      { transform: 'translate(-14px,-34px) scaleX(1) rotate(-8deg)', offset: 0.1 },
      { transform: `translate(${toLeft * 0.55}px,-46px) scaleX(1) rotate(-4deg)`, offset: 0.28 },
      { transform: `translate(${toLeft}px,${dip * 0.2}px) scaleX(1) rotate(10deg)`, offset: 0.42 },
      { transform: `translate(${toLeft + 10}px,${dip}px) scaleX(-1) rotate(-6deg)`, offset: 0.52 },
      { transform: `translate(${Math.min(40, W * 0.05)}px,${dip * 0.7}px) scaleX(-1) rotate(-12deg)`, offset: 0.78 },
      { transform: 'translate(16px,-12px) scaleX(1) rotate(6deg)', offset: 0.9 },
      { transform: 'translate(0,0) scaleX(1) rotate(0)' },
    ], { duration: 2900, easing: 'cubic-bezier(.45,.05,.4,1)' })
    a.onfinish = onDone
    return () => a.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, from where it was
  return createPortal(
    <div className="dl-flight" ref={el} style={{ left: from.left, top: from.top, width: from.width, height: from.height }} aria-hidden="true">
      {bird}
    </div>,
    document.body,
  )
}

/** A Team Hicks day: everyone's hummingbird, in formation, across the whole screen. */
export function TeamFlight({ people, onDone }) {
  const el = useRef(null)
  useEffect(() => {
    if (!el.current || reducedMotion() || !el.current.animate) { const t = setTimeout(onDone, 4200); return () => clearTimeout(t) }
    const W = window.innerWidth
    const a = el.current.animate([
      { transform: `translate(${-160}px, 40px)` },
      { transform: `translate(${W * 0.35}px, -10px)`, offset: 0.4 },
      { transform: `translate(${W * 0.6}px, 30px)`, offset: 0.65 },
      { transform: `translate(${W + 160}px, -30px)` },
    ], { duration: 3600, easing: 'ease-in-out' })
    a.onfinish = onDone
    return () => a.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="dl-team" role="status" aria-live="polite">
      <div className="dl-team-birds" ref={el} aria-hidden="true">
        {people.map((p, i) => (
          <span key={p.id} className="dl-team-bird" style={{ '--i': i }}><Hummingbird throat={p.colour || '#C42D20'} annas={/^anna$/i.test(p.name)} /></span>
        ))}
      </div>
      <p className="dl-team-words"><b>A Team Hicks day!</b><span>Every one of us finished every list.</span></p>
    </div>,
    document.body,
  )
}

const JOY = ['#F2C14E', '#E38B2C', '#3FA34D', '#4B5BA6', '#D6336C', '#7FC6C2', '#FFF8EE']

/** A celebration card: feathers drift down round it. A tap anywhere, or a few seconds, puts it away. */
export function Joy({ moment, onDone }) {
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const t = setTimeout(() => done.current(), moment.long ? 6000 : 4200)
    const key = (e) => { if (e.key === 'Escape') done.current() }
    window.addEventListener('keydown', key)
    return () => { clearTimeout(t); window.removeEventListener('keydown', key) }
  }, [moment])
  const calm = reducedMotion()
  const colours = moment.colours && moment.colours.length ? moment.colours : JOY
  return createPortal(
    <div className="dl-joy" onClick={onDone} role="status" aria-live="polite">
      {!calm && Array.from({ length: moment.big ? 44 : 26 }, (_, k) => (
        <span key={k} className="dl-joy-f" style={{ '--x': `${(k * 37) % 100}vw`, '--d': `${2.2 + ((k * 13) % 17) / 8}s`, '--delay': `${((k * 11) % 9) / 12}s`, '--sway': `${((k * 7) % 5) * 14 - 28}px` }}>
          <Feather colour={colours[k % colours.length]} />
        </span>
      ))}
      <div className="dl-joy-card">
        {moment.trophy ? <Trophy className="dl-joy-art" /> : moment.art ? <span className="dl-joy-art">{moment.art}</span> : null}
        <b>{moment.title}</b>
        {moment.line && <span>{moment.line}</span>}
        <small>Tap to close</small>
      </div>
    </div>,
    document.body,
  )
}
