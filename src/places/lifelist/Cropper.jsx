import { useEffect, useRef, useState } from 'react'
import { viewOf, edgesOf, dragCrop, nearestCorner, fitInside, reach, turnCrop, leanCrop, wholeCrop, turnedSize, fitsStage, sameCrop, LEAN } from '../../lib/paintingBatch.js'
import { SHAPES, SHAPE_ORDER, outlineOf } from '../../lib/shapes.js'
import './addpaintings.css'

// The crop and turn for one photo of Laurie's painting (or Anna's art). The box stays
// level on screen and the photo leans under it as it's straightened. Drag a corner or
// an edge, or drag inside to move the box; or, with no dragging at all, tap where a
// corner of the painting is and the nearest corner of the box goes there (CLAUDE.md:
// every drag has a tap). The handles take the arrow keys too. Nothing is saved from
// here: the crop goes up as it changes.
//
// Three things keep it calm (decisions log, 2026-11-08, "The crop screen holds still"):
//   - The first tap only picks it: a tap moves a corner only once the crop screen is in
//     use, so tapping into it from the form never throws the crop somewhere new. A tap
//     anywhere else on the page puts it down again.
//   - Selecting is not a click to move. A tap inside the box only selects it, and never moves
//     a corner; a tap outside it, once the tool is picked, brings the nearest corner there.
//   - The view holds still while a finger is down. Zoomed in, it is framed on the box as it
//     was when the zoom went on (or after a turn), never on the box as it's being dragged, so
//     the photo doesn't slide away under a finger; it reframes only when the box leaves the
//     stage. The zoom itself comes on when a change is let go of (a drag released, a tap, a
//     turn, a nudge), once, so the painting is close enough to finish; "Zoom out" switches
//     that off for good, "Zoom in" back on.
//   - Every change can be undone (Undo, or Ctrl/⌘ Z; Redo, or Ctrl/⌘ Shift Z or Ctrl Y).
// A 3 x 3 grid sits in the box to line the painting's edges up against. With `onShape`,
// the painting's shape is chosen here too (a round canvas, a hexagon, a triangle, or its
// own shape traced corner by corner): its outline sits in the box, so the box can be fitted
// round it. Her painting is still only cropped and turned; the shape is the frame round it.
const HANDLES = { nw: 'Top-left corner', n: 'Top edge', ne: 'Top-right corner', e: 'Right edge', se: 'Bottom-right corner', s: 'Bottom edge', sw: 'Bottom-left corner', w: 'Left edge' }
const PAD = 22 // room round the photo for the handles
const HISTORY = 80
const typing = (el) => el && (el.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.type !== 'range' && el.type !== 'checkbox' && el.type !== 'button'))
const sameShape = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null)

