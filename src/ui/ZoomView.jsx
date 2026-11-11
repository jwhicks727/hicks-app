import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MAX_ZOOM, clampZoom, clampPan, panAround } from '../lib/zoom.js'
import './zoomview.css'

/**
 * A picture held up close: pinch to zoom (two fingers), drag to move it once zoomed, double-tap to zoom in and
 * out, the mouse wheel on a computer, and the + and − buttons for anyone who can't pinch (nothing works only by
 * gesture). The page itself never zooms (the viewport forbids it); this does, on the picture alone. The picture is
 * shown whole and unaltered, only scaled. Its own close; Escape or Back closes it too. Drawn at the top of the page.
 */
export default function ZoomView({ src, alt, title, onClose }) {
  const stage = useRef(null), img = useRef(null), closing = useRef(false)
  const view = useRef({ s: 1, x: 0, y: 0 }) // scale and pan, kept out of React so a gesture never re-renders
  const pts = useRef(new Map()), pinch = useRef(null), drag = useRef(null), lastTap = useRef({ t: 0, x: 0, y: 0 })
  const [scale, setScale] = useState(1)

  const sizes = () => {
    const r = stage.current.getBoundingClientRect(), i = img.current
    return { r, stage: { w: r.width, h: r.height }, img: { w: i.offsetWidth, h: i.offsetHeight } }
  }
  const apply = (s, t, smooth = false) => {
    const z = sizes(), c = clampPan(t, s, z.img, z.stage)
    view.current = { s, x: c.x, y: c.y }
    const el = img.current
    el.style.transition = smooth ? 'transform .2s ease' : 'none'
    el.style.transform = `translate(${c.x}px, ${c.y}px) scale(${s})`
    setScale((o) => (Math.abs(o - s) < 0.001 ? o : s))
  }
  // Zoom to `to`, keeping the point at client (cx, cy) still
  const zoomTo = (to, cx, cy, smooth) => {
    const z = sizes(), v = view.current, s = clampZoom(to)
    const at = cx == null ? { x: 0, y: 0 } : { x: cx - z.r.left - z.r.width / 2, y: cy - z.r.top - z.r.height / 2 }
    apply(s, s === 1 ? { x: 0, y: 0 } : panAround(v, v.s, s, at), smooth)
  }

  // Back closes it, like a sheet
  useEffect(() => {
    window.history.pushState({ ...(window.history.state || {}), zoom: true }, '')
    const onPop = () => { if (!closing.current) { closing.current = true; onClose() } }
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === '+' || e.key === '=') zoomTo(view.current.s * 1.5, null, null, true)
      else if (e.key === '-') zoomTo(view.current.s / 1.5, null, null, true)
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    stage.current?.focus()
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { if (closing.current) return; closing.current = true; window.history.back(); onClose() }

  // The wheel needs a non-passive listener to stop the page behind from scrolling
  useEffect(() => {
    const el = stage.current
    const wheel = (e) => { e.preventDefault(); zoomTo(view.current.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), e.clientX, e.clientY, false) }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const two = () => { const [a, b] = [...pts.current.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
  const down = (e) => {
    if (e.target.closest('.zv-bar')) return
    stage.current.setPointerCapture?.(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const m = two()
      pinch.current = { d: m.d, s: view.current.s, x: m.x, y: m.y, t: { x: view.current.x, y: view.current.y } }
      drag.current = null
    } else if (pts.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, t: { x: view.current.x, y: view.current.y }, moved: false }
    }
  }
  const move = (e) => {
    if (!pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pts.current.size >= 2) {
      const m = two(), p = pinch.current, z = sizes()
      const s = clampZoom(p.s * m.d / p.d)
      const cx = (v) => v.x - z.r.left - z.r.width / 2, cy = (v) => v.y - z.r.top - z.r.height / 2
      // keep the point that was between the fingers at the start under where the fingers are now
      const t0 = panAround(p.t, p.s, s, { x: cx(p), y: cy(p) })
      apply(s, { x: t0.x + (m.x - p.x), y: t0.y + (m.y - p.y) })
    } else if (drag.current) {
      const d = drag.current, dx = e.clientX - d.x, dy = e.clientY - d.y
      if (Math.hypot(dx, dy) > 6) d.moved = true
      if (view.current.s > 1) apply(view.current.s, { x: d.t.x + dx, y: d.t.y + dy })
    }
  }
  const up = (e) => {
    const was = pts.current.has(e.pointerId)
    pts.current.delete(e.pointerId)
    if (pinch.current && pts.current.size < 2) {
      pinch.current = null
      const left = [...pts.current.values()][0]
      // the finger still down carries on as a drag, so lifting one of two never jumps
      drag.current = left ? { x: left.x, y: left.y, t: { x: view.current.x, y: view.current.y }, moved: true } : null
      return
    }
    const d = drag.current
    drag.current = null
    if (!was || !d || d.moved || e.type === 'pointercancel') return
    // A tap: twice in quick succession zooms in on the spot, or back out
    const now = e.timeStamp, l = lastTap.current
    if (now - l.t < 320 && Math.hypot(e.clientX - l.x, e.clientY - l.y) < 30) {
      lastTap.current = { t: 0, x: 0, y: 0 }
      zoomTo(view.current.s > 1.05 ? 1 : 2.5, e.clientX, e.clientY, true)
    } else lastTap.current = { t: now, x: e.clientX, y: e.clientY }
  }

  return createPortal(
    <div className="zv" role="dialog" aria-modal="true" aria-label={title ? `${title}, close up` : 'Close up'} tabIndex={-1} ref={stage}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <img ref={img} className="zv-img" src={src} alt={alt || title || ''} draggable="false" />
      <div className="zv-bar">
        <button type="button" className="zv-btn" onClick={() => zoomTo(view.current.s / 1.6, null, null, true)} disabled={scale <= 1} aria-label="Zoom out">−</button>
        <button type="button" className="zv-btn" onClick={() => zoomTo(view.current.s * 1.6, null, null, true)} disabled={scale >= MAX_ZOOM} aria-label="Zoom in">+</button>
        <button type="button" className="zv-btn zv-x" onClick={close} aria-label="Close">✕</button>
      </div>
      <p className="zv-hint" aria-hidden="true">Pinch to zoom, double-tap to zoom in</p>
    </div>,
    document.body,
  )
}

/** A picture's tap-to-zoom wrapper: a tap on the art (not on a button inside it) opens it close up, and so does
 *  Enter or Space. */
export function ZoomArt({ src, alt, title, children, className = '' }) {
  const [open, setOpen] = useState(false)
  const tap = (e) => { if (!e.target.closest('button, a')) setOpen(true) }
  return (
    <>
      <div className={'zv-art ' + className} onClick={tap} role="button" tabIndex={0} aria-label={`${title || 'Picture'}: zoom in`}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); setOpen(true) } }}>
        {children}
        <span className="zv-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M15 15l5 5M10.5 8v5M8 10.5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></span>
      </div>
      {open && src && <ZoomView src={src} alt={alt} title={title} onClose={() => setOpen(false)} />}
    </>
  )
}
