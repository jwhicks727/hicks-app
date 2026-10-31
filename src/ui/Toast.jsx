import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './toast.css'

/**
 * A line that says what just happened, with one way to take it back
 * ("Removed Miso salmon. Undo"), instead of asking first. It sits above the
 * tab bar, goes by itself after a few seconds (not while a finger or the
 * pointer is on it, or it has focus), and Escape or its ✕ closes it sooner.
 * Drawn at the top of the page, so no card's entrance animation pins it.
 */
export function Toast({ children, action, onAction, onClose, ms = 7000 }) {
  const [held, setHeld] = useState(false)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  useEffect(() => {
    if (held) return undefined
    const t = setTimeout(() => close.current(), ms)
    return () => clearTimeout(t)
  }, [held, ms, children])
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') close.current() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  return createPortal(
    <div className="toast" role="status" aria-live="polite"
      onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <span className="toast-t">{children}</span>
      {action && <button type="button" className="toast-do" onClick={onAction}>{action}</button>}
      <button type="button" className="toast-x" aria-label="Close" onClick={() => close.current()}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>
    </div>,
    document.body,
  )
}

/** Something under way ("Asking for ideas…"), pinned to the top of the screen wherever the page is scrolled. */
export function Working({ children }) {
  return createPortal(
    <p className="working" role="status" aria-live="polite"><span className="working-dot" aria-hidden="true" />{children}</p>,
    document.body,
  )
}
