import { useEffect, useRef, useState } from 'react'
import { viewOf, edgesOf, dragCrop, nearestCorner, fitInside, turnCrop, leanCrop, wholeCrop, turnedSize, LEAN } from '../../lib/paintingBatch.js'

// The crop and turn for one photo of Laurie's painting. The box stays level on
// screen and the photo leans under it as it's straightened. Drag a corner or
// an edge, or drag inside to move the box; or, with no dragging at all, tap
// where a corner of the painting is and the nearest corner of the box goes
// there (CLAUDE.md: every drag has a tap). The handles take the arrow keys
// too. Nothing is saved from here: the crop goes up as it changes.
const HANDLES = { nw: 'Top-left corner', n: 'Top edge', ne: 'Top-right corner', e: 'Right edge', se: 'Bottom-right corner', s: 'Bottom edge', sw: 'Bottom-left corner', w: 'Left edge' }
const PAD = 22 // room round the photo for the handles

export default function Cropper({ src, W, H, crop, auto, onChange }) {
  const stage = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [live, setLive] = useState(null)
  const liveRef = useRef(null), drag = useRef(null), leanFrom = useRef(null)
  useEffect(() => {
    const el = stage.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // Another photo, or a change from outside (its own crop, a turn): any drag under way is forgotten
  useEffect(() => { drag.current = null; liveRef.current = null; setLive(null); leanFrom.current = null }, [crop])

  const c = live || crop
  // As tall as the photo needs at this width (a wide photo gets a short stage), up to most of the screen
  const [tw0, th0] = turnedSize(W, H, crop.turn)
  const fitHeight = Math.max(220, (size.w - 2 * PAD) * (th0 / tw0) * 1.06 + 2 * PAD)
  const sw = Math.max(1, size.w - 2 * PAD), sh = Math.max(1, size.h - 2 * PAD)
  const v = size.w ? viewOf(c, W, H, sw, sh) : null
  const show = (next) => { liveRef.current = next; setLive(next) }

  // Pointer to the level edges' own space: the turned photo's pixels, round its centre
  const at = (e) => {
    const r = stage.current.getBoundingClientRect()
    return { x: (e.clientX - r.left - PAD - sw / 2) / v.k, y: (e.clientY - r.top - PAD - sh / 2) / v.k }
  }
  const down = (e) => {
    if (!v || (e.pointerType === 'mouse' && e.button !== 0)) return
    const p = at(e), ed = edgesOf(crop, W, H), handle = e.target.closest('[data-h]')
    const inside = p.x > ed.left && p.x < ed.right && p.y > ed.top && p.y < ed.bottom
    drag.current = { id: e.pointerId, h: handle ? handle.dataset.h : inside ? 'move' : null, start: p, sx: e.clientX, sy: e.clientY, moved: false }
    stage.current.setPointerCapture(e.pointerId)
  }
  const move = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return
    d.moved = true
    if (!d.h) return
    const p = at(e)
    show(dragCrop(crop, d.h, p.x - d.start.x, p.y - d.start.y, W, H))
  }
  const up = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.moved) {
      // A tap: the nearest corner of the box comes to it (a tap on a handle only picks it up)
      if (e.target.closest('[data-h]')) return
      const p = at(e), ed = edgesOf(crop, W, H), h = nearestCorner(ed, p.x, p.y)
      onChange(dragCrop(crop, h, p.x - (h.includes('w') ? ed.left : ed.right), p.y - (h.includes('n') ? ed.top : ed.bottom), W, H))
      return
    }
    const next = liveRef.current
    liveRef.current = null; setLive(null)
    if (next) onChange(next)
  }
  const cancel = () => { drag.current = null; liveRef.current = null; setLive(null) }
  const key = (h) => (e) => {
    const step = (Math.min(...turnedSize(W, H, crop.turn)) * (e.shiftKey ? 0.02 : 0.005))
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!d) return
    e.preventDefault()
    onChange(dragCrop(crop, h, d[0], d[1], W, H))
  }

  const turn = (by) => onChange(fitInside(turnCrop(crop, W, H, by), W, H))
  const lean = (e) => onChange(leanCrop(leanFrom.current || crop, Number(e.target.value), W, H))
  const startLean = () => { leanFrom.current = crop }
  const endLean = () => { leanFrom.current = null }
  const own = auto ? fitInside(turnCrop(auto, W, H, crop.turn), W, H) : null
  const same = (a, b) => a && b && ['turn', 'angle', 'cx', 'cy', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) < 0.5)

  return (
    <div className="ll-crop-wrap">
      <div className={'ll-crop' + (live ? ' dragging' : '')} ref={stage} style={size.w ? { height: `min(58vh, ${Math.round(fitHeight)}px)` } : undefined}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
        {v && src && <img className="ll-crop-photo" src={src} alt="The photo, to crop" draggable={false} style={{ width: W, height: H, transform: `translate(${PAD}px, ${PAD}px) matrix(${v.matrix.join(', ')})` }} />}
        {v && (
          <div className="ll-crop-box" style={{ left: PAD + v.box.left, top: PAD + v.box.top, width: v.box.width, height: v.box.height }}>
            {Object.entries(HANDLES).map(([h, name]) => <button key={h} type="button" className={'ll-crop-h ll-crop-' + h} data-h={h} aria-label={name} onKeyDown={key(h)} />)}
          </div>
        )}
      </div>
      <p className="ll-crop-how">Drag the edges or corners, or tap where a corner of the painting is.</p>
      <div className="ll-crop-tools">
        <button type="button" className="ll-crop-b" onClick={() => turn(-90)} aria-label="Turn it left">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h10.5a5.5 5.5 0 0 1 0 11H10M8 5.5 4 9.5l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="ll-crop-b" onClick={() => turn(90)} aria-label="Turn it right">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9.5H9.5a5.5 5.5 0 0 0 0 11H14M16 5.5l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <label className="ll-crop-lean">
          <span>Straighten</span>
          <input type="range" min={-LEAN} max={LEAN} step={0.1} value={crop.angle} onChange={lean}
            onPointerDown={startLean} onPointerUp={endLean} onPointerCancel={endLean} onFocus={startLean} onBlur={endLean} />
          <output>{(crop.angle > 0 ? '+' : '') + crop.angle.toFixed(1)}°</output>
        </label>
      </div>
      <div className="ll-crop-tools">
        {own && <button type="button" className="btn ghost" disabled={same(own, crop)} onClick={() => onChange(own)}>Its own crop</button>}
        <button type="button" className="btn ghost" disabled={same(wholeCrop(W, H, crop.turn), crop)} onClick={() => onChange(wholeCrop(W, H, crop.turn))}>The whole photo</button>
      </div>
    </div>
  )
}
