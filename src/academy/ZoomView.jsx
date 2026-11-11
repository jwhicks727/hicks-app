import { useRef, useState } from 'react'
import { FIT, MAX_ZOOM, zoomAt, panBy, spread, pinch } from './zoom.js'

// Pinch to zoom the campus or a room, and drag to look around once zoomed.
// Two fingers on a phone, ctrl or ⌘ and the wheel (a trackpad's pinch) on a
// computer, and + / − / fit buttons for anyone who'd rather tap. Zoom lives
// only on screen: it is never saved. A drag that moves the picture is never
// taken for a tap on a building or a thing (the click after it is dropped).

const MOVED = 6 // pixels a finger travels before it counts as a drag

export default function ZoomView({ children, pan = true }) {
  const frame = useRef(null)
  const touches = useRef(new Map()) // pointerId -> { x, y } in frame pixels
  const gesture = useRef({ pinching: false, dragged: false, start: null })
  const [v, setV] = useState(FIT)
  const view = useRef(FIT)
  const set = (next) => { view.current = next; setV(next) }
  const size = () => { const r = frame.current.getBoundingClientRect(); return { w: r.width, h: r.height, l: r.left, t: r.top } }
  const local = (e) => { const z = size(); return { x: e.clientX - z.l, y: e.clientY - z.t } }

  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    touches.current.set(e.pointerId, local(e))
    gesture.current.dragged = false
    if (touches.current.size === 2) gesture.current.pinching = true
  }
  const move = (e) => {
    const map = touches.current
    if (!map.has(e.pointerId)) return
    const was = map.get(e.pointerId), now = local(e), { w, h } = size()
    if (map.size === 2) {
      const [p, q] = [...map.values()], before = spread(p, q)
      map.set(e.pointerId, now)
      const [p2, q2] = [...map.values()]
      set(pinch(view.current, before, spread(p2, q2), w, h))
      gesture.current.dragged = true
    } else if (map.size === 1 && pan && view.current.s > 1 && !gesture.current.pinching) {
      const g = gesture.current
      if (!g.dragged && Math.hypot(now.x - was.x, now.y - was.y) < 1) return
      g.start = g.start || { ...was }
      if (!g.dragged && Math.hypot(now.x - g.start.x, now.y - g.start.y) < MOVED) return
      g.dragged = true
      map.set(e.pointerId, now)
      set(panBy(view.current, now.x - was.x, now.y - was.y, w, h))
    }
  }
  const up = (e) => {
    touches.current.delete(e.pointerId)
    if (touches.current.size === 0) { gesture.current.pinching = false; gesture.current.start = null }
  }
  // After a drag or pinch the browser still sends a click: don't let it open a building
  const click = (e) => { if (gesture.current.dragged) { e.stopPropagation(); e.preventDefault(); gesture.current.dragged = false } }
  const wheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return
    e.preventDefault()
    const { w, h } = size(), p = local(e)
    set(zoomAt(view.current, Math.exp(-e.deltaY * 0.01), p.x, p.y, w, h))
  }
  const step = (factor) => { const { w, h } = size(); set(zoomAt(view.current, factor, w / 2, h / 2, w, h)) }

  // React attaches wheel passively, so the ctrl-wheel's preventDefault needs its own listener
  const hook = (el) => {
    if (frame.current) frame.current.removeEventListener('wheel', frame.current._ac)
    frame.current = el
    if (el) { el._ac = wheel; el.addEventListener('wheel', wheel, { passive: false }) }
  }

  const zoomed = v.s > 1.001
  const shown = v
  return (
    <div className="ac-zoom">
      <div ref={hook} className={'ac-zoom-frame' + (zoomed ? ' zoomed' : '')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClickCapture={click}>
        <div className="ac-zoom-inner" style={{ transform: zoomed ? `translate(${shown.x}px, ${shown.y}px) scale(${shown.s})` : undefined }}>{children}</div>
      </div>
      <div className="ac-zoom-btns" role="group" aria-label="Zoom">
        <button type="button" onClick={() => step(1.5)} disabled={v.s >= MAX_ZOOM} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => step(1 / 1.5)} disabled={!zoomed} aria-label="Zoom out">−</button>
        {zoomed && <button type="button" onClick={() => set(FIT)} aria-label="Fit the whole picture">Fit</button>}
      </div>
    </div>
  )
}
