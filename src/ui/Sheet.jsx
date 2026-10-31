import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './sheet.css'

/**
 * A sheet over the screen: its own close, a tap outside or Escape closes it,
 * and so does Back (the browser's, or the phone's swipe), which it takes one
 * step of history for. Drawn at the top of the page (a portal).
 */
export function Sheet({ title, onClose, children, className = '', side = false }) {
  const panel = useRef(null), closing = useRef(false)
  useEffect(() => {
    window.history.pushState({ ...(window.history.state || {}), sheet: true }, '')
    const onPop = () => { if (!closing.current) { closing.current = true; onClose() } }
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Closing from inside steps back over the sheet's own history entry
  const close = () => { if (closing.current) return; closing.current = true; window.history.back(); onClose() }
  return createPortal(
    <div className={'sheet-scrim' + (side ? ' side' : '')} onClick={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className={'sheet ' + className} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panel}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn sheet-x" onClick={close} aria-label="Close">✕</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
