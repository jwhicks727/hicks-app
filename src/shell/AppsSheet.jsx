import { Sheet } from '../ui/Sheet.jsx'
import IconTile from '../ui/IconTile.jsx'
import { APPS } from '../ui/apps.jsx'
import { navigateFromSheet } from '../lib/router.js'

// The phone's Apps tab: a sheet of every app, over whatever screen you're
// on. Closing it (its X, a tap outside, Escape, Back) leaves that screen as
// it was; a tile opens its app in the sheet's own step of history, so Back
// from the app returns to where you were.
export default function AppsSheet({ onClose }) {
  return (
    <Sheet title="Apps" onClose={onClose} className="apps-sheet">
      <nav className="apps-grid" aria-label="Apps">
        {APPS.map((p) => (
          <a key={p.to} href={p.to} className="apps-tile" onClick={(e) => { e.preventDefault(); onClose(); navigateFromSheet(p.to) }}>
            <IconTile colours={p.colours} size={58} flat><svg viewBox="0 0 24 24">{p.icon}</svg></IconTile>
            <b>{p.name}</b>
            <span>{p.sub}</span>
          </a>
        ))}
      </nav>
    </Sheet>
  )
}
