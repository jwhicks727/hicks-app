import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * A yes/no question, never window.confirm(): its own buttons, Escape or a tap
 * outside says no. Drawn at the top of the page, since a card's entrance
 * animation would otherwise pin a fixed overlay to the card.
 */
export function Confirm({ title, children, yes, no = 'Cancel', onYes, onNo, danger = false }) {
  const noRef = useRef(null)
  useEffect(() => {
    noRef.current?.focus()
    const key = (e) => { if (e.key === 'Escape') onNo() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onNo])
  return createPortal(
    <div className="scrim" onClick={(e) => { if (e.target === e.currentTarget) onNo() }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-t">
        <h2 id="confirm-t">{title}</h2>
        {children}
        <div className="form-actions">
          <button type="button" className={'btn' + (danger ? ' danger' : '')} onClick={onYes}>{yes}</button>
          <button type="button" className="btn ghost" ref={noRef} onClick={onNo}>{no}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