export default function Cropper({ src, W, H, crop, auto, onChange, what = 'painting', shape, onShape }) {
  const wrap = useRef(null), stage = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [live, setLive] = useState(null) // the crop while a drag is under way
  const [livePts, setLivePts] = useState(null) // a traced shape's corners while one is dragged
  const [zoom, setZoom] = useState(false)
  const [autoZoom, setAutoZoom] = useState(true) // zoom in on its own once a change is let go of; Zoom out turns it off
  const [frame, setFrame] = useState(crop) // what the zoomed view is framed on
  const [active, setActive] = useState(false) // picked: taps move corners now
  const [tracing, setTracing] = useState(false)
  const [hist, setHistState] = useState({ past: [], future: [] })
  const histRef = useRef(hist)
  const setHist = (h) => { histRef.current = h; setHistState(h) }
  const [leaning, setLeaning] = useState(false)
  const drag = useRef(null), leanFrom = useRef(null)
  const now = useRef({ crop, shape })
  now.current = { crop, shape }

  useEffect(() => {
    const el = stage.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // A change from outside (Claude turned it upright, another device cropped it): a drag under way is forgotten, and the
  // view is framed afresh if the turn or lean changed. A copy of the same crop (brought back from storage) changes nothing.
  const key = `${crop.turn}|${crop.angle}|${Math.round(crop.cx)}|${Math.round(crop.cy)}|${Math.round(crop.w)}|${Math.round(crop.h)}`
  useEffect(() => {
    if (drag.current && drag.current.moved) { drag.current = null; setLive(null); setLivePts(null) }
    setFrame((f) => (f.turn !== crop.turn || f.angle !== crop.angle ? crop : f))
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- by value, not by the object

  // Put down by a tap or click anywhere else on the page
  useEffect(() => {
    if (!active) return undefined
    const off = (e) => { if (wrap.current && !wrap.current.contains(e.target)) { setActive(false); setTracing(false) } }
    document.addEventListener('pointerdown', off, true)
    return () => document.removeEventListener('pointerdown', off, true)
  }, [active])

  // ---- History: every change can be undone ----
  const snapshot = () => ({ crop: now.current.crop, shape: now.current.shape })
  const record = () => { const h = histRef.current; setHist({ past: [...h.past.slice(-(HISTORY - 1)), snapshot()], future: [] }) }
  const change = (next) => { if (sameCrop(next, now.current.crop)) return; record(); onChange(next) }
  const changeShape = (next) => { if (!onShape || sameShape(next, now.current.shape)) return; record(); onShape(next) }
  const apply = (snap) => {
    if (!sameCrop(snap.crop, now.current.crop)) onChange(snap.crop)
    if (onShape && !sameShape(snap.shape, now.current.shape)) onShape(snap.shape)
  }
  const undo = () => {
    const h = histRef.current
    if (!h.past.length) return
    setHist({ past: h.past.slice(0, -1), future: [...h.future, snapshot()] })
    apply(h.past[h.past.length - 1])
  }
  const redo = () => {
    const h = histRef.current
    if (!h.future.length) return
    setHist({ past: [...h.past, snapshot()], future: h.future.slice(0, -1) })
    apply(h.future[h.future.length - 1])
  }
  const undoRef = useRef(undo), redoRef = useRef(redo)
  undoRef.current = undo; redoRef.current = redo
  // Ctrl/⌘ Z while the crop screen is in use (never while typing in a box: that's the box's own undo)
  useEffect(() => {
    const on = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || typing(e.target)) return
      const inside = wrap.current && (active || wrap.current.contains(document.activeElement))
      if (!inside) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undoRef.current() } else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redoRef.current() }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [active])

  const c = live || crop
  // As tall as the photo needs at this width (a wide photo gets a short stage), up to most of the screen
  const [tw0, th0] = turnedSize(W, H, crop.turn)
  const fitHeight = Math.max(220, (size.w - 2 * PAD) * (th0 / tw0) * 1.06 + 2 * PAD)
  const sw = Math.max(1, size.w - 2 * PAD), sh = Math.max(1, size.h - 2 * PAD)
  const framed = frame.turn === c.turn && frame.angle === c.angle ? frame : c
  const v = size.w ? viewOf(c, W, H, sw, sh, { zoom, frame: framed }) : null
  // After a change, zoomed in: reframe only if the box has left the stage or is lost in it
  const settle = (next) => {
    if (!zoom || !size.w) return
    const nv = viewOf(next, W, H, sw, sh, { zoom, frame: framed })
    if (!fitsStage(nv.box, sw, sh, { zoom })) setFrame(next)
  }
  // A change let go of: zoom in on the box, once, so the edges can be finished close up; already zoomed, only reframe if it left the stage
  const adjusted = (next) => {
    if (autoZoom && !zoom && size.w) { setFrame(next); setZoom(true) } else settle(next)
  }

  // Pointer to the level edges' own space: the turned photo's pixels, round its centre
  const fe = zoom ? edgesOf(framed, W, H) : null
  const at = (e) => {
    const r = stage.current.getBoundingClientRect()
    const bx = fe ? (fe.left + fe.right) / 2 : 0, by = fe ? (fe.top + fe.bottom) / 2 : 0
    return { x: (e.clientX - r.left - PAD - sw / 2) / v.k + bx, y: (e.clientY - r.top - PAD - sh / 2) / v.k + by }
  }
  const points = (livePts || (shape && shape.kind === 'polygon' && Array.isArray(shape.points) ? shape.points : []))
  const down = (e) => {
    if (!v || (e.pointerType === 'mouse' && e.button !== 0)) return
    const p = at(e), ed = edgesOf(crop, W, H), handle = e.target.closest('[data-h]'), pt = e.target.closest('[data-pt]')
    const inside = p.x > ed.left && p.x < ed.right && p.y > ed.top && p.y < ed.bottom
    drag.current = { id: e.pointerId, h: pt ? 'pt:' + pt.dataset.pt : handle ? handle.dataset.h : inside && !tracing ? 'move' : null, start: p, sx: e.clientX, sy: e.clientY, moved: false, picking: !active, onHandle: Boolean(pt || handle) }
    setActive(true)
    stage.current.setPointerCapture(e.pointerId)
  }
  const move = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return
    d.moved = true
    if (!d.h) return
    const p = at(e)
    if (d.h.startsWith('pt:')) {
      const ed = edgesOf(crop, W, H), i = Number(d.h.slice(3))
      const fx = Math.min(1, Math.max(0, (p.x - ed.left) / (ed.right - ed.left))), fy = Math.min(1, Math.max(0, (p.y - ed.top) / (ed.bottom - ed.top)))
      setLivePts(points.map((q, k) => (k === i ? [fx, fy] : q)))
      return
    }
    setLive(dragCrop(crop, d.h, p.x - d.start.x, p.y - d.start.y, W, H))
  }
  const up = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.moved) {
      // The first tap only picks the crop screen up; a tap on a handle or a corner only takes hold of it (judged where
      // the finger went down: the stage holds the pointer, so by now the target is the stage itself)
      if (d.picking || d.onHandle) return
      const p = at(e), ed = edgesOf(crop, W, H)
      // A tap inside the box only selects it: it is never a click to move a corner (a traced shape's corners are the exception)
      if (!tracing && p.x > ed.left && p.x < ed.right && p.y > ed.top && p.y < ed.bottom) return
      if (tracing) {
        const fx = (p.x - ed.left) / (ed.right - ed.left), fy = (p.y - ed.top) / (ed.bottom - ed.top)
        if (fx < -0.02 || fy < -0.02 || fx > 1.02 || fy > 1.02) return
        changeShape({ kind: 'polygon', points: [...points, [Math.min(1, Math.max(0, fx)), Math.min(1, Math.max(0, fy))]].map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]) })
        return
      }
      const h = nearestCorner(ed, p.x, p.y)
      const next = dragCrop(crop, h, p.x - (h.includes('w') ? ed.left : ed.right), p.y - (h.includes('n') ? ed.top : ed.bottom), W, H)
      change(next); adjusted(next)
      return
    }
    if (livePts) { const pts = livePts; setLivePts(null); changeShape({ kind: 'polygon', points: pts.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]) }); return }
    const next = live
    setLive(null)
    if (next) { change(next); adjusted(next) }
  }
  const cancel = () => { drag.current = null; setLive(null); setLivePts(null) }
  const keyOn = (h) => (e) => {
    if (e.key === 'Escape') { setActive(false); e.currentTarget.blur(); return }
    const step = (Math.min(...turnedSize(W, H, crop.turn)) * (e.shiftKey ? 0.02 : 0.005))
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!d) return
    e.preventDefault()
    const next = dragCrop(crop, h, d[0], d[1], W, H)
    change(next); adjusted(next)
  }

  const turn = (by) => { const next = fitInside(turnCrop(crop, W, H, by), W, H, reach(W, H, crop.turn + by)); change(next); setFrame(next); if (autoZoom) setZoom(true) }
  // The straighten slider: one step in the history for each go at it, however many small moves it makes
  const lean = (e) => {
    const from = leanFrom.current || { crop, recorded: false }
    if (!leanFrom.current) leanFrom.current = from
    if (!from.recorded) { record(); from.recorded = true }
    const next = leanCrop(from.crop, Number(e.target.value), W, H)
    onChange(next); setFrame(next); if (autoZoom) setZoom(true)
  }
  const startLean = () => { leanFrom.current = { crop, recorded: false }; setActive(true); setLeaning(true) }
  const endLean = () => { leanFrom.current = null; setLeaning(false) }
  const own = auto ? fitInside(turnCrop(auto, W, H, crop.turn), W, H) : null
  const whole = wholeCrop(W, H, crop.turn)
  const reset = (next) => { change(next); setFrame(next); if (autoZoom) setZoom(true) }
  // Zoom out is a choice to stay out; Zoom in is a choice to come back to it
  const toggleZoom = () => { setFrame(crop); setAutoZoom(!zoom); setZoom(!zoom) }

  const shapeKind = shape && SHAPES[shape.kind] ? shape.kind : 'rect'
  const outline = shape ? outlineOf(shape.kind === 'polygon' ? { kind: 'polygon', points } : shape) : ''
  const pickShape = (k) => {
    if (k === 'polygon') { setTracing(true); setActive(true); if (shapeKind !== 'polygon') changeShape({ kind: 'polygon', points: [] }); return }
    setTracing(false)
    changeShape(k === 'rect' ? null : { kind: k })
  }
  const how = !active ? `Tap the photo to start. Then drag the edges or corners, or tap where a corner of the ${what} is.`
    : tracing ? `Tap round the edge of the ${what}, one corner at a time; drag a dot to move it.`
      : `Drag the edges or corners, or tap where a corner of the ${what} is.`

  return (
    <div className="ll-crop-wrap" ref={wrap}>
      <div className={'ll-crop' + (live || livePts ? ' dragging' : '') + (active ? ' on' : '') + (leaning ? ' leaning' : '')} ref={stage} style={size.w ? { height: `min(58vh, ${Math.round(fitHeight)}px)` } : undefined}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
        {v && src && <img className="ll-crop-photo" src={src} alt={`The photo, to crop`} draggable={false} style={{ width: W, height: H, transform: `translate(${PAD}px, ${PAD}px) matrix(${v.matrix.join(', ')})` }} />}
        {v && (
          <div className="ll-crop-box" style={{ left: PAD + v.box.left, top: PAD + v.box.top, width: v.box.width, height: v.box.height }}>
            <span className="ll-crop-grid" aria-hidden="true" />
            {outline && (
              <svg className="ll-crop-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path className="ll-crop-shape-out" d={`M-1 -1H101V101H-1Z${outline}`} fillRule="evenodd" />
                <path className="ll-crop-shape-line" d={outline} vectorEffect="non-scaling-stroke" />
              </svg>
            )}
            {Object.entries(HANDLES).map(([h, name]) => <button key={h} type="button" className={'ll-crop-h ll-crop-' + h} data-h={h} aria-label={name} onKeyDown={keyOn(h)} onFocus={() => setActive(true)} />)}
            {shapeKind === 'polygon' && points.map(([x, y], i) => <button key={i} type="button" className="ll-crop-pt" data-pt={i} style={{ left: `${x * 100}%`, top: `${y * 100}%` }} aria-label={`Corner ${i + 1} of its shape`} />)}
          </div>
        )}
      </div>
      <p className="ll-crop-how">{how}</p>
      <div className="ll-crop-tools">
        <button type="button" className="ll-crop-t" onClick={undo} disabled={!hist.past.length} title="Undo (Ctrl or ⌘ Z)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4.5 11.5 9 16M5 11.5h9.5a5 5 0 0 1 0 10H12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Undo
        </button>
        <button type="button" className="ll-crop-t" onClick={redo} disabled={!hist.future.length} title="Redo (Ctrl or ⌘ Shift Z)">Redo
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 7l4.5 4.5L15 16M19 11.5H9.5a5 5 0 0 0 0 10H12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
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
        {own && <button type="button" className="btn ghost" disabled={sameCrop(own, crop)} onClick={() => reset(own)}>Its own crop</button>}
        <button type="button" className="btn ghost" aria-pressed={zoom} onClick={toggleZoom}>{zoom ? 'Zoom out' : 'Zoom in'}</button>
        <button type="button" className="btn ghost" disabled={sameCrop(whole, crop)} onClick={() => reset(whole)}>The whole photo</button>
      </div>
      {onShape && (
        <fieldset className="ll-crop-shapes">
          <legend>The shape of its canvas</legend>
          <div className="ll-crop-shape-row">
            {SHAPE_ORDER.map((k) => (
              <button key={k} type="button" className="ll-crop-sb" aria-pressed={shapeKind === k} onClick={() => pickShape(k)} title={SHAPES[k].label}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><ShapeIcon kind={k} /></svg>
                <span>{SHAPES[k].label}</span>
              </button>
            ))}
          </div>
          {shapeKind === 'polygon' && (
            <p className="ll-up-from">
              {points.length < 3 ? `Tap ${3 - points.length === 3 ? 'three or more corners' : `${3 - points.length} more corner${3 - points.length === 1 ? '' : 's'}`} round its edge, in order.` : `${points.length} corners.`}
              {' '}{tracing
                ? <button type="button" className="ll-up-link" onClick={() => setTracing(false)}>Done tracing</button>
                : <button type="button" className="ll-up-link" onClick={() => { setTracing(true); setActive(true) }}>Add corners</button>}
              {points.length > 0 && <button type="button" className="ll-up-link" onClick={() => changeShape({ kind: 'polygon', points: [] })}>Start again</button>}
            </p>
          )}
        </fieldset>
      )}
    </div>
  )
}

/** A small picture of each shape for its button, on the tab icons' 24-unit grid. */
function ShapeIcon({ kind }) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round' }
  if (kind === 'rect') return <rect x="5" y="4" width="14" height="16" {...line} />
  if (kind === 'round') return <circle cx="12" cy="12" r="8" {...line} />
  if (kind === 'polygon') return <path d="M5 8l6-4 8 5-2 10-9 1z" {...line} strokeDasharray="2.4 2" />
  const d = outlineOf({ kind })
  // outlineOf draws in a 100 box: scale it into 4..20
  const pts = d.replace(/Z$/, '').split(/[ML]/).filter(Boolean).map((xy) => xy.split(' ').map(Number)).map(([x, y]) => `${(4 + x * 0.16).toFixed(1)},${(4 + y * 0.16).toFixed(1)}`)
  return <polygon points={pts.join(' ')} {...line} />
}
