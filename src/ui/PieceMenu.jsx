import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '../shell/Link.jsx'
import { Sheet } from './Sheet.jsx'
import { Toast } from './Toast.jsx'
import { HOLD_MS, heldStill, abilities, pieceFileName, pieceAddress, DO } from '../lib/pieceMenu.js'
import './piecemenu.css'

/**
 * Hold a piece (or right-click it) and its menu opens; a plain tap still goes to the piece. Props for the piece's own
 * element: pointer handlers for the hold (a wandering finger is a scroll and cancels it), `contextmenu` for the
 * phone's own long-press and the mouse's right button, and a click guard so the tap that ends a hold doesn't also open
 * the page. Never hover-only: the big pages have a plain button for the same menu (`PieceMenuButton`).
 */
export function useHold(onHold) {
  const t = useRef(null), at = useRef(null), held = useRef(false)
  const stop = () => { clearTimeout(t.current); t.current = null }
  useEffect(() => stop, [])
  const open = () => { stop(); held.current = true; onHold() }
  return {
    onPointerDown(e) {
      if (e.button > 0 && e.pointerType === 'mouse') return
      held.current = false
      at.current = { x: e.clientX, y: e.clientY }
      stop(); t.current = setTimeout(open, HOLD_MS)
    },
    onPointerMove(e) { if (t.current && !heldStill(at.current, { x: e.clientX, y: e.clientY })) stop() },
    onPointerUp: stop,
    onPointerCancel: stop,
    onPointerLeave: stop,
    onContextMenu(e) { e.preventDefault(); if (!held.current) open() },
    onClickCapture(e) { if (held.current) { e.preventDefault(); e.stopPropagation(); held.current = false } },
    onDragStart(e) { e.preventDefault() },
    'data-hold': '',
  }
}

/**
 * The menu: save it, copy the picture, copy its link, share it. `url()` gives the picture as it was kept (a signed link,
 * asked for only now), `path` is the app's own page for the piece, `by` whose it is. Each choice says what happened,
 * or why not, on the sheet itself.
 */
export function PieceMenu({ title, by, path, url, onClose }) {
  const can = useMemo(abilities, [])
  const [busy, setBusy] = useState(null), [msg, setMsg] = useState(null), [toast, setToast] = useState(null)
  const live = useRef(true)
  useEffect(() => () => { live.current = false }, [])
  async function run(key) {
    if (busy) return
    setBusy(key); setMsg(null)
    try {
      const src = await url()
      if (!src) throw new Error('The picture isn’t ready yet. Try again in a moment.')
      const words = await DO[key]({ url: src, title, name: (mime) => pieceFileName(title, by, mime), address: pieceAddress(window.location.origin, path) })
      if (!live.current) return
      if (words) { setToast(words); if (key !== 'download') onClose() }
    } catch (e) {
      if (live.current) setMsg((e && e.message) || 'That didn’t work. Try again.')
    }
    if (live.current) setBusy(null)
  }
  const row = (key, label, hint, ok) => ok && (
    <button type="button" className="btn ghost pm-do" disabled={Boolean(busy)} onClick={() => run(key)}>
      <b>{busy === key ? 'One moment…' : label}</b><small>{hint}</small>
    </button>
  )
  return (
    <>
      <Sheet title={title} onClose={onClose} className="pm">
        {row('download', 'Save the picture', 'To this device, as it was kept.', can.download)}
        {row('copyImage', 'Copy the picture', 'To paste into a message or a note.', can.copyImage)}
        {row('share', 'Share the picture', 'Through this device’s share sheet.', can.share)}
        {row('copyLink', 'Copy its link', 'The app’s page for it: opens only when signed in.', can.copyLink)}
        {msg && <p className="muted" role="status">{msg}</p>}
      </Sheet>
      {toast && <Toast onClose={() => setToast(null)}>{toast}</Toast>}
    </>
  )
}

/** A plain button for the same menu, so it never takes a hold to reach it. */
export function PieceMenuButton({ title, by, path, url, className = 'btn ghost' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>Save, copy or share</button>
      {open && <PieceMenu title={title} by={by} path={path} url={url} onClose={() => setOpen(false)} />}
    </>
  )
}

/** A piece on a wall: an ordinary link to its page, which a hold (or a right-click) turns into the menu instead. */
export function HeldLink({ to, title, by, url, children, ...rest }) {
  const [open, setOpen] = useState(false)
  const hold = useHold(() => setOpen(true))
  return (
    <>
      <Link to={to} {...rest} {...hold}>{children}</Link>
      {open && <PieceMenu title={title} by={by} path={to} url={url} onClose={() => setOpen(false)} />}
    </>
  )
}
